// content.js — runs in the page, finds tabular/repeated data and reports it back.
(function () {
  if (window.__idsInjected) return;
  window.__idsInjected = true;

  let pickerPort = null;
  let previousCursor = "";

  function cellLines(el) {
    const raw = el.innerText || el.textContent || "";
    return raw
      .split("\n")
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length > 0);
  }

  function cellText(el) {
    return cellLines(el).join(" ");
  }

  function firstLink(el) {
    const a = el.querySelector ? el.querySelector("a[href]") : null;
    return a ? a.href : "";
  }

  function sameTagSiblings(el) {
    const parent = el.parentElement;
    if (!parent) return [];
    return Array.from(parent.children).filter((c) => c.tagName === el.tagName);
  }

  // Climb from the clicked element looking for the ancestor level whose
  // siblings (by tag name only, not full structure) form the actual list of
  // rows. This tolerates rows that differ slightly from each other — e.g. a
  // "Follow back" button present on some rows but not others — which a
  // strict structural match would reject. Returns ALL matching levels
  // (not just the best guess) so the panel can offer Back/Next to let the
  // user pick the right one — useful when a list has very few items and
  // sits close to other unrelated repeated elements on the page.
  function findRowLevelsByClimbing(startEl) {
    const candidates = [];
    let el = startEl;
    let depth = 0;
    while (el && el !== document.body && depth < 8) {
      const siblings = sameTagSiblings(el);
      if (siblings.length >= 2 && el.children.length >= 1) {
        const avgText =
          siblings.reduce((sum, m) => sum + cellText(m).length, 0) / siblings.length;
        if (avgText > 0) {
          candidates.push({ el, siblings, count: siblings.length, depth });
        }
      }
      el = el.parentElement;
      depth++;
    }
    // Prefer the level with the most matching siblings (the real row list),
    // breaking ties by picking the shallower (closer to the clicked element) level.
    candidates.sort((a, b) => b.count - a.count || a.depth - b.depth);
    return candidates;
  }

  const MAX_SUBCOLUMNS = 4;

  function buildRowsFromCells(cellsPerRow) {
    // cellsPerRow: array of rows, each row an array of DOM elements (one per top-level column)
    const topWidth = cellsPerRow[0].length;
    const subWidths = [];

    for (let j = 0; j < topWidth; j++) {
      let maxLines = 1;
      for (const row of cellsPerRow) {
        const n = cellLines(row[j]).length;
        if (n > maxLines) maxLines = n;
      }
      subWidths.push(Math.min(maxLines, MAX_SUBCOLUMNS));
    }

    const columns = [];
    subWidths.forEach((w) => {
      for (let k = 0; k < w; k++) columns.push(`Column ${columns.length + 1}`);
    });

    const rows = cellsPerRow.map((row) => {
      const out = [];
      row.forEach((cellEl, j) => {
        const lines = cellLines(cellEl);
        const w = subWidths[j];
        for (let k = 0; k < w; k++) {
          if (w === 1) {
            out.push(lines.join(" "));
          } else {
            out.push(lines[k] || "");
          }
        }
      });
      return out;
    });

    return { columns, rows };
  }

  function extractColumnsFromGroup(members) {
    const childCounts = members.map((m) => m.children.length);
    const consistent =
      childCounts.every((c) => c === childCounts[0]) && childCounts[0] > 1;

    let result;
    if (consistent) {
      const cellsPerRow = members.map((m) => Array.from(m.children));
      result = buildRowsFromCells(cellsPerRow);
    } else {
      // fallback: whole element as a single "column", still split by line
      const cellsPerRow = members.map((m) => [m]);
      result = buildRowsFromCells(cellsPerRow);
    }

    // Append a Link column with the first href found in each row, since
    // identifiers like usernames usually live in a link's URL, not in
    // visible text.
    const links = members.map((m) => firstLink(m));
    if (links.some((l) => l)) {
      result.columns.push("Link");
      result.rows.forEach((row, i) => row.push(links[i]));
    }

    // Drop rows that ended up completely empty (e.g. a spacer/divider
    // element that matched the sibling pattern but carries no data).
    result.rows = result.rows.filter((row) => row.some((v) => (v || "").trim().length > 0));

    // Guard against any leftover embedded line break in a single field —
    // e.g. a name whose source element renders with CSS that makes
    // innerText report a soft wrap as "\n". Left in place, that shows up
    // as a wrapped 2-line cell when pasted into Excel instead of one
    // continuous value.
    result.rows = result.rows.map((row) => row.map((v) => sanitizeCell(v)));

    return result;
  }

  function sanitizeCell(v) {
    return (v || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function describeElement(el) {
    if (!el) return "";
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls = el.className && typeof el.className === "string"
      ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
      : "";
    return `${tag}${id}${cls}`.slice(0, 60);
  }

  // ---------- Picker mode ----------
  let pickerActive = false;
  let overlay = null;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.pointerEvents = "none";
    overlay.style.border = "2px solid #6fbf7a";
    overlay.style.background = "rgba(111, 191, 122, 0.15)";
    overlay.style.zIndex = "2147483647";
    overlay.style.transition = "all 60ms ease-out";
    overlay.style.display = "none";
    document.documentElement.appendChild(overlay);
    return overlay;
  }

  function positionOverlay(el) {
    const r = el.getBoundingClientRect();
    const ov = ensureOverlay();
    ov.style.display = "block";
    ov.style.left = r.left + "px";
    ov.style.top = r.top + "px";
    ov.style.width = r.width + "px";
    ov.style.height = r.height + "px";
  }

  function onMouseMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el !== overlay) {
      positionOverlay(el);
    }
  }

  function showToast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.position = "fixed";
    t.style.bottom = "24px";
    t.style.left = "50%";
    t.style.transform = "translateX(-50%)";
    t.style.background = "#2b2b2b";
    t.style.color = "#f2f2f2";
    t.style.padding = "10px 16px";
    t.style.borderRadius = "999px";
    t.style.fontSize = "13px";
    t.style.fontFamily = "sans-serif";
    t.style.zIndex = "2147483647";
    t.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    document.documentElement.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const port = pickerPort;
    stopPicker();
    const el = e.target;

    const levels = findRowLevelsByClimbing(el);
    let candidates = levels
      .slice(0, 8)
      .map((level) => {
        const { columns, rows } = extractColumnsFromGroup(level.siblings);
        return { columns, rows, selectorLabel: describeElement(level.el.parentElement) };
      })
      .filter((c) => c.rows.length > 0);

    if (!candidates.length) {
      // fallback: treat the clicked element's own siblings as rows
      const parent = el.parentElement || document.body;
      const siblings = Array.from(parent.children);
      const { columns, rows } = extractColumnsFromGroup(siblings);
      candidates = [{ columns, rows, selectorLabel: describeElement(parent) }];
    }

    port.postMessage({ candidates, url: location.href });
    showToast("Selection captured.");
  }

  function onKeyDown(e) {
    if (e.key !== "Escape") return;
    const port = pickerPort;
    stopPicker();
    port.postMessage({ cancelled: true });
  }

  function startPicker(port) {
    stopPicker();
    pickerPort = port;
    previousCursor = document.body.style.cursor;
    pickerActive = true;
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.body.style.cursor = "crosshair";
  }

  function stopPicker() {
    if (!pickerActive) return;
    pickerActive = false;
    pickerPort = null;
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.body.style.cursor = previousCursor;
    if (overlay) overlay.style.display = "none";
  }

  // ---------- Auto-scroll to load lazy-loaded content ----------
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function findScrollCandidates() {
    const candidates = [];
    const all = document.querySelectorAll("*");
    for (const el of all) {
      const style = getComputedStyle(el);
      if (!/(auto|scroll)/.test(style.overflowY)) continue;
      const scrollable = el.scrollHeight - el.clientHeight;
      if (scrollable > 100 && el.clientHeight > 150) {
        candidates.push({ el, scrollable });
      }
    }
    candidates.sort((a, b) => b.scrollable - a.scrollable);
    return candidates;
  }

  // Picks whichever scrolls further: the page itself, or an inner scrollable
  // panel (e.g. a followers/following modal that scrolls independently of
  // the page behind it).
  function pickScrollTarget() {
    const candidates = findScrollCandidates();
    const scrollingEl = document.scrollingElement || document.documentElement;
    const windowScrollable = scrollingEl.scrollHeight - window.innerHeight;
    if (candidates.length && candidates[0].scrollable > windowScrollable) {
      return { el: candidates[0].el, isWindow: false };
    }
    return { el: scrollingEl, isWindow: true };
  }

  async function autoScrollToLoadAll(isConnected) {
    const target = pickScrollTarget();
    const getHeight = () => target.el.scrollHeight;
    const scrollToBottom = () => {
      if (target.isWindow) {
        window.scrollTo(0, getHeight());
      } else {
        target.el.scrollTop = target.el.scrollHeight;
      }
    };

    const STEP_DELAY = 900;
    const MAX_ITERATIONS = 60;
    const STABLE_ROUNDS_NEEDED = 3;
    const MAX_DURATION_MS = 25000;

    let lastHeight = getHeight();
    let stableRounds = 0;
    let iterations = 0;
    const startTime = Date.now();

    while (isConnected() && iterations < MAX_ITERATIONS && Date.now() - startTime < MAX_DURATION_MS) {
      scrollToBottom();
      await sleep(STEP_DELAY);
      const newHeight = getHeight();
      iterations++;
      if (newHeight <= lastHeight) {
        stableRounds++;
        if (stableRounds >= STABLE_ROUNDS_NEEDED) break;
      } else {
        stableRounds = 0;
        lastHeight = newHeight;
      }
    }

    return { iterations, finalHeight: getHeight(), usedContainer: !target.isWindow };
  }

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "sdc-picker") return;
    let connected = true;
    port.onDisconnect.addListener(() => {
      connected = false;
      if (pickerPort === port) stopPicker();
    });
    port.onMessage.addListener(async ({ autoScroll }) => {
      try {
        if (autoScroll) await autoScrollToLoadAll(() => connected);
        if (!connected) return;
        startPicker(port);
        port.postMessage({ ready: true });
      } catch {
        if (pickerPort === port) stopPicker();
        if (connected) port.postMessage({ error: true });
      }
    });
  });
})();
