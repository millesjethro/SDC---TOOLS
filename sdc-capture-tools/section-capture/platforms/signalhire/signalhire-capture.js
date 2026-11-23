// signalhire-capture.js
// HOW SignalHire is captured. Which selectors are used is in signalhire-selectors.js.
//
// Steps:
//   click "+" / "see more" buttons -> remove the chat widget -> measure ->
//   shoot. The profile is one screen of content, so nothing is scrolled
//   to load.
registerCapture("signalhire", {
  // Which Section choices each target offers (see SECTIONS in engine.js).
  // None listed = every target gets Engine.SECTIONS.BASIC.
  sections: {},

  run: async (ctx) => {
    await Engine.clickButtons(ctx);
    await Engine.removeBefore(ctx);
    await Engine.hideStickyForContinue(ctx);
    const region = await Engine.measure(ctx);

    const slice = await Engine.chooseSlice(ctx, region);
    if (slice.nothingLeft) return slice;
    const shot = await Engine.screenshot(ctx, slice);
    return Engine.finish(ctx, slice, shot);
  }
});
