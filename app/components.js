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
    { label: "Lures", href: "#", route: "lures" },
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 12c3-5 9-6 13-3l5-3v12l-5-3c-4 3-10 2-13-3z"></path>
            <circle cx="8" cy="11" r="0.8"></circle>
          </svg>
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
function renderFilterChips(filters) {
  return `
    <div class="filter-row">
      ${filters.map(f => `<button class="btn btn-filter${f.active ? " is-active" : ""}">${esc(f.label)}</button>`).join("")}
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
            <tr>
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

// ---------- stylized lake map (shared by My Catches + Lake Intel) ----------
function renderLakeMap(map) {
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
        ${shoreline}${shorelineEdge}${heatZones}${dots}${callouts}
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
  return `
    <div class="callout-warn">
      <span>${esc(data.text)}</span>
      <button class="btn">${esc(data.cta)}</button>
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
