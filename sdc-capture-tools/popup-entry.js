const platformLabel = document.getElementById("platformLabel");

function getHostname(tab) {
  try {
    const url = new URL(tab?.url);
    return ["http:", "https:"].includes(url.protocol) ? url.hostname.replace(/\.$/, "") : "";
  } catch {
    return "";
  }
}

async function openCaptureControls() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  const hostname = getHostname(tab);
  if (!hostname) {
    platformLabel.textContent = "Open a web page to capture it.";
    return;
  }

  const platform = detectPlatform(hostname);
  if (platform) {
    const {initSectionCapture} = await import("./section-capture/popup.js");
    initSectionCapture(tab, platform, hostname);
    platformLabel.textContent = platform.verified
      ? platform.label
      : `${platform.label} (unverified selectors)`;
    document.getElementById("mainUI").hidden = false;
    return;
  }

  await import("./chunks/popup-C0ZjUK_6.js");
  await import("./popup-batch-link.js");
  platformLabel.textContent = hostname;
  document.getElementById("screenshooterControls").hidden = false;
}

openCaptureControls().catch(error => {
  platformLabel.textContent = `Could not open capture options. ${error.message}`;
});
