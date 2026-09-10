/* Make the Naksha button draggable, remember where you put it, and keep
   it doing a little idle bounce. A real drag is swallowed so it doesn't
   also open the panel. */
(function (w) {
  function init() {
    var fab = document.getElementById("nk-fab");
    if (!fab || fab._nkdrag) return;
    fab._nkdrag = true;
    var KEY = "mh-nk-fab-pos", M = 12;

    function clampAndPlace(x, y) {
      var cw = fab.offsetWidth || 58, ch = fab.offsetHeight || 58;
      x = Math.max(M, Math.min(w.innerWidth - cw - M, x));
      y = Math.max(M, Math.min(w.innerHeight - ch - M, y));
      fab.style.left = x + "px"; fab.style.top = y + "px";
      fab.style.right = "auto"; fab.style.bottom = "auto"; fab.style.transform = "none";
    }
    // normalise the CSS-positioned FAB to explicit left/top so the bounce
    // keyframes (which set transform) don't fight a translateY(-50%).
    var r0 = fab.getBoundingClientRect();
    clampAndPlace(r0.left, r0.top);
    try {
      var p = JSON.parse(localStorage.getItem(KEY) || "null");
      if (p && typeof p.x === "number") clampAndPlace(p.x, p.y);
    } catch (e) {}
    fab.classList.add("nk-free");

    var down = null, moved = false;
    fab.addEventListener("pointerdown", function (e) {
      var r = fab.getBoundingClientRect();
      down = { x: e.clientX, y: e.clientY, l: r.left, t: r.top };
      moved = false;
      try { fab.setPointerCapture(e.pointerId); } catch (_) {}
      fab.classList.add("nk-dragging");
    });
    fab.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (moved) clampAndPlace(down.l + dx, down.t + dy);
    });
    function end(e) {
      if (!down) return;
      fab.classList.remove("nk-dragging");
      try { fab.releasePointerCapture(e.pointerId); } catch (_) {}
      if (moved) {
        var r = fab.getBoundingClientRect();
        try { localStorage.setItem(KEY, JSON.stringify({ x: r.left, y: r.top })); } catch (_) {}
      }
      down = null;
    }
    fab.addEventListener("pointerup", end);
    fab.addEventListener("pointercancel", end);

    // if a drag happened, eat the click so the panel doesn't open
    fab.addEventListener("click", function (e) {
      if (moved) { e.stopImmediatePropagation(); e.preventDefault(); moved = false; }
    }, true);

    w.addEventListener("resize", function () {
      var r = fab.getBoundingClientRect();
      clampAndPlace(r.left, r.top);
    });
  }
  if (document.getElementById("nk-fab")) init();
  else document.addEventListener("DOMContentLoaded", init);
})(window);
