/**
 * Плавный скролл для якорей — дополняет CSS scroll-behavior (старые браузеры / кастом)
 * Появление блоков при скролле, parallax hero, меню, год, класс is-ready для анимации шапки,
 * счётчик цифр в блоке доверия
 */
(function () {
  "use strict";

  /* Вход шапки: html.is-ready (см. styles.css @keyframes anim-header-in) */
  function markSiteReady() {
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", markSiteReady);
  } else {
    markSiteReady();
  }

  var header = document.querySelector(".header");
  var burger = document.querySelector(".header__burger");
  var navLinks = document.querySelectorAll(".header__nav a");
  var heroBg = document.querySelector(".hero__bg");
  var yearEl = document.getElementById("year");

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* Закрытие меню по клику на ссылку */
  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      if (header && window.innerWidth <= 900) {
        header.classList.remove("header--open");
        if (burger) burger.setAttribute("aria-expanded", "false");
      }
    });
  });

  if (burger && header) {
    burger.addEventListener("click", function () {
      var open = header.classList.toggle("header--open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* Появление секций (Intersection Observer) */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      revealEls.forEach(function (el) {
        el.classList.add("is-visible");
      });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      revealEls.forEach(function (el) {
        io.observe(el);
      });
    }
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* Лёгкий parallax для градиента hero (отключается при reduced motion) */
  if (heroBg && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var ticking = false;
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          var y = window.scrollY || 0;
          var max = window.innerHeight * 1.2;
          var p = Math.min(y / max, 1);
          heroBg.style.transform = "translate3d(0, " + (p * 28).toFixed(1) + "px, 0)";
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* Счётчик цифр в секции #trust (data-count-up / data-suffix) */
  function easeOutExpo(t) {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function runCountUp(el) {
    var target = parseInt(el.getAttribute("data-count-up"), 10);
    var suffix = el.getAttribute("data-suffix");
    if (suffix === null) suffix = "";
    if (isNaN(target)) return;

    var duration = 1300;
    var startTs = null;

    function frame(ts) {
      if (startTs === null) startTs = ts;
      var t = Math.min((ts - startTs) / duration, 1);
      var val = Math.round(easeOutExpo(t) * target);
      el.textContent = val + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function initCountUp() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var trust = document.querySelector("#trust");
    if (!trust || !("IntersectionObserver" in window)) return;

    var counters = trust.querySelectorAll("[data-count-up]");
    if (!counters.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          io.unobserve(trust);
          counters.forEach(function (el) {
            var suf = el.getAttribute("data-suffix");
            el.textContent = "0" + (suf === null ? "" : suf);
          });
          counters.forEach(function (el, i) {
            window.setTimeout(function () {
              runCountUp(el);
            }, i * 120);
          });
        });
      },
      { root: null, rootMargin: "0px 0px -5% 0px", threshold: 0.15 }
    );

    io.observe(trust);
  }

  initCountUp();
})();
