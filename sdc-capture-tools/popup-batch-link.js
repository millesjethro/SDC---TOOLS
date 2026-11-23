document.getElementById("sdc-batch-mode-btn").addEventListener("click", async () => {
  let anchorTabId = "";
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id != null && !activeTab.url.startsWith("chrome-extension://")) {
      anchorTabId = activeTab.id;
    }
  } catch (e) {
    // fall through with no anchor tab — batch.html will create its own working tab
  }
  const url =
    chrome.runtime.getURL("batch.html") +
    (anchorTabId !== "" ? "?anchorTabId=" + anchorTabId : "");
  chrome.windows.create({ url, type: "popup", width: 680, height: 900 });
});

// ---- Compact "Screenshot Type" list: two columns, no scrolling, short labels ----
(function () {
  const style = document.createElement("style");
  style.textContent = `
    .capture-types {
      display: grid !important;
      grid-template-columns: 1fr 1fr;
      gap: .375rem !important;
      max-height: none !important;
      overflow: visible !important;
    }
    .capture-types .pill {
      padding: .4rem .5rem;
      font-size: 12px;
      line-height: 1.25;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;
  document.head.appendChild(style);

  const SHORT = {
    "Single post": "Post",
    "Single post with comments": "Post + comments",
    "Profile timeline - First": "Timeline: first",
    "Profile timeline - Succeeding": "Timeline: next",
    "Profile timeline - Landing": "Timeline: landing",
    "Story": "Story",
    "Profile information": "Profile info",
    "Marketplace profile - First": "Market: first",
    "Marketplace profile - Succeeding": "Market: next",
    "Generic page - First": "Page: first",
    "Generic page - All": "Page: all",
  };

  function shorten() {
    document.querySelectorAll(".capture-types .pill").forEach((pill) => {
      const node = pill.firstChild;
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const full = node.nodeValue.trim();
      if (SHORT[full] && node.nodeValue !== SHORT[full]) {
        pill.title = full;
        node.nodeValue = SHORT[full];
      }
    });
  }

  const root = document.getElementById("root");
  if (root) new MutationObserver(shorten).observe(root, { childList: true, subtree: true });
  shorten();
})();
