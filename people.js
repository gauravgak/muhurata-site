/* Saved people. When signed in, remember everyone whose birth details
   you've entered, and offer a "pick a saved person" dropdown on every
   form (and a chip row in Naksha). Load after api.js + auth.js. */
(function (w) {
  w.mhPeople = [];

  function load() {
    if (!(w.mhAuth && w.mhAuth.user())) { w.mhPeople = []; return; }
    w.mhApiFetch("/api/people")
      .then(function (d) {
        var list = (d && d.people) || [];
        // always offer the user's own saved details, even before they've
        // saved anyone else
        var pr = w.mhProfile;
        if (pr && pr.dob && pr.tob && pr.place &&
            !list.some(function (x) { return x.dob === pr.dob && x.tob === pr.tob && x.place === pr.place; })) {
          list.unshift({ person_id: "me", name: (pr.name || "You"), dob: pr.dob, tob: pr.tob, place: pr.place });
        }
        w.mhPeople = list;
        w.dispatchEvent(new CustomEvent("mh-people", { detail: w.mhPeople }));
      })
      .catch(function () {});
  }

  w.mhSavePerson = function (p) {
    if (!(w.mhAuth && w.mhAuth.user())) return Promise.resolve();
    if (!(p && p.name && p.dob && p.tob && p.place)) return Promise.resolve();
    return w.mhApiFetch("/api/people", { method: "POST", body: p })
      .then(function () {
        var i = w.mhPeople.findIndex(function (x) { return x.name === p.name && x.dob === p.dob && x.tob === p.tob; });
        if (i >= 0) w.mhPeople.splice(i, 1);
        w.mhPeople.unshift(p);
        w.dispatchEvent(new CustomEvent("mh-people", { detail: w.mhPeople }));
      })
      .catch(function () {});
  };

  /* Build a <select> that fills a form when a person is chosen.
     map: { name, place, phone } are CSS selectors for text inputs;
          dob / tob are CSS selectors for plain inputs;
          dobWheel / tobWheel are hidden-input IDs handled by wheelpicker. */
  w.mhPeopleSelect = function (map, opts) {
    opts = opts || {};
    var sel = document.createElement("select");
    sel.className = "mh-people";
    function render() {
      sel.innerHTML = "";
      var o0 = document.createElement("option");
      o0.value = ""; o0.textContent = opts.label || "Pick a saved person…";
      sel.appendChild(o0);
      w.mhPeople.forEach(function (p, i) {
        var o = document.createElement("option");
        o.value = String(i);
        o.textContent = p.name + (p.dob ? " · " + p.dob : "");
        sel.appendChild(o);
      });
      sel.hidden = w.mhPeople.length === 0;
    }
    render();
    w.addEventListener("mh-people", render);
    sel.addEventListener("change", function () {
      var p = w.mhPeople[+sel.value];
      sel.value = "";
      if (p) w.mhFillFromPerson(p, map);
    });
    return sel;
  };

  w.mhFillFromPerson = function (p, map) {
    if (!p) return;
    function set(s, v) {
      var el = s && document.querySelector(s);
      if (el && v != null) { el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); }
    }
    set(map.name, p.name); set(map.place, p.place); set(map.phone, p.phone);
    set(map.dob, p.dob); set(map.tob, p.tob);
    if (map.dobWheel && w.mhWheelLabel) w.mhWheelLabel(map.dobWheel, p.dob, true);
    if (map.tobWheel && w.mhWheelLabel) w.mhWheelLabel(map.tobWheel, p.tob, true);
  };

  if (w.mhAuth && w.mhAuth.ready) {
    w.mhAuth.ready.then(load);
    w.mhAuth.onChange(function () { load(); });
  } else {
    document.addEventListener("DOMContentLoaded", load);
  }
  w.addEventListener("mh-profile", load);
})(window);
