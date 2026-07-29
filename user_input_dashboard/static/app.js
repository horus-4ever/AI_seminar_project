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

async function prepareRecipes() {
  if (!state.file) {
    showToast("Add a fridge photo first.");
    return;
  }

  if (state.file.type.startsWith("video/")) {
    showToast(
      "Video recipes are coming next—choose a photo for now."
    );
    return;
  }

  if (!state.file.type.startsWith("image/")) {
    showToast("Choose a valid photo.");
    return;
  }

  if (!state.modelReady) {
    showToast(
      "The recipe engine needs a little setup first."
    );
    return;
  }

  const preferences = collectPreferences();

  if (!preferences.available_appliances.length) {
    showToast("Pick at least one appliance.");
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

  button.innerHTML =
    "<span>⏳</span> Working on it...";

  el("loadingPanel").classList.remove("hidden");
  el("resultCard").classList.add("hidden");

  el("stepPrepare").classList.add("active");

  startLoadingMessages();

  try {
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
          "Something went wrong. Please try again."
      );
    }

    renderResult(result);

    showToast(
      "Your fridge scan is ready!"
    );
  } catch (error) {
    showToast(error.message);
  } finally {
    stopLoadingMessages();

    el("loadingPanel").classList.add("hidden");

    button.disabled = false;

    button.innerHTML =
      "<span>✨</span> Make my recipe <b>→</b>";
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
