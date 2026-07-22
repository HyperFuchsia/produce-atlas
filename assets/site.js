/* Whole Man — shared site behavior.
   Theme, calm mode, ambient background, reading progress, nav highlighting.
   No analytics, no tracking, no external requests. */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ---------- preferences (localStorage, cosmetic only) ---------- */
  function getPref(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function setPref(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable: preference lasts this page only */ }
  }

  /* ---------- theme ---------- */
  var savedTheme = getPref("wm-theme");
  if (savedTheme === "dark" || (savedTheme === null && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
    root.setAttribute("data-theme", "dark");
  }

  /* ---------- calm visual mode (manual, in addition to OS reduced motion) ---------- */
  if (getPref("wm-calm") === "on") {
    root.setAttribute("data-calm", "on");
  }

  document.addEventListener("DOMContentLoaded", function () {

    /* ---------- ambient moving words (decorative only) ---------- */
    var ambient = document.createElement("div");
    ambient.className = "ambient";
    ambient.setAttribute("aria-hidden", "true");
    ambient.setAttribute("role", "presentation");
    ambient.setAttribute("inert", "");
    var words = ["DIGNITY", "INTEGRITY", "SOVEREIGNTY"];
    for (var i = 0; i < 3; i++) {
      var row = document.createElement("div");
      row.className = "row row-" + (i + 1);
      var text = "";
      for (var j = 0; j < 6; j++) { text += words[i] + "  "; }
      row.textContent = text + text; /* doubled for seamless 50% translate loop */
      ambient.appendChild(row);
    }
    document.body.insertBefore(ambient, document.body.firstChild);

    /* ---------- header controls ---------- */
    var themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
      var syncThemeBtn = function () {
        var dark = root.getAttribute("data-theme") === "dark";
        themeBtn.setAttribute("aria-pressed", dark ? "true" : "false");
        themeBtn.textContent = dark ? "Light" : "Dark";
      };
      syncThemeBtn();
      themeBtn.addEventListener("click", function () {
        var dark = root.getAttribute("data-theme") === "dark";
        if (dark) { root.removeAttribute("data-theme"); setPref("wm-theme", "light"); }
        else { root.setAttribute("data-theme", "dark"); setPref("wm-theme", "dark"); }
        syncThemeBtn();
      });
    }

    var calmBtn = document.getElementById("calm-toggle");
    if (calmBtn) {
      var syncCalmBtn = function () {
        var calm = root.getAttribute("data-calm") === "on";
        calmBtn.setAttribute("aria-pressed", calm ? "true" : "false");
      };
      syncCalmBtn();
      calmBtn.addEventListener("click", function () {
        var calm = root.getAttribute("data-calm") === "on";
        if (calm) { root.removeAttribute("data-calm"); setPref("wm-calm", "off"); }
        else { root.setAttribute("data-calm", "on"); setPref("wm-calm", "on"); }
        syncCalmBtn();
      });
    }

    /* ---------- current-page nav highlight ---------- */
    var here = location.pathname.split("/").pop() || "index.html";
    var links = document.querySelectorAll(".site-nav a");
    for (var k = 0; k < links.length; k++) {
      var href = links[k].getAttribute("href");
      if (href === here || (here === "index.html" && href === "./")) {
        links[k].setAttribute("aria-current", "page");
      } else if (here.indexOf("framework") === 0 && href === "framework.html") {
        links[k].setAttribute("aria-current", "page");
      }
    }

    /* ---------- reading progress (long pages only) ---------- */
    var progress = document.querySelector(".progress");
    if (progress) {
      var update = function () {
        var doc = document.documentElement;
        var max = doc.scrollHeight - doc.clientHeight;
        var pct = max > 0 ? (doc.scrollTop || document.body.scrollTop) / max * 100 : 0;
        progress.style.width = pct + "%";
      };
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      update();
    }

    /* ---------- "you are here" chapter label ---------- */
    var hereLabel = document.getElementById("you-are-here-label");
    if (hereLabel) {
      var marks = document.querySelectorAll("[data-chapter]");
      if (marks.length && "IntersectionObserver" in window) {
        var current = "";
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              current = en.target.getAttribute("data-chapter");
              hereLabel.textContent = current;
            }
          });
        }, { rootMargin: "-15% 0px -75% 0px" });
        marks.forEach ? marks.forEach(function (m) { io.observe(m); }) : null;
      }
    }

    /* ---------- footer year ---------- */
    var yr = document.getElementById("footer-year");
    if (yr) { yr.textContent = new Date().getFullYear(); }
  });
})();
