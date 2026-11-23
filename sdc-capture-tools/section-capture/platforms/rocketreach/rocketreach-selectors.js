// rocketreach-selectors.js
// WHAT to find on RocketReach pages (the "needed divs"). HOW it is captured is in
// rocketreach-capture.js. Every field is explained in registry.js.

registerPlatform({
  id: "rocketreach",
  label: "RocketReach",
  match: (hostname) => /(^|\.)rocketreach\.[a-z.]+$/.test(hostname),
  targets: [
    {
      id: "rocketreach_default",
      label: "RocketReach",
      startSelector: "[class='section profile-main-card pt-4']",
      endSelector: "[class='section profile-main-card pt-4']",
      clickBeforeCapture: [{ text: "see more" }, { text: "Show more" }],
      skipButtonClick: null,
      removeBeforeCapture: [],
      removeAfterCapture: [],
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      itemsInclude: null,
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    },
    {
      id: "rocketreach_noprofile_default",
      label: "RocketReach No Profile",
      startSelector: "[class='rr-section rr-sec-card']",
      endSelector: "[class='rr-section rr-sec-card']",
      clickBeforeCapture: [{ text: "see more" }, { text: "Show more" }],
      skipButtonClick: null,
      removeBeforeCapture: [],
      removeAfterCapture: [],
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      itemsInclude: null,
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    }
  ],
  verified: true
});
