(() => {
  // ================= Config =================
  const CFG = {
    TABLE_SEL: '#screenshots table, div[screenshots] > table',
    FILE_OK: /\.(jpe?g|png)$/i,
    EXCLUDE: '.feedback-form, #attachments',   // regions that are never scanned (the "mistake" form; attachments: nothing to do)
    IGNORE_WWW: false,              // true => "www.site.com" is treated as having NO subdomain
    IMAGE_HINT_SIMILARITY: 0.6,     // how alike an uploaded image name must be to be offered as "closest image"
  };
  // Severity per rule: red = high, orange = mid, yellow = low
  const SEV = {
    noUrl: 'red', noMetadata: 'red', badFileName: 'red',
    noProfileLink: 'red', noMatchSummary: 'red', bareDomain: 'red',
    formatting: 'yellow',
    relatives: 'orange', googleName: 'orange', placeholder: 'orange',
    duplicateUrl: 'orange', linkInSummary: 'orange',
    noImage: 'orange', possibleImage: 'red', screenshotRows: 'red', otherFile: 'red', socmedLink: 'orange', missingSame: 'red', forbiddenUrl: 'red', orangeText: 'yellow', mediaDup: 'orange', dupImageName: 'yellow', urlName: 'orange', businessPage: 'red',
  };
  // Modes live in their own files (modes/<name>.js, loaded before this file); each one registers itself in RTS_MODES.
  const MODES = globalThis.RTS_MODES || {};
  const FALLBACK_MODE = { checks: {}, skipUrlsOnNetworksPage: false };

  const RE = {
    noUrl: /no\s+url/gi,
    metadata: /metadata\.txt/i,
    noProfileLink: /no\s+profile\s+link/gi,
    noMatch: /no\s+match\s+found\.?/gi,
    url: /\b(?:https?:\/\/)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,24}(?::\d+)?(?:\/[^\s<>"')]*)?/gi,
  };
  const FILE_EXT = new Set(['txt','jpg','jpeg','png','gif','webp','pdf','html','htm','css','js','json','csv','doc','docx','xls','xlsx','zip','mp4','svg']);
  const SLD = new Set(['co','com','org','net','gov','edu','ac','or','ne','go']);

  let settings = { enabled: true, mode: 'bulk_rh', googleMatch: true, hoverHints: false, sameIgnoredWords: [] };
  // Report Highlights keeps its timeline checks in every mode.
  const modeCfg = () => (pageType() === 'report_summaries' ? MODES.bulk_rh : MODES[settings.mode]) || MODES.bulk_rh || FALLBACK_MODE;
  // evaluated on every run, so it follows the page address even when the site navigates without a reload
  const onNetworksPage = () => modeCfg().skipUrlsOnNetworksPage && /\/networks\//i.test(location.pathname);
  // mode flag noUrlsOnNetworksPage: on /networks/ pages every URL found in the screenshots table is marked red
  const urlsForbidden = () => !!modeCfg().noUrlsOnNetworksPage && /\/networks\//i.test(location.pathname);
  const URL_FUNCTIONS = new Set(['tableUrls', 'noUrl']);
  const otherFileRule = () => pageType() === 'report_summaries';   // other files: date-named .mp4 only
  const on = k => modeCfg().checks[k] !== false
    && !(URL_FUNCTIONS.has(k) && onNetworksPage());
  let observer = null, timer = null;
  let issues = [], seq = 0, ctx = { where: '', row: null };
  let elById = new Map();

  // ================= Helpers =================
  // ---- hover hints (popup switch, off by default): a short plain message in the tooltip of every marked item ----
  const HINTS = [
    [/^No image uploaded/i, 'Missing Image'], [/^An image is uploaded/i, 'Image not allowed (Possible match)'],
    [/^Name has no link/i, 'Missing Link'], [/^Link has no name/i, 'Missing Name'],
    [/^No profile link/i, 'Missing Profile Link'], [/^Profile link is hyperlinked/i, 'Profile link must not be hyperlinked in the summary'],
    [/^No match found\./i, 'Summary still says "No match found."'],
    [/^No screenshot row/i, 'Missing Screenshot'], [/^Screenshots are uploaded but/i, 'Screenshot not allowed (No match)'],
    [/^No Url/i, 'Missing URL'], [/^metadata\.txt is missing/i, 'Missing Metadata'],
    [/^File name is blank/i, 'Missing File Name'], [/^File name is not/i, 'Wrong File Name (.jpg / .jpeg / .png)'],
    [/^Other file must be named/i, 'Wrong File Name (date + .mp4)'],
    [/^URL has no subdomain/i, 'Missing Subdomain (www.)'], [/^Same URL appears more than once/i, 'Duplicate URL'],
    [/^URL is not allowed here/i, 'URL not allowed (No RH on Timeline)'],
    [/^Same URL used by more than one numbered/i, 'Duplicate URL (numbered links)'],
    [/^Same image name/i, 'Duplicate Image Name'], [/^Link text does not match/i, 'Wrong URL (name does not match domain / subdomain)'],
    [/^No named image/i, 'Missing Image (named after the link)'], [/^Word after "identified"/i, 'Missing Hyperlink'],
    [/^Header says \(BA\)/i, 'Missing "Identified Business Page"'], [/^Tag this as business/i, 'Tag this as business (BA)'],
    [/^Double space/i, 'Double Space'], [/^Double punctuation/i, 'Double Punctuation'],
    [/^Space after opening/i, 'Extra Space after bracket'], [/^Space before closing/i, 'Extra Space before bracket'],
    [/^Unfilled placeholder/i, 'Unfilled {Placeholder}'], [/^Missing same/i, 'Missing same (word)'], [/^Orange text/i, 'Orange text'],
  ];
  const hintFor = label => { const h = HINTS.find(([re]) => re.test(label || '')); return h ? h[1] : (label || ''); };
  const tipMap = new Map();
  function addTip(el, label) {
    const tips = tipMap.get(el) || new Set();
    tips.add(hintFor(label)); tipMap.set(el, tips);
    if (!el.hasAttribute('data-smrb-tip') && el.hasAttribute('title')) el.dataset.smrbT0 = el.getAttribute('title');
    el.dataset.smrbTip = '1';
    el.setAttribute('title', [...tips].join(' · '));
  }
  function record(el, color, label, detail) {
    if (settings.hoverHints) addTip(el, label);
    const id = ++seq;
    if (!el.dataset.smrbI) el.dataset.smrbI = id;
    elById.set(id, el);
    issues.push({ id, color, label, detail: detail || '', where: ctx.where, row: ctx.row });
  }
  function paint(el, color, label, detail) {
    if (el.closest(CFG.EXCLUDE)) return;
    el.classList.add('smrb-mark', 'smrb-' + color);
    record(el, color, label, detail);
  }
  const scanned = id => [...document.querySelectorAll(`[id="${id}"]`)].filter(e => !e.closest(CFG.EXCLUDE));
  // The ids sit on the whole card (title, help tooltip, buttons ...). The real text lives in div.rich-text,
  // so that is what gets read and scanned; fall back to the element itself if there is no .rich-text.
  const bodiesOf = el => { const b = [...el.querySelectorAll('.rich-text')]; return b.length ? b : [el]; };
  const textOf = el => bodiesOf(el).map(b => b.textContent).join(' ');
  const NO_MATCH_TEXT = /nomatch(es)?found/;
  const NO_MATCH_LINE = /^no match found(?:\s*\.)?$/;
  const PUBLIC_MEDIA = /\bidentified\s+on\s+(?:a\s+)?public\s+[^\s,;!?]+\b\s+[\p{L}\p{N}]/iu;
  const norm = t => (t || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const letters = t => (t || '').toLowerCase().replace(/[^a-z]/g, '');

  function makeSpan(textNode, res, withRecord) {
    const span = document.createElement('span');
    span.dataset.smrbWrap = '1';
    span.className = `smrb-mark smrb-${res.color}` + (res.pre ? ' smrb-pre' : '');
    textNode.parentNode.insertBefore(span, textNode);
    span.appendChild(textNode);
    if (withRecord) record(span, res.color, res.label, res.detail);
    return span;
  }

  // decide(match, textNode) -> {color,label,detail?,pre?} | null ; re must be global. Matches inside ONE text node.
  function wrapText(root, re, decide, skip) {
    const nodes = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode, p = n.parentElement;
      if (!p || p.closest('[data-smrb-wrap],script,style,' + CFG.EXCLUDE)) continue;
      if (skip && p.closest(skip)) continue;
      re.lastIndex = 0;
      if (re.test(n.nodeValue)) nodes.push(n);
    }
    nodes.forEach(n => {
      re.lastIndex = 0;
      const ms = [...n.nodeValue.matchAll(re)];
      for (let i = ms.length - 1; i >= 0; i--) {
        const res = decide(ms[i], n);
        if (!res) continue;
        const mid = n.splitText(ms[i].index);
        mid.splitText(ms[i][0].length);
        makeSpan(mid, res, true);
      }
    });
  }

  // Formatting problems, found even when they straddle <span>, <a>, <b>, <div> boundaries
  // ("John </span><span> Smith", "Jane  </div>Doe"):
  //   - double spaces
  //   - doubled punctuation: ".." (not an ellipsis "..."), ",,", ";;", "::", "!!", "??"
  //   - a space right after an opening ( [ { “ « or right before a closing ) ] } ” »
  const FORMAT_RULES = [
    { re: /(?<=\S)[ \u00A0]{2,}(?=\S)/g, label: 'Double space', pre: true },
    { re: /(?<![.])\.\.(?![.])|([,;:!?])\1+/g, label: 'Double punctuation' },
    { re: /[(\[{\u201C\u00AB][ \u00A0]+(?=\S)/g, label: 'Space after opening bracket', pre: true },
    { re: /(?<=\S)[ \u00A0]+[)\]}\u201D\u00BB]/g, label: 'Space before closing bracket', pre: true },
  ];
  function formatDetail(m) {
    const s = m.input, end = m.index + m[0].length;
    return '…' + s.slice(Math.max(0, m.index - 14), m.index).replace(/\s+/g, ' ') +
           m[0].replace(/[ \u00A0]/g, '·') + s.slice(end, end + 14).replace(/\s+/g, ' ') + '…';
  }
  function wrapFormatting(root) {
    const parts = [];
    let full = '';
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode, p = n.parentElement;
      if (!p || p.closest('[data-smrb-wrap],script,style,' + CFG.EXCLUDE)) continue;
      parts.push({ n, start: full.length });
      full += n.nodeValue;
    }
    const found = [];
    FORMAT_RULES.forEach(rule => {
      for (const m of full.matchAll(new RegExp(rule.re.source, 'g'))) found.push({ s: m.index, e: m.index + m[0].length, rule, m });
    });
    // overlapping findings (e.g. "(  x" is both a double space and a space after "(") -> keep the longest, earliest one
    found.sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s));
    let lastEnd = -1;
    const keep = found.filter(f => (f.s >= lastEnd ? (lastEnd = f.e, true) : false));

    const tasks = new Map(); // text node -> [{s,e,res,first}]
    keep.forEach(f => {
      const res = { color: SEV.formatting, label: f.rule.label, detail: formatDetail(f.m), pre: f.rule.pre };
      let first = true;
      parts.forEach(o => {
        const ns = o.start, ne = ns + o.n.nodeValue.length;
        const s = Math.max(f.s, ns), e = Math.min(f.e, ne);
        if (s < e) {
          if (!tasks.has(o.n)) tasks.set(o.n, []);
          tasks.get(o.n).push({ s: s - ns, e: e - ns, res, first });
          first = false;
        }
      });
    });
    tasks.forEach((list, n) => {
      list.sort((a, b) => b.s - a.s).forEach(t => {
        const mid = n.splitText(t.s);
        mid.splitText(t.e - t.s);
        makeSpan(mid, t.res, t.first);
      });
    });
  }

  // 'bare' = domain + TLD only, 'sub' = has subdomain, null = not applicable
  function hostStatus(str) {
    let u;
    try { u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(str) ? str : 'https://' + str); } catch { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const host = u.hostname.toLowerCase().replace(/\.$/, '');
    if (host === location.hostname || !host.includes('.') || /^\d+(\.\d+){3}$/.test(host)) return null;
    let labels = host.split('.');
    if (CFG.IGNORE_WWW && labels[0] === 'www') labels = labels.slice(1);
    const last = labels[labels.length - 1], second = labels[labels.length - 2];
    const base = last.length === 2 && SLD.has(second) ? 3 : 2; // handles co.uk, com.ph ...
    return labels.length <= base ? 'bare' : 'sub';
  }

  // comparable form of a URL: no protocol, no "www.", no trailing slash, no #hash
  function urlKey(u) {
    try {
      const x = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(u) ? u : 'https://' + u);
      return (x.hostname.replace(/^www\./i, '') + x.pathname.replace(/\/+$/, '') + x.search).toLowerCase();
    } catch { return null; }
  }
  // key of a URL found in plain text (null for e-mail addresses, file names, the site's own address ...)
  function textUrlKey(m) {
    if (m.index > 0 && m.input[m.index - 1] === '@') return null;
    const tld = m[0].replace(/[/?:].*$/, '').split('.').pop().toLowerCase();
    if (!/^https?:/i.test(m[0]) && FILE_EXT.has(tld)) return null;
    return hostStatus(m[0]) ? urlKey(m[0]) : null;
  }
  const hrefKey = a => {
    const h = (a.getAttribute('href') || '').trim();
    return /^(https?:)?\/\//i.test(h) && hostStatus(h.startsWith('//') ? 'https:' + h : h) ? urlKey(h) : null;
  };
  const URL_SKIP = 'a[href],button,[data-bs-target]';

  function urlChecks(root) {
    const anchors = [...root.querySelectorAll('a[href]')];
    if (root.matches('a[href]')) anchors.push(root);
    anchors.forEach(a => {
      const h = (a.getAttribute('href') || '').trim();
      if (!/^(https?:)?\/\//i.test(h)) return;
      if (hostStatus(h.startsWith('//') ? 'https:' + h : h) === 'bare') paint(a, SEV.bareDomain, 'URL has no subdomain', h.slice(0, 80));
    });
    wrapText(root, RE.url, m => {
      if (m.index > 0 && m.input[m.index - 1] === '@') return null; // e-mail
      const tld = m[0].replace(/[/?:].*$/, '').split('.').pop().toLowerCase();
      if (!/^https?:/i.test(m[0]) && FILE_EXT.has(tld)) return null; // file names
      return hostStatus(m[0]) === 'bare'
        ? { color: SEV.bareDomain, label: 'URL has no subdomain', detail: m[0].slice(0, 80) } : null;
    }, 'a[href],button,[data-bs-target]');
  }

  function rowNum(tr) {
    const th = [...tr.children].find(c => c.tagName === 'TH');
    const t = th && th.textContent.trim();
    if (t && /^\d+$/.test(t)) return +t;
    return tr.parentElement ? [...tr.parentElement.children].indexOf(tr) + 1 : null;
  }

  // ================= Checks: "No RH on Timeline" - a screenshot row must NOT have a URL =================
  function forbiddenUrlChecks(row) {
    const label = 'URL is not allowed here (No RH on Timeline)';
    const files = new Set(otherFileLinks(row));
    row.querySelectorAll('a[href]').forEach(a => {
      if (a.closest('[data-bs-target]') || files.has(a)) return;      // screenshot / metadata / other file links are not URLs
      if (hrefKey(a)) paint(a, SEV.forbiddenUrl, label, (a.getAttribute('href') || '').trim().slice(0, 80));
    });
    wrapText(row, RE.url, m => {
      if (m.index > 0 && m.input[m.index - 1] === '@') return null;  // e-mail
      const tld = m[0].replace(/[/?:].*$/, '').split('.').pop().toLowerCase();
      if (!/^https?:/i.test(m[0]) && FILE_EXT.has(tld)) return null;  // file names
      return hostStatus(m[0]) ? { color: SEV.forbiddenUrl, label, detail: m[0].slice(0, 80) } : null;
    }, URL_SKIP);
  }

  function metadataCell(row) {
    const cells = [...row.children];
    return cells.find(cell => /metadata/i.test(cell.textContent)) || cells[2];
  }

  // ================= Checks: screenshots table =================
  function screenshotChecks() {
    const dups = on('dupUrls') && on('tableUrls');
    if (!on('screenshots') && !(on('urls') && on('tableUrls')) && !on('noUrl') && !dups) return;
    document.querySelectorAll(CFG.TABLE_SEL).forEach(table => {
      if (table.closest(CFG.EXCLUDE)) return;
      table.querySelectorAll('tbody > tr').forEach(row => {
        if (row.closest(CFG.EXCLUDE)) return;
        ctx = { where: 'Table', row: rowNum(row) };

        // Standard (No Timeline or RH): a file that is neither an image nor metadata is only checked for its name
        if (otherFileRule() && on('screenshots')) {
          otherFileLinks(row).forEach(a => {
            const name = fileLinkName(a), why = videoNameProblem(name);
            if (why) paint(a, SEV.otherFile, 'Other file must be named yyyy-mm-dd or MMMM DD, yyyy and be .mp4', `${name} (${why})`);
          });
        }
        const fileEls = [];
        row.querySelectorAll('[data-bs-target="#screenshotViewer"]').forEach(a => {
          const spans = [...a.querySelectorAll('span')];
          fileEls.push(...(spans.length ? spans : [a]));
        });
        if (otherFileRule()) {
          const others = fileEls.filter(f => { const n = f.textContent.trim(); return n && !CFG.FILE_OK.test(n); });
          if (others.length) {
            if (on('screenshots')) others.forEach(f => {
              const name = f.textContent.trim(), why = videoNameProblem(name);
              if (why) paint(f, SEV.otherFile, 'Other file must be named yyyy-mm-dd or MMMM DD, yyyy and be .mp4', `${name} (${why})`);
            });
            return;                                       // no URL / metadata / image scan for this row
          }
        }

        if (urlsForbidden()) forbiddenUrlChecks(row);
        if (on('noUrl')) wrapText(row, RE.noUrl, () => ({ color: SEV.noUrl, label: 'No Url' }));

        if (on('screenshots')) {
          const meta = metadataCell(row);
          if (meta && !RE.metadata.test(meta.textContent)) record(meta, SEV.noMetadata, 'metadata.txt is missing');

          row.querySelectorAll('[data-bs-target="#screenshotViewer"]').forEach(a => {
            const spans = [...a.querySelectorAll('span')];
            (spans.length ? spans : [a]).forEach(s => {
              const name = s.textContent.trim();
              if (!CFG.FILE_OK.test(name)) {
                paint(s, SEV.badFileName, name ? 'File name is not .jpg / .jpeg / .png' : 'File name is blank', name);
                if (!name) s.classList.add('smrb-blank');
              }
            });
          });
        }
        if (on('urls') && on('tableUrls')) urlChecks(row);
      });
    });
    if (dups) duplicateUrlChecks();
    if (on('screenshots') && on('imageNameDups')) duplicateImageNames();
  }

  // ================= Checks: two screenshots with the same image name -> the name is marked yellow =================
  // img name = td > a > div > span of the screenshots table (names that are already a wrong file name are left to that check)
  function duplicateImageNames() {
    const groups = new Map();
    document.querySelectorAll(CFG.TABLE_SEL).forEach(table => {
      if (table.closest(CFG.EXCLUDE)) return;
      table.querySelectorAll('tbody > tr').forEach(row => {
        if (row.closest(CFG.EXCLUDE)) return;
        row.querySelectorAll('[data-bs-target="#screenshotViewer"] span').forEach(sp => {
          const name = sp.textContent.trim();
          if (!name || !CFG.FILE_OK.test(name)) return;
          const k = norm(name);
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push({ sp, row, name });
        });
      });
    });
    groups.forEach(list => {
      if (list.length < 2) return;
      list.forEach(({ sp, row, name }) => {
        ctx = { where: 'Table', row: rowNum(row) };
        paint(sp, SEV.dupImageName, 'Same image name as another image', name);
      });
    });
  }

  // yyyy-mm-dd or "MMMM DD, yyyy" (e.g. "October 09, 2026"), optionally followed by an ordinal " (2)", " (3)" ... + extension .mp4. Returns '' when fine, else what is wrong.
  const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  function videoNameProblem(name) {
    const m = name.match(/^(.*)\.([^.]+)$/);
    if (!m) return 'no file extension';
    let base = m[1].trim();
    const ext = m[2].toLowerCase();
    if (ext !== 'mp4') return 'extension is not .mp4';
    // duplicate-style ordinals are fine from (2) upwards: "2025-10-29 (2).mp4", "October 29, 2025 (3).mp4"
    const ord = base.match(/^(.*?)\s*\((\d+)\)$/);
    if (ord) {
      if (+ord[2] < 2) return 'ordinal must start from (2)';
      base = ord[1].trim();
    }
    let y, mo, d;
    let a = base.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (a) { y = +a[1]; mo = +a[2]; d = +a[3]; }
    else if ((a = base.match(/^([A-Za-z]+) (\d{2}), (\d{4})$/))) { mo = MONTHS.indexOf(a[1].toLowerCase()) + 1; d = +a[2]; y = +a[3]; }
    else return 'name is not a date in the right format';
    const dt = new Date(Date.UTC(y, mo - 1, d));
    return mo > 0 && dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? '' : 'not a real date';
  }

  // Uploaded files are shown as links inside the row, e.g.
  //   <span class="fe fe-play-circle"></span><a href=".../rails/active_storage/blobs/redirect/.../2025-10.mp4">2025-10.mp4</a>
  // (the screenshot itself, the metadata button and the profile/post URL are not "other files")
  function otherFileLinks(row) {
    return [...row.querySelectorAll('a[href]')].filter(a => {
      if (a.closest('[data-bs-target]')) return false;
      const text = a.textContent.trim();
      if (/^https?:\/\//i.test(text)) return false;                       // a URL, not a file
      return /\/active_storage\/blobs\//i.test(a.getAttribute('href') || '') || /\.[A-Za-z0-9]{2,5}$/.test(text);
    });
  }
  function fileLinkName(a) {
    const t = a.textContent.trim();
    if (t) return t;
    try { return decodeURIComponent((a.getAttribute('href') || '').split(/[?#]/)[0].split('/').pop()); } catch { return ''; }
  }

  // ================= Checks: screenshots area - the same URL more than once =================
  function duplicateUrlChecks() {
    const rows = [];
    document.querySelectorAll(CFG.TABLE_SEL).forEach(t => {
      if (t.closest(CFG.EXCLUDE)) return;
      t.querySelectorAll('tbody > tr').forEach(r => { if (!r.closest(CFG.EXCLUDE)) rows.push(r); });
    });
    const anchorsOf = r => [...r.querySelectorAll('a[href]')].filter(a => !a.closest('[data-bs-target]'));
    const seen = new Map(); // url key -> [row numbers]
    const note = (k, n) => { if (!seen.has(k)) seen.set(k, []); seen.get(k).push(n); };

    // pass 1: count every URL (links and plain text), including text already wrapped by another check
    rows.forEach(r => {
      const n = rowNum(r);
      anchorsOf(r).forEach(a => { const k = hrefKey(a); if (k) note(k, n); });
      const w = document.createTreeWalker(r, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) {
        const p = w.currentNode.parentElement;
        if (!p || p.closest(URL_SKIP + ',script,style')) continue;
        for (const m of w.currentNode.nodeValue.matchAll(new RegExp(RE.url.source, 'gi'))) { const k = textUrlKey(m); if (k) note(k, n); }
      }
    });
    const dupes = k => k && seen.get(k) && seen.get(k).length > 1;
    const detail = (k, n, shown) => {
      const rowsOf = [...new Set(seen.get(k))];
      return `${shown.slice(0, 70)} · ` + (rowsOf.length === 1 ? 'twice in this row' : 'also in Row ' + rowsOf.filter(x => x !== n).join(', '));
    };
    const label = 'Same URL appears more than once';

    // pass 2: highlight them
    rows.forEach(r => {
      const n = rowNum(r);
      ctx = { where: 'Table', row: n };
      anchorsOf(r).forEach(a => { const k = hrefKey(a); if (dupes(k)) paint(a, SEV.duplicateUrl, label, detail(k, n, a.getAttribute('href'))); });
      wrapText(r, RE.url, m => { const k = textUrlKey(m); return dupes(k) ? { color: SEV.duplicateUrl, label, detail: detail(k, n, m[0]) } : null; }, URL_SKIP);
      r.querySelectorAll('span[data-smrb-wrap]').forEach(sp => {      // URL text another check already wrapped
        if (sp.closest(URL_SKIP) || sp.classList.contains('smrb-orange')) return;
        const m = sp.textContent.match(new RegExp(RE.url.source, 'i'));
        const k = m && textUrlKey(Object.assign([m[0]], { index: 1, input: ' ' + m[0] }));
        if (dupes(k)) paint(sp, SEV.duplicateUrl, label, detail(k, n, m[0]));
      });
    });
  }

  // ================= Checks: relatives (name <-> link) =================
  const headerish = c => c.matches('h1,h2,h3,h4,h5,h6,button,[class*="tooltip"]') || !!c.querySelector('h1,h2,h3,h4,h5,h6,button,[class*="tooltip"]');
  // real entries only: list items, table rows, paragraphs of a rich-text body, or sibling blocks under the title row.
  // Returns [] when nothing has been added, so nothing gets marked.
  function relativeItems(root) {
    let items = [...root.querySelectorAll('li')].filter(li => !li.querySelector('li'));
    if (!items.length) items = [...root.querySelectorAll('tr:not(thead tr)')];
    if (!items.length) items = [...root.querySelectorAll('.rich-text p')].filter(p => p.textContent.replace(/[\s\u00A0]+/g, ''));
    if (!items.length) {
      let cur = root;
      for (let d = 0; d < 3; d++) {
        const kids = [...cur.children].filter(c => !/^(SCRIPT|STYLE|BR)$/.test(c.tagName) && !headerish(c));
        if (kids.length > 1) { items = kids; break; }
        if (kids.length === 1) cur = kids[0]; else break;
      }
    }
    return items.filter(it => it.textContent.replace(/[\s\u00A0]+/g, '') || it.querySelector('a[href]'));
  }

  function relativesChecks() {
    scanned('relatives').forEach(root => {
      if (/\bno\s+relatives?\b|\bnone\s+(added|found)\b/i.test(root.textContent)) return; // empty state
      relativeItems(root).forEach((it, i) => {
        ctx = { where: 'Relatives #' + (i + 1), row: null };
        const text = it.textContent.replace(/\s+/g, ' ').trim();
        if (/^(no|none|n\/a)\b/i.test(text)) return;        // "No relatives found" etc.
        const links = [...it.querySelectorAll('a[href]')];
        if (it.matches('a[href]')) links.push(it);
        const hasName = /[\p{L}\p{N}]/u.test(text);
        if (hasName && !links.length) paint(it, SEV.relatives, 'Name has no link', text.slice(0, 60));
        else if (!hasName && links.length) paint(it, SEV.relatives, 'Link has no name', (links[0].getAttribute('href') || '').slice(0, 80));
      });
    });
  }

  // ================= Checks: "the identified [any word]" must be hyperlinked =================
  // Matches "the identified [word]" and the numbered forms "the 1st identified [word]", "the 2nd identified [word]",
  // "the 3rd ...", "the 4th ...", "the 21st ..." (also spelled out: "the first/second/third ... identified [word]").
  // e.g. "... as seen on the identified [Instagram](url) account."  If [word] is not a hyperlink it gets an orange warning.
  const SOCMED_PHRASE = /\bidentified\s+(?!(?:on|as|by|in)\b|business\s+page\b)([\p{L}\p{N}][\p{L}\p{N}._+'’-]*)/giu;
  function rangeChecks(root, find) {
    const parts = [];
    let full = '';
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode, p = n.parentElement;
      if (!p || p.closest('[data-smrb-wrap],script,style,' + CFG.EXCLUDE)) continue;
      parts.push({ n, start: full.length });
      full += n.nodeValue;
    }
    const items = find(full, parts);
    const tasks = new Map();
    items.forEach(f => {
      let first = true;
      parts.forEach(o => {
        const ns = o.start, ne = ns + o.n.nodeValue.length;
        const s = Math.max(f.s, ns), e = Math.min(f.e, ne);
        if (s < e) {
          if (!tasks.has(o.n)) tasks.set(o.n, []);
          tasks.get(o.n).push({ s: s - ns, e: e - ns, res: f.res, first });
          first = false;
        }
      });
    });
    tasks.forEach((list, n) => {
      list.sort((a, b) => b.s - a.s).forEach(t => {
        const mid = n.splitText(t.s);
        mid.splitText(t.e - t.s);
        makeSpan(mid, t.res, t.first);
      });
    });
  }

  // A hyperlink may cover any of the first three words after "identified".
  const findIdentified = (full, parts) => {
    const items = [];
    for (const match of full.matchAll(SOCMED_PHRASE)) {
      const keywordEnd = match.index + 'identified'.length;
      const keywordParts = parts.filter(({ n, start }) => start < keywordEnd && start + n.nodeValue.length > match.index);
      if (keywordParts.length && keywordParts.every(({ n }) => {
        const weight = getComputedStyle(n.parentElement).fontWeight;
        return weight === 'bold' || Number(weight) >= 700;
      })) continue;
      const word = match[1].replace(/[.+_-]+$/, '');
      const start = match.index + match[0].length - match[1].length;
      const tail = full.slice(start);
      const phrase = tail.match(/^[\p{L}\p{N}][\p{L}\p{N}_+'’-]*(?:[^\S\r\n]+(?!(?:and|or|identified)\b)[\p{L}\p{N}][\p{L}\p{N}_+'’-]*){0,2}/iu);
      const end = start + Math.max(word.length, phrase?.[0].length ?? 0);
      const linked = parts.some(({ n, start: nodeStart }) => {
        if (nodeStart >= end || nodeStart + n.nodeValue.length <= start) return false;
        return !!n.parentElement.closest('a[href]')?.getAttribute('href').trim();
      });
      if (!linked) items.push({
        s: start, e: start + word.length,
        res: { color: SEV.socmedLink, label: 'Word after "identified" is not hyperlinked', detail: tail.slice(0, end - start) },
      });
    }
    return items;
  };
  const socmedLinkChecks = root => rangeChecks(root, findIdentified);

  // ================= Checks: "same [word] (...)": check for parentheses after up to three words =================
  // Only when "same" STARTS an item: at the start of the text or a sentence, after a comma, or after "and".
  //   "Match found by name, same interest, same sports and same location"  -> interest, sports, location each need a (...)
  //   "same Facebook (facebook)"  -> OK.   "same Facebook"  -> the word "Facebook" is marked red: Missing same (word)
  // "at the same time" is not an item start, so it is ignored.  Ignored words: as, photo, posts, video, "profile photo".
  const SAME_PHRASE = /(?:^\s*|[,;.!?&]\s*|\band\s+)same\s+([A-Za-z0-9][A-Za-z0-9.+_-]*)/gi;
  const SAME_SKIP = /^(as|photo|posts|video)$/i;                    // ignored words; "same profile photo" is ignored too (see findSame)
  const findSame = full => {
    const items = [];
    const ignored = new Set(settings.sameIgnoredWords);
    for (const m of full.matchAll(SAME_PHRASE)) {
      const word = m[1].replace(/[.+_-]+$/, '');
      if (!word || SAME_SKIP.test(word) || ignored.has(word.toLowerCase())) continue;
      const ws = m.index + m[0].length - m[1].length, we = ws + word.length;
      if (/^profile$/i.test(word) && /^\s+photo\b/i.test(full.slice(we))) continue;               // "same profile photo"
      if (/^(?:\s+(?!(?:and|or|same)\b)[\p{L}\p{N}][\p{L}\p{N}\x27’_-]*){0,2}\s*\([^()]*[^\s()][^()]*\)/iu.test(full.slice(we))) continue;     // "(...)" with open + close parenthesis and some text inside
      items.push({ s: ws, e: we, res: { color: SEV.missingSame, label: 'Missing same (word)', detail: `"${m[0].replace(/\s+/g, ' ')}" has no (…) after it` } });
    }
    return items;
  };
  const sameParenChecks = root => rangeChecks(root, findSame);

  // ================= Checks: network header "(BA)"  <->  summary "Identified Business Page" =================
  // Header: div#webformSection > div > div > h2, e.g. "Facebook (BA)".
  //   header has (BA), summary has no "Identified Business Page"  -> the first word of the summary is marked red
  //   summary has "Identified Business Page", header has no (BA)  -> the header is marked red: "Tag this as business (BA)"
  function businessPageChecks() {
    const secs = [...document.querySelectorAll('[id="webformSection"]')].filter(sec => !sec.closest(CFG.EXCLUDE));
    secs.forEach(sec => {
      const header = sec.querySelector(':scope > div:first-child > div > h2') || sec.querySelector('h2');
      if (!header) return;
      const hasBA = /\(\s*BA\s*\)/i.test(header.textContent);
      let sums = [...sec.querySelectorAll('[id="profile_summary"]')].filter(e => !e.closest(CFG.EXCLUDE));
      if (!sums.length && secs.length === 1) sums = scanned('profile_summary');     // summary outside the section: only when there is one section
      let tagged = false;
      sums.forEach(sum => {
        const text = textOf(sum);
        if (!text.trim() || NO_MATCH_TEXT.test(letters(text))) return;             // empty or "No match found."
        const hasBP = /\bidentified\s+business\s+page\b/i.test(text);
        if (hasBA && !hasBP) {
          const body = bodiesOf(sum).find(b => b.textContent.trim());
          if (!body) return;
          ctx = { where: 'Profile summary', row: null };
          rangeChecks(body, full => {
            const m = full.match(/\S+/);
            return m ? [{ s: m.index, e: m.index + m[0].length, res: { color: SEV.businessPage, label: 'Header says (BA) but the summary has no "Identified Business Page"', detail: `first word "${m[0]}"` } }] : [];
          });
        } else if (!hasBA && hasBP && !tagged) {
          tagged = true;
          ctx = { where: 'Header', row: null };
          paint(header, SEV.businessPage, 'Tag this as business (BA)', `"${header.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)}" has no (BA), but the summary says "Identified Business Page"`);
        }
      });
    });
  }

  // ================= Checks: each source link in the summary needs an image named after it =================
  // Summary layout (one paragraph or line per row):
  //   Match found by first and last name ...            <- prose line
  //   [Truepeoplesearch](url)                           <- first stand-alone link after a prose line: the main source
  //   [Newbizbot](url)                                  <- further stand-alone links in the group: the other results
  //   Match found ... as seen on [Truepeoplesearch](url) <- links inside prose: not checked
  // The word must be the exact name of an uploaded image (case-insensitive, extension ignored).
  // The other results of a group are also OK when a "Google" image (Google Results, where everything is put) is uploaded.
  const stripExt = t => t.replace(/\.(jpe?g|png|gif|webp)$/i, '');
  const IMG_NAME = /\.(jpe?g|png|gif|webp)$/i;
  function similarity(a, b) {
    a = a.replace(/[^a-z0-9]/g, ''); b = b.replace(/[^a-z0-9]/g, '');
    if (!a || !b) return 0;
    if (a.includes(b) || b.includes(a)) return Math.max(0.8, Math.min(a.length, b.length) / Math.max(a.length, b.length));
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return 1 - prev[b.length] / Math.max(a.length, b.length);
  }

  // split a text block into visual lines (new line at <br> and at block-level elements)
  function summaryLines(body) {
    const BLOCK = /^(P|DIV|LI|UL|OL|H[1-6]|TR|TABLE|BLOCKQUOTE)$/;
    const lines = [];
    let cur = { text: '', links: [] };
    const flush = () => { lines.push(cur); cur = { text: '', links: [] }; };
    (function walk(node) {
      for (const c of node.childNodes) {
        if (c.nodeType === 3) { cur.text += c.nodeValue; continue; }
        if (c.nodeType !== 1) continue;
        if (c.tagName === 'BR') { flush(); continue; }
        const block = BLOCK.test(c.tagName);
        if (block) flush();
        if (c.tagName === 'A' && c.getAttribute('href')) { cur.links.push(c); cur.text += c.textContent; }
        else walk(c);
        if (block) flush();
      }
    })(body);
    flush();
    return lines;
  }
  // every stand-alone link of every group; primary = first link of the group
  function groupLinks(body) {
    const out = [];
    let groupOpen = false;
    summaryLines(body).forEach(line => {
      const text = line.text.replace(/[\s\u00A0]+/g, ' ').trim();
      if (!text && !line.links.length) return;                       // blank line: neutral
      let rest = text;
      line.links.forEach(a => { rest = rest.replace(a.textContent.replace(/[\s\u00A0]+/g, ' ').trim(), ''); });
      const standalone = line.links.length > 0 && !/[\p{L}\p{N}]/u.test(rest);
      if (!standalone) { groupOpen = false; return; }                // prose line starts a new group
      line.links.forEach((a, i) => out.push({ a, primary: !groupOpen && i === 0 }));
      groupOpen = true;
    });
    return out;
  }

  // names of every uploaded image on the page: file names in the screenshots table / img src, alt and title
  function uploadedImageNames() {
    const names = new Set();
    const add = t => { const n = norm(t); if (n) { names.add(n); names.add(stripExt(n)); } };
    document.querySelectorAll('img').forEach(img => {
      if (img.closest(CFG.EXCLUDE)) return;
      let file = '';
      try { file = decodeURIComponent((img.getAttribute('src') || '').split(/[?#]/)[0].split('/').pop()); } catch { /* ignore */ }
      if (IMG_NAME.test(file)) add(file);
      add(img.getAttribute('alt')); add(img.getAttribute('title'));
    });
    document.querySelectorAll('[data-bs-target="#screenshotViewer"] span').forEach(sp => { if (!sp.closest(CFG.EXCLUDE)) add(sp.textContent); });
    return names;
  }

  // ---- the hyperlink must be "named after" its URL: domain, subdomain, or subdomain + domain ----
  //   [Truepeoplesearch](https://www.truepeoplesearch.com/..)   domain            -> OK
  //   [Lifestyle](https://lifestyle.example.com/..)             subdomain         -> OK
  //   [Lifestyle Example](https://lifestyle.example.com/..)     subdomain+domain  -> OK
  const alnum = t => (t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  function hostParts(href) {
    let u; try { u = new URL(href, location.href); } catch { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const labels = u.hostname.toLowerCase().replace(/^www\./, '').split('.');
    if (labels.length < 2) return null;
    const tldLen = labels.length >= 3 && labels[labels.length - 1].length === 2 && SLD.has(labels[labels.length - 2]) ? 2 : 1;
    const domain = labels[labels.length - tldLen - 1];
    return { domain, sub: labels.slice(0, labels.length - tldLen - 1), tld: labels.slice(-tldLen).join('.'), host: labels.join('.') };
  }
  function urlNameCheck(a) {
    const shown = a.textContent.replace(/\s*\(\s*\d+\s*\)\s*$/, '');          // "Sunbiz (2)", "Sunbiz (3)" ... (n): the (n) is ignored
    const name = alnum(shown);
    const h = hostParts((a.getAttribute('href') || '').trim());
    if (!name || !h) return;
    const sub = h.sub.join('');
    const ok = new Set([h.domain, sub, ...h.sub, sub + h.domain, h.domain + h.tld.replace(/\./g, ''), alnum(h.host)].filter(Boolean));
    if (ok.has(name)) return;
    const expect = [h.domain, sub && `${sub}`, sub && `${h.sub.join(' ')} ${h.domain}`].filter(Boolean).join('  /  ');
    paint(a, SEV.urlName, 'Link text does not match its URL', `"${shown.trim()}" → ${h.host} · should be named: ${expect}`);
  }

  function sourceImageChecks() {
    const summaries = scanned('profile_summary');
    if (!summaries.length) return;
    const names = modeCfg().reportType === 'nonbulk' ? new Set() : uploadedImageNames();
    const googleResults = names.has('google');                       // one "Google" image holds all the results
    summaries.forEach(s => bodiesOf(s).forEach(b => groupLinks(b).forEach(({ a, primary }) => {
      const word = norm(a.textContent);
      ctx = { where: 'Profile summary', row: null };
      if (word) urlNameCheck(a);                                     // right URL? named after its domain / subdomain / both
      if (!word || modeCfg().reportType === 'nonbulk' || names.has(word)) return;
      if (!primary && googleResults) return;                         // listed on the Google Results image
      let closest = '', best = 0;
      names.forEach(n => { if (n.length < 3) return; const sc = similarity(n, word); if (sc > best) { best = sc; closest = n; } });
      ctx = { where: 'Profile summary', row: null };
      const shown = `"${a.textContent.trim()}"` + (primary ? '' : ' (result)');
      const hint = best >= CFG.IMAGE_HINT_SIMILARITY ? ` · closest image: "${closest}"` : '';
      paint(a, SEV.googleName, 'No named image was uploaded yet.', shown + hint + (primary ? '' : ' · no "Google" image either'));
    })));
  }
  // ================= Checks: profile / summary / highlights =================
  // ================= Checks: unfilled {Placeholders} inside a coloured span =================
  // e.g. <span style="color: rgb(224, 62, 45);">{Identifiers}<span style="color: rgb(0, 0, 0);">.</span></span>
  const RGB_STYLE = /(^|;)\s*color\s*:\s*rgb\(/i;
  const SECTION_NAMES = { profile_summary: 'Profile summary', report_highlights: 'Report highlights', relatives: 'Relatives',
                          profile_link: 'Profile link', match_results: 'Match results' };
  function insideRgbSpan(node, stop) {
    for (let q = node.parentElement; q && q !== stop; q = q.parentElement) {
      if (q.tagName === 'SPAN' && RGB_STYLE.test(q.getAttribute('style') || '')) return true;
    }
    return false;
  }
  function placeholderChecks() {
    const roots = new Set(document.querySelectorAll('.rich-text'));
    ['profile_summary', 'report_highlights'].forEach(id => scanned(id).forEach(e => bodiesOf(e).forEach(b => roots.add(b))));
    roots.forEach(root => {
      if (root.closest(CFG.EXCLUDE)) return;
      let where = 'Page';
      for (let p = root; p; p = p.parentElement) if (p.id && SECTION_NAMES[p.id]) { where = SECTION_NAMES[p.id]; break; }
      ctx = { where, row: null };
      wrapText(root, /\{[^{}\n]{1,60}\}/g, (m, n) => insideRgbSpan(n, root)
        ? { color: SEV.placeholder, label: 'Unfilled placeholder', detail: m[0] } : null);
    });
  }

  // ================= Checks: text in an ORANGE coloured span (in every summary) is marked yellow =================
  // e.g. <span style="color: rgb(230, 126, 34);">text</span>. Orange is found by its hue, so any orange shade counts
  // (rgb / hex / "orange"); red, yellow and the other colours do not. Only the text whose nearest coloured span is orange is marked.
  const COLOR_STYLE = /(^|;)\s*color\s*:\s*([^;]+)/i;
  function isOrange(css) {
    css = (css || '').trim().toLowerCase();
    if (/^(orange|darkorange|orangered)$/.test(css)) return css !== 'orangered';
    let r, g, b, m;
    if ((m = css.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/))) { r = +m[1]; g = +m[2]; b = +m[3]; }
    else if ((m = css.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/))) {
      const h = m[1].length === 3 ? m[1].replace(/./g, c => c + c) : m[1];
      r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
    } else return false;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return false;
    const l = (mx + mn) / 510, sat = d / (255 * (1 - Math.abs(2 * l - 1)));
    let hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue = (hue * 60 + 360) % 360;
    return hue >= 15 && hue <= 42 && sat >= 0.5 && l >= 0.3 && l <= 0.8;
  }
  function inOrangeSpan(node, stop) {
    for (let q = node.parentElement; q && q !== stop; q = q.parentElement) {
      const m = q.tagName === 'SPAN' && (q.getAttribute('style') || '').match(COLOR_STYLE);
      if (m) return isOrange(m[2]);                                   // the nearest coloured span decides
    }
    return false;
  }
  function orangeTextChecks() {
    const roots = new Set(document.querySelectorAll('.rich-text'));
    ['profile_summary', 'report_highlights'].forEach(id => scanned(id).forEach(e => bodiesOf(e).forEach(b => roots.add(b))));
    roots.forEach(root => {
      if (root.closest(CFG.EXCLUDE)) return;
      let where = 'Page';
      for (let p = root; p; p = p.parentElement) if (p.id && SECTION_NAMES[p.id]) { where = SECTION_NAMES[p.id]; break; }
      ctx = { where, row: null };
      wrapText(root, /\S(?:[\s\S]*\S)?/g, (m, n) => inOrangeSpan(n, root)
        ? { color: SEV.orangeText, label: 'Orange text', detail: m[0].replace(/\s+/g, ' ').slice(0, 60) } : null);
    });
  }

  // ================= Checks: numbered links ("Photo 1", "Video 2", "Page 3" ...): each needs its own unique URL =================
  // The summary starts a sentence with "Identified on public [Socmed]"; the words after it, up to the first period, are what
  // is listed below (any plural word, not only photos / videos / posts):
  //   "Identified on public Facebook photos and videos."  -> check the links Photo 1..20 and Video 1..20
  //   "Identified on public Facebook pages."              -> check the links Page 1..20
  // Singular words ("...Facebook photo.") are not checked. If two or more checked links go to the same URL,
  // all links of that group are marked orange.
  const NOT_LISTED = /^(this|its|was|has|is|as|us|his|across|always|various|previous|numerous|business|address|status|news)$/i;
  function singularForms(w) {
    w = w.toLowerCase();
    const out = new Set([w.replace(/s$/, '')]);
    if (/es$/.test(w)) out.add(w.replace(/es$/, ''));
    if (/ies$/.test(w)) out.add(w.replace(/ies$/, 'y'));
    return out;
  }
  function listedNames(root) {                                         // singular names of the plural words, e.g. {photo, video}
    const text = root.innerText || root.textContent || '';
    const names = new Set();
    for (const m of text.matchAll(/\bidentified\s+on\s+public\s+\S+([^.\n]*)/gi))
      for (const w of m[1].matchAll(/[A-Za-z][A-Za-z'-]*/g)) {
        if (w[0].length < 4 || !/s$/i.test(w[0]) || NOT_LISTED.test(w[0])) continue;   // only plural words
        singularForms(w[0]).forEach(n => names.add(n));
      }
    return names;
  }
  const NUMBERED_LINK = /^([A-Za-z][A-Za-z'-]*)\s*(\d{1,2})$/;
  function mediaLinkChecks() {
    const roots = new Set(document.querySelectorAll('.rich-text'));
    ['profile_summary', 'report_highlights'].forEach(id => scanned(id).forEach(e => bodiesOf(e).forEach(b => roots.add(b))));
    roots.forEach(root => {
      if (root.closest(CFG.EXCLUDE)) return;
      const names = listedNames(root);
      if (!names.size) return;                                        // no "Identified on public [Socmed] <plurals>" sentence: no check
      const groups = new Map();
      root.querySelectorAll('a[href]').forEach(a => {
        const m = a.textContent.replace(/[\s\u00a0]+/g, ' ').trim().match(NUMBERED_LINK);
        if (!m || +m[2] < 1 || +m[2] > 20 || !names.has(m[1].toLowerCase())) return;
        const href = (a.getAttribute('href') || '').trim();
        if (!href) return;
        const key = hrefKey(a) || href.toLowerCase();
        const name = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() + ' ' + (+m[2]);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ a, name });
      });
      let where = 'Page';
      for (let p = root; p; p = p.parentElement) if (p.id && SECTION_NAMES[p.id]) { where = SECTION_NAMES[p.id]; break; }
      ctx = { where, row: null };
      groups.forEach(list => {
        if (list.length < 2) return;
        const names = list.map(o => o.name).join(', ');
        list.forEach(o => paint(o.a, SEV.mediaDup, 'Same URL used by more than one numbered link (Photo 1, Video 2 …)', names));
      });
    });
  }

  // The URL shown in #profile_link must not also be a hyperlink inside #profile_summary
  function linkInSummaryChecks() {
    const keys = new Set();
    scanned('profile_link').forEach(root => {
      root.querySelectorAll('a[href]').forEach(a => { const k = hrefKey(a); if (k) keys.add(k); });
      for (const m of root.textContent.matchAll(new RegExp(RE.url.source, 'gi'))) { const k = textUrlKey(m); if (k) keys.add(k); }
    });
    if (!keys.size) return;
    scanned('profile_summary').forEach(s => bodiesOf(s).forEach(b => {
      ctx = { where: 'Profile summary', row: null };
      b.querySelectorAll('a[href]').forEach(a => {
        const k = hrefKey(a);
        if (k && keys.has(k)) paint(a, SEV.linkInSummary, 'Profile link is hyperlinked in the summary', (a.getAttribute('href') || '').slice(0, 80));
      });
    }));
  }

  // ================= Pages =================
  // The numbers in the address are not static, so only the fixed words are matched:
  //   /webform/<id>/profile_information    /webform/<id>/report_summaries    /webform/<id>/networks/<id>
  function pageType() {
    const p = location.pathname;
    if (/\/profile_information(\/|$)/i.test(p)) return 'profile_information';
    if (/\/report_summaries(\/|$)/i.test(p)) return 'report_summaries';
    if (/\/networks\/[^/]+/i.test(p)) return 'networks';
    return 'other';
  }

  // The Google network page: <div id="webformSection"> ... <h2 class="mb-0">Google </h2>
  const isGoogleNetwork = () => [...document.querySelectorAll('[id="webformSection"] h2.mb-0')].some(h => /^google(?:\s*\(\s*ba\s*\))?$/i.test(norm(h.textContent)));

  // ---- images (#profile_image, #map_view, #street_view) ----
  const NO_IMAGE_TEXT = 'no image uploaded';
  const hasImage = el => {
    const imgs = el.matches('img') ? [el] : [...el.querySelectorAll('img')];
    if (imgs.some(i => (i.getAttribute('src') || '').trim())) return true;
    return /url\(/i.test(el.getAttribute('style') || '') || !!el.querySelector('[style*="url("]');
  };
  // mark the <span>No image uploaded</span> when it is there, otherwise the box itself
  const noImageTarget = el => [...el.querySelectorAll('span')].find(sp => norm(sp.textContent) === NO_IMAGE_TEXT) || el;
  function imageBoxChecks(pairs) {
    pairs.forEach(([id, name]) => byId(id, name, el => {
      if (!hasImage(el)) paint(noImageTarget(el), SEV.noImage, 'No image uploaded', name);
    }));
  }
  function networkProfileImageCheck(state) {
    byId('profile_image', 'Profile image', card => {
      const field = card.querySelector(':scope > div:nth-of-type(2)');
      const uploaded = field && hasImage(field);
      if (state === 'match' && !uploaded) {
        paint(noImageTarget(field || card), SEV.noImage, 'No image uploaded', 'Profile image');
      } else if (state === 'possible' && uploaded) {
        paint(field, SEV.possibleImage, 'An image is uploaded on a possible match');
      }
    });
  }

  // ---- screenshots container / rows ----
  const screenshotRoots = () => [...new Set(document.querySelectorAll('[id="screenshots"], div[screenshots]'))].filter(e => !e.closest(CFG.EXCLUDE));
  function screenshotRows(roots = screenshotRoots()) {
    const rows = [];
    roots.forEach(root => root.querySelectorAll('tbody > tr').forEach(r => {
      if (r.closest(CFG.EXCLUDE)) return;
      const text = r.textContent.replace(/\s+/g, ' ').trim();
      const real = r.querySelector('a,img') || (r.children.length > 1 && !/^no\b/i.test(text));   // not an empty-state row
      if (real) rows.push(r);
    }));
    return rows;
  }
  function renderScreenshotStatus() {
    const totals = document.querySelector('#screenshots > div:nth-of-type(2) > div:first-child');
    if (!totals || totals.closest(CFG.EXCLUDE)) return;
    const root = totals.closest('#screenshots');
    let uploadedScreenshots = null;
    for (const counter of totals.children) {
      const match = counter.textContent.trim().match(/^([\d,]+)\s+(screenshots?|videos?)\s+uploaded$/i);
      if (!match) continue;
      counter.classList.add('smrb-upload-counter');
      if (/^screenshot/i.test(match[2])) uploadedScreenshots = Number(match[1].replace(/,/g, ''));
    }
    totals.classList.add('smrb-upload-totals');
    let metadata = 0;
    let urls = 0;
    const missingMetadata = [];
    const missingUrls = [];
    const expectsUrls = on('noUrl');
    screenshotRows([root]).forEach(row => {
      const cell = metadataCell(row);
      const hasMetadata = cell && RE.metadata.test(cell.textContent);
      if (hasMetadata) metadata++;
      const urlsBeforeRow = urls;

      const files = new Set(otherFileLinks(row).filter(link => {
        const extension = fileLinkName(link).split('.').pop().toLowerCase();
        return FILE_EXT.has(extension);
      }));
      row.querySelectorAll('a[href]').forEach(link => {
        if (!link.closest('button,[data-bs-target]') && !files.has(link) && hrefKey(link)) urls++;
      });

      const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.parentElement || node.parentElement.closest(URL_SKIP + ',script,style')) continue;
        for (const match of node.nodeValue.matchAll(RE.url)) {
          if (textUrlKey(match)) urls++;
        }
      }
      const previews = [...row.querySelectorAll('[data-bs-target="#screenshotViewer"]')];
      const hasScreenshot = previews.some(preview => CFG.FILE_OK.test(preview.textContent.trim()));
      const videoOnly = !hasScreenshot && (previews.some(preview => /\.mp4$/i.test(preview.textContent.trim()))
        || [...files].some(link => /\.mp4$/i.test(fileLinkName(link))));
      if (videoOnly) return;
      if (!hasMetadata) missingMetadata.push(row);
      if (expectsUrls && urls === urlsBeforeRow) missingUrls.push(row);
    });

    const metadataTotal = document.createElement('div');
    metadataTotal.dataset.smrbScreenshotStatus = '1';
    metadataTotal.className = 'smrb-upload-counter';
    metadataTotal.textContent = `${metadata} metadata file${metadata === 1 ? '' : 's'} uploaded`;
    if (uploadedScreenshots !== null && metadata < uploadedScreenshots) {
      const missing = uploadedScreenshots - metadata;
      metadataTotal.classList.add('smrb-metadata-shortfall');
      metadataTotal.textContent += ` · ${missing} missing`;
    }
    const urlTotal = document.createElement('div');
    urlTotal.dataset.smrbScreenshotStatus = '1';
    urlTotal.className = 'smrb-upload-counter';
    urlTotal.textContent = `${urls} URL${urls === 1 ? '' : 's'} added`;
    const sortOrder = [...totals.children].find(child => /^sort order\s*:/i.test(child.textContent.trim()));
    totals.insertBefore(screenshotCounterRow(metadataTotal, missingMetadata, 'metadata'), sortOrder ?? null);
    totals.insertBefore(screenshotCounterRow(urlTotal, missingUrls, 'URL'), sortOrder ?? null);
  }

  function screenshotCounterRow(counter, rows, label) {
    if (!rows.length) return counter;
    delete counter.dataset.smrbScreenshotStatus;
    const line = document.createElement('div');
    line.dataset.smrbScreenshotStatus = '1';
    line.className = 'smrb-counter-line';
    const buttons = rows.map(row => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Row ${rowNum(row)}`;
      button.addEventListener('click', () => {
        if (row.isConnected) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      return button;
    });
    const count = document.createElement('span');
    count.className = 'smrb-missing-count';
    count.textContent = String(rows.length);
    count.setAttribute('aria-label', `${rows.length} rows missing ${label}`);
    line.append(counter, count, browseItems(buttons, `rows missing ${label}`));
    return line;
  }

  function browseItems(buttons, label) {
    const nav = document.createElement('div');
    nav.className = 'smrb-row-nav';
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', label);
    const items = document.createElement('div');
    items.className = 'smrb-nav-items';
    nav.append(items);
    const visibleCount = 3;
    let start = 0;
    function showItems() {
      items.replaceChildren(...buttons.slice(start, start + visibleCount));
    }
    if (buttons.length > visibleCount) {
      const lastStart = buttons.length - visibleCount;
      const arrow = (text, direction, step) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'smrb-nav-arrow';
        button.textContent = text;
        button.setAttribute('aria-label', `${direction} ${label}`);
        button.addEventListener('click', () => {
          start = (start + step + lastStart + 1) % (lastStart + 1);
          showItems();
        });
        return button;
      };
      nav.prepend(arrow('‹', 'Previous', -1));
      nav.append(arrow('›', 'Next', 1));
    }
    showItems();
    return nav;
  }

  function renderCalloutStatus() {
    const summary = [...document.querySelectorAll('section h3')]
      .find(heading => norm(heading.textContent) === 'callout summary' && !heading.closest(CFG.EXCLUDE))
      ?.closest('section');
    const before = summary || screenshotRoots()[0];
    const anchor = before || scanned('webformSection')[0];
    if (!anchor) return;
    const panel = document.createElement('section');
    panel.dataset.smrbScreenshotStatus = '1';
    panel.className = 'smrb-callout-status';
    const title = document.createElement('h3');
    title.textContent = 'STATUS (POSSIBLE CALLOUT) - ALL ARE JUST POSSIBLE';
    panel.append(title);
    const items = issues.filter(issue => !/\b(?:metadata|URLs?)\b/i.test(issue.label));
    if (!items.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No other callouts';
      panel.append(empty);
    }
    const totals = new Map();
    const seen = new Map();
    const sectionName = issue => issue.where === 'Profile summary' ? 'Profile - Summary' : issue.where || 'Report';
    items.forEach(issue => {
      const section = sectionName(issue);
      totals.set(section, (totals.get(section) || 0) + 1);
    });
    const buttons = items.map(issue => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `smrb-callout smrb-callout-${issue.color}`;
      const place = issue.row == null ? issue.where : `Row ${issue.row}`;
      const section = sectionName(issue);
      const number = (seen.get(section) || 0) + 1;
      seen.set(section, number);
      item.textContent = totals.get(section) > 1 ? `${section} ${number}` : section;
      item.title = [place, issue.label, issue.detail].filter(Boolean).join(' · ');
      item.setAttribute('aria-label', `${item.textContent}. ${item.title}`);
      item.addEventListener('click', () => goTo(issue.id, () => {}));
      return item;
    });
    if (buttons.length) panel.append(browseItems(buttons, 'possible callouts'));
    if (before) before.before(panel);
    else anchor.prepend(panel);
  }

  function networkScreenshotPolicy(state, google, summaries) {
    const type = modeCfg().reportType;
    const publicMedia = summaries.some(summary => PUBLIC_MEDIA.test(textOf(summary)));
    if (google && state === 'none') return null;
    if (type === 'nonbulk') return { min: 0, max: 0, details: false };
    if (type === 'std' && !google && publicMedia) return null;
    if (state === 'none') return { min: 0, max: 0, details: !urlsForbidden() };
    return {
      min: state === 'match' || (type === 'bulk' && publicMedia) ? 1 : 0,
      max: google ? (state === 'possible' ? 1 : Infinity) : (type === 'std' ? 1 : Infinity),
      details: true,
    };
  }

  function screenshotRowRules(state, policy) {
    if (!on('screenshotRows')) return;
    const roots = screenshotRoots();
    if (!roots.length) return;
    const root = roots.find(el => el.id === 'screenshots') || roots[0];
    const uploaded = root.querySelector(':scope > div:nth-of-type(2) > div:first-child')?.textContent.match(/([\d,]+)\s+screenshots?\s+uploaded/i);
    const count = uploaded ? Number(uploaded[1].replace(/,/g, '')) : screenshotRows(roots).length;
    ctx = { where: 'Screenshots', row: null };
    const callout = root.querySelector(':scope > div:nth-of-type(1)') || root;
    const detail = `${count} screenshot${count === 1 ? '' : 's'} uploaded`;
    if (count < policy.min) {
      paint(callout, SEV.screenshotRows, 'No screenshot uploaded (at least one is required)');
    } else if (count > policy.max) {
      const label = policy.max === 0
        ? (state === 'none' ? 'Screenshots are uploaded but there is no match' : 'STD (Non-Bulk) allows no screenshots on Networks')
        : 'At most one screenshot is allowed on this network';
      paint(callout, SEV.screenshotRows, label, detail);
    }
  }

  // ---- #match_results state ----
  function matchState() {
    const field = document.querySelector('#match_results > div:nth-of-type(2)');
    const result = norm(field?.textContent);
    if (NO_MATCH_LINE.test(result)) return 'none';
    if (/^possible match found(?:\s*\.)?$/.test(result)) return 'possible';
    if (/^match found(?:\s*\.)?$/.test(result)) return 'match';
    return null;
  }

  // ================= Page: /profile_information =================
  function profileInformationChecks() {
    if (on('images')) imageBoxChecks([['profile_image', 'Profile image'], ['map_view', 'Map view'], ['street_view', 'Street view']]);
    if (on('relatives')) relativesChecks();
  }

  // ================= Page: /report_summaries =================
  function reportSummariesChecks() {
    // #attachments: nothing to do (it is in CFG.EXCLUDE)
    if (on('formatting')) byId('report_highlights', 'Report highlights', el => bodiesOf(el).forEach(wrapFormatting));   // regular formatting only
    if (on('placeholders')) placeholderChecks();
    if (on('orangeText')) orangeTextChecks();
    if (on('mediaLinks')) mediaLinkChecks();                                                                          // unfilled {Placeholder} in a coloured span
    screenshotChecks();                                                                                                   // as usual: URL, metadata ...
  }

  // ================= Page: /networks/<id> =================
  function networksChecks(state, google, summaries, policy) {
    const noPersonal = [...document.querySelectorAll('[id="profile_summary"]')].some(e => /nopersonalmatchfound/.test(letters(textOf(e))));

    // #profile_image
    if (on('images') && (state === 'match' || state === 'possible')) networkProfileImageCheck(state);

    // #profile_link (no markings on "No match found")
    if (state !== 'none' && (on('profileLink') || on('urls'))) {
      byId('profile_link', 'Profile link', el => {
        if (on('profileLink') && !noPersonal) {
          bodiesOf(el).forEach(b => wrapText(b, RE.noProfileLink, () => ({ color: SEV.noProfileLink, label: 'No profile link' })));
        }
        if (on('urls')) urlChecks(el);
      });
    }

    // #profile_summary
    summaries.forEach(el => {
      ctx = { where: 'Profile summary', row: null };
      const summary = norm(textOf(el).replace(/[\u200B-\u200D\uFEFF]/g, ''));
      const noMatch = NO_MATCH_LINE.test(summary);
      const expected = {
        match: [/^(?:identified|match)\b/, 'Profile summary must start with “Identified” or “Match”'],
        possible: [/^possible\b/, 'Profile summary must start with “Possible”'],
        none: [NO_MATCH_LINE, 'Profile summary must say “No match found.”'],
      }[state];
      if (expected && on('profileSummary') && !expected[0].test(summary)) {
        paint(bodiesOf(el)[0], SEV.noMatchSummary, expected[1]);
      }
      if (noMatch) return;
      if (on('formatting')) bodiesOf(el).forEach(wrapFormatting);   // anything else: the usual checks
      if (on('socmedLinks')) bodiesOf(el).forEach(socmedLinkChecks);
      if (on('sameParen')) bodiesOf(el).forEach(sameParenChecks);
    });
    if (state !== 'none' && on('linkInSummary')) linkInSummaryChecks();
    if (on('placeholders')) placeholderChecks();
    if (on('orangeText')) orangeTextChecks();
    if (on('mediaLinks')) mediaLinkChecks();
    // image name <-> hyperlinked text: only for the Google network page, and only when switched on in the popup
    if (on('businessPage')) businessPageChecks();                                                                           // header (BA) -> "Identified Business Page"
    if (google && state !== 'none' && on('googleImage') && settings.googleMatch) sourceImageChecks();

    // #screenshots
    if (!policy) return;
    screenshotRowRules(state, policy);
    if (policy.details) screenshotChecks();
  }

  function byId(id, where, fn) {
    scanned(id).forEach(el => { ctx = { where, row: null }; fn(el); });
  }

  // ================= Run / clear =================
  function clear() {
    document.querySelectorAll('[data-smrb-screenshot-status]').forEach(el => el.remove());
    document.querySelectorAll('.smrb-upload-totals, .smrb-upload-counter').forEach(el => {
      el.classList.remove('smrb-upload-totals', 'smrb-upload-counter');
    });
    document.querySelectorAll('span[data-smrb-wrap]').forEach(s => {
      const p = s.parentNode;
      s.replaceWith(document.createTextNode(s.textContent));
      if (p) p.normalize();
    });
    document.querySelectorAll('.smrb-mark').forEach(e =>
      e.classList.remove('smrb-mark', 'smrb-red', 'smrb-orange', 'smrb-yellow', 'smrb-blank', 'smrb-pre', 'smrb-flash'));
    document.querySelectorAll('[data-smrb-i]').forEach(e => e.removeAttribute('data-smrb-i'));
    document.querySelectorAll('[data-smrb-tip]').forEach(e => {
      if (e.dataset.smrbT0 !== undefined) e.setAttribute('title', e.dataset.smrbT0); else e.removeAttribute('title');
      delete e.dataset.smrbTip; delete e.dataset.smrbT0;
    });
    tipMap.clear();
  }

  function run() {
    if (observer) observer.disconnect();
    clear();
    issues = []; seq = 0; ctx = { where: '', row: null }; elById = new Map();
    if (!settings.enabled) return;
    const page = pageType();
    const state = page === 'networks' ? matchState() : null;
    const google = page === 'networks' && isGoogleNetwork();
    const summaries = page === 'networks' ? scanned('profile_summary') : [];
    const policy = page === 'networks' ? networkScreenshotPolicy(state, google, summaries) : null;
    if (page === 'profile_information') profileInformationChecks();
    else if (page === 'report_summaries') reportSummariesChecks();
    else if (page === 'networks') networksChecks(state, google, summaries, policy);
    if (page === 'report_summaries' || policy?.details) {
      renderScreenshotStatus();
    }
    if (page !== 'other') renderCalloutStatus();
    observe();
  }

  function observe() {
    if (!observer) {
      observer = new MutationObserver(records => {
        if (records.every(({ target }) => (target.nodeType === 1 ? target : target.parentElement)?.closest('[data-smrb-screenshot-status]'))) return;
        clearTimeout(timer);
        timer = setTimeout(run, 250);
      });
    }
    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true, attributeFilter: ['href', 'src', 'style', 'data-bs-target'],
    });
  }

  // ================= Scroll to a finding =================
  // Open anything that could be hiding the element (details, bootstrap collapse, inactive tab)
  function reveal(el) {
    for (let p = el.parentElement; p; p = p.parentElement) {
      if (p.tagName === 'DETAILS' && !p.open) p.open = true;
      if (p.classList.contains('collapse') && !p.classList.contains('show')) p.classList.add('show');
      if (p.classList.contains('tab-pane') && !p.classList.contains('active') && p.id) {
        const sel = `[data-bs-target="#${CSS.escape(p.id)}"],a[href="#${CSS.escape(p.id)}"]`;
        const t = document.querySelector(sel);
        if (t) t.click();
      }
    }
  }
  function goTo(id, done) {
    const find = () => elById.get(id) || document.querySelector(`[data-smrb-i="${id}"]`);
    const first = find();
    if (!first) { done({ ok: false, reason: 'missing' }); return; }
    reveal(first);
    // the page may re-render after a tab/collapse opens, so look the element up again
    setTimeout(() => {
      const el = find() || first;
      if (!el.isConnected || !el.getClientRects().length) { done({ ok: false, reason: 'hidden' }); return; }
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      el.classList.add('smrb-flash');
      setTimeout(() => el.classList.remove('smrb-flash'), 2600);
      done({ ok: true });
    }, 250);
  }

  // ================= Wiring =================
  chrome.storage.sync.get({ enabled: true, mode: 'bulk_rh', googleMatch: true, hoverHints: false, sameIgnoredWords: [] }, v => {
    settings.enabled = v.enabled;
    settings.hoverHints = v.hoverHints;
    settings.sameIgnoredWords = v.sameIgnoredWords;
    settings.mode = v.mode;
    settings.googleMatch = v.googleMatch;
    run();
  });
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'sync') return;
    if (ch.enabled) settings.enabled = ch.enabled.newValue ?? true;
    if (ch.mode) settings.mode = ch.mode.newValue;
    if (ch.googleMatch) settings.googleMatch = ch.googleMatch.newValue;
    if (ch.hoverHints) settings.hoverHints = ch.hoverHints.newValue;
    if (ch.sameIgnoredWords) settings.sameIgnoredWords = ch.sameIgnoredWords.newValue ?? [];
    run();
  });
})();
