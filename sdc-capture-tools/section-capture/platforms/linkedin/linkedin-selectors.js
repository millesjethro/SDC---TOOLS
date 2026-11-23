// linkedin-selectors.js
// WHAT to find on LinkedIn pages (the "needed divs"). HOW it is captured is in
// linkedin-capture.js. Every field is explained in registry.js.

registerPlatform({
  id: "linkedin",
  label: "LinkedIn",
  match: (hostname) => /(^|\.)linkedin\.[a-z.]+$/.test(hostname),
  targets: [
    {
      id: "Profile_default",
      label: "Profile",
      startSelector: "[data-testid='lazy-column']",
      endSelector: "[data-testid='lazy-column']",
      clickBeforeCapture: [{ text: " more" }],
      skipButtonClick: ["[data-testid='carousel-children-container']"],
      removeBeforeCapture: [],
      removeAfterCapture: ["[role='toolbar']"],
      padding: { top: 10, bottom: 0, left: 10, right: 10 },
      itemsInclude: null,
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    },
    {
      id: "section_tab_default",
      label: "Sections",
      startSelector: "[aria-label='Primary content']",
      endSelector: "[aria-label='Primary content']",
      clickBeforeCapture: [{ text: " more" }],
      skipButtonClick: null,
      removeBeforeCapture: [],
      removeAfterCapture: ["[role='toolbar']"],
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      itemsInclude: "[data-lazy-mount-id]",
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    }
  ],
  verified: true
});
