// Fetch layer for the Lake Intel page.
//
// Water.name isn't canonical across users (everyone renames their own
// copy), so the search box searches the signed-in user's *own* waters —
// exactly the lakes they've already told the app matter — rather than
// any shared namespace. Selecting one rounds its coordinates to the same
// grid precision catch_trends/structure_trends use and queries those
// public, k-anonymous tables for that cell (plus its immediate
// neighbors, since a real lake usually spans more than one ~1km cell).

const GRID_PRECISION = 0.01; // must match round(lat/lng, 2) in the SQL
const GRID_NEIGHBOR_PAD = 0.01; // ±1 grid step

async function loadUserWaters(client, userId) {
  const { data, error } = await client.from("waters").select("*").eq("user_id", userId).order("name");
  if (error) throw error;
  return data || [];
}

async function loadTrendsNearWater(client, water) {
  const gridLat = Math.round(water.latitude / GRID_PRECISION) * GRID_PRECISION;
  const gridLng = Math.round(water.longitude / GRID_PRECISION) * GRID_PRECISION;
  const latMin = gridLat - GRID_NEIGHBOR_PAD, latMax = gridLat + GRID_NEIGHBOR_PAD;
  const lngMin = gridLng - GRID_NEIGHBOR_PAD, lngMax = gridLng + GRID_NEIGHBOR_PAD;

  const [catchTrendsRes, structureTrendsRes] = await Promise.all([
    client.from("catch_trends").select("*")
      .gte("grid_lat", latMin).lte("grid_lat", latMax)
      .gte("grid_lng", lngMin).lte("grid_lng", lngMax),
    client.from("structure_trends").select("*")
      .gte("grid_lat", latMin).lte("grid_lat", latMax)
      .gte("grid_lng", lngMin).lte("grid_lng", lngMax),
  ]);

  if (catchTrendsRes.error) throw catchTrendsRes.error;
  if (structureTrendsRes.error) throw structureTrendsRes.error;

  return { catchTrends: catchTrendsRes.data || [], structureTrends: structureTrendsRes.data || [] };
}

// The "your catches" dots on the hot-zones map are the one piece of
// private data on this page — the signed-in user's own catches tagged to
// this water. Safe to show in full (RLS already scopes it to them).
async function loadOwnCatchesForWater(client, userId, waterId) {
  const { data, error } = await client.from("catches")
    .select("latitude, longitude, lure_display_name_snapshot, depth_at_catch")
    .eq("user_id", userId)
    .eq("water_id", waterId);
  if (error) throw error;
  return data || [];
}
