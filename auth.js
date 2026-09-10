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
    renderAccounts();
  }

  /* Account control: fills every [data-mh-acct] container. Signed out ->
     a "Sign in" pill. Signed in -> a round avatar that opens a small
     menu with the name, email, "Sign out" and "Use another account". */
  function renderAccounts() {
    var hosts = document.querySelectorAll("[data-mh-acct]");
    for (var i = 0; i < hosts.length; i++) paintAccount(hosts[i]);
  }

  function closeAcctMenus(except) {
    var open = document.querySelectorAll(".mh-acct-menu");
    for (var i = 0; i < open.length; i++) if (open[i] !== except) open[i].hidden = true;
  }

  function paintAccount(host) {
    host.innerHTML = "";
    if (!_user) {
      var inBtn = document.createElement("button");
      inBtn.type = "button";
      inBtn.className = "mh-acct-in";
      inBtn.textContent = "Sign in";
      inBtn.addEventListener("click", function () { w.mhAuth.signInGoogle(); });
      host.appendChild(inBtn);
      return;
    }
    var p = w.mhAuth.profile() || { name: "You", email: "", avatar: "", initial: "Y" };
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mh-acct-btn";
    btn.setAttribute("aria-label", "Account");
    var ini = document.createElement("span");
    ini.className = "mh-acct-ini";
    ini.textContent = p.initial;
    btn.appendChild(ini);
    if (p.avatar) {
      var img = document.createElement("img");
      img.alt = "";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", function () { img.remove(); });
      img.addEventListener("load", function () { ini.hidden = true; });
      img.src = p.avatar;
      btn.appendChild(img);
    }

    var menu = document.createElement("div");
    menu.className = "mh-acct-menu";
    menu.hidden = true;
    var nm = document.createElement("div"); nm.className = "nm"; nm.textContent = p.name;
    var em = document.createElement("div"); em.className = "em"; em.textContent = p.email;
    var out = document.createElement("button"); out.type = "button"; out.textContent = "Sign out";
    out.addEventListener("click", function () { w.mhAuth.signOut(); });
    var sw = document.createElement("button"); sw.type = "button"; sw.textContent = "Use another account";
    sw.addEventListener("click", function () {
      Promise.resolve(w.mhAuth.signOut()).then(function () { w.mhAuth.signInGoogle(); });
    });
    menu.appendChild(nm); menu.appendChild(em); menu.appendChild(out); menu.appendChild(sw);

    btn.addEventListener("click", function () {
      var willOpen = menu.hidden;
      closeAcctMenus(menu);
      menu.hidden = !willOpen;
    });
    host.appendChild(btn);
    host.appendChild(menu);
  }

  /* Dismiss on any tap/click outside the widget. Capture phase so a
     stopPropagation() somewhere in the page can't trap the menu open;
     pointerdown so it closes on the press, before the tap resolves. */
  function outsideClose(e) {
    var t = e.target;
    if (t && t.closest && t.closest(".mh-acct")) return;
    closeAcctMenus(null);
  }
  document.addEventListener("pointerdown", outsideClose, true);
  document.addEventListener("click", outsideClose, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAcctMenus(null); });

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
        options: {
          redirectTo: w.location.origin + w.location.pathname,
          // always let the user pick which Google account
          queryParams: { prompt: "select_account" },
        },
      });
    },
    /* name / email / avatar for the account menu, from Google's claims */
    profile: function () {
      if (!_user) return null;
      var m = _user.user_metadata || {};
      var name = m.full_name || m.name || (_user.email || "").split("@")[0] || "You";
      return {
        name: name,
        email: _user.email || "",
        avatar: m.avatar_url || m.picture || "",
        initial: (name.trim()[0] || "?").toUpperCase(),
      };
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

  document.addEventListener("DOMContentLoaded", function () { syncButtons(); renderAccounts(); });
})(window);
