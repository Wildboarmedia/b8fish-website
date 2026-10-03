// Fetch layer for the Lures page.

async function loadUserLures(client, userId) {
  const { data, error } = await client
    .from("lures")
    .select("*")
    .eq("user_id", userId)
    .order("date_added", { ascending: false });
  if (error) throw error;
  return data || [];
}
