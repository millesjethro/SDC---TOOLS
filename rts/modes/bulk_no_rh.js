// RTS mode: Standard / Bulk (No RH on Timeline)
// Networks pages skip missing and duplicate screenshot URL checks,
// and any URL found in the screenshots table is marked red (there must be no URL when RH is not on the Timeline).
(globalThis.RTS_MODES = globalThis.RTS_MODES || {}).bulk_no_rh = {
  order: 1,
  label: 'STD',
  description: 'Standard · up to one screenshot per network',
  reportType: 'std',
  checks: {},
  skipUrlsOnNetworksPage: true,
  noUrlsOnNetworksPage: true,
};
