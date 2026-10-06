// My Catches' depth/lure/weather analysis suite — ported from
// b8fish-dashboard-prototype_4.html's calculation logic (the handoff
// notes' reference build), adapted to read catches_clean's real typed
// columns instead of the prototype's pre-shaped sample rows.
//
// This file holds the shared constants/helpers and the page-level
// filtering assembler; the section-specific chart/table builders (which
// compute and render together, same as the prototype's secXxx functions)
// live in components.js.
//
// Trips group by local_date alone, matching the prototype and the build
// notes' validated numbers. Technically a trip is one lake_id *and* one
// local_date (see catches_cleanup.sql's comment) — that only matters once
// an account fishes more than one lake on the same calendar day, which
// doesn't come up yet.

const DEPTH_BANDS = [[0, 5], [6, 10], [11, 15], [16, 20], [21, 25], [26, Infinity]];
const RETRIEVES = ["Slow", "Medium", "Fast"];
const DAYPARTS = [ // hours after sunrise
  ["Before sunrise", -Infinity, 0],
  ["First 2 hours of light", 0, 2],
  ["2 to 4 hours after sunrise", 2, 4],
  ["4 to 6 hours after sunrise", 4, 6],
  ["Afternoon and evening", 6, Infinity],
];
// Two named lead species keep the site's one accent + one warm secondary;
// everything else falls into the same neutral "other" bucket already used
// for bite-clock's non-prime bars.
const SPECIES_COLOR = { "Spotted Bass": "var(--accent)", "Largemouth Bass": "var(--series-orange)" };
const speciesColor = s => SPECIES_COLOR[s] || "var(--series-blue)";

const sum = a => a.reduce((s, v) => s + v, 0);
const mean = a => a.length ? sum(a) / a.length : null;
const uniq = a => [...new Set(a)];
const has = v => v !== null && v !== undefined;
const trimNum = (n, d = 2) => String(+n.toFixed(d));
const lb = n => has(n) ? trimNum(n) + " lb" : "n/a";
const inch = n => has(n) ? trimNum(n, 1) + " in" : "n/a";
const ft = n => trimNum(n, 0) + " ft";
const sentenceCase = s => s.charAt(0) + s.slice(1).toLowerCase();
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayShort = d => MONTHS[+d.slice(5, 7) - 1] + " " + +d.slice(8, 10);
function clockTime(h) {
  let hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  if (mm === 60) { hh++; mm = 0; }
  const ap = hh >= 12 ? "pm" : "am"; const h12 = ((hh + 11) % 12) + 1;
  return h12 + ":" + String(mm).padStart(2, "0") + " " + ap;
}
const bandOf = d => DEPTH_BANDS.findIndex(([a, b]) => Math.round(d) >= a && Math.round(d) <= b);
const bandLabel = ([a, b]) => b === Infinity ? a + " ft and deeper" : a + " to " + b + " ft";
const bandShort = ([a, b]) => b === Infinity ? a + "+" : a + "–" + b;
const daypartOf = r => DAYPARTS.findIndex(([, a, b]) => { const x = r.local_hour - r.sunrise_hour; return x >= a && x < b; });
const bestFive = rows => sum(rows.map(r => r.weight_lbs).filter(has).sort((a, b) => b - a).slice(0, 5));

function groupBy(rows, keyFn) {
  const m = new Map();
  rows.forEach(r => { const k = keyFn(r); if (!has(k)) return; if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
  return m;
}
function byValue(rows, keyFn, order) {
  const g = groupBy(rows, keyFn);
  const keys = order || [...g.keys()].sort((a, b) => g.get(b).length - g.get(a).length);
  return keys.map(k => ({ label: k, rows: g.get(k) || [] }));
}

// The sentence above the water column chart.
function buildColumnInsight(rows) {
  const trips = [...groupBy(rows.filter(r => has(r.depth_ft)), r => r.local_date).entries()].filter(([, v]) => v.length >= 3);
  if (!trips.length) return "Log three or more catches with a depth on one trip to see how the fish move through the day.";
  const deeper = trips.filter(([, v]) => { const h = Math.floor(v.length / 2); return mean(v.slice(-h).map(r => r.depth_ft)) > mean(v.slice(0, h).map(r => r.depth_ft)); });
  const detail = deeper.map(([d, v]) => `${dayShort(d)} went from ${ft(v[0].depth_ft)} to ${ft(v[v.length - 1].depth_ft)}`).join(", ");
  const lead = trips.length === 1
    ? (deeper.length ? "Later fish came deeper on this trip" : "Fish did not move deeper through this trip")
    : `Later fish came deeper on ${deeper.length} of ${trips.length} trips with three or more catches`;
  return lead + (detail ? ": " + detail + "." : ".");
}

// Tooltip body for one catch dot (water column chart + its focus state).
function tipText(r) {
  const hasConditions = has(r.sky) || has(r.air_temp_f);
  return `<b>${esc(sentenceCase(r.species))}${has(r.length_in) ? ", " + inch(r.length_in) : ""}${has(r.weight_lbs) ? ", " + lb(r.weight_lbs) : ""}</b>
    ${has(r.depth_ft) ? ft(r.depth_ft) + " on " : ""}${esc(r.lure_display_name_snapshot || "an unknown lure")}${r.retrieve_style ? ", " + r.retrieve_style.toLowerCase() + " retrieve" : ""}<br>
    ${dayShort(r.local_date)}, ${clockTime(r.local_hour)}${r.structure_type ? ", " + r.structure_type.toLowerCase() : ""}<br>
    ${hasConditions ? `${esc(r.sky || "Unknown sky")}, ${has(r.air_temp_f) ? r.air_temp_f + "°F" : "n/a"}, wind ${esc(r.wind_dir || "")} ${has(r.wind_mph) ? r.wind_mph + " mph" : ""}, pressure ${(r.pressure_trend || "steady").toLowerCase()}` : "No weather saved"}`;
}

// Top-level assembler: joins catches_clean to waters/lakes for display
// names, then applies the page's trip/species filter state. Mirrors
// buildMyCatchesData()'s role in analytics.js, scoped to this section.
function buildCatchesPageState(cleanRows, waters, lakes, state) {
  const sorted = [...cleanRows].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const lakeNameById = new Map(lakes.map(l => [l.id, l.name]));
  const lakeByWaterId = new Map(waters.map(w => [w.id, w.lake_id ? lakeNameById.get(w.lake_id) : null]));
  const annotated = sorted.map(r => ({ ...r, _lake: r.water_id ? lakeByWaterId.get(r.water_id) : null }));

  const trips = uniq(annotated.map(r => r.local_date)).sort();
  const species = uniq(annotated.map(r => r.species));
  const lakeNames = uniq(annotated.map(r => r._lake).filter(Boolean));
  const lakeName = lakeNames.length === 1 ? lakeNames[0] : (lakeNames.length ? "your waters" : "your water");

  const bySpeciesOnly = annotated.filter(r => state.species === "all" || r.species === state.species);
  const rows = bySpeciesOnly.filter(r => state.trip === "all" || r.local_date === state.trip);
  const yMax = Math.max(20, Math.ceil((Math.max(0, ...rows.map(r => r.depth_ft || 0)) + 2) / 5) * 5);

  return { lakeName, trips, species, rows, bySpeciesOnly, yMax };
}
