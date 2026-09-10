/* Muhurata auth — Supabase (Google sign-in), no build step.
   Loads after config.js and the supabase-js UMD bundle.

   Exposes window.mhAuth:
     .ready         Promise that resolves once the session is known
     .user()        current user object or null
     .token()       current access token (string) or null
     .signInGoogle()
     .signOut()
     .onChange(fn)  subscribe to {user} changes

   Also keeps any element with [data-mh-auth] in sync:
     <button data-mh-auth data-signed-out="Sign in">Sign in</button>
   gets its text swapped to the email when signed in, and a click
   toggles sign-in / sign-out.
*/
(function (w) {
  var cfg = w.MH_CONFIG || {};
  var listeners = [];
  var _user = null;
  var client = null;

  function make() {
    if (!w.supabase || !cfg.SUPABASE_URL || cfg.SUPABASE_ANON_KEY === "REPLACE_WITH_SUPABASE_ANON_KEY") {
      console.warn("[mhAuth] Supabase not configured — sign-in disabled.");
      return null;
    }
    return w.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }

  function emit() {
    listeners.forEach(function (fn) { try { fn({ user: _user }); } catch (e) {} });
    syncButtons();
  }

  function syncButtons() {
    var els = document.querySelectorAll("[data-mh-auth]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (_user) {
        el.textContent = _user.email || "Signed in";
        el.setAttribute("data-state", "in");
      } else {
        el.textContent = el.getAttribute("data-signed-out") || "Sign in";
        el.setAttribute("data-state", "out");
      }
    }
  }

  var ready = (async function () {
    /* DEV ONLY: config.js sets DEV_USER on localhost. Skip Supabase and
       present as signed in so Naksha / predictions are usable locally. */
    if (cfg.DEV_USER) {
      _user = { id: "dev-user", email: cfg.DEV_USER };
      syncButtons();
      return;
    }
    client = make();
    if (!client) { syncButtons(); return; }
    try {
      var res = await client.auth.getSession();
      _user = (res.data && res.data.session && res.data.session.user) || null;
    } catch (e) { _user = null; }
    client.auth.onAuthStateChange(function (_evt, session) {
      _user = (session && session.user) || null;
      emit();
    });
    emit();
  })();

  w.mhAuth = {
    ready: ready,
    user: function () { return _user; },
    token: async function () {
      if (!client) return null;
      try {
        var res = await client.auth.getSession();
        return (res.data && res.data.session && res.data.session.access_token) || null;
      } catch (e) { return null; }
    },
    signInGoogle: function () {
      if (!client) { alert("Sign-in isn't configured yet."); return; }
      return client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: w.location.origin + w.location.pathname },
      });
    },
    signOut: function () { return client ? client.auth.signOut() : null; },
    onChange: function (fn) { listeners.push(fn); if (_user !== undefined) fn({ user: _user }); },
  };

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("[data-mh-auth]");
    if (!btn) return;
    e.preventDefault();
    if (_user) w.mhAuth.signOut();
    else w.mhAuth.signInGoogle();
  });

  document.addEventListener("DOMContentLoaded", syncButtons);
})(window);
