// RTS mode: Default - every check is on.
// Each mode lives in its own file and registers itself in RTS_MODES (loaded before content.js and by the popup).
//   checks                 set a check to false to switch it off in this mode
//                          (screenshots, noUrl, tableUrls, dupUrls, screenshotRows, urls, profileLink, profileSummary,
//                           formatting, placeholders, relatives, googleImage, linkInSummary, images)
//   skipUrlsOnNetworksPage on /networks/ pages the screenshots-table URL functions are off
//                          ("No Url", no-subdomain and duplicate URLs on table links); #profile_link keeps its URL check
//   noUrlsOnNetworksPage   on /networks/ pages any URL in the screenshots table is marked red
//   basicScreenshots       #screenshots: nothing required; if something was uploaded only URL, metadata and image are
//                          scanned, and any other file only needs a date-named .mp4 name
(globalThis.RTS_MODES = globalThis.RTS_MODES || {}).default = {
  order: 1,
  label: 'Default',
  description: 'All checks on',
  checks: {},
  skipUrlsOnNetworksPage: false,
  basicScreenshots: false,
};
