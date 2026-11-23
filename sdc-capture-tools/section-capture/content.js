// content.js
// Runs inside the page. popup.js talks to it with chrome.tabs.sendMessage;
// the message handlers are at the bottom of this file.
//
// What it does:
//   - findRegion:    measures the area from the first element matching
//                    startSelector to the last matching endSelector.
//   - scrolling:     scrollWindowTo / scrollContainerTo move the page (or an
//                    inner scrollable box) so popup.js can take screenshots.
//   - autoLoadAll:   scrolls to load lazy content, clicking "show more" style
//                    buttons along the way (clickBeforeCapture).
//   - hideElements:  hides elements before/after capture, and puts them back
//                    afterwards (restoreHiddenElements).
//
// Two capture modes are detected automatically by findRegion:
//   "window"    - the content sits in normal page flow, so the whole page
//                 is scrolled.
//   "container" - the content lives inside a fixed-height box with its own
//                 scrollbar, so that inner box is scrolled instead.
//
// The file is a persistent content_script (manifest.json) and may also be
// injected on demand by popup.js. The guard below makes a second injection
// a harmless no-op instead of "already declared" errors.
(function () {
  if (window.__sdcContentInjected) return;
  window.__sdcContentInjected = true;

// Any selector field anywhere in this file can be EITHER a single CSS
// selector string, OR an array of candidate selector strings tried in
// order — the first one that matches anything on the current page
// wins. This exists specifically for sites (Meta/React-family sites
// especially) whose class names are auto-generated and can differ per
// account or per machine: give it a "nice" class-based selector as the
// first candidate, and a structural fallback as the second (e.g. a
// stable id descended into via child combinators — something like
// "#some-stable-id > div > div > div" — since exact nesting depth tends
// to survive class-name churn even when the classes themselves don't).
// If NONE of the candidates match anything, the first candidate is
// still returned so error messages stay meaningful instead of just
// disappearing silently.
function resolveSelector(value) {
  const candidates = Array.isArray(value) ? value : [value];
  for (const sel of candidates) {
    if (!sel) continue;
    try {
      if (document.querySelector(sel)) return sel;
    } catch (e) {
      // invalid selector syntax — skip this candidate, try the next
    }
  }
  return candidates.find((s) => !!s) || null;
}

function getStartEndEls(startSelector, endSelector) {
  const resolvedStart = resolveSelector(startSelector);
  const resolvedEnd = resolveSelector(endSelector);
  let startEls, endEls;
  try {
    startEls = resolvedStart ? document.querySelectorAll(resolvedStart) : [];
  } catch (e) {
    return { error: `Invalid selector "${resolvedStart}".` };
  }
  try {
    endEls = resolvedEnd ? document.querySelectorAll(resolvedEnd) : [];
  } catch (e) {
    return { error: `Invalid selector "${resolvedEnd}".` };
  }
  if (!startEls.length) return { error: `No element found for "${resolvedStart}".` };
  if (!endEls.length) return { error: `No element found for "${resolvedEnd}".` };
  return {
    startEl: startEls[0],
    endEl: endEls[endEls.length - 1]
  };
}

// Finds the scrollable ancestor relevant to this region. Two cases:
//
// 1. Most common: an ancestor that contains BOTH startEl and endEl and
//    itself scrolls — the whole region lives inside one scroll box.
//
// 2. Static-header-above-scrollable-body layouts (e.g. a fixed top
//    toolbar sitting above an independently-scrolling content pane,
//    where startEl is in the static part and endEl is inside — or is —
//    the scrolling part): no single ancestor contains both, since
//    startEl isn't nested inside the scrollable box at all. In that
//    case, fall back to the nearest scrollable ancestor of endEl alone.
//    findRegion() below detects when this happened (the returned
//    container doesn't contain startEl) and handles the static portion
//    as a separately-captured fixed prefix rather than trying to force
//    it into the scrollable coordinate space where it doesn't belong.
function findScrollContainer(startEl, endEl) {
  let node = startEl.parentElement;
  while (node && node !== document.documentElement) {
    if (node.contains(endEl)) {
      const style = getComputedStyle(node);
      const canScrollY = style.overflowY === "auto" || style.overflowY === "scroll";
      if (canScrollY && node.scrollHeight > node.clientHeight + 2) {
        return node;
      }
    }
    node = node.parentElement;
  }

  // Fallback: endEl itself, or a scrollable ancestor of it.
  node = endEl;
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    const canScrollY = style.overflowY === "auto" || style.overflowY === "scroll";
    if (canScrollY && node.scrollHeight > node.clientHeight + 2) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function normalizePadding(padding) {
  const p = padding || {};
  return {
    top: Number(p.top) || 0,
    bottom: Number(p.bottom) || 0,
    left: Number(p.left) || 0,
    right: Number(p.right) || 0
  };
}

// Returns [{top, bottom}, ...] sorted by top, in whatever coordinate
// space the caller is using (page-space for window mode, content-space
// for container mode) — computed via the same offset math as the
// region itself so the two line up exactly.
function getItemBoundaries(itemsSelector, toCoordSpace) {
  if (!itemsSelector) return [];
  const resolved = resolveSelector(itemsSelector);
  if (!resolved) return [];
  let els;
  try {
    els = document.querySelectorAll(resolved);
  } catch (e) {
    return [];
  }
  const items = Array.from(els).map((el) => {
    const rect = el.getBoundingClientRect();
    return toCoordSpace(rect);
  });
  items.sort((a, b) => a.top - b.top);
  return items;
}

// The lowest point reached by an element or anything inside it (screen
// coordinates). An element's own box can be shorter than its content when
// the content overflows it, so the box alone can't be trusted for "where
// does this end". Hidden elements and ones that don't scroll with the page
// (fixed) are ignored.
function deepBottom(el) {
  let lowest = el.getBoundingClientRect().bottom;
  const all = el.querySelectorAll("*");
  const limit = Math.min(all.length, 4000);
  for (let i = 0; i < limit; i++) {
    const node = all[i];
    const rect = node.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.bottom <= lowest) continue;
    const style = window.getComputedStyle(node);
    if (style.visibility === "hidden" || style.position === "fixed") continue;
    lowest = rect.bottom;
  }
  return lowest;
}

// Makes the page at least this tall (a temporary style rule), so everything
// down to it can be scrolled to and screenshotted. Removed again by
// restoreHiddenElements().
let growStyleEl = null;

function growPageTo(height) {
  if (!growStyleEl) {
    growStyleEl = document.createElement("style");
    document.documentElement.appendChild(growStyleEl);
  }
  growStyleEl.textContent = `html, body { min-height: ${Math.ceil(height)}px !important; }`;
}

function findRegion(startSelector, endSelector, padding, itemsSelector, growPage, endIncludesItems, includeSelector) {
  const found = getStartEndEls(startSelector, endSelector);
  if (found.error) return found;
  const { startEl, endEl } = found;
  const pad = normalizePadding(padding);

  const container = findScrollContainer(startEl, endEl);
  const dpr = window.devicePixelRatio || 1;
  const startRect = startEl.getBoundingClientRect();
  const endRect = endEl.getBoundingClientRect();
  const include = resolveSelector(includeSelector);
  const included = include ? [...document.querySelectorAll(include)] : [];
  const includedRects = included.map((el) => el.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  const leftEdge = Math.min(startRect.left, endRect.left, ...includedRects.map((rect) => rect.left));
  const rightEdge = Math.max(startRect.right, endRect.right, ...includedRects.map((rect) => rect.right));
  const endBottom = growPage
    ? Math.max(deepBottom(endEl), ...included.map(deepBottom))
    : Math.max(endRect.bottom, ...includedRects.map((rect) => rect.bottom));

  if (container) {
    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const containerHasStart = container.contains(startEl);

    let contentTop, contentBottom, staticPrefixHeight, staticPrefixScreenTop;
    const endElementBottom = endBottom
      - containerRect.top + scrollTop;

    if (containerHasStart) {
      // Normal case: the whole region, start through end, lives inside
      // one scroll box.
      contentTop = (startRect.top - containerRect.top) + scrollTop;
      contentBottom = endElementBottom;
      staticPrefixHeight = 0;
      staticPrefixScreenTop = null;
    } else {
      // Hybrid case: startEl sits in a static area OUTSIDE the
      // scrollable container entirely (e.g. a fixed header above an
      // independently-scrolling body) — findScrollContainer found this
      // container via endEl alone. Treat the gap between startEl and
      // the container's own top edge as a fixed prefix that's captured
      // once, unaffected by the container's internal scrolling, rather
      // than trying to express it as negative/out-of-range content-space
      // (which would be meaningless — that space doesn't scroll at all).
      staticPrefixHeight = Math.max(0, containerRect.top - startRect.top);
      staticPrefixScreenTop = startRect.top;
      contentTop = 0;
      // If endSelector matched the scrollable container directly, its
      // own bounding-box height only reflects what's currently visible
      // (clientHeight-ish), not the full scrollable content — use
      // scrollHeight instead so the whole thing gets captured, not just
      // whatever happened to be in view at measurement time. If endEl
      // is instead some element deep inside a different scrollable
      // ancestor, its position within that ancestor's content-space is
      // still the more precise choice.
      contentBottom = (container === endEl)
        ? container.scrollHeight
        : endElementBottom;
    }

    let screenLeft = leftEdge;
    let screenRight = rightEdge;

    // Apply padding, then clamp to what the container can actually offer
    // (can't capture above 0 or below its total scrollable content).
    if (containerHasStart) {
      contentTop = Math.max(0, contentTop - pad.top);
    } else {
      staticPrefixHeight = Math.max(0, staticPrefixHeight - pad.top);
    }
    screenLeft = screenLeft - pad.left;
    screenRight = screenRight + pad.right;

    const items = getItemBoundaries(itemsSelector, (rect) => ({
      top: (rect.top - containerRect.top) + scrollTop,
      bottom: (rect.bottom - containerRect.top) + scrollTop
    }));
    if (endIncludesItems && containerHasStart && items.length) {
      contentBottom = Math.max(contentBottom, ...items.map((item) => item.bottom));
    }
    contentBottom = Math.min(container.scrollHeight, contentBottom + pad.bottom);

    return {
      mode: "container",
      contentTop,
      contentHeight: contentBottom - contentTop,
      containerClientHeight: container.clientHeight,
      containerScrollHeight: container.scrollHeight,
      screenLeft,
      screenWidth: screenRight - screenLeft,
      screenTop: containerRect.top,
      devicePixelRatio: dpr,
      originalScrollTop: scrollTop,
      staticPrefixHeight,
      staticPrefixScreenTop,
      endElementBottom: container === endEl ? container.scrollHeight : endElementBottom,
      items
    };
  }

  // Fallback: normal page-flow scrolling.
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const pageWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  let pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);

  let top = Math.min(startRect.top, endRect.top) + scrollY;
  let bottom = Math.max(startRect.bottom, endRect.bottom) + scrollY;
  const endElementBottom = endBottom + scrollY;

  const items = getItemBoundaries(itemsSelector, (rect) => ({
    top: rect.top + scrollY,
    bottom: rect.bottom + scrollY
  }));

  // endIncludesItems: the area ends at the end element or at the lowest item,
  // whichever is lower.
  if (endIncludesItems && items.length) {
    const lowestItem = Math.max(...items.map((item) => item.bottom));
    if (lowestItem > bottom) bottom = lowestItem;
  }

  // growPage: the end element's content can reach lower than the page is
  // tall (a side column taller than the rest of the page, say). The region
  // would then be cut off at the bottom of the page, so find where the end
  // element's content really stops and make the page that tall.
  if (growPage) {
    bottom = Math.max(bottom, endElementBottom);
    if (bottom > pageHeight) {
      growPageTo(bottom);
      pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, bottom);
    }
  }
  let left = leftEdge + scrollX;
  let right = rightEdge + scrollX;

  // Apply padding, then clamp to the document's actual bounds.
  top = Math.max(0, top - pad.top);
  bottom = Math.min(pageHeight, bottom + pad.bottom);
  left = Math.max(0, left - pad.left);
  right = Math.min(pageWidth, right + pad.right);

  return {
    mode: "window",
    top,
    left,
    width: right - left,
    height: bottom - top,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: dpr,
    pageWidth,
    pageHeight,
    originalScrollX: scrollX,
    originalScrollY: scrollY,
    endElementBottom,
    items
  };
}

function waitForRepaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTimeout(resolve, 150));
    });
  });
}

async function scrollWindowTo(y) {
  window.scrollTo({ top: y, left: 0, behavior: "instant" });
  await waitForRepaint();
  return { scrollY: window.scrollY, scrollX: window.scrollX };
}

async function scrollContainerTo(startSelector, endSelector, scrollTop) {
  const found = getStartEndEls(startSelector, endSelector);
  if (found.error) return found;
  const container = findScrollContainer(found.startEl, found.endEl);
  if (!container) return { error: "Scroll container not found." };

  container.scrollTop = scrollTop;
  await waitForRepaint();

  const rect = container.getBoundingClientRect();
  return {
    scrollTop: container.scrollTop,
    containerRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  };
}

// Finds elements by visible text instead of a CSS selector — for sites
// where the only reliable way to find "the Translate button" is its
// label, not its (randomized, per-account) class name.
//
// Only considers LEAF elements (no element children) on purpose: if
// the target is <button><span>Translate</span></button>, both the
// button and the span would match on text ("Translate" trimmed), and
// clicking BOTH would fire the button's click handler twice (once
// directly, once via the span's click bubbling up) — which can
// literally undo itself for a toggle button. Matching only the
// innermost (leaf) element and relying on normal event bubbling avoids
// that double-fire.
function findTextMatches(entry) {
  const tag = entry.tag || "*";
  const wanted = String(entry.text || "").trim();
  if (!wanted) return [];
  // "exact" (default), "includes" (the text only has to contain it) or
  // "regex" (the text is a regular expression, e.g. "^\\d+ replies$").
  const matchMode = entry.match === "includes" ? "includes" : entry.match === "regex" ? "regex" : "exact";
  const caseSensitive = !!entry.caseSensitive;

  let regex = null;
  if (matchMode === "regex") {
    try {
      regex = new RegExp(wanted, caseSensitive ? "" : "i");
    } catch (e) {
      return [];
    }
  }

  let candidates;
  try {
    candidates = Array.from(document.querySelectorAll(tag));
  } catch (e) {
    return [];
  }

  const norm = (s) => (caseSensitive ? s : s.toLowerCase());
  const wantedNorm = norm(wanted);

  return candidates.filter((el) => {
    if (el.children.length > 0) return false; // leaf elements only
    const trimmed = (el.textContent || "").trim().replace(/\s+/g, " ");
    if (regex) return regex.test(trimmed);
    const text = norm(trimmed);
    return matchMode === "includes" ? text.includes(wantedNorm) : text === wantedNorm;
  });
}

// Resolves a list of "no-click zone" selectors (e.g. a sidebar of
// recommended posts you don't want Translate-clicked) into the actual
// container elements currently on the page. Supports the same
// array-fallback selector syntax as everywhere else.
function resolveSkipRegionElements(skipSelectors) {
  const regions = [];
  (skipSelectors || []).forEach((sel) => {
    const resolved = resolveSelector(sel);
    if (!resolved) return;
    let matches;
    try {
      matches = document.querySelectorAll(resolved);
    } catch (e) {
      return;
    }
    matches.forEach((el) => regions.push(el));
  });
  return regions;
}

// Core matching+clicking logic, synchronous — shared by the standalone
// clickButtons message handler AND by autoLoadAll's per-iteration
// re-clicking (see below), so newly-loaded content gets the same
// treatment as what was already on the page, not just once upfront.
//
// skipButtonClick (optional): a list of CSS selectors marking regions
// to exclude entirely — any matched element that falls inside one of
// these containers is skipped, not clicked. Use for a sidebar/related-
// content widget that happens to have its own "Translate" or similar
// button you don't want touched.
function clickAllMatches(entries, skipButtonClick) {
  const skipRegions = skipButtonClick ? resolveSkipRegionElements(skipButtonClick) : [];
  let count = 0;
  (entries || []).forEach((entry) => {
    let els = [];
    if (entry && typeof entry === "object" && !Array.isArray(entry) && entry.text) {
      els = findTextMatches(entry);
    } else {
      const resolved = resolveSelector(entry);
      if (resolved) {
        try {
          els = Array.from(document.querySelectorAll(resolved));
        } catch (e) {
          els = [];
        }
      }
    }
    if (skipRegions.length) {
      els = els.filter((el) => !skipRegions.some((region) => region.contains(el)));
    }
    // Two optional settings for a { text } entry, for toggle buttons such as
    // "21 replies" / "Hide replies" that share one place on the page:
    //   visibleOnly: true  skip buttons that are hidden right now (the
    //                      "21 replies" button is still in the page after it
    //                      was pressed, just hidden: pressing it again would
    //                      close the replies we just opened)
    //   once: true         press each button only one time per capture
    // Without them, buttons are pressed again on every pass, which is what
    // "Show more" style buttons that stay on the page need.
    if (entry && entry.visibleOnly) els = els.filter(isShown);
    if (entry && entry.once) els = els.filter((el) => !clickedOnce.has(el));
    els.forEach((el) => {
      try {
        el.click();
        if (entry && entry.once) clickedOnce.add(el);
        count++;
      } catch (e) {
        // detached or unclickable — skip
      }
    });
  });
  return count;
}

// Buttons already pressed by entries marked once: true (cleared again by
// restoreHiddenElements(), so the next capture presses them again).
let clickedOnce = new WeakSet();

// True when an element can be seen right now (not hidden by the page).
function isShown(el) {
  return el.getClientRects().length > 0 && window.getComputedStyle(el).visibility !== "hidden";
}

// Clicks every matching element once (e.g. every "Translate" link on
// every post in a feed — not just the first one found), before
// anything else happens. Each entry can be:
//   - a plain CSS selector string, or an array of candidate selector
//     strings (see resolveSelector above) → clicks every match.
//   - { text: "Translate" } → clicks every LEAF element (see
//     findTextMatches) whose visible text matches, anywhere on the
//     page. Optional: { tag: "span" } to scope which tag to search,
//     { match: "includes" } for a substring match instead of exact,
//     { caseSensitive: true } to require exact case.
// Missing/no matches are silently skipped, not an error — a button
// that isn't there yet (or never appears on some accounts) just means
// nothing to click.
//
// skipButtonClick (optional): see clickAllMatches above — excludes
// matches inside the given region(s).
//
// NOTE: for targets that ALSO use autoLoadAll, this single upfront pass
// only catches whatever's already loaded — anything revealed by later
// scrolling needs its own click pass. That repeated re-clicking is
// handled inside autoLoadAll via options.clickBeforeEachScroll, not
// here; see the comment there for why.
async function clickButtons(entries, skipButtonClick) {
  const count = clickAllMatches(entries, skipButtonClick);
  if (count > 0) await waitForRepaint();
  return { clicked: count };
}

// Repeatedly scrolls to the bottom (of the page, or of the scroll
// container if the target lives inside one) to trigger lazy-loaded
// content — e.g. YouTube comments that only render as you scroll.
//
// Three ways to decide "loaded enough", checked each pass:
//   - options.targetItemCount (+ options.itemsSelector): stop once at
//     least that many elements matching itemsSelector exist. Used by
//     Section "Landing Page" — only needs N items, not a pixel height.
//   - options.targetHeight: stop once the scrollable height reaches
//     that point (absolute page/content-space coordinate, same frame
//     as the region measurements). Used by "15k"/"Continue" to load
//     just enough for one slice.
//   - neither given: stops once scroll height stops growing for two
//     checks in a row (i.e. truly reached the end) — used by "Unli".
// All three also stop after maxScrolls iterations regardless (safety
// cap for feeds that are effectively infinite).
//
// options.clickBeforeEachScroll (optional): the same kind of entries
// clickButtons takes (selectors, arrays of candidates, or {text: ...}).
// Clicked once before the FIRST scroll (catches whatever's already
// loaded) and again after EVERY subsequent scroll step (catches
// whatever that step just revealed) — not just once upfront. This
// matters for things like a "Translate" link that appears on every
// post: clicking it only before loading starts would leave every post
// that loads in afterward untranslated. Re-querying by text/selector
// each time is naturally safe to repeat — once a post's button text
// changes away from what we're matching (e.g. "Translate" becomes "See
// original" after being clicked), it stops matching and won't get
// clicked again, so already-handled posts are left alone.
async function autoLoadAll(startSelector, endSelector, options) {
  const found = getStartEndEls(startSelector, endSelector);
  if (found.error) return found;
  const container = findScrollContainer(found.startEl, found.endEl);
  const waitMs = (options && options.waitMs) || 700;
  const targetHeight = options && typeof options.targetHeight === "number" ? options.targetHeight : null;
  const targetItemCount = options && typeof options.targetItemCount === "number" ? options.targetItemCount : null;
  const itemsSelector = options && options.itemsSelector ? options.itemsSelector : null;
  const clickBeforeEachScroll = options && options.clickBeforeEachScroll ? options.clickBeforeEachScroll : null;
  const skipButtonClick = options && options.skipButtonClick ? options.skipButtonClick : null;
  // One-viewport-at-a-time steps cover the same distance jump-to-bottom
  // used to cover in far fewer, bigger leaps — so the default scroll
  // budget needs to be a lot bigger whenever clickBeforeEachScroll is
  // active. Still fully overridable per-target via options.maxScrolls.
  const maxScrolls = (options && options.maxScrolls) || (clickBeforeEachScroll ? 150 : 30);

  const originalScrollTop = container ? container.scrollTop : window.scrollY;
  let totalClicked = 0;

  // A single click pass isn't enough when a click can spawn ANOTHER
  // clickable element — e.g. Facebook's "See translation" inserts a
  // whole new div that itself contains its own "See more". One pass
  // clicks "See translation" and stops there; the nested "See more"
  // never gets seen because it didn't exist yet when that pass ran.
  // Keep re-scanning and re-clicking until a full pass finds nothing
  // left to click, so cascades of any depth resolve completely before
  // moving on — not just the first level.
  async function clickUntilExhausted(maxPasses = 8) {
    if (!clickBeforeEachScroll) return 0;
    let clickedThisCall = 0;
    for (let pass = 0; pass < maxPasses; pass++) {
      const clicked = clickAllMatches(clickBeforeEachScroll, skipButtonClick);
      clickedThisCall += clicked;
      if (clicked === 0) break; // a clean pass — nothing left to click
      await waitForRepaint(); // let whatever that click spawned actually render
    }
    return clickedThisCall;
  }

  totalClicked += await clickUntilExhausted();

  let lastHeight = -1;
  let stableCount = 0;
  let iterations = 0;
  let reachedTarget = false;

  function measureHeight() {
    return container
      ? container.scrollHeight
      : Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  }

  function getScrollPos() {
    return container ? container.scrollTop : window.scrollY;
  }

  function getViewportSize() {
    return (container ? container.clientHeight : window.innerHeight) || 800;
  }

  function getMaxScrollPos() {
    return Math.max(0, measureHeight() - getViewportSize());
  }

  function jumpToBottom() {
    // Fastest way to trigger a site's own "load more" — fine when all
    // we want is more HEIGHT/ITEMS, but it can leap straight over
    // content sitting between the old and new bottom, skipping
    // buttons (e.g. "Translate") on whatever got jumped over, since
    // many sites only render/hydrate a post fully once it's actually
    // been visible in the viewport.
    if (container) {
      container.scrollTop = container.scrollHeight;
    } else {
      window.scrollTo(0, measureHeight());
    }
  }

  function stepForward() {
    // Advance exactly one viewport at a time so every pixel of the
    // page passes through the viewport with nothing skipped — needed
    // whenever we're also clicking buttons as we go, since a button on
    // a post that never actually entered the viewport may not be
    // rendered/wired up yet to click.
    const nextPos = Math.min(getScrollPos() + getViewportSize(), getMaxScrollPos());
    if (container) {
      container.scrollTop = nextPos;
    } else {
      window.scrollTo(0, nextPos);
    }
  }

  function targetSatisfied() {
    if (targetItemCount !== null && itemsSelector) {
      const resolvedItemsSelector = resolveSelector(itemsSelector);
      let currentItemCount = 0;
      if (resolvedItemsSelector) {
        try {
          currentItemCount = document.querySelectorAll(resolvedItemsSelector).length;
        } catch (e) {
          currentItemCount = 0;
        }
      }
      if (currentItemCount >= targetItemCount) return true;
    }
    if (targetHeight !== null && measureHeight() >= targetHeight) return true;
    return false;
  }

  // Only switch to the slower, gap-free one-viewport-at-a-time mode
  // when there's actually something to click along the way. Plain
  // lazy-loading (no clickBeforeEachScroll) has no reason to visit
  // every intermediate pixel, so it keeps jumping straight to the
  // bottom — that's still the fastest way to grow the feed, and it's
  // why "Unlimited" (which has no buttons to click) never showed this
  // skipping problem in the first place.
  const stepIncrementally = !!clickBeforeEachScroll;

  if (targetSatisfied()) {
    // Height/items are fine, but there may still be buttons sitting
    // unclicked (and cascades from clicking them) — height being
    // satisfied only means "don't scroll for more," not "nothing left
    // to click." Cheap no-op if there's truly nothing left.
    let guard = 0;
    while (guard++ < 8) {
      const clicked = await clickUntilExhausted();
      totalClicked += clicked;
      if (clicked === 0) break;
    }
    lastHeight = measureHeight();
    reachedTarget = true;
  } else {
    for (let i = 0; i < maxScrolls; i++) {
      iterations++;
      if (stepIncrementally) {
        stepForward();
      } else {
        jumpToBottom();
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));

      totalClicked += await clickUntilExhausted();

      const currentHeight = measureHeight();

      if (targetSatisfied()) {
        // Same reasoning as above — resolve any remaining cascade
        // before declaring done, rather than stopping mid-cascade.
        let guard = 0;
        while (guard++ < 8) {
          const clicked = await clickUntilExhausted();
          totalClicked += clicked;
          if (clicked === 0) break;
        }
        lastHeight = measureHeight();
        reachedTarget = true;
        break; // enough loaded — no need to keep going
      }

      // In step mode, "nothing new loaded" only means we're truly done
      // once we've also actually reached the current bottom — otherwise
      // we're just mid-page between two lazy-load triggers and need to
      // keep stepping forward, not give up early.
      const atBottom = stepIncrementally ? getScrollPos() >= getMaxScrollPos() - 1 : true;

      if (currentHeight === lastHeight) {
        if (atBottom) {
          stableCount++;
          if (stableCount >= 2) break; // genuinely nothing more is loading
        }
      } else {
        stableCount = 0;
      }
      lastHeight = currentHeight;
    }
  }

  // Give the last spot we scrolled to a moment to actually finish
  // whatever the last click triggered — and catch anything that only
  // rendered once we reached the true bottom (which the loop's own
  // click pass, running one step earlier, couldn't have seen yet) —
  // BEFORE jumping back to the top. Jumping away immediately was the
  // cause of the last post (or two) sometimes coming out untranslated
  // or missing: their translate click had fired, but the fetch/render
  // it kicked off hadn't landed before the page moved.
  const finalSettleMs = options && typeof options.finalSettleMs === "number"
    ? options.finalSettleMs
    : (clickBeforeEachScroll ? 2000 : 0);
  if (clickBeforeEachScroll && finalSettleMs > 0) {
    let guard = 0;
    while (guard++ < 8) {
      const clicked = await clickUntilExhausted();
      totalClicked += clicked;
      if (clicked === 0) break;
    }
    await new Promise((resolve) => setTimeout(resolve, finalSettleMs));
  }

  // Put things back before measuring/capturing.
  if (container) {
    container.scrollTop = originalScrollTop;
  } else {
    window.scrollTo(0, originalScrollTop);
  }
  await waitForRepaint();

  return { finalHeight: lastHeight, iterations, reachedTarget, totalClicked };
}

// ---------- Cleanup: hide/restore elements per the target's
// removeBeforeCapture / removeAfterCapture lists ----------
//
// The hide METHOD is tied to which list an entry came from — not a
// freely-chosen mode — specifically so this class of bug can't happen
// again on any platform:
//
//   listType "removeBefore" → display:none. Safe ONLY because this
//     always runs before the region is ever measured, so the reflow it
//     causes is baked into every coordinate from the start.
//
//   listType "removeAfter" → visibility:hidden, ALWAYS, no matter when
//     it's triggered (after chunk 1 for a fresh run, or up front for a
//     Continue slice). This keeps the element's layout space intact,
//     so nothing below it shifts — which matters because Continue's
//     stored pixel coordinate was measured against the page with that
//     space still reserved. Removing it via display:none instead (as a
//     past version of this file mistakenly did for the Continue case)
//     reflows the page and pushes every coordinate below it out from
//     under the stored offset, making unrelated content look "cut" or
//     "skipped" when it was actually just shifted.
//
// There is deliberately no "mode" parameter callers can pass in to
// pick the hide method — only listType, which can only be one of these
// two values.
//
// Each entry can be either:
//   - a plain CSS selector string → every match gets hidden
//   - an array of candidate selector strings (see resolveSelector up
//     top) → tries each until one matches anything, then hides every
//     match of that one — same array-fallback idea as everywhere else,
//     for unstable per-account/per-machine class names.
//   - { selector, keepFirst } → keeps the first N matches (in DOM
//     order) untouched and hides the rest. `selector` here can also be
//     a string or an array of candidates.
//   - { selector, keepOnly } → keeps ONLY the Nth match (1-indexed, DOM
//     order) and hides every other match — used for "which photo to
//     keep" in a horizontal-scroll multi-photo carousel, where you want
//     exactly one specific item to remain, not a leading run of them.
// keepFirst/keepOnly only make sense for listType "removeBefore" (a
// reflow-safe removal); both are ignored for "removeAfter" entries.
let hiddenRecords = [];

function hideElements(entries, listType) {
  if (listType !== "removeBefore" && listType !== "removeAfter") {
    return { error: `hideElements: invalid listType "${listType}"` };
  }
  let count = 0;
  let totalMatches = 0;
  (entries || []).forEach((entry) => {
    const isKeepObj = entry && typeof entry === "object" && !Array.isArray(entry);
    const selectorValue = isKeepObj ? entry.selector : entry; // string or array either way
    const keepFirst = isKeepObj && listType === "removeBefore" ? Number(entry.keepFirst) : undefined;
    const keepOnly = isKeepObj && listType === "removeBefore" ? Number(entry.keepOnly) : undefined;

    const resolved = resolveSelector(selectorValue);
    if (!resolved) return;

    let els;
    try {
      els = Array.from(document.querySelectorAll(resolved));
    } catch (e) {
      return;
    }
    totalMatches += els.length;

    let toHide = els;
    if (keepOnly && keepOnly > 0) {
      const keepIndex = keepOnly - 1;
      toHide = els.filter((_, idx) => idx !== keepIndex);
    } else if (keepFirst && keepFirst > 0) {
      toHide = els.slice(keepFirst);
    }

    toHide.forEach((el) => {
      if (listType === "removeBefore") {
        hiddenRecords.push({ el, prop: "display", prev: el.style.display });
        el.style.setProperty("display", "none", "important");
      } else {
        hiddenRecords.push({ el, prop: "visibility", prev: el.style.visibility });
        el.style.setProperty("visibility", "hidden", "important");
      }
      count++;
    });
  });
  return { count, totalMatches };
}

function restoreHiddenElements() {
  // Newest first, so an element changed twice ends up as it was originally.
  hiddenRecords.slice().reverse().forEach(({ el, prop, prev, prevPriority }) => {
    if (prev) {
      el.style.setProperty(prop, prev, prevPriority || "");
    } else {
      el.style.removeProperty(prop);
    }
  });
  hiddenRecords = [];

  if (unstickStyleEl) {
    unstickStyleEl.remove();
    unstickStyleEl = null;
  }
  if (growStyleEl) {
    growStyleEl.remove();
    growStyleEl = null;
  }
  clickedOnce = new WeakSet();
  return { restored: true };
}

// Stops elements from following the screen as the page scrolls (sticky
// sidebars, or ones the page moves with a script). Left alone, they would
// show up again in every screenshot piece. They are put back in the normal
// page flow with a style rule marked !important, which also beats a page
// script that keeps changing the element's own style while we scroll.
// Undone by restoreHiddenElements().
let unstickStyleEl = null;

function unstick(selectors, captureColumnSelector, profileBodySelector, includeSelector) {
  const rules = [];
  const expandColumn = captureColumnSelector
    ? " max-height: none !important; height: auto !important; overflow: visible !important;"
    : "";
  let matches = 0;
  selectors.forEach((selector) => {
    try {
      matches += document.querySelectorAll(selector).length;
      rules.push(`${selector} { position: static !important; top: auto !important; bottom: auto !important; transform: none !important;${expandColumn} }`);
    } catch (e) {
      // not a valid selector: skip it
    }
  });
  if (!unstickStyleEl) {
    unstickStyleEl = document.createElement("style");
    document.documentElement.appendChild(unstickStyleEl);
  }
  unstickStyleEl.textContent = rules.join("\n");

  if (captureColumnSelector) {
    const column = findElement(captureColumnSelector);
    if (!column) return { error: "The sidebar column could not be located." };
    const original = column.getBoundingClientRect();

    // Keep the column at its original coordinates while letting it scroll
    // with the document. Measure at zero to account for its offset parent.
    setElementStyles(captureColumnSelector, {
      position: "absolute",
      top: "0",
      right: "auto",
      bottom: "auto",
      left: "0",
      width: `${original.width}px`,
      "box-sizing": "border-box",
      "max-height": "none",
      height: "auto",
      "overflow-x": "visible",
      "overflow-y": "visible",
      transform: "none"
    });
    const origin = column.getBoundingClientRect();
    setElementStyles(captureColumnSelector, {
      left: `${original.left - origin.left}px`,
      top: `${original.top - origin.top}px`
    });

    if (profileBodySelector) {
      const profileBody = findElement(profileBodySelector);
      if (!profileBody) return { error: "The profile body could not be located." };
      // The absolutely positioned sidebar contributes no layout height.
      // Reserve space in the profile itself so its bottom is scrollable.
      setElementStyles(profileBodySelector, { overflow: "visible", "max-height": "none" });
      const bodyRect = profileBody.getBoundingClientRect();
      const include = resolveSelector(includeSelector);
      const included = include ? [...document.querySelectorAll(include)] : [];
      const bottom = Math.max(deepBottom(column), ...included.map(deepBottom));
      const extraHeight = Math.max(0, bottom - bodyRect.bottom);
      const bodyHeight = parseFloat(getComputedStyle(profileBody).height) || bodyRect.height;
      setElementStyles(profileBodySelector, { "min-height": `${Math.ceil(bodyHeight + extraHeight)}px` });
    }
  }

  return { matches };
}

// Sets inline styles on the first element matching `selector`, e.g. to
// square off rounded corners that would show as notches between screenshot
// pieces. `styles` is { "css-property": "value" }. Undone by
// restoreHiddenElements().
function setElementStyles(selector, styles) {
  const el = findElement(selector);
  if (!el) return { error: `No element found for "${selector}".` };
  Object.keys(styles).forEach((prop) => {
    hiddenRecords.push({
      el, prop,
      prev: el.style.getPropertyValue(prop),
      prevPriority: el.style.getPropertyPriority(prop)
    });
    el.style.setProperty(prop, styles[prop], "important");
  });
  return { applied: true };
}

// Where an element is on screen: { left, right, top, bottom }.
function getElementRect(selector) {
  const el = findElement(selector);
  if (!el) return { error: `No element found for "${selector}".` };
  const r = el.getBoundingClientRect();
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
}

// First element matching a selector (or a list of fallback selectors).
function findElement(selector) {
  const resolved = resolveSelector(selector);
  try {
    return resolved ? document.querySelector(resolved) : null;
  } catch (e) {
    return null;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.scope !== "sdc-section-capture") return;
  if (msg.action === "getRegionInfo") {
    try {
      sendResponse(findRegion(msg.startSelector, msg.endSelector, msg.padding, msg.itemsSelector, msg.growPage, msg.endIncludesItems, msg.includeSelector));
    } catch (e) {
      sendResponse({ error: e.message });
    }
    return true;
  }

  if (msg.action === "scrollWindowTo") {
    scrollWindowTo(msg.y).then(sendResponse);
    return true;
  }

  if (msg.action === "scrollContainerTo") {
    scrollContainerTo(msg.startSelector, msg.endSelector, msg.scrollTop).then(sendResponse);
    return true;
  }

  if (msg.action === "clickButtons") {
    clickButtons(msg.selectors, msg.skipButtonClick).then(sendResponse);
    return true;
  }

  if (msg.action === "autoLoadAll") {
    autoLoadAll(msg.startSelector, msg.endSelector, msg.options).then(sendResponse);
    return true;
  }

  if (msg.action === "hideElements") {
    try {
      const result = hideElements(msg.selectors, msg.listType);
      if (result && result.error) {
        sendResponse(result);
      } else {
        waitForRepaint().then(() => sendResponse(result));
      }
    } catch (e) {
      sendResponse({ error: e.message });
    }
    return true;
  }

  if (msg.action === "setElementStyles") {
    sendResponse(setElementStyles(msg.selector, msg.styles));
    return true;
  }

  if (msg.action === "getElementRect") {
    sendResponse(getElementRect(msg.selector));
    return true;
  }

  if (msg.action === "unstick") {
    const result = unstick(msg.selectors, msg.captureColumnSelector, msg.profileBodySelector, msg.includeSelector);
    waitForRepaint().then(() => sendResponse(result));
    return true;
  }

  if (msg.action === "restoreHiddenElements") {
    try {
      sendResponse(restoreHiddenElements());
    } catch (e) {
      sendResponse({ error: e.message });
    }
    return true;
  }
});

})(); // end re-injection-guarded IIFE
