// youtube-selectors.js
// WHAT to find on YouTube pages (the "needed divs"). HOW it is captured is in
// youtube-capture.js. Every field is explained in registry.js.

// The video's watch page: the main column, the comments, the description
// and the player.
const YT_PRIMARY_INNER =
  "body > ytd-app > div#content:nth-of-type(1) > ytd-page-manager#page-manager > ytd-watch-flexy" +
  " > div#columns:nth-of-type(4) > div#primary:nth-of-type(1) > div#primary-inner";
const YT_COMMENT_THREADS =
  YT_PRIMARY_INNER +
  " > div#below:nth-of-type(2) > div:nth-of-type(3) > ytd-comments#comments > ytd-item-section-renderer#sections" +
  " > div#contents:nth-of-type(3) > ytd-comment-thread-renderer:nth-of-type(n)";
const YT_DESCRIPTION =
  YT_PRIMARY_INNER +
  " > div#below:nth-of-type(2) > div:nth-of-type(2) > ytd-watch-metadata > div#above-the-fold" +
  " > div#bottom-row:nth-of-type(4) > div#description:nth-of-type(1)";
const YT_PLAYER =
  YT_PRIMARY_INNER +
  " > div#player:nth-of-type(1) > div#player-container-outer:nth-of-type(2) > div#player-container-inner" +
  " > div#player-container:nth-of-type(2) > ytd-player#ytd-player > div#container > div#movie_player";

// Buttons to press. "more": "...more", "Read more", "Show more" (not "More
// actions", which opens a menu). The replies button reads "1 reply",
// "21 replies" or "1.2K replies" (not "Hide replies" or "Reply").
// Both are pressed one time each, and only while they can be seen: the
// "21 replies" button stays in the page (hidden) once the replies are open,
// and pressing it again would close them, so the capture would keep opening
// and closing the same replies.
const YT_MORE = {
  text: "^(\\.\\.\\.|\u2026)?\\s*(read |show )?more$",
  match: "regex", visibleOnly: true, once: true
};
const YT_REPLIES = {
  text: "^(view\\s+)?\\d[\\d,.]*\\s*[km]?\\s+repl(y|ies)$",
  match: "regex", visibleOnly: true, once: true
};

// "Show more replies" loads the next replies of a thread. It is pressed
// last (after "more" and "N replies"), and again on every pass while it is
// visible, because a long thread needs several presses.
const YT_SHOW_MORE_REPLIES = { text: "Show more replies", visibleOnly: true };

registerPlatform({
  id: "youtube",
  label: "YouTube",
  match: (hostname) => /(^|\.)youtube\.com$/.test(hostname),
  targets: [
    {
      // A video's watch page. The Section decides how far down the capture
      // goes: just the video and its description, or the comments too
      // (the first 15,000px).
      id: "related_highlights_default",
      label: "Related Highlights",
      startSelector: { no_comments: YT_PLAYER, with_comments_15k: YT_PRIMARY_INNER },
      endSelector: { no_comments: YT_DESCRIPTION, with_comments_15k: YT_COMMENT_THREADS },
      clickBeforeCapture: { no_comments: [YT_MORE], with_comments_15k: [YT_MORE, YT_REPLIES, YT_SHOW_MORE_REPLIES] },
      skipButtonClick: null,
      removeBeforeCapture: ["#masthead-container"],
      removeAfterCapture: [],
      padding: { top: 5, bottom: 5, left: 5, right: 5 },
      // The comments, so the 15,000px cut never lands inside one.
      itemsInclude: { no_comments: null, with_comments_15k: YT_COMMENT_THREADS },
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    },
    {
      // Same as Related Highlights, for the watch page of a Short.
      id: "shorts_watch",
      label: "Shorts (Watch)",
      startSelector: { no_comments: "div#movie_player", with_comments_15k: "div#primary-inner" },
      endSelector: { no_comments: "div#description:nth-of-type(1)", with_comments_15k: YT_COMMENT_THREADS },
      clickBeforeCapture: { no_comments: [YT_MORE], with_comments_15k: [YT_MORE, YT_REPLIES, YT_SHOW_MORE_REPLIES] },
      skipButtonClick: null,
      removeBeforeCapture: ["#masthead-container"],
      removeAfterCapture: [],
      padding: { top: 5, bottom: 5, left: 5, right: 5 },
      itemsInclude: { no_comments: null, with_comments_15k: YT_COMMENT_THREADS },
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    },
    {
      id: "youtube_tabs_default",
      label: "YouTube Tabs",
      startSelector: [
        "div[id='masthead-container']",
        "ytd-app[fix-ambient-cutoff]"
      ],
      endSelector: [
        "div[id='contents']>ytd-channel-owner-empty-state-renderer",
        "div[id='dismissible']",
        "ytd-browse[role='main']",
        "ytd-browse[role='main'] > ytd-two-column-browse-results-renderer > div > ytd-section-list-renderer",
        "ytd-app[fix-ambient-cutoff]"
      ],
      clickBeforeCapture: [],
      skipButtonClick: null,
      removeBeforeCapture: [
        // keepFirst: 2 = hide every match except the first two
        { selector: "ytd-guide-section-renderer.style-scope.ytd-guide-renderer", keepFirst: 2 },
        "#guide-links-primary",
        "#guide-links-secondary",
        "#copyright"
      ],
      // Hide the desktop and compact sidebars after the first shot.
      // The guide content can wrap the renderer, so match both directly.
      removeAfterCapture: [
        "#masthead-container",
        "#guide-inner-content",
        "ytd-guide-renderer",
        "ytd-mini-guide-renderer"
      ],
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      itemsInclude: "ytd-rich-item-renderer",
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    },
    {
      id: "youtube_music_default",
      label: "YouTube Music",
      startSelector: "[class='image style-scope ytmusic-fullbleed-thumbnail-renderer']",
      endSelector: "[class='style-scope ytmusic-section-list-renderer']",
      clickBeforeCapture: [],
      skipButtonClick: null,
      removeBeforeCapture: ["[class='center-content style-scope ytmusic-nav-bar']", "#right-content"],
      removeAfterCapture: ["[slot='nav-bar']", "#nav-bar-background", "#nav-bar-divider"],
      padding: { top: 0, bottom: 0, left: -73, right: 0 },
      itemsInclude: null,
      landingPageItems: null,
      photoSelect: null,
      panelSelector: null,
      unstickSelectors: null
    }
  ],
  verified: false
});
