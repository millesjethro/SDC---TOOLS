// linkedin-capture.js
// HOW LinkedIn is captured. Which selectors are used is in linkedin-selectors.js.
//
// Steps:
//   Profile: click "...more" (skipping carousels) -> remove clutter ->
//   measure -> shoot.
//   Sections: remove clutter -> measure -> scroll to load everything
//   (clicking "...more" on the way) -> shoot.
// Which targets scroll the page first to load everything.
const LINKEDIN_LOADS_EVERYTHING = {
  Profile_default: false,
  section_tab_default: true
};

registerCapture("linkedin", {
  // Which Section choices each target offers (see SECTIONS in engine.js).
  // None listed = every target gets Engine.SECTIONS.BASIC.
  sections: {},

  run: async (ctx) => {
    const loadsEverything = LINKEDIN_LOADS_EVERYTHING[ctx.target.id];
    // (when loading everything, loadAll does the clicking instead)
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
