// threads-capture.js
// HOW Threads is captured. Which selectors are used is in threads-selectors.js.
//
// Steps:
//   remove clutter -> keep one photo (if asked) -> measure -> (scroll to
//   load more, when needed) -> pick the slice -> shoot.
//   Profile scrolls to load the posts (clicking "Translate" on the way);
//   its Sections are Landing Page (the first 3 posts), Full-Capture (about
//   15,000px, ending at a post) and Continue (the next 15,000px, starting
//   after the last post of the previous one).
//   Related Highlights only scrolls to load the comments when the
//   "With Comments" Section is chosen.

// Related Highlights: which part of the post's page to capture.
const THREADS_POST_SECTIONS = [
  { id: "no_comments", label: "No Comments" },
  { id: "comments", label: "With Comments" }
];

registerCapture("threads", {
  // Landing Page captures the first 3 posts (see "landingItems" in engine.js).
  landingItems: 3,

  // Which Section choices each target offers (see SECTIONS in engine.js).
  // A target that isn't listed gets Engine.SECTIONS.BASIC.
  sections: {
    profile_socmed: Engine.SECTIONS.LANDING,
    related_highlights_rh: THREADS_POST_SECTIONS
  },

  run: async (ctx) => {
    const loadsMore = ctx.target.id === "profile_socmed" || ctx.section === "comments";

    await Engine.removeBefore(ctx);
    await Engine.keepOnePhoto(ctx);
    await Engine.hideStickyForContinue(ctx);
    let region = await Engine.measure(ctx);
    // Posts and comments load as you scroll, so load them first.
    if (loadsMore) region = await Engine.loadAll(ctx, region, { maxScrolls: 40, waitMs: 1500 });
    const slice = await Engine.chooseSlice(ctx, region);
    if (slice.nothingLeft) return slice;
    const shot = await Engine.screenshot(ctx, slice);
    return Engine.finish(ctx, slice, shot);
  }
});
