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

const BITE_HOURS = ["5a","6a","7a","8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p","8p","9p"];
function hourToBiteLabel(hour) {
  const clamped = Math.min(21, Math.max(5, hour));
  const idx = clamped - 5;
  return BITE_HOURS[idx];
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
      secondaryCta: { label: "Plan my next trip" },
    };
  }
  const latest = catches[0]; // already sorted desc by timestamp
  const water = watersById.get(latest.water_id);
  return {
    kicker: "Your most recent catch",
    headline: `${latest.species} on ${latest.lure_display_name_snapshot}${water ? ` at ${water}` : ""}.`,
    body: `Logged ${formatDateShort(new Date(latest.timestamp))} at ${formatTimeShort(new Date(latest.timestamp))}${latest.depth_at_catch ? `, ${latest.depth_at_catch}` : ""}${latest.conditions && latest.conditions.sky ? `, ${latest.conditions.sky.toLowerCase()}` : ""}.`,
    primaryCta: { label: "See what others are catching", href: "lake-intel.html" },
    secondaryCta: { label: "Plan my next trip" },
  };
}

function buildPatterns(catches) {
  const patterns = [];
  const total = catches.length;

  // Time-of-day window
  if (total >= 3) {
    const hours = catches.map(c => new Date(c.timestamp).getHours());
    const morning = hours.filter(h => h >= 8 && h < 12).length;
    const pct = Math.round((morning / total) * 100);
    patterns.push({
      title: "Mid-morning is your window",
      metric: `${pct}%`,
      desc: `${morning} of your ${total} fish came between 8 a.m. and noon.`,
      filled: pct >= 70 ? 4 : pct >= 50 ? 3 : pct >= 30 ? 2 : 1,
      conf: total < 10 ? `Building · ${total} catches` : `Confirmed · ${total} catches`,
    });
  } else {
    patterns.push({ title: "Mid-morning is your window", metric: "—", desc: "Log a few more catches to see your time-of-day pattern.", filled: 0, conf: "Not enough data yet" });
  }

  // Best-producing water
  const withWater = catches.filter(c => c.water_id);
  if (withWater.length >= 2) {
    const { value: topWaterId, count } = mode(withWater.map(c => c.water_id));
    const pct = Math.round((count / withWater.length) * 100);
    patterns.push({
      title: "Your producing water",
      metric: `${pct}%`,
      desc: `${count} of ${withWater.length} fish with a water logged came from the same spot.`,
      filled: pct >= 70 ? 4 : pct >= 50 ? 3 : 2,
      conf: `Early signal · ${withWater.length} catches`,
    });
  } else {
    patterns.push({ title: "Your producing water", metric: "—", desc: "Tag a water on your catches to see this.", filled: 0, conf: "Not enough data yet" });
  }

  // Barometer
  const withBarometer = catches.filter(c => c.conditions && c.conditions.barometer);
  if (withBarometer.length >= 3) {
    const rising = withBarometer.filter(c => /rising/i.test(c.conditions.barometer)).length;
    const pct = Math.round((rising / withBarometer.length) * 100);
    patterns.push({
      title: "Rising barometer",
      metric: `${pct}%`,
      desc: `${rising} of ${withBarometer.length} fish came on rising pressure.`,
      filled: pct >= 70 ? 4 : pct >= 50 ? 3 : 2,
      conf: `Early signal · ${withBarometer.length} catches`,
    });
  } else {
    patterns.push({ title: "Rising barometer", metric: "—", desc: "Not enough conditions logged yet.", filled: 0, conf: "Not enough data yet" });
  }

  // Structure
  const withStructure = catches.filter(c => c.structure_category);
  if (withStructure.length >= 3) {
    const { value: topStructure, count } = mode(withStructure.map(c => c.structure_category));
    const pct = Math.round((count / withStructure.length) * 100);
    patterns.push({
      title: `${topStructure} are producing`,
      metric: `${pct}%`,
      desc: `${count} of ${withStructure.length} structure-logged fish came off ${String(topStructure).toLowerCase()}.`,
      filled: pct >= 70 ? 4 : pct >= 50 ? 3 : 2,
      conf: `Early signal · ${withStructure.length} catches`,
    });
  } else {
    patterns.push({ title: "Structure", metric: "—", desc: "Log structure type on a catch to see this — it's a newer field, so it's expected to be sparse at first.", filled: 0, conf: "Not enough data yet" });
  }

  return patterns;
}

function buildBiteClock(catches) {
  const counts = Object.fromEntries(BITE_HOURS.map(h => [h, 0]));
  for (const c of catches) {
    const hour = new Date(c.timestamp).getHours();
    counts[hourToBiteLabel(hour)]++;
  }
  return {
    hours: BITE_HOURS,
    values: BITE_HOURS.map(h => counts[h]),
    primeHours: ["8a", "9a", "10a", "11a"],
    tickHours: ["6a", "9a", "12p", "3p", "6p", "9p"],
  };
}

function buildLureTable(catches) {
  const byLure = new Map();
  for (const c of catches) {
    const key = c.lure_display_name_snapshot || "Unknown lure";
    if (!byLure.has(key)) byLure.set(key, []);
    byLure.get(key).push(c);
  }
  const rows = Array.from(byLure.entries()).map(([name, rows]) => {
    const lengths = rows.map(r => parseLeadingNumber(r.length_text)).filter(n => n != null);
    const avgLen = lengths.length ? (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1) + "\"" : "—";
    const withWeight = rows.filter(r => r.weight_lbs != null);
    const best = withWeight.reduce((a, b) => (b.weight_lbs > (a?.weight_lbs ?? -Infinity) ? b : a), null);
    const bestFish = best ? `${best.length_text || best.species} · ${best.weight_lbs} lb` : "—";
    const water = mode(rows.map(r => r._waterName)).value || "—";
    const retrieve = mode(rows.map(r => r.retrieve_style)).value || "—";
    return { name, fish: rows.length, avgLen, bestFish, water, retrieve };
  });
  rows.sort((a, b) => b.fish - a.fish);
  if (rows.length) rows[0].lead = true;
  return rows;
}

function buildSpeciesMix(catches) {
  const counts = new Map();
  for (const c of catches) counts.set(c.species, (counts.get(c.species) || 0) + 1);
  const total = catches.length;
  const rows = Array.from(counts.entries()).map(([name, n]) => ({ name, n }));
  rows.sort((a, b) => b.n - a.n);
  return rows.map((r, i) => ({
    name: r.name,
    n: r.n,
    valueLabel: i === 0 ? `${r.n} · ${Math.round((r.n / total) * 100)}%` : String(r.n),
    tone: i === 0 ? "lead" : "default",
  }));
}

function buildDepthAtCatch(catches) {
  const bins = [
    { name: "0–5 ft", min: 0, max: 5, n: 0 },
    { name: "6–15 ft", min: 6, max: 15, n: 0 },
    { name: "16–25 ft", min: 16, max: 25, n: 0 },
    { name: "26+ ft", min: 26, max: Infinity, n: 0 },
  ];
  let logged = 0;
  for (const c of catches) {
    const ft = parseLeadingNumber(c.depth_at_catch);
    if (ft == null) continue;
    logged++;
    const bin = bins.find(b => ft >= b.min && ft <= b.max);
    if (bin) bin.n++;
  }
  const used = bins.filter(b => b.n > 0 || b.max !== Infinity).slice(0, 3); // keep the standard 3; drop 26+ if empty
  const max = Math.max(...used.map(b => b.n), 1);
  const leadIdx = used.reduce((best, b, i) => (b.n > used[best].n ? i : best), 0);
  return {
    sub: `${logged} catch${logged === 1 ? "" : "es"} with depth logged`,
    bins: used.map((b, i) => ({ name: b.name, n: b.n, tone: i === leadIdx && b.n > 0 ? "lead" : "default" })),
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
    water: effectiveFilter === "All" ? (waters[0]?.name || "your waters") : effectiveFilter,
    sub: `${withCoords.length} fish · ${clusters.size} spot${clusters.size === 1 ? "" : "s"} · stylized map`,
    width, height, shoreline: [], dots, callouts: [],
    legend: [{ color: "var(--accent)", label: "Your catches" }],
    chips,
  };
}

function buildConditions(catches) {
  const field = (key) => mode(catches.map(c => c.conditions && c.conditions[key]).filter(Boolean));
  const barometer = field("barometer");
  const moon = field("moonPhase");
  const sky = field("sky");
  const wind = field("wind");
  const airTemp = catches.map(c => c.conditions && c.conditions.airTempF).filter(Boolean);
  const retrieve = mode(catches.map(c => c.retrieve_style));

  const total = catches.length;
  return [
    { label: "Barometer", value: barometer.value || "—", sub: barometer.value ? `${barometer.count} of ${total} fish` : "No barometer logged yet" },
    { label: "Moon", value: moon.value || "—", sub: moon.value ? `${moon.count} of ${total} fish` : "No moon phase logged yet" },
    { label: "Sky", value: sky.value || "—", sub: sky.value ? `${sky.count} of ${total} fish` : "No sky condition logged yet" },
    { label: "Wind", value: wind.value || "—", sub: wind.value ? `${wind.count} of ${total} fish` : "No wind logged yet" },
    { label: "Air temp", value: airTemp.length ? airTemp[0] : "—", sub: airTemp.length ? `Most recent reading` : "No air temp logged yet" },
    { label: "Retrieve", value: retrieve.value || "—", sub: retrieve.value ? `${retrieve.count} of ${total} logged retrieves` : "No retrieve style logged yet" },
  ];
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
    patterns: buildPatterns(annotated),
    biteClock: buildBiteClock(annotated),
    lures: buildLureTable(annotated),
    speciesMix: buildSpeciesMix(annotated),
    depthAtCatch: buildDepthAtCatch(annotated),
    map: buildMap(annotated, waters),
    conditions: buildConditions(annotated),
    catchLog: buildCatchLog(annotated),
    warnCallout: buildWarnCallout(annotated),
    // Exposed so the page can rebuild just the map (buildMap(annotated,
    // waters, key)) when a location chip is clicked, without re-running
    // every other builder above.
    _annotated: annotated,
  };
}
