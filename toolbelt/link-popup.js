(() => {
const DEFAULTS = { mode: "hold", keyK: "Shift", keyLabel: "Shift", previewStyle: "auto", enabled: true };
const $ = (id) => document.getElementById(id);
let state = { ...DEFAULTS };
let listening = false;

function render() {
  $("pane-links").classList.toggle("always", state.mode === "always");
  $("key").textContent = listening ? "Press a key…  (Esc to cancel)" : state.keyLabel;
  $("key").classList.toggle("listening", listening);
  $("enabled").checked = state.enabled;
  document.querySelectorAll("#mode button").forEach((b) => b.classList.toggle("sel", b.dataset.mode === state.mode));
  document.querySelectorAll("#pstyle button").forEach((b) => b.classList.toggle("sel", b.dataset.ps === state.previewStyle));
}
function save(patch) {
  state = { ...state, ...patch };
  chrome.storage.local.set({ linkShower: state });
  render();
}

chrome.storage.local.get({ linkShower: DEFAULTS }, (s) => {
  state = { ...DEFAULTS, ...s.linkShower };
  if (state.previewStyle === "window") state.previewStyle = "auto"; // removed option
  render();
});

$("enabled").addEventListener("change", (e) => save({ enabled: e.target.checked }));
$("mode").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) save({ mode: b.dataset.mode }); });
$("pstyle").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) save({ previewStyle: b.dataset.ps }); });

$("key").addEventListener("click", () => { listening = true; render(); $("key").focus(); });
document.addEventListener("keydown", (e) => {
  if (!listening) return;
  e.preventDefault();
  listening = false;
  if (e.key === "Escape") { render(); return; }
  const label = e.key === " " ? "Space" : e.key.length === 1 ? e.key.toUpperCase() : e.key;
  save({ keyK: e.key, keyLabel: label });
});

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab || !tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "linkShower:count" }, { frameId: 0 }, (r) => {
    if (chrome.runtime.lastError || !r) { $("split").textContent = "Not available on this page"; return; }
    $("total").textContent = r.total;
    $("split").textContent = r.internal + " internal · " + r.external + " external";
  });
});

})();
