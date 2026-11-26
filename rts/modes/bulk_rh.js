// RTS mode: Standard / Bulk (With RH on Timeline)
// On Networks, screenshot URL checks require Related Highlights on Timeline.
(globalThis.RTS_MODES = globalThis.RTS_MODES || {}).bulk_rh = {
  order: 2,
  label: 'BULK',
  description: 'Multiple screenshots on the timeline',
  reportType: 'bulk',
  checks: {},
  skipUrlsOnNetworksPage: false,
};
