/* Runtime behaviour for the compiled site: mobile menu, hero carousel,
   stat counters and the admission enquiry form. */
(function () {
  'use strict';

  /* ---------------- mobile menu ---------------- */
  var menu = document.getElementById('mobile-menu');
  document.querySelectorAll('[data-on-click="toggleMenu"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!menu) return;
      var open = menu.hasAttribute('hidden');
      if (open) { menu.removeAttribute('hidden'); document.body.style.overflow = 'hidden'; }
      else { menu.setAttribute('hidden', ''); document.body.style.overflow = ''; }
    });
  });

  /* ---------------- sticky header condenses after 40px ---------------- */
  var header = document.querySelector('header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------- mark the current page in the nav ---------------- */
  (function () {
    var here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav a[href]').forEach(function (a) {
      if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
    });
  })();

  /* ---------------- gentle reveal on scroll (motion-safe) ---------------- */
  if (window.IntersectionObserver &&
      window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    var targets = document.querySelectorAll('.card-grid, .deptgrid, .bento, .mosaic, .paths, .voices, .steps, .quick-grid');
    if (targets.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -10% 0px' });
      targets.forEach(function (t) { t.classList.add('reveal'); io.observe(t); });
    }
  }

  /* ---------------- admission enquiry modal ----------------
     Opens shortly after the first page of a visit. Dismissal is remembered for
     the session, so it does not re-open on every navigation. */
  var emodal = document.getElementById('enquiry-modal');
  if (emodal && typeof emodal.showModal === 'function') {
    var SEEN = 'msep-enquiry-seen';
    var eForm = emodal.querySelector('[data-emodal-form]');
    var eDone = emodal.querySelector('[data-emodal-done]');
    var eError = emodal.querySelector('[data-emodal-error]');
    var onApplyPage = /(^|\/)apply\.html$/.test(location.pathname);

    function seen() {
      try { return sessionStorage.getItem(SEEN) === '1'; } catch (e) { return false; }
    }
    function markSeen() {
      try { sessionStorage.setItem(SEEN, '1'); } catch (e) { /* private mode */ }
    }
    function closeModal() { markSeen(); if (emodal.open) emodal.close(); }

    emodal.querySelectorAll('[data-emodal-close]').forEach(function (b) {
      b.addEventListener('click', closeModal);
    });
    // click outside the panel closes it; Esc is handled natively by <dialog>
    emodal.addEventListener('click', function (e) { if (e.target === emodal) closeModal(); });
    emodal.addEventListener('close', markSeen);

    if (!seen() && !onApplyPage) {
      setTimeout(function () {
        if (seen() || emodal.open) return;
        emodal.showModal();
        var first = emodal.querySelector('#m-name');
        if (first) first.focus({ preventScroll: true });
      }, 1400);
    }

    var eSubmit = emodal.querySelector('[data-emodal-submit]');
    var eFields = {
      name: emodal.querySelector('#m-name'),
      phone: emodal.querySelector('#m-phone'),
      email: emodal.querySelector('#m-email'),
      msg: emodal.querySelector('#m-msg'),
    };
    Object.keys(eFields).forEach(function (k) {
      if (eFields[k]) eFields[k].addEventListener('input', function () { eError.hidden = true; });
    });

    if (eSubmit) eSubmit.addEventListener('click', function () {
      var name = (eFields.name.value || '').trim();
      var phone = (eFields.phone.value || '').trim();
      var email = (eFields.email.value || '').trim();
      var msg = (eFields.msg.value || '').trim();

      function fail(text, field) {
        eError.textContent = text;
        eError.hidden = false;
        if (field) field.focus();
      }
      if (!name) return fail('Please enter the student’s name.', eFields.name);
      if (phone.replace(/\D/g, '').length < 10) return fail('Please enter a valid 10-digit mobile number.', eFields.phone);

      emodal.querySelector('[data-emodal-first]').textContent = name.split(/\s+/)[0] || 'student';
      emodal.querySelector('[data-emodal-phone]').textContent = phone;
      emodal.querySelector('[data-emodal-wa]').href = 'https://wa.me/919830236143?text=' + encodeURIComponent(
        'Hello, I am ' + name + '. I would like to know about D.Pharm admission.' +
        (email ? ' Email: ' + email + '.' : '') + (msg ? ' ' + msg : ''));

      eForm.hidden = true;
      eDone.hidden = false;
      markSeen();
    });
  }

  /* ---------------- notice ticker ---------------- */
  var ticker = document.querySelector('.ticker');
  if (ticker) {
    var track = ticker.querySelector('.ticker__track');
    var items = Array.prototype.slice.call(track.children);

    // duplicate the run so the loop is seamless, then drive the distance/speed
    // from the real measured width (~55px per second, like a notice board)
    function measure() {
      var gap = parseFloat(getComputedStyle(track).gap) || 44;
      var width = items.reduce(function (sum, el) { return sum + el.offsetWidth + gap; }, 0);
      track.style.setProperty('--ticker-distance', width + 'px');
      track.style.setProperty('--ticker-duration', Math.max(18, Math.round(width / 55)) + 's');
    }
    items.forEach(function (el) {
      var clone = el.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      track.appendChild(clone);
    });
    measure();
    window.addEventListener('resize', measure);

    var toggle = ticker.querySelector('.ticker__toggle');
    if (toggle) toggle.addEventListener('click', function () {
      var paused = ticker.classList.toggle('is-paused');
      toggle.textContent = paused ? '▶' : '❚❚';
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      toggle.setAttribute('aria-label', paused ? 'Resume the updates ticker' : 'Pause the updates ticker');
    });
  }

  /* ---------------- hero carousel ---------------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll('.hero-slide'));
  if (slides.length) {
    var dots = Array.prototype.slice.call(document.querySelectorAll('[data-on-click="d.go"]'));
    var cur = 0, timer = null;

    function paint() {
      slides.forEach(function (s, i) {
        s.style.opacity = i === cur ? '1' : '0';
        s.style.pointerEvents = i === cur ? 'auto' : 'none';
      });
      dots.forEach(function (d, i) {
        d.style.width = i === cur ? '30px' : '10px';
        d.style.background = i === cur ? '#C89B3C' : 'rgba(255,255,255,0.45)';
        d.setAttribute('aria-current', i === cur ? 'true' : 'false');
      });
    }
    function go(n) { cur = (n + slides.length) % slides.length; paint(); auto(); }
    function auto() { clearInterval(timer); timer = setInterval(function () { go(cur + 1); }, 6000); }

    var prev = document.querySelector('[data-on-click="prev"]');
    var next = document.querySelector('[data-on-click="next"]');
    if (prev) prev.addEventListener('click', function () { go(cur - 1); });
    if (next) next.addEventListener('click', function () { go(cur + 1); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') go(cur - 1);
      if (e.key === 'ArrowRight') go(cur + 1);
    });
    // pause while the reader is hovering or tabbing through the hero
    var heroBand = slides[0].parentElement;
    if (heroBand) {
      ['mouseenter', 'focusin'].forEach(function (ev) {
        heroBand.addEventListener(ev, function () { clearInterval(timer); });
      });
      ['mouseleave', 'focusout'].forEach(function (ev) {
        heroBand.addEventListener(ev, function () { auto(); });
      });
    }
    paint();
    auto();
  }

  /* ---------------- stat counters ---------------- */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    var t0 = Date.now();
    var tick = setInterval(function () {
      var p = Math.min(1, (Date.now() - t0) / 1400);
      var e = 1 - Math.pow(1 - p, 3);
      counters.forEach(function (el) {
        el.textContent = String(Math.round(parseFloat(el.getAttribute('data-count')) * e));
      });
      if (p >= 1) clearInterval(tick);
    }, 40);
  }

  /* ---------------- admission enquiry form ---------------- */
  var submitBtn = document.querySelector('[data-on-click="submit"]');
  if (submitBtn) {
    var form = document.querySelector('[data-if="notSubmitted"]');
    var done = document.querySelector('[data-if="submitted"]');
    var errorBox = document.querySelector('[data-if="error"]');
    var f = {
      name: document.getElementById('enq-name'),
      phone: document.getElementById('enq-phone'),
      qual: document.getElementById('enq-qual'),
      place: document.getElementById('enq-district'),
      msg: document.getElementById('enq-msg'),
    };

    function fail(msg) {
      if (!errorBox) return;
      errorBox.textContent = msg;
      errorBox.classList.add('dc-show');
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    Object.keys(f).forEach(function (k) {
      if (f[k]) f[k].addEventListener('input', function () { if (errorBox) errorBox.classList.remove('dc-show'); });
    });

    submitBtn.addEventListener('click', function () {
      var name = (f.name && f.name.value || '').trim();
      var phone = (f.phone && f.phone.value || '');
      var qual = (f.qual && f.qual.value || '');
      var place = (f.place && f.place.value || '').trim();
      var msg = (f.msg && f.msg.value || '').trim();

      if (!name) return fail("Please enter the student's name.");
      if (phone.replace(/\D/g, '').length < 10) return fail('Please enter a valid 10-digit mobile number.');
      if (!qual) return fail('Please select the highest qualification.');

      var firstName = name.split(/\s+/)[0] || 'student';
      var wa = 'https://wa.me/919830236143?text=' + encodeURIComponent(
        'Hello, I am ' + name + ' (' + (place || 'West Bengal') + '). I have sent an admission enquiry for D.Pharm. My question: ' +
        (msg || 'Please share admission details.'));

      var fn = document.querySelector('[data-field="firstName"]');
      var ph = document.querySelector('[data-field="phone"]');
      var link = document.querySelector('[data-field="waLink"]');
      if (fn) fn.textContent = firstName;
      if (ph) ph.textContent = phone;
      if (link) link.setAttribute('href', wa);

      if (errorBox) errorBox.classList.remove('dc-show');
      if (form) form.style.display = 'none';
      if (done) { done.classList.add('dc-show'); done.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });

    var reset = document.querySelector('[data-on-click="reset"]');
    if (reset) reset.addEventListener('click', function () {
      Object.keys(f).forEach(function (k) { if (f[k]) f[k].value = ''; });
      if (done) done.classList.remove('dc-show');
      if (form) form.style.display = '';
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
})();
