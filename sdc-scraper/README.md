# SDC - SCRAPER

A Chrome extension (Manifest V3) that detects tables or repeated list items on
the current page and lets you export them to Excel (.xlsx) or your clipboard.

## Install (unpacked, for testing)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Pin the extension, then open a webpage with a table or list and click the
   icon. After navigating to a different site, click the toolbar icon again
   to grant access to that page.

The extension opens as its own small floating window (not the usual anchored
dropdown) bound to the specific tab you opened it from — so it stays open
while you click, scroll, or interact with the page underneath, and you can
open separate panels for different tabs (even across different monitors) at
the same time. Clicking the toolbar icon again from the same tab just
refocuses that tab's existing panel instead of opening a duplicate.

## Using it

- **Target icon** (in the field) — the only way to scan now (the old SCAN
  button was removed since it duplicated this). Click it, then click any
  item on the page — the extension scrapes its sibling group. Press Esc or
  click the target icon again to cancel.
  The panel stays open and updates live once you make a selection.
- **BACK / NEXT** — clicking an item can match more than one plausible
  "row level" around it (e.g. a tight wrapper vs. its parent row). These
  cycle through every match found near your click, ranked by how many
  matching siblings each level has, with a "Match X of Y" label. This is
  especially useful for short lists (fewer than ~10 items) that sit close
  to other repeated elements on the page — if the first match isn't the
  list you meant, step through with NEXT until it is.
- **Auto-Scroll toggle** (top right, red = off / green = on) — when on, a
  click first scrolls the page (or an inner scrollable panel, like a
  followers/following modal) repeatedly until no new content loads for a
  few rounds in a row, capped at ~25 seconds, before scraping. Remembered
  across pages. Note: some sites *virtualize* long lists — older rows get
  removed from the page as new ones load in — so auto-scroll can't recover
  rows that already scrolled out and got unmounted; it helps most on sites
  that simply append new items as you scroll.
- **Column headers** — click a header to rename it, or click the **×** next
  to it to delete that column (and its data) from the results.
- **Filter dropdown** — "All columns" shows the raw scrape as-is. Choosing
  Facebook, Instagram, Threads, Twitter, or TikTok collapses the result down
  to just **Name** and **Username**, using platform-specific rules:
  - **Facebook**: Name is the first column; Username is parsed out of the
    row's link (strips `https://www.facebook.com/` and, for numeric
    profiles, `profile.php?id=`).
  - **Instagram**: first column is treated as Username, second as Name. If
    Name came out as "Follow", "Following", or "Requested" (a follow-button
    label that leaked into that slot), Name is replaced with the Username.
  - **Threads**: same as Instagram (Username first, Name second), without
    the follow-button substitution.
  - **Twitter**: Name is the first column, Username the second, with any
    leading `@` stripped.
  - **TikTok**: Name is the first column, Username the second, as scraped.
  Switching the filter re-derives from the currently selected candidate, so
  it's safe to flip between platforms without losing data — though any
  header renames made while filtered are specific to that filtered view.
- **Sort button** (next to the filter dropdown) — sorts rows by the "Name"
  column A→Z; click again for Z→A. Falls back to the first column if there's
  no column named "Name" (e.g. in "All columns" mode). The sort re-applies
  automatically after a new pick, BACK/NEXT, or a filter change.
- **Search box** (above the results) — filters the visible rows by any
  column's text as you type. It doesn't touch the underlying data — header
  renames/deletes still apply to everything, and clearing the search box
  brings the rest back. COPY and EXCEL export whatever's currently visible,
  so searching narrows what you copy/export too.
- **+ Add to Workbook** — saves the current (search-filtered) results as a
  named sheet, so you can scrape a second list — e.g. scan Followers, add it
  as a sheet, then navigate to Following on the same page, scan that, and
  add it too — and export both together. Sheets queued this way show as
  chips (with a count and a **×** to remove); the EXCEL button's label shows
  how many are queued, e.g. `EXCEL (2)`. Queued sheets persist even if you
  navigate the tab to a different page/URL, so switching between a
  Followers and Following tab won't lose them — CLEAR only clears the
  current on-screen result, not the queued workbook.
- **CLEAR** — clears the current results (and search) for this page. Queued
  workbook sheets are untouched — remove those individually via their chip.
- **COPY** — copies both a plain tab-separated version and a formatted HTML
  version of the currently visible (search-filtered) rows to the clipboard,
  so pasting into Excel/Sheets brings the formatting with it. Both use a
  bold, colon-suffixed header (e.g. `Name:`) and no borders/table shading —
  just the header and the data.
- **EXCEL** — with no sheets queued, downloads a genuine `scraped-data.xlsx`
  of the currently visible rows (built directly as a minimal, valid
  OOXML/ZIP package — no external libraries). With sheets queued via
  **+ Add to Workbook**, it instead downloads all of them together as one
  file with one tab per sheet. Same plain style either way: bold headers
  with a trailing colon, no cell borders or shading.

The results panel scrolls internally once there are more rows than fit on
screen, so CLEAR/COPY/EXCEL stay put at the bottom instead of you having to
scroll past a long table to reach them.

## Files

- `manifest.json` — extension configuration
- `background.js` — opens/focuses the floating panel window when the toolbar
  icon is clicked
- `popup.html` / `popup.css` / `popup.js` — the panel UI and its logic
- `content.js` — injected into the page; contains the detection and
  element-picker logic
- `icons/` — toolbar icons
