// Skip screenshot checks on Networks. Report Highlights still checks its timeline.
(globalThis.RTS_MODES = globalThis.RTS_MODES || {}).standard = {
  order: 3,
  label: 'STD (Non-Bulk)',
  description: 'No screenshots on Networks',
  reportType: 'nonbulk',
  checks: {},
};
