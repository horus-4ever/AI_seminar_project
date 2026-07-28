const state = {
  file: null,
  modelReady: false,
};

const el = (id) => document.getElementById(id);

function showToast(message) {
  const toast = el("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function checkedValues(containerId) {
  return [...document.querySelectorAll(`#${containerId} input[type="checkbox"]:checked`)]
    .map((input) => input.value);
}

function selectedRadio(name, fallback) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || fallback;
}

async function checkModelStatus() {
  try {
    const response = await fetch("/api/status");
    const status = await response.json();
    state.modelReady = Boolean(status.model_ready);

    const badge = el("modelBadge");
    badge.textContent = state.modelReady ? "YOLO ready" : "YOLO setup required";
    badge.className = `status-badge ${state.modelReady ? "ready" : "error"}`;

    if (!state.modelReady) {
      badge.title = status.message || "Model unavailable";
    }
  } catch (error) {
    el("modelBadge").textContent = "Backend unavailable";
    el("modelBadge").className = "status-badge error";
  }
}

function previewMedia(file) {
  if (!file) return;

  state.file = file;
  const objectUrl = URL.createObjectURL(file);
  const isVideo = file.type.startsWith("video/");

  el("emptyState").style.display = "none";
  el("selectedFileText").textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;

  if (isVideo) {
    el("imagePreview").style.display = "none";
    el("videoPreview").src = objectUrl;
    el("videoPreview").style.display = "block";
    showToast("Video selected. Please use an image for the current phase.");
  } else {
    el("videoPreview").style.display = "none";
    el("imagePreview").src = objectUrl;
    el("imagePreview").style.display = "block";
  }

  el("stepUpload").classList.add("active");
  el("stepPreferences").classList.add("active");
}

function collectPreferences() {
  return {
    meal_type: selectedRadio("mealType", "dinner"),
    diet_type: selectedRadio("dietType", "normal"),
    nutrition_goal: el("nutritionGoal").value,
    servings: Number(el("servings").value),
    maximum_cooking_time_minutes: Number(el("maxTime").value),
    preferred_cuisine: el("cuisine").value,
    spice_level: el("spiceLevel").value,
    cooking_skill: el("cookingSkill").value,
    allergies: splitList(el("allergies").value),
    excluded_ingredients: splitList(el("avoidIngredients").value),
    available_appliances: checkedValues("applianceChoices"),
    additional_request: el("additionalRequest").value.trim() || null,
  };
}

function renderResult(result) {
  el("savedId").textContent = `Saved request #${result.id}`;
  el("resultSummary").textContent = `${result.message} Detection finished at ${new Date(result.created_at_utc).toLocaleString()}.`;

  const ingredients = result.detected_ingredients || [];
  el("ingredientList").innerHTML = ingredients.length
    ? ingredients.map((item) => `
        <span class="ingredient-pill">
          ${item.ingredient}
          <strong>× ${item.detected_count}</strong>
          <small>${Math.round(item.average_confidence * 100)}%</small>
        </span>
      `).join("")
    : `<span class="ingredient-pill"><small>No ingredients detected above the confidence threshold.</small></span>`;

  el("resultCard").classList.add("visible");
  el("resultCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function prepareRecipes() {
  if (!state.file) {
    showToast("Please upload a refrigerator image first.");
    return;
  }

  if (state.file.type.startsWith("video/")) {
    showToast("Video support is planned. Please upload an image for now.");
    return;
  }

  if (!state.file.type.startsWith("image/")) {
    showToast("Please select a valid image file.");
    return;
  }

  if (!state.modelReady) {
    showToast("YOLO is not ready. Add best.pt and restart the backend.");
    return;
  }

  const preferences = collectPreferences();
  if (!preferences.available_appliances.length) {
    showToast("Select at least one available appliance.");
    return;
  }

  const formData = new FormData();
  formData.append("media", state.file);
  formData.append("preferences", JSON.stringify(preferences));

  const button = el("prepareButton");
  button.disabled = true;
  button.textContent = "Preparing…";
  el("loadingPanel").classList.add("visible");
  el("stepPrepare").classList.add("active");

  try {
    const response = await fetch("/api/prepare-recipes", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || "The request could not be completed.");
    }

    renderResult(result);
    showToast(`Request #${result.id} saved successfully.`);
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "🍽 Prepare Recipes";
    el("loadingPanel").classList.remove("visible");
  }
}

el("chooseMediaButton").addEventListener("click", () => el("mediaInput").click());
el("mediaInput").addEventListener("change", (event) => previewMedia(event.target.files[0]));
el("prepareButton").addEventListener("click", prepareRecipes);

const dropZone = el("dropZone");
["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
  });
});
dropZone.addEventListener("drop", (event) => previewMedia(event.dataTransfer.files[0]));

checkModelStatus();
