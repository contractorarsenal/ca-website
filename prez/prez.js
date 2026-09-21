/* Contractor Arsenal: /prez presentation behavior.
   Vanilla JS, no dependencies. Responsibilities:
   1. Reveal system: toggles .in on each snap part as it crosses the middle of the viewport
      (and removes it once fully off screen so the slide replays when you come back).
   2. Header state, overall progress bar, section rail.
   3. Keyboard / rail / step-button navigation that never traps a tall slide.
   4. Slide 05 visitor simulation (timeline-driven, cancelable, replayable). */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduced = root.classList.contains('reduced');
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  var parts = $$('.part[data-snap]');
  var sections = $$('section.slide');
  var railLinks = $$('#pRail a');
  var head = $('#pHead');
  var bar = $('#pBar');
  var railFill = $('#pRailFill');
  var hasIO = 'IntersectionObserver' in window;

  /* ── 1. Reveal system ── */
  if (hasIO) {
    // Enter: part crosses the middle band of the viewport (works for parts taller than the screen too)
    var enterIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { rootMargin: '-35% 0px -35% 0px', threshold: 0 });
    // Leave: fully out of the viewport, reset so the slide replays on return
    var leaveIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (!e.isIntersecting) e.target.classList.remove('in'); });
    }, { threshold: 0 });
    parts.forEach(function (p) { enterIO.observe(p); leaveIO.observe(p); });
  } else {
    parts.forEach(function (p) { p.classList.add('in'); });
  }

  /* ── 2. Scroll state ── */
  var ticking = false;
  var brWrap = $('.br');

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = window.pageYOffset || root.scrollTop;
      var vh = window.innerHeight;
      var max = Math.max(1, root.scrollHeight - vh);
      head.classList.toggle('scrolled', y > 10);
      bar.style.transform = 'scaleX(' + Math.min(1, y / max) + ')';

      // Active section = the one under the viewport's vertical midpoint
      var active = 0;
      sections.forEach(function (s, i) {
        var r = s.getBoundingClientRect();
        if (r.top <= vh * 0.5) active = i;
      });
      if (y + vh >= root.scrollHeight - 4) active = sections.length - 1;
      railLinks.forEach(function (a, i) {
        if (i === active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        a.classList.toggle('done', i < active);
      });
      railFill.style.transform = 'scaleY(' + active / (sections.length - 1) + ')';

      // Very small depth cue on the browser mock while its slide moves through the viewport
      if (brWrap && !reduced && window.innerWidth > 1024) {
        var br = brWrap.getBoundingClientRect();
        var off = (br.top + br.height / 2 - vh / 2) * -0.04;
        brWrap.style.transform = 'translate3d(0,' + Math.max(-14, Math.min(14, off)).toFixed(1) + 'px,0)';
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ── 3. Navigation ── */
  function smooth() { return reduced ? 'auto' : 'smooth'; }
  function topOf(el) { return el.getBoundingClientRect().top + (window.pageYOffset || root.scrollTop); }
  function goTo(el) { window.scrollTo({ top: topOf(el), behavior: smooth() }); }

  railLinks.forEach(function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      var s = sections[+a.getAttribute('data-i')];
      goTo(s);
      if (history.replaceState) history.replaceState(null, '', '#' + s.id);
    });
  });

  // Index of the snap stop the viewport is currently on
  var pending = { idx: -1, until: 0 };
  function currentIdx() {
    if (Date.now() < pending.until && pending.idx > -1) return pending.idx;
    var idx = 0;
    parts.forEach(function (p, i) { if (p.getBoundingClientRect().top <= 40) idx = i; });
    return idx;
  }
  function step(dir) {
    var vh = window.innerHeight;
    var i = currentIdx();
    var r = parts[i].getBoundingClientRect();
    // A part taller than the screen scrolls through itself first, so nothing is ever skipped or trapped
    if (Date.now() >= pending.until) {
      if (dir > 0 && r.bottom > vh + 40) { window.scrollBy({ top: Math.min(vh * 0.85, r.bottom - vh), behavior: smooth() }); return; }
      if (dir < 0 && r.top < -40) { window.scrollBy({ top: -Math.min(vh * 0.85, -r.top), behavior: smooth() }); return; }
    }
    var n = Math.max(0, Math.min(parts.length - 1, i + dir));
    if (n === i && dir !== 0) return;
    pending = { idx: n, until: Date.now() + 750 };
    goTo(parts[n]);
  }

  $('#pNext').addEventListener('click', function () { step(1); });
  $('#pPrev').addEventListener('click', function () { step(-1); });

  doc.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var t = e.target;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    switch (e.key) {
      case 'ArrowDown': case 'PageDown': case 'ArrowRight': e.preventDefault(); step(1); break;
      case 'ArrowUp': case 'PageUp': case 'ArrowLeft': e.preventDefault(); step(-1); break;
      case 'Home': e.preventDefault(); pending = { idx: 0, until: Date.now() + 750 }; goTo(parts[0]); break;
      case 'End': e.preventDefault(); pending = { idx: parts.length - 1, until: Date.now() + 750 }; goTo(parts[parts.length - 1]); break;
    }
  });

  /* Wheel / trackpad: with mandatory snap, a small notch on a full-screen slide would snap straight back.
     In presentation mode one deliberate gesture advances one stop; trackpad inertia is ignored.
     Parts taller than the screen, page ends, pinch-zoom and touch devices keep native scrolling. */
  var presenting = window.matchMedia ? window.matchMedia('(min-width:1025px) and (min-height:640px) and (hover:hover) and (pointer:fine)') : { matches: false };
  var wLast = 0, wLockUntil = 0, wLocked = false, wAcc = 0;
  window.addEventListener('wheel', function (e) {
    if (!presenting.matches || e.ctrlKey || e.metaKey || !e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    var dir = e.deltaY > 0 ? 1 : -1;
    var i = currentIdx();
    var r = parts[i].getBoundingClientRect();
    var vh = window.innerHeight;
    if ((dir > 0 && r.bottom > vh + 40) || (dir < 0 && r.top < -40)) return;
    if ((dir > 0 && i === parts.length - 1) || (dir < 0 && i === 0)) return;
    e.preventDefault();
    var now = Date.now(), gap = now - wLast;
    wLast = now;
    if (now < wLockUntil) return;
    if (wLocked) { if (gap < 90) return; wLocked = false; wAcc = 0; }
    wAcc = (gap > 200 ? 0 : wAcc) + (e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY);
    if (Math.abs(wAcc) >= 30) {
      wAcc = 0; wLocked = true; wLockUntil = now + 700;
      step(dir);
    }
  }, { passive: false });

  /* ── Plan selection: cards link straight to checkout; selecting one also arms the bottom bar ── */
  var plans = $$('.plan');
  var pick = $('#pick'), pickGo = $('#pickGo'), pickName = $('#pickName'), pickLabel = $('#pickLabel');
  function selectPlan(card) {
    plans.forEach(function (c) {
      var on = c === card;
      c.classList.toggle('is-sel', on);
      c.querySelector('.plan-sel').setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    pick.classList.add('on');
    pickLabel.textContent = 'Selected';
    pickName.textContent = card.getAttribute('data-name') + ' · ' + card.getAttribute('data-price') + '/mo';
    pickGo.setAttribute('href', card.querySelector('.plan-cta').getAttribute('href'));
    pickGo.removeAttribute('aria-disabled');
    pickGo.removeAttribute('tabindex');
    pickGo.removeAttribute('role');
  }
  plans.forEach(function (card) {
    card.querySelector('.plan-sel').addEventListener('click', function () { selectPlan(card); });
    // Clicking anywhere else on the card (not a link/button) also selects it
    card.addEventListener('click', function (e) {
      if (e.target.closest('a,button')) return;
      selectPlan(card);
    });
  });
  var toPlans = $('#toPlans');
  if (toPlans) toPlans.addEventListener('click', function (e) { e.preventDefault(); goTo($('#s8')); });

  /* ── 4. Slide 05: visitor simulation ── */
  var lab = $('#lab');
  if (!lab) return;

  var evItems = $$('#evList li');
  var pats = {};
  $$('#patList li').forEach(function (li) { pats[li.getAttribute('data-p')] = li; });
  var patAll = $$('#patList li');
  var eng = $('#eng');
  var engCount = $('#engCount');
  var flow = $$('#flow .fl');
  var pos = $('#pos');
  var page = $('#brPage');
  var view = $('#brView');
  var depthEl = $('#brDepth');
  var scrollFill = $('#brScrollFill');
  var cursor = $('#pgCursor');
  var call = $('#pgCall');
  var hlSvc = $('#pgSvc'), hlRepl = $('#pgRepl'), hlFin = $('#pgFin');

  var timers = [];
  var state = 'idle'; // idle | playing | done
  var depthNow = 0;
  var tweens = [];

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearAll() {
    timers.forEach(clearTimeout); timers = [];
    tweens.forEach(cancelAnimationFrame); tweens = [];
  }
  function tween(from, to, ms, cb) {
    var t0 = null;
    function f(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / ms);
      var e = 1 - Math.pow(1 - k, 3);
      cb(from + (to - from) * e);
      if (k < 1) tweens.push(requestAnimationFrame(f));
    }
    tweens.push(requestAnimationFrame(f));
  }
  function setDepth(v, animate) {
    scrollFill.style.height = v + '%';
    if (!animate || reduced) { depthEl.textContent = Math.round(v) + '%'; depthNow = v; return; }
    var from = depthNow; depthNow = v;
    tween(from, v, 1000, function (x) { depthEl.textContent = Math.round(x) + '%'; });
  }
  function maxScroll() { return Math.max(0, page.offsetHeight - view.clientHeight); }
  function scrollTo(y) { page.style.transform = 'translate3d(0,' + (-Math.round(y)) + 'px,0)'; }
  function ping() {
    eng.classList.remove('ping'); void eng.offsetWidth; eng.classList.add('ping');
  }
  function flash(key) {
    var li = pats[key]; if (!li) return;
    li.classList.add('on', 'flash');
    later(function () { li.classList.remove('flash'); }, 700);
  }
  function showEvent(i, keys) {
    evItems[i].classList.add('show');
    var from = +engCount.textContent || 0;
    if (reduced) engCount.textContent = i + 1; else tween(from, i + 1, 350, function (x) { engCount.textContent = Math.round(x); });
    ping();
    (keys || []).forEach(flash);
  }

  function resetSim() {
    clearAll();
    state = 'idle';
    evItems.forEach(function (li) { li.classList.remove('show'); });
    patAll.forEach(function (li) { li.classList.remove('on', 'flash'); });
    flow.forEach(function (f) { f.classList.remove('on'); });
    pos.classList.remove('on');
    engCount.textContent = '0';
    page.style.transform = '';
    setDepth(0, false);
    hlSvc.classList.remove('hl'); hlRepl.classList.remove('hl'); hlFin.classList.remove('hl');
    call.classList.remove('press');
    cursor.style.opacity = '0'; cursor.style.left = '78%'; cursor.style.top = '105%';
  }

  function finalSim() {
    clearAll();
    state = 'done';
    evItems.forEach(function (li) { li.classList.add('show'); });
    patAll.forEach(function (li) { li.classList.add('on'); });
    flow.forEach(function (f) { f.classList.add('on'); });
    pos.classList.add('on');
    engCount.textContent = String(evItems.length);
    scrollTo(maxScroll() * 0.72);
    setDepth(72, false);
    hlFin.classList.add('hl');
  }

  function playSim() {
    resetSim();
    if (reduced) { finalSim(); return; }
    state = 'playing';
    var max = maxScroll();

    later(function () { showEvent(0, ['pages']); }, 500);

    later(function () {
      var y = Math.min(max, hlSvc.offsetTop - 8);
      scrollTo(y); setDepth(max ? Math.round(y / max * 100) : 0, true);
      hlSvc.classList.add('hl'); hlRepl.classList.add('hl');
      showEvent(1, ['svc']);
    }, 2000);

    later(function () {
      scrollTo(max * 0.72); setDepth(72, true);
      hlSvc.classList.remove('hl'); hlRepl.classList.remove('hl');
      showEvent(2, ['scroll']);
    }, 3700);

    later(function () {
      hlFin.classList.add('hl');
      showEvent(3, ['pages']);
    }, 5400);

    // Cursor travels to the sticky Call Now button
    later(function () {
      var vr = view.getBoundingClientRect(), cr = call.getBoundingClientRect();
      cursor.style.opacity = '1';
      cursor.style.left = (cr.left - vr.left + cr.width * 0.5) + 'px';
      cursor.style.top = (cr.top - vr.top + cr.height * 0.4) + 'px';
    }, 6300);
    later(function () { call.classList.add('press'); showEvent(4, ['clicks', 'cta']); }, 7500);
    later(function () { call.classList.remove('press'); showEvent(5, ['leads']); }, 8700);

    // Engine organizes: remaining patterns light up, then DATA > PATTERNS > INSIGHTS > IMPROVEMENTS
    later(function () { flash('exit'); ping(); }, 9800);
    flow.forEach(function (f, i) { later(function () { f.classList.add('on'); }, 10600 + i * 750); });
    later(function () { pos.classList.add('on'); state = 'done'; }, 10600 + flow.length * 750 + 200);
  }

  $('#replay').addEventListener('click', playSim);

  if (reduced) {
    finalSim();
  } else if (hasIO) {
    // Start when the mock browser is mostly on screen; reset only once the whole lab has left the viewport
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && state === 'idle') playSim(); });
    }, { threshold: 0.6 }).observe(view);
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting && state !== 'idle') resetSim(); });
    }, { threshold: 0 }).observe(lab);
  } else {
    finalSim();
  }
})();
