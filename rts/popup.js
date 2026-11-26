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
