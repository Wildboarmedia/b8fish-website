// Reshape functions for Lake Intel's real data: catch_trends +
// structure_trends (public, k-anonymous — see catch_trends.sql /
// structure_trends.sql) plus the signed-in user's own catches at the
// selected water (private, RLS-scoped).
//
// v1 honestly supports: hot zones, top lures, structure producing, and a
// coarse time-of-day bite indicator (not a day×hour grid — catch_trends
// only tracks a single time bucket per group, nothing day-specific).
// Depth-this-month / conditions-that-turn-the-bite-on / compare-to-lake
// have no backing columns at all and are NOT built here — lake-intel.html
// renders those as "coming soon" instead of calling into this file.

const TIME_BUCKET_ORDER = ["early-morning", "morning", "midday", "afternoon", "evening", "night"];
const TIME_BUCKET_LABEL = {
  "early-morning": "Early morning", morning: "Morning", midday: "Midday",
  afternoon: "Afternoon", evening: "Evening", night: "Night",
};

function buildLakeIntelKpis(catchTrends) {
  if (!catchTrends.length) {
    return [
      { label: "Catches logged", value: "—", unit: "", sub: "Not enough shared data near here yet" },
      { label: "Active anglers", value: "—", unit: "", sub: "Needs 5+ anglers reporting nearby" },
      { label: "Top species", value: "—", unit: "", sub: "—" },
      { label: "Peak time", value: "—", unit: "", sub: "—" },
      { label: "Species tracked", value: "0", unit: "", sub: "—" },
    ];
  }

  const totalCatches = catchTrends.reduce((a, t) => a + t.catch_count, 0);
  const maxAnglers = catchTrends.reduce((a, t) => Math.max(a, t.angler_count), 0);

  const bySpecies = new Map();
  for (const t of catchTrends) bySpecies.set(t.species, (bySpecies.get(t.species) || 0) + t.catch_count);
  const topSpecies = Array.from(bySpecies.entries()).sort((a, b) => b[1] - a[1])[0];

  const byBucket = new Map();
  for (const t of catchTrends) byBucket.set(t.time_bucket, (byBucket.get(t.time_bucket) || 0) + t.catch_count);
  const peak = Array.from(byBucket.entries()).sort((a, b) => b[1] - a[1])[0];

  return [
    { label: "Catches logged", value: String(totalCatches), unit: "", sub: "Near this water" },
    { label: "Active anglers", value: `${maxAnglers}+`, unit: "", sub: "At least, across published patterns" },
    { label: "Top species", value: topSpecies ? String(Math.round((topSpecies[1] / totalCatches) * 100)) : "—", unit: "%", sub: topSpecies ? `${topSpecies[0]} share of catches` : "—" },
    { label: "Peak time", value: peak ? TIME_BUCKET_LABEL[peak[0]] : "—", unit: "", sub: "Most logged time of day" },
    { label: "Species tracked", value: String(bySpecies.size), unit: "", sub: "Distinct species reported" },
  ];
}

// Stylized map: community activity as soft heat circles (catch_trends
// grid cells), the signed-in user's own catches as solid dots — same
// normalize-into-pixel-space approach as my-catches' map.
function buildHotZonesMap(catchTrends, ownCatches) {
  const width = 754, height = 390, pad = 40;
  const legend = [
    { color: "var(--series-orange)", label: "Community activity" },
    { color: "var(--accent)", label: "Your catches (only you see these)" },
  ];

  const ownPoints = ownCatches.filter(c => c.latitude != null && c.longitude != null);
  const allLats = [...catchTrends.map(t => t.grid_lat), ...ownPoints.map(c => c.latitude)];
  const allLngs = [...catchTrends.map(t => t.grid_lng), ...ownPoints.map(c => c.longitude)];

  if (!allLats.length) {
    return { sub: "No catches logged near here yet", width, height, shoreline: [], heatZones: [], dots: [], callouts: [], legend };
  }

  const minLat = Math.min(...allLats), maxLat = Math.max(...allLats);
  const minLng = Math.min(...allLngs), maxLng = Math.max(...allLngs);
  const latSpan = (maxLat - minLat) || 0.001, lngSpan = (maxLng - minLng) || 0.001;
  const toXY = (lat, lng) => ({
    x: pad + ((lng - minLng) / lngSpan) * (width - pad * 2),
    y: pad + (1 - (lat - minLat) / latSpan) * (height - pad * 2),
  });

  const maxWeight = Math.max(...catchTrends.map(t => t.catch_count), 1);
  const heatZones = catchTrends.map(t => {
    const { x, y } = toXY(t.grid_lat, t.grid_lng);
    const intensity = t.catch_count / maxWeight;
    return {
      cx: Math.round(x), cy: Math.round(y),
      r1: Math.round(20 + intensity * 40), o1: +(0.08 + intensity * 0.10).toFixed(2),
      r2: Math.round(10 + intensity * 20), o2: +(0.18 + intensity * 0.25).toFixed(2),
    };
  });

  const clusters = new Map();
  for (const c of ownPoints) {
    const key = `${c.latitude.toFixed(3)},${c.longitude.toFixed(3)}`;
    if (!clusters.has(key)) clusters.set(key, { lat: c.latitude, lng: c.longitude, n: 0 });
    clusters.get(key).n++;
  }
  const dots = Array.from(clusters.values()).map(cl => {
    const { x, y } = toXY(cl.lat, cl.lng);
    return { cx: Math.round(x), cy: Math.round(y), r: cl.n > 1 ? 14 : 9, label: cl.n > 1 ? String(cl.n) : undefined };
  });

  const sub = catchTrends.length
    ? "Community catches, generalized to grid cells"
    : "Your catches — not enough shared community data here yet";

  return { sub, width, height, shoreline: [], heatZones, dots, callouts: [], legend };
}

function buildTopLures(catchTrends, ownCatches) {
  const byLure = new Map();
  for (const t of catchTrends) byLure.set(t.lure_display_name_snapshot, (byLure.get(t.lure_display_name_snapshot) || 0) + t.catch_count);

  const ownCounts = new Map();
  for (const c of ownCatches) {
    const name = c.lure_display_name_snapshot;
    if (name) ownCounts.set(name, (ownCounts.get(name) || 0) + 1);
  }

  const total = Array.from(byLure.values()).reduce((a, b) => a + b, 0);
  const rows = Array.from(byLure.entries()).map(([name, n]) => ({ name, n }));
  rows.sort((a, b) => b.n - a.n);
  const max = Math.max(...rows.map(r => r.n), 1);

  return rows.slice(0, 8).map(r => {
    const mine = ownCounts.has(r.name);
    return {
      name: r.name,
      you: mine ? `You: ${ownCounts.get(r.name)}` : null,
      trend: "flat",
      trendVal: "—", // no week-over-week history retained by the refresh job
      share: total ? `${Math.round((r.n / total) * 100)}%` : "0%",
      widthPct: Math.round((r.n / max) * 100),
      mine,
    };
  });
}

function buildStructureProducing(structureTrends) {
  const byCat = new Map();
  for (const t of structureTrends) byCat.set(t.structure_category, (byCat.get(t.structure_category) || 0) + t.catch_count);
  const total = Array.from(byCat.values()).reduce((a, b) => a + b, 0);
  const rows = Array.from(byCat.entries()).map(([name, n]) => ({ name, n }));
  rows.sort((a, b) => b.n - a.n);
  return rows.map((r, i) => {
    const pct = total ? Math.round((r.n / total) * 100) : 0;
    return { name: r.name, n: r.n, valueLabel: `${pct}%`, tone: i === 0 ? "lead" : "default" };
  });
}

function buildBiteTimeBars(catchTrends) {
  const byBucket = new Map();
  for (const t of catchTrends) byBucket.set(t.time_bucket, (byBucket.get(t.time_bucket) || 0) + t.catch_count);
  const total = Array.from(byBucket.values()).reduce((a, b) => a + b, 0);
  const max = Math.max(...byBucket.values(), 1);

  return TIME_BUCKET_ORDER.filter(k => byBucket.has(k)).map(k => {
    const n = byBucket.get(k);
    return {
      name: TIME_BUCKET_LABEL[k],
      n,
      valueLabel: total ? `${n} · ${Math.round((n / total) * 100)}%` : String(n),
      tone: n === max ? "lead" : "default",
    };
  });
}
