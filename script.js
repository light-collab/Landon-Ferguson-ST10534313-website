/* Nexus Pro | script.js
   Small enhancements only. The layout and styling live in style.css.
   1. Grass reveal on scroll   2. Profile pop in and out   3. Soft music   4. Contact form */
(function () {
  'use strict';

  var clamp = function (n, min, max) { return Math.min(max, Math.max(min, n)); };
  var ease = function (x) { return x * x * (3 - 2 * x); };

  /* 1 and 2. Scroll-driven effects, smoothed in one animation loop */
  var grass = document.querySelector('.grass');
  var pop = document.querySelector('.pop');
  var profile = document.querySelector('.profile-section');
  var always = document.body.getAttribute('data-grass') === 'always';
  var reveal = 0;
  var show = 0;

  function frame() {
    if (grass) {
      var target = always ? 1 : clamp(window.scrollY / (window.innerHeight * 0.8), 0, 1);
      reveal += (target - reveal) * 0.08;
      grass.style.opacity = reveal;
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
  if (grass && grass.play) { grass.play().catch(function () {}); }

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

  /* 4. Contact form: opens the visitor's email app with the request filled in */
  var form = document.getElementById('contact-form');
  if (form) {
    var EMAIL = 'YOUR_EMAIL_HERE';
    var note = document.getElementById('form-note');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var link = 'mailto:' + EMAIL +
        '?subject=' + encodeURIComponent('Appointment request from ' + name) +
        '&body=' + encodeURIComponent('Hi, I would like to set up an appointment.\n\nName: ' + name + '\nEmail: ' + email);
      note.textContent = 'Thank you, ' + name + '. Your email app should open with the request ready to send. If it does not, ';
      var a = document.createElement('a');
      a.href = link;
      a.textContent = 'tap here';
      note.appendChild(a);
      note.appendChild(document.createTextNode('.'));
      window.location.href = link;
    });
  }
})();
