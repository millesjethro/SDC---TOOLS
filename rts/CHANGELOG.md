# RTS changelog
Versioning: 1.0.1 → 1.0.5, then 1.1.0 → 1.1.5, then 1.2.0 → 1.2.5 ...

## 1.7.0
- BULK checks screenshot URLs on Networks only when Related Highlights on Timeline is enabled.
- Labeled STD “Landing Page Only” and added a Related Highlights on Timeline toggle for the STD and Non-Bulk screenshot rules.
- Skips no-match summaries that point to the search query or queries below.
- Recognizes semantic and semibold “Identified” formatting when skipping the hyperlink check.
- Added the STD, BULK, and STD (Non-Bulk) screenshot rules.
- Accepts “No match found.” with or without its final period.
- Removed the floating badge and clarified the Possible Callout heading.

## 1.6.5
- Skip the hyperlink check when “Identified” is bold.

## 1.6.4
- Updated profile summary, image, and screenshot checks for each match result.
- Accepts a hyperlink on any of the first three words after “identified”.
- Restored popup toggles and condensed Possible Callouts to a single row with hover details.

## 1.6.3
- Simplified the popup to three report modes and added missing-count dots to the metadata and URL row controls.
- The “same” rule accepts parentheses after up to three words.

## 1.6.2
- Browse three missing rows or possible callouts at a time. Arrow clicks browse the list, and clicking an item jumps to it.

## 1.6.1
- Placed the RTS status panel in its own section immediately above Callout Summary.

## 1.6.0
- Added a report panel for possible callouts. Metadata and URL findings are omitted from the panel.
- Added row navigation beside the missing metadata and URL counters. Missing metadata no longer inherits a finding outline.

## 1.5.6
- Stacked the upload counters and put the report builder’s sort order below them.

## 1.5.5
- Renamed the extension to SDC - RTS.
- Upload totals use rounded glass counters, and the metadata counter shows how many files are missing when there are fewer metadata files than screenshots.

## 1.5.4
- The Screenshots section now shows metadata and URL totals below the upload counts.

## 1.5.3
- The (BA) check now looks for “Identified Business Page” in the profile summary.
- Findings use severity-colored outlines. Screenshot section callouts outline the first direct div inside #screenshots.
- The popup has two-line mode choices and an Ignore rules tab for words after “same”.

## 1.5.2
- (BA) / Business Page now works both ways. Header has (BA) but the summary has no "Business Page": the first word of the summary is red (as before). The other way around, the summary has "Business Page" but the header has no (BA): the header is marked red with "Tag this as business (BA)". Empty and "No match found." summaries are skipped

## 1.5.1
- Fix: Google network, link name vs URL (domain / subdomain / both): a number in brackets at the end of the link name, "(2)", "(3)", "(4)" ... "(n)", is ignored, so "Sunbiz (2)" is checked as "Sunbiz"

## 1.5.0
- New: Networks pages: if the network header (div#webformSection > div > div > h2) has "(BA)" but the profile summary has no "Business Page", the first word of the summary is marked red ("Header says (BA) but the summary has no "Business Page""). Hover hint: Missing "Business Page"

## 1.4.9
- Google network, profile summary: every source link (the same ones that need an image) must also be "named after" its URL: the link text has to be the domain, the subdomain, or subdomain + domain (e.g. [Truepeoplesearch](www.truepeoplesearch.com) or [Lifestyle Example](lifestyle.example.com)). Otherwise it is marked orange ("Link text does not match its URL"). Uses the existing Google switch in the popup
- Screenshots (all networks): an image name that is the same as another image's name is marked yellow ("Same image name as another image"); only the name (td > a > div > span) is marked
- Screenshots: a missing metadata.txt now marks only that part of the row (the second div in the cell) instead of the whole cell
- New popup switch "Hover hints" (off by default): when on, hovering a marked item shows a short message such as "Missing Screenshot", "Missing Metadata" or "Missing Subdomain (www.)"

## 1.4.8
- New: a summary sentence that starts with "Identified on public [Socmed]" lists what was found in plural, up to the first period, e.g. "Identified on public Facebook photos and videos." or "... Facebook pages.". The numbered links below it ("Photo 1", "Photo 2" ... "Video 1", "Video 2" ... up to 20 each; any plural word works, e.g. "Page 1") must each have a unique URL. If two or more of the checked links go to the same URL, all of those links are marked orange ("Same URL used by more than one numbered link") and the detail lists which ones. Only the plural words are checked; a singular sentence ("... Facebook photo.") is not. Works on Networks pages and on Report summaries

## 1.4.7
- New: in every summary (profile summary, report highlights and other rich-text blocks) any text in an orange coloured span is marked yellow ("Orange text"). Orange is found by its colour, so any orange shade counts; red, yellow and the other colours do not. Works on Networks pages and on Report summaries

## 1.4.6
- Mode "Standard / Bulk (No RH on Timeline)", Networks pages: any URL found in the screenshots table (a link or plain text) is now marked red ("URL is not allowed here (No RH on Timeline)"). Screenshot, metadata.txt and other file links are not counted as URLs. The "No Url" text is still not marked in this mode

## 1.4.5
- New feature, Networks / #profile_summary: when "same" starts an item (at the start of a sentence, after a comma, or after "and"), the word after it must be followed by a (parenthesis) with text inside. Example: "same interest (hiking), same sports (tennis) and same location (Manila)". If the "(…)" is missing, the word after "same" is marked red (Missing same (word)). "at the same time" and "same as" are ignored, and so are "same photo", "same posts", "same video" and "same profile photo"

## 1.4.4
- New: a short "How to use" guide inside the popup (steps, what RTS checks, and how the floating badge works), written in simple words. It is collapsed by default

## 1.4.3
- Fix: the unfilled {Placeholder} check (text in a coloured span, e.g. {Identifiers}) now also runs on the Report summaries page, so it covers Report highlights as well as every network page

## 1.4.2
- New feature: the floating RTS badge can be hidden on the right side of the browser. Click it (the small › at its end) and it shrinks to a small circle on the right edge. The circle shows the total number of issues and is coloured by the highest severity found (red, then orange, then yellow; green when there are none). Click the circle to bring the full badge back. The badge (and the circle) can also be dragged up or down and onto the left or right side: let go and it snaps to the nearest side. A short click still hides / shows it. The side, height and hidden/shown choice are remembered between pages and reloads

## 1.4.1
- Fix: "Possible match found": #profile_image is marked red only when an image is actually uploaded in it. No image, "No image uploaded", an empty box, or the card's other text (title, buttons) is never marked any more

## 1.4.0
- New feature, Networks / #profile_summary: the phrase "the identified [any word]" and its numbered forms "the 1st identified [any word]", "the 2nd ...", "the 3rd ...", "the 4th ..." (and so on, also spelled out: "the first identified ...") are found now. The [any word] must be hyperlinked; a plain-text word is marked orange ("Word after "identified" is not hyperlinked")
- The phrase no longer needs "on" / "to" in front of it, and the old exception for "account" / "profile" / "page" is gone (any word counts); punctuation stuck to the word (e.g. "Instagram.") is not highlighted

## 1.3.12
- Networks / #profile_summary: the social media name after "on the identified" (also "to the identified", e.g. "linked to the identified LinkedIn account") must be hyperlinked; a plain-text name is marked orange ("Social media name is not hyperlinked")

## 1.3.11
- "No screenshot row (at least one is required)": only the "Screenshot(s)" title/word is marked now, not the whole #screenshots panel (title inside the panel, else one level up, else the bare word; the panel itself only if no title or word exists)

## 1.3.10
- Each mode now lives in its own file: modes/default.js, bulk_no_rh.js, bulk_rh.js, standard.js (flags and per-mode check switches; the popup list is built from the same files)
- The image-name <-> hyperlinked-text check (profile summary words vs uploaded image names) now runs only on the Google network page (<div id="webformSection"> with <h2 class="mb-0">Google</h2>), not on other networks
- New switch under Mode in the popup: "Google: match image name with hyperlinked text" (on by default). A mode file can also switch it off with checks: { googleImage: false }

## 1.3.9
- Date-named .mp4 rule: ordinals from (2) upwards are accepted, e.g. "2025-10-29 (2).mp4", "October 29, 2025 (3).mp4". "(1)" / "(0)" are not

## 1.3.8
- /report_summaries: the selected mode is ignored (this page always works like Default) and nothing depends on match results. The date-named .mp4 rule now applies there too: a file that is neither an image nor metadata (e.g. 2025-10.mp4) must be "yyyy-mm-dd" or "MMMM DD, yyyy" + .mp4, otherwise red

## 1.3.7
- Fix: Standard (No Timeline or RH) now scans uploaded screenshots (URL, metadata, image, date-named .mp4) also when #match_results says "No match found" (it was skipped in that state)
- Popup shows what was detected: "Screenshots found: N rows · M other files"

## 1.3.6
- Standard (No Timeline or RH): uploaded files shown as links inside a screenshot row (e.g. <a href=".../active_storage/blobs/.../2025-10.mp4">2025-10.mp4</a>) are now found and their name is checked (yyyy-mm-dd or MMMM DD, yyyy + .mp4). The row's image, URL and metadata are still scanned as usual

## 1.3.5
- Standard (No Timeline or RH): #screenshots is no longer skipped. Nothing is required (no "at least one row" rule, no "uploaded although no match" rule); if something was uploaded only URL, metadata and image are scanned
- This applies to the Networks page; on other pages Standard still does no screenshot checking
- In that mode any other file (neither an image nor metadata) is only checked for its name: it must be "yyyy-mm-dd" or "MMMM DD, yyyy" with the extension .mp4, otherwise red. No URL / metadata / image scan on those rows

## 1.3.4
- Summary source links: ALL stand-alone links of a "Match found" group are scanned now (many results per match), not only the first one. The first link still needs an image with its own name; the other results are also fine when an image named "Google" (Google Results) is uploaded. Anything else gets "No named image was uploaded yet."

## 1.3.3
- Rules are now per page (the numbers in the address don't matter): /profile_information, /report_summaries, /networks/<id>. Other pages: no checks yet. The popup shows which page was recognised
- /profile_information: #profile_image, #map_view and #street_view must each contain an image (none -> "No image uploaded", orange); relatives as before
- /report_summaries: #report_highlights regular formatting only; #attachments is never touched; #screenshots as usual
- /networks/<id>: #match_results is read first (Match found / Possible match found / No match found) and decides:
  - Match found: no image in #profile_image -> orange; "No profile link" red unless #profile_summary says "No personal match found"; summary exactly "No match found." red; #screenshots needs at least one row (else red) + the usual checks
  - Possible match found: #profile_image may only be "No image uploaded", anything else red; the rest as Match found
  - No match found: #profile_image and #profile_link not marked; summary with other content gets the usual checks; #screenshots marked red if anything is uploaded
- Fourth mode: Standard (No Timeline or RH) = no checking at all on #screenshots. Standard / Bulk (No RH on Timeline) = no URL checks on the screenshots of Networks pages; (With RH) = all of Default
- Summary "No match found." is flagged only when the summary is exactly that

## 1.3.2
- Possible Match found: #profile_image is only marked (orange) when it contains an <img> with a src (or is such an <img>); an empty #profile_image is ignored

## 1.3.1
- New: the URL shown in #profile_link that is also a hyperlink inside #profile_summary is highlighted orange
- New: in the screenshots area, a URL that appears more than once (links or plain text, same or different rows) is highlighted orange. Part of the table URL checks, so it is off in Standard/Bulk (No RH on timeline) on /networks/ pages
- Fix: #relatives is never marked when no relatives were added (only real entries are checked; the title row and "No relatives" messages are ignored)
- New: when #match_results says "Possible Match found", an element with id="profile_image" is highlighted orange

## 1.3.0
- Source-link / image check rebuilt around the real summary layout: the first stand-alone link after each "Match found..." line (e.g. Truepeoplesearch, Google, Signalhire) must be the exact name of an uploaded image; if not, the word is highlighted orange with "No named image was uploaded yet."
- Links inside prose (e.g. "as seen on Truepeoplesearch", LinkedIn) and extra stand-alone links in the same group (e.g. Rocketreach) are not checked

## 1.2.5
- Standard/Bulk (No RH on timeline) on a /networks/ page: only the screenshots-table URL functions are off ("No Url" + no-subdomain check on table links). The no-subdomain check on #profile_link keeps running

## 1.2.4
- Standard/Bulk (No RH on timeline) on a page whose address contains /networks/ now switches off ALL URL functions: the "No Url" highlight in the screenshots table as well as the no-subdomain URL check. Other checks (metadata.txt, file names, formatting ...) keep running

## 1.2.3
- Fix: "/networks/" in Standard/Bulk (No RH on timeline) refers to the address of the website page itself. On a page whose address contains /networks/ the URL check is switched off; URLs shown inside the page are checked normally

## 1.2.2
- The per-check checkboxes are replaced by three modes: Default (every check), Standard/Bulk (No RH on timeline) (no URL check on URLs containing "/networks/"), Standard/Bulk (With RH timeline) (URL checks are back)
- Formatting checks next to double space: doubled punctuation (".." ",," "!!" "??" ...; "..." is allowed) and spaces just after an opening bracket/quote or just before a closing one

## 1.2.1
- New check: unfilled {Placeholders} (e.g. {Identifiers}) that sit inside a <span style="color: rgb(...)"> are highlighted orange, in the summary, report highlights and other rich-text blocks

## 1.2.0
- Removed the spelling-errors check: the site's own spell-check markers (span.rich-text-spellcheck-error) are ignored again

## 1.1.5
- Fix: #profile_summary / #profile_link / #report_highlights ids sit on the whole card (title, help text, buttons). Only the div.rich-text body is read and scanned now, so the "No match found" default state is detected correctly (this was why "No match found." and "No profile link" kept being flagged) and tooltip/help text no longer gets scanned
- New check: spelling errors - anything the site marks with a spellcheck-error class (e.g. span.rich-text-spellcheck-error) is highlighted yellow, in the summary, report highlights and other text blocks

## 1.1.4
- Google check only highlights the word in #profile_summary (never the image name): the closest-looking hyperlinked word, or the link that points at Google. If the summary has no such word, nothing is highlighted

## 1.1.3
- "No profile link" is now ignored whenever #match_results OR #profile_summary says "No match found" (was: only when both did)
- Google check now follows the real markup (<h2 class="mb-0">Google</h2> in a header div): it reads the images that sit under that heading, up to the next section heading, and the file name shown beside them
- "No match found." in #profile_summary is only flagged red when #match_results exists and shows a match (nothing to disagree with if it's missing)
- Summary links that match another section's image name are no longer treated as typos of a Google name

## 1.1.2
- Popup: tick/untick which checks run (screenshot table, URL subdomains, profile link, profile summary, double spaces, relatives, Google image names)
- Default state (match results + profile summary both "No match found") now also skips "No profile link"
- Double spaces are found across <span>, <a>, <b> and <div> boundaries, not only inside one piece of text
- New: #relatives - a name without a link, or a link without a name (orange)
- New: .mb-0 "Google" rows - the image name must be present as a hyperlinked word in #profile_summary; a near-miss word is highlighted (orange)

## 1.1.1
- Fix: "No match found." in #profile_summary is no longer flagged when #match_results also says no match. Detection now ignores spacing, punctuation, case and hidden characters, and reads #match_results even if it sits inside the excluded form

## 1.1.0
- Default state: when #match_results and #profile_summary both say "No match found", nothing is flagged there (no red, no double-space scan, report highlights skipped)
- When #profile_summary is anything else, double spaces are checked again

## 1.0.5
- The feedback/mistake region (`.feedback-form`) is no longer scanned or highlighted

## 1.0.4
- Clicking a finding scrolls to it (centered), opens collapsed sections/tabs that hide it, and flashes a blue outline so it's easy to spot
- Popup tells you if the item can't be found or is hidden

## 1.0.3
- .jpeg accepted as a valid screenshot file name
- Green (fine) items are no longer highlighted or listed

## 1.0.2
- Popup legend colours are now dropdowns listing each finding: table row number (or page section), what to fix, and a text snippet
- Click a finding to scroll to it on the page and flash it

## 1.0.1
- Renamed to RTS, new icon and popup GUI, in-page counter badge
- Severity colours: red = high, orange = mid, yellow = low, green = fine
- New: double-space check (#profile_summary, #report_highlights), bare-domain URL check, screenshot file-name check
- Removed: #match_results highlighting
