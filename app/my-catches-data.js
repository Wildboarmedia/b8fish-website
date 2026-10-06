// Fetch layer for the My Catches page — three queries cover everything.
// Reads catches_clean (not catches) so every soft-flagged test/junk row
// (see catches_cleanup.sql) is excluded before anything downstream ever
// sees it. RLS already scopes everything to the signed-in user (no .eq
// needed, but harmless to add defensively); waters/lakes are queried
// separately because catches only stores water_id + its own lat/lng, not
// the water's or lake's name.

async function loadMyCatchesRaw(client, userId) {
  const [
    { data: catches, error: catchesError },
    { data: waters, error: watersError },
    { data: lakes, error: lakesError },
  ] = await Promise.all([
    client.from("catches_clean").select("*").eq("user_id", userId).order("timestamp", { ascending: false }),
    client.from("waters").select("*").eq("user_id", userId),
    client.from("lakes").select("*").eq("user_id", userId),
  ]);

  if (catchesError) throw catchesError;
  if (watersError) throw watersError;
  if (lakesError) throw lakesError;

  return { catches: catches || [], waters: waters || [], lakes: lakes || [] };
}
