// registry.js
// Where platforms sign up. Every platform has two files in platforms/<name>/:
//
//   <name>-selectors.js   WHAT to find on the page (the "needed divs"):
//                         the website match, its targets and their selectors.
//                         Calls registerPlatform({...}).
//
//   <name>-capture.js     HOW to capture it: which Engine steps run, in
//                         which order, and which Section choices each
//                         target offers. Calls registerCapture("<id>", {...}).
//
// A capture file can also set landingItems (a number): see "landingItems" in
// engine.js.
//
// popup.html loads this file first, then engine.js, then every platform's
// two files, then popup.js. To add a website: create its two files and add
// their two <script> lines to popup.html.

// ---------- Fields of a platform (in <name>-selectors.js) ----------
//   id, label   names (id is also used to remember Continue progress)
//   match       function(hostname) -> true when the open tab is this website
//   targets     the things you can capture there (shown as "Include")
//   verified    false = selectors are placeholders, not yet checked live
//
// ---------- Fields of a target ----------
//   id, label            names
//   startSelector        CSS selector of the element the capture starts at
//   endSelector          CSS selector of the element the capture ends at
//                        (either one can be a list of fallbacks: the first
//                        selector that matches wins). startSelector,
//                        endSelector, clickBeforeCapture and itemsInclude can
//                        also be { sectionId: value } to differ per Section.
//   clickBeforeCapture   buttons to click first, e.g. "show more": a CSS
//                        selector, or { text: "Translate" } to find a button
//                        by its visible text ({ text, match: "includes" } =
//                        the text only has to contain it; { text, match:
//                        "regex" } = the text is a regular expression).
//                        A { text } entry can also set visibleOnly: true
//                        (skip hidden buttons) and once: true (press each
//                        button one time only) - for toggle buttons
//   skipButtonClick      areas where those buttons must NOT be clicked
//   removeBeforeCapture  elements removed before measuring. An entry can be
//                        { selector, keepFirst: N } (hide all but the first N)
//   removeAfterCapture   elements hidden after the first screenshot piece
//                        (sticky bars that would repeat in every piece)
//   padding              extra pixels around the area { top, bottom, left, right }
//   itemsInclude         selector of one repeated item (post, video, card) so
//                        cuts never land in the middle of one
//   landingPageItems     same, but for the "Landing Page" section
//                        (falls back to itemsInclude)
//   photoSelect          selector of the photos in a post's photo carousel
//                        (lets you keep just one)
//   panelSelector        selector of a side panel the capture file touches up
//                        (rounded corners, the column to keep) - see "tweaks"
//                        in engine.js
//   unstickSelectors     elements that follow the screen while scrolling
//                        (sticky sidebars): they are put back in the normal
//                        page flow while capturing, so they don't repeat in
//                        every screenshot piece
// A field a target doesn't use is set to null.

const PLATFORMS = [];  // filled in by the *-selectors.js files
const CAPTURES = {};   // filled in by the *-capture.js files, by platform id

function registerPlatform(platform) {
  PLATFORMS.push(platform);
}

function registerCapture(platformId, capture) {
  CAPTURES[platformId] = capture;
}

// The platform for this hostname (with its .capture attached), or null.
// A website with selectors but no capture file counts as "not added".
function detectPlatform(hostname) {
  const platform = PLATFORMS.find((p) => p.match(hostname));
  if (!platform || !CAPTURES[platform.id]) return null;
  return Object.assign({}, platform, { capture: CAPTURES[platform.id] });
}
