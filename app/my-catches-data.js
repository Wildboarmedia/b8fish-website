// Fetch layer for the My Catches page — two queries cover everything.
// RLS already scopes `catches` to the signed-in user (no .eq needed, but
// harmless to add defensively); `waters` is queried separately because
// catches only stores water_id + its own lat/lng, not the water's name.

async function loadMyCatchesRaw(client, userId) {
  const [{ data: catches, error: catchesError }, { data: waters, error: watersError }] = await Promise.all([
    client.from("catches").select("*").eq("user_id", userId).order("timestamp", { ascending: false }),
    client.from("waters").select("*").eq("user_id", userId),
  ]);

  if (catchesError) throw catchesError;
  if (watersError) throw watersError;

  return { catches: catches || [], waters: waters || [] };
}
