const $ = id => document.getElementById(id);
const META = [['red', 'Red'], ['orange', 'Orange'], ['yellow', 'Yellow']];
// the mode list comes from modes/*.js (the same files the page script uses)
const MODES = Object.entries(globalThis.RTS_MODES || {}).sort((a, b) => a[1].order - b[1].order).map(([k, m]) => [k, m.label, m.description]);
const PAGE_NAMES = { profile_information: 'Profile information', report_summaries: 'Report summaries (no modes here)', networks: 'Networks',
                     other: 'no rules for this page yet' };
const openGroups = new Set();
let lastRes = null, mode = 'default';

$('ver').textContent = 'v' + chrome.runtime.getManifest().version;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text; // textContent only: page text is never parsed as HTML
  return e;
}
function sendToTab(msg, cb) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, msg, res => { void chrome.runtime.lastError; cb && cb(res); });
  });
}
const byPlace = (a, b) => (a.row ?? 1e9) - (b.row ?? 1e9) || a.where.localeCompare(b.where) || a.id - b.id;

function renderModes() {
  const box = $('modes'); box.textContent = '';
  MODES.forEach(([k, name, desc]) => {
    const l = el('label', 'mode');
    const r = document.createElement('input');
    r.type = 'radio'; r.name = 'mode'; r.checked = k === mode;
    r.addEventListener('change', () => { mode = k; chrome.storage.sync.set({ mode }); setTimeout(load, 400); });
    const t = el('span', 'mode-copy');
    t.append(el('strong', 'mode-title', name), el('span', 'mode-detail', desc));
    l.append(r, t);
    box.append(l);
  });
}

function render() {
  const res = lastRes, on = $('enabled').checked;
  document.body.classList.toggle('off', !on);
  $('status').textContent = !res ? 'open the site to see results' : res.enabled ? (PAGE_NAMES[res.page] || 'this page') : 'paused';
  const sc = res && res.enabled && res.scan;
  $('scan').textContent = !sc ? '' : sc.rows
    ? `Screenshots found: ${sc.rows} row${sc.rows > 1 ? 's' : ''} · ${sc.files} other file${sc.files === 1 ? '' : 's'}`
    : 'No screenshot rows found on this page';
  if (sc && res.google) $('scan').textContent += ' · Google network page';
  const box = $('legend'); box.textContent = '';

  META.forEach(([k, name]) => {
    const items = res && res.enabled ? res.issues.filter(i => i.color === k).sort(byPlace) : [];
    const d = el('details', 'grp'); d.open = openGroups.has(k);
    d.addEventListener('toggle', () => (d.open ? openGroups.add(k) : openGroups.delete(k)));

    const s = el('summary');
    s.append(el('b', 'dot ' + k));
    s.append(el('span', '', name));
    s.append(el('strong', '', res && res.enabled ? String(items.length) : '–'));
    d.append(s);

    if (!items.length) {
      d.append(el('div', 'none', res && res.enabled ? 'Nothing here' : '—'));
    } else {
      const ul = el('ul', 'items');
      items.forEach(i => {
        const li = el('li');
        const button = el('button', 'finding');
        button.type = 'button';
        button.append(el('span', 'tag', i.row != null ? 'Row ' + i.row : i.where));
        const txt = el('span', 't'); txt.append(el('b', '', i.label));
        if (i.detail) txt.append(el('small', '', i.detail));
        button.append(txt);
        button.addEventListener('click', () => sendToTab({ type: 'goto', id: i.id }, r => {
          if (r && r.ok) { $('status').textContent = 'jumped to it on the page'; return; }
          $('status').textContent = r && r.reason === 'hidden'
            ? "it's inside a hidden section – open that section first"
            : 'not found – list refreshed, try again';
          load();
        }));
        li.append(button);
        ul.append(li);
      });
      d.append(ul);
    }
    box.append(d);
  });
}
function load() { sendToTab({ type: 'counts' }, res => { lastRes = res || null; render(); }); }

chrome.storage.sync.get({ enabled: true, mode: 'default', googleMatch: true, hoverHints: false }, v => {
  $('enabled').checked = v.enabled; $('googleMatch').checked = v.googleMatch; $('hoverHints').checked = v.hoverHints;
  mode = MODES.some(m => m[0] === v.mode) ? v.mode : 'default';
  renderModes(); render(); load();
});
$('enabled').addEventListener('change', () => { chrome.storage.sync.set({ enabled: $('enabled').checked }); render(); setTimeout(load, 400); });
$('hoverHints').addEventListener('change', () => { chrome.storage.sync.set({ hoverHints: $('hoverHints').checked }); setTimeout(load, 400); });
$('googleMatch').addEventListener('change', () => { chrome.storage.sync.set({ googleMatch: $('googleMatch').checked }); setTimeout(load, 400); });

const tabs = [$('report-tab'), $('rules-tab')];
tabs.forEach((tab, index) => {
  function selectTab(selected) {
    tabs.forEach(button => {
      const active = button === selected;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      $(button.getAttribute('aria-controls')).hidden = !active;
    });
    selected.focus();
  }

  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const targets = { ArrowLeft: tabs[1 - index], ArrowRight: tabs[1 - index], Home: tabs[0], End: tabs[1] };
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    selectTab(targets[event.key]);
  });
});

const ignoreInput = $('ignore-word');
const ignoreStatus = $('ignore-status');
let ignoredWords = [];

function renderIgnoredWords() {
  $('ignore-list').replaceChildren(...ignoredWords.map(word => {
    const item = el('li', '', word);
    const remove = el('button', '', 'Remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove ' + word);
    remove.addEventListener('click', () => {
      saveIgnoredWords(ignoredWords.filter(entry => entry !== word), 'Removed ' + word + '.');
    });
    item.append(remove);
    return item;
  }));
}

async function saveIgnoredWords(words, status) {
  const controls = [$('ignore-add'), ...$('ignore-list').querySelectorAll('button')];
  controls.forEach(control => { control.disabled = true; });
  try {
    await chrome.storage.sync.set({ sameIgnoredWords: words });
    ignoredWords = words;
    ignoreInput.value = '';
    renderIgnoredWords();
    ignoreStatus.textContent = status;
    ignoreInput.focus();
    setTimeout(load, 400);
  } catch {
    ignoreStatus.textContent = 'Couldn’t save. Try again.';
  } finally {
    controls.forEach(control => { control.disabled = false; });
  }
}

$('ignore-form').addEventListener('submit', event => {
  event.preventDefault();
  if ($('ignore-add').disabled) return;
  const word = ignoreInput.value.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9.+_-]*[a-z0-9])?$/.test(word)) {
    ignoreStatus.textContent = 'Enter one word.';
    return;
  }
  if (ignoredWords.includes(word)) {
    ignoreStatus.textContent = 'Already ignored.';
    return;
  }
  saveIgnoredWords([...ignoredWords, word].sort(), 'Added ' + word + '.');
});

chrome.storage.sync.get({ sameIgnoredWords: [] }, values => {
  if (chrome.runtime.lastError) {
    ignoreStatus.textContent = 'Couldn’t load ignored words.';
    return;
  }
  ignoredWords = values.sameIgnoredWords;
  ignoreInput.disabled = $('ignore-add').disabled = false;
  renderIgnoredWords();
});
