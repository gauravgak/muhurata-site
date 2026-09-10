/* Saved birth details. When signed in, GET /api/profile once and prefill
   any form that asks for name / DOB / TOB / place / phone, so nobody
   types their birth details twice. Load after api.js + auth.js. */
(function (w) {
  w.mhProfile = null;

  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!m) return iso || "";
    var mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return (+m[3]) + " " + mon[+m[2] - 1] + " " + m[1];
  }
  function fmtTime(hm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(hm || "");
    if (!m) return hm || "";
    var h = +m[1], ap = h < 12 ? "AM" : "PM", h12 = h % 12 || 12;
    return h12 + ":" + m[2] + " " + ap;
  }

  function setVal(sel, val) {
    var el = document.querySelector(sel);
    if (el && !el.value && val) { el.value = val; el.dispatchEvent(new Event("change", { bubbles: true })); }
  }
  function setTrigger(sel, text) {
    var el = document.querySelector(sel);
    if (el && val_looks_empty(el) && text) el.textContent = text;
  }
  function val_looks_empty(triggerEl) {
    var t = (triggerEl.textContent || "").trim().toLowerCase();
    return t === "" || t.indexOf("select") === 0;
  }

  /* mapping: { name:'#nm', place:'#pob', phone:'#wa',
               dob:'#dob', tob:'#tob',
               dobTrigger:'#dob-trig', tobTrigger:'#tob-trig' }  */
  w.mhFillForm = function (map) {
    var p = w.mhProfile;
    if (!p) return;
    if (map.name) setVal(map.name, p.name);
    if (map.place) setVal(map.place, p.place);
    if (map.phone) setVal(map.phone, p.phone);
    if (map.dob) setVal(map.dob, p.dob);
    if (map.tob) setVal(map.tob, p.tob);
    if (map.dobTrigger && p.dob) setTrigger(map.dobTrigger, fmtDate(p.dob));
    if (map.tobTrigger && p.tob) setTrigger(map.tobTrigger, fmtTime(p.tob));
  };

  w.mhSaveProfile = function (fields) {
    if (!(w.mhAuth && w.mhAuth.user())) return Promise.resolve();
    return w.mhApiFetch("/api/profile", { method: "PUT", body: fields })
      .then(function () { w.mhProfile = Object.assign({}, w.mhProfile || {}, fields); })
      .catch(function () {});
  };

  function load() {
    if (!(w.mhAuth && w.mhAuth.user())) { w.mhProfile = null; return; }
    w.mhApiFetch("/api/profile")
      .then(function (p) {
        w.mhProfile = p && Object.keys(p).length ? p : null;
        w.dispatchEvent(new CustomEvent("mh-profile", { detail: w.mhProfile }));
      })
      .catch(function () {});
  }

  if (w.mhAuth && w.mhAuth.ready) {
    w.mhAuth.ready.then(load);
    w.mhAuth.onChange(function () { load(); });
  } else {
    document.addEventListener("DOMContentLoaded", load);
  }
})(window);
