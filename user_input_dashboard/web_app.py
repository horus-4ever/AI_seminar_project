from __future__ import annotations

import json
import os
import shutil
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Uses the existing Team 1 wrapper without changing detection/model.py.
from detection.model import Model


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_FILE = BASE_DIR / "user_preference.json"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# A lock prevents two simultaneous requests from generating the same numeric ID.
OUTPUT_LOCK = threading.Lock()


def resolve_model_path() -> Path:
    """Find the trained YOLO weights without hard-coding one project layout."""
    configured = os.getenv("YOLO_MODEL_PATH")
    candidates = [
        Path(configured) if configured else None,
        BASE_DIR / "best.pt",
        BASE_DIR / "models" / "best.pt",
    ]

    for candidate in candidates:
        if candidate is not None and candidate.exists():
            return candidate

    expected = "best.pt or models/best.pt"
    raise FileNotFoundError(
        f"YOLO weights were not found. Put the trained model at {expected}, "
        "or set the YOLO_MODEL_PATH environment variable."
    )


MODEL_LOAD_ERROR: str | None = None
YOLO_WRAPPER: Model | None = None

try:
    YOLO_WRAPPER = Model.load_pretrained(resolve_model_path())
except Exception as exc:  # Keep the website open so setup errors can be shown in the UI.
    MODEL_LOAD_ERROR = str(exc)


app = FastAPI(title="AI Smart Recipe Assistant")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def home() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/status")
def status() -> dict[str, Any]:
    return {
        "model_ready": YOLO_WRAPPER is not None,
        "message": "YOLO model is ready." if YOLO_WRAPPER else MODEL_LOAD_ERROR,
        "output_file": OUTPUT_FILE.name,
    }


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def safe_filename(filename: str) -> str:
    clean_name = Path(filename or "uploaded_image").name
    return "".join(
        character if character.isalnum() or character in "._-" else "_"
        for character in clean_name
    )


def load_records() -> list[dict[str, Any]]:
    if not OUTPUT_FILE.exists():
        return []

    content = OUTPUT_FILE.read_text(encoding="utf-8").strip()
    if not content:
        return []

    try:
        records = json.loads(content)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{OUTPUT_FILE.name} contains invalid JSON.") from exc

    if not isinstance(records, list):
        raise RuntimeError(f"{OUTPUT_FILE.name} must contain a JSON array.")

    return records


def next_record_id(records: list[dict[str, Any]]) -> int:
    if not records:
        return 1
    return max(int(record.get("id", 0)) for record in records) + 1


def save_record(record: dict[str, Any]) -> dict[str, Any]:
    """Append one combined preference + YOLO result to user_preference.json."""
    with OUTPUT_LOCK:
        records = load_records()
        record["id"] = next_record_id(records)
        records.append(record)

        temporary_file = OUTPUT_FILE.with_suffix(".tmp")
        temporary_file.write_text(
            json.dumps(records, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        temporary_file.replace(OUTPUT_FILE)

    return record


def run_yolo_inference(image_path: Path, confidence: float = 0.50) -> dict[str, Any]:
    """
    Run inference through the existing Team 1 model object.

    We access YOLO_WRAPPER.model.predict() because the existing wrapper's public
    output schema is inventory_summary, while this dashboard must not modify the
    Team 1 files.
    """
    if YOLO_WRAPPER is None:
        raise RuntimeError(MODEL_LOAD_ERROR or "YOLO model is unavailable.")

    predictions = YOLO_WRAPPER.model.predict(
        source=str(image_path),
        conf=confidence,
        verbose=False,
    )

    if not predictions:
        return {"inventory_summary": []}

    prediction = predictions[0]
    grouped: dict[str, dict[str, Any]] = {}
    confidence_totals: dict[str, float] = {}

    boxes = getattr(prediction, "boxes", None)
    if boxes is None:
        return {"inventory_summary": []}

    for box in boxes:
        class_id = int(box.cls[0])
        class_name = str(prediction.names[class_id])
        box_confidence = float(box.conf[0])

        if class_name not in grouped:
            grouped[class_name] = {
                "ingredient": class_name,
                "detected_count": 0,
                "average_confidence": 0.0,
            }
            confidence_totals[class_name] = 0.0

        grouped[class_name]["detected_count"] += 1
        confidence_totals[class_name] += box_confidence

    for class_name, item in grouped.items():
        count = item["detected_count"]
        item["average_confidence"] = round(
            confidence_totals[class_name] / count,
            4,
        )

    inventory = sorted(
        grouped.values(),
        key=lambda item: item["average_confidence"],
        reverse=True,
    )

    return {"inventory_summary": inventory}


@app.post("/api/prepare-recipes")
async def prepare_recipes(
    media: UploadFile = File(...),
    preferences: str = Form(...),
) -> dict[str, Any]:
    """
    Save the uploaded image, run YOLO inference, and append one combined record.

    The UI may advertise future video support, but this phase intentionally
    processes images only.
    """
    content_type = (media.content_type or "").lower()

    if content_type.startswith("video/"):
        raise HTTPException(
            status_code=400,
            detail="Video upload is visible for the next phase, but this version processes images only.",
        )

    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload an image file for this phase.",
        )

    try:
        preference_data = json.loads(preferences)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="The submitted preferences are not valid JSON.",
        ) from exc

    if not isinstance(preference_data, dict):
        raise HTTPException(status_code=400, detail="Preferences must be an object.")

    uploaded_at = utc_now()
    original_filename = safe_filename(media.filename or "uploaded_image")
    timestamp = uploaded_at.strftime("%Y%m%dT%H%M%S_%fZ")
    stored_filename = f"{timestamp}_{uuid.uuid4().hex[:8]}_{original_filename}"
    stored_path = UPLOAD_DIR / stored_filename

    try:
        with stored_path.open("wb") as output:
            shutil.copyfileobj(media.file, output)
    except OSError as exc:
        raise HTTPException(status_code=500, detail="The image could not be saved.") from exc
    finally:
        await media.close()

    try:
        yolo_output = run_yolo_inference(stored_path)
    except Exception as exc:
        # Keep the image for debugging and show a useful setup/inference error.
        raise HTTPException(status_code=500, detail=f"YOLO inference failed: {exc}") from exc

    completed_at = utc_now()

    # Dict insertion order is preserved in JSON: preferences appear before detections.
    combined_record: dict[str, Any] = {
        "created_at_utc": uploaded_at.isoformat(),
        "completed_at_utc": completed_at.isoformat(),
        "media": {
            "type": "image",
            "original_filename": original_filename,
            "saved_filename": stored_filename,
            "saved_path": str(stored_path.relative_to(BASE_DIR)),
            "content_type": content_type,
        },
        "user_preferences": preference_data,
        "inventory_summary": yolo_output["inventory_summary"],
    }

    saved_record = save_record(combined_record)

    return {
        "success": True,
        "id": saved_record["id"],
        "created_at_utc": saved_record["created_at_utc"],
        "detected_ingredients": saved_record["inventory_summary"],
        "message": f"Combined result saved to {OUTPUT_FILE.name}.",
    }