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
