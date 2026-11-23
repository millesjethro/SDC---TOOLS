// pinterest-capture.js
// HOW Pinterest is captured. Which selectors are used is in pinterest-selectors.js.
//
// Steps:
//   remove clutter -> measure -> scroll to load every board -> shoot.
registerCapture("pinterest", {
  // Which Section choices each target offers (see SECTIONS in engine.js).
  // None listed = every target gets Engine.SECTIONS.BASIC.
  sections: {},

  run: async (ctx) => {
    await Engine.removeBefore(ctx);
    await Engine.hideStickyForContinue(ctx);
    let region = await Engine.measure(ctx);
    // Boards load as you scroll, so load them first.
    region = await Engine.loadAll(ctx, region);
    const slice = await Engine.chooseSlice(ctx, region);
    if (slice.nothingLeft) return slice;
    const shot = await Engine.screenshot(ctx, slice);
    return Engine.finish(ctx, slice, shot);
  }
});
