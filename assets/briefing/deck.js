(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const slides = $$('.slide');
  const canvas = $('.deck-canvas');
  const stage = $('.deck-stage');
  const outline = $('.outline-dialog');
  const notePanel = $('.speaker-notes');
  const notes = JSON.parse($('#slide-notes').textContent);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0;
  let rendered = false;
  let statusTimer;
  const fromHash = () => Math.max(0, slides.findIndex(slide => slide.id === decodeURIComponent(location.hash.slice(1))));
  const fit = () => {
    const box = stage.getBoundingClientRect();
    canvas.style.setProperty('--deck-scale', Math.max(.1, Math.min((box.width - 24) / 1600, (box.height - 24) / 900)));
  };
  function show(next, updateHash = true) {
    if (!Number.isFinite(next)) return;
    next = Math.max(0, Math.min(slides.length - 1, next));
    const changed = index !== next;
    const outgoing = slides[index];
    const focusMoves = outgoing?.contains(document.activeElement);
    index = next;
    slides.forEach((slide, i) => { slide.hidden = i !== index; slide.inert = i !== index; });
    const current = slides[index];
    if (focusMoves) { current.tabIndex = -1; current.focus({preventScroll:true}); }
    if (updateHash) history.replaceState(null, '', `#${current.id}`);
    $('[data-counter]').textContent = `${String(index + 1).padStart(2,'0')} / ${slides.length}`;
    $('[data-prev]').disabled = index === 0;
    $$('.deck-controls [data-next]').forEach(button => button.disabled = index === slides.length - 1);
    $$('.outline-list button').forEach((button,i) => button.setAttribute('aria-current', String(i === index)));
    const progress = $('.progress-track');
    progress.setAttribute('aria-valuemax',slides.length);
    progress.setAttribute('aria-valuenow',index+1);
    progress.firstElementChild.style.width = `${(index+1)/slides.length*100}%`;
    $('[data-note-text]').textContent = notes[index];
    document.title = `${current.dataset.title} · Zettlab 客户讲解版`;
    $$('video').forEach(video => {
      if (current.contains(video) && !reduced.matches && !document.hidden) video.play().catch(()=>{});
      else video.pause();
    });
    if (rendered && changed && !reduced.matches) {
      current.getAnimations().forEach(animation=>animation.cancel());
      current.animate([{opacity:0,translate:'28px 0'},{opacity:1,translate:'0 0'}],{duration:400,easing:'cubic-bezier(.22,1,.36,1)'});
    }
    rendered = true;
  }
  function status(message) {
    clearTimeout(statusTimer);
    $('.deck-status').textContent = message;
    $('.deck-status').classList.add('is-visible');
    statusTimer = setTimeout(()=>$('.deck-status').classList.remove('is-visible'),3500);
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else status('当前浏览器不支持全屏，可横屏查看讲解版。');
    } catch { status('全屏未能开启，请使用浏览器的全屏功能。'); }
  }
  function toggleNotes(force) {
    const open = force === undefined ? notePanel.hidden : force;
    notePanel.hidden = !open;
    $('[data-notes]').setAttribute('aria-expanded',String(open));
  }
  function toggleOutline() {
    if (outline.open) outline.close();
    else outline.showModal();
  }
  const presets = [
    ['邮件、报价表、聊天记录','比较供应商报价，整理差异与建议','报价对比表与待确认清单'],
    ['岗位要求、简历、面试记录','整理候选人资料，形成匹配依据','候选人对照表与面试准备'],
    ['产品资料、创意参考、发布数据','拆解参考，准备分镜与复盘','分镜脚本与下期选题建议']
  ];
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.hasAttribute('data-next')) show(index+1);
    else if (button.hasAttribute('data-prev')) show(index-1);
    else if (button.hasAttribute('data-goto')) { show(Number(button.dataset.goto)); outline.close(); }
    else if (button.hasAttribute('data-slide')) show(slides.findIndex(slide=>slide.id===button.dataset.slide));
    else if (button.hasAttribute('data-fullscreen')) fullscreen();
    else if (button.hasAttribute('data-outline')) toggleOutline();
    else if (button.hasAttribute('data-close-outline')) outline.close();
    else if (button.hasAttribute('data-notes')) toggleNotes();
    else if (button.hasAttribute('data-close-notes')) toggleNotes(false);
    else if (button.hasAttribute('data-scene')) {
      const root = button.closest('[data-role-demo]');
      const selected = Number(button.dataset.scene);
      root.querySelectorAll('[data-scene]').forEach((item,i)=>{
        item.classList.toggle('is-active',i===selected);
        item.setAttribute('aria-pressed',String(i===selected));
      });
      root.querySelectorAll('.brief-scene').forEach((scene,i)=>scene.hidden=i!==selected);
      root.querySelectorAll('[data-chat-scene]').forEach(chat=>chat.hidden=Number(chat.dataset.chatScene)!==selected);
    } else if (button.hasAttribute('data-preset')) {
      const selected = Number(button.dataset.preset);
      $$('[data-preset]').forEach((item,i)=>item.setAttribute('aria-pressed',String(i===selected)));
      ['input','task','output'].forEach((key,i)=>$(`[data-preset-${key}]`).textContent=presets[selected][i]);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.defaultPrevented) return;
    if (event.target.closest('input,textarea,select,[contenteditable=true]')) return;
    if (outline.open) return;
    if (['ArrowRight','PageDown'].includes(event.key)) { event.preventDefault(); show(index+1); }
    else if (['ArrowLeft','PageUp'].includes(event.key)) { event.preventDefault(); show(index-1); }
    else if (event.key === ' ' && !event.target.closest('button,a')) { event.preventDefault(); show(index+1); }
    else if (event.key === 'Home') { event.preventDefault(); show(0); }
    else if (event.key === 'End') { event.preventDefault(); show(slides.length-1); }
    else if (event.key.toLowerCase() === 'f') { event.preventDefault(); fullscreen(); }
    else if (event.key.toLowerCase() === 'o') { event.preventDefault(); toggleOutline(); }
    else if (event.key.toLowerCase() === 'n') { event.preventDefault(); toggleNotes(); }
    else if (event.key === 'Escape') toggleNotes(false);
  });
  let touchStart;
  stage.addEventListener('touchstart', event => {
    if (event.touches.length !== 1 || event.target.closest('button,a,input')) { touchStart = null; return; }
    const touch = event.touches[0];
    touchStart = {x:touch.clientX,y:touch.clientY,time:Date.now()};
  },{passive:true});
  stage.addEventListener('touchend', event => {
    if (!touchStart || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0], dx=touch.clientX-touchStart.x,dy=touch.clientY-touchStart.y;
    if (Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.5 && Date.now()-touchStart.time<1000) show(index+(dx<0?1:-1));
    touchStart=null;
  },{passive:true});
  const calculator = $('.calculator');
  function calculate() {
    const fields = [...calculator.querySelectorAll('input')];
    const valid = fields.every(field=>field.value.trim()!=='' && field.checkValidity());
    $('.input-error').hidden=valid;
    if (!valid) { $$('[data-result]').forEach(out=>out.value='—'); return; }
    const get = name => Number(calculator.elements.namedItem(name).value);
    const hours=get('people')*get('hours')*4.33*get('share')/100;
    const month=hours/174*get('cost');
    const values={hours:Math.round(hours),month:Math.round(month),year:Math.round(month*12)};
    $$('[data-result]').forEach(out=>out.value=values[out.dataset.result].toLocaleString('zh-CN'));
  }
  calculator.addEventListener('input',calculate);
  window.addEventListener('hashchange',()=>show(fromHash(),false));
  window.addEventListener('resize',fit);
  window.addEventListener('load',fit);
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(stage);
  document.addEventListener('fullscreenchange',()=>{
    const active=!!document.fullscreenElement;
    $('[data-fullscreen]').textContent=active?'退出全屏':'全屏演示';
    $('[data-fullscreen]').setAttribute('aria-pressed',String(active));
    fit();
  });
  document.addEventListener('visibilitychange',()=>show(index,false));
  reduced.addEventListener('change',()=>show(index,false));
  fit(); calculate(); show(fromHash());
  document.documentElement.dataset.deckReady='1';
})();
