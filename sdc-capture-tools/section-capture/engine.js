// engine.js
// The shared building blocks every platform's capture file is made from.
// A platform's *-capture.js picks the steps it needs, in the order it needs
// them (see threads-capture.js for a small, commented example), so changing
// how ONE website is captured never touches another.
//
// The steps (all take the "ctx" object that popup.js builds, see below):
//   Engine.clickButtons       click "show more" style buttons
//   Engine.removeBefore       remove page elements before measuring
//   Engine.unstick            stop elements from following the screen
//   Engine.keepOnePhoto       keep one photo of a photo carousel
//   Engine.hideStickyForContinue   hide sticky bars when resuming mid-page
//   Engine.measure            find the area to capture -> region
//   Engine.loadAll            scroll to load lazy content -> region
//   Engine.chooseSlice        decide which part of the area to capture
//   Engine.screenshot         take the screenshots and stitch them
//   Engine.finish             remember progress (for Continue), add a note
//
// ctx fields:
//   tab, target          the browser tab, and the chosen target's selectors
//   section              the chosen Section's id (e.g. "default", "comments")
//   mode                 "unli" | "15k" | "continue" | "landing" | "firstview"
//   landingCount         items wanted        (mode "landing")
//   continueFrom         pixel to start at   (mode "continue")
//   photoIndex           photo to keep, or null
//   itemsSelector        selector of the repeated items, or null
//   format               "jpeg" | "png"
//   progressKey          where Continue progress is stored
//   setStatus(msg, kind) updates the status line in the popup
//   captureTarget        target copy used while taking screenshots
//   growPage             (optional) true = if the end element's content reaches
//                        lower than the page is tall, make the page that tall
//                        (so a side column taller than the rest isn't cut off)
//   endIncludesItems     (optional) true = the area ends at the end selector or
//                        at the lowest item (itemsInclude), whichever is lower
//   landingItems         (optional) a number N = the "Landing Page" Section
//                        captures the first N items. Not set = it captures
//                        the first screen plus the item cut off at its bottom
//   landingCutAt         (optional) where the "Landing Page" Section cuts:
//                        "regionEnd" captures the whole measured region.
//                        "screen" (default) = the bottom of the first screen;
//                        "areaEnd" = the bottom of the area (the end
//                        selector, e.g. a side panel). Extend the cut to
//                        finish any item crossing that line.
//   noItemsCapturesAll   (optional) true = the "Landing Page" Section (mode
//                        "firstview") captures the whole area when no items
//                        are found, instead of only the first screen
//   tweaks               (optional) set by a platform's capture file to touch
//                        up the screenshot of an inner scrolling box:
//     trimTopPx            skip this many pixels at the top of every piece
//                          after the first (hides a divider line that the
//                          page draws at the top of the box once scrolled)
//     panelStyles          { first, rest }: CSS to apply to target.panelSelector
//                          for the first piece / every later piece, e.g.
//                          { "border-radius": "0px" }; undone afterwards
//     panelOnlyAfterFirst  true = pieces after the first only include the
//                          panel's own column (not whatever sits beside it,
//                          like a map); the rest of the width stays blank

const SLICE_HEIGHT = 15000; // pixels captured per "Full-Capture" slice

// ---------- Section choices ----------
// Each platform's capture file says which list each target gets.
const SECTIONS = {
  // a feed of posts (a profile timeline)
  FEED: [
    { id: "default", label: "Default" },
    { id: "landing3", label: "Landing Page" },
    { id: "15k", label: "Full-Capture" },
    { id: "continue", label: "Continue" },
    { id: "items", label: "Items to Capture" }
  ],
  // Landing Page first (so it is the one selected when the popup opens),
  // then slices. Landing Page = the first screen, plus the item cut off at
  // its bottom. Full-Capture = the first 15,000px, cut just before the item
  // that the 15,000px mark would split. Continue = the next 15,000px.
  LANDING: [
    { id: "landing_screen", label: "Landing Page" },
    { id: "15k", label: "Full-Capture" },
    { id: "continue", label: "Continue" }
  ],
  // everything else
  BASIC: [
    { id: "default", label: "Default" },
    { id: "15k", label: "Full-Capture" },
    { id: "continue", label: "Continue" }
  ]
};

// Turns the chosen Section into how the capture runs:
//   "unli"     capture everything, loading all content first
//   "15k"      capture the first 15,000px only (SLICE_HEIGHT)
//   "continue" capture the NEXT 15,000px after the last "15k"/"continue"
//   "landing"  capture only the first N items (fixedCount, or typed in)
//   "firstview" capture only the first screen (or the first ctx.landingItems
//              items, when that is set), plus the rest of the item
//              that is cut off at its bottom (if the cut falls between two
//              items, nothing is added)
function modeFor(sectionId) {
  switch (sectionId) {
    case "landing_screen": return { mode: "firstview" };
    case "single_post": return { mode: "landing", fixedCount: 1 };
    case "landing3": return { mode: "landing", fixedCount: 3 };
    case "items": return { mode: "landing", fixedCount: null };
    case "numbered_comments": return { mode: "landing", fixedCount: null };
    case "with_comments_15k": return { mode: "15k" };
    case "15k": return { mode: "15k" };
    case "continue": return { mode: "continue" };
    default: return { mode: "unli" }; // "default", "with_comments_full"
  }
}

// Some fields of a target can differ per Section: write
// { sectionId: value } instead of the value (see vk-selectors.js).
// This returns a copy of the target with the chosen Section's value in
// place, so everything after it just sees plain values.
// Fields that can be per-Section: startSelector, endSelector,
// clickBeforeCapture, itemsInclude.
function resolveForSection(target, sectionId) {
  const resolved = Object.assign({}, target);
  ["startSelector", "endSelector", "clickBeforeCapture", "itemsInclude"].forEach((field) => {
    const value = target[field];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (sectionId in value) resolved[field] = value[sectionId];
      else if ("default" in value) resolved[field] = value.default;
      else resolved[field] = Object.values(value)[0];
    }
  });
  return resolved;
}

// ---------- Small helpers ----------

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function storageGet(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (res) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(res[key] || null);
    });
  });
}

function storageSet(key, value) {
  return new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve));
}

function storageRemove(key) {
  return new Promise((resolve) => chrome.storage.local.remove([key], resolve));
}

// Continue progress is remembered per page URL + website + Include.
function continueKey(url, platformId, targetId) {
  return `continue:${url}:${platformId}:${targetId}`;
}

// Talk to content.js running inside the page.
function sendMessageToTab(tabId, msg) {
  return new Promise((resolve, reject) => {
    // Other capture listeners share this tab's message channel and validate type and timestamp.
    const scope = "sdc-section-capture";
    const message = {...msg, scope, type: `${scope}:${msg.action}`, timestamp: Date.now()};
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

// content.js is normally loaded by the manifest; this injects it if the tab
// was opened before the extension was installed/updated.
async function ensureContentScript(tabId) {
  try {
    await sendMessageToTab(tabId, { action: "getRegionInfo", startSelector: "__ping__", endSelector: "__ping__" });
  } catch (e) {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["section-capture/content.js"] });
  }
}

// Chrome allows about 2 screenshots per second. Retry once if we hit that.
async function safeCapture(windowId) {
  const shoot = () => new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(dataUrl);
    });
  });
  try {
    return await shoot();
  } catch (e) {
    if (/MAX_CAPTURE_VISIBLE_TAB_CALLS/i.test(e.message)) {
      await wait(700);
      return await shoot();
    }
    throw e;
  }
}

// ---------- Taking the screenshots and stitching them together ----------

// Each screenshot piece starts a few pixels BEFORE where the previous one
// ended. If the browser scrolled a pixel short, or a scrollbar changed the
// page width, the pieces still overlap instead of leaving a white gap.
const STEP_OVERLAP_PX = 4;

function buildSteps(startOffset, contentEnd, stepSize, maxOffset) {
  const offsets = [];
  let y = Math.min(startOffset, maxOffset);
  offsets.push(y);
  while (y + stepSize < contentEnd) {
    const next = Math.min(y + stepSize - STEP_OVERLAP_PX, maxOffset);
    if (next <= y) break;
    y = next;
    offsets.push(y);
  }
  return offsets;
}

async function captureWindowMode(ctx, region) {
  const { tab, setStatus } = ctx;
  const target = ctx.captureTarget;
  const dpr = region.devicePixelRatio || 1;
  const viewportHeight = region.viewportHeight;
  const regionTop = region.top;
  const regionBottom = region.top + region.height;
  const maxScrollY = Math.max(0, region.pageHeight - viewportHeight);

  const scrollYs = buildSteps(regionTop, regionBottom, viewportHeight, maxScrollY);

  const chunks = [];
  // How far down the page we actually managed to capture. region.height
  // comes from a single measurement taken before any of this scrolling/
  // capturing happens — if the real content settles shorter by the time
  // we get here (a loading skeleton collapsing, an image finishing its
  // reflow, a sticky element changing the layout), that measurement goes
  // stale. Tracking the real coverage lets us size the canvas to what was
  // genuinely painted instead of trusting the original number, so a
  // shortfall can never show up as a blank strip nobody drew into.
  let maxCoveredBottom = regionTop;
  let totalChunks = scrollYs.length;
  setStatus("Capturing screenshots...", "working", { done: 0, total: totalChunks });
  for (let i = 0; i < scrollYs.length; i++) {
    // window.scrollTo() silently clamps to whatever the browser
    // considers its actual max scroll, which can differ from our own
    // maxScrollY estimate — use the real resulting position
    // (scrollWindowTo already returns it) instead of the value we
    // asked for, so a mismatch can't misplace/duplicate a chunk.
    const scrollResult = await sendMessageToTab(tab.id, { action: "scrollWindowTo", y: scrollYs[i] });
    const actualScrollY = (scrollResult && typeof scrollResult.scrollY === "number") ? scrollResult.scrollY : scrollYs[i];
    const coveredBottom = actualScrollY + viewportHeight;
    if (chunks.length && coveredBottom <= maxCoveredBottom) {
      totalChunks--;
      continue;
    }

    await wait(550); // stay under captureVisibleTab's rate limit
    const dataUrl = await safeCapture(tab.windowId);
    chunks.push({ scrollY: actualScrollY, dataUrl });
    maxCoveredBottom = Math.max(maxCoveredBottom, coveredBottom);
    setStatus(`Captured chunk ${chunks.length} of ${totalChunks}...`, "working", { done: chunks.length, total: totalChunks });

    if (i === 0 && target.removeAfterCapture && target.removeAfterCapture.length) {
      await sendMessageToTab(tab.id, { action: "hideElements", selectors: target.removeAfterCapture, listType: "removeAfter" });
    }
  }

  await sendMessageToTab(tab.id, { action: "scrollWindowTo", y: region.originalScrollY });
  setStatus("Stitching image...", "working");

  // Never let the canvas be taller than what the chunks actually reached —
  // only ever shrink toward real coverage, never grow past the measured
  // region.
  const effectiveBottom = Math.min(regionBottom, maxCoveredBottom);
  const effectiveHeight = Math.max(0, effectiveBottom - regionTop);

  const canvasWidth = Math.round(region.width * dpr);
  const canvasHeight = Math.round(effectiveHeight * dpr);
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const g = canvas.getContext("2d");

  if (ctx.format === "jpeg") {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  let paintedBottom = regionTop;
  for (const chunk of chunks) {
    const img = await loadImage(chunk.dataUrl);
    const chunkTop = chunk.scrollY;
    const chunkBottom = chunk.scrollY + viewportHeight;
    // Preserve pixels already drawn when a short scroll overlaps most of the previous screenshot.
    const intersectTop = Math.max(paintedBottom, chunkTop);
    const intersectBottom = Math.min(effectiveBottom, chunkBottom);
    if (intersectBottom <= intersectTop) continue;

    const srcX = Math.round(region.left * dpr);
    const srcY = Math.round((intersectTop - chunkTop) * dpr);
    const srcW = Math.round(region.width * dpr);
    const destY = Math.round((intersectTop - regionTop) * dpr);
    const srcH = Math.round((intersectBottom - regionTop) * dpr) - destY;

    if (srcH > 0) g.drawImage(img, srcX, srcY, srcW, srcH, 0, destY, srcW, srcH);
    paintedBottom = intersectBottom;
  }

  return { canvas, widthPx: region.width, heightPx: effectiveHeight };
}

async function captureContainerMode(ctx, region, sliceStart) {
  const { tab, setStatus } = ctx;
  const target = ctx.captureTarget;
  const { startSelector, endSelector } = target;
  const dpr = region.devicePixelRatio || 1;
  const clientH = region.containerClientHeight;
  const contentTop = region.contentTop;
  const contentHeight = region.contentHeight;
  const contentBottom = contentTop + contentHeight;
  const maxScrollTop = Math.max(0, region.containerScrollHeight - clientH);

  // The static header (if any) is captured once, only on the very
  // first slice — same "show it once at the top" reasoning as
  // removeAfterCapture. A Continue slice picks up mid-scroll and
  // shouldn't repeat content that was already shown in an earlier run.
  const includeStaticPrefix = sliceStart === 0 && (region.staticPrefixHeight || 0) > 0;
  let staticPrefixDataUrl = null;
  if (includeStaticPrefix) {
    setStatus("Capturing static header...", "working");
    staticPrefixDataUrl = await safeCapture(tab.windowId);
  }

  const scrollTops = buildSteps(contentTop, contentBottom, clientH, maxScrollTop);

  // Optional touch-ups a platform asked for (see "tweaks" at the top).
  const tweaks = ctx.tweaks || {};
  let panelRect = null; // the panel's column, measured once before scrolling
  if (tweaks.panelOnlyAfterFirst && target.panelSelector) {
    const rect = await sendMessageToTab(tab.id, { action: "getElementRect", selector: target.panelSelector });
    if (rect && typeof rect.left === "number") panelRect = rect;
  }

  const chunks = [];
  // Same reasoning as captureWindowMode: contentHeight/contentBottom come
  // from a single measurement taken before any scrolling happens, so if
  // the container's real content settles shorter by the time we actually
  // capture it, track what the chunks genuinely reached instead of
  // trusting that original number when sizing the canvas.
  let maxCoveredBottom = contentTop;
  let totalChunks = scrollTops.length;
  setStatus("Capturing screenshots...", "working", { done: 0, total: totalChunks });
  for (let i = 0; i < scrollTops.length; i++) {
    const result = await sendMessageToTab(tab.id, {
      action: "scrollContainerTo",
      startSelector,
      endSelector,
      scrollTop: scrollTops[i]
    });
    if (result.error) throw new Error(result.error);
    const coveredBottom = result.scrollTop + clientH;
    if (chunks.length && coveredBottom <= maxCoveredBottom) {
      totalChunks--;
      continue;
    }

    if (tweaks.panelStyles && target.panelSelector) {
      await sendMessageToTab(tab.id, {
        action: "setElementStyles",
        selector: target.panelSelector,
        styles: i === 0 ? tweaks.panelStyles.first : tweaks.panelStyles.rest
      });
    }

    await wait(550);
    const dataUrl = await safeCapture(tab.windowId);
    chunks.push({ scrollTop: result.scrollTop, containerRect: result.containerRect, dataUrl });
    maxCoveredBottom = Math.max(maxCoveredBottom, coveredBottom);
    setStatus(`Captured chunk ${chunks.length} of ${totalChunks}...`, "working", { done: chunks.length, total: totalChunks });

    if (i === 0 && target.removeAfterCapture && target.removeAfterCapture.length) {
      await sendMessageToTab(tab.id, { action: "hideElements", selectors: target.removeAfterCapture, listType: "removeAfter" });
    }
  }

  // Restore original inner-scroll position.
  await sendMessageToTab(tab.id, {
    action: "scrollContainerTo",
    startSelector,
    endSelector,
    scrollTop: region.originalScrollTop
  });
  setStatus("Stitching image...", "working");

  // Never let the canvas be taller than what the chunks actually reached —
  // only ever shrink toward real coverage, never grow past the measured
  // region.
  const effectiveBottom = Math.min(contentBottom, maxCoveredBottom);
  const effectiveContentHeight = Math.max(0, effectiveBottom - contentTop);

  const staticPrefixHeightPx = includeStaticPrefix ? region.staticPrefixHeight : 0;
  const canvasWidth = Math.round(region.screenWidth * dpr);
  const canvasHeight = Math.round((staticPrefixHeightPx + effectiveContentHeight) * dpr);
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const g = canvas.getContext("2d");

  if (ctx.format === "jpeg") {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  if (includeStaticPrefix) {
    const img = await loadImage(staticPrefixDataUrl);
    const srcX = Math.round(region.screenLeft * dpr);
    const srcY = Math.round(region.staticPrefixScreenTop * dpr);
    const srcW = Math.round(region.screenWidth * dpr);
    const srcH = Math.round(region.staticPrefixHeight * dpr);
    g.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
  }

  // Each piece starts STEP_OVERLAP_PX before where the previous one ended,
  // so skipping a few pixels at the top never leaves a gap.
  const trimTop = Math.min(tweaks.trimTopPx || 0, STEP_OVERLAP_PX);

  let paintedBottom = contentTop;
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const img = await loadImage(chunk.dataUrl);
    const chunkContentTop = chunk.scrollTop;
    const chunkContentBottom = chunk.scrollTop + clientH;
    const intersectTop = Math.max(paintedBottom, chunkContentTop + (ci > 0 ? trimTop : 0));
    const intersectBottom = Math.min(effectiveBottom, chunkContentBottom);
    if (intersectBottom <= intersectTop) continue;

    // Which columns of the screenshot to use: all of them, except pieces
    // after the first can be limited to the panel's own column.
    let colLeft = region.screenLeft;
    let colRight = region.screenLeft + region.screenWidth;
    if (ci > 0 && panelRect) {
      colLeft = Math.max(colLeft, panelRect.left);
      colRight = Math.min(colRight, panelRect.right);
    }

    const screenTop = chunk.containerRect ? chunk.containerRect.top : region.screenTop;
    const srcX = Math.round(colLeft * dpr);
    const srcY = Math.round((screenTop + (intersectTop - chunkContentTop)) * dpr);
    const srcW = Math.round((colRight - colLeft) * dpr);
    const destX = Math.round((colLeft - region.screenLeft) * dpr);
    const destY = Math.round((staticPrefixHeightPx + intersectTop - contentTop) * dpr);
    const srcH = Math.round((staticPrefixHeightPx + intersectBottom - contentTop) * dpr) - destY;

    if (srcH > 0) g.drawImage(img, srcX, srcY, srcW, srcH, destX, destY, srcW, srcH);
    paintedBottom = intersectBottom;
  }

  return { canvas, widthPx: region.screenWidth, heightPx: staticPrefixHeightPx + effectiveContentHeight };
}


// ---------- The steps a platform's capture file can use ----------

// Click "show more" style buttons once. (Platforms that call loadAll skip
// this: loadAll clicks them again after every scroll, so buttons that only
// appear later get clicked too. Continue skips it: the page is assumed to
// be prepared already.)
async function clickButtons(ctx) {
  const t = ctx.target;
  if (ctx.mode === "continue" || !t.clickBeforeCapture || !t.clickBeforeCapture.length) return;
  ctx.setStatus("Clicking expand/load button...", "working");
  await sendMessageToTab(ctx.tab.id, { action: "clickButtons", selectors: t.clickBeforeCapture, skipButtonClick: t.skipButtonClick });
}

// Remove elements that are in the way (headers, side menus...).
async function removeBefore(ctx) {
  const t = ctx.target;
  if (!t.removeBeforeCapture || !t.removeBeforeCapture.length) return;
  ctx.setStatus("Cleaning up page before capture...", "working");
  await sendMessageToTab(ctx.tab.id, { action: "hideElements", selectors: t.removeBeforeCapture, listType: "removeBefore" });
}

// Keep only one photo of a post's photo carousel (blank = keep all).
async function keepOnePhoto(ctx) {
  const t = ctx.target;
  if (!t.photoSelect || ctx.photoIndex == null) return;
  ctx.setStatus(`Keeping photo #${ctx.photoIndex}, removing the rest...`, "working");
  const result = await sendMessageToTab(ctx.tab.id, {
    action: "hideElements",
    selectors: [{ selector: t.photoSelect, keepOnly: ctx.photoIndex }],
    listType: "removeBefore"
  });
  if (result.error) throw new Error(result.error);
  if (result.totalMatches > 0 && ctx.photoIndex > result.totalMatches) {
    throw new Error(`Only ${result.totalMatches} photo(s) found in this post — enter 1-${result.totalMatches}.`);
  }
}

// Stop elements from following the screen while scrolling (see
// target.unstickSelectors), so they don't repeat in every screenshot piece.
async function unstick(ctx) {
  const list = ctx.target.unstickSelectors;
  if (!list || !list.length) return;
  ctx.setStatus("Un-sticking elements...", "working");
  const result = await sendMessageToTab(ctx.tab.id, {
    action: "unstick",
    selectors: list,
    captureColumnSelector: ctx.target.captureColumnSelector,
    profileBodySelector: ctx.target.captureColumnSelector ? ctx.target.endSelector : null,
    includeSelector: ctx.target.includeSelector
  });
  if (result?.error) throw new Error(result.error);
}

// Continue starts in the middle of the page, so sticky bars (removeAfter
// elements) are hidden up front. They must be hidden, not removed: removing
// them would shift the page and break the saved pixel position.
async function hideStickyForContinue(ctx) {
  const t = ctx.target;
  if (ctx.mode !== "continue" || !t.removeAfterCapture || !t.removeAfterCapture.length) return;
  await sendMessageToTab(ctx.tab.id, { action: "hideElements", selectors: t.removeAfterCapture, listType: "removeAfter" });
  ctx.captureTarget = Object.assign({}, t, { removeAfterCapture: [] }); // already hidden
}

// Find the area to capture. Returns the region (position and size).
async function measure(ctx) {
  const t = ctx.target;
  ctx.setStatus("Locating section...", "working");
  const region = await sendMessageToTab(ctx.tab.id, {
    action: "getRegionInfo",
    startSelector: t.startSelector,
    endSelector: t.endSelector,
    padding: t.padding,
    itemsSelector: ctx.itemsSelector,
    includeSelector: t.includeSelector,
    growPage: !!ctx.growPage,
    endIncludesItems: !!ctx.endIncludesItems
  });
  if (region.error) throw new Error(region.error);
  return region;
}

// Scroll down to load lazy content (clicking "show more" buttons on the
// way), then measure again because the area has grown.
//   opts (optional): { maxScrolls, waitMs }
async function loadAll(ctx, region, opts) {
  const t = ctx.target;
  const options = Object.assign({}, opts || {}, {
    clickBeforeEachScroll: ctx.mode !== "continue" && t.clickBeforeCapture && t.clickBeforeCapture.length ? t.clickBeforeCapture : null,
    skipButtonClick: t.skipButtonClick && t.skipButtonClick.length ? t.skipButtonClick : null
  });

  if (ctx.mode === "unli") {
    ctx.setStatus("Loading all content first...", "working");
  } else if (ctx.mode === "landing") {
    // Only enough for the first N items (plus one as a safety margin).
    ctx.setStatus(`Loading enough content for ${ctx.landingCount} item(s)...`, "working");
    options.itemsSelector = ctx.itemsSelector;
    options.targetItemCount = ctx.landingCount + 1;
  } else if (ctx.mode === "firstview" && ctx.landingItems) {
    // Only enough for the first N items (plus one as a safety margin).
    ctx.setStatus(`Loading enough content for ${ctx.landingItems} item(s)...`, "working");
    options.itemsSelector = ctx.itemsSelector;
    options.targetItemCount = ctx.landingItems + 1;
  } else if (ctx.mode === "firstview") {
    // Two screens is plenty to finish the item cut off at the first one.
    ctx.setStatus("Loading the first screen...", "working");
    const isContainer = region.mode === "container";
    const regionTop = isContainer ? region.contentTop : region.top;
    const screenHeight = (isContainer ? region.containerClientHeight : region.viewportHeight) || 800;
    options.targetHeight = regionTop + screenHeight * 2;
  } else {
    // "15k" / "continue": only load as far as this slice reaches, plus one
    // screen so capturing itself doesn't run past the loaded part.
    ctx.setStatus("Loading enough content for this slice...", "working");
    const isContainer = region.mode === "container";
    const regionTop = isContainer ? region.contentTop : region.top;
    const screenHeight = (isContainer ? region.containerClientHeight : region.viewportHeight) || 800;
    options.targetHeight = regionTop + (ctx.mode === "continue" ? ctx.continueFrom : 0) + SLICE_HEIGHT + screenHeight;
  }

  await sendMessageToTab(ctx.tab.id, { action: "autoLoadAll", startSelector: t.startSelector, endSelector: t.endSelector, options });
  return measure(ctx);
}

// Decide which part of the area to capture (all of it, the first 15,000px,
// the next 15,000px, or the first N items).
// Returns { region, sliceStart, sliceEnd, totalHeight, isContainer, itemCount,
//           cutItemFinished, noItems, landingItemsTaken, landingNote }
// or { nothingLeft: true, message } when Continue is already at the end.
async function chooseSlice(ctx, region) {
  const isContainer = region.mode === "container";
  const totalHeight = isContainer ? region.contentHeight : region.height;
  const regionTopRef = isContainer ? region.contentTop : region.top;

  // Item positions, relative to the top of the area.
  const items = (region.items || []).map((it) => ({
    top: it.top - regionTopRef,
    bottom: it.bottom - regionTopRef
  }));

  // If a cut would land inside an item (a post, a video card...), move it
  // up to the item's top so the item is captured whole next time.
  function avoidSplitting(cut, sliceStart) {
    for (const item of items) {
      if (item.top < cut && cut < item.bottom) {
        return item.top > sliceStart ? item.top : cut;
      }
    }
    return cut;
  }

  let sliceStart = 0;
  let sliceEnd = totalHeight;
  let cutItemFinished = false;
  let noItems = false;
  let landingItemsTaken = 0;
  let landingNote = "";

  if (ctx.mode === "unli") {
    await storageRemove(ctx.progressKey);
  } else if (ctx.mode === "15k") {
    sliceEnd = avoidSplitting(Math.min(SLICE_HEIGHT, totalHeight), 0);
  } else if (ctx.mode === "firstview" && ctx.landingItems && items.length) {
    // Landing Page set to a number of items: the first N (fewer if the page
    // has fewer).
    landingItemsTaken = Math.min(ctx.landingItems, items.length);
    sliceEnd = Math.min(totalHeight, items[landingItemsTaken - 1].bottom);
  } else if (ctx.mode === "firstview" && ctx.landingCutAt === "regionEnd") {
    landingNote = "whole measured area";
  } else if (ctx.mode === "firstview" && ctx.landingCutAt === "areaEnd") {
    // Keep the full side panel. Extend only through items the cut would split.
    const cutLine = typeof region.endElementBottom === "number"
      ? Math.max(0, Math.min(totalHeight, region.endElementBottom - regionTopRef))
      : totalHeight;
    sliceEnd = cutLine;
    for (const item of items) {
      if (item.top < sliceEnd && item.bottom > sliceEnd) {
        sliceEnd = Math.min(totalHeight, item.bottom);
      }
    }
    landingNote = sliceEnd > cutLine ? "full sidebar + last complete item" : "full sidebar";
  } else if (ctx.mode === "firstview") {
    // The first screenshot reaches one screen down. An item that starts
    // above that line and ends below it is "cut": capture up to its end.
    // If the line falls between two items, the first screen is all we need.
    const screenHeight = (isContainer ? region.containerClientHeight : region.viewportHeight) || 800;
    sliceEnd = Math.min(screenHeight, totalHeight);
    const cutItem = items.find((item) => item.top < sliceEnd && sliceEnd < item.bottom);
    if (cutItem) {
      sliceEnd = Math.min(cutItem.bottom, totalHeight);
      cutItemFinished = true;
    } else if (!items.length && ctx.noItemsCapturesAll) {
      // No items on the page (an empty profile, say): the first screen would
      // cut off whatever sits beside them, so take the whole area instead.
      sliceEnd = totalHeight;
      noItems = true;
    }
  } else if (ctx.mode === "landing") {
    if (!items.length) {
      throw new Error("No items found — check the item selector, or the page may not have loaded any yet.");
    }
    const n = Math.min(ctx.landingCount, items.length);
    sliceEnd = Math.min(totalHeight, items[n - 1].bottom);
  } else if (ctx.mode === "continue") {
    sliceStart = Math.min(ctx.continueFrom, totalHeight);
    if (sliceStart >= totalHeight) {
      await storageRemove(ctx.progressKey);
      return { nothingLeft: true, message: "Already at the end — nothing left to continue." };
    }
    sliceEnd = avoidSplitting(Math.min(sliceStart + SLICE_HEIGHT, totalHeight), sliceStart);
  }

  const sliceRegion = isContainer
    ? Object.assign({}, region, { contentTop: region.contentTop + sliceStart, contentHeight: sliceEnd - sliceStart })
    : Object.assign({}, region, { top: region.top + sliceStart, height: sliceEnd - sliceStart });

  return { region: sliceRegion, sliceStart, sliceEnd, totalHeight, isContainer, itemCount: items.length, cutItemFinished, noItems, landingItemsTaken, landingNote };
}

// Take the screenshots of the chosen slice and stitch them into one image.
// Returns { canvas, widthPx, heightPx }.
async function screenshot(ctx, slice) {
  ctx.setStatus(slice.isContainer ? "Detected an inner scrolling box. Capturing..." : "Capturing...", "working");
  return slice.isContainer
    ? captureContainerMode(ctx, slice.region, slice.sliceStart)
    : captureWindowMode(ctx, slice.region);
}

// Remember how far we got (for Continue) and describe it in a short note.
async function finish(ctx, slice, result) {
  let note = "";
  if (ctx.mode === "15k" || ctx.mode === "continue") {
    if (slice.sliceEnd >= slice.totalHeight) {
      await storageRemove(ctx.progressKey);
      note = " · reached the end";
    } else {
      await storageSet(ctx.progressKey, { lastOffset: slice.sliceEnd, totalHeight: slice.totalHeight });
      note = ` · ${Math.round(slice.sliceEnd).toLocaleString()}/${Math.round(slice.totalHeight).toLocaleString()}px — Continue for more`;
    }
  } else if (ctx.mode === "landing") {
    note = ` · first ${Math.min(ctx.landingCount, slice.itemCount)} item(s)`;
  } else if (ctx.mode === "firstview") {
    note = slice.landingNote ? ` · ${slice.landingNote}`
      : slice.landingItemsTaken ? ` · first ${slice.landingItemsTaken} item(s)`
      : slice.noItems ? " · no items found: whole area"
      : slice.cutItemFinished ? " · first screen + the item cut off at its bottom"
      : " · first screen only (nothing was cut)";
  }
  return Object.assign({}, result, { note });
}

const Engine = {
  SECTIONS, modeFor, resolveForSection, continueKey,
  storageGet, sendMessageToTab, ensureContentScript,
  clickButtons, removeBefore, unstick, keepOnePhoto, hideStickyForContinue,
  measure, loadAll, chooseSlice, screenshot, finish
};
