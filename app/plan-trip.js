// Plan a Trip — ported from b8fish-dashboard-prototype_4.html's "PLAN A
// TRIP" section. Matches a live forecast day against the angler's own past
// trips, then turns the best-matching trip into a timed run of stops.
// Self-contained (data + render together, like the prototype) since this
// is one dedicated page, not a shared widget library — relies on
// catches-analytics.js for the generic helpers (mean, sum, uniq, has,
// groupBy, byValue, trimNum, lb, inch, ft, sentenceCase, dayShort,
// clockTime) and components.js for esc().

const MATCH_MIN = 3;            // conditions (of 5) a past trip must share with the forecast
const TEMP_TOLERANCE_F = 5;
const QUIET_GAP_HOURS = 0.75;   // flag a stretch this long with no fish logged
const SPOT_RADIUS_METERS = 250;
const DAY_NAMES = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const windBand = m => m < 5 ? "Under 5 mph" : m < 10 ? "5 to 9 mph" : "10 mph and up";
const moonBandOf = p => p >= 90 ? "Near full" : p >= 50 ? "Half or more" : "Under half";
const modeOf = a => [...groupBy(a, x => x).entries()].sort((x, y) => y[1].length - x[1].length)[0][0];
const r5 = h => Math.round(h * 12) / 12;
const miles = (a, b) => {
  const R = 3958.8, p = Math.PI / 180, dLat = (b.lat - a.lat) * p, dLng = (b.lng - a.lng) * p;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.lat * p) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const compassDirection = deg => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][(Math.round(deg / 45) % 8 + 8) % 8];
const skyLabel = cloudCoverPct => cloudCoverPct < 10 ? "Clear" : cloudCoverPct < 30 ? "Mostly clear" : cloudCoverPct < 70 ? "Partly cloudy" : cloudCoverPct < 90 ? "Mostly cloudy" : "Overcast";

// Same synodic-month calculation as the app's MoonPhase.swift, so a plan
// built on the website and the app's own conditions agree.
function moonPhaseForDate(date) {
  const referenceNewMoonMs = 947182440 * 1000; // Jan 6 2000, 18:14 UTC
  const synodicMonthDays = 29.530588861;
  const daysSince = (date.getTime() - referenceNewMoonMs) / 86400000;
  let phase = daysSince % synodicMonthDays;
  if (phase < 0) phase += synodicMonthDays;
  const illumination = (1 - Math.cos(2 * Math.PI * phase / synodicMonthDays)) / 2;
  return Math.round(illumination * 100);
}

// Catches within SPOT_RADIUS_METERS of each other become one spot —
// greedy nearest-first clustering over the account's full catch history.
// Mutates each row with a _spot index; returns the spot centroids
// ({lat, lng, n}) so mountRouteMap() can draw every other spot as a faint
// background marker.
function clusterSpots(rows) {
  const spots = [];
  const metersPerDegLat = 111320;
  rows.filter(r => has(r._lat) && has(r._lng)).forEach(r => {
    const latRad = r._lat * Math.PI / 180;
    let bestIdx = null, bestDist = Infinity;
    spots.forEach((s, i) => {
      const dLat = (r._lat - s.lat) * metersPerDegLat;
      const dLng = (r._lng - s.lng) * metersPerDegLat * Math.cos(latRad);
      const dist = Math.hypot(dLat, dLng);
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    });
    if (bestIdx !== null && bestDist <= SPOT_RADIUS_METERS) {
      const s = spots[bestIdx];
      s.lat = (s.lat * s.n + r._lat) / (s.n + 1);
      s.lng = (s.lng * s.n + r._lng) / (s.n + 1);
      s.n++;
      r._spot = bestIdx;
    } else {
      r._spot = spots.length;
      spots.push({ lat: r._lat, lng: r._lng, n: 1 });
    }
  });
  return spots;
}

// One weather profile per past trip; trips with no saved weather can't be matched.
function tripProfiles(cleanRows) {
  return [...groupBy(cleanRows, r => r.local_date).entries()].map(([date, rows]) => {
    const w = rows.filter(r => has(r.sky));
    if (!w.length) return { date, rows, weather: null };
    const temps = w.map(r => r.air_temp_f), winds = w.map(r => r.wind_mph).sort((a, b) => a - b);
    return {
      date, rows,
      weather: {
        sky: modeOf(w.map(r => r.sky)),
        tMin: Math.min(...temps), tMax: Math.max(...temps),
        windMph: winds[Math.floor(winds.length / 2)],
        baroTrend: modeOf(w.map(r => r.pressure_trend)),
        moonPct: mean(w.map(r => r.moon_pct)),
      },
    };
  });
}

function compare(f, p) {
  const w = p.weather;
  const checks = [
    ["Sky", f.sky, w.sky, f.sky === w.sky],
    ["Air temperature", f.airF + "°F", w.tMin === w.tMax ? w.tMin + "°F" : w.tMin + " to " + w.tMax + "°F", f.airF >= w.tMin - TEMP_TOLERANCE_F && f.airF <= w.tMax + TEMP_TOLERANCE_F],
    ["Wind", f.windDir + " " + f.windMph + " mph", windBand(w.windMph), windBand(f.windMph) === windBand(w.windMph)],
    ["Pressure", f.baroTrend, w.baroTrend, f.baroTrend === w.baroTrend],
    ["Moon", Math.round(f.moonPct) + "% lit", Math.round(w.moonPct) + "% lit", moonBandOf(f.moonPct) === moonBandOf(w.moonPct)],
  ];
  return { trip: p, checks, score: checks.filter(c => c[3]).length };
}
function closest(f, profiles) {
  return profiles.filter(p => p.weather).map(p => compare(f, p)).sort((a, b) => b.score - a.score || b.trip.rows.length - a.trip.rows.length)[0];
}

function buildPlan(f, trip, allCleanRows) {
  const stops = [];
  trip.rows.forEach(r => {
    const last = stops[stops.length - 1];
    if (last && last.spot === r._spot) last.rows.push(r);
    else stops.push({ spot: r._spot, rows: [r] });
  });
  let prevEnd = 0;
  stops.forEach(s => {
    const h = s.rows.map(r => r.local_hour - r.sunrise_hour);
    const d = s.rows.map(r => r.depth_ft).filter(has);
    const w = s.rows.map(r => r.weight_lbs).filter(has);
    s.start = r5(Math.max(f.sunriseHour + h[0] - 0.15, prevEnd + 0.1));
    s.end = r5(Math.max(f.sunriseHour + h[h.length - 1] + 0.2, s.start + 0.3));
    prevEnd = s.end;
    s.lat = mean(s.rows.map(r => r._lat));
    s.lng = mean(s.rows.map(r => r._lng));
    s.lure = modeOf(s.rows.map(r => r.lure_display_name_snapshot));
    s.retrieve = s.rows.some(r => r.retrieve_style) ? modeOf(s.rows.map(r => r.retrieve_style).filter(Boolean)).toLowerCase() : null;
    s.structure = s.rows.some(r => r.structure_type) ? modeOf(s.rows.map(r => r.structure_type).filter(Boolean)).toLowerCase() : null;
    s.d0 = d[0]; s.d1 = d[d.length - 1]; s.best = w.length ? Math.max(...w) : null;
  });
  const rig = [...groupBy(trip.rows, r => r.lure_display_name_snapshot).entries()].sort((a, b) => b[1].length - a[1].length).map(([lure, v]) => [lure, v.length]);
  const others = [...groupBy(allCleanRows.filter(r => r.local_date !== trip.date && !rig.some(x => x[0] === r.lure_display_name_snapshot)), r => r.lure_display_name_snapshot).entries()].sort((a, b) => b[1].length - a[1].length)[0];
  return { stops, rig, backup: others ? [others[0], others[1].length] : null };
}
function stopText(s) {
  const at = s.structure === "point" ? " on the point" : s.structure ? " around the " + s.structure : "";
  const how = esc(s.lure) + (s.retrieve ? ", " + s.retrieve + " retrieve. " : ". ");
  if (!has(s.d0)) return how;
  return how + (s.d0 === s.d1 ? `Fish ${ft(s.d0)}${at}.` : `Start at ${ft(s.d0)} and work out to ${ft(s.d1)}${at ? "," + at : ""}.`);
}
function worthTesting(plan, f, trip, allCleanRows) {
  const first = plan.stops[0];
  const early = allCleanRows.slice().sort((a, b) => (a.local_hour - a.sunrise_hour) - (b.local_hour - b.sunrise_hour))[0];
  const eh = early.local_hour - early.sunrise_hour;
  if (first.start - f.sunriseHour > 0.5 && early.local_date !== trip.date && eh < 0.5)
    return `Start at first light. You have no fish before ${clockTime(first.start)} on a day like this. Your earliest fish came ${eh < 0 ? "before sunrise" : "just after sunrise"} on the ${esc(early.lure_display_name_snapshot)}${has(early.depth_ft) ? " in " + ft(early.depth_ft) : ""}${early.structure_type === "Point" ? " on a point" : ""}.`;
  if (plan.stops.some((s, i) => i && s.start - plan.stops[i - 1].end > QUIET_GAP_HOURS))
    return "Change something in the quiet stretches. Nothing is logged in them on a day like this, so a different depth or lure there is new information.";
  return `Stay past ${clockTime(plan.stops[plan.stops.length - 1].end)}. You have no afternoon catch logged.`;
}

// Real map of the run (Leaflet + OpenStreetMap tiles) — numbered stop
// markers in order, a straight-line route between them (still straight
// lines, not routed over water — say so in the UI), and every other spot
// the angler has fished as a faint background marker.
let _routeMapInstance = null;

function mountRouteMap(containerId, stops, allSpots) {
  const el = document.getElementById(containerId);
  if (!el || typeof L === "undefined") return;

  // The container div is a fresh DOM node every render (the whole
  // plan-mount panel gets re-stringified when the angler picks a
  // different day), so the previous Leaflet instance's node is already
  // gone — just drop the old instance and start clean.
  if (_routeMapInstance) { _routeMapInstance.remove(); _routeMapInstance = null; }

  _routeMapInstance = L.map(containerId, { scrollWheelZoom: false });
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(_routeMapInstance);
  L.control.scale({ metric: false }).addTo(_routeMapInstance);

  allSpots.forEach(s => {
    L.circleMarker([s.lat, s.lng], { radius: 5, weight: 0, color: "var(--text-secondary)", fillOpacity: 0.35 }).addTo(_routeMapInstance);
  });

  L.polyline(stops.map(s => [s.lat, s.lng]), {
    color: "var(--text-primary)", weight: 2, opacity: 0.8, dashArray: "1 8",
  }).addTo(_routeMapInstance);

  stops.forEach((s, i) => {
    L.marker([s.lat, s.lng], {
      icon: L.divIcon({ className: "route-stop-marker", html: String(i + 1), iconSize: [28, 28] }),
    }).addTo(_routeMapInstance);
  });

  const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lng]));
  _routeMapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  setTimeout(() => _routeMapInstance.invalidateSize(), 0);
}

// ---------- forecast fetch (live Open-Meteo, replaces the prototype's sample FORECAST array) ----------
async function fetchForecast(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&daily=sunrise&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover` +
    `&forecast_days=7&temperature_unit=fahrenheit&wind_speed_unit=mph&pressure_unit=inhg&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Forecast request failed");
  const data = await res.json();

  return data.daily.time.map((dateStr, i) => {
    const sunriseIso = data.daily.sunrise[i];
    const sunriseHour = (() => {
      const t = sunriseIso.split("T")[1];
      const [hh, mm] = t.split(":").map(Number);
      return hh + mm / 60;
    })();
    // A representative "morning bite" reading: the hourly index nearest
    // sunrise + 1h on this calendar day.
    const targetIso = `${dateStr}T${String(Math.min(23, Math.round(sunriseHour + 1))).padStart(2, "0")}:00`;
    let idx = data.hourly.time.indexOf(targetIso);
    if (idx === -1) idx = data.hourly.time.findIndex(t => t.startsWith(dateStr));
    if (idx === -1) idx = 0;
    const trendIdx = idx - 3;
    let baroTrend = "Steady";
    if (trendIdx >= 0) {
      const delta = data.hourly.surface_pressure[idx] - data.hourly.surface_pressure[trendIdx];
      baroTrend = delta > 0.02 ? "Rising" : delta < -0.02 ? "Falling" : "Steady";
    }
    const date = new Date(dateStr + "T12:00:00");
    return {
      date: dateStr,
      dow: DOW[new Date(dateStr + "T00:00:00").getDay()],
      sky: skyLabel(data.hourly.cloud_cover[idx]),
      airF: Math.round(data.hourly.temperature_2m[idx]),
      windDir: compassDirection(data.hourly.wind_direction_10m[idx]),
      windMph: Math.round(data.hourly.wind_speed_10m[idx]),
      baroTrend,
      moonPct: moonPhaseForDate(date),
      sunriseHour,
    };
  });
}

// ---------- render ----------

function renderWeekStrip(picks, selectedDate, bestDate) {
  return picks.map(p => {
    const good = p.c && p.c.score >= MATCH_MIN;
    return `<button class="day" data-day="${esc(p.f.date)}" aria-pressed="${p.f.date === selectedDate}">
      <b>${esc(p.f.dow)} ${esc(dayShort(p.f.date))}</b>
      <span class="wx">${esc(p.f.sky)}, ${p.f.airF}°F</span>
      <span class="wx">${esc(p.f.windDir)} ${p.f.windMph} mph, ${p.f.baroTrend.toLowerCase()}</span>
      <span class="m ${good ? "" : "none"}">${good ? `Like ${esc(dayShort(p.c.trip.date))}, ${p.c.score} of 5` : "No trip like it"}</span>
      ${p.f.date === bestDate ? `<span class="tagbest">Best match</span>` : ""}
    </button>`;
  }).join("");
}

function renderChecksTable(f, c) {
  return `<table class="data-table"><thead><tr><th>Morning of</th><th>${esc(f.dow)} forecast</th><th>${esc(dayShort(c.trip.date))} trip</th><th></th></tr></thead><tbody>
    ${c.checks.map(x => `<tr><td class="muted">${esc(x[0])}</td><td>${esc(x[1])}</td><td>${esc(x[2])}</td><td class="${x[3] ? "ok" : "off"}">${x[3] ? "Match" : "Differs"}</td></tr>`).join("")}
  </tbody></table>`;
}

function renderPlanFound(f, c, allCleanRows, allSpots) {
  const plan = buildPlan(f, c.trip, allCleanRows);
  const S = plan.stops;
  const w = c.trip.rows.map(r => r.weight_lbs).filter(has);
  const result = `${c.trip.rows.length} fish` + (w.length >= 5 ? `, best five ${lb(bestFive(c.trip.rows))}` : w.length ? `, biggest ${lb(Math.max(...w))}` : "");
  const left = `<section class="plan-left">
    <h2>${esc(f.dow)} ${esc(dayShort(f.date))}: on the water by ${clockTime(r5(S[0].start - 0.17))}, done by ${clockTime(S[S.length - 1].end)}</h2>
    <p class="plan-lead">Sunrise is ${clockTime(f.sunriseHour)}. The morning looks like your ${esc(dayShort(c.trip.date))} trip, which produced ${result}. This is that run, moved to ${DAY_NAMES[f.dow]}'s clock.</p>
    <h3>Rig before you launch</h3>
    <div class="rig">${plan.rig.map(([l, n]) => `<span>${esc(l)}<small>${n} fish that day</small></span>`).join("")}${plan.backup ? `<span>Backup: ${esc(plan.backup[0])}<small>${plan.backup[1]} fish on other days</small></span>` : ""}</div>
    <h3>Your run</h3>
    ${S.map((s, i) => `${i && s.start - S[i - 1].end > QUIET_GAP_HOURS ? `<p class="quiet">${clockTime(S[i - 1].end)} to ${clockTime(s.start)}: no fish logged in this stretch on ${esc(dayShort(c.trip.date))}. Stay and work deeper, or make the run early.</p>` : ""}
      <div class="stop"><div class="n">${i + 1}</div><div>
        <div class="head"><span class="when">${clockTime(s.start)} to ${clockTime(s.end)}</span><span class="muted" style="font-size:14px">${i ? trimNum(miles(S[i - 1], s), 1) + " mi from stop " + i + ", " : ""}${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}</span></div>
        <p class="do">${stopText(s)}</p>
        <p class="why">${s.rows.length} fish here on ${esc(dayShort(c.trip.date))}${has(s.best) ? ", best " + lb(s.best) : ""}. No bite by ${clockTime(s.end)}, move on.</p>
      </div></div>`).join("")}
    <div class="try"><b>Worth testing.</b> ${esc(worthTesting(plan, f, c.trip, allCleanRows))}</div>
    <button class="btn btn-outline-accent quietbtn" id="print-plan" type="button">Print this plan</button>
  </section>`;
  const right = `<section class="plan-right">
    <h2>Your run on the map</h2>
    <div id="route-map-canvas" class="leaflet-canvas"></div>
    <p class="note">Faint dots are your other spots. The route is drawn as straight lines, not routed over water.</p>
    <h2 style="margin-top:36px">Why ${esc(dayShort(c.trip.date))}<span class="count-tag">${c.score} of 5 conditions match</span></h2>
    ${renderChecksTable(f, c)}
  </section>`;
  return { left, right, stops: S, allSpots };
}

function renderPlanNotFound(f, c) {
  const left = `<section class="plan-left">
    <h2>No plan for ${esc(f.dow)} ${esc(dayShort(f.date))} yet</h2>
    <p class="plan-lead">You have not logged a trip on a morning like this, so there are no stops to send you to. Pick a day with a match, or fish this one and log it to start a plan for mornings like it.</p>
  </section>`;
  const right = c ? `<section class="plan-right">
    <h2>Closest trip: ${esc(dayShort(c.trip.date))}<span class="count-tag">${c.score} of 5 conditions match</span></h2>
    ${renderChecksTable(f, c)}
    <p class="note">A plan needs at least ${MATCH_MIN} matching conditions.</p>
  </section>` : "";
  return { left, right };
}
