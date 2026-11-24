const STORAGE_PREFIX = "idsResult_";
const WORKBOOK_KEY_PREFIX = "idsWorkbook_"; // keyed by tab id, not URL, so it survives navigating between e.g. Followers and Following pages
const AUTOSCROLL_PREF_KEY = "idsAutoScrollPref";

const els = {
  selectorInput: document.getElementById("selectorInput"),
  pickBtn: document.getElementById("pickBtn"),
  emptyState: document.getElementById("emptyState"),
  tableWrap: document.getElementById("tableWrap"),
  dataTable: document.getElementById("dataTable"),
  statusBar: document.getElementById("statusBar"),
  clearBtn: document.getElementById("clearBtn"),
  copyBtn: document.getElementById("copyBtn"),
  excelBtn: document.getElementById("excelBtn"),
  platformSelect: document.getElementById("platformSelect"),
  sortNameBtn: document.getElementById("sortNameBtn"),
  sortLabel: document.getElementById("sortLabel"),
  autoScrollToggle: document.getElementById("autoScrollToggle"),
  backBtn: document.getElementById("backBtn"),
  nextBtn: document.getElementById("nextBtn"),
  navLabel: document.getElementById("navLabel"),
  searchInput: document.getElementById("searchInput"),
  addSheetBtn: document.getElementById("addSheetBtn"),
  sheetChips: document.getElementById("sheetChips"),
};

let currentData = null; // the rendered/exported view (possibly filtered)
let rawData = null; // the untouched selected candidate (raw scrape)
let candidatesList = []; // all candidate matches found near the last click
let candidateIndex = 0; // which candidate is currently selected
let activeTab = null;
let sortDirection = null; // null | "asc" | "desc"
let pickerPort = null;
let searchQuery = ""; // filters the displayed/exported rows, doesn't touch the underlying data
let savedSheets = []; // sheets queued for a multi-sheet workbook export: [{name, columns, rows}]

function storageKeyFor(url) {
  return STORAGE_PREFIX + activeTab.id + "_" + encodeURIComponent(url);
}

function workbookKeyForTab(tabId) {
  return WORKBOOK_KEY_PREFIX + tabId;
}

function getSelectedFilter() {
  return els.platformSelect.value;
}

function setSelectedFilter(value) {
  els.platformSelect.value = value;
}

function getNameColumnIndex(data) {
  if (!data || !data.columns) return -1;
  const idx = data.columns.findIndex((c) => c.trim().toLowerCase() === "name");
  return idx !== -1 ? idx : 0;
}

function updateSortButtonLabel() {
  els.sortNameBtn.classList.toggle("active", !!sortDirection);
  if (sortDirection === "asc") {
    els.sortLabel.textContent = "Sorted A–Z";
  } else if (sortDirection === "desc") {
    els.sortLabel.textContent = "Sorted Z–A";
  } else {
    els.sortLabel.textContent = "Sort Name A–Z";
  }
}

function applySortIfNeeded() {
  if (!sortDirection || !currentData || !currentData.rows.length) return;
  const idx = getNameColumnIndex(currentData);
  currentData.rows.sort((a, b) => {
    const av = (a[idx] || "").toLowerCase();
    const bv = (b[idx] || "").toLowerCase();
    if (av < bv) return sortDirection === "asc" ? -1 : 1;
    if (av > bv) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
}

function usernameFromFacebookLink(link) {
  if (!link) return "";
  let s = link;
  s = s.replace(/^https?:\/\/(www\.|m\.|mbasic\.)?facebook\.com\//i, "");
  s = s.replace(/^profile\.php\?id=/i, "");
  s = s.split(/[?&#]/)[0]; // drop any leftover query/hash
  s = s.replace(/\/+$/, "");
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

const FOLLOW_STATE_WORDS = ["follow", "following", "requested"];

function dropBlankRows(rows) {
  return rows.filter((row) => row.some((v) => (v || "").trim().length > 0));
}

function applyPlatformFilter(raw, platform) {
  if (!raw || !raw.rows) return raw;

  let result;

  if (platform === "facebook") {
    const linkIdx = raw.columns.findIndex((c) => c === "Link");
    const rows = raw.rows.map((r) => {
      const name = r[0] || "";
      const link = linkIdx >= 0 ? r[linkIdx] || "" : "";
      return [name, usernameFromFacebookLink(link)];
    });
    result = { columns: ["Name", "Username"], rows, selectorLabel: raw.selectorLabel };
  } else if (platform === "instagram" || platform === "threads") {
    const rows = raw.rows.map((r) => {
      const username = r[0] || "";
      let name = r[1] || "";
      if (platform === "instagram" && FOLLOW_STATE_WORDS.includes(name.trim().toLowerCase())) {
        name = username;
      }
      return [name, username];
    });
    result = { columns: ["Name", "Username"], rows, selectorLabel: raw.selectorLabel };
  } else if (platform === "twitter" || platform === "tiktok") {
    const rows = raw.rows.map((r) => {
      const name = r[0] || "";
      let username = r[1] || "";
      if (platform === "twitter") {
        username = username.replace(/^@/, "");
      }
      return [name, username];
    });
    result = { columns: ["Name", "Username"], rows, selectorLabel: raw.selectorLabel };
  } else {
    // "all" — pass through a clone so edits don't mutate the raw scrape
    result = {
      columns: raw.columns.slice(),
      rows: raw.rows.map((r) => r.slice()),
      selectorLabel: raw.selectorLabel,
    };
  }

  result.rows = dropBlankRows(result.rows);
  return result;
}

function applyAndRender() {
  currentData = rawData ? applyPlatformFilter(rawData, getSelectedFilter()) : null;
  applySortIfNeeded();
  renderTable();
}

// The current dataset narrowed by the search box, without touching the
// underlying data — used for both rendering and for what COPY/EXCEL export.
function getVisibleData() {
  if (!currentData || !currentData.rows) return currentData;
  const query = searchQuery.trim().toLowerCase();
  if (!query) return currentData;
  const rows = currentData.rows.filter((row) =>
    row.some((v) => (v || "").toLowerCase().includes(query))
  );
  return { columns: currentData.columns, rows, selectorLabel: currentData.selectorLabel };
}

function setCandidates(list) {
  candidatesList = Array.isArray(list) ? list : [];
  candidateIndex = 0;
  rawData = candidatesList.length ? candidatesList[0] : null;
  updateNavButtons();
}

function updateNavButtons() {
  const total = candidatesList.length;
  els.backBtn.disabled = total <= 1 || candidateIndex <= 0;
  els.nextBtn.disabled = total <= 1 || candidateIndex >= total - 1;
  els.navLabel.textContent = total ? `Match ${candidateIndex + 1} of ${total}` : "";
}

function setStatus(msg) {
  els.statusBar.textContent = msg || "";
}

function renderTable() {
  const data = currentData;
  els.dataTable.innerHTML = "";

  if (!data || !data.rows || !data.rows.length) {
    els.emptyState.classList.remove("hidden");
    els.tableWrap.classList.add("hidden");
    els.selectorInput.value = "";
    setStatus(data && data.error ? data.error : "");
    return;
  }

  els.emptyState.classList.add("hidden");
  els.tableWrap.classList.remove("hidden");
  els.selectorInput.value = data.selectorLabel || "";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  data.columns.forEach((c, i) => {
    const th = document.createElement("th");

    const label = document.createElement("span");
    label.className = "col-label";
    label.contentEditable = "true";
    label.spellcheck = false;
    label.textContent = c;
    label.addEventListener("blur", () => {
      const val = label.textContent.trim() || `Column ${i + 1}`;
      currentData.columns[i] = val;
      persistState();
    });
    label.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        label.blur();
      }
    });

    const del = document.createElement("button");
    del.className = "col-delete";
    del.type = "button";
    del.title = "Delete column";
    del.textContent = "×";
    del.addEventListener("click", () => removeColumn(i));

    th.appendChild(label);
    th.appendChild(del);
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  els.dataTable.appendChild(thead);

  const visible = getVisibleData();
  const tbody = document.createElement("tbody");
  visible.rows.forEach((row) => {
    const tr = document.createElement("tr");
    data.columns.forEach((_, i) => {
      const td = document.createElement("td");
      td.textContent = row[i] || "";
      td.title = row[i] || "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  els.dataTable.appendChild(tbody);

  if (!visible.rows.length) {
    setStatus(`No matches for "${searchQuery.trim()}" (${data.rows.length} total rows)`);
  } else if (visible.rows.length !== data.rows.length) {
    setStatus(`${visible.rows.length} of ${data.rows.length} rows × ${data.columns.length} columns`);
  } else {
    setStatus(`${data.rows.length} rows × ${data.columns.length} columns`);
  }
}

function persistState() {
  if (!activeTab || !activeTab.url || !rawData) return;
  chrome.storage.local.set({
    [storageKeyFor(activeTab.url)]: {
      candidates: candidatesList,
      index: candidateIndex,
      filter: getSelectedFilter(),
      sort: sortDirection,
      view: currentData,
      timestamp: Date.now(),
      url: activeTab.url,
    },
  }).catch(() => setStatus("Could not save results. You can still export them."));
}

function removeColumn(index) {
  if (!currentData || currentData.columns.length <= 1) {
    setStatus("At least one column is required.");
    return;
  }
  currentData.columns.splice(index, 1);
  currentData.rows = currentData.rows.map((row) => {
    const copy = row.slice();
    copy.splice(index, 1);
    return copy;
  });
  persistState();
  renderTable();
}

async function getActiveTab() {
  // Each panel is opened bound to a specific tab (background.js passes its
  // id in the URL), so different panels — even on different monitors —
  // each stay locked to the tab they were launched from.
  const tabIdParam = new URLSearchParams(location.search).get("tabId");
  if (tabIdParam) {
    try {
      return await chrome.tabs.get(parseInt(tabIdParam, 10));
    } catch (e) {
      return null; // the original tab was closed
    }
  }
  // Fallback for a panel opened without a tabId (shouldn't normally happen).
  const [tab] = await chrome.tabs.query({ active: true, windowType: "normal" });
  return tab;
}

async function loadStoredResult() {
  if (!activeTab?.url) return;
  const key = storageKeyFor(activeTab.url);
  const legacyKey = STORAGE_PREFIX + encodeURIComponent(activeTab.url);
  const stored = await chrome.storage.local.get([key, legacyKey]);
  const val = Object.hasOwn(stored, key) ? stored[key] : stored[legacyKey];
  if (!val) return;

  if (val.candidates) {
    candidatesList = val.candidates;
    candidateIndex = typeof val.index === "number" ? val.index : 0;
    rawData = candidatesList[candidateIndex] || null;
    updateNavButtons();
    if (val.filter) setSelectedFilter(val.filter);
    if (val.sort) sortDirection = val.sort;
    updateSortButtonLabel();
    if (val.view) {
      currentData = val.view;
      renderTable();
    } else {
      applyAndRender();
    }
  } else if (val.raw) {
    // legacy single-result shape from an older version
    setCandidates([val.raw]);
    if (val.filter) setSelectedFilter(val.filter);
    if (val.sort) sortDirection = val.sort;
    updateSortButtonLabel();
    applyAndRender();
  } else {
    setCandidates([val]);
    applyAndRender();
  }
}

function finishPicker(message) {
  const port = pickerPort;
  pickerPort = null;
  port?.disconnect();
  els.pickBtn.classList.remove("active");
  els.pickBtn.setAttribute("aria-pressed", "false");
  if (message) setStatus(message);
}

async function runPicker() {
  if (pickerPort) {
    finishPicker("Selection cancelled.");
    return;
  }

  els.pickBtn.disabled = true;
  try {
    const tab = await getActiveTab();
    if (!tab) {
      setStatus("The source tab was closed.");
      return;
    }
    if (!tab.url || !/^(https?|file):/.test(tab.url)) {
      setStatus("Open an accessible webpage and click the extension icon there.");
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    const port = chrome.tabs.connect(tab.id, { name: "sdc-picker", frameId: 0 });
    pickerPort = port;
    els.pickBtn.classList.add("active");
    els.pickBtn.setAttribute("aria-pressed", "true");
    port.onDisconnect.addListener(() => {
      const error = chrome.runtime.lastError;
      if (pickerPort === port) {
        finishPicker(error ? "Could not connect to the page. Try again." : "The source page changed. Pick again to scan the new page.");
      }
    });
    port.onMessage.addListener((result) => {
      if (pickerPort !== port) return;
      if (result.ready) {
        setStatus("Click an item on the page. Press Esc to cancel.");
        return;
      }
      if (result.cancelled || result.error) {
        finishPicker(result.cancelled ? "Selection cancelled." : "Could not start the picker. Try again.");
        return;
      }

      finishPicker();
      activeTab = { ...tab, url: result.url };
      setCandidates(result.candidates);
      applyAndRender();
      persistState();
    });
    const autoScroll = els.autoScrollToggle.getAttribute("aria-pressed") === "true";
    setStatus(autoScroll ? "Auto-scrolling…" : "Starting the picker…");
    port.postMessage({ autoScroll });
  } catch {
    finishPicker("Could not access this page. Click the extension icon on the source tab and try again.");
  } finally {
    els.pickBtn.disabled = false;
  }
}

els.backBtn.addEventListener("click", () => {
  if (candidateIndex <= 0) return;
  candidateIndex--;
  rawData = candidatesList[candidateIndex];
  updateNavButtons();
  applyAndRender();
  persistState();
});

els.nextBtn.addEventListener("click", () => {
  if (candidateIndex >= candidatesList.length - 1) return;
  candidateIndex++;
  rawData = candidatesList[candidateIndex];
  updateNavButtons();
  applyAndRender();
  persistState();
});

els.platformSelect.addEventListener("change", () => {
  applyAndRender();
  persistState();
});

els.searchInput.addEventListener("input", () => {
  searchQuery = els.searchInput.value;
  renderTable();
});

els.sortNameBtn.addEventListener("click", () => {
  sortDirection = sortDirection === "asc" ? "desc" : "asc";
  updateSortButtonLabel();
  applySortIfNeeded();
  renderTable();
  persistState();
});

// Collapses any embedded line break (or other stray whitespace) in a field
// down to a single space — a raw "\n" inside one cell's text, if it ever
// slips through, gets rendered by Excel as a wrapped 2-line cell instead of
// one continuous value.
function sanitizeCell(v) {
  return String(v || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function toTSV(data) {
  const lines = [data.columns.map((c) => c + ":").join("\t")];
  data.rows.forEach((row) => {
    lines.push(data.columns.map((_, i) => sanitizeCell(row[i]).replace(/\t/g, " ")).join("\t"));
  });
  return lines.join("\n");
}

function escapeHtml(v) {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Plain-styled HTML for the clipboard: bold, colon-suffixed header, no
// borders/shading — just formatting Excel/Sheets can paste in directly.
// white-space:nowrap keeps Excel from turning on "Wrap Text" on paste,
// which otherwise breaks long names across multiple lines in one cell.
function toClipboardHTML(data) {
  const headerCells = data.columns
    .map((c) => `<th style="font-weight:bold;text-align:left;white-space:nowrap;">${escapeHtml(c)}:</th>`)
    .join("");
  const bodyRows = data.rows
    .map(
      (row) =>
        "<tr>" +
        data.columns
          .map((_, i) => `<td style="white-space:nowrap;">${escapeHtml(sanitizeCell(row[i]))}</td>`)
          .join("") +
        "</tr>"
    )
    .join("");
  return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
}

// ---------- Minimal .xlsx (OOXML/ZIP) writer — no external libraries ----------

function u16(n) {
  return [n & 0xff, (n >> 8) & 0xff];
}
function u32(n) {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
}
function strToBytes(str) {
  return Array.from(new TextEncoder().encode(str));
}

const CRC_TABLE = (() => {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Builds an uncompressed (store-method) ZIP — valid and simple, at the cost
// of a slightly larger file than a compressed one.
function buildZip(files) {
  const DOS_TIME = 0;
  const DOS_DATE = 0x21; // 1980-01-01, the ZIP epoch
  const localEntries = [];
  const centralEntries = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = strToBytes(file.name);
    const dataBytes = strToBytes(file.content);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    const local = [
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(DOS_TIME),
      ...u16(DOS_DATE),
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      ...u16(0),
      ...nameBytes,
      ...dataBytes,
    ];
    localEntries.push(local);

    centralEntries.push([
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(DOS_TIME),
      ...u16(DOS_DATE),
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...nameBytes,
    ]);

    offset += local.length;
  });

  const centralDirStart = offset;
  const centralDirBytes = [].concat(...centralEntries);

  const eocd = [
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(files.length),
    ...u16(files.length),
    ...u32(centralDirBytes.length),
    ...u32(centralDirStart),
    ...u16(0),
  ];

  const allBytes = [].concat(...localEntries, centralDirBytes, eocd);
  return new Uint8Array(allBytes);
}

function xmlEscape(v) {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colLetter(index) {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function buildColsXml(columns) {
  const cols = columns
    .map((colName, i) => {
      const isLink = colName.trim().toLowerCase() === "link";
      const width = isLink ? 45 : 26;
      const idx = i + 1;
      return `<col min="${idx}" max="${idx}" width="${width}" customWidth="1"/>`;
    })
    .join("");
  return `<cols>${cols}</cols>`;
}

function buildSheetXml(data) {
  const headerCells = data.columns
    .map((c, i) => {
      const ref = colLetter(i) + "1";
      const text = xmlEscape(c) + ":";
      return `<c r="${ref}" t="inlineStr" s="1"><is><t xml:space="preserve">${text}</t></is></c>`;
    })
    .join("");
  const rows = [`<row r="1">${headerCells}</row>`];

  data.rows.forEach((row, rIdx) => {
    const rowNum = rIdx + 2;
    const cells = data.columns
      .map((_, cIdx) => {
        const ref = colLetter(cIdx) + rowNum;
        const text = xmlEscape(sanitizeCell(row[cIdx]));
        return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
      })
      .join("");
    rows.push(`<row r="${rowNum}">${cells}</row>`);
  });

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    buildColsXml(data.columns) +
    `<sheetData>${rows.join("")}</sheetData>` +
    `</worksheet>`
  );
}

const XLSX_RELS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
  `</Relationships>`;

// No borders, no fills — just a plain style (0) and a bold style (1) for the
// header row, per the "no table format, just bold header" request.
// Both explicitly disable wrap text, so a long value overflows visually
// into empty neighboring cells instead of expanding the row height.
const XLSX_STYLES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
  `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="2">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="0"/></xf>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="0"/></xf>` +
  `</cellXfs>` +
  `</styleSheet>`;

// Excel sheet names: max 31 chars, no \ / ? * [ ] : , and must be unique.
function sanitizeSheetName(name, index, usedLower) {
  let s = String(name || `Sheet${index + 1}`)
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) s = `Sheet${index + 1}`;
  s = s.slice(0, 31);
  let candidate = s;
  let n = 2;
  while (usedLower.has(candidate.toLowerCase())) {
    const suffix = ` (${n++})`;
    candidate = s.slice(0, 31 - suffix.length) + suffix;
  }
  usedLower.add(candidate.toLowerCase());
  return candidate;
}

// Builds a workbook with one worksheet per entry in `sheets`
// ([{name, columns, rows}, ...]) — this is how Followers + Following (or
// any number of separately scraped lists) end up as separate tabs in one
// downloaded file.
function buildXlsxWorkbook(sheets) {
  const usedLower = new Set();
  const safeSheets = sheets.map((s, i) => ({
    ...s,
    name: sanitizeSheetName(s.name, i, usedLower),
  }));

  const sheetEntries = safeSheets
    .map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join("");
  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>${sheetEntries}</sheets>` +
    `</workbook>`;

  const stylesRid = safeSheets.length + 1;
  const relEntries =
    safeSheets
      .map(
        (s, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join("") +
    `<Relationship Id="rId${stylesRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  const workbookRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relEntries}</Relationships>`;

  const overrideEntries = safeSheets
    .map(
      (s, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("");
  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    overrideEntries +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;

  const files = [
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: XLSX_RELS },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRels },
    { name: "xl/styles.xml", content: XLSX_STYLES },
  ];
  safeSheets.forEach((s, i) => {
    files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, content: buildSheetXml(s) });
  });

  return buildZip(files);
}

function buildXlsx(data) {
  return buildXlsxWorkbook([{ name: "Sheet1", columns: data.columns, rows: data.rows }]);
}

els.pickBtn.addEventListener("click", runPicker);

els.clearBtn.addEventListener("click", async () => {
  finishPicker();
  rawData = null;
  currentData = null;
  candidatesList = [];
  candidateIndex = 0;
  updateNavButtons();
  sortDirection = null;
  updateSortButtonLabel();
  searchQuery = "";
  els.searchInput.value = "";
  renderTable();
  setStatus("");
  if (activeTab && activeTab.url) {
    try {
      await chrome.storage.local.set({ [storageKeyFor(activeTab.url)]: null });
    } catch {
      setStatus("Could not clear the saved results.");
    }
  }
});

els.copyBtn.addEventListener("click", async () => {
  const visible = getVisibleData();
  if (!visible || !visible.rows.length) {
    setStatus("Nothing to copy yet.");
    return;
  }
  const text = toTSV(visible);
  const html = toClipboardHTML(visible);
  try {
    // Writing both text/plain and text/html lets Excel/Sheets paste the
    // real formatting (bold, colon-suffixed header) instead of flat text.
    const item = new ClipboardItem({
      "text/plain": new Blob([text], { type: "text/plain" }),
      "text/html": new Blob([html], { type: "text/html" }),
    });
    await navigator.clipboard.write([item]);
    setStatus("Copied with formatting — paste into Excel.");
  } catch (e) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied (plain text only).");
    } catch (e2) {
      setStatus("Copy failed — try again.");
    }
  }
});

function downloadXlsxBytes(bytes, filename) {
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

els.excelBtn.addEventListener("click", () => {
  // If sheets have been queued via "+ Add to Workbook", EXCEL exports the
  // whole workbook (one sheet per queued list, e.g. Followers + Following).
  // Otherwise it falls back to exporting just what's currently on screen.
  if (savedSheets.length > 0) {
    const bytes = buildXlsxWorkbook(savedSheets);
    downloadXlsxBytes(bytes, "scraped-data.xlsx");
    setStatus(`Exported ${savedSheets.length}-sheet workbook.`);
    return;
  }
  const visible = getVisibleData();
  if (!visible || !visible.rows.length) {
    setStatus("Nothing to export yet.");
    return;
  }
  const bytes = buildXlsx(visible);
  downloadXlsxBytes(bytes, "scraped-data.xlsx");
  setStatus("Exported scraped-data.xlsx");
});

function suggestSheetName() {
  const filter = getSelectedFilter();
  if (filter !== "all") {
    const opt = els.platformSelect.selectedOptions[0];
    return opt ? opt.text : `Sheet ${savedSheets.length + 1}`;
  }
  return `Sheet ${savedSheets.length + 1}`;
}

function renderSheetChips() {
  els.sheetChips.innerHTML = "";
  savedSheets.forEach((sheet, i) => {
    const chip = document.createElement("span");
    chip.className = "sheet-chip";
    const label = document.createElement("span");
    label.textContent = `${sheet.name} (${sheet.rows.length})`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.title = "Remove this sheet";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      savedSheets.splice(i, 1);
      renderSheetChips();
      persistWorkbook();
    });
    chip.appendChild(label);
    chip.appendChild(remove);
    els.sheetChips.appendChild(chip);
  });
  els.excelBtn.textContent = savedSheets.length ? `EXCEL (${savedSheets.length})` : "EXCEL";
}

function persistWorkbook() {
  if (!activeTab || !activeTab.id) return;
  chrome.storage.local.set({ [workbookKeyForTab(activeTab.id)]: savedSheets });
}

async function loadWorkbook() {
  if (!activeTab) activeTab = await getActiveTab();
  if (!activeTab || !activeTab.id) return;
  const key = workbookKeyForTab(activeTab.id);
  const stored = await chrome.storage.local.get(key);
  savedSheets = Array.isArray(stored[key]) ? stored[key] : [];
  renderSheetChips();
}

els.addSheetBtn.addEventListener("click", () => {
  const visible = getVisibleData();
  if (!visible || !visible.rows.length) {
    setStatus("Nothing to add yet — scrape a list first.");
    return;
  }
  const suggested = suggestSheetName();
  const name = window.prompt("Name this sheet (e.g. Followers, Following):", suggested);
  if (name === null) return; // cancelled
  const finalName = name.trim() || suggested;
  savedSheets.push({
    name: finalName,
    columns: visible.columns.slice(),
    rows: visible.rows.map((r) => r.slice()),
  });
  renderSheetChips();
  persistWorkbook();
  setStatus(`Added "${finalName}" — ${savedSheets.length} sheet${savedSheets.length > 1 ? "s" : ""} queued for export.`);
});

function setAutoScrollState(on) {
  els.autoScrollToggle.setAttribute("aria-pressed", on ? "true" : "false");
}

async function loadAutoScrollPref() {
  const stored = await chrome.storage.local.get(AUTOSCROLL_PREF_KEY);
  setAutoScrollState(!!stored[AUTOSCROLL_PREF_KEY]);
}

els.autoScrollToggle.addEventListener("click", () => {
  const isOn = els.autoScrollToggle.getAttribute("aria-pressed") === "true";
  setAutoScrollState(!isOn);
  chrome.storage.local.set({ [AUTOSCROLL_PREF_KEY]: !isOn });
});

async function initialize() {
  els.pickBtn.disabled = true;
  try {
    activeTab = await getActiveTab();
    await Promise.all([loadStoredResult(), loadWorkbook(), loadAutoScrollPref()]);
  } catch {
    setStatus("Could not load saved scraper data.");
  } finally {
    els.pickBtn.disabled = false;
  }
}

initialize();
