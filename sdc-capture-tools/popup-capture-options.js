const profile = {
  id: "profile", label: "Profile", types: [
    {id: "profileFirst", label: "Timeline: First"},
    {id: "profile", label: "Timeline: Continue"},
    {id: "profileLanding", label: "Timeline: Landing"}
  ]
};

const postTypes = [
  {id: "post", label: "Post"},
  {id: "postComments", label: "Post + Comments"}
];

const postHighlights = {id: "highlights", label: "Related Highlights", types: postTypes};
const storyHighlights = {
  ...postHighlights,
  types: [...postTypes, {id: "story", label: "Story"}]
};
const pageTypes = [
  {id: "pageFirst", label: "Page: First"},
  {id: "pageContinue", label: "Page: Continue"}
];
const otherPages = {id: "others", label: "Others", types: pageTypes};

export const screenshooterSections = {
  facebook: [{
    ...profile,
    types: [...profile.types, {id: "profileInfo", label: "Profile Information"}]
  }, storyHighlights, {
    ...otherPages,
    types: [
      ...pageTypes,
      {id: "marketplaceFirst", label: "Marketplace: First"},
      {id: "marketplace", label: "Marketplace: Continue"}
    ]
  }],
  instagram: [profile, storyHighlights, otherPages],
  tiktok: [profile, postHighlights, otherPages],
  x: [profile, postHighlights, otherPages]
};

function captureType(id, label, targetId, mode) {
  return {id, label, targetId, mode};
}

export const sectionCaptureOptions = {
  youtube: [
    {id: "profile", label: "Profile", types: [
      captureType("youtube-first", "YouTube: First", "youtube_tabs_default", "15k"),
      captureType("youtube-continue", "YouTube: Continue", "youtube_tabs_default", "continue"),
      captureType("music-first", "YouTube Music: First", "youtube_music_default", "15k"),
      captureType("music-continue", "YouTube Music: Continue", "youtube_music_default", "continue")
    ]},
    {id: "highlights", label: "Related Highlights", types: [
      captureType("video", "Videos: w/out Comments", "related_highlights_default", "no_comments"),
      captureType("video-comments", "Videos: with Comments", "related_highlights_default", "with_comments_15k"),
      captureType("shorts", "Shorts: w/out Comments", "shorts_watch", "no_comments"),
      captureType("shorts-comments", "Shorts: with Comments", "shorts_watch", "with_comments_15k")
    ]}
  ],
  threads: [
    {id: "profile", label: "Profile", types: [
      captureType("landing", "Timeline: Landing", "profile_socmed", "landing_screen"),
      captureType("first", "Timeline: First", "profile_socmed", "15k"),
      captureType("continue", "Timeline: Continue", "profile_socmed", "continue")
    ]},
    {id: "highlights", label: "Related Highlights", types: [
      captureType("post", "Post: w/out Comments", "related_highlights_rh", "no_comments"),
      captureType("post-comments", "Post: with Comments", "related_highlights_rh", "comments")
    ]}
  ]
};
