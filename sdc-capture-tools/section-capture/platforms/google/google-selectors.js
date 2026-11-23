// google-selectors.js
// WHAT to find on Google pages (the "needed divs"). HOW it is captured is in
// google-capture.js. Every field is explained in registry.js.

// The side panel on Google (Home): profile header, tabs and the list of
// reviews. It has rounded corners and sits beside the map.
const REVIEWS_PANEL =
  "body > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(9) > div:nth-of-type(10)" +
  " > div > div > div:nth-of-type(1) > div:nth-of-type(4)";

// The scrolling list of reviews inside that panel: the box that holds the
// items. Its child divs alternate item, divider, item, divider...
const REVIEWS_LIST =
  REVIEWS_PANEL +
  " > div > div:nth-of-type(1) > div > div > div:nth-of-type(3) > div:nth-of-type(2)";

registerPlatform({
  id: "google",
  label: "Google",
  match: (hostname) => /(^|\.)google\.[a-z.]+$/.test(hostname),
  targets: [
    {
      id: "single_review_default",
      label: "Single Review",
      // Lists of fallbacks: the first selector that matches wins.
      startSelector: [
        "[role='main'] > div > div",
        "[role='main'] > div"
      ],
      endSelector: [
        "[role='main'] > div > div:nth-child(6)",
        "[role='main'] > div > div:nth-child(5)",
        "[role='main'] > div > div:nth-child(4)",
        "[role='main'] > div"
      ],
      clickBeforeCapture: [],
      skipButtonClick: null,
      removeBeforeCapture: [],
      removeAfterCapture: [],
      padding: { top: 0, bottom: 4, left: 0, right: 0 },
      itemsInclude: null,
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    },
    {
      id: "reviews_default",
      label: "Google (Home)",
      startSelector: "body",
      // The list of reviews sits in a panel with its own scrollbar on the
      // side. Ending the capture at that list makes the capture scroll the
      // panel itself, so the items the scrollbar hides are included.
      // ("body" is the fallback if the panel isn't found.)
      endSelector: [
        REVIEWS_LIST,
        "body"
      ],
      clickBeforeCapture: ["[aria-label='See more']"],
      skipButtonClick: null,
      removeBeforeCapture: [
        "body > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-last-child(1) >  div:nth-last-child(1) > div",
        "body > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(9) > div:nth-of-type(11) > div#gb > div > div:nth-of-type(1) > div:nth-of-type(2)"
      ],
      removeAfterCapture: [],
      padding: { top: 0, bottom: 4, left: 0, right: 0 },
      // The list's child divs alternate item, divider, item, divider...
      // so only the odd ones (1st, 3rd, 5th...) are items. That way
      // Full-Capture and Continue never cut in the middle of one.
      itemsInclude: REVIEWS_LIST + " > div:nth-of-type(odd)",
      landingPageItems: null,
      photoSelect: null,
      // Its corners are squared off and the map is left out of every piece
      // after the first (see google-capture.js).
      panelSelector: REVIEWS_PANEL,
      unstickSelectors: null
    }
  ],
  verified: true
});
