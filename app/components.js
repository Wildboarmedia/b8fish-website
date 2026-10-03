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
        <button class="btn btn-outline-accent">${esc(hero.secondaryCta.label)}</button>
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

// ---------- patterns emerging ----------
function renderPatternGrid(patterns) {
  return `
    <div class="pattern-grid">
      ${patterns.map(p => `
        <div class="pattern-card">
          <div class="top-row">
            <div class="title">${esc(p.title)}</div>
            <div class="metric">${esc(p.metric)}</div>
          </div>
          <div class="desc">${esc(p.desc)}</div>
          ${renderConfidenceMeter(p.filled, p.conf)}
        </div>
      `).join("")}
    </div>
  `;
}

function renderConfidenceMeter(filled, label) {
  const segs = [0, 1, 2, 3].map(i => `<span class="${i < filled ? "is-filled" : ""}"></span>`).join("");
  return `
    <div class="confidence-meter">
      <div class="segments">${segs}</div>
      <span class="conf-label">${esc(label)}</span>
    </div>
  `;
}

// ---------- bite clock ----------
function renderBiteClock(bc) {
  const max = Math.max(...bc.values, 1);
  const cols = bc.hours.map((h, i) => {
    const v = bc.values[i];
    const isPrime = bc.primeHours.includes(h);
    const barClass = v === 0 ? "" : (isPrime ? "is-prime" : "is-other");
    const height = v === 0 ? 3 : Math.max(10, Math.round((v / max) * 180));
    const tick = bc.tickHours.includes(h) ? h : "";
    return `
      <div class="col">
        <span class="cap">${v > 0 ? v : ""}</span>
        <div class="bar ${barClass}" style="height:${height}px" title="${esc(h)} · ${v} catches"></div>
        <span class="tick">${esc(tick)}</span>
      </div>
    `;
  }).join("");

  return `
    <div class="bite-clock">${cols}</div>
    <div class="chart-legend">
      <span class="key"><span class="swatch" style="background:var(--accent)"></span>Your prime window, 8–noon</span>
      <span class="key"><span class="swatch" style="background:var(--series-blue)"></span>Other catches</span>
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

// ---------- lure performance table ----------
function renderLureTable(lures) {
  return `
    <div class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>Lure</th><th class="num">Fish</th><th class="num">Avg len</th>
            <th>Best fish</th><th>Water</th><th>Retrieve</th>
          </tr>
        </thead>
        <tbody>
          ${lures.map(l => `
            <tr>
              <td class="strong">${l.lead ? '<span class="lead-dot"></span>' : ""}${esc(l.name)}</td>
              <td class="num">${esc(l.fish)}</td>
              <td class="num muted">${esc(l.avgLen)}</td>
              <td>${esc(l.bestFish)}</td>
              <td class="muted">${esc(l.water)}</td>
              <td class="muted">${esc(l.retrieve)}</td>
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

// ---------- info tile grid (conditions / bite-turn-on / compare) ----------
function renderTileGrid(tiles, cols) {
  return `
    <div class="tile-grid cols-${cols}">
      ${tiles.map(t => `
        <div class="info-tile">
          <div class="tile-label">${esc(t.label)}</div>
          <div class="tile-value">${esc(t.value)}</div>
          <div class="tile-sub">${esc(t.sub)}</div>
        </div>
      `).join("")}
    </div>
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

// ---------- Lake Intel: bite window heatmap ----------
function renderHeatmap(bw) {
  const allValues = bw.days.flatMap(d => d.values);
  const max = Math.max(...allValues, 1);
  const colHeads = bw.timeBlocks.map(t => `<div class="col-head">${esc(t)}</div>`).join("");
  const rows = bw.days.map(day => {
    const cells = day.values.map(v => {
      const opacity = 0.12 + (v / max) * 0.88;
      const textColor = opacity >= 0.7 ? "var(--bg-board)" : "var(--text-primary)";
      return `<div class="cell" style="background:rgba(145,132,217,${opacity.toFixed(2)});color:${textColor}">${v}</div>`;
    }).join("");
    return `<div class="row-head">${esc(day.label)}</div>${cells}`;
  }).join("");

  return `<div class="heatmap"><div></div>${colHeads}${rows}</div>`;
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
