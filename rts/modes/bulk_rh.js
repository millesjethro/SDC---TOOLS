// RTS mode: Standard / Bulk (With RH on Timeline)
// Check screenshot URLs and metadata on both timelines.
(globalThis.RTS_MODES = globalThis.RTS_MODES || {}).bulk_rh = {
  order: 2,
  label: 'BULK',
  description: 'Multiple screenshots on the timeline',
  reportType: 'bulk',
  checks: {},
  skipUrlsOnNetworksPage: false,
};
