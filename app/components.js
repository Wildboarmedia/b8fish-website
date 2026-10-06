// Reusable render functions for the app/ routes. Each function takes plain
// data (see data.js) and returns an HTML string. Kept framework-free to
// match the rest of the site; swap data.js for live Supabase queries later
// without touching any of this.

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : String(str);
  return d.innerHTML;
}

// ---------- header ----------
// userEmail: pass the signed-in user's email (from requireSession()'s
// session.user.email) so the avatar shows real initials and sign-out
// works. Omit it only for contexts with no session (there currently are
// none — every app/ page is guarded by session.js before this is called).
function renderHeader(activeRoute, userEmail) {
  const navItems = [
    { label: "My Catches", href: "my-catches.html", route: "my-catches" },
    { label: "Patterns", href: "#", route: "patterns" },
    { label: "Lures", href: "lures.html", route: "lures" },
    { label: "Lake Intel", href: "lake-intel.html", route: "lake-intel" },
  ];
  const nav = navItems.map(item => `
    <a href="${item.href}"${item.route === activeRoute ? ' aria-current="page"' : ""}>${esc(item.label)}</a>
  `).join("");

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "—";

  return `
    <header class="app-header">
      <div class="header-left">
        <a href="my-catches.html" class="brand">
          <img src="../assets/nav-logo.png" alt="" width="36" height="36" />
          b8fish
        </a>
        <nav class="main-nav" aria-label="Main">${nav}</nav>
      </div>
      <div class="header-right">
        <a href="#" class="btn btn-accent"><span class="btn-label-full">+ Log a catch</span></a>
        <button class="avatar-btn" id="account-avatar-btn" aria-label="${userEmail ? "Signed in as " + esc(userEmail) + " — sign out" : "Account"}" title="${userEmail ? esc(userEmail) + " — click to sign out" : ""}">${esc(initials)}</button>
      </div>
    </header>
  `;
}

// Wires the avatar button's sign-out click. Call after mounting
// renderHeader()'s HTML into the DOM (signOut() lives in session.js).
function wireHeaderSignOut() {
  const btn = document.getElementById("account-avatar-btn");
  if (btn) btn.addEventListener("click", signOut);
}

// ---------- KPI grid ----------
function renderKpiGrid(kpis) {
  return `
    <div class="kpi-grid">
      ${kpis.map(k => `
        <div class="kpi-card">
          <div class="kpi-label">${esc(k.label)}</div>
          <div class="kpi-value">
            <span class="n">${esc(k.value)}</span>
            ${k.unit ? `<span class="unit">${esc(k.unit)}</span>` : ""}
          </div>
          <div class="kpi-sub">${esc(k.sub)}</div>
        </div>
      `).join("")}
    </div>
  `;
}

// ---------- hero insight panel ----------
function renderHeroInsight(hero) {
  return `
    <section class="hero-insight">
      <div class="hero-copy">
        <div class="hero-kicker">${esc(hero.kicker)}</div>
        <h1>${esc(hero.headline)}</h1>
        <p>${esc(hero.body)}</p>
      </div>
      <div class="hero-actions">
        <a href="${hero.primaryCta.href}" class="btn btn-accent btn-lg">${esc(hero.primaryCta.label)}</a>
        <a href="${hero.secondaryCta.href}" class="btn btn-outline-accent">${esc(hero.secondaryCta.label)}</a>
      </div>
    </section>
  `;
}

// ---------- filter / quick chips ----------
// f.key is optional — set it when the chip needs to be wired up to do
// something on click (see wireMapChips below); omit it for the purely
// decorative filter rows that don't do anything yet.
function renderFilterChips(filters) {
  return `
    <div class="filter-row">
      ${filters.map(f => `<button class="btn btn-filter${f.active ? " is-active" : ""}"${f.key != null ? ` data-key="${esc(f.key)}"` : ""}>${esc(f.label)}</button>`).join("")}
    </div>
  `;
}

// ---------- generic horizontal bar list ----------
// items: [{ name, n, valueLabel?, tone }] — tone: "lead" | "alt" | "default"
function renderHbarList(items) {
  const max = Math.max(...items.map(i => i.n), 1);
  const toneClass = t => t === "lead" ? "is-lead" : t === "alt" ? "is-alt" : "";
  return `
    <div class="hbar-list">
      ${items.map(i => `
        <div class="hbar-row">
          <div class="label-row">
            <span class="name">${esc(i.name)}</span>
            <span class="val">${esc(i.valueLabel != null ? i.valueLabel : i.n)}</span>
          </div>
          <div class="hbar-track">
            <div class="hbar-fill ${toneClass(i.tone)}" style="width:${Math.max(4, (i.n / max) * 100)}%"></div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// ---------- lures inventory table (the real Lures page) ----------
// Distinct from renderLureTable() above, which shows per-lure *catch
// performance* stats on My Catches — this shows the full real tackle-box
// inventory as synced from the app (no photos: those never sync; no
// commerce/affiliate fields yet: deliberately out of scope for now).
function renderLuresTable(lures) {
  return `
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>Lure</th><th>Color</th><th>Type</th><th>Size</th><th>Weight</th>
            <th>Hooks</th><th>Depth range</th><th>Diving depth</th>
            <th class="num">Stock</th><th>Tied on</th><th>Notes</th><th>Added</th>
          </tr>
        </thead>
        <tbody>
          ${lures.map(l => `
            <tr>
              <td class="strong">${l.isTiedOn ? '<span class="lead-dot"></span>' : ""}${esc(l.brand)} ${esc(l.modelName)}</td>
              <td class="muted">${esc(l.colorPattern)}</td>
              <td class="muted">${esc(l.type)}</td>
              <td class="muted">${esc(l.size)}</td>
              <td class="muted">${esc(l.weight)}</td>
              <td class="muted">${esc(l.hooksDescription)}</td>
              <td class="muted">${esc(l.depthRange)}</td>
              <td class="muted">${esc(l.divingDepth)}</td>
              <td class="num">${esc(l.stockCount)}</td>
              <td class="muted">${l.isTiedOn ? "Yes" : "—"}</td>
              <td class="muted">${esc(l.patternNotes || "—")}</td>
              <td class="mono muted">${esc(l.dateAddedDisplay)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ---------- catch log table ----------
// Rows are clickable through to edit-catch.html — call wireCatchLogRows()
// after mounting this (see components.js bottom) to wire the clicks.
function renderCatchLogTable(rows) {
  return `
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>When</th><th>Species</th><th>Size</th><th>Lure</th>
            <th>Retrieve</th><th class="num">Depth</th><th>Water</th><th>Conditions</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr class="is-clickable" data-catch-id="${esc(r.id)}" tabindex="0">
              <td class="mono">${esc(r.date)}<span class="time-sub mono">${esc(r.time)}</span></td>
              <td class="strong">${esc(r.species)}</td>
              <td class="mono">${esc(r.size)}</td>
              <td>${esc(r.lure)}</td>
              <td class="muted">${esc(r.retrieve)}</td>
              <td class="num">${esc(r.depth)}</td>
              <td class="muted">${esc(r.water)}</td>
              <td class="muted">${esc(r.conditions)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// Wires a map's location chips (rendered by renderFilterChips with f.key
// set on each item — see buildMap's chips output). onSelect(key) is
// called with the clicked chip's key; the page script owns rebuilding
// and re-rendering the map + chips for that key (see my-catches.html's
// renderMap()). Re-call this after every re-render, since the chips'
// own HTML (and therefore their listeners) gets replaced each time.
function wireMapChips(mountId, onSelect) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.querySelectorAll(".btn-filter[data-key]").forEach(btn => {
    btn.addEventListener("click", () => onSelect(btn.dataset.key));
  });
}

// Wires catch-log rows (rendered by renderCatchLogTable above) so clicking
// or Enter-ing a row opens that catch's edit page. Call after mounting.
function wireCatchLogRows() {
  document.querySelectorAll("table.data-table tr.is-clickable[data-catch-id]").forEach(row => {
    const go = () => { location.href = `edit-catch.html?id=${encodeURIComponent(row.dataset.catchId)}`; };
    row.addEventListener("click", go);
    row.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  });
}

// A few gentle sine-wave ripples spanning the canvas — a generic "this is
// water" texture, not a real shoreline (we have no coastline data for an
// arbitrary real lat/lng, so drawing an actual lake outline would
// misrepresent it). Procedural, so it never looks the same twice but
// always reads as water regardless of where the real dots land.
function waterRipples(width, height) {
  const lineCount = 5;
  const pointsPerLine = 24;
  let svg = "";
  for (let i = 0; i < lineCount; i++) {
    const yBase = height * ((i + 0.5) / lineCount);
    const amplitude = 7 + (i % 3) * 3;
    const wavelength = width / (2.2 + (i % 2) * 0.6);
    const phase = i * 1.7;
    let pts = [];
    for (let p = 0; p <= pointsPerLine; p++) {
      const x = (width / pointsPerLine) * p;
      const y = yBase + Math.sin((x / wavelength) * Math.PI * 2 + phase) * amplitude;
      pts.push(`${Math.round(x)},${Math.round(y)}`);
    }
    svg += `<polyline points="${pts.join(" ")}" fill="none" stroke="var(--accent)" stroke-opacity="${0.32 - i * 0.03}" stroke-width="2" stroke-linecap="round"></polyline>`;
  }
  return svg;
}

// ---------- stylized lake map (shared by My Catches + Lake Intel) ----------
function renderLakeMap(map) {
  const ripples = waterRipples(map.width, map.height);
  const shoreline = map.shoreline.map(points => `
    <polyline points="${points}" fill="none" stroke="var(--map-land)" stroke-width="${map._strokeWide || 50}" stroke-linecap="round" stroke-linejoin="round"></polyline>
  `).join("");
  const shorelineEdge = map.shoreline.map(points => `
    <polyline points="${points}" fill="none" stroke="var(--map-land-edge)" stroke-width="2.4" stroke-dasharray="4 6" stroke-linecap="round"></polyline>
  `).join("");
  const heatZones = (map.heatZones || []).map(z => `
    <circle cx="${z.cx}" cy="${z.cy}" r="${z.r1}" fill="var(--series-orange)" fill-opacity="${z.o1}"></circle>
    <circle cx="${z.cx}" cy="${z.cy}" r="${z.r2}" fill="var(--series-orange)" fill-opacity="${z.o2}"></circle>
  `).join("");
  const dots = map.dots.map(d => `
    <circle cx="${d.cx}" cy="${d.cy}" r="${d.r}" fill="var(--accent)" stroke="var(--bg-board)" stroke-width="3"></circle>
    ${d.label ? `<text x="${d.cx}" y="${d.cy + 5}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="13" font-weight="600" fill="var(--bg-board)">${esc(d.label)}</text>` : ""}
  `).join("");
  const callouts = (map.callouts || []).map(c => `
    <text x="${c.x}" y="${c.y}" font-family="IBM Plex Sans, sans-serif" font-size="13" fill="var(--text-primary)">${esc(c.text)}</text>
  `).join("");

  const legend = (map.legend || []).map(l => `
    <span class="key"><span class="swatch" style="background:${l.color}"></span>${esc(l.label)}</span>
  `).join("");

  return `
    <div class="map-card-canvas">
      <svg width="${map.width}" height="${map.height}" viewBox="0 0 ${map.width} ${map.height}" role="img" aria-label="Stylized map of ${esc(map.water || "the lake")}">
        ${ripples}${shoreline}${shorelineEdge}${heatZones}${dots}${callouts}
      </svg>
    </div>
    <div class="chart-legend">${legend}</div>
  `;
}

// ---------- warn callout ----------
function renderWarnCallout(data) {
  const href = data.firstMissingId ? `edit-catch.html?id=${encodeURIComponent(data.firstMissingId)}` : "#";
  return `
    <div class="callout-warn">
      <span>${esc(data.text)}</span>
      <a class="btn" href="${href}">${esc(data.cta)}</a>
    </div>
  `;
}

// ---------- Lake Intel: search head ----------
function renderLakeSearch(search) {
  return `
    <div class="lake-search">
      <label for="lake-search-input">${esc(search.label)}</label>
      <div class="search-row">
        <input id="lake-search-input" type="text" placeholder="${esc(search.placeholder)}" />
        <button class="btn btn-accent">Search</button>
      </div>
      <div class="chip-row">
        ${search.quickLakes.map(l => `<button class="btn">${esc(l)}</button>`).join("")}
      </div>
    </div>
  `;
}

// ---------- heat grid (Lake Intel bite window; My Catches lure/retrieve
// by depth) ----------
// bw.days[].values entries of 0 draw as a dashed empty cell rather than a
// faint-but-present fill — on My Catches that distinction is the point:
// an empty cell is a combination never tried, not just a rare one.
function renderHeatmap(bw) {
  const allValues = bw.days.flatMap(d => d.values);
  const max = Math.max(...allValues, 1);
  const colHeads = bw.timeBlocks.map(t => `<div class="col-head">${esc(t)}</div>`).join("");
  const rows = bw.days.map(day => {
    const cells = day.values.map(v => {
      if (!v) return `<div class="cell empty" aria-label="none"></div>`;
      const opacity = 0.12 + (v / max) * 0.88;
      const textColor = opacity >= 0.7 ? "var(--bg-board)" : "var(--text-primary)";
      return `<div class="cell" style="background:rgba(145,132,217,${opacity.toFixed(2)});color:${textColor}">${v}</div>`;
    }).join("");
    return `<div class="row-head">${esc(day.label)}</div>${cells}`;
  }).join("");

  return `<div class="heatmap"><div></div>${colHeads}${rows}</div>`;
}

// ---------- My Catches: depth through the day (the signature chart) ----------
// Ported from waterColumn() in the reference prototype. xMode: "clock" or
// "sunrise" (hours after sunrise). rows must have a numeric depth_ft to
// be plotted; rows with no depth are silently skipped, same as the
// prototype (a sparse/no-depth account just gets an empty panel below).
function renderWaterColumn(rows, xMode) {
  const pts = rows.filter(r => has(r.depth_ft));
  if (!pts.length) return `<p class="muted" style="padding:24px 0;">No catches with a depth logged yet.</p>`;
  const W = 1100, H = 430, L = 58, R = 70, T = 40, B = 16;
  const xv = r => xMode === "clock" ? r.local_hour : r.local_hour - r.sunrise_hour;
  const x0 = Math.floor(Math.min(...pts.map(xv)) - 0.25), x1 = Math.ceil(Math.max(...pts.map(xv)) + 0.25);
  const yMax = Math.max(20, Math.ceil((Math.max(...pts.map(r => r.depth_ft)) + 2) / 5) * 5);
  const X = v => L + (v - x0) / (x1 - x0) * (W - L - R), Y = d => T + d / yMax * (H - T - B);
  const best = Math.max(...pts.map(r => r.weight_lbs || 0));
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Catches plotted by time of day and depth">
    <defs><linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--bg-surface-2)"/><stop offset="1" stop-color="var(--bg-surface-3)"/></linearGradient></defs>
    <rect x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" rx="10" fill="url(#water)"/>`;
  for (let d = 0; d <= yMax; d += 5) {
    s += `<text x="${L - 10}" y="${Y(d) + 4}" text-anchor="end">${d === 0 ? "Surface" : d + " ft"}</text>`;
    if (d > 0 && d < yMax) s += `<line x1="${L}" x2="${W - R}" y1="${Y(d)}" y2="${Y(d)}" stroke="var(--border)" stroke-opacity=".55"/>`;
  }
  for (let h = x0; h <= x1; h++) {
    const label = xMode === "clock" ? clockTime(h).replace(":00", "") : (h === 0 ? "Sunrise" : (h > 0 ? "+" : "") + h + " h");
    s += `<text x="${X(h)}" y="${T - 12}" text-anchor="middle">${label}</text>
          <line x1="${X(h)}" x2="${X(h)}" y1="${T}" y2="${T + 6}" stroke="var(--text-secondary)"/>`;
  }
  groupBy(pts, r => r.local_date).forEach((v) => {
    if (v.length > 1) s += `<polyline fill="none" stroke="var(--text-primary)" stroke-opacity=".38" stroke-width="1.5" points="${v.map(r => X(xv(r)) + "," + Y(r.depth_ft)).join(" ")}"/>`;
  });
  pts.forEach(r => {
    const c = speciesColor(r.species);
    const rad = has(r.weight_lbs) ? 5 + 2.2 * r.weight_lbs : 5.5;
    const isBest = has(r.weight_lbs) && r.weight_lbs === best;
    if (isBest) s += `<circle cx="${X(xv(r))}" cy="${Y(r.depth_ft)}" r="${rad + 5}" fill="none" stroke="var(--accent-hover)" stroke-width="3"/>`;
    s += `<circle class="dot" tabindex="0" data-id="${esc(r.id)}" cx="${X(xv(r))}" cy="${Y(r.depth_ft)}" r="${rad}"
      fill="${has(r.weight_lbs) ? c : "var(--bg-surface)"}" fill-opacity=".92" stroke="${has(r.weight_lbs) ? "var(--bg-surface)" : c}" stroke-width="${has(r.weight_lbs) ? 1.5 : 2.5}"
      aria-label="${esc(tipText(r).replace(/<[^>]+>/g, " "))}"/>`;
  });
  groupBy(pts, r => r.local_date).forEach((v, d) => {
    const last = v[v.length - 1], px = X(xv(last)), py = Y(last.depth_ft), bw = 54, bh = 20;
    const spots = [[px + 18, py + 5, "start"], [px - 18, py + 5, "end"], [px, py + 30, "middle"], [px, py - 20, "middle"]];
    const clear = ([tx, ty, a]) => {
      const x0b = a === "start" ? tx : a === "end" ? tx - bw : tx - bw / 2;
      return tx > L + 30 && x0b + bw < W && ty > T + 14 && !pts.some(r => r !== last && X(xv(r)) > x0b - 12 && X(xv(r)) < x0b + bw + 12 && Math.abs(Y(r.depth_ft) - (ty - 5)) < bh);
    };
    const [tx, ty, a] = spots.find(clear) || spots[0];
    s += `<text class="trip-label" x="${tx}" y="${ty}" text-anchor="${a}" paint-order="stroke" stroke="var(--bg-surface-2)" stroke-width="4" stroke-linejoin="round">${dayShort(d)}</text>`;
  });
  return s + `</svg>`;
}

// ---------- My Catches: lures table (catches, avg/biggest weight, depth
// range it caught at) ----------
function renderLuresDepthTable(rows, yMax) {
  const g = [...groupBy(rows, r => r.lure_display_name_snapshot).entries()].sort((a, b) => b[1].length - a[1].length);
  if (!g.length) return `<p class="muted">No catches in view.</p>`;
  const top = Math.max(...g.map(([, v]) => v.length));
  const body = g.map(([name, v]) => {
    const w = v.map(r => r.weight_lbs).filter(has), d = v.map(r => r.depth_ft).filter(has);
    const lo = d.length ? Math.min(...d) : null, hi = d.length ? Math.max(...d) : null;
    return `<tr>
      <td class="strong">${esc(name)}</td>
      <td><div style="height:10px;background:var(--bg-surface-2);border-radius:5px;overflow:hidden;min-width:60px"><div style="height:100%;width:${v.length / top * 100}%;background:var(--accent);border-radius:5px"></div></div></td>
      <td class="num">${v.length}</td>
      <td class="num muted">${w.length ? lb(mean(w)) : "n/a"}</td>
      <td class="num muted">${w.length ? lb(Math.max(...w)) : "n/a"}</td>
      <td>${d.length ? `<div class="range" title="${ft(lo)} to ${ft(hi)}"><span style="left:${lo / yMax * 100}%;width:${Math.max(2, (hi - lo) / yMax * 100)}%"></span></div>` : ""}</td>
      <td class="num muted">${d.length ? (lo === hi ? ft(lo) : trimNum(lo, 0) + "–" + ft(hi)) : ""}</td>
    </tr>`;
  }).join("");
  return `<div class="table-scroll"><table class="data-table" style="min-width:620px">
    <thead><tr><th>Lure</th><th colspan="2">Catches</th><th class="num">Avg weight</th><th class="num">Biggest</th><th colspan="2">Depth it caught at</th></tr></thead>
    <tbody>${body}</tbody></table></div>
    <p class="note" style="font-size:13px;color:var(--text-secondary);margin-top:10px;max-width:68ch;">This counts fish caught, so the lure you throw most will lead. b8fish does not yet know what you threw without a bite.</p>`;
}

// ---------- My Catches: weather at the catch (small multiples) ----------
function renderWeatherMulti(rows) {
  const w = rows.filter(r => has(r.sky));
  if (!w.length) return `<p class="muted">No weather was saved for these catches.</p>`;
  const tempBucket = r => Math.floor(r.air_temp_f / 10) * 10 + "s °F";
  const moonBucket = r => r.moon_pct >= 90 ? "Near full (90%+)" : r.moon_pct >= 50 ? "50 to 89% lit" : "Under 50% lit";
  const windBucket = r => r.wind_mph < 5 ? "Under 5 mph" : r.wind_mph < 10 ? "5 to 9 mph" : "10 mph and up";
  const block = (title, fn, order) => {
    const items = byValue(w, fn, order).map(i => ({ name: i.label, n: i.rows.length }));
    return `<div><h3>${esc(title)}</h3>${renderHbarList(items)}</div>`;
  };
  return `<p class="muted" style="margin-bottom:4px;">${w.length} of ${rows.length} catches have weather</p>
    <div class="weather-multi">
      ${block("Sky", r => r.sky)}
      ${block("Pressure trend", r => r.pressure_trend, ["Rising", "Steady", "Falling"])}
      ${block("Wind speed", windBucket, ["Under 5 mph", "5 to 9 mph", "10 mph and up"])}
      ${block("Wind from", r => r.wind_dir)}
      ${block("Air temperature", tempBucket, uniq(w.map(tempBucket)).sort())}
      ${block("Moon", moonBucket, ["Under 50% lit", "50 to 89% lit", "Near full (90%+)"])}
    </div>`;
}

// ---------- My Catches: size (length by species, one dot per fish) ----------
function renderSizePlot(rows) {
  const m = rows.filter(r => has(r.length_in));
  if (!m.length) return `<p class="muted">No lengths logged yet.</p>`;
  const sp = [...groupBy(m, r => r.species).entries()].sort((a, b) => b[1].length - a[1].length);
  const W = 380, rowH = 96, L = 20, R = 20, T = 6, H = T + sp.length * rowH + 30;
  const lo = Math.floor(Math.min(...m.map(r => r.length_in)) - 1), hi = Math.ceil(Math.max(...m.map(r => r.length_in)) + 1);
  const X = v => L + (v - lo) / (hi - lo) * (W - L - R);
  let s = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;max-width:${W}px" role="img" aria-label="Length of each catch by species">`;
  for (let v = lo; v <= hi; v += 2) s += `<text x="${X(v)}" y="${H - 6}" text-anchor="middle">${v} in</text><line x1="${X(v)}" x2="${X(v)}" y1="${T + 26}" y2="${H - 26}" stroke="var(--border)"/>`;
  sp.forEach(([name, v], i) => {
    const base = T + i * rowH + rowH - 18, col = speciesColor(name), seen = {};
    const avg = mean(v.map(r => r.length_in));
    s += `<text x="2" y="${T + i * rowH + 16}" style="fill:var(--text-primary);font-size:14px">${esc(sentenceCase(name))}, average ${inch(avg)}, longest ${inch(Math.max(...v.map(r => r.length_in)))}</text>
      <line x1="${X(avg)}" x2="${X(avg)}" y1="${base - 40}" y2="${base + 10}" stroke="${col}" stroke-width="2"/>`;
    v.forEach(r => { const k = r.length_in; seen[k] = (seen[k] || 0) + 1; s += `<circle cx="${X(k)}" cy="${base - (seen[k] - 1) * 13}" r="6" fill="${col}" fill-opacity=".9" stroke="var(--bg-page)" stroke-width="1.5"/>`; });
  });
  return s + `</svg>`;
}

// ---------- My Catches: trips table ----------
// Clicking a trip's date fires onTripClick(localDate) — the page re-renders
// everything above scoped to that one trip, same as clicking a species chip.
function renderTripsTable(rows) {
  const body = [...groupBy(rows, r => r.local_date).entries()].map(([d, v]) => {
    const w = v.map(r => r.weight_lbs).filter(has), dep = v.map(r => r.depth_ft).filter(has);
    const weather = v.filter(r => has(r.sky));
    const lureEntry = [...groupBy(v, r => r.lure_display_name_snapshot).entries()].sort((a, b) => b[1].length - a[1].length)[0];
    const temps = weather.map(r => r.air_temp_f);
    const wx = weather.length
      ? `${uniq(weather.map(r => r.sky)).join(" to ")}, ${Math.min(...temps) === Math.max(...temps) ? temps[0] : Math.min(...temps) + "–" + Math.max(...temps)}°F, pressure ${(weather[weather.length - 1].pressure_trend || "steady").toLowerCase()}`
      : "No weather saved";
    return `<tr>
      <td><button class="linkish-trip" data-trip="${esc(d)}" style="background:none;border:0;padding:0;font-weight:600;text-decoration:underline;text-underline-offset:3px;color:var(--accent);cursor:pointer;">${dayShort(d)}</button></td>
      <td class="num">${v.length}</td>
      <td class="num muted">${w.length ? lb(bestFive(v)) : "n/a"}</td>
      <td class="num muted">${w.length ? lb(Math.max(...w)) : "n/a"}</td>
      <td class="muted">${dep.length ? (Math.min(...dep) === Math.max(...dep) ? ft(dep[0]) : trimNum(Math.min(...dep), 0) + "–" + ft(Math.max(...dep))) : "n/a"}</td>
      <td class="muted">${clockTime(v[0].local_hour)}${v.length > 1 ? " to " + clockTime(v[v.length - 1].local_hour) : ""}</td>
      <td class="muted">${esc(wx)}</td>
      <td class="muted">${esc(lureEntry ? lureEntry[0] : "n/a")}</td>
    </tr>`;
  }).join("");
  return `<div class="table-scroll"><table class="data-table" style="min-width:640px">
    <thead><tr><th>Date</th><th class="num">Catches</th><th class="num">Best five</th><th class="num">Biggest</th><th>Depth</th><th>Bites</th><th>Weather</th><th>Most-used lure</th></tr></thead>
    <tbody>${body}</tbody></table></div>
    <p class="note" style="font-size:13px;color:var(--text-secondary);margin-top:10px;">A trip is every catch on one water on one day. Pick a date to see only that trip.</p>`;
}

// Wires trips-table date buttons (rendered by renderTripsTable above) so
// clicking a date calls onTripClick(localDate). Re-call after every
// re-render, same convention as wireMapChips.
function wireTripRows(mountId, onTripClick) {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.querySelectorAll("[data-trip]").forEach(btn => {
    btn.addEventListener("click", () => onTripClick(btn.dataset.trip));
  });
}

// Wires the water column's dot hover/focus to the floating #tip tooltip.
// Call after mounting renderWaterColumn()'s HTML.
function wireWaterColumnTooltip(mountId, rows) {
  const mount = document.getElementById(mountId);
  const tip = document.getElementById("tip");
  if (!mount || !tip) return;
  const byId = new Map(rows.map(r => [String(r.id), r]));
  mount.querySelectorAll(".dot").forEach(dot => {
    const r = byId.get(dot.dataset.id);
    if (!r) return;
    const show = e => {
      tip.innerHTML = tipText(r);
      tip.style.opacity = 1;
      const box = dot.getBoundingClientRect();
      const x = (e && e.clientX) || box.right, y = (e && e.clientY) || box.top;
      tip.style.left = Math.min(x + 14, window.innerWidth - tip.offsetWidth - 8) + "px";
      tip.style.top = Math.max(8, y - tip.offsetHeight - 12) + "px";
    };
    dot.onmousemove = show;
    dot.onfocus = () => show();
    dot.onmouseleave = dot.onblur = () => { tip.style.opacity = 0; };
  });
}

// ---------- Lake Intel: top lures this week (trend list) ----------
function renderTrendList(lures) {
  const toneClass = t => t === "up" ? "up" : t === "down" ? "down" : "flat";
  return `
    <div class="hbar-list">
      ${lures.map(l => `
        <div class="hbar-row">
          <div class="label-row">
            <span class="name">
              ${esc(l.name)}
              ${l.you ? `<span class="badge-you">${esc(l.you)}</span>` : ""}
            </span>
            <span class="trend-delta">
              <span class="${toneClass(l.trend)}">${esc(l.trendVal)}</span>
              <span class="share">${esc(l.share)}</span>
            </span>
          </div>
          <div class="hbar-track">
            <div class="hbar-fill ${l.mine ? "is-lead" : ""}" style="width:${l.widthPct}%"></div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}
