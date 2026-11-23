// google-capture.js
// HOW Google is captured. Which selectors are used is in google-selectors.js.
//
// Steps:
//   Single Review: remove clutter -> measure -> shoot.
//   Google (Home): remove clutter -> measure -> scroll the reviews panel to
//   load everything (clicking "See more" on the way) -> pick the slice ->
//   shoot. Full-Capture takes the first 15,000px and moves the cut up to the
//   top of an item if it would land in the middle of one; Continue picks up
//   from there.
// Which targets scroll the page first to load everything.
const GOOGLE_LOADS_EVERYTHING = {
  single_review_default: false,
  reviews_default: true
};

registerCapture("google", {
  // Which Section choices each target offers (see SECTIONS in engine.js).
  // Google (Home) gets LANDING: "Landing Page" (selected by default: the
  // first screen, plus the rest of the item cut off at its bottom; if none
  // was cut, just the first screen), Full-Capture and Continue.
  // A target that isn't listed gets Engine.SECTIONS.BASIC.
  sections: {
    reviews_default: Engine.SECTIONS.LANDING
  },

  // How many items the "Landing Page" Section captures. null = the first
  // screen plus the item cut off at its bottom. Set a number (e.g. 3) to
  // capture that many items instead.
  landingItems: null,

  run: async (ctx) => {
    if (ctx.target.id === "reviews_default") {
      // Touch-ups for the side panel (explained in engine.js, under "tweaks"):
      ctx.tweaks = {
        // Its rounded corners would show as notches between the pieces:
        // first piece loses only the bottom-left, the rest lose them all.
        panelStyles: {
          first: { "border-bottom-left-radius": "0px" },
          rest: { "border-radius": "0px" }
        },
        // A divider line is drawn at the top of the list once it's scrolled;
        // skip it (2-3px is enough, 3 here) at the top of every later piece.
        trimTopPx: 3,
        // The map is only needed once, in the first piece.
        panelOnlyAfterFirst: true
      };
    }

    const loadsEverything = GOOGLE_LOADS_EVERYTHING[ctx.target.id];
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
