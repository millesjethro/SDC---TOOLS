import {sectionCaptureOptions} from "../popup-capture-options.js";

// popup.js
// Renders section capture options and passes selections to the platform
// (platforms/<name>/<name>-capture.js).

// ---------- Page elements ----------
const includeList = document.getElementById("includeList");
const sectionList = document.getElementById("sectionList");
const photoIndexField = document.getElementById("photoIndexField");
const photoIndexInput = document.getElementById("photoIndexInput");
const landingCountField = document.getElementById("landingCountField");
const landingCountInput = document.getElementById("landingCountInput");
const resumeField = document.getElementById("resumeField");
const resumeOffsetInput = document.getElementById("resumeOffsetInput");
const resumeHint = document.getElementById("resumeHint");
const fileNameInput = document.getElementById("fileName");
const fileExtEl = document.getElementById("fileExt");
const captureBtn = document.getElementById("captureBtn");
const statusEl = document.getElementById("status");
const statusDot = document.getElementById("statusDot");
const captureProgress = document.getElementById("captureProgress");
const downloadLink = document.getElementById("downloadLink");
const previewWrap = document.getElementById("previewWrap");
const previewEl = document.getElementById("preview");

let currentPlatform = null;
let captureGroups = null;
let currentTab = null;
let resumeRequest = 0;

// ---------- Small helpers ----------

function setStatus(msg, state, progress) {
  statusEl.textContent = msg;
  statusDot.className = "status-dot" + (state ? " " + state : "");
  captureProgress.hidden = !progress;
  if (progress) {
    captureProgress.max = progress.total;
    captureProgress.value = progress.done;
  }
}

// ---------- Format and file name ----------

function getFormat() {
  return document.querySelector('input[name="format"]:checked').value;
}

function updateExtensionLabel() {
  fileExtEl.textContent = getFormat() === "jpeg" ? ".jpg" : ".png";
}

document.querySelectorAll('input[name="format"]').forEach((el) => {
  el.addEventListener("change", updateExtensionLabel);
});

function sanitizeFileName(name) {
  const cleaned = name.trim().replace(/[\\/:*?"<>|]+/g, "-");
  return cleaned || "00-Capture";
}

// Two-part endings where the site name is one label further in
// (example.co.uk -> "example", not "co").
const TWO_LABEL_SUFFIXES = new Set([
  "co.uk", "co.jp", "co.in", "co.nz", "co.za", "co.kr",
  "com.au", "com.br", "com.mx", "com.sg",
  "org.uk", "gov.uk", "ac.uk", "net.au"
]);

// "www.facebook.com" -> "Facebook", "example.co.uk" -> "Example".
function siteLabelFromHostname(hostname) {
  const parts = (hostname || "").toLowerCase().replace(/^www\./, "").split(".").filter(Boolean);
  if (parts.length === 0) return "Capture";
  let labelIndex = parts.length >= 2 ? parts.length - 2 : 0;
  if (parts.length >= 3 && TWO_LABEL_SUFFIXES.has(parts.slice(-2).join("."))) {
    labelIndex = parts.length - 3;
  }
  const label = parts[labelIndex];
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ---------- Include / Section choices ----------

function selectedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value;
}

function getSelectedGroup() {
  return captureGroups?.find(group => group.id === selectedValue("endpoint"));
}

function getSelectedCaptureType() {
  return getSelectedGroup()?.types.find(type => type.id === selectedValue("section"));
}

function getSelectedTarget() {
  const targetId = captureGroups ? getSelectedCaptureType()?.targetId : selectedValue("endpoint");
  return currentPlatform?.targets.find(target => target.id === targetId) || null;
}

function getSectionMode() {
  return (captureGroups ? getSelectedCaptureType()?.mode : selectedValue("section")) || "default";
}

// The Section choices of a target come from the platform's capture file.
function getSectionsForTarget(target) {
  const lists = (currentPlatform && currentPlatform.capture.sections) || {};
  return (target && lists[target.id]) || Engine.SECTIONS.BASIC;
}

// The selector used to find items for "landing" captures.
function getLandingItemsSelector(target) {
  return (target && (target.landingPageItems || target.itemsInclude)) || null;
}

function renderRadios(listEl, name, idPrefix, options, onChange, initialId = options[0]?.id) {
  listEl.innerHTML = "";
  options.forEach(option => {
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.id = idPrefix + option.id;
    input.value = option.id;
    input.className = "visually-hidden";
    input.checked = option.id === initialId;
    input.addEventListener("change", onChange);

    const label = document.createElement("label");
    label.setAttribute("for", input.id);
    label.className = "option-row";
    label.innerHTML = '<span class="option-radio"></span><span class="option-label"></span>';
    label.querySelector(".option-label").textContent = option.label;

    listEl.appendChild(input);
    listEl.appendChild(label);
  });
}

function renderSectionOptions(initialType) {
  const types = captureGroups ? getSelectedGroup()?.types || [] : getSectionsForTarget(getSelectedTarget());
  renderRadios(sectionList, "section", "sec-", types, updateExtraFields, initialType);
  updateExtraFields();
}

function renderIncludeOptions(platform, initialGroup) {
  renderRadios(includeList, "endpoint", "ep-", captureGroups || platform.targets,
    () => renderSectionOptions(), initialGroup);
}

// Shows only the extra inputs that the current Include + Section need.
function updateExtraFields() {
  const target = getSelectedTarget();
  const { mode, fixedCount } = Engine.modeFor(getSectionMode());

  landingCountField.style.display = mode === "landing" && fixedCount == null ? "block" : "none";
  photoIndexField.style.display = target && target.photoSelect ? "block" : "none";
  resumeField.style.display = mode === "continue" ? "block" : "none";

  if (mode === "continue") void refreshResumeHint();
  else resumeRequest++;
}

// ---------- Continue progress (shown in the Resume field) ----------

async function refreshResumeHint() {
  const target = getSelectedTarget();
  if (!currentPlatform || !currentTab || !target || getSectionMode() !== "continue") return;
  const request = ++resumeRequest;
  const key = Engine.continueKey(currentTab.url, currentPlatform.id, target.id);
  resumeOffsetInput.value = "";
  resumeHint.textContent = "Checking saved progress…";
  let stored;
  try {
    stored = await Engine.storageGet(key);
  } catch {
    if (request === resumeRequest) resumeHint.textContent = "Could not read saved progress. Enter a starting pixel value.";
    return;
  }
  if (request !== resumeRequest || resumeOffsetInput.value.trim() !== "") return;
  if (stored) {
    resumeOffsetInput.value = Math.round(stored.lastOffset);
    resumeHint.textContent = `Saved progress: ${Math.round(stored.lastOffset).toLocaleString()} / ${Math.round(stored.totalHeight).toLocaleString()}px`;
  } else {
    resumeOffsetInput.value = "";
    resumeHint.textContent = 'No saved progress — type a pixel value, or run "Full-Capture" first.';
  }
}

// ---------- Start: which website is this? ----------

export function initSectionCapture(tab, platform, hostname) {
  currentTab = tab;
  currentPlatform = platform;

  captureGroups = sectionCaptureOptions[platform.id];
  let initialGroup;
  let initialType;
  if (platform.id === "youtube") {
    const url = new URL(tab.url);
    if (hostname === "music.youtube.com") initialType = "music-first";
    else if (url.pathname === "/watch" || url.pathname.startsWith("/shorts/")) {
      initialGroup = "highlights";
      initialType = url.pathname === "/watch" ? "video" : "shorts";
    }
  }
  renderIncludeOptions(platform, initialGroup);
  renderSectionOptions(initialType);
  updateExtensionLabel();

  fileNameInput.value = "00-" + siteLabelFromHostname(hostname);
  setStatus("Ready.", null);
}

// ---------- The Capture button ----------
// This only reads and checks what you chose, then hands over to the
// website's own capture file: currentPlatform.capture.run(ctx).

captureBtn.addEventListener("click", async () => {
  const target = getSelectedTarget();
  if (captureBtn.disabled || !currentPlatform || !target) return;

  const section = getSectionMode();
  const { mode, fixedCount } = Engine.modeFor(section);
  const format = getFormat();
  const fileName = sanitizeFileName(fileNameInput.value);
  const resumeOffset = resumeOffsetInput.value.trim();
  const landingInput = landingCountInput.value.trim();
  const photoInput = photoIndexInput.value.trim();
  let tabToRestore = null;

  captureBtn.disabled = true;
  previewWrap.classList.remove("visible");
  downloadLink.classList.remove("visible");
  downloadLink.removeAttribute("href");
  previewEl.removeAttribute("src");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error("No active tab found.");
    if (tab.id !== currentTab.id || tab.url !== currentTab.url) {
      throw new Error("The active page changed. Reopen the popup to capture it.");
    }
    const progressKey = Engine.continueKey(tab.url, currentPlatform.id, target.id);

    // Continue: where to start (typed value, otherwise the saved progress).
    let continueFrom = 0;
    if (mode === "continue") {
      const typed = resumeOffset;
      if (typed !== "" && !Number.isNaN(Number(typed))) {
        continueFrom = Math.max(0, Number(typed));
      } else {
        const stored = await Engine.storageGet(progressKey);
        if (!stored) {
          throw new Error('No saved progress. Run the First screenshot type, or enter a starting pixel value.');
        }
        continueFrom = stored.lastOffset;
      }
    }

    // Landing page / items: which item selector and how many items.
    let landingCount = 0;
    let itemsSelector = target.itemsInclude;
    if (mode === "landing") {
      itemsSelector = getLandingItemsSelector(target);
      if (!itemsSelector) throw new Error("This option has no item selector set in its selectors file.");
      if (fixedCount != null) {
        landingCount = fixedCount;
      } else {
        landingCount = Number(landingInput);
        if (!Number.isInteger(landingCount) || landingCount < 1) {
          throw new Error("Enter how many items to capture (a whole number, 1 or more).");
        }
      }
    }

    // Photo carousel: which photo to keep (blank = keep all).
    let photoIndex = null;
    if (target.photoSelect && photoInput !== "") {
      photoIndex = Number(photoInput);
      if (!Number.isInteger(photoIndex) || photoIndex < 1) {
        throw new Error("Enter a valid photo number (1 or more), or leave it blank.");
      }
    }

    await Engine.ensureContentScript(tab.id);
    tabToRestore = tab.id;

    // Everything the platform's capture file needs (see engine.js).
    const resolved = Engine.resolveForSection(target, section); // this Section's start/end
    const ctx = {
      tab, target: resolved, captureTarget: resolved, section,
      mode, landingCount, continueFrom, photoIndex, itemsSelector,
      landingItems: currentPlatform.capture.landingItems || null,
      landingCutAt: currentPlatform.capture.landingCutAt || "screen",
      format, progressKey, setStatus
    };

    const result = await currentPlatform.capture.run(ctx);

    if (result.nothingLeft) {
      setStatus(result.message, "success");
      return;
    }

    // Show the result.
    setStatus("Preparing preview...", "working");
    const dataUrl = result.canvas.toDataURL(ctx.format === "jpeg" ? "image/jpeg" : "image/png", ctx.format === "jpeg" ? 0.92 : undefined);

    const mimeType = ctx.format === "jpeg" ? "image/jpeg" : "image/png";
    if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
      throw new Error("The screenshot could not be encoded. Try a shorter section.");
    }
    previewEl.src = dataUrl;
    previewWrap.classList.add("visible");
    downloadLink.href = dataUrl;
    downloadLink.download = fileName + (ctx.format === "jpeg" ? ".jpg" : ".png");
    downloadLink.classList.add("visible");

    setStatus(`Done · ${Math.round(result.widthPx)}×${Math.round(result.heightPx)}px${result.note}`, "success");
    if (mode === "continue" || mode === "15k") void refreshResumeHint();
  } catch (err) {
    setStatus("Error: " + err.message, "error");
  } finally {
    // Put the page back the way it was.
    try {
      if (tabToRestore !== null) await Engine.sendMessageToTab(tabToRestore, { action: "restoreHiddenElements" });
    } catch {
      // The page was closed or navigated away; nothing to restore.
    }
    captureBtn.disabled = false;
  }
});

