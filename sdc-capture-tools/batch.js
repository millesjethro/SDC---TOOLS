(() => {
  "use strict";

  let msgId = Math.floor(Math.random() * 10000);

  function callBackground(type, data) {
    const message = { id: msgId++, type, data, timestamp: Date.now() };
    return chrome.runtime.sendMessage(message).then((resp) => {
      if (!resp) throw new Error("No response from background script");
      if (resp.err) throw new Error(resp.err.message || String(resp.err));
      return resp.res;
    });
  }

  function escapeAttr(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  const escapeHtml = escapeAttr;

  function anchorTabId() {
    const params = new URLSearchParams(location.search);
    const raw = params.get("anchorTabId");
    return raw !== null ? Number(raw) : undefined;
  }

  // ---------- Draft persistence (so navigating to Instructions and back doesn't lose your rows) ----------
  const DRAFT_KEY = "sdcBulkModeDraft";
  function saveDraft() {
    try {
      const rows = Array.from(document.querySelectorAll("#rows .row")).map((row) => ({
        tabId: Number(row.dataset.tabId),
        url: row.querySelector(".url-input").value,
        actionType: row.querySelector(".row-mode").value,
        maxShots: row.querySelector(".row-shots").value,
        fileName: row.querySelector(".name-input").value,
      }));
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        rows,
        actionType: document.getElementById("actionType").value,
        maxShots: sharedMaxShots.value,
        saveMetadata: document.getElementById("saveMetadataChk").checked,
        shortPlatformPrefixes: document.getElementById("shortPlatformPrefixesChk").checked,
        allSame: document.getElementById("allSameChk").checked,
      }));
    } catch (e) {}
  }
  function loadDraft() {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  const draft = loadDraft();

  // ---------- Toast notifications ----------
  const toastEl = document.getElementById("toast");
  let toastTimer = null;
  function showToast(message, kind = "default") {
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.className = "toast toast--show" + (kind !== "default" ? ` toast--${kind}` : "");
    toastEl.hidden = false;
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("toast--show");
      setTimeout(() => {
        toastEl.hidden = true;
      }, 220);
    }, 2600);
  }

  // ---------- Instructions (separate page) ----------
  document.getElementById("instructionBtn").addEventListener("click", () => {
    saveDraft();
    window.location.href = "instructions.html" + window.location.search;
  });

  // ---------- Exit ----------
  document.getElementById("exitBtn").addEventListener("click", () => {
    chrome.tabs.getCurrent((tab) => {
      if (tab && tab.id != null) chrome.tabs.remove(tab.id);
      else window.close();
    });
  });

  // ---------- URL list rows ----------
  const rowsEl = document.getElementById("rows");
  const actionTypeEl = document.getElementById("actionType");
  const saveMetadataChk = document.getElementById("saveMetadataChk");
  const shortPlatformPrefixesChk = document.getElementById("shortPlatformPrefixesChk");
  const allSameChk = document.getElementById("allSameChk");
  const rowModeLabel = document.getElementById("rowModeLabel");
  const startBtn = document.getElementById("startBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const progressLine = document.getElementById("progressLine");
  const detailsToggle = document.getElementById("detailsToggle");
  const logWrap = document.getElementById("logWrap");
  const logList = document.getElementById("logList");
  const sharedShotsLabel = document.getElementById("sharedShotsLabel");
  const sharedMaxShots = document.getElementById("sharedMaxShots");
  const rowShotsLabel = document.getElementById("rowShotsLabel");

  function createTabRow(tab, saved) {
    const row = document.createElement("div");
    row.className = "row";
    row.dataset.tabId = tab.id;
    row.innerHTML = `
      <input type="url" class="url-input" aria-label="Tab URL" readonly />
      <input type="text" class="name-input" aria-label="File name" placeholder="(optional)" />
      <input type="number" class="max-shots row-shots" aria-label="Max Shots for this tab" min="1" step="1" hidden />
    `;
    row.querySelector(".name-input").value = saved?.fileName || "";
    const mode = document.createElement("select");
    mode.className = "mode-select row-mode";
    mode.setAttribute("aria-label", "Capture mode for this tab");
    mode.append(...Array.from(actionTypeEl.options, option => option.cloneNode(true)));
    mode.value = saved?.actionType || actionTypeEl.value;
    const shots = row.querySelector(".row-shots");
    shots.value = saved?.maxShots || sharedMaxShots.value;
    row.insertBefore(mode, shots);
    mode.addEventListener("change", () => syncModeControls(false));
    return row;
  }

  function syncModeControls(locked) {
    allSameChk.disabled = locked;
    actionTypeEl.disabled = locked || !allSameChk.checked;
    rowModeLabel.hidden = allSameChk.checked;
    sharedShotsLabel.hidden = !allSameChk.checked || actionTypeEl.value !== "timeline";
    sharedMaxShots.disabled = locked;
    const showRowShots = !allSameChk.checked &&
      Array.from(rowsEl.querySelectorAll(".row-mode")).some(mode => mode.value === "timeline");
    rowShotsLabel.hidden = !showRowShots;
    rowsEl.classList.toggle("has-row-shots", showRowShots);
    rowsEl.querySelectorAll(".row-mode").forEach((mode) => {
      mode.hidden = allSameChk.checked;
      mode.disabled = locked;
      const shots = mode.nextElementSibling;
      shots.hidden = allSameChk.checked || mode.value !== "timeline";
      shots.disabled = locked;
    });
  }

  actionTypeEl.addEventListener("change", () => syncModeControls(false));
  allSameChk.addEventListener("change", () => syncModeControls(false));

  function badgeFor(status) {
    if (status === "done") return '<span class="badge done">done</span>';
    if (status === "error") return '<span class="badge error">error</span>';
    if (status === "cancelled") return '<span class="badge cancelled">cancelled</span>';
    return '<span class="badge current">running</span>';
  }

  function renderLog(log, current) {
    const rows = (log || [])
      .map((item, idx) => ({ item, idx }))
      .reverse()
      .map(({ item, idx }) => {
        const names = item.fileName ? item.fileName.split(", ").filter(Boolean) : [];
        const nameBit = names.length
          ? `<span class="log-name">${names.map((n) => escapeHtml(n) + ".jpg").join(", ")}</span>`
          : item.status === "error" && item.message
            ? `<span class="log-name" style="white-space:normal;color:var(--danger)">${escapeHtml(item.message)}</span>`
            : "";
        return `<li><span class="log-url">${escapeHtml(item.url)}</span>${nameBit}${badgeFor(item.status)}</li>`;
      });
    if (current) rows.unshift(`<li><span class="log-url">${escapeHtml(current)}</span>${badgeFor("running")}</li>`);
    logList.innerHTML = rows.join("");
  }

  let activeRows = [];

  function setRowsLocked(locked) {
    syncModeControls(locked);
    saveMetadataChk.disabled = locked;
    shortPlatformPrefixesChk.disabled = locked;
    rowsEl.querySelectorAll(".name-input").forEach((input) => {
      input.disabled = locked;
    });
  }

  function syncRowsWithLog(log) {
    const byTab = new Map((log || []).map(entry => [entry.tabId, entry]));
    activeRows.forEach(row => {
      const entry = byTab.get(Number(row.dataset.tabId));
      row.classList.toggle("row--done", entry?.status === "done");
      row.classList.toggle("row--error", entry?.status === "error");
    });
  }

  let batchWasRunning = false;
  function render(status) {
    if (!status) {
      syncRowsWithLog([]);
      progressLine.hidden = true;
      detailsToggle.hidden = true;
      logWrap.hidden = true;
      startBtn.hidden = false;
      startBtn.disabled = false;
      cancelBtn.hidden = true;
      setRowsLocked(false);
      batchWasRunning = false;
      return;
    }
    const { total, completed, log, running, current } = status;
    progressLine.hidden = false;
    progressLine.textContent = running
      ? `PROGRESS ${completed + 1}/${total} : ${current || ""}`
      : `Finished: ${(log || []).filter(item => item.status === "done").length} of ${total} captured`;

    startBtn.hidden = !!running;
    startBtn.disabled = !!running;
    cancelBtn.hidden = !running;
    cancelBtn.disabled = false;
    setRowsLocked(!!running);

    detailsToggle.hidden = !(log && log.length);
    renderLog(log, running ? current : null);
    syncRowsWithLog(log);

    if (batchWasRunning && !running) {
      const errors = (log || []).filter((i) => i.status === "error").length;
      const cancelled = (log || []).some((i) => i.status === "cancelled");
      if (cancelled) showToast(`Bulk capture cancelled (${completed} of ${total} done)`);
      else if (errors) showToast(`Bulk capture finished with ${errors} error${errors > 1 ? "s" : ""} (${completed}/${total})`, "error");
      else showToast(`Bulk capture finished — ${completed}/${total} done`, "success");
    }
    batchWasRunning = !!running;
  }

  detailsToggle.addEventListener("click", () => {
    logWrap.hidden = !logWrap.hidden;
    detailsToggle.textContent = logWrap.hidden ? "Show details ▾" : "Hide details ▴";
  });

  async function refreshOpenTabs() {
    const { tabs } = await callBackground("getOpenTabs", { anchorTabId: anchorTabId() });
    const existing = new Map(Array.from(rowsEl.children, row => [Number(row.dataset.tabId), row]));
    const rows = tabs.map((tab) => {
      const saved = draft?.rows?.find(item => item.tabId === tab.id && item.url === tab.url)
        || draft?.rows?.find(item => item.tabId == null && item.url === tab.url);
      const row = existing.get(tab.id) || createTabRow(tab, saved);
      row.querySelector(".url-input").value = tab.url;
      return row;
    });
    rowsEl.replaceChildren(...rows);
    syncModeControls(batchWasRunning);
    return tabs;
  }

  startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    try {
      const tabs = await refreshOpenTabs();
      if (!tabs.length) {
        progressLine.hidden = false;
        progressLine.textContent = "No web tabs to capture in this window.";
        startBtn.disabled = false;
        return;
      }
      activeRows = Array.from(rowsEl.children);
      const items = tabs.map((tab, index) => {
        const row = activeRows[index];
        const actionType = allSameChk.checked ? actionTypeEl.value : row.querySelector(".row-mode").value;
        const shotsInput = allSameChk.checked ? sharedMaxShots : row.querySelector(".row-shots");
        const maxShots = actionType === "timeline" ? shotsInput.valueAsNumber : undefined;
        if (actionType === "timeline" && (!Number.isSafeInteger(maxShots) || maxShots < 1)) {
          shotsInput.focus();
          throw new Error("Enter a whole number of at least 1 for Max Shots.");
        }
        return {tabId: tab.id, url: tab.url, fileName: row.querySelector(".name-input").value.trim(), actionType, maxShots};
      });
      const result = await callBackground("startBatchCapture", {
        items,
        actionType: actionTypeEl.value,
        anchorTabId: anchorTabId(),
        saveMetadata: saveMetadataChk.checked,
        shortPlatformPrefixes: shortPlatformPrefixesChk.checked,
        useTabs: true,
      });
      if (!result?.started) throw new Error(result?.error || "No tabs to capture");
    } catch (err) {
      progressLine.hidden = false;
      progressLine.textContent = "Failed to start: " + err.message;
      startBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener("click", async () => {
    cancelBtn.disabled = true;
    try {
      await callBackground("cancelBatchCapture", {});
    } catch (err) {
      console.error(err);
    }
  });

  if (draft) {
    if (draft.actionType) actionTypeEl.value = draft.actionType;
    allSameChk.checked = draft.allSame !== false;
    sharedMaxShots.value = draft.maxShots || "10";
    saveMetadataChk.checked = !!draft.saveMetadata;
    shortPlatformPrefixesChk.checked = !!draft.shortPlatformPrefixes;
  }
  syncModeControls(false);

  // ---------- Shared message listener ----------
  let receivedProgress = false;
  chrome.runtime.onMessage.addListener((message) => {
    if (!message) return;
    if (message.type === "batchProgress") {
      receivedProgress = true;
      render(message.data);
    }
  });

  startBtn.disabled = true;
  refreshOpenTabs().then(() => {
    activeRows = Array.from(rowsEl.children);
    return callBackground("getBatchStatus", {});
  }).then((status) => {
    if (receivedProgress) return;
    const activeStatus = status?.running ? status : null;
    render(activeStatus);
    if (!activeStatus && !activeRows.length) {
      progressLine.hidden = false;
      progressLine.textContent = "No web tabs to capture in this window.";
    }
  }).catch((err) => {
    render(null);
    progressLine.hidden = false;
    progressLine.textContent = "Couldn't load your open tabs: " + err.message;
  });
})();
