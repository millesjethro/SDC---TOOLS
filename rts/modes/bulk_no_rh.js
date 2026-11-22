// RTS mode: Standard / Bulk (No RH on Timeline)
// Same as Default, but on Networks pages the screenshots get no URL checks, whatever the match result,
// and any URL found in the screenshots table is marked red (there must be no URL when RH is not on the Timeline).
(globalThis.RTS_MODES = globalThis.RTS_MODES || {}).bulk_no_rh = {
  order: 2,
  label: 'Standard / Bulk Mode',
  description: 'No Related Highlights on Timeline',
  checks: {},
  skipUrlsOnNetworksPage: true,
  noUrlsOnNetworksPage: true,
  basicScreenshots: false,
};
