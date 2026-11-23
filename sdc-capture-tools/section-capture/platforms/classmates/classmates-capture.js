// classmates-capture.js
// HOW Classmates is captured. Which selectors are used is in
// classmates-selectors.js.
//
// Steps:
//   remove clutter -> measure -> scroll to load everything (pressing
//   "Expand for more" on the way) -> pick the slice -> shoot.

registerCapture("classmates", {
  // Which Section choices each target offers (see SECTIONS in engine.js).
  // None listed = every target gets Engine.SECTIONS.BASIC.
  sections: {},

  run: async (ctx) => {
    await Engine.removeBefore(ctx);
    await Engine.hideStickyForContinue(ctx);
    let region = await Engine.measure(ctx);
    // Loading everything also presses "Expand for more" after every scroll,
    // so buttons that only appear later get pressed too.
    region = await Engine.loadAll(ctx, region);
    const slice = await Engine.chooseSlice(ctx, region);
    if (slice.nothingLeft) return slice;
    const shot = await Engine.screenshot(ctx, slice);
    return Engine.finish(ctx, slice, shot);
  }
});
