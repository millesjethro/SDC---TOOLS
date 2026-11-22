// RTS mode: Standard (No Timeline or RH)
// #screenshots: nothing is required; if something was uploaded only URL, metadata and image are scanned (Networks page),
// and any other uploaded file only has to be named "yyyy-mm-dd" or "MMMM DD, yyyy" (+ optional ordinal from (2)) with .mp4.
(globalThis.RTS_MODES = globalThis.RTS_MODES || {}).standard = {
  order: 4,
  label: 'Standard Mode',
  description: 'No Timeline or Related Highlights',
  checks: {},
  skipUrlsOnNetworksPage: false,
  basicScreenshots: true,
};
