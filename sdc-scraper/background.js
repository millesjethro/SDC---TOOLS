// Keep one detached scraper panel per source tab, including after Chrome
// suspends and restarts the extension service worker.
const pendingPanels = new Map();
const panelKey = (tabId) => "scraperPanel_" + tabId;

async function openPanelForTab(tabId) {
  const key = panelKey(tabId);
  const stored = await chrome.storage.session.get(key);
  if (stored[key] !== undefined) {
    try {
      await chrome.windows.update(stored[key], { focused: true });
      return;
    } catch {
      // The user closed the old panel.
    }
  }

  const url = chrome.runtime.getURL("popup.html") + "?tabId=" + tabId;
  const win = await chrome.windows.create({ url, type: "popup", width: 420, height: 760 });
  await chrome.storage.session.set({ [key]: win.id });
}

chrome.action.onClicked.addListener(({ id }) => {
  if (id === undefined || pendingPanels.has(id)) return;
  const pending = openPanelForTab(id)
    .catch((error) => console.error("Could not open scraper panel", error))
    .finally(() => pendingPanels.delete(id));
  pendingPanels.set(id, pending);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await pendingPanels.get(tabId);
  await chrome.storage.session.remove(panelKey(tabId));
});
