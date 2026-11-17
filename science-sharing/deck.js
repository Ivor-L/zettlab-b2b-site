(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const slides = $$('.slide');
  const canvas = $('.canvas');
  const stage = $('.stage');
  const notes = JSON.parse($('#notes').textContent);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = -1;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };

  const fit = () => {
    const b = stage.getBoundingClientRect();
    canvas.style.setProperty('--scale', Math.max(.1, Math.min((b.width - 24) / 1600, (b.height - 24) / 900)));
  };

  // ---- one-minute strip on the decode slide (deterministic, ~37% presenter)
  const strip = $('[data-strip]');
  if (strip) {
    const pattern = [3, 2, 2, 1, 4, 2, 1, 3, 2, 2, 3, 1, 2, 4, 1, 2, 3, 2, 1, 2, 3, 2, 2, 1, 3, 2, 1, 2];
    let n = 0;
    pattern.forEach((w, k) => {
      const seg = document.createElement('i');
      seg.style.flex = String(w);
      seg.style.setProperty('--i', n++);
      if (k % 3 !== 0) seg.className = 'm';
      strip.append(seg);
    });
  }

  // ---- counters
  function runCount(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const fmt = v => dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US').replace(/,/g, '');
    if (reduced) { el.textContent = fmt(target); return; }
    const start = performance.now() + 250, dur = 1600;
    el.textContent = fmt(0);
    const tick = now => {
      if (!el.closest('.slide.on')) return;
      const p = Math.min(1, Math.max(0, (now - start) / dur));
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---- typewriter
  function runType(el) {
    if (!el.dataset.full) el.dataset.full = el.textContent;
    const full = el.dataset.full;
    el.classList.remove('done');
    if (reduced) { el.textContent = full; el.classList.add('done'); return; }
    el.textContent = '';
    let i = 0;
    const step = () => {
      if (!el.closest('.slide.on')) return;
      el.textContent = full.slice(0, ++i);
      if (i < full.length) later(step, 70); else el.classList.add('done');
    };
    later(step, parseInt(el.dataset.delay || '0', 10));
  }

  // ---- before / after player
  const before = $('[data-ba="before"]'), after = $('[data-ba="after"]'), toggle = $('[data-ba-toggle]');
  const planRows = $$('[data-plan] li');
  function baPause() { before?.pause(); after?.pause(); toggle?.classList.remove('is-playing'); }
  function baPlay() {
    if (!before || !after) return;
    if (after.ended || after.currentTime >= after.duration - .1) { after.currentTime = 0; }
    before.currentTime = after.currentTime;
    after.play(); before.play();
    toggle.classList.add('is-playing');
  }
  toggle?.addEventListener('click', baPlay);
  [before, after].forEach(v => v?.addEventListener('click', () => (after.paused ? baPlay() : baPause())));
  after?.addEventListener('timeupdate', () => {
    const t = after.currentTime;
    if (Math.abs(before.currentTime - t) > .25) before.currentTime = t;
    planRows.forEach(li => li.classList.toggle('is-now', t >= +li.dataset.from && t < +li.dataset.to));
  });
  after?.addEventListener('ended', () => { baPause(); planRows.forEach(li => li.classList.remove('is-now')); });

  // ---- navigation
  function show(next, updateHash = true) {
    next = Math.max(0, Math.min(slides.length - 1, next));
    if (next === index) return;
    const prev = slides[index];
    if (prev) {
      prev.classList.remove('on');
      prev.hidden = true;
      $$('video', prev).forEach(v => v.pause());
    }
    clearTimers();
    baPause();
    index = next;
    const cur = slides[index];
    cur.hidden = false;
    void cur.offsetWidth; // restart CSS animations
    cur.classList.add('on');
    $$('video', cur).forEach(v => { if (v.dataset.ba) return; v.preload = 'auto'; v.currentTime = 0; v.play().catch(() => {}); });
    $$('[data-count]', cur).forEach(runCount);
    $$('[data-type]', cur).forEach(runType);
    if (updateHash) history.replaceState(null, '', '#' + cur.id);
    $('[data-counter]').textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    $('[data-prev]').disabled = index === 0;
    $('[data-next]').disabled = index === slides.length - 1;
    $('.progress i').style.width = `${(index + 1) / slides.length * 100}%`;
    $('[data-note]').textContent = notes[index] || '';
    // warm up next slide's media
    $$('video', slides[index + 1] || cur).forEach(v => { if (v.preload === 'none') v.preload = 'metadata'; });
  }
  const fromHash = () => Math.max(0, slides.findIndex(s => s.id === decodeURIComponent(location.hash.slice(1))));

  const notePanel = $('.notes'), noteBtn = $('[data-notes]');
  const toggleNotes = () => { notePanel.hidden = !notePanel.hidden; noteBtn.setAttribute('aria-expanded', String(!notePanel.hidden)); };
  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});

  $('[data-prev]').addEventListener('click', () => show(index - 1));
  $('[data-next]').addEventListener('click', () => show(index + 1));
  noteBtn.addEventListener('click', toggleNotes);
  $('[data-fullscreen]').addEventListener('click', toggleFull);
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); show(index + 1); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); show(index - 1); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(slides.length - 1);
    else if (k === 'f' || k === 'F') toggleFull();
    else if (k === 'n' || k === 'N') toggleNotes();
    else if ((k === 'p' || k === 'P') && slides[index]?.id === 'before-after') (after.paused ? baPlay() : baPause());
  });
  window.addEventListener('hashchange', () => show(fromHash(), false));
  window.addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', fit);
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(stage);
  fit();
  show(fromHash(), false);
})();
