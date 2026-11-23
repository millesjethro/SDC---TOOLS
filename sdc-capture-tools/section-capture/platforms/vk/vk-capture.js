// vk-capture.js
// HOW VK is captured. Which selectors are used is in vk-selectors.js.
//
// Steps:
//   remove clutter -> un-stick the side column (Profile) -> measure -> (scroll to load more, when needed) ->
//   pick the slice -> shoot.
//   Profile scrolls to load the wall's posts. Related Highlights only
//   scrolls to load more when the "Comments" Section is chosen.

// Related Highlights: which part of the post layer to capture.
const VK_POST_SECTIONS = [
  { id: "no_comments", label: "No Comments" },
  { id: "comments", label: "Comments" }
];

registerCapture("vk", {
  // Which Section choices each target offers (see SECTIONS in engine.js).
  // A target that isn't listed gets Engine.SECTIONS.BASIC.
  sections: {
    profile_socmed: Engine.SECTIONS.FEED,
    related_highlights_rh: VK_POST_SECTIONS
  },

  run: async (ctx) => {
    const loadsMore = ctx.target.id === "profile_socmed" || ctx.section === "comments";

    await Engine.removeBefore(ctx);
    await Engine.unstick(ctx);
    await Engine.hideStickyForContinue(ctx);
    let region = await Engine.measure(ctx);
    if (loadsMore) region = await Engine.loadAll(ctx, region);
    const slice = await Engine.chooseSlice(ctx, region);
    if (slice.nothingLeft) return slice;
    const shot = await Engine.screenshot(ctx, slice);
    return Engine.finish(ctx, slice, shot);
  }
});
