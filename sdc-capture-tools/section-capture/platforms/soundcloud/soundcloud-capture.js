// soundcloud-capture.js
// HOW SoundCloud is captured. Which selectors are used is in
// soundcloud-selectors.js.
//
// Measure the banner and both profile columns after un-sticking the sidebar.
// Landing Page captures the full profile body currently loaded by SoundCloud.
registerCapture("soundcloud", {
  sections: {
    profile_default: Engine.SECTIONS.LANDING
  },

  landingCutAt: "regionEnd",

  run: async (ctx) => {
    // Include tracks that extend past the measured profile body.
    ctx.endIncludesItems = true;

    // An un-stuck sidebar can extend below the profile body's layout box.
    ctx.growPage = true;

    await Engine.removeBefore(ctx);
    await Engine.unstick(ctx);
    await Engine.hideStickyForContinue(ctx);
    const region = await Engine.measure(ctx);
    const slice = await Engine.chooseSlice(ctx, region);
    if (slice.nothingLeft) return slice;
    const shot = await Engine.screenshot(ctx, slice);
    if (shot.heightPx + 1 < slice.sliceEnd - slice.sliceStart) {
      throw new Error("SoundCloud stopped scrolling before the capture reached the bottom of the profile.");
    }
    return Engine.finish(ctx, slice, shot);
  }
});
