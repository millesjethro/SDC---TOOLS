// soundcloud-selectors.js
// WHAT to find on SoundCloud pages (the "needed divs"). HOW it is captured
// is in soundcloud-capture.js. Every field is explained in registry.js.

// The profile body contains the main column and the sticky sidebar.
const SOUNDCLOUD_PROFILE_BODY = "div#content:nth-of-type(2) > div > div:nth-of-type(3)";
const SOUNDCLOUD_MAIN_COLUMN = SOUNDCLOUD_PROFILE_BODY + " > div:nth-of-type(1)";
const SOUNDCLOUD_SIDEBAR_COLUMN = SOUNDCLOUD_PROFILE_BODY + " > div:nth-of-type(2)";
const SOUNDCLOUD_SIDEBAR = SOUNDCLOUD_SIDEBAR_COLUMN + " > div";
const SOUNDCLOUD_SIDEBAR_DETAILS = SOUNDCLOUD_SIDEBAR + " > div:nth-of-type(2) > div";

// The list of tracks. Each match is one item (<li>), so Full-Capture and
// the Landing Page never cut one in half.
const SOUNDCLOUD_ITEMS =
  SOUNDCLOUD_MAIN_COLUMN + " > div" +
  " > div:nth-of-type(2) > div > div:nth-of-type(3) > ul > li:nth-of-type(n)";

registerPlatform({
  id: "soundcloud",
  label: "SoundCloud",
  match: (hostname) => /(^|\.)soundcloud\.com$/.test(hostname),
  targets: [
    {
      id: "profile_default",
      label: "Profile",
      // The banner at the top of the profile.
      startSelector: "#content > div > div:nth-of-type(1)",
      endSelector: SOUNDCLOUD_PROFILE_BODY,
      includeSelector: [SOUNDCLOUD_MAIN_COLUMN, SOUNDCLOUD_SIDEBAR, SOUNDCLOUD_SIDEBAR_DETAILS].join(", "),
      clickBeforeCapture: [],
      skipButtonClick: null,
      // Remove the global header and bottom overlay so they cannot cover
      // the profile banner or track list while screenshots are stitched.
      removeBeforeCapture: [
        "#app > div:nth-of-type(5) > section",
        "#app > header"
      ],
      removeAfterCapture: [],
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      itemsInclude: SOUNDCLOUD_ITEMS,
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      captureColumnSelector: SOUNDCLOUD_SIDEBAR_COLUMN,
      unstickSelectors: [SOUNDCLOUD_SIDEBAR]
    }
  ],
  verified: false
});
