(() => {
  const keyword = document.getElementById("facebookKeyword");
  const startYear = document.getElementById("facebookStartYear");
  const endYear = document.getElementById("facebookEndYear");
  const searchAll = document.getElementById("facebookSearchAll");
  const searchRanged = document.getElementById("facebookSearchRanged");
  const copyPhoto = document.getElementById("facebookCopyPhoto");
  const openPhoto = document.getElementById("facebookOpenPhoto");
  const searchStatus = document.getElementById("facebookSearchStatus");
  const photoStatus = document.getElementById("facebookPhotoStatus");
  const currentYear = new Date().getFullYear();
  startYear.placeholder = "2016";
  endYear.placeholder = String(currentYear);

  const reservedPaths = new Set([
    "events", "friends", "gaming", "groups", "help", "home.php", "login",
    "marketplace", "messages", "notifications", "pages", "photo", "photo.php",
    "photos", "posts", "profile", "profile.php", "reel", "reels", "saved",
    "search", "settings", "share", "stories", "videos", "watch",
  ]);

  function facebookUrl(value) {
    try {
      const url = new URL(value);
      return /^https?:$/.test(url.protocol) && /(^|\.)facebook\.com$/i.test(url.hostname) ? url : null;
    } catch {
      return null;
    }
  }

  function profileIdentifier(url) {
    const [first, second] = url.pathname.split("/").filter(Boolean);
    if (first === "profile.php") {
      const id = url.searchParams.get("id");
      return /^\d+$/.test(id ?? "") ? id : null;
    }
    const identifier = first === "profile" ? second : first;
    return /^[\w.]+$/.test(identifier ?? "") && identifier !== "." && identifier !== ".."
      && !reservedPaths.has(identifier.toLowerCase()) ? identifier : null;
  }

  function yearFilter(year) {
    return btoa(JSON.stringify({
      "rp_creation_time:0": JSON.stringify({
        name: "creation_time",
        args: JSON.stringify({
          start_year: String(year),
          start_month: year + "-1",
          end_year: String(year),
          end_month: year + "-12",
          start_day: year + "-1-1",
          end_day: year + "-12-31",
        }),
      }),
    }));
  }

  function readYear(input, fallback) {
    if (!input.value.trim()) return fallback;
    if (!/^\d{4}$/.test(input.value.trim())) throw new Error("Enter a four-digit year.");
    return Math.max(2004, Math.min(Number(input.value), currentYear));
  }

  async function runSearch(ranged) {
    const tab = await activeTab();
    const url = facebookUrl(tab?.url);
    const profile = url && profileIdentifier(url);
    if (!profile) throw new Error("Open a Facebook profile first.");
    const query = keyword.value.trim();
    if (!query) throw new Error("Enter a keyword.");

    const results = new URL("https://www.facebook.com/profile/" + profile + "/search/");
    results.searchParams.set("q", query);
    if (!ranged) {
      await chrome.tabs.create({ url: results.href, active: false, windowId: tab.windowId });
      return "Search tab opened.";
    }

    const years = [readYear(startYear, 2016), readYear(endYear, currentYear)].sort((a, b) => a - b);
    const [first, last] = years;
    startYear.value = first;
    endYear.value = last;
    if (last - first > 25) throw new Error("Choose a range of up to 26 years.");

    let opened = 0;
    try {
      for (let year = last; year >= first; year--) {
        results.searchParams.set("filters", yearFilter(year));
        await chrome.tabs.create({
          url: results.href,
          active: false,
          windowId: tab.windowId,
          index: tab.index + 1 + opened,
        });
        opened++;
      }
    } catch (error) {
      if (!opened) throw error;
      throw new Error("Opened " + opened + " of " + (last - first + 1) + " search tabs.");
    }
    return opened === 1 ? "1 search tab opened." : opened + " search tabs opened.";
  }

  async function photoPostUrl() {
    const tab = await activeTab();
    const url = facebookUrl(tab?.url);
    if (!url) throw new Error("Open a Facebook photo, video, or reel first.");

    const parts = url.pathname.split("/").filter(Boolean);
    const mediaPath = parts.findIndex((part) => ["photo", "photos", "videos", "reel"].includes(part));
    const reelOrWatch = parts.includes("reel") || parts[0] === "watch" || url.hostname === "reels.facebook.com";
    const mediaId = url.searchParams.get("fbid") || url.searchParams.get("v")
      || (mediaPath >= 0 ? parts.at(-1) : "");
    if (!/^\d+$/.test(mediaId)) throw new Error("Open a Facebook photo, video, or reel first.");

    let owner = profileIdentifier(url);
    if (!owner) {
      const [{ result: links }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const selector = 'h2 a[role="link"], strong a[role="link"], a[attributionsrc*="profile"]';
          const dialog = document.querySelector('[role="dialog"]');
          return [...(dialog ?? document).querySelectorAll(selector)].map((link) => link.href);
        },
      });
      for (const link of links ?? []) {
        const ownerUrl = facebookUrl(link);
        owner = ownerUrl && profileIdentifier(ownerUrl);
        if (owner) break;
      }
    }
    if (!owner) throw new Error("Could not find the media owner.");

    const suffix = reelOrWatch ? "/?comment_id=1" : ":0";
    return "https://www.facebook.com/" + owner + "/posts/" + mediaId + suffix;
  }

  async function runAction(buttons, status, action) {
    buttons.forEach((button) => { button.disabled = true; });
    status.textContent = "Working…";
    status.classList.remove("error", "ok");
    try {
      status.textContent = await action();
      status.classList.add("ok");
    } catch (error) {
      status.textContent = error.message || "Could not complete the action.";
      status.classList.add("error");
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  searchAll.addEventListener("click", () => runAction([searchAll, searchRanged], searchStatus, () => runSearch(false)));
  searchRanged.addEventListener("click", () => runAction([searchAll, searchRanged], searchStatus, () => runSearch(true)));
  copyPhoto.addEventListener("click", () => runAction([copyPhoto, openPhoto], photoStatus, async () => {
    await navigator.clipboard.writeText(await photoPostUrl());
    return "Post URL copied.";
  }));
  openPhoto.addEventListener("click", () => runAction([copyPhoto, openPhoto], photoStatus, async () => {
    await chrome.tabs.create({ url: await photoPostUrl() });
    return "Post opened.";
  }));
})();
