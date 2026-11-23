// vk-selectors.js
// WHAT to find on VK pages (the "needed divs"). HOW it is captured is in
// vk-capture.js. Every field is explained in registry.js.

// The profile page: the whole layout, and the posts on the wall.
// Each match of VK_WALL_POSTS is one post.
const VK_PROFILE = "div#page_layout";
const VK_WALL_POSTS = "div#page-wall:nth-of-type(2) > div > article";

// The profile's side column follows the screen as you scroll. It would
// show up again in every screenshot piece, so it is un-stuck while capturing.
const VK_PROFILE_ASIDE =
  "div#profile_redesigned > div > div > div > div:nth-of-type(3) > div > div:nth-of-type(2) > div > aside";

registerPlatform({
  id: "vk",
  label: "VK",
  match: (hostname) => /(^|\.)vk\.(com|ru)$/.test(hostname),
  targets: [
    {
      id: "profile_socmed",
      label: "Profile",
      startSelector: VK_PROFILE,
      // Ends at the last post. A list of fallbacks: the first selector that
      // finds something wins, so a profile with no posts ends at the
      // profile layout instead.
      endSelector: [VK_WALL_POSTS, VK_PROFILE],
      clickBeforeCapture: [],
      skipButtonClick: null,
      // The page header (search bar, menu) is taken out before measuring.
      removeBeforeCapture: ["div#page_header_cont:nth-of-type(1)"],
      removeAfterCapture: [],
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      itemsInclude: VK_WALL_POSTS,
      // Landing Page = the first 3 posts (fewer if the wall has fewer).
      landingPageItems: VK_WALL_POSTS,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: [VK_PROFILE_ASIDE]
    },
    {
      // A single post opened in its pop-up layer. The Section decides how
      // far down the capture goes: just the post, or the comments too.
      id: "related_highlights_rh",
      label: "Related Highlights",
      startSelector: "div#post-layer:nth-of-type(2) > div > div > div > div:nth-of-type(1)",
      endSelector: {
        no_comments: "div#post-layer:nth-of-type(2) > div > div > div > div:nth-of-type(3)",
        comments: "div#post-layer:nth-of-type(2) > div > div > div > div:nth-of-type(4)"
      },
      clickBeforeCapture: [],
      skipButtonClick: null,
      removeBeforeCapture: [],
      removeAfterCapture: [],
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      itemsInclude: null,
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    }
  ],
  verified: false
});
