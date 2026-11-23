// mugshots-selectors.js
// WHAT to find on Mugshots pages (the "needed divs"). HOW it is captured is
// in mugshots-capture.js. Every field is explained in registry.js.

registerPlatform({
  id: "mugshots",
  label: "Mugshots",
  match: (hostname) => /(^|\.)mugshots\.[a-z.]+$/.test(hostname),
  targets: [
    {
      id: "mugshots_user_default",
      label: "Mugshots",
      startSelector: "#header",
      endSelector: "#main > div:nth-of-type(3)",
      clickBeforeCapture: [],
      skipButtonClick: null,
      // The "unpublish" block, and the ads (kept from before).
      removeBeforeCapture: ["#item-unpublish", "[class^='criminal-ad']"],
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
