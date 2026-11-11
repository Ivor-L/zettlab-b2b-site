/* Page presentation, video hero and the existing component demonstrations. */
import ui from './ui/ui.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const ease = 'cubic-bezier(.22, 1, .36, 1)';
const animations = new Set();
const later = new Set();
const observers = [];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function after(callback, delay) {
  const timer = setTimeout(() => { later.delete(timer); if (!reduced.matches) callback(); }, delay);
  later.add(timer);
  return timer;
}
function animate(el, keyframes, options = {}) {
  if (!el || reduced.matches) return;
  const animation = el.animate(keyframes, { duration: 680, easing: ease, ...options });
  animations.add(animation);
  animation.finished.catch(() => {}).finally(() => animations.delete(animation));
  return animation;
}
function enter(el, delay = 0, distance = 22) {
  animate(el, [
    { opacity: 0, translate: `0 ${distance}px` },
    { opacity: 1, translate: '0 0' },
  ], { delay, fill: 'backwards' });
}
function onceVisible(elements, callback, options = {}) {
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      callback(entry.target);
    });
  }, { threshold: .14, rootMargin: '0px 0px -32px 0px', ...options });
  elements.filter(Boolean).forEach(el => observer.observe(el));
  observers.push(observer);
}

// Run only after the existing components have mounted; never initialize a second UI runtime.
async function ready() {
  if (document.documentElement.dataset.ready === '1') return;
  await new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (document.documentElement.dataset.ready === '1') { clearTimeout(timer); observer.disconnect(); resolve(); }
    });
    const timer = setTimeout(() => { observer.disconnect(); resolve(); }, 8000);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ready'] });
  });
}

function videoHero() {
  const hero = $('.hero--video');
  const video = $('.hero__film', hero || document);
  const button = $('.hero__playback', hero || document);
  const nav = $('.nav');
  if (!hero || !video || !button) return;

  let userPaused = reduced.matches;
  let inView = hero.getBoundingClientRect().bottom > (nav?.offsetHeight || 0);
  const paint = () => {
    button.classList.toggle('is-paused', video.paused);
    button.setAttribute('aria-label', video.paused ? '播放背景视频' : '暂停背景视频');
    button.setAttribute('aria-pressed', String(video.paused));
  };
  const sync = () => {
    if (userPaused || !inView || document.hidden) video.pause();
    else video.play().then(paint, paint);
    paint();
  };
  button.addEventListener('click', () => { userPaused = !video.paused; sync(); });
  video.addEventListener('play', paint);
  video.addEventListener('pause', paint);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => {
    if (reduced.matches) userPaused = true;
    sync();
  });
  nav?.classList.toggle('z-nav-on-video', inView);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      nav?.classList.toggle('z-nav-on-video', inView);
      sync();
    }, { rootMargin: `-${nav?.offsetHeight || 0}px 0px 0px 0px` });
    observer.observe(hero);
  }
  sync();
}


function featureShowcase() {
  const root = $('[data-feature-showcase]');
  if (!root) return;
  const tabs = $$('[data-feature-tab]', root);
  const panels = $$('[data-feature-panel]', root);
  const captions = [[["订单台账", "归集订单与运单，按履约节点持续更新。"], ["物流跟踪", "按你的异常规则，把需要跟进的订单提出来。"], ["异常跟进", "带上异常原因和建议动作，交给负责人处理。"]], [["询盘整理", "看清客户在问什么，再决定先跟进谁。"], ["客服回复", "用产品知识准备草稿，把发送决定交给人。"], ["客户归档", "保留时间、渠道、摘要和原文，接手也有上下文。"]], [["创意研究", "带着产品和市场找参考，留下可用的拍摄思路。"], ["脚本策划", "把参考转成你自己的拍摄计划。"], ["内容复盘", "让本周的数据，成为下周创作的依据。"]], [["单证整理", "把散落的文件，放回对应的订单。"], ["归档检查", "先核对是否齐全，再交给财务。"], ["月度复盘", "把分散的业务记录，连成一份月度报告。"]], [["竞品监控", "用变化记录代替一次次重复打开网页。"], ["用户调研", "把散落的讨论，整理成可以回查的主题。"], ["需求挖掘", "让每条建议，都能回到用户的具体反馈。"]], [["关键词整理", "同一市场、同一来源，才方便持续比较。"], ["趋势观察", "把相对热度和搜索量分别看清。"], ["投放建议", "把重复查数，变成一份可讨论的行动清单。"]]];
  const selectedSteps = panels.map(() => 0);
  let active = 0;
  const list = $('.feature-tabs', root);
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', 'AI 员工具体功能');
  root.classList.add('is-enhanced');

  function showStep(group, index, motion = true) {
    const panel = panels[group];
    selectedSteps[group] = index;
    const scenes = $$('[data-feature-scene]', panel);
    $$('[data-feature-step]', panel).forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
      button.classList.toggle('is-active', i === index);
    });
    scenes.forEach((scene, i) => { scene.hidden = i !== index; });
    $('[data-feature-count]', panel).textContent = `0${index + 1} / 03`;
    $('[data-feature-caption]', panel).textContent = captions[group][index][0];
    $('[data-feature-detail]', panel).textContent = captions[group][index][1];
    if (motion) {
      enter(scenes[index], 0, 10);
      $$('.fd-bar', scenes[index]).forEach((bar, i) => animate(bar,
        [{ transform: 'scaleY(.18)' }, { transform: 'scaleY(1)' }],
        { duration: 650, delay: i * 45 }));
      $$('.fd-timeline li', scenes[index]).forEach((row, i) => enter(row, i * 80, 7));
      enter($('.fd-note', scenes[index]), 100, 6);
    }
  }
  function showGroup(index, focus = false) {
    active = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(i === index));
      tab.setAttribute('aria-controls', panels[i].id);
      tab.tabIndex = i === index ? 0 : -1;
    });
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabs[i].id);
    });
    if (focus) tabs[index].focus({ preventScroll: true });
    showStep(index, selectedSteps[index], false);
    enter($('.feature-copy', panels[index]), 0, 8);
    enter($('.feature-demo', panels[index]), 50, 14);
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', event => { event.preventDefault(); showGroup(i); });
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (active + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (active - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); showGroup(next, true); }
    });
  });
  panels.forEach((panel, group) => {
    $$('[data-feature-step]', panel).forEach((step, i) => step.addEventListener('click', () => showStep(group, i)));
    $('[data-feature-prev]', panel).addEventListener('click', () => showStep(group, (selectedSteps[group] + 2) % 3));
    $('[data-feature-next]', panel).addEventListener('click', () => showStep(group, (selectedSteps[group] + 1) % 3));
  });
  const hashGroup = panels.findIndex(panel => `#${panel.id}` === location.hash);
  showGroup(hashGroup < 0 ? 0 : hashGroup);
  addEventListener('hashchange', () => {
    const target = panels.findIndex(panel => `#${panel.id}` === location.hash);
    if (target >= 0 && target !== active) showGroup(target);
  });
}

function jobBuilder() {
  const root = $('[data-job-builder]');
  if (!root) return;
  const presets = $$('[data-job-preset]', root);
  const sources = $$('[data-job-source]', root);
  const wires = $$('.job-builder__wires path', root);
  const card = $('.job-builder__agent', root);
  const canvas = $('.job-builder__canvas', root);
  const roles = [
    { name: '采购 AI 助理', task: '比较供应商报价，整理差异与建议', sources: ['邮件', '报价表', '聊天记录'] },
    { name: '招聘 AI 助理', task: '整理候选人资料，准备面试问题', sources: ['招聘邮件', '候选人表', '面试记录'] },
    { name: '内容运营 AI', task: '归纳用户反馈，准备下一期内容草稿', sources: ['订阅邮件', '选题表', '用户反馈'] },
    { name: '你的专属 AI 员工', task: '连接常用资料，按你的工作方式执行', sources: ['你的知识', '常用工具', '工作规则'] },
  ];
  let current = 0, visible = false, userSelected = false;
  let interacting = false, timer = 0, pointerFrame = 0;

  function connected() {
    const enabled = sources.filter(source => source.getAttribute('aria-pressed') === 'true');
    $('[data-job-count]', root).textContent = enabled.length ? `${enabled.length} 个数据源已连接` : '选择上方数据源，连接你的工作';
    sources.forEach((source, index) => wires[index]?.classList.toggle('is-disconnected', source.getAttribute('aria-pressed') !== 'true'));
    wires[3]?.classList.toggle('is-disconnected', !enabled.length);
  }
  function select(index, manual = false) {
    current = index;
    if (manual) userSelected = true;
    const role = roles[index];
    presets.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    $('[data-job-name]', root).textContent = role.name;
    $('[data-job-task]', root).textContent = role.task;
    sources.forEach((source, i) => {
      $('[data-source-name]', source).textContent = role.sources[i];
      source.setAttribute('aria-pressed', 'true');
    });
    connected();
    animate(card, [{ opacity: .45, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], { duration: 440 });
    sources.forEach((source, i) => enter(source, i * 65, 5));
    sync();
  }
  function sync() {
    clearTimeout(timer);
    const running = visible && !document.hidden && !reduced.matches;
    root.classList.toggle('is-running', running);
    if (running && !userSelected && !interacting) timer = setTimeout(() => select((current + 1) % roles.length), 6500);
  }
  presets.forEach((button, index) => button.addEventListener('click', () => select(index, true)));
  sources.forEach(source => source.addEventListener('click', () => {
    userSelected = true;
    source.setAttribute('aria-pressed', String(source.getAttribute('aria-pressed') !== 'true'));
    connected(); sync();
  }));
  root.addEventListener('pointerenter', () => { interacting = true; sync(); });
  root.addEventListener('pointerleave', () => { interacting = root.contains(document.activeElement); sync(); });
  root.addEventListener('focusin', () => { interacting = true; sync(); });
  root.addEventListener('focusout', event => { interacting = root.matches(':hover') || root.contains(event.relatedTarget); sync(); });
  canvas.addEventListener('pointermove', event => {
    if (reduced.matches || event.pointerType !== 'mouse') return;
    cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.style.setProperty('--glow-x', `${(event.clientX - rect.left) / rect.width * 100}%`);
      canvas.style.setProperty('--glow-y', `${(event.clientY - rect.top) / rect.height * 100}%`);
    });
  });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .15 });
    observer.observe(canvas);
  } else { visible = true; }
  onceVisible([root], () => {
    enter($('.job-builder__intro', root), 0, 24);
    enter(canvas, 100, 28);
    sources.forEach((source, i) => enter(source, 230 + i * 80, 10));
    enter(card, 430, 16);
  });
  sync();
}

function revealSections() {
  const groups = [];
  $$('.section').forEach(section => {
    const wrap = section.querySelector(':scope > .wrap');
    if (!wrap) return;
    // A grid's heading and lead enter separately; each existing card remains in its own place.
    $$(':scope > .grid:first-child > :is(h2,p,.stack-4,.stack-6), :scope > .section-head, :scope > .group > .section-head', wrap).forEach((el, index) => {
      el.dataset.zDelay = String(Math.min(index, 2) * 90); groups.push(el);
    });
    $$(':scope > .grid > .card, :scope > .group > .grid > .card', wrap).forEach((el, index) => {
      el.dataset.zDelay = String((index % 3) * 85); groups.push(el);
    });
    $$(':scope > .grid > .frame, :scope > .frame', wrap).forEach(el => groups.push(el));
  });
  onceVisible(groups, el => enter(el, Number(el.dataset.zDelay) || 0));
  onceVisible([$('#desk .app')], el => {
    enter(el, 130, 28);
    $$('.ui-doc__page > div', el).forEach((line, index) => enter(line, 280 + index * 70, 8));
    enter($('.ui-doc__note', el), 680, 10);
  });
  onceVisible($$('[data-hardware-reveal]'), el => {
    enter(el, 0, 26);
    $$('.hardware-flow__number', el).forEach((step, index) => enter(step, 140 + index * 120, 8));
  });
  onceVisible($$('[data-pain-reveal]'), el => enter(el, 0, 18));
}

function playExistingDemos() {
  // One demonstration on entry, then hold the final picture. Hover/focus can replay it.
  // Avoid the permission switches and pending task queue: their written state must stay clear.
  const selector = '[data-ui="search"], [data-ui="chat"], [data-ui="notify"], [data-ui="checklist"], [data-ui="stat"]';
  const roots = $$(selector).filter(el => !el.closest('#process'));
  onceVisible(roots, el => after(() => ui.restart(el), 320), { threshold: .35 });
  onceVisible([$('#desk .ui-doc')], el => after(() => ui.restart(el), 850), { threshold: .3 });

  // The original diagram is drawn in stages, using its existing nodes and paths.
  onceVisible($$('.dg'), diagram => {
    $$('.dg-line', diagram).forEach((line, index) => {
      if (typeof line.getTotalLength !== 'function') return;
      const length = line.getTotalLength();
      if (!Number.isFinite(length) || !length) return;
      animate(line, [{ strokeDasharray: `${length} ${length}`, strokeDashoffset: length, opacity: .25 },
        { strokeDasharray: `${length} ${length}`, strokeDashoffset: 0, opacity: 1 }],
        { duration: 1000, delay: 140 + index * 70, fill: 'backwards' });
    });
    $$('.dg-nodes > *', diagram).forEach((node, index) => enter(node, index * 85, 8));
  }, { threshold: .3 });

  const stages = $$('#process .rail > li');
  onceVisible([$('#process .rail')], rail => {
    stages.forEach((stage, index) => {
      enter(stage, index * 100, 16);
      after(() => {
        stages.forEach(el => el.classList.remove('z-step-active'));
        stage.classList.add('z-step-active');
        ui.restart(stage);
      }, 400 + index * 650);
    });
    after(() => stages.forEach(el => el.classList.remove('z-step-active')), 400 + stages.length * 650);
  }, { threshold: .2 });
}

function countROI() {
  const form = $('[data-roi]');
  if (!form) return;
  const fields = ['hours', 'month', 'year'].map(name => $(`[data-res="${name}"]`, form));
  const parse = el => Number(el.textContent.replace(/[^\d.]/g, '')) || 0;
  const units = fields.map(el => el.textContent.includes('小时') ? ' 小时' : ' 元');
  let shown = fields.map(parse), raf = 0;
  const panel = $('.roi__out', form);
  function transition(fromZero = false) {
    cancelAnimationFrame(raf);
    const target = fields.map(parse);
    if (reduced.matches) { shown = target; panel.removeAttribute('aria-busy'); return; }
    const from = fromZero ? [0, 0, 0] : shown.slice();
    const start = performance.now(), duration = fromZero ? 850 : 330;
    panel.setAttribute('aria-busy', 'true');
    function frame(now) {
      const t = Math.min(1, (now - start) / duration), k = 1 - Math.pow(1 - t, 3);
      shown = target.map((value, index) => from[index] + (value - from[index]) * k);
      fields.forEach((el, index) => { el.textContent = Math.round(shown[index]).toLocaleString('zh-CN') + units[index]; });
      if (t < 1 && !reduced.matches) raf = requestAnimationFrame(frame);
      else { shown = target; fields.forEach((el, index) => { el.textContent = Math.round(target[index]).toLocaleString('zh-CN') + units[index]; }); panel.removeAttribute('aria-busy'); }
    }
    raf = requestAnimationFrame(frame);
  }
  onceVisible([panel], () => transition(true), { threshold: .3 });
  // The original calculator listener runs first and supplies the exact target results.
  form.addEventListener('input', () => transition());
  reduced.addEventListener('change', () => { if (reduced.matches) { cancelAnimationFrame(raf); form.dispatchEvent(new Event('input')); } });
}

function previews() {
  let dialog, opener, previousOverflow;
  const previews = [[$('#desk .app'), 'AI 员工的工作台'], [$('#twin .frame--hero'), '数字分身协作']];
  function close() { if (dialog?.open) dialog.close(); }
  function open(host, title) {
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.className = 'z-preview-dialog';
      dialog.setAttribute('aria-labelledby', 'z-preview-title');
      const bar = document.createElement('div'); bar.className = 'z-preview-dialog__bar';
      const heading = document.createElement('p'); heading.id = 'z-preview-title'; heading.className = 'z-preview-dialog__title';
      const button = document.createElement('button'); button.type = 'button'; button.className = 'z-preview-dialog__close'; button.setAttribute('aria-label', '关闭放大预览');
      button.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg>';
      button.addEventListener('click', close); bar.append(heading, button);
      const content = document.createElement('div'); content.className = 'z-preview-dialog__content';
      dialog.append(bar, content); document.body.append(dialog);
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
      });
      dialog.addEventListener('close', () => {
        document.body.style.overflow = previousOverflow;
        $$('.z-preview-dialog__content', dialog)[0].replaceChildren();
        opener?.focus({ preventScroll: true });
      });
    }
    opener = host;
    $$('[data-ui]', host).forEach(el => el.__ui?.hold?.());
    const clone = host.cloneNode(true);
    clone.removeAttribute('role'); clone.removeAttribute('tabindex'); clone.removeAttribute('aria-label'); clone.removeAttribute('title');
    clone.classList.remove('z-preview');
    // Copy each original canvas instead of replacing any image or background.
    const originalCanvases = $$('canvas', host);
    $$('canvas', clone).forEach((canvas, index) => {
      try { canvas.getContext('2d')?.drawImage(originalCanvases[index], 0, 0); } catch { /* CSS ground remains visible. */ }
    });
    $$('[id]', clone).forEach(el => {
      const oldId = el.id, newId = `z-preview-${oldId}`;
      el.id = newId;
      $$('*', clone).forEach(child => {
        for (const attribute of ['fill', 'stroke', 'filter', 'mask', 'clip-path', 'href', 'xlink:href']) {
          const value = child.getAttribute(attribute);
          if (value?.includes(`#${oldId}`)) child.setAttribute(attribute, value.replaceAll(`#${oldId}`, `#${newId}`));
        }
      });
    });
    $$('button, a, input, [tabindex]', clone).forEach(el => { el.tabIndex = -1; });
    $('.z-preview-dialog__title', dialog).textContent = title;
    $('.z-preview-dialog__content', dialog).replaceChildren(clone);
    previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog.showModal();
    animate(dialog, [{ opacity: 0, translate: '0 14px', scale: '.985' }, { opacity: 1, translate: '0 0', scale: '1' }], { duration: 320 });
  }
  previews.forEach(([host, title]) => {
    if (!host) return;
    host.classList.add('z-preview'); host.tabIndex = 0; host.setAttribute('role', 'button');
    host.setAttribute('aria-haspopup', 'dialog'); host.setAttribute('aria-label', `${title}，点击放大查看`); host.title = '点击放大查看';
    host.addEventListener('click', event => { if (!event.target.closest('a,button,input')) open(host, title); });
    host.addEventListener('keydown', event => {
      if (event.target === host && ['Enter', ' '].includes(event.key)) { event.preventDefault(); open(host, title); }
    });
  });
}

videoHero();
featureShowcase();
jobBuilder();
previews();
countROI();
await ready();
if (!reduced.matches) {
  revealSections();
  playExistingDemos();
}
reduced.addEventListener('change', () => {
  if (!reduced.matches) return;
  animations.forEach(animation => animation.cancel());
  later.forEach(clearTimeout); later.clear(); observers.forEach(observer => observer.disconnect());
  $$('.z-step-active').forEach(el => el.classList.remove('z-step-active'));
});
