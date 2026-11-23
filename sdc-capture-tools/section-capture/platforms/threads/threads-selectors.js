// threads-selectors.js
// WHAT to find on Threads pages (the "needed divs"). HOW it is captured is in
// threads-capture.js. Every field is explained in registry.js.

// Both targets work inside the same box on Threads: the page's main
// column. The capture starts and ends there, so it ends at the last item
// that is loaded.
const THREADS_PAGE =
  "div#barcelona-page-layout:nth-of-type(1) > div:nth-of-type(2) > div > div:nth-of-type(2) > div";

// Profile: the posts. Each match is one post.
const THREADS_POSTS =
  THREADS_PAGE + " > div:nth-of-type(1) > div:nth-of-type(4) > div > div:nth-of-type(n)";

// Related Highlights: just the post, without the comments.
const THREADS_POST_ONLY =
  THREADS_PAGE + " > div:nth-of-type(1) > div:nth-of-type(1) > div > div:nth-of-type(2) > div > div > div";

registerPlatform({
  id: "threads",
  label: "Threads",
  match: (hostname) => /(^|\.)threads\.[a-z.]+$/.test(hostname),
  targets: [
    {
      id: "profile_socmed",
      label: "Profile",
      startSelector: THREADS_PAGE,
      endSelector: THREADS_PAGE,
      // Any span with the text "Translate" gets clicked.
      clickBeforeCapture: [{ tag: "span", text: "Translate" }],
      skipButtonClick: null,
      removeBeforeCapture: ["#barcelona-page-layout > div > div > div:nth-child(1)"],
      removeAfterCapture: [],
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      itemsInclude: THREADS_POSTS,
      landingPageItems: THREADS_POSTS,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    },
    {
      // A single post's page. The Section decides how far down the capture
      // goes: just the post, or the comments too.
      id: "related_highlights_rh",
      label: "Related Highlights",
      // Start and end depend on the Section.
      startSelector: {
        no_comments: THREADS_POST_ONLY,
        comments: THREADS_PAGE
      },
      endSelector: {
        no_comments: THREADS_POST_ONLY,
        comments: THREADS_PAGE
      },
      clickBeforeCapture: [{ text: "Translate" }],
      skipButtonClick: null,
      removeBeforeCapture: ["#barcelona-page-layout > div > div > div:nth-child(1)"],
      removeAfterCapture: [],
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      // The comments (used with the "With Comments" Section).
      itemsInclude:
        "div#barcelona-page-layout:nth-of-type(1) > div > div > div:nth-of-type(2) > div" +
        " > div:nth-of-type(1) > div:nth-of-type(1) > div > div:nth-of-type(3) > div:nth-of-type(n)",
      landingPageItems: null,
      photoSelect: "[style='--x-1vi51py: var(--barcelona-columns-item-horizontal-padding);']",
      panelSelector: null,
      unstickSelectors: null
    }
  ],
  verified: false
});
