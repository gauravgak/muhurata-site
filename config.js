/* Public runtime config. Safe to commit — the Supabase publishable key is
   designed to be public; real authority is row-level policies + the API's
   JWT check. Edit per environment. */
(function (w) {
  var cfg = {
    // TODO: confirm this is your Render service URL (Dashboard → the
    // service → the onrender.com address). If different, fix here AND in
    // netlify.toml's connect-src.
    API_BASE: "https://muhurata-api.onrender.com",

    SUPABASE_URL: "https://dxgqykmbjbleawjsxekv.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_qCvSDzRjjoAnyvSo5HuL6g_2BtOQY8L",

    /* DEV ONLY: auth.js treats the visitor as signed in with this email
       and skips Supabase. Auto-set on localhost below. Empty in prod. */
    DEV_USER: "",
  };

  /* Local development: talk to a local API and bypass sign-in. */
  var host = w.location && w.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    if (/onrender\.com$/.test(cfg.API_BASE)) cfg.API_BASE = "http://127.0.0.1:8123";
    if (!cfg.DEV_USER) cfg.DEV_USER = "dev@localhost";
  }

  w.MH_CONFIG = cfg;
  w.API_BASE = cfg.API_BASE; /* back-compat for inline scripts */
})(window);
