/* Nexus Pro | js/forms.js
   Shared by enquiry.html and contact.html.
   1. Configuration   2. Validation (HTML5 attributes + Constraint Validation API)
   3. AJAX submission   4. Enquiry: instant quote   5. Contact: compiled email */
(function () {
  'use strict';

  /* ===== 1. CONFIGURATION: change business rules here, not in the logic ===== */
  var CONFIG = {
    EMAIL: 'Landonfergsuon191@gmail.com', /* recipient for compiled contact emails */
    SERVICES_URL: 'data/services.json',
    LEAD_DAYS: 7,                      /* minimum notice before a project can start */
    SIZE_COST: { small: 1, standard: 1.4, large: 1.9 },
    SIZE_TIME: { small: 1, standard: 1.25, large: 1.6 },
    ADDONS: {
      copy:     { label: 'Copywriting help', cost: 1500 },
      brand:    { label: 'Logo and brand refresh', cost: 2500 },
      language: { label: 'Extra language', cost: 1200 }
    },
    RUSH: { cost: 1.25, time: 0.7 },   /* rush delivery: +25% cost, 30% faster */
    RANGE: 1.15,                       /* the high end of an estimate */
    TIMEOUT_MS: 8000
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* South African style: R13 300 (a non-breaking space groups the thousands) */
  var fmtMoney = function (n) { return 'R' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); };

  /* ===== 2. VALIDATION ===== */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var NAME_RE = /^[\p{L}][\p{L}\s'\u2019.-]*$/u;

  /* Custom rules for formats HTML cannot express. Each returns an error message or ''. */
  var RULES = {
    name: function (v) {
      return NAME_RE.test(v) ? '' : 'Use letters, spaces, hyphens and apostrophes only.';
    },
    phone: function (v) {
      var digits = v.replace(/[\s()-]/g, '');                      /* ignore spaces, brackets, hyphens */
      return /^(\+27|0)[1-9]\d{8}$/.test(digits) ? '' :
        'Enter a South African number such as 021 123 4567, 082 123 4567 or +27 82 123 4567.';
    }
  };

  /* Remove control characters and tidy whitespace before using any value */
  function clean(value, multiline) {
    var s = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    s = multiline ? s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
    return s.trim();
  }

  /* Returns the error message for one field, or '' when it is valid */
  function errorFor(field) {
    var v = field.validity;
    var value = field.value.trim();

    if (v.valueMissing || (field.required && !value)) {
      return field.tagName === 'SELECT' ? 'Please choose an option.' : 'This field is required.';
    }
    if (!value) { return ''; }                                     /* optional and empty: fine */
    if (field.type === 'email' && (v.typeMismatch || !EMAIL_RE.test(value))) {
      return 'Enter a valid email address, for example name@example.com.';
    }
    if (field.minLength > 0 && value.length < field.minLength) {
      return 'Use at least ' + field.minLength + ' characters (you have ' + value.length + ').';
    }
    if (field.maxLength > 0 && value.length > field.maxLength) {
      return 'Use no more than ' + field.maxLength + ' characters.';
    }
    if (field.type === 'date') {
      if (v.rangeUnderflow) { return 'Choose today or a later date.'; }
      if (v.rangeOverflow) { return 'Choose a date within the next 12 months.'; }
      if (v.badInput) { return 'Enter a valid date.'; }
    }
    if (field.dataset.rule && RULES[field.dataset.rule]) {
      var custom = RULES[field.dataset.rule](value);
      if (custom) { return custom; }
    }
    if (v.patternMismatch) { return 'Check the format of this field.'; }
    return '';
  }

  function showError(field, message) {
    var box = document.getElementById(field.id + '-error');
    if (box) { box.textContent = message; }
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    field.setCustomValidity(message);                              /* keeps the native validity state in sync */
  }

  function validateField(field) {
    field.setCustomValidity('');
    var message = errorFor(field);
    showError(field, message);
    return !message;
  }

  /* Wires one form: validate on blur, re-check while typing once flagged, validate everything on submit */
  function initForm(form, onValid) {
    var fields = Array.prototype.slice.call(form.querySelectorAll('input, select, textarea')).filter(function (f) {
      return f.type !== 'hidden' && f.type !== 'submit' && !f.closest('.hp-field') && f.id;
    });
    var summary = form.querySelector('.form-summary');

    fields.forEach(function (f) {
      f.addEventListener('blur', function () { if (f.type !== 'radio' && f.type !== 'checkbox') { validateField(f); } });
      f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true') { validateField(f); } });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var invalid = fields.filter(function (f) { return !validateField(f); });
      if (invalid.length) {
        var names = invalid.map(function (f) { return f.labels[0].firstChild.textContent.trim(); });
        summary.textContent = 'Please fix ' + invalid.length + (invalid.length === 1 ? ' field: ' : ' fields: ') + names.join(', ') + '.';
        summary.hidden = false;
        invalid[0].focus();
        return;
      }
      summary.hidden = true;
      var trap = form.elements['bot-field'];
      if (trap && trap.value) { return; }                          /* honeypot filled: a bot, ignore silently */
      onValid();
    });

    form.addEventListener('reset', function () {
      fields.forEach(function (f) { showError(f, ''); });
      summary.hidden = true;
    });
  }

  function value(form, name) { return clean(form.elements[name].value, name === 'message'); }

  /* Live character counter for the message box */
  function initCounter(form) {
    var area = form.elements.message;
    var counter = document.getElementById('message-counter');
    if (!area || !counter) { return; }
    var update = function () { counter.textContent = area.value.length + ' / ' + area.maxLength; };
    area.addEventListener('input', update);
    update();
  }

  /* ===== 3. AJAX SUBMISSION: posts to the form's action URL without leaving the page ===== */
  function postForm(form) {
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = controller ? window.setTimeout(function () { controller.abort(); }, CONFIG.TIMEOUT_MS) : null;
    return fetch(form.getAttribute('action'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString(),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return true;
    }).catch(function () {
      return false;                                                /* the page still works if recording fails */
    }).then(function (ok) {
      if (timer) { window.clearTimeout(timer); }
      return ok;
    });
  }

  function setBusy(form, busy) {
    var btn = form.querySelector('[type="submit"]');
    btn.disabled = busy;
    if (busy) { btn.setAttribute('data-label', btn.textContent); btn.textContent = 'Sending\u2026'; }
    else if (btn.getAttribute('data-label')) { btn.textContent = btn.getAttribute('data-label'); }
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function reveal(section) {
    section.hidden = false;
    section.focus();
    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  /* ===== 4. ENQUIRY: instant estimate of cost, delivery and availability ===== */
  var servicesPromise;
  function loadServices() {
    if (!servicesPromise) {
      servicesPromise = fetch(CONFIG.SERVICES_URL).then(function (r) {
        if (!r.ok) { throw new Error('HTTP ' + r.status); }
        return r.json();
      }).catch(function () {                                       /* file:// fallback: offline copy of the data */
        return new Promise(function (resolve, reject) {
          var script = document.createElement('script');
          script.src = 'data/services-fallback.js';
          script.onload = function () { window.NEXUS_SERVICES ? resolve(window.NEXUS_SERVICES) : reject(new Error('No data')); };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }).then(function (d) { return d.services; }).catch(function () { return null; });
    }
    return servicesPromise;
  }

  function isoDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { var r = new Date(d); r.setDate(r.getDate() + n); return r; }
  function mondayOnOrAfter(d) { return addDays(d, (8 - d.getDay()) % 7); }   /* Monday = 1 */
  function longDate(d) {
    return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function roundTo50(n) { return Math.round(n / 50) * 50; }

  /* Pure function: the same inputs always give the same quote, so it is easy to test */
  function buildQuote(service, input, today) {
    var earliest = mondayOnOrAfter(addDays(today, CONFIG.LEAD_DAYS));
    var wanted = input.start ? mondayOnOrAfter(parseIso(input.start)) : null;
    var start = wanted && wanted >= earliest ? wanted : earliest;
    var quote = { earliest: earliest, start: start, preferredOk: !wanted || wanted >= earliest, monthly: service.unit === 'month' };

    if (quote.monthly) {                                            /* care plans are a fixed monthly fee */
      quote.low = quote.high = service.price;
      quote.weeks = 0;
      quote.end = null;
      return quote;
    }
    var rush = input.addons.indexOf('rush') !== -1;
    var extras = input.addons.reduce(function (sum, key) { return sum + (CONFIG.ADDONS[key] ? CONFIG.ADDONS[key].cost : 0); }, 0);
    var subtotal = (service.price * CONFIG.SIZE_COST[input.scope] + extras) * (rush ? CONFIG.RUSH.cost : 1);
    quote.low = roundTo50(subtotal);
    quote.high = roundTo50(subtotal * CONFIG.RANGE);
    quote.weeks = Math.max(1, Math.ceil(service.weeks * CONFIG.SIZE_TIME[input.scope] * (rush ? CONFIG.RUSH.time : 1)));
    quote.end = addDays(start, quote.weeks * 7);
    return quote;
  }

  function renderQuote(form, service, quote, saved) {
    var list = document.getElementById('result-list');
    var rows = [['Service', service.name]];
    if (quote.monthly) {
      rows.push(['Monthly fee', fmtMoney(quote.low) + ' per month']);
    } else {
      rows.push(['Estimated cost', fmtMoney(quote.low) + ' to ' + fmtMoney(quote.high)]);
      rows.push(['Estimated delivery', quote.weeks + (quote.weeks === 1 ? ' week' : ' weeks')]);
    }
    rows.push(['Earliest start', longDate(quote.earliest)]);
    rows.push([quote.monthly ? 'Plan begins' : 'Proposed start', longDate(quote.start)]);
    if (quote.end) { rows.push(['Estimated completion', longDate(quote.end)]); }

    var frag = document.createDocumentFragment();
    rows.forEach(function (r) {
      var wrap = el('div', 'result-row');
      wrap.appendChild(el('dt', null, r[0]));
      wrap.appendChild(el('dd', null, r[1]));
      frag.appendChild(wrap);
    });
    list.replaceChildren(frag);

    var availability = quote.preferredOk
      ? 'Good news: your preferred timing works. '
      : 'Your preferred date is earlier than we can start, so we have proposed our earliest start instead. ';
    document.getElementById('result-note').textContent = availability +
      'This is an estimate, not a final quote. We confirm the exact price after a short conversation.';
    document.getElementById('result-status').textContent = saved
      ? 'Your enquiry has been recorded and we will be in touch.'
      : 'We could not record your enquiry automatically. Please send it to us on the contact page so we do not miss it.';
    reveal(document.getElementById('enquiry-result'));
  }

  function initEnquiry(form) {
    var date = form.elements['start-date'];
    var today = new Date();
    date.min = isoDate(today);
    date.max = isoDate(addDays(today, 365));

    var wanted = new URLSearchParams(window.location.search).get('service');   /* prefill from the services page */
    if (wanted && form.elements.service.querySelector('option[value="' + CSS.escape(wanted) + '"]')) {
      form.elements.service.value = wanted;
    }

    document.getElementById('edit-enquiry').addEventListener('click', function () {
      document.getElementById('enquiry-result').hidden = true;
      form.elements.name.focus();
    });

    initForm(form, function () {
      setBusy(form, true);
      var input = {
        scope: form.elements.scope.value,
        addons: Array.prototype.map.call(form.querySelectorAll('input[name="addons"]:checked'), function (c) { return c.value; }),
        start: form.elements['start-date'].value
      };
      Promise.all([loadServices(), postForm(form)]).then(function (results) {
        var service = results[0] && results[0].filter(function (s) { return s.id === form.elements.service.value; })[0];
        setBusy(form, false);
        if (!service) {
          document.getElementById('result-list').replaceChildren();
          document.getElementById('result-note').textContent = 'We could not calculate an estimate right now. We will price your enquiry by hand.';
          document.getElementById('result-status').textContent = results[1] ? 'Your enquiry has been recorded.' : 'Please also send it on the contact page.';
          reveal(document.getElementById('enquiry-result'));
          return;
        }
        renderQuote(form, service, buildQuote(service, input, new Date()), results[1]);
      });
    });
  }

  /* ===== 5. CONTACT: compile the validated input into an email ===== */
  function compileEmail(form) {
    var name = value(form, 'name');
    var phone = value(form, 'phone');
    var topic = value(form, 'topic');
    var body = [
      'Hello Nexus Pro,', '',
      'Name: ' + name,
      'Email: ' + value(form, 'email'),
      'Phone: ' + (phone || 'Not provided'),
      'Type of message: ' + topic, '',
      'Message:', value(form, 'message'), '',
      'Sent from the Nexus Pro contact form on ' + new Date().toLocaleDateString('en-ZA') + '.'
    ].join('\n');
    return { subject: topic + ' from ' + name, body: body };
  }

  function initContact(form) {
    var send = document.getElementById('email-send');
    var preview = document.getElementById('email-preview');
    var status = document.getElementById('email-result-status');
    var copyStatus = document.getElementById('email-copy-status');
    var configured = EMAIL_RE.test(CONFIG.EMAIL);

    initForm(form, function () {
      setBusy(form, true);
      var email = compileEmail(form);
      postForm(form).then(function (saved) {
        setBusy(form, false);
        preview.textContent = 'To: ' + CONFIG.EMAIL + '\nSubject: ' + email.subject + '\n\n' + email.body;
        send.href = configured
          ? 'mailto:' + CONFIG.EMAIL + '?subject=' + encodeURIComponent(email.subject) + '&body=' + encodeURIComponent(email.body.replace(/\n/g, '\r\n'))
          : 'contact.html';
        status.textContent = (saved ? 'Your message has been recorded. ' : '') +
          (configured ? 'Press the button to open it in your email app, check it, and send it.'
                      : 'The recipient address has not been set up yet, so copy the text below and send it manually.');
        copyStatus.textContent = '';
        reveal(document.getElementById('email-result'));
      });
    });

    document.getElementById('email-copy').addEventListener('click', function () {
      var text = preview.textContent;
      var fallback = function () {
        var range = document.createRange();
        range.selectNodeContents(preview);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        copyStatus.textContent = 'Press Ctrl+C (or Copy) to copy the selected text.';
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () { copyStatus.textContent = 'Copied to your clipboard.'; }, fallback);
      } else { fallback(); }
    });
  }

  /* ===== start ===== */
  var enquiry = document.getElementById('enquiry-form');
  var contact = document.getElementById('contact-form');
  if (enquiry) { initCounter(enquiry); initEnquiry(enquiry); }
  if (contact) { initCounter(contact); initContact(contact); }
})();
