// zoominfo-capture.js
// HOW ZoomInfo is captured. Which selectors are used is in
// zoominfo-selectors.js.
//
// Steps:
//   remove clutter -> measure -> pick the slice -> shoot.
// Nothing is scrolled to load: the whole profile is on the page already.

registerCapture("zoominfo", {
  // Which Section choices each target offers (see SECTIONS in engine.js).
  // None listed = every target gets Engine.SECTIONS.BASIC.
  sections: {},

  run: async (ctx) => {
    await Engine.removeBefore(ctx);
    await Engine.hideStickyForContinue(ctx);
    const region = await Engine.measure(ctx);
    const slice = await Engine.chooseSlice(ctx, region);
    if (slice.nothingLeft) return slice;
    const shot = await Engine.screenshot(ctx, slice);
    return Engine.finish(ctx, slice, shot);
  }
});
