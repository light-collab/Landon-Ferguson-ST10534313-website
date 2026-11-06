/* Nexus Pro | js/services.js
   Dynamic content: loads data/services.json, renders cards from a <template>,
   then searches, filters and sorts them. Filters are mirrored in the URL
   (?q=&cat=&sort=) so a filtered view can be bookmarked or shared. */
(function () {
  'use strict';

  var DATA_URL = 'data/services.json';
  var SORTS = {
    'featured':   function (a, b) { return a.rank - b.rank; },
    'price-asc':  function (a, b) { return a.price - b.price; },
    'price-desc': function (a, b) { return b.price - a.price; },
    'time-asc':   function (a, b) { return a.weeks - b.weeks || a.price - b.price; },
    'name':       function (a, b) { return a.name.localeCompare(b.name); }
  };

  var grid = document.getElementById('service-grid');
  if (!grid) { return; }
  var els = {
    search: document.getElementById('service-search'),
    category: document.getElementById('service-category'),
    sort: document.getElementById('service-sort'),
    status: document.getElementById('catalogue-status'),
    clear: document.getElementById('clear-filters'),
    empty: document.getElementById('catalogue-empty'),
    error: document.getElementById('catalogue-error'),
    retry: document.getElementById('retry-load'),
    template: document.getElementById('service-card-template'),
    modal: document.getElementById('service-modal')
  };

  /* South African style: R13 300 (a non-breaking space groups the thousands) */
  var fmtMoney = function (n) { return 'R' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); };
  var state = { services: [], categories: {}, query: '', category: 'all', sort: 'featured' };

  /* ---------- helpers ---------- */
  function debounce(fn, ms) {
    var timer;
    return function () {
      var args = arguments;
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { fn.apply(null, args); }, ms);
    };
  }
  function price(s) { return fmtMoney(s.price); }
  function unitText(s) { return s.unit === 'month' ? 'per month' : 'from, once-off'; }
  function timeText(s) {
    if (s.unit === 'month') { return 'Ongoing monthly plan'; }
    return 'Delivery in about ' + s.weeks + (s.weeks === 1 ? ' week' : ' weeks');
  }
  function find(root, name) { return root.querySelector('[data-field="' + name + '"]'); }

  /* ---------- loading ---------- */
  /* fetch() is blocked on file:// addresses, so fall back to an offline copy of the same data */
  function loadOffline() {
    return new Promise(function (resolve, reject) {
      if (window.NEXUS_SERVICES) { resolve(window.NEXUS_SERVICES); return; }
      var script = document.createElement('script');
      script.src = 'data/services-fallback.js';
      script.onload = function () { window.NEXUS_SERVICES ? resolve(window.NEXUS_SERVICES) : reject(new Error('No data')); };
      script.onerror = function () { reject(new Error('Offline data missing')); };
      document.head.appendChild(script);
    });
  }

  function load() {
    els.error.hidden = true;
    grid.setAttribute('aria-busy', 'true');
    els.status.textContent = 'Loading services\u2026';
    return fetch(DATA_URL, { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .catch(loadOffline)
      .then(function (data) {
        if (!data || !Array.isArray(data.services) || !Array.isArray(data.categories)) { throw new Error('Unexpected data'); }
        state.categories = {};
        data.categories.forEach(function (c) { state.categories[c.id] = c.label; });
        state.services = data.services.filter(function (s) { return s && s.id && s.name && typeof s.price === 'number'; });
        buildCategoryOptions(data.categories);
        readUrl();
        render();
      })
      .catch(function () {
        grid.replaceChildren();
        grid.setAttribute('aria-busy', 'false');
        els.status.textContent = '';
        els.error.hidden = false;
      });
  }

  function buildCategoryOptions(categories) {
    var frag = document.createDocumentFragment();
    categories.forEach(function (c) {
      var option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.label;
      frag.appendChild(option);
    });
    els.category.appendChild(frag);
  }

  /* ---------- filter, sort, render ---------- */
  function visibleServices() {
    var tokens = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    return state.services.filter(function (s) {
      if (state.category !== 'all' && s.category !== state.category) { return false; }
      var haystack = [s.name, state.categories[s.category], s.summary, s.description, s.features.join(' ')].join(' ').toLowerCase();
      return tokens.every(function (t) { return haystack.indexOf(t) !== -1; });   /* every word must match */
    }).sort(SORTS[state.sort]);
  }

  function render() {
    var list = visibleServices();
    var frag = document.createDocumentFragment();
    list.forEach(function (s) {
      var card = els.template.content.firstElementChild.cloneNode(true);
      var img = find(card, 'image');
      img.src = s.image || '';
      img.alt = s.imageAlt || '';
      find(card, 'category').textContent = state.categories[s.category] || s.category;
      find(card, 'name').textContent = s.name;
      find(card, 'summary').textContent = s.summary;
      find(card, 'price').textContent = price(s);
      find(card, 'unit').textContent = unitText(s);
      find(card, 'time').textContent = timeText(s);
      var btn = find(card, 'open');
      btn.setAttribute('data-service-id', s.id);
      btn.setAttribute('aria-label', 'View details for ' + s.name);
      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
    grid.setAttribute('aria-busy', 'false');
    els.empty.hidden = list.length > 0;
    els.status.textContent = 'Showing ' + list.length + ' of ' + state.services.length + ' services';
    els.clear.hidden = !(state.query || state.category !== 'all' || state.sort !== 'featured');
    writeUrl();
  }

  /* ---------- URL state ---------- */
  function readUrl() {
    var p = new URLSearchParams(window.location.search);
    state.query = (p.get('q') || '').slice(0, 60);
    state.category = p.get('cat') && state.categories[p.get('cat')] ? p.get('cat') : 'all';
    state.sort = SORTS[p.get('sort')] ? p.get('sort') : 'featured';
    els.search.value = state.query;
    els.category.value = state.category;
    els.sort.value = state.sort;
  }
  function writeUrl() {
    var p = new URLSearchParams();
    if (state.query) { p.set('q', state.query); }
    if (state.category !== 'all') { p.set('cat', state.category); }
    if (state.sort !== 'featured') { p.set('sort', state.sort); }
    var qs = p.toString();
    try { window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '')); } catch (e) { /* file:// */ }
  }

  /* ---------- modal ---------- */
  function openDetails(id) {
    var s = state.services.filter(function (x) { return x.id === id; })[0];
    if (!s || !els.modal || !els.modal.showModal) { return; }
    var modalImage = document.getElementById('modal-image');
    modalImage.src = s.image || '';
    modalImage.alt = s.imageAlt || '';
    document.getElementById('modal-category').textContent = state.categories[s.category] || s.category;
    document.getElementById('modal-title').textContent = s.name;
    document.getElementById('modal-description').textContent = s.description;
    document.getElementById('modal-price').textContent = price(s) + ' ' + unitText(s);
    document.getElementById('modal-time').textContent = timeText(s);
    document.getElementById('modal-enquire').href = 'enquiry.html?service=' + encodeURIComponent(s.id);
    var items = s.features.map(function (f) {
      var li = document.createElement('li');
      li.textContent = f;
      return li;
    });
    document.getElementById('modal-features').replaceChildren.apply(document.getElementById('modal-features'), items);
    els.modal.showModal();
  }

  /* ---------- events ---------- */
  els.search.addEventListener('input', debounce(function () {
    state.query = els.search.value.trim().slice(0, 60);
    render();
  }, 150));
  els.category.addEventListener('change', function () { state.category = els.category.value; render(); });
  els.sort.addEventListener('change', function () { state.sort = els.sort.value; render(); });
  els.clear.addEventListener('click', function () {
    state.query = ''; state.category = 'all'; state.sort = 'featured';
    els.search.value = ''; els.category.value = 'all'; els.sort.value = 'featured';
    render();
    els.search.focus();
  });
  els.retry.addEventListener('click', load);
  grid.addEventListener('click', function (e) {              /* event delegation: one listener for every card */
    var btn = e.target.closest('[data-service-id]');
    if (btn) { openDetails(btn.getAttribute('data-service-id')); }
  });

  load();
})();
