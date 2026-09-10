/* Shared wheel date/time picker.

   Any <button class="wp-trigger" data-target="<hiddenInputId>" data-kind="date|time">
   plus a matching <input type="hidden" id="<hiddenInputId>"> gets the
   iOS-style scrolling wheel with a centre lock line. Uses event
   delegation, so triggers added to the DOM later (e.g. Swayamvar partner
   rows) work with no extra wiring. The overlay markup is injected here.
*/
(function () {
  var IH = 42;

  var overlay = document.createElement("div");
  overlay.className = "wp-overlay";
  overlay.innerHTML =
    '<div class="wp-sheet"><div class="wp-head"><span class="wp-title">Select</span>' +
    '<button class="wp-done" type="button">Done</button></div>' +
    '<div class="wp-cols"><div class="wp-hl"></div></div></div>';
  (document.body || document.documentElement).appendChild(overlay);

  var colsBox = overlay.querySelector(".wp-cols"),
      title = overlay.querySelector(".wp-title"),
      doneBtn = overlay.querySelector(".wp-done");

  var MONTHS = ["January","February","March","April","May","June","July",
                "August","September","October","November","December"];
  var YEAR_MIN = 1900, YEAR_MAX = new Date().getFullYear();

  function daysIn(y, mi) { return new Date(y, mi + 1, 0).getDate(); }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function mod(n, m) { return ((n % m) + m) % m; }

  var state = {}, cols = {}, colMeta = {}, kind = null, curTrigger = null, curHidden = null;
  var settleT = {};

  function makeCol(key) {
    var col = document.createElement("div");
    col.className = "wp-col"; col.dataset.col = key;
    colsBox.appendChild(col);
    cols[key] = col;
    col.addEventListener("scroll", function () { onScroll(key); });
    return col;
  }

  function fillCol(key, items, selIndex, circular) {
    var col = cols[key];
    col.innerHTML = "";
    var n = items.length;
    var full = circular ? items.concat(items).concat(items) : items;
    var top = document.createElement("div"); top.className = "wp-spacer"; col.appendChild(top);
    full.forEach(function (label) {
      var it = document.createElement("div");
      it.className = "wp-item"; it.textContent = label;
      col.appendChild(it);
    });
    var bot = document.createElement("div"); bot.className = "wp-spacer"; col.appendChild(bot);
    colMeta[key] = { n: n, circular: !!circular };
    var startIndex = circular ? n + selIndex : selIndex;
    col._items = full;
    markSelByIndex(key, startIndex);
    void col.offsetHeight;
    col.scrollTop = startIndex * IH;
    requestAnimationFrame(function () {
      col.scrollTop = startIndex * IH;
      requestAnimationFrame(function () { col.scrollTop = startIndex * IH; });
    });
  }

  function markSelByIndex(key, idx) {
    var items = cols[key].querySelectorAll(".wp-item");
    for (var i = 0; i < items.length; i++) items[i].classList.toggle("is-sel", i === idx);
  }

  function currentRealIndex(key) {
    var col = cols[key], meta = colMeta[key];
    var raw = Math.round(col.scrollTop / IH);
    raw = Math.max(0, Math.min(col._items.length - 1, raw));
    return meta.circular ? mod(raw, meta.n) : raw;
  }

  function onScroll(key) {
    clearTimeout(settleT[key]);
    settleT[key] = setTimeout(function () { settle(key); }, 110);
  }

  function settle(key) {
    var col = cols[key], meta = colMeta[key];
    var raw = Math.round(col.scrollTop / IH);
    raw = Math.max(0, Math.min(col._items.length - 1, raw));
    if (meta.circular) {
      var realIdx = mod(raw, meta.n), middleIdx = meta.n + realIdx;
      if (raw !== middleIdx) { col.scrollTop = middleIdx * IH; }
      markSelByIndex(key, middleIdx);
    } else {
      if (col.scrollTop !== raw * IH) col.scrollTop = raw * IH;
      markSelByIndex(key, raw);
    }
    var i = currentRealIndex(key);
    if (kind === "date") {
      if (key === "month") state.month = i;
      if (key === "year") state.year = YEAR_MIN + i;
      if (key === "day") state.day = i + 1;
      if (key === "month" || key === "year") rebuildDay();
    } else {
      if (key === "hour") state.hour12 = i + 1;
      if (key === "minute") state.minute = i;
      if (key === "period") state.period = i === 0 ? "AM" : "PM";
    }
  }

  function rebuildDay() {
    var n = daysIn(state.year, state.month), items = [];
    for (var i = 1; i <= n; i++) items.push(String(i));
    if (state.day > n) state.day = n;
    fillCol("day", items, state.day - 1, false);
  }
  function mkHl() { var d = document.createElement("div"); d.className = "wp-hl"; return d; }

  function buildDate() {
    colsBox.innerHTML = ""; colsBox.appendChild(mkHl()); cols = {}; colMeta = {};
    makeCol("day"); makeCol("month"); makeCol("year");
    var dn = daysIn(state.year, state.month), dayItems = [];
    for (var i = 1; i <= dn; i++) dayItems.push(String(i));
    fillCol("day", dayItems, state.day - 1, false);
    fillCol("month", MONTHS, state.month, true);
    var yearItems = [];
    for (var y = YEAR_MIN; y <= YEAR_MAX; y++) yearItems.push(String(y));
    fillCol("year", yearItems, state.year - YEAR_MIN, false);
  }
  function buildTime() {
    colsBox.innerHTML = ""; colsBox.appendChild(mkHl()); cols = {}; colMeta = {};
    makeCol("hour"); makeCol("minute"); makeCol("period");
    var hourItems = []; for (var h = 1; h <= 12; h++) hourItems.push(String(h));
    fillCol("hour", hourItems, state.hour12 - 1, true);
    var minItems = []; for (var m = 0; m < 60; m++) minItems.push(pad2(m));
    fillCol("minute", minItems, state.minute, true);
    fillCol("period", ["AM", "PM"], state.period === "AM" ? 0 : 1, true);
  }

  function openPicker(trigger) {
    curTrigger = trigger;
    curHidden = document.getElementById(trigger.getAttribute("data-target"));
    kind = trigger.getAttribute("data-kind");
    var val = curHidden ? curHidden.value : "";
    if (kind === "date") {
      title.textContent = "Date of birth";
      if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        var p = val.split("-"); state = { year: +p[0], month: +p[1] - 1, day: +p[2] };
      } else { state = { year: YEAR_MAX - 25, month: 0, day: 1 }; }
      buildDate();
    } else {
      title.textContent = "Time of birth";
      if (val && /^\d{1,2}:\d{2}$/.test(val)) {
        var hm = val.split(":"), h24 = +hm[0], m = +hm[1];
        var h12 = h24 % 12; if (h12 === 0) h12 = 12;
        state = { hour12: h12, minute: m, period: h24 >= 12 ? "PM" : "AM" };
      } else { state = { hour12: 12, minute: 0, period: "PM" }; }
      buildTime();
    }
    overlay.classList.add("is-open");
  }

  function commit() {
    if (!curTrigger) return;
    if (kind === "date") {
      var day = currentRealIndex("day") + 1, month = currentRealIndex("month"),
          year = YEAR_MIN + currentRealIndex("year");
      var maxDay = daysIn(year, month); if (day > maxDay) day = maxDay;
      if (curHidden) curHidden.value = year + "-" + pad2(month + 1) + "-" + pad2(day);
      curTrigger.textContent = day + " " + MONTHS[month] + " " + year;
    } else {
      var h12 = currentRealIndex("hour") + 1, minute = currentRealIndex("minute"),
          period = currentRealIndex("period") === 0 ? "AM" : "PM";
      var h24 = period === "AM" ? (h12 === 12 ? 0 : h12) : (h12 === 12 ? 12 : h12 + 12);
      if (curHidden) curHidden.value = pad2(h24) + ":" + pad2(minute);
      curTrigger.textContent = h12 + ":" + pad2(minute) + " " + period;
    }
    curTrigger.classList.add("has-value");
    if (curHidden) curHidden.dispatchEvent(new Event("change", { bubbles: true }));
    overlay.classList.remove("is-open");
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest(".wp-trigger");
    if (t) { e.preventDefault(); openPicker(t); }
  });
  doneBtn.addEventListener("click", commit);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) commit(); });

  /* let profile.js prefill work on wp triggers too */
  window.mhWheelLabel = function (targetId, iso) {
    var trig = document.querySelector('.wp-trigger[data-target="' + targetId + '"]');
    var hid = document.getElementById(targetId);
    if (!trig || !hid || hid.value) return;
    hid.value = iso;
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      var p = iso.split("-");
      trig.textContent = (+p[2]) + " " + MONTHS[+p[1] - 1] + " " + p[0];
    } else if (/^\d{1,2}:\d{2}$/.test(iso)) {
      var hm = iso.split(":"), h = +hm[0], ap = h < 12 ? "AM" : "PM", h12 = h % 12 || 12;
      trig.textContent = h12 + ":" + hm[1] + " " + ap;
    }
    trig.classList.add("has-value");
  };
})();
