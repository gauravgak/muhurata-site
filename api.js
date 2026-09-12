/* mhApiFetch — one wrapper for every call to the Muhurata API.

   - prefixes MH_CONFIG.API_BASE
   - attaches the Supabase bearer token when signed in
   - RETRIES automatically when the request never reaches the server
     (free-tier cold start: Render drops the connection while it wakes,
     ~20-60s). Up to 3 attempts over ~20s before giving up.
   - turns transport / status problems into an Error with a .code and a
     calm, user-facing .message:
        "unauthorized"  401  -> please sign in
        "rate_limited"  429  -> going too fast
        "unavailable"   503  -> briefly down, try again
        "cold"          still unreachable after retries
        "http"          any other non-2xx (message from body.detail)
   Returns the parsed JSON body on success. For non-JSON (PDF) pass
   {raw:true} and get the Response back.

   Retrying is safe even for writing endpoints: a thrown fetch means the
   request never landed, so nothing was created server-side.
*/
(function (w) {
  var FRIENDLY = {
    unauthorized: "Please sign in to continue.",
    rate_limited: "You're going a little fast — wait a minute and try again.",
    unavailable: "We're briefly unavailable. Please try again in a moment.",
    cold: "The server's still waking up — give it a minute and try once more.",
  };

  var RETRY_DELAYS = [4000, 9000]; // ms before attempt 2 and attempt 3

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

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

    var init = {
      method: opts.method || (opts.body ? "POST" : "GET"),
      headers: headers,
      body: opts.body && typeof opts.body !== "string" && !(opts.body instanceof FormData)
        ? JSON.stringify(opts.body) : opts.body,
    };

    var res, threw;
    for (var attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      if (attempt > 0) {
        if (typeof opts.onRetry === "function") { try { opts.onRetry(attempt); } catch (e) {} }
        await sleep(RETRY_DELAYS[attempt - 1]);
      }
      threw = false;
      try {
        res = await fetch(url, init);
      } catch (e) {
        threw = true;           // connection reset / DNS / CORS — retry
        continue;
      }
      // 502/504 from Render's edge during wake are also "not really up yet"
      if (res.status === 502 || res.status === 504) { threw = true; continue; }
      break;
    }
    if (threw) throw mkErr("cold");

    if (res.ok) return opts.raw ? res : res.json();

    if (res.status === 401) throw mkErr("unauthorized");
    if (res.status === 429) throw mkErr("rate_limited");
    if (res.status === 503) throw mkErr("unavailable");

    var detail = null;
    try { detail = (await res.json()).detail; } catch (e) {}
    throw mkErr("http", detailToMessage(detail) || ("Request failed (" + res.status + ")."), res.status);
  }

  /* FastAPI's own validation errors (422 from a bad field, before your
     handler even runs) put `detail` as an ARRAY of {msg, loc, ...}
     objects, not a string - passed straight to `new Error(...)` that
     stringifies to the useless "[object Object]". Pull out the actual
     messages instead. A plain string `detail` (your own HTTPException)
     passes through unchanged. */
  function detailToMessage(detail) {
    if (!detail) return null;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      var msgs = detail.map(function (d) {
        return (d && typeof d === "object" && d.msg) ? d.msg : String(d);
      }).filter(Boolean);
      return msgs.length ? msgs.join(" ") : null;
    }
    return null;
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
