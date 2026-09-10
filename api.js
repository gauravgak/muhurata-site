/* mhApiFetch — one wrapper for every call to the Muhurata API.

   - prefixes MH_CONFIG.API_BASE
   - attaches the Supabase bearer token when signed in
   - turns transport / status problems into an Error with a .code and a
     calm, user-facing .message:
        "unauthorized"  401  -> please sign in
        "rate_limited"  429  -> going too fast
        "unavailable"   503  -> briefly down, try again
        "cold"          network fail / timeout -> server waking up
        "http"          any other non-2xx (message from body.detail)
   Returns the parsed JSON body on success. For non-JSON (PDF) pass
   {raw:true} and get the Response back.
*/
(function (w) {
  var FRIENDLY = {
    unauthorized: "Please sign in to continue.",
    rate_limited: "You're going a little fast — wait a minute and try again.",
    unavailable: "We're briefly unavailable. Please try again in a moment.",
    cold: "Waking the server up — this first request can take up to a minute. Trying again…",
  };

  async function mhApiFetch(path, opts) {
    opts = opts || {};
    var cfg = w.MH_CONFIG || {};
    var url = /^https?:/.test(path) ? path : (cfg.API_BASE || "") + path;

    var headers = Object.assign({}, opts.headers || {});
    if (opts.body && !headers["Content-Type"] && !(opts.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    if (!opts.anon && w.mhAuth) {
      try {
        var tok = await w.mhAuth.token();
        if (tok) headers["Authorization"] = "Bearer " + tok;
      } catch (e) {}
    }

    var res;
    try {
      res = await fetch(url, {
        method: opts.method || (opts.body ? "POST" : "GET"),
        headers: headers,
        body: opts.body && typeof opts.body !== "string" && !(opts.body instanceof FormData)
          ? JSON.stringify(opts.body) : opts.body,
      });
    } catch (e) {
      throw mkErr("cold");
    }

    if (res.ok) return opts.raw ? res : res.json();

    if (res.status === 401) throw mkErr("unauthorized");
    if (res.status === 429) throw mkErr("rate_limited");
    if (res.status === 503) throw mkErr("unavailable");

    var detail = null;
    try { detail = (await res.json()).detail; } catch (e) {}
    throw mkErr("http", detail || ("Request failed (" + res.status + ").") , res.status);
  }

  function mkErr(code, message, status) {
    var e = new Error(message || FRIENDLY[code] || "Something went wrong.");
    e.code = code;
    if (status) e.status = status;
    return e;
  }

  w.mhApiFetch = mhApiFetch;
  w.MH_ERR = FRIENDLY;
})(window);
