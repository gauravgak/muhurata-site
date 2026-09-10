/* One shared <datalist> of place names (from /api/cities) so every
   birth-details form gets a city dropdown, not just the main one.
   The main hero form keeps its own richer autocomplete. */
(function (w) {
  var LIST_ID = "mh-cities";
  var SEL = "#sw-pob, .sw-p-pob, #k-pob, #b-pob, #g-pob, #f-pob";

  var dl = document.createElement("datalist");
  dl.id = LIST_ID;
  (document.body || document.documentElement).appendChild(dl);

  function attach(root) {
    (root || document).querySelectorAll(SEL).forEach(function (el) {
      if (el.getAttribute("list") !== LIST_ID) el.setAttribute("list", LIST_ID);
    });
  }
  w.mhAttachCities = attach;

  fetch((w.MH_CONFIG && w.MH_CONFIG.API_BASE || "") + "/api/cities")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var frag = document.createDocumentFragment();
      (d.cities || []).forEach(function (c) {
        var o = document.createElement("option"); o.value = c; frag.appendChild(o);
      });
      dl.appendChild(frag);
      attach();
    })
    .catch(function () {});

  document.addEventListener("DOMContentLoaded", function () { attach(); });
})(window);
