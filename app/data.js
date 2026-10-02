// Temporary hardcoded data for the app/ routes, copied from the approved
// mockup (b8fish-dashboard-mockup.html). This is the seam where real
// Supabase queries will replace these exports later — nothing else in
// components.js or the page scripts should need to change shape.

const MyCatchesData = {
  dateRange: "AUG 19 – SEP 27, 2026",
  filters: [
    { label: "All waters", active: true },
    { label: "Lake Lanier", active: false },
    { label: "Home Pond", active: false },
    { label: "Last 30 days", active: false },
    { label: "All time", active: false },
  ],
  kpis: [
    { label: "Catches", value: "18", unit: "fish", sub: "8 trips · 4 waters" },
    { label: "Per trip", value: "2.3", unit: "avg", sub: "Best: 6 on Sep 27" },
    { label: "Biggest fish", value: "8", unit: "lb", sub: "Walleye · 20 in · Home Pond" },
    { label: "Biggest bass", value: "3.5", unit: "lb", sub: "Largemouth · 18 in · Lanier" },
    { label: "Species", value: "5", unit: "", sub: "Spotted bass lead, 13 of 18" },
  ],
  hero: {
    kicker: "What's working for you right now",
    headline: "Spots on Lanier followed the sun down the point: 2 ft at dawn, 25 ft by 11 a.m.",
    body: "Your Sep 27 trip landed 6 spotted bass. Three came in 17 minutes on a Littma Fission Pop 70 with a medium retrieve over 25 ft, clear skies, barometer rising.",
    primaryCta: { label: "See what others are catching", href: "lake-intel.html" },
    secondaryCta: { label: "Plan my next trip" },
  },
  patterns: [
    { title: "Mid-morning is your window", metric: "61%", desc: "11 of your 18 fish came between 8 a.m. and noon. Only one before 7.", filled: 3, conf: "Building · 18 catches" },
    { title: "Points on Lanier", metric: "7/7", desc: "Every Lanier fish with structure logged came off a bottom-contour point.", filled: 2, conf: "Early signal · 7 catches" },
    { title: "Rising barometer", metric: "78%", desc: "7 of 9 Lanier fish came on rising or steady pressure.", filled: 2, conf: "Early signal · 9 catches" },
    { title: "Go deeper as the day warms", metric: "↓ 23 ft", desc: "On Sep 27: 2 ft at 6:49, 14 ft at 8:46, 20 ft at 9:23, 25 ft from 11:07.", filled: 1, conf: "One trip · watch this" },
  ],
  // 5a .. 9p, 17 hourly bars. "prime" hours are 8a-11a (shown lime when > 0).
  biteClock: {
    hours: ["5a","6a","7a","8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p","8p","9p"],
    values: [0,1,0,1,4,0,6,0,0,0,2,0,1,1,2,0,0],
    primeHours: ["8a","9a","10a","11a"],
    tickHours: ["6a","9a","12p","3p","6p","9p"],
  },
  lures: [
    { name: "Littma Fission Pop 70", lead: true, fish: 4, avgLen: "13.0\"", bestFish: "16\" · 3 lb", water: "Lake Lanier", retrieve: "Medium" },
    { name: "Chugbug", fish: 4, avgLen: "—", bestFish: "Walleye 20\" · 8 lb", water: "Home Pond", retrieve: "Fast" },
    { name: "Zoom Super Fluke", fish: 3, avgLen: "15.8\"", bestFish: "18\" · 3.5 lb", water: "Lake Lanier", retrieve: "Medium" },
    { name: "Keitech Easy Shiner", fish: 3, avgLen: "—", bestFish: "—", water: "Metro waters", retrieve: "—" },
    { name: "Strike King Dream Shot", fish: 2, avgLen: "12.0\"", bestFish: "14\" · 2 lb", water: "Lake Lanier", retrieve: "Slow" },
    { name: "Roboworm Fat Straight Tail", fish: 1, avgLen: "—", bestFish: "—", water: "Home Pond", retrieve: "—" },
    { name: "Googan Jr Scout", fish: 1, avgLen: "—", bestFish: "—", water: "Home Pond", retrieve: "—" },
  ],
  speciesMix: [
    { name: "Spotted Bass", n: 13, valueLabel: "13 · 72%", tone: "lead" },
    { name: "Yellow Perch", n: 2, valueLabel: "2", tone: "default" },
    { name: "Largemouth Bass", n: 1, valueLabel: "1", tone: "default" },
    { name: "Smallmouth Bass", n: 1, valueLabel: "1", tone: "default" },
    { name: "Walleye", n: 1, valueLabel: "1 · biggest", tone: "alt" },
  ],
  depthAtCatch: {
    sub: "11 catches with depth logged",
    bins: [
      { name: "0–5 ft", n: 4, tone: "default" },
      { name: "6–15 ft", n: 1, tone: "default" },
      { name: "16–25 ft", n: 6, tone: "lead" },
    ],
  },
  map: {
    water: "Lake Lanier",
    sub: "9 fish · 6 spots · stylized map",
    width: 580, height: 300,
    shoreline: [
      "20,250 70,222 130,196 200,170 260,140 330,122 410,104 520,72 560,60",
      "200,170 205,120 199,64 185,20",
      "330,122 400,160 474,205 540,230",
      "410,104 430,50 460,15",
      "130,196 110,250 95,290",
    ],
    dots: [
      { cx: 61, cy: 224, r: 16, label: "3" },
      { cx: 170, cy: 182, r: 10 },
      { cx: 201, cy: 172, r: 10 },
      { cx: 254, cy: 140, r: 10 },
      { cx: 474, cy: 205, r: 10 },
      { cx: 199, cy: 64, r: 13, label: "2" },
    ],
    callouts: [
      { x: 83, y: 229, text: "Fission Pop 70 · 25 ft" },
    ],
    legend: [
      { color: "var(--accent)", label: "Your catches" },
    ],
    chips: [
      { label: "Lake Lanier · 9", active: true },
      { label: "Home Pond, Dunwoody · 7", active: false },
      { label: "Other metro · 2", active: false },
    ],
  },
  conditions: [
    { label: "Barometer", value: "Rising ↑", sub: "7 of 9 Lanier fish · 28.79–28.82 inHg" },
    { label: "Moon", value: "Near full", sub: "10 of 18 fish at 90%+ illumination" },
    { label: "Sky", value: "Clear", sub: "7 fish · your best day was bluebird" },
    { label: "Wind", value: "Light", sub: "Sep 27 bite: N 1–4, gusts ≤ 6 mph" },
    { label: "Air temp", value: "50–67°F", sub: "Your best morning warmed 17° in 5 hrs" },
    { label: "Retrieve", value: "Medium", sub: "7 of 11 logged retrieves" },
  ],
  catchLog: {
    sub: "10 most recent of 18",
    rows: [
      { date: "Sep 27", time: "11:24a", species: "Spotted Bass", size: "11\" · 1 lb", lure: "Fission Pop 70", retrieve: "Medium", depth: "25 ft", water: "Lake Lanier", conditions: "Clear · 67° · ↑" },
      { date: "Sep 27", time: "11:15a", species: "Spotted Bass", size: "13\" · 2 lb", lure: "Fission Pop 70", retrieve: "Medium", depth: "25 ft", water: "Lake Lanier", conditions: "Clear · 67° · ↑" },
      { date: "Sep 27", time: "11:07a", species: "Spotted Bass", size: "16\" · 3 lb", lure: "Fission Pop 70", retrieve: "Medium", depth: "25 ft", water: "Lake Lanier", conditions: "Clear · 67° · ↑" },
      { date: "Sep 27", time: "9:23a", species: "Spotted Bass", size: "13\"", lure: "Zoom Super Fluke", retrieve: "Medium", depth: "20 ft", water: "Lake Lanier", conditions: "Clear · 59° · ↑" },
      { date: "Sep 27", time: "8:46a", species: "Spotted Bass", size: "10\"", lure: "SK Dream Shot", retrieve: "Slow", depth: "14 ft", water: "Lake Lanier", conditions: "Clear · 53° · ↑" },
      { date: "Sep 27", time: "6:49a", species: "Spotted Bass", size: "12\" · 1.5 lb", lure: "Fission Pop 70", retrieve: "Medium", depth: "2 ft", water: "Lake Lanier", conditions: "Clear · 50° · →" },
      { date: "Sep 26", time: "3:24p", species: "Yellow Perch", size: "—", lure: "Chugbug", retrieve: "—", depth: "—", water: "Home Pond", conditions: "Clear · 79° · ↓" },
      { date: "Sep 23", time: "7:42p", species: "Walleye", size: "20\" · 8 lb", lure: "Chugbug", retrieve: "Fast", depth: "23 ft", water: "Home Pond", conditions: "Mostly cloudy · 70° · ↓" },
      { date: "Sep 23", time: "7:39p", species: "Smallmouth Bass", size: "—", lure: "Chugbug", retrieve: "—", depth: "—", water: "Home Pond", conditions: "Mostly cloudy · 70° · ↓" },
      { date: "Sep 20", time: "9:40a", species: "Spotted Bass", size: "—", lure: "Chugbug", retrieve: "Fast", depth: "1 ft", water: "Home Pond", conditions: "Mostly clear · 74° · ↑" },
    ],
  },
  warnCallout: {
    text: "7 catches are missing length, weight or depth. Filling them in sharpens your patterns.",
    cta: "Complete catches",
  },
};

const LakeIntelData = {
  eyebrow: "LAKE INTEL · COMMUNITY DATA",
  sampleBadge: "SAMPLE DATA",
  lakeName: "Lake Lanier, GA",
  sub: "38,000 acres · Updated 12 min ago · Based on catches from anglers who share anonymously",
  search: { label: "Search a lake", placeholder: "Lake Lanier", quickLakes: ["Lake Allatoona", "West Point", "Hartwell"] },
  kpis: [
    { label: "Catches logged", value: "1,284", unit: "", sub: "Last 30 days · ↑ 18% vs prior" },
    { label: "Active anglers", value: "212", unit: "", sub: "47 fished this week" },
    { label: "Top species", value: "71", unit: "%", sub: "Spotted bass share of catches" },
    { label: "Avg spot", value: "14.2", unit: "in", sub: "You: 13.2 in (8 measured)" },
    { label: "Peak window", value: "7–10", unit: "am", sub: "Weekdays and weekends" },
  ],
  hotZonesMap: {
    sub: "Community catches, generalized to half-mile zones",
    width: 754, height: 390,
    shoreline: [
      "26,325 91,289 169,255 260,221 338,182 429,159 533,135 676,94 728,78",
      "260,221 266,156 259,83 240,26",
      "429,159 520,208 616,266 702,299",
      "533,135 559,65 598,20",
      "169,255 143,325 124,377",
    ],
    heatZones: [
      { cx: 79, cy: 291, r1: 61, o1: 0.18, r2: 34, o2: 0.45 },
      { cx: 260, cy: 221, r1: 47, o1: 0.14, r2: 26, o2: 0.36 },
      { cx: 330, cy: 182, r1: 37, o1: 0.11, r2: 21, o2: 0.27 },
      { cx: 429, cy: 159, r1: 51, o1: 0.16, r2: 29, o2: 0.41 },
      { cx: 616, cy: 266, r1: 42, o1: 0.13, r2: 23, o2: 0.32 },
      { cx: 259, cy: 83, r1: 33, o1: 0.09, r2: 18, o2: 0.23 },
      { cx: 559, cy: 78, r1: 28, o1: 0.07, r2: 16, o2: 0.18 },
      { cx: 143, cy: 325, r1: 28, o1: 0.07, r2: 16, o2: 0.18 },
    ],
    dots: [
      { cx: 79, cy: 291, r: 8, label: "3" },
      { cx: 221, cy: 237, r: 8 },
      { cx: 261, cy: 224, r: 8 },
      { cx: 330, cy: 182, r: 8 },
      { cx: 616, cy: 266, r: 8 },
      { cx: 259, cy: 83, r: 8, label: "2" },
    ],
    callouts: [
      { x: 101, y: 296, text: "Fission Pop 70 · 25 ft" },
    ],
    legend: [
      { color: "var(--series-orange)", label: "Community activity" },
      { color: "var(--accent)", label: "Your catches (only you see these)" },
    ],
  },
  biteWindow: {
    sub: "Catches per time block, last 30 days",
    timeBlocks: ["5a", "8a", "11a", "2p", "5p", "8p"],
    days: [
      { label: "Mon", values: [22, 77, 55, 22, 44, 33] },
      { label: "Tue", values: [33, 88, 55, 11, 44, 33] },
      { label: "Wed", values: [22, 77, 66, 22, 55, 22] },
      { label: "Thu", values: [33, 99, 55, 22, 44, 33] },
      { label: "Fri", values: [33, 88, 66, 22, 55, 44] },
      { label: "Sat", values: [55, 110, 77, 33, 55, 44] },
      { label: "Sun", values: [44, 99, 77, 33, 44, 33] },
    ],
  },
  topLures: [
    { name: "Zoom Super Fluke", you: "You: 3", trend: "up", trendVal: "↑ 4", share: "18%", widthPct: 100, mine: true },
    { name: "Littma Fission Pop 70", you: "You: 4 · #2 on lake", trend: "up", trendVal: "↑ 9", share: "14%", widthPct: 78, mine: true },
    { name: "Keitech Easy Shiner", you: null, trend: "flat", trendVal: "→", share: "12%", widthPct: 67, mine: false },
    { name: "Strike King Dream Shot", you: "You: 2", trend: "down", trendVal: "↓ 2", share: "11%", widthPct: 61, mine: true },
    { name: "SPRO McStick 110", you: null, trend: "up", trendVal: "↑ 3", share: "9%", widthPct: 50, mine: false },
    { name: "Zoom Trick Worm", you: null, trend: "down", trendVal: "↓ 1", share: "8%", widthPct: 44, mine: false },
    { name: "Big Bite Baits Kriet Tail", you: null, trend: "up", trendVal: "↑ 1", share: "6%", widthPct: 33, mine: false },
  ],
  structureProducing: [
    { name: "Points", n: 42, tone: "lead" },
    { name: "Docks", n: 23, tone: "default" },
    { name: "Brush piles", n: 18, tone: "default" },
    { name: "Humps", n: 11, tone: "default" },
    { name: "Other", n: 6, tone: "default" },
  ],
  depthThisMonth: {
    sub: "Fish are sliding deeper as water cools",
    bins: [
      { name: "0–10 ft", n: 22, tone: "default" },
      { name: "11–20 ft", n: 37, tone: "default" },
      { name: "21–30 ft", n: 41, tone: "lead" },
    ],
  },
  conditionsTurnOn: [
    { label: "Rising barometer", value: "1.4×", sub: "Catch rate vs falling pressure" },
    { label: "Wind 5–10 mph", value: "1.2×", sub: "Chop on points beats flat calm" },
    { label: "Water temp", value: "74–78°F", sub: "Current range, cooling ~1°/wk" },
    { label: "Full moon week", value: "1.3×", sub: "Next full moon: Oct 26" },
  ],
  compare: [
    { label: "Fish per trip", value: "You 3.0 · Lake 1.7", sub: "Top 20% of Lanier anglers" },
    { label: "Your top lure", value: "#2 on the lake", sub: "Fission Pop 70 is trending up" },
    { label: "Your depth", value: "25 ft", sub: "Lake mode is 21–30 ft. You're on it." },
    { label: "Untried pattern", value: "Docks · 23%", sub: "You haven't logged a dock fish yet" },
  ],
};
