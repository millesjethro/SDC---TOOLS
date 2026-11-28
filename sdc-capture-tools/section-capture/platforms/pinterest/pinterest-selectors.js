// pinterest-selectors.js
// WHAT to find on Pinterest pages (the "needed divs"). HOW it is captured is in
// pinterest-capture.js. Every field is explained in registry.js.

const PINTEREST_PROFILE_LAYOUT =
  "body > div#__PWS_ROOT__:nth-of-type(1) > div:nth-of-type(1) > div > div:nth-of-type(3) > div > div";

// The business profile's main box. The capture starts at it and ends at the
// third section inside it when the page has one, otherwise at the first.
const PINTEREST_MAIN = PINTEREST_PROFILE_LAYOUT + " > div:nth-of-type(3) > div:nth-of-type(2) > div";
const PINTEREST_END_1 = PINTEREST_MAIN + " > div:nth-of-type(3) > div > div > div > div > div:nth-of-type(1) > div > div";
const PINTEREST_END_2 = PINTEREST_MAIN + " > div:nth-of-type(3) > div > div > div > div > div:nth-of-type(3)";

registerPlatform({
  id: "pinterest",
  label: "Pinterest",
  match: (hostname) => /(^|\.)pinterest\.[a-z.]+$/.test(hostname),
  targets: [
    {
      id: "profile_default",
      label: "Profile Landing",
      startSelector: PINTEREST_MAIN,
      // A list of fallbacks: the first selector that finds something wins.
      endSelector: [PINTEREST_END_2, PINTEREST_END_1],
      clickBeforeCapture: [],
      skipButtonClick: null,
      // Hide the right-hand controls in either header layout.
      removeBeforeCapture: [
        PINTEREST_PROFILE_LAYOUT + " > div#HeaderContent:nth-of-type(1) > div > div > div:nth-of-type(2)",
        PINTEREST_PROFILE_LAYOUT + " > div#HeaderContent:nth-of-type(2) > div > div > div:nth-of-type(2) > div > div > div"
      ],
      removeAfterCapture: [],
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      itemsInclude: "[data-test-id='profile-board-card']",
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    }
  ],
  verified: false
});
