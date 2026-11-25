// =============================================================
// Toolbelt hub popup — tab switching + the three tools' UI logic
// =============================================================

// ---------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------
const tabButtons = document.querySelectorAll(".tab");
const panes = {
  translate: document.getElementById("pane-translate"),
  tools: document.getElementById("pane-tools"),
  facebook: document.getElementById("pane-facebook"),
  links: document.getElementById("pane-links"),
};

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    Object.values(panes).forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    panes[btn.dataset.pane].classList.add("active");
    chrome.storage.local.set({ toolbeltTab: btn.dataset.pane });
  });
});

chrome.storage.local.get("toolbeltTab", ({ toolbeltTab }) => {
  const previousTabs = { delete: "translate", items: "tools", width: "tools", source: "tools" };
  const pane = previousTabs[toolbeltTab] ?? toolbeltTab;
  const button = Array.from(tabButtons).find((tab) => tab.dataset.pane === pane);
  if (button) button.click();
});

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// =================================================================
// TRANSLATE
// =================================================================

const LANGUAGES = [
  ["en", "English"], ["es", "Spanish"], ["fr", "French"], ["de", "German"],
  ["it", "Italian"], ["pt", "Portuguese"], ["ru", "Russian"], ["ja", "Japanese"],
  ["ko", "Korean"], ["zh-CN", "Chinese (Simplified)"], ["zh-TW", "Chinese (Traditional)"],
  ["ar", "Arabic"], ["hi", "Hindi"], ["tr", "Turkish"], ["nl", "Dutch"], ["pl", "Polish"],
  ["vi", "Vietnamese"], ["th", "Thai"], ["id", "Indonesian"], ["sv", "Swedish"],
  ["el", "Greek"], ["he", "Hebrew"], ["uk", "Ukrainian"], ["tl", "Filipino"],
];

const langSelect = document.getElementById("lang");
LANGUAGES.forEach(([code, name]) => {
  const opt = document.createElement("option");
  opt.value = code;
  opt.textContent = name;
  langSelect.appendChild(opt);
});

const translatePageBtn = document.getElementById("translatePageBtn");
const translateSingleBtn = document.getElementById("translateSingleBtn");
const editBtn = document.getElementById("editBtn");
const deleteSingleBtn = document.getElementById("deleteSingleBtn");
const deleteGroupBtn = document.getElementById("deleteGroupBtn");
const stopBtn = document.getElementById("stopBtn");
const translateStatus = document.getElementById("translateStatus");

function setTranslateStatus(msg, kind) {
  translateStatus.textContent = msg;
  translateStatus.classList.remove("error", "ok");
  if (kind) translateStatus.classList.add(kind);
}

chrome.storage &&
  chrome.storage.local.get(["lastLang"], (res) => {
    if (res && res.lastLang) langSelect.value = res.lastLang;
  });

function sendToTab(action, extra) {
  return new Promise(async (resolve) => {
    const tab = await activeTab();
    if (!tab || !tab.id) {
      setTranslateStatus("No active tab found.", "error");
      return resolve(null);
    }
    chrome.tabs.sendMessage(tab.id, Object.assign({ action }, extra), (res) => {
      if (chrome.runtime.lastError) {
        setTranslateStatus("Can't reach that tab — reload the page, then try again.", "error");
        return resolve(null);
      }
      resolve(res);
    });
  });
}

function renderTranslateState(state) {
  if (!state) return;
  translateSingleBtn.classList.toggle("btn-on", state.translateMode === "single");
  editBtn.classList.toggle("btn-on", state.editMode === true);
  deleteSingleBtn.classList.toggle("btn-danger-active", state.deleteMode === "single");
  deleteGroupBtn.classList.toggle("btn-danger-active", state.deleteMode === "group");
  setTranslateStatus("");
}

// Language change also reaches an already-running page immediately.
langSelect.addEventListener("change", () => {
  chrome.storage.local.set({ lastLang: langSelect.value });
  sendToTab("updateLang", { lang: langSelect.value });
});

translatePageBtn.addEventListener("click", async () => {
  chrome.storage.local.set({ lastLang: langSelect.value });
  const res = await sendToTab("translateWholePage", { lang: langSelect.value });
  if (res) {
    setTranslateStatus("Translating page…", "ok");
    setTimeout(() => window.close(), 400);
  }
});

translateSingleBtn.addEventListener("click", async () => {
  chrome.storage.local.set({ lastLang: langSelect.value });
  await sendToTab("updateLang", { lang: langSelect.value });
  renderTranslateState(await sendToTab("toggleTranslateSingle", {}));
});

editBtn.addEventListener("click", async () => {
  renderTranslateState(await sendToTab("toggleEdit", {}));
});

deleteSingleBtn.addEventListener("click", async () => {
  renderTranslateState(await sendToTab("toggleDeleteSingle", {}));
});

deleteGroupBtn.addEventListener("click", async () => {
  renderTranslateState(await sendToTab("toggleDeleteGroup", {}));
});

stopBtn.addEventListener("click", async () => {
  if (await sendToTab("stopTranslate", {})) {
    renderTranslateState(await sendToTab("getFullState", {}));
  }
});

sendToTab("getFullState", {}).then(renderTranslateState);

// =================================================================
// ITEMS  (Item Counter)
// =================================================================

const scanBtn = document.getElementById("scanBtn");
const scanPostsBtn = document.getElementById("scanPostsBtn");
const maxPostsInput = document.getElementById("maxPostsInput");

chrome.storage.local.get(["maxPosts"], (res) => {
  if (res && res.maxPosts) maxPostsInput.value = res.maxPosts;
});
const itemsStatus = document.getElementById("itemsStatus");
const totalCard = document.getElementById("totalCard");
const totalLabel = document.getElementById("totalLabel");
const totalValue = document.getElementById("totalValue");
const totalSub = document.getElementById("totalSub");
const itemsList = document.getElementById("itemsList");
const itemsEmpty = document.getElementById("itemsEmpty");

function setItemsStatus(msg, isError = false) {
  itemsStatus.textContent = msg;
  itemsStatus.classList.toggle("error", isError);
}

function renderItemResults(result, tabTitle) {
  totalCard.classList.remove("show");
  itemsList.classList.remove("show");
  itemsEmpty.classList.remove("show");
  itemsList.innerHTML = "";

  if (result.mode === "facebook-posts") {
    // Aggregate-only mode — just the total, capped at the user's max.
    totalLabel.textContent = "Total Posts";
    totalValue.textContent = result.total.toLocaleString() + (result.hitCap ? "+" : "");
    totalSub.textContent = result.hitCap ? "Reached your max — there may be more" : "posts counted";
    totalCard.classList.add("show");
    setItemsStatus('Scanned "' + (tabTitle || "page") + '".');
    return;
  }

  const isFacebookPhotos = result.mode === "facebook";
  const isFacebookReels = result.mode === "facebook-reels";
  totalLabel.textContent = isFacebookPhotos ? "Total Photos" : isFacebookReels ? "Total Reels" : "Total Pins";
  const noun = isFacebookPhotos ? "photo" : isFacebookReels ? "reel" : "match";

  if (!result.items.length) {
    itemsEmpty.textContent = isFacebookPhotos
      ? 'No photos found on this page. Try a photo album or "Photos" tab, then scan.'
      : isFacebookReels
      ? "No reels found on this page. Scroll the Reels tab a bit, then scan."
      : 'No "Pin"/"Pins" counts found on this page. Try a board, section, or profile page.';
    itemsEmpty.classList.add("show");
    setItemsStatus('Scanned "' + (tabTitle || "page") + '".');
    return;
  }

  totalValue.textContent = result.total.toLocaleString();
  totalSub.textContent = result.items.length + " " + noun + (result.items.length === 1 ? "" : "s") + " found";
  totalCard.classList.add("show");

  for (const item of result.items) {
    const row = document.createElement("div");
    row.className = "row";

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = item.text;
    name.title = item.text;

    const count = document.createElement("span");
    count.className = "count";
    count.textContent = item.count.toLocaleString();

    row.appendChild(name);
    row.appendChild(count);
    itemsList.appendChild(row);
  }
  itemsList.classList.add("show");

  setItemsStatus('Scanned "' + (tabTitle || "page") + '".');
}

function runScan() {
  scanBtn.disabled = true;
  setItemsStatus("Scanning…");
  totalCard.classList.remove("show");
  itemsList.classList.remove("show");
  itemsEmpty.classList.remove("show");

  chrome.runtime.sendMessage({ action: "scanItems" }, (res) => {
    scanBtn.disabled = false;
    if (chrome.runtime.lastError) {
      setItemsStatus("Something went wrong reaching the extension. Try again.", true);
      return;
    }
    if (!res || !res.ok) {
      setItemsStatus((res && res.error) || "Something went wrong.", true);
      return;
    }
    renderItemResults(res.result, res.tabTitle);
  });
}

scanBtn.addEventListener("click", runScan);

function runFacebookPostsScan() {
  const maxPosts = parseInt(maxPostsInput.value, 10);
  if (!maxPosts || maxPosts < 1) {
    setItemsStatus("Enter a max of at least 1.", true);
    return;
  }
  chrome.storage.local.set({ maxPosts });
  scanPostsBtn.disabled = true;
  setItemsStatus(`Scrolling the feed (up to ${maxPosts.toLocaleString()} posts)…`);
  totalCard.classList.remove("show");
  itemsList.classList.remove("show");
  itemsEmpty.classList.remove("show");

  chrome.runtime.sendMessage({ action: "scanFacebookPosts", maxPosts }, (res) => {
    scanPostsBtn.disabled = false;
    if (chrome.runtime.lastError) {
      setItemsStatus("Something went wrong reaching the extension. Try again.", true);
      return;
    }
    if (!res || !res.ok) {
      setItemsStatus((res && res.error) || "Something went wrong.", true);
      return;
    }
    renderItemResults(res.result, res.tabTitle);
  });
}

scanPostsBtn.addEventListener("click", runFacebookPostsScan);


// =================================================================
// SOURCE  (page source copy / save)
// =================================================================

const copySourceBtn = document.getElementById("copySourceBtn");
const saveSourceBtn = document.getElementById("saveSourceBtn");
const sourceStatus = document.getElementById("sourceStatus");

function setSourceStatus(msg, kind) {
  sourceStatus.textContent = msg;
  sourceStatus.classList.remove("error", "ok", "warning");
  if (kind) sourceStatus.classList.add(kind);
}

async function runSource(action, button) {
  button.disabled = true;
  setSourceStatus("Working…");
  try {
    const res = await chrome.runtime.sendMessage({ action });
    if (!res?.ok) {
      setSourceStatus(res?.error || "Could not read source.", "error");
      return;
    }
    const success = action === "backup-source" ? "Source copied." : "Download started.";
    setSourceStatus(res.warning ? success + " " + res.warning : success, res.warning ? "warning" : "ok");
  } catch (err) { setSourceStatus(err.message, "error"); }
  finally { button.disabled = false; }
}
copySourceBtn.addEventListener("click", () => runSource("backup-source", copySourceBtn));
saveSourceBtn.addEventListener("click", () => runSource("save-source-file", saveSourceBtn));

// =================================================================
// WIDTH
// =================================================================

const widthInput = document.getElementById("widthInput");
const applyWidthBtn = document.getElementById("applyWidthBtn");
const resetWidthBtn = document.getElementById("resetWidthBtn");
const widthStatus = document.getElementById("widthStatus");

function setWidthStatus(msg, kind) {
  widthStatus.textContent = msg;
  widthStatus.classList.remove("error", "ok");
  if (kind) widthStatus.classList.add(kind);
}

chrome.storage.local.get(["lastPageWidth"], (res) => {
  if (res && res.lastPageWidth) widthInput.value = res.lastPageWidth;
});

applyWidthBtn.addEventListener("click", () => {
  const px = Number(widthInput.value);
  if (!Number.isInteger(px) || px < 200 || px > 10000) {
    setWidthStatus("Enter a width from 200 to 10000px.", "error");
    return;
  }
  chrome.storage.local.set({ lastPageWidth: px });
  applyWidthBtn.disabled = true;
  chrome.runtime.sendMessage({ action: "setPageWidth", width: px }, (res) => {
    applyWidthBtn.disabled = false;
    if (chrome.runtime.lastError || !res || !res.ok) {
      setWidthStatus((res && res.error) || "Couldn't apply — reload the page and try again.", "error");
      return;
    }
    setWidthStatus(`Applied — page capped at ${px}px.`, "ok");
  });
});

resetWidthBtn.addEventListener("click", () => {
  resetWidthBtn.disabled = true;
  chrome.runtime.sendMessage({ action: "resetPageWidth" }, (res) => {
    resetWidthBtn.disabled = false;
    if (chrome.runtime.lastError || !res || !res.ok) {
      setWidthStatus((res && res.error) || "Couldn't reset — reload the page and try again.", "error");
      return;
    }
    setWidthStatus("Reset to the page's normal width.", "ok");
  });
});

