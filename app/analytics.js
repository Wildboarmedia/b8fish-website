// Pure reshape functions: raw Supabase rows (catches, waters) in, the
// exact shapes components.js already expects (see data.js) out. Nothing
// in components.js changes because of this file — it just replaces where
// MyCatchesData used to come from.
//
// Every section degrades to an honest low-data state (an empty-looking
// card, a "not enough data yet" string, a skipped bin) rather than
// assuming a dimension is populated — most fields here are "amend later"
// optional fields in the app, so real rows are often sparse.

// ---------- small parsing helpers ----------

function parseLeadingNumber(str) {
  if (!str) return null;
  const m = String(str).match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function mode(values) {
  const counts = new Map();
  for (const v of values) {
    if (v == null || v === "") continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best = null, bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return { value: best, count: bestCount };
}

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

const DATE_FMT = { month: "short", day: "numeric" };
const TIME_FMT = { hour: "numeric", minute: "2-digit" };

function formatDateShort(d) {
  return d.toLocaleDateString("en-US", DATE_FMT);
}

function formatTimeShort(d) {
  return d.toLocaleTimeString("en-US", TIME_FMT).replace(" ", "").replace("AM", "a").replace("PM", "p");
}

function isBassSpecies(species) {
  return /bass/i.test(species || "");
}

// ---------- section builders ----------

function buildDateRange(catches) {
  if (!catches.length) return "No catches yet";
  const dates = catches.map(c => new Date(c.timestamp)).sort((a, b) => a - b);
  const first = dates[0], last = dates[dates.length - 1];
  const fmt = { month: "short", day: "numeric", year: "numeric" };
  return `${first.toLocaleDateString("en-US", fmt)} – ${last.toLocaleDateString("en-US", fmt)}`.toUpperCase();
}

function buildFilters(waters) {
  const filters = [{ label: "All waters", active: true }];
  for (const w of waters) filters.push({ label: w.name, active: false });
  filters.push({ label: "Last 30 days", active: false }, { label: "All time", active: false });
  return filters;
}

function buildKpis(catches, waters) {
  const tripDays = new Set(catches.map(c => dayKey(new Date(c.timestamp))));
  const perTrip = tripDays.size ? (catches.length / tripDays.size) : 0;

  const withWeight = catches.filter(c => c.weight_lbs != null);
  const biggestFish = withWeight.reduce((a, b) => (b.weight_lbs > (a?.weight_lbs ?? -Infinity) ? b : a), null);
  const bassWithWeight = withWeight.filter(c => isBassSpecies(c.species));
  const biggestBass = bassWithWeight.reduce((a, b) => (b.weight_lbs > (a?.weight_lbs ?? -Infinity) ? b : a), null);

  const speciesCounts = mode(catches.map(c => c.species));
  const watersById = new Map(waters.map(w => [w.id, w.name]));

  return [
    { label: "Catches", value: String(catches.length), unit: "fish", sub: `${tripDays.size} trip${tripDays.size === 1 ? "" : "s"} · ${waters.length} water${waters.length === 1 ? "" : "s"}` },
    { label: "Per trip", value: perTrip ? perTrip.toFixed(1) : "—", unit: "avg", sub: tripDays.size ? `${catches.length} across ${tripDays.size} trips` : "No trips logged yet" },
    { label: "Biggest fish", value: biggestFish ? String(biggestFish.weight_lbs) : "—", unit: biggestFish ? "lb" : "", sub: biggestFish ? `${biggestFish.species} · ${watersById.get(biggestFish.water_id) || "unknown water"}` : "Log a weight to see this" },
    { label: "Biggest bass", value: biggestBass ? String(biggestBass.weight_lbs) : "—", unit: biggestBass ? "lb" : "", sub: biggestBass ? `${biggestBass.species} · ${watersById.get(biggestBass.water_id) || "unknown water"}` : "No weighed bass yet" },
    { label: "Species", value: String(new Set(catches.map(c => c.species)).size), unit: "", sub: speciesCounts.value ? `${speciesCounts.value} lead, ${speciesCounts.count} of ${catches.length}` : "—" },
  ];
}

function buildHero(catches, waters) {
  const watersById = new Map(waters.map(w => [w.id, w.name]));
  if (!catches.length) {
    return {
      kicker: "What's working for you right now",
      headline: "Log a few catches to start seeing your own patterns.",
      body: "Once you've logged some catches in the app, this will highlight whatever's actually working for you.",
      primaryCta: { label: "See what others are catching", href: "lake-intel.html" },
      secondaryCta: { label: "Plan my next trip", href: "plan-trip.html" },
    };
  }
  const latest = catches[0]; // already sorted desc by timestamp
  const water = watersById.get(latest.water_id);
  return {
    kicker: "Your most recent catch",
    headline: `${latest.species} on ${latest.lure_display_name_snapshot}${water ? ` at ${water}` : ""}.`,
    body: `Logged ${formatDateShort(new Date(latest.timestamp))} at ${formatTimeShort(new Date(latest.timestamp))}${latest.depth_at_catch ? `, ${latest.depth_at_catch}` : ""}${latest.conditions && latest.conditions.sky ? `, ${latest.conditions.sky.toLowerCase()}` : ""}.`,
    primaryCta: { label: "See what others are catching", href: "lake-intel.html" },
    secondaryCta: { label: "Plan my next trip", href: "plan-trip.html" },
  };
}

// Stylized (non-geographic) map: normalize real lat/lng into the SVG's
// pixel space, cluster catches that round to the same ~3-decimal
// coordinate into one dot with a count label — mirrors renderLakeMap's
// existing {cx,cy,r,label} shape.
//
// Most catches never get their own precise GPS fix — the app only sets
// Catch.latitude/longitude when a location fix already happened to be
// ready at the instant of a one-tap log, and that's best-effort, not
// guaranteed (no permission, or the fix just hadn't resolved yet). Every
// tagged Water, by contrast, has a real non-optional coordinate set once
// when it was added — so a catch missing its own fix falls back to its
// water's coordinate instead of being dropped from the map entirely.
// Catches with neither (no GPS fix and no water tagged) still can't be
// plotted — there's genuinely nothing to place them with.
// filterKey: a chip's key ("All", a water name, or "Untagged") to scope
// the map to one location; omit (or pass an unknown key) for all waters
// combined. Chips always list every location regardless of the current
// filter, so the caller can rebuild the map for whichever one gets
// clicked next — see wireMapChips() in components.js.
function buildMap(catches, waters, filterKey) {
  const watersById = new Map(waters.map(w => [w.id, w]));
  const withCoordsAll = catches
    .map(c => {
      const water = c.water_id ? watersById.get(c.water_id) : null;
      const lat = c.latitude != null ? c.latitude : (water ? water.latitude : null);
      const lng = c.longitude != null ? c.longitude : (water ? water.longitude : null);
      return { ...c, _mapLat: lat, _mapLng: lng, _groupKey: c._waterName || "Untagged" };
    })
    .filter(c => c._mapLat != null && c._mapLng != null);
  const width = 580, height = 300, pad = 40;

  if (withCoordsAll.length < 2) {
    return {
      water: waters[0]?.name || "your water",
      sub: withCoordsAll.length ? "Log a few more catches with a water or GPS tagged to map them" : "Tag a water (or allow location) on a catch to map it",
      width, height, shoreline: [], dots: [], callouts: [], legend: [{ color: "var(--accent)", label: "Your catches" }], chips: [],
    };
  }

  const groupCounts = new Map();
  for (const c of withCoordsAll) groupCounts.set(c._groupKey, (groupCounts.get(c._groupKey) || 0) + 1);
  const sortedGroups = Array.from(groupCounts.entries()).sort((a, b) => b[1] - a[1]);
  const effectiveFilter = filterKey && groupCounts.has(filterKey) ? filterKey : "All";
  const chips = [
    { label: `All waters · ${withCoordsAll.length}`, key: "All", active: effectiveFilter === "All" },
    ...sortedGroups.map(([name, n]) => ({ label: `${name} · ${n}`, key: name, active: effectiveFilter === name })),
  ];

  const withCoords = effectiveFilter === "All" ? withCoordsAll : withCoordsAll.filter(c => c._groupKey === effectiveFilter);

  const lats = withCoords.map(c => c._mapLat), lngs = withCoords.map(c => c._mapLng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat || 0.001, lngSpan = maxLng - minLng || 0.001;

  const toXY = (lat, lng) => ({
    x: pad + ((lng - minLng) / lngSpan) * (width - pad * 2),
    y: pad + (1 - (lat - minLat) / latSpan) * (height - pad * 2), // flip: north = up
  });

  const clusters = new Map();
  for (const c of withCoords) {
    const key = `${c._mapLat.toFixed(3)},${c._mapLng.toFixed(3)}`;
    if (!clusters.has(key)) clusters.set(key, { lat: c._mapLat, lng: c._mapLng, n: 0 });
    clusters.get(key).n++;
  }

  const dots = Array.from(clusters.values()).map(cl => {
    const { x, y } = toXY(cl.lat, cl.lng);
    return { cx: Math.round(x), cy: Math.round(y), r: cl.n > 1 ? 14 : 9, label: cl.n > 1 ? String(cl.n) : undefined };
  });

  return {
    // Most-common water among the catches in view, not just the first row
    // in the table — a few minor/satellite waters shouldn't outrank the
    // one the angler actually fishes.
    water: effectiveFilter === "All" ? (sortedGroups[0]?.[0] || waters[0]?.name || "your waters") : effectiveFilter,
    sub: `${withCoords.length} fish · ${clusters.size} spot${clusters.size === 1 ? "" : "s"} · stylized map`,
    width, height, shoreline: [], dots, callouts: [],
    legend: [{ color: "var(--accent)", label: "Your catches" }],
    chips,
  };
}

// Real-coordinate version of buildMap's clustering, for the Leaflet map on
// My Catches — same catch-or-water GPS fallback and same filterKey
// semantics, but returns {lat, lng, rows} clusters (true lat/lng, ~11m
// grouping) instead of buildMap's SVG pixel-space dots, since a real map
// needs real coordinates, not a normalized canvas position.
function buildRealMapPoints(catches, waters, filterKey) {
  const watersById = new Map(waters.map(w => [w.id, w]));
  const withCoordsAll = catches
    .map(c => {
      const water = c.water_id ? watersById.get(c.water_id) : null;
      const lat = c.latitude != null ? c.latitude : (water ? water.latitude : null);
      const lng = c.longitude != null ? c.longitude : (water ? water.longitude : null);
      return { ...c, _mapLat: lat, _mapLng: lng, _groupKey: c._waterName || "Untagged" };
    })
    .filter(c => c._mapLat != null && c._mapLng != null);

  if (!withCoordsAll.length) return [];

  const groupCounts = new Map();
  for (const c of withCoordsAll) groupCounts.set(c._groupKey, (groupCounts.get(c._groupKey) || 0) + 1);
  const effectiveFilter = filterKey && groupCounts.has(filterKey) ? filterKey : "All";
  const withCoords = effectiveFilter === "All" ? withCoordsAll : withCoordsAll.filter(c => c._groupKey === effectiveFilter);

  const clusters = new Map();
  for (const c of withCoords) {
    const key = `${c._mapLat.toFixed(4)},${c._mapLng.toFixed(4)}`;
    if (!clusters.has(key)) clusters.set(key, { lat: c._mapLat, lng: c._mapLng, rows: [] });
    clusters.get(key).rows.push(c);
  }
  return [...clusters.values()];
}

function buildCatchLog(catches) {
  const rows = catches.slice(0, 10).map(c => {
    const d = new Date(c.timestamp);
    const size = c.length_text || c.weight_lbs
      ? [c.length_text, c.weight_lbs != null ? `${c.weight_lbs} lb` : null].filter(Boolean).join(" · ")
      : "—";
    const conditionsStr = c.conditions
      ? [c.conditions.sky, c.conditions.airTempF].filter(Boolean).join(" · ")
      : "—";
    return {
      id: c.id,
      date: formatDateShort(d),
      time: formatTimeShort(d),
      species: c.species,
      size,
      lure: c.lure_display_name_snapshot,
      retrieve: c.retrieve_style || "—",
      depth: c.depth_at_catch || "—",
      water: c._waterName || "—",
      conditions: conditionsStr || "—",
    };
  });
  return { sub: `${rows.length} most recent of ${catches.length}`, rows };
}

function buildWarnCallout(catches) {
  const missing = catches.filter(c => !c.length_text && c.weight_lbs == null && !c.depth_at_catch);
  return {
    text: missing.length
      ? `${missing.length} catch${missing.length === 1 ? " is" : "es are"} missing length, weight or depth. Filling them in sharpens your patterns.`
      : "All your catches have length, weight, or depth logged — nice.",
    cta: "Complete catches",
    firstMissingId: missing.length ? missing[0].id : null,
    _hide: missing.length === 0,
  };
}

// ---------- top-level assembler ----------

function buildMyCatchesData(catches, waters) {
  const watersById = new Map(waters.map(w => [w.id, w.name]));
  // Annotate each catch with its water's name once, up front — every
  // builder above that needs a water name reads this instead of
  // re-joining against `waters` itself.
  const annotated = catches.map(c => ({ ...c, _waterName: watersById.get(c.water_id) || null }));

  return {
    dateRange: buildDateRange(annotated),
    filters: buildFilters(waters),
    kpis: buildKpis(annotated, waters),
    hero: buildHero(annotated, waters),
    map: buildMap(annotated, waters),
    catchLog: buildCatchLog(annotated),
    warnCallout: buildWarnCallout(annotated),
    // Exposed so the page can rebuild just the map (buildMap(annotated,
    // waters, key)) when a location chip is clicked, without re-running
    // every other builder above.
    _annotated: annotated,
  };
}
