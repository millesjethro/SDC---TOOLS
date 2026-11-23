// youtube-capture.js
// HOW YouTube is captured. Which selectors are used is in youtube-selectors.js.
//
// Steps:
//   Related Highlights and Shorts (Watch), No Comments: press "more" ->
//   remove clutter -> measure -> shoot.
//   Related Highlights and Shorts (Watch), With Comments: remove clutter ->
//   measure -> scroll to load the comments (pressing "more", "n replies" and
//   last "Show more replies" on the way) -> shoot the first 15,000px, ending between two comments.
//   YouTube Tabs / Music: remove clutter -> measure -> scroll to load every
//   video -> shoot.

// Related Highlights and Shorts (Watch): which part of the watch page.
const YOUTUBE_WATCH_SECTIONS = [
  { id: "with_comments_15k", label: "With Comments" },
  { id: "no_comments", label: "No Comments" }
];

// Which targets scroll the page first to load everything.
// (The watch pages do it only for "With Comments", see run below.)
const YOUTUBE_LOADS_EVERYTHING = {
  related_highlights_default: false,
  shorts_watch: false,
  youtube_tabs_default: true,
  youtube_music_default: true
};

registerCapture("youtube", {
  // Which Section choices each target offers (see SECTIONS in engine.js).
  // A target that isn't listed gets Engine.SECTIONS.BASIC.
  sections: {
    related_highlights_default: YOUTUBE_WATCH_SECTIONS,
    shorts_watch: YOUTUBE_WATCH_SECTIONS
  },

  run: async (ctx) => {
    const loadsEverything = YOUTUBE_LOADS_EVERYTHING[ctx.target.id] || ctx.section === "with_comments_15k";
    // (when loading, loadAll does the clicking instead)
    if (!loadsEverything) await Engine.clickButtons(ctx);
    await Engine.removeBefore(ctx);
    await Engine.hideStickyForContinue(ctx);
    let region = await Engine.measure(ctx);
    if (loadsEverything) region = await Engine.loadAll(ctx, region);
    const slice = await Engine.chooseSlice(ctx, region);
    if (slice.nothingLeft) return slice;
    const shot = await Engine.screenshot(ctx, slice);
    return Engine.finish(ctx, slice, shot);
  }
});
