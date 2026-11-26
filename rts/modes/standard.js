// Skip screenshot checks on Networks. Report Highlights still checks its timeline.
(globalThis.RTS_MODES = globalThis.RTS_MODES || {}).standard = {
  order: 3,
  label: 'Standard / Bulk Mode',
  description: 'No Screenshots at All',
  checks: {},
  skipNetworkScreenshots: true,
};
