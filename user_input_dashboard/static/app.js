const state = {
  file: null,
  objectUrl: null,
  modelReady: false,
  loadingTimer: null,
};

const el = (id) => document.getElementById(id);

function showToast(message) {
  const toast = el("toast");

  toast.textContent = message;
  toast.classList.add("show");

  window.clearTimeout(showToast.timer);

  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function checkedValues(containerId) {
  return [
    ...document.querySelectorAll(
      `#${containerId} input[type="checkbox"]:checked`
    ),
  ].map((input) => input.value);
}

function selectedRadio(name, fallback) {
  return (
    document.querySelector(
      `input[name="${name}"]:checked`
    )?.value || fallback
  );
}

function titleCase(value) {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function checkModelStatus() {
  const statusBox = el("engineStatus");
  const statusText = el("engineStatusText");

  try {
    const response = await fetch("/api/status");
    const status = await response.json();

    state.modelReady = Boolean(status.model_ready);

    statusBox.classList.toggle(
      "ready",
      state.modelReady
    );

    statusBox.classList.toggle(
      "error",
      !state.modelReady
    );

    statusText.textContent = state.modelReady
      ? "Ready"
      : "Needs setup";

    if (!state.modelReady) {
      statusBox.title =
        status.message || "Recipe engine is not ready.";
    }
  } catch (error) {
    state.modelReady = false;

    statusBox.classList.add("error");
    statusText.textContent = "Offline";

    statusBox.title =
      "The app could not reach the backend.";
  }
}

function clearPreview() {
  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
  }

  state.file = null;
  state.objectUrl = null;

  el("mediaInput").value = "";

  el("imagePreview").src = "";
  el("videoPreview").src = "";

  el("imagePreview").classList.add("hidden");
  el("videoPreview").classList.add("hidden");

  el("previewWrap").classList.add("hidden");
  el("emptyState").classList.remove("hidden");

  el("fileChip").classList.add("hidden");
  el("removeMediaButton").classList.add("hidden");

  updateJourney();
}

function previewMedia(file) {
  if (!file) {
    return;
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    showToast("Choose a photo or video file.");
    return;
  }

  if (state.objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
  }

  state.file = file;
  state.objectUrl = URL.createObjectURL(file);

  el("emptyState").classList.add("hidden");
  el("previewWrap").classList.remove("hidden");
  el("fileChip").classList.remove("hidden");
  el("removeMediaButton").classList.remove("hidden");

  el("selectedFileName").textContent = file.name;

  el("selectedFileMeta").textContent =
    `${(file.size / 1024 / 1024).toFixed(2)} MB`;

  el("fileIcon").textContent = isVideo
    ? "🎬"
    : "🖼️";

  if (isVideo) {
    el("imagePreview").classList.add("hidden");

    el("videoPreview").src = state.objectUrl;
    el("videoPreview").classList.remove("hidden");

    showToast(
      "Video preview ready. Use a photo to create a recipe today."
    );
  } else {
    el("videoPreview").classList.add("hidden");

    el("imagePreview").src = state.objectUrl;
    el("imagePreview").classList.remove("hidden");
  }

  updateJourney();
}

function collectPreferences() {
  return {
    meal_type: selectedRadio(
      "mealType",
      "dinner"
    ),

    diet_type: selectedRadio(
      "dietType",
      "normal"
    ),

    nutrition_goal:
      el("nutritionGoal").value,

    servings:
      Number(el("servings").value),

    maximum_cooking_time_minutes:
      Number(el("maxTime").value),

    preferred_cuisine:
      el("cuisine").value,

    spice_level:
      el("spiceLevel").value,

    cooking_skill:
      el("cookingSkill").value,

    allergies:
      splitList(el("allergies").value),

    excluded_ingredients:
      splitList(el("avoidIngredients").value),

    available_appliances:
      checkedValues("applianceChoices"),

    additional_request:
      el("additionalRequest").value.trim() || null,
  };
}

function updatePreferenceSummary() {
  const meal = titleCase(
    selectedRadio("mealType", "dinner")
  );

  const goal = titleCase(
    el("nutritionGoal").value
  );

  const servings =
    Number(el("servings").value) || 1;

  el("preferenceSummary").textContent =
    `${meal} · ${goal} · ${servings} ${
      servings === 1 ? "serving" : "servings"
    }`;

  updateJourney();
}

function updateJourney() {
  const hasFile = Boolean(state.file);

  el("stepUpload").classList.toggle(
    "done",
    hasFile
  );

  el("stepPreferences").classList.toggle(
    "active",
    hasFile
  );
}

function resetPreferences() {
  document.querySelector(
    'input[name="mealType"][value="dinner"]'
  ).checked = true;

  document.querySelector(
    'input[name="dietType"][value="normal"]'
  ).checked = true;

  el("nutritionGoal").value =
    "healthy_balanced";

  el("servings").value = 2;
  el("maxTime").value = 30;
  el("cuisine").value = "any";
  el("spiceLevel").value = "medium";
  el("cookingSkill").value = "beginner";

  el("allergies").value = "";
  el("avoidIngredients").value = "";
  el("additionalRequest").value = "";

  document
    .querySelectorAll(
      "#applianceChoices input[type='checkbox']"
    )
    .forEach((input) => {
      input.checked = [
        "stove",
        "microwave",
      ].includes(input.value);
    });

  updatePreferenceSummary();
  showToast("Preferences reset.");
}

function startLoadingMessages() {
  const messages = [
    [
      "Checking your fridge...",
      "Spotting the ingredients you already have.",
    ],
    [
      "Matching your choices...",
      "Keeping your meal, diet, and time in mind.",
    ],
    [
      "Almost ready...",
      "Putting everything together for you.",
    ],
  ];

  let index = 0;

  const showMessage = () => {
    const [title, message] =
      messages[index % messages.length];

    el("loadingTitle").textContent = title;
    el("loadingMessage").textContent = message;

    index += 1;
  };

  showMessage();

  state.loadingTimer = window.setInterval(
    showMessage,
    1600
  );
}

function stopLoadingMessages() {
  window.clearInterval(state.loadingTimer);
  state.loadingTimer = null;
}

function renderResult(result) {
  el("savedId").textContent =
    `#${result.id}`;

  const date = new Date(
    result.created_at_utc
  );

  el("resultSummary").textContent =
    `Saved ${date.toLocaleString()} · Ready for your recipe assistant`;

  const ingredients =
    result.detected_ingredients || [];

  el("ingredientList").innerHTML =
    ingredients.length
      ? ingredients
          .map(
            (item, index) => `
              <span
                class="ingredient-pill"
                style="animation-delay:${index * 55}ms"
              >
                ${titleCase(item.ingredient)}

                <strong>
                  ×${item.detected_count}
                </strong>

                <small>
                  ${Math.round(
                    item.average_confidence * 100
                  )}%
                </small>
              </span>
            `
          )
          .join("")
      : `
          <span class="ingredient-pill">
            Nothing clear was found. Try a brighter photo.
          </span>
        `;

  el("resultCard").classList.remove("hidden");

  el("stepPrepare").classList.add("done");

  el("resultCard").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}
function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function openScanOverlay() {
  const overlay = el("scanOverlay");

  document.body.classList.add("scan-active");

  overlay.classList.remove(
    "hidden",
    "scan-success"
  );

  el("scanImage").src = state.objectUrl || "";

  el("scanStage").textContent =
    "Ingredient detection";

  el("scanTitle").textContent =
    "Looking inside your fridge...";

  el("scanMessage").textContent =
    "Finding the ingredients in your photo.";

  el("detectedFeed").innerHTML = "";
  el("detectedFeed").classList.add("hidden");

  el("scanProgressBar").style.width = "15%";
}

function closeScanOverlay() {
  el("scanOverlay").classList.add("hidden");

  document.body.classList.remove(
    "scan-active"
  );
}

function setScanState({
  stage,
  title,
  message,
  progress,
}) {
  if (stage) {
    el("scanStage").textContent = stage;
  }

  if (title) {
    el("scanTitle").textContent = title;
  }

  if (message) {
    el("scanMessage").textContent = message;
  }

  if (progress !== undefined) {
    el("scanProgressBar").style.width =
      `${progress}%`;
  }
}

async function showDetectedIngredients(
  ingredients
) {
  const feed = el("detectedFeed");

  feed.innerHTML = "";
  feed.classList.remove("hidden");

  if (!ingredients.length) {
    const emptyItem =
      document.createElement("div");

    emptyItem.className = "detected-item";

    emptyItem.innerHTML = `
      <span class="detected-item-icon">!</span>
      No clear ingredients found
    `;

    feed.appendChild(emptyItem);

    await wait(900);
    return;
  }

  for (let index = 0;
       index < ingredients.length;
       index += 1) {

    const item = ingredients[index];

    const ingredientElement =
      document.createElement("div");

    ingredientElement.className =
      "detected-item";

    const confidence = Math.round(
      Number(item.average_confidence || 0) * 100
    );

    ingredientElement.innerHTML = `
      <span class="detected-item-icon">✓</span>

      <span>
        ${titleCase(item.ingredient)}
      </span>

      <span class="detected-item-count">
        ×${item.detected_count}
        · ${confidence}%
      </span>
    `;

    feed.appendChild(ingredientElement);

    const progress =
      35 +
      Math.round(
        ((index + 1) /
          ingredients.length) *
          35
      );

    el("scanProgressBar").style.width =
      `${progress}%`;

    await wait(450);
  }
}

async function showPreparationStage(
  preferences
) {
  const meal = titleCase(
    preferences.meal_type
  );

  el("detectedFeed").classList.add(
    "hidden"
  );

  setScanState({
    stage: "Recipe preparation",
    title: `Preparing ${meal.toLowerCase()} recipes for you...`,
    message:
      "Matching your ingredients with your food preferences.",
    progress: 82,
  });

  await wait(1000);

  setScanState({
    title: "Creating something delicious...",
    message:
      `Using your ${meal.toLowerCase()} choices, cooking time, and available ingredients.`,
    progress: 94,
  });

  await wait(1400);
}

async function showCompletedStage() {
  el("scanOverlay").classList.add(
    "scan-success"
  );

  setScanState({
    stage: "Ready",
    title: "Everything is prepared!",
    message:
      "Your ingredients and preferences have been saved.",
    progress: 100,
  });

  await wait(1000);
}
async function prepareRecipes() {
  if (!state.file) {
    showToast("Add a fridge photo first.");
    return;
  }

  if (state.file.type.startsWith("video/")) {
    showToast(
      "Choose a photo for now. Video support is coming next."
    );
    return;
  }

  if (!state.file.type.startsWith("image/")) {
    showToast("Choose a valid photo.");
    return;
  }

  if (!state.modelReady) {
    showToast(
      "The recipe engine is not ready yet."
    );
    return;
  }

  const preferences =
    collectPreferences();

  if (
    !preferences.available_appliances.length
  ) {
    showToast(
      "Pick at least one appliance."
    );
    return;
  }

  const formData = new FormData();

  formData.append(
    "media",
    state.file
  );

  formData.append(
    "preferences",
    JSON.stringify(preferences)
  );

  const button = el("prepareButton");

  button.disabled = true;

  button.innerHTML = `
    <span>⏳</span>
    Preparing...
  `;

  openScanOverlay();

  try {
    setScanState({
      stage: "Ingredient detection",
      title: "Scanning your image...",
      message:
        "Our AI is checking each visible ingredient.",
      progress: 25,
    });

    const response = await fetch(
      "/api/prepare-recipes",
      {
        method: "POST",
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.detail ||
        "Something went wrong."
      );
    }

    const ingredients =
      result.detected_ingredients || [];

    setScanState({
      stage: "Ingredients found",
      title: ingredients.length
        ? `We found ${ingredients.length} ingredient ${
            ingredients.length === 1
              ? "type"
              : "types"
          }!`
        : "Scan completed",
      message: ingredients.length
        ? "Here is what your fridge has today."
        : "Try another brighter or clearer photo.",
      progress: 35,
    });

    await showDetectedIngredients(
      ingredients
    );

    await wait(500);

    await showPreparationStage(
      preferences
    );

    await showCompletedStage();

    closeScanOverlay();

    showToast(
      `${titleCase(
        preferences.meal_type
      )} request saved successfully!`
    );

    /*
      Keep this only if you still want the
      result section below the dashboard.

      Remove it if the modal should be the
      only visible result.
    */

    // renderResult(result);

  } catch (error) {
    setScanState({
      stage: "Something went wrong",
      title: "We could not finish the scan",
      message:
        error.message ||
        "Please try another image.",
      progress: 100,
    });

    await wait(2200);

    closeScanOverlay();

    showToast(
      error.message ||
      "Please try again."
    );
  } finally {
    button.disabled = false;

    button.innerHTML = `
      <span>✨</span>
      Make my recipe
      <b>→</b>
    `;
  }
}
function startAgain() {
  clearPreview();

  el("resultCard").classList.add("hidden");

  el("stepPrepare").classList.remove(
    "active",
    "done"
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

el("chooseMediaButton").addEventListener(
  "click",
  () => {
    el("mediaInput").click();
  }
);

el("changeMediaButton").addEventListener(
  "click",
  () => {
    el("mediaInput").click();
  }
);

el("removeMediaButton").addEventListener(
  "click",
  clearPreview
);

el("mediaInput").addEventListener(
  "change",
  (event) => {
    previewMedia(event.target.files[0]);
  }
);

el("prepareButton").addEventListener(
  "click",
  prepareRecipes
);

el("resetPreferencesButton").addEventListener(
  "click",
  resetPreferences
);

el("startAgainButton").addEventListener(
  "click",
  startAgain
);

const dropZone = el("dropZone");

["dragenter", "dragover"].forEach(
  (eventName) => {
    dropZone.addEventListener(
      eventName,
      (event) => {
        event.preventDefault();

        dropZone.classList.add(
          "dragover"
        );
      }
    );
  }
);

["dragleave", "drop"].forEach(
  (eventName) => {
    dropZone.addEventListener(
      eventName,
      (event) => {
        event.preventDefault();

        dropZone.classList.remove(
          "dragover"
        );
      }
    );
  }
);

dropZone.addEventListener(
  "drop",
  (event) => {
    previewMedia(
      event.dataTransfer.files[0]
    );
  }
);

document
  .querySelectorAll(
    "#preferencesSection input, " +
      "#preferencesSection select, " +
      "#preferencesSection textarea"
  )
  .forEach((input) => {
    input.addEventListener(
      "input",
      updatePreferenceSummary
    );

    input.addEventListener(
      "change",
      updatePreferenceSummary
    );
  });

checkModelStatus();
updatePreferenceSummary();
