(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const slides = [...document.querySelectorAll('.slide')];
  const rig = $('#screen-rig');
  const query = new URLSearchParams(location.search);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    index: -1,
    stage: query.get('view') === 'stage',
    paused: reducedMotion.matches || query.get('motion') === 'off',
    autoplay: false
  };
  let controlsTimer;
  let playTimer;
  let startTouch;

  // Reuse the original artwork pixel-for-pixel; reveal its two existing regions separately.
  const originalSplits = {
    cover: 54, scattered: 44, unify: 44, understand: 49,
    questions: 50, cluster: 45, case: 49, join: 67
  };
  document.querySelectorAll('.original').forEach((slide) => {
    const artwork = slide.querySelector('.original-art');
    const split = originalSplits[slide.dataset.id];
    const left = document.createElement('div');
    left.className = 'original-layer original-copy';
    if (split) left.style.clipPath = `inset(0 ${100 - split}% 0 0)`;
    artwork.replaceWith(left);
    left.append(artwork);
    if (split) {
      const right = document.createElement('div');
      right.className = 'original-layer original-visual';
      right.style.clipPath = `inset(0 0 0 ${split}%)`;
      right.setAttribute('aria-hidden', 'true');
      const visual = artwork.cloneNode(true);
      visual.alt = '';
      right.append(visual);
      slide.append(right);
    }
  });

  const videos = [...document.querySelectorAll('video')];
  videos.forEach((video) => { video.muted = true; });

  function syncVideos() {
    videos.forEach((video) => {
      const active = video.closest('.slide').classList.contains('is-active');
      if (!active || state.paused || document.hidden) {
        video.pause();
        if (!active && video.readyState > 0 && video.currentTime !== 0) video.currentTime = 0;
        return;
      }
      // No delayed retry: a later slide change must not restart a hidden video.
      const promise = video.play();
      if (promise) promise.catch(() => {});
    });
  }

  videos.forEach((video) => {
    video.addEventListener('play', () => {
      if (!video.closest('.slide').classList.contains('is-active') || state.paused || document.hidden) video.pause();
    });
    video.addEventListener('keydown', (event) => {
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) event.stopPropagation();
    });
  });

  // A real message feed: append, hold, type, reply. No continuous text animation.
  const chatFeed = $('#chat-feed');
  const chatViewport = $('#chat-viewport');
  const chatTasks = [
    ['整理上午的客户会议。', '客户方案.pdf 已完成'],
    ['汇总今天的工作进展。', '日报已整理，卡点已标记'],
    ['安排一下明天的行程。', '日程已排好，等你确认'],
    ['把这批素材剪成我的风格。', '已生成成片，等你确认'],
    ['客户反馈，也帮我梳理一下。', '反馈清单已完成'],
    ['明早提醒我看方案和成片。', '已安排，明早发你确认']
  ];
  let chatTask = 1;
  let chatPhase = 'user';
  let chatTimer = null;
  let chatDue = 0;
  let chatRemaining = 900;
  let chatMovement = null;

  function chatCanRun() {
    return slides[state.index]?.dataset.id === 'assistant' && !state.paused && !document.hidden;
  }

  function createMessage(kind, text, typing = false) {
    const row = document.createElement('div');
    row.className = `message-row message-${kind} message-enter`;
    if (typing) row.classList.add('message-typing');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble${typing ? ' typing-bubble' : ''}`;
    if (typing) {
      bubble.setAttribute('aria-label', 'Memo 正在输入');
      for (let i = 0; i < 3; i += 1) bubble.append(document.createElement('i'));
    } else {
      if (kind === 'agent') bubble.innerHTML = '<svg class="bubble-check" aria-hidden="true"><use href="#check"/></svg>';
      bubble.append(document.createTextNode(text));
    }
    row.append(bubble);
    bubble.addEventListener('animationend', () => row.classList.remove('message-enter'), { once: true });
    return row;
  }

  function updateChat(row, replaceTyping = false) {
    const typing = chatFeed.querySelector('.message-typing');
    const anchor = replaceTyping && typing ? typing.previousElementSibling : chatFeed.lastElementChild;
    if (chatMovement) { chatMovement.cancel(); chatMovement = null; }
    const oldTop = anchor?.getBoundingClientRect().top;
    if (replaceTyping && typing) typing.replaceWith(row);
    else chatFeed.append(row);
    while (chatFeed.children.length > 8) chatFeed.firstElementChild.remove();
    chatViewport.scrollTop = chatViewport.scrollHeight - chatViewport.clientHeight;
    const scale = rig.getBoundingClientRect().width / rig.offsetWidth;
    const delta = anchor?.isConnected ? (oldTop - anchor.getBoundingClientRect().top) / scale : 0;
    if (delta && Math.abs(delta) > .5 && !reducedMotion.matches) {
      chatMovement = chatFeed.animate(
        [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
        { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' }
      );
    }
  }

  function stepChat() {
    chatTimer = null;
    if (!chatCanRun()) return;
    if (chatPhase === 'user') {
      updateChat(createMessage('user', chatTasks[chatTask][0]));
      chatPhase = 'typing';
      chatRemaining = 850;
    } else if (chatPhase === 'typing') {
      updateChat(createMessage('agent', '', true));
      chatPhase = 'reply';
      chatRemaining = 1050;
    } else {
      updateChat(createMessage('agent', chatTasks[chatTask][1]), true);
      chatTask = (chatTask + 1) % chatTasks.length;
      chatPhase = 'user';
      chatRemaining = 1650;
    }
    syncChat();
  }

  function syncChat() {
    if (!chatCanRun()) {
      if (chatTimer !== null) {
        chatRemaining = Math.max(0, chatDue - performance.now());
        clearTimeout(chatTimer);
        chatTimer = null;
      }
      if (chatMovement?.playState === 'running') chatMovement.pause();
      return;
    }
    if (chatMovement?.playState === 'paused') chatMovement.play();
    if (chatTimer === null) {
      chatDue = performance.now() + chatRemaining;
      chatTimer = setTimeout(stepChat, chatRemaining);
    }
  }

  function layout() {
    const width = state.stage ? 2416 : 1856;
    const scale = Math.min(innerWidth / width, innerHeight / 576);
    rig.style.transform = `scale(${scale})`;
  }

  function showControls() {
    clearTimeout(controlsTimer);
    document.body.classList.add('controls-visible');
    controlsTimer = setTimeout(() => {
      document.body.classList.remove('controls-visible');
    }, 2000);
  }

  function scheduleAutoplay() {
    clearTimeout(playTimer);
    if (!state.autoplay || state.paused || document.hidden) return;
    const comparison = [...slides[state.index].querySelectorAll('[data-demo]')];
    const seconds = comparison.length
      ? Math.max(...comparison.map((video) => Number.isFinite(video.duration) ? video.duration : 72)) + 1
      : slides[state.index].dataset.id === 'assistant' ? 22 : 14;
    playTimer = setTimeout(() => goTo((state.index + 1) % slides.length), seconds * 1000);
  }

  function goTo(index, updateHash = true) {
    const next = Math.max(0, Math.min(slides.length - 1, index));
    if (state.index === next) return;
    state.index = next;
    slides.forEach((slide, i) => {
      const active = i === next;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active;
    });
    const slide = slides[next];
    $('#page-current').textContent = next + 1;
    $('#prev').disabled = next === 0;
    $('#next').disabled = next === slides.length - 1;
    document.querySelectorAll('[data-for]').forEach((item) => {
      item.classList.toggle('is-current', item.dataset.for === (slide.dataset.category || slide.dataset.id));
    });
    $('#announcement').textContent = `第 ${next + 1} 页，共 ${slides.length} 页。${slide.getAttribute('aria-label') || slide.querySelector('h1,h2')?.textContent || ''}`;
    if (updateHash && location.hash !== `#${slide.dataset.id}`) location.hash = slide.dataset.id;
    syncVideos();
    syncChat();
    scheduleAutoplay();
  }

  function setStage(value) {
    state.stage = value;
    rig.classList.toggle('is-stage', value);
    document.querySelectorAll('.side-screen').forEach((screen) => { screen.hidden = !value; });
    $('#stage').setAttribute('aria-pressed', String(value));
    $('#stage').setAttribute('aria-label', value ? '仅看主屏' : '三屏预览');
    layout();
  }

  function setAutoplay(value) {
    state.autoplay = Boolean(value) && !state.paused;
    $('#autoplay').setAttribute('aria-pressed', String(state.autoplay));
    $('#autoplay').setAttribute('aria-label', state.autoplay ? '停止轮播' : '自动轮播');
    scheduleAutoplay();
  }

  function setPaused(value) {
    state.paused = value;
    document.body.classList.toggle('motion-paused', value);
    $('#motion').setAttribute('aria-pressed', String(value));
    $('#motion').setAttribute('aria-label', value ? '恢复动效' : '暂停动效');
    $('#motion').title = value ? '恢复动效 M' : '暂停动效 M';
    $('#motion-icon').setAttribute('d', value ? 'm9 6 10 6-10 6Z' : 'M9 6v12M15 6v12');
    if (value) setAutoplay(false);
    syncVideos();
    syncChat();
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch {
      // The deck already occupies the browser viewport; no fallback overlay is needed.
    }
  }

  $('#prev').addEventListener('click', () => goTo(state.index - 1));
  $('#next').addEventListener('click', () => goTo(state.index + 1));
  $('#stage').addEventListener('click', () => setStage(!state.stage));
  $('#motion').addEventListener('click', () => setPaused(!state.paused));
  $('#autoplay').addEventListener('click', () => setAutoplay(!state.autoplay));
  $('#fullscreen').addEventListener('click', toggleFullscreen);
  document.addEventListener('pointermove', showControls, { passive: true });
  document.addEventListener('pointerdown', showControls, { passive: true });
  window.addEventListener('resize', layout, { passive: true });
  document.addEventListener('fullscreenchange', layout);
  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('page-hidden', document.hidden);
    scheduleAutoplay();
    syncVideos();
    syncChat();
  });
  reducedMotion.addEventListener('change', (event) => {
    if (event.matches) setPaused(true);
  });
  window.addEventListener('hashchange', () => {
    const index = slides.findIndex((slide) => `#${slide.dataset.id}` === location.hash);
    if (index >= 0) goTo(index, false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === 'tab') { showControls(); return; }
    if ((key === ' ' || key === 'enter') && event.target.closest('button')) return;
    if (['arrowright', 'arrowdown', 'pagedown', ' '].includes(key)) {
      event.preventDefault(); goTo(state.index + 1);
    } else if (['arrowleft', 'arrowup', 'pageup'].includes(key)) {
      event.preventDefault(); goTo(state.index - 1);
    } else if (key === 'home') {
      event.preventDefault(); goTo(0);
    } else if (key === 'end') {
      event.preventDefault(); goTo(slides.length - 1);
    } else if (key === 's') {
      setStage(!state.stage);
    } else if (key === 'm') {
      setPaused(!state.paused);
    } else if (key === 'a') {
      setAutoplay(!state.autoplay);
    } else if (key === 'f') {
      event.preventDefault(); toggleFullscreen();
    }
  });
  const main = $('#main-screen');
  main.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') startTouch = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  main.addEventListener('pointerup', (event) => {
    if (!startTouch) return;
    const dx = event.clientX - startTouch.x;
    const dy = event.clientY - startTouch.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.6) goTo(state.index + (dx < 0 ? 1 : -1));
    startTouch = null;
  }, { passive: true });
  main.addEventListener('pointercancel', () => { startTouch = null; });

  setPaused(state.paused);
  setStage(state.stage);
  const initial = slides.findIndex((slide) => `#${slide.dataset.id}` === location.hash);
  goTo(initial < 0 ? 0 : initial, false);
  showControls();
})();
