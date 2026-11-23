// zoominfo-selectors.js
// WHAT to find on ZoomInfo pages (the "needed divs"). HOW it is captured is
// in zoominfo-capture.js. Every field is explained in registry.js.

// The person page's main content. The capture starts and ends here.
const ZOOMINFO_MAIN = "body > app-root > app-person > main";

registerPlatform({
  id: "zoominfo",
  label: "ZoomInfo",
  match: (hostname) => /(^|\.)zoominfo\.com$/.test(hostname),
  targets: [
    {
      id: "profile_default",
      label: "Profile",
      startSelector: ZOOMINFO_MAIN,
      endSelector: ZOOMINFO_MAIN,
      clickBeforeCapture: [],
      skipButtonClick: null,
      // The top header, the colleagues and similar-profiles sections, the
      // FAQs, and the action bar. (The breadcrumbs stay.)
      removeBeforeCapture: [
        "body > app-root > app-person > zi-directories-top-header > header",
        "body > app-root > app-person > main > div > div > aside > app-colleagues > app-section",
        "body > app-root > app-person > main > div > div > div > app-similar-profiles > app-section > section",
        "body > app-root > app-person > main > div > div > div > zi-directories-faqs",
        "body > app-root > app-person > app-person-action-bar > div > div"
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
