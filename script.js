/* Nexus Pro | script.js  (site-wide, loaded with defer on every page)
   Part 2:  1. Grass reveal on scroll   2. Profile pop in and out   3. Soft music
   Part 3:  4. Scroll reveal   5. Accordion   6. Tabs   7. Modal (native dialog)   8. Share button
   Part 2 feedback: 9. Hamburger menu
   Page-specific code lives in js/services.js, js/forms.js and js/map.js. */
(function () {
  'use strict';

  var clamp = function (n, min, max) { return Math.min(max, Math.max(min, n)); };
  var ease = function (x) { return x * x * (3 - 2 * x); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1 and 2. Scroll-driven effects, smoothed in one animation loop.
     The grass video is only downloaded when it is first needed (page speed). */
  var grass = document.querySelector('.grass');
  var pop = document.querySelector('.pop');
  var profile = document.querySelector('.profile-section');
  var always = document.body.getAttribute('data-grass') === 'always';
  var reveal = 0;
  var show = 0;
  var grassStarted = false;
  var wide = window.matchMedia('(min-width: 64em)');

  function startGrass() {
    if (grassStarted || !grass) { return; }
    grassStarted = true;
    if (grass.play) { grass.play().catch(function () {}); }
  }

  function frame() {
    if (grass) {
      var target = always ? 1 : clamp(window.scrollY / (window.innerHeight * 0.8), 0, 1);
      if (target > 0.02) { startGrass(); }
      reveal += (target - reveal) * 0.08;
      grass.style.opacity = reveal * (wide.matches ? 1 : 0.7);   /* softer behind the text on small screens */
      grass.style.transform = 'translateY(' + (1 - reveal) * 100 + '%)';
    }
    if (pop && profile) {
      var r = profile.getBoundingClientRect();
      var distance = Math.abs(r.top + r.height / 2 - window.innerHeight / 2) / (window.innerHeight * 0.55);
      show += (ease(clamp(1 - distance, 0, 1)) - show) * 0.15;
      pop.style.opacity = show;
      pop.style.transform = 'scale(' + (0.4 + 0.6 * show) + ')';
    }
    window.requestAnimationFrame(frame);
  }
  if (grass || pop) { frame(); }

  /* 3. Music at 30% volume, loops, starts on the first interaction,
        and carries on from the same moment on the next page */
  var music = document.getElementById('music');
  if (music) {
    music.volume = 0.3;
    music.addEventListener('loadedmetadata', function () {
      try {
        var t = parseFloat(sessionStorage.getItem('nexus-music-time'));
        if (t > 0 && t < music.duration) { music.currentTime = t; }
      } catch (e) { /* storage unavailable */ }
    });
    var events = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'];
    var start = function () {
      music.play().then(function () {
        events.forEach(function (name) { window.removeEventListener(name, start); });
      }).catch(function () {});
    };
    events.forEach(function (name) { window.addEventListener(name, start, { passive: true }); });
    start();
    window.addEventListener('pagehide', function () {
      try { sessionStorage.setItem('nexus-music-time', String(music.currentTime)); } catch (e) { /* ignore */ }
    });
  }

  /* 4. Scroll reveal: anything marked data-reveal fades and rises into view once.
        The .reveal classes are removed afterwards so hover effects behave normally. */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (revealEls.length && 'IntersectionObserver' in window && !reduceMotion) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        var el = entry.target;
        observer.unobserve(el);
        el.classList.add('is-visible');
        el.addEventListener('transitionend', function done(e) {
          if (e.propertyName !== 'opacity') { return; }
          el.classList.remove('reveal', 'is-visible');
          el.style.removeProperty('--i');
          el.removeEventListener('transitionend', done);
        });
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el, i) {
      el.style.setProperty('--i', i % 4);   /* stagger within a row of cards */
      el.classList.add('reveal');
      observer.observe(el);
    });
  }

  /* 5. Accordion (WAI-ARIA pattern). Buttons control panels; closed panels are inert
        so keyboard and screen-reader users cannot reach hidden content. */
  function initAccordion(root) {
    var triggers = Array.prototype.slice.call(root.querySelectorAll('.accordion-trigger'));
    var single = root.hasAttribute('data-single');

    function setOpen(trigger, open) {
      var panel = document.getElementById(trigger.getAttribute('aria-controls'));
      trigger.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
      panel.inert = !open;
    }

    triggers.forEach(function (t) { setOpen(t, t.getAttribute('aria-expanded') === 'true'); });

    root.addEventListener('click', function (e) {          /* one listener for all buttons */
      var trigger = e.target.closest('.accordion-trigger');
      if (!trigger) { return; }
      var open = trigger.getAttribute('aria-expanded') !== 'true';
      if (open && single) {
        triggers.forEach(function (other) { if (other !== trigger) { setOpen(other, false); } });
      }
      setOpen(trigger, open);
    });

    root.addEventListener('keydown', function (e) {        /* Up, Down, Home, End move between headings */
      var i = triggers.indexOf(document.activeElement);
      if (i < 0) { return; }
      var n = triggers.length;
      var next = { ArrowDown: (i + 1) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (next === undefined) { return; }
      e.preventDefault();
      triggers[next].focus();
    });
  }
  document.querySelectorAll('.accordion').forEach(initAccordion);

  /* 6. Tabs (WAI-ARIA pattern). Only the selected tab is in the tab order;
        arrow keys move between tabs. */
  function initTabs(root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) { tab.focus(); }
    }

    root.addEventListener('click', function (e) {
      var tab = e.target.closest('[role="tab"]');
      if (tab) { select(tab, false); }
    });

    root.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) { return; }
      var n = tabs.length;
      var next = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
      if (next === undefined) { return; }
      e.preventDefault();
      select(tabs[next], true);
    });
  }
  document.querySelectorAll('.tabs').forEach(initTabs);

  /* 7. Modal built on the native <dialog> element: the browser supplies the focus trap,
        Escape to close, the inert background and focus return. One delegated listener
        also serves buttons created later by JavaScript. */
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-modal-open]');
    if (opener) {
      var dialog = document.getElementById(opener.getAttribute('data-modal-open'));
      if (dialog && dialog.showModal) { dialog.showModal(); }
      return;
    }
    var closer = e.target.closest('[data-modal-close]');
    if (closer) { closer.closest('dialog').close(); return; }
    /* A click on the backdrop reports the dialog itself as the target */
    if (e.target.matches && e.target.matches('dialog.modal')) { e.target.close(); }
  });

  /* 8. Share button: the Web Share API where it exists, otherwise copy the link */
  document.querySelectorAll('[data-share]').forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener('click', function () {
      var data = { title: document.title, text: 'Nexus Pro: websites and systems that work.', url: window.location.href };
      if (navigator.share) {
        navigator.share(data).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(data.url).then(function () {
          btn.textContent = 'Link copied';
          window.setTimeout(function () { btn.textContent = label; }, 2000);
        }).catch(function () {});
      }
    });
  });

  /* 9. Hamburger menu (mobile and tablet). The links stay visible if this script never runs.
        Closed menus are inert so keyboard users cannot tab into hidden links. */
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  if (navToggle && nav) {
    document.documentElement.classList.add('js-nav');

    var setNav = function (open) {
      navToggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      nav.inert = !open && !wide.matches;           /* on desktop the links are always usable */
    };
    setNav(false);

    navToggle.addEventListener('click', function () {
      setNav(navToggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        setNav(false);
        navToggle.focus();
      }
    });
    document.addEventListener('click', function (e) {     /* a click outside the header closes the menu */
      if (navToggle.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-header')) { setNav(false); }
    });
    var resync = function () { setNav(false); };
    if (wide.addEventListener) { wide.addEventListener('change', resync); } else { wide.addListener(resync); }
  }
})();
