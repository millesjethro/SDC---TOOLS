// classmates-selectors.js
// WHAT to find on Classmates pages (the "needed divs"). HOW it is captured
// is in classmates-capture.js. Every field is explained in registry.js.

registerPlatform({
  id: "classmates",
  label: "Classmates",
  match: (hostname) => /(^|\.)classmates\.[a-z.]+$/.test(hostname),
  targets: [
    {
      id: "profile_default",
      label: "Profile",
      // The capture starts and ends at the same box.
      startSelector: "div#peopleIndex:nth-of-type(2) > div > div > div:nth-of-type(1)",
      endSelector: "div#peopleIndex:nth-of-type(2) > div > div > div:nth-of-type(1)",
      // Every "Expand for more" button gets pressed.
      clickBeforeCapture: [{ text: "Expand for more" }],
      skipButtonClick: null,
      // The second one is the floating cookie-settings button.
      // Note: "ember1422" is an id the page generates, so it may be different
      // on another load. If this stops matching, that's why.
      removeBeforeCapture: [
        "div#ember1422:nth-of-type(1) > div",
        "div#ot-sdk-btn-floating:nth-of-type(3) > div:nth-of-type(1) > button"
      ],
      removeAfterCapture: [],
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      itemsInclude: null,
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    }
  ],
  verified: false
});
