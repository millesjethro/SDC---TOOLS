// signalhire-selectors.js
// WHAT to find on SignalHire pages (the "needed divs"). HOW it is captured is in
// signalhire-capture.js. Every field is explained in registry.js.

registerPlatform({
  id: "signalhire",
  label: "SignalHire",
  match: (hostname) => /(^|\.)signalhire\.[a-z.]+$/.test(hostname),
  targets: [
    {
      id: "profile_default",
      label: "Profile",
      startSelector: "[class='MuiStack-root css-1eokwgb']",
      endSelector: "[class='MuiBox-root css-i0e5qi']",
      // match: "includes" = the button's text only has to CONTAIN "+"
      clickBeforeCapture: [{ text: "+", match: "includes" }, { text: "...see more" }, { text: "Show more" }],
      skipButtonClick: null,
      removeBeforeCapture: ["[data-id='zsalesiq']"],
      removeAfterCapture: [],
      padding: { top: 0, bottom: 4, left: 0, right: 0 },
      itemsInclude: null,
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    }
  ],
  verified: true
});
