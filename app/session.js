// Shared session/paywall guard for every page under app/. Loaded after
// the Supabase CDN script and config.js.
//
// Usage from a page's inline script:
//   const session = await requireSession();      // redirects to login.html if none
//   const ok = await requireIsPro(session.user);  // renders an upgrade block + returns false if not paid
//   if (!ok) return;
//   ...fetch + render the real page...

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function requireSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.href = `login.html?redirect=${next}`;
    return null;
  }
  return session;
}

async function requireIsPro(user) {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("is_pro")
    .eq("id", user.id)
    .single();

  if (error || !data || !data.is_pro) {
    renderUpgradeBlock();
    return false;
  }
  return true;
}

function renderUpgradeBlock() {
  const main = document.querySelector(".app-main") || document.body;
  main.innerHTML = `
    <div class="panel" style="max-width:560px;margin:60px auto;text-align:center;">
      <div class="panel-head" style="align-items:center;">
        <h2>This is a B8fish Pro feature</h2>
        <div class="panel-note">Your catch dashboard and community trends unlock with B8fish Pro.</div>
      </div>
      <p class="text-muted" style="font-size:14px;">
        Upgrade from inside the B8fish app — paid access carries over to the website automatically,
        since it's the same account.
      </p>
      <button class="btn btn-secondary" id="upgrade-signout-btn" style="align-self:center;">Sign out</button>
    </div>
  `;
  const btn = document.getElementById("upgrade-signout-btn");
  if (btn) btn.addEventListener("click", signOut);
}

async function signOut() {
  await supabaseClient.auth.signOut();
  location.href = "login.html";
}
