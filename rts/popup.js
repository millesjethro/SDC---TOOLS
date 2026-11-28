const modes = globalThis.RTS_MODES;
const list = document.getElementById('modes');
const status = document.getElementById('mode-status');
document.getElementById('ver').textContent = 'v' + chrome.runtime.getManifest().version;

const toggleDefaults = { enabled: true, googleMatch: true, relatedHighlightsOnTimeline: false };
chrome.storage.sync.get({ mode: 'bulk_rh', ...toggleDefaults }, values => {
  if (chrome.runtime.lastError) {
    status.textContent = 'Couldn’t load the report mode.';
    return;
  }

  for (const key of Object.keys(toggleDefaults)) {
    const toggle = document.getElementById(key);
    toggle.checked = values[key];
    toggle.disabled = false;
    toggle.addEventListener('change', async () => {
      const checked = toggle.checked;
      toggle.disabled = true;
      try {
        await chrome.storage.sync.set({ [key]: checked });
        status.textContent = '';
      } catch {
        toggle.checked = !checked;
        status.textContent = 'Couldn’t save the setting.';
      } finally {
        toggle.disabled = false;
      }
    });
  }

  let savedMode = Object.hasOwn(modes, values.mode) ? values.mode : 'bulk_rh';
  const radios = [];
  for (const [key, config] of Object.entries(modes).sort((a, b) => a[1].order - b[1].order)) {
    const label = document.createElement('label');
    label.className = 'mode';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'mode';
    radio.value = key;
    radio.checked = key === savedMode;
    radios.push(radio);
    radio.addEventListener('change', async () => {
      radios.forEach(option => { option.disabled = true; });
      try {
        await chrome.storage.sync.set({ mode: key });
        savedMode = key;
        status.textContent = '';
      } catch {
        radios.find(option => option.value === savedMode).checked = true;
        status.textContent = 'Couldn’t save the report mode.';
      } finally {
        radios.forEach(option => { option.disabled = false; });
      }
    });

    const copy = document.createElement('span');
    copy.className = 'mode-copy';
    const title = document.createElement('strong');
    title.className = 'mode-title';
    title.textContent = config.label;
    const detail = document.createElement('span');
    detail.className = 'mode-detail';
    detail.textContent = config.description;
    copy.append(title, detail);
    label.append(radio, copy);
    list.append(label);
  }
});

const tabs = [...document.querySelectorAll('.popup-tabs [role="tab"]')];
function activateTab(selected) {
  for (const tab of tabs) {
    const active = tab === selected;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
  }
  selected.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[1 - index];
    activateTab(next);
  });
});

const ignoreWords = document.getElementById('google-ignore-words');
const ignoreSave = document.getElementById('google-ignore-save');
const ignoreStatus = document.getElementById('google-ignore-status');
chrome.storage.sync.get({ googleIgnoredWords: [] }, values => {
  if (chrome.runtime.lastError) {
    ignoreStatus.textContent = 'Couldn’t load ignored words.';
    return;
  }
  ignoreWords.value = values.googleIgnoredWords.join('\n');
  ignoreWords.disabled = ignoreSave.disabled = false;
});

document.getElementById('google-ignore-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (ignoreSave.disabled) return;
  const labels = [...new Set(ignoreWords.value.split(/\r?\n/)
    .map(line => line.trim().replace(/\s+/g, ' ').toLowerCase()).filter(Boolean))];
  ignoreSave.disabled = true;
  ignoreWords.disabled = true;
  try {
    await chrome.storage.sync.set({ googleIgnoredWords: labels });
    ignoreWords.value = labels.join('\n');
    ignoreStatus.textContent = 'Saved.';
  } catch {
    ignoreStatus.textContent = 'Couldn’t save ignored words.';
  } finally {
    ignoreWords.disabled = ignoreSave.disabled = false;
  }
});
