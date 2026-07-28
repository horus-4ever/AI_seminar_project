Dashboard setup

The existing detection/ folder is unchanged.

Model location

Place the trained weights in either location:

best.pt

or:

models/best.pt

You may also define:

export YOLO_MODEL_PATH=/absolute/path/to/best.pt

Install and run

python3 -m pip install -r requirements.txt
uvicorn web_app:app --reload

Open the forwarded port 8000 in Codespaces.

Saved output

Every successful click on Prepare Recipes appends one record to:

user_preference.json

The record contains a sequential ID, timestamps, uploaded-image information,selected preferences, and the YOLO inventory_summary output.

Uploaded images are saved in:

uploads/

Important

The button runs YOLO inference, not training. Training requires a labelledtraining dataset and should not happen whenever a user uploads an image.
