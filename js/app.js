/* Оболочка просмотра: вкладки «Онбординг» и «Приложение», лента экранов для быстрого перехода. */
(() => {
  'use strict';
  const { $, $$, concepts, Flow } = Sonly;
  const IDS = ['m', 'app'];
  const app = $('#app');
  const qs = new URLSearchParams(location.search);

  // Шрифт иконок показываем только после загрузки, иначе на секунду видны их имена текстом.
  const ready = () => document.documentElement.classList.add('icons-ready');
  (document.fonts && document.fonts.load ? document.fonts.load('24px "Material Symbols Rounded"', 'alarm') : Promise.resolve()).then(ready, ready);
  setTimeout(ready, 2500);

  /** Заполняет ответы-примеры там, где человек ещё не отвечал: так любой экран можно открыть сразу. */
  const fill = (flow) => {
    const demo = flow.c.demo();
    Object.keys(demo).forEach((k) => { const v = flow.state[k]; if (v == null || v === '') flow.state[k] = demo[k]; });
  };

  /* Съёмка одного экрана для проверки: ?shot=m&s=welcome (&live=1 — с анимацией, &act=pay — нажать кнопку). */
  if (qs.get('shot')) {
    const c = concepts[qs.get('shot')];
    document.body.classList.add('shot');
    /* На телефоне (или ?full=1) живое задание занимает весь экран: без нарисованной рамки и чужой строки состояния. */
    if (qs.get('full') === '1' || (qs.get('live') === '1' && qs.get('full') !== '0' && matchMedia('(pointer: coarse)').matches)) {
      document.body.classList.add('full');
      /* Телефон лёг на бок: экраны рассчитаны на вертикальный — просим повернуть (кроме заданий с камерой, им так даже удобнее). */
      document.body.insertAdjacentHTML('beforeend', `<div class="turn" role="status"><i>${Sonly.ic('smartphone', 44, 1.8)}</i><b>Поверни телефон</b><small>sonly работает вертикально</small></div>`);
    }
    app.innerHTML = '<div class="phone-host"></div>';
    const state = c.demo();
    ['theme', 'data'].forEach((k) => { if (qs.get(k)) state[k] = qs.get(k); });
    const flow = new Flow($('.phone-host'), c, { still: qs.get('live') !== '1', screen: qs.get('s') || c.order[0], state });
    if (qs.get('sheet') && c.preview) c.preview(flow, qs.get('sheet'));
    if (qs.get('act')) { const b = flow.el.querySelector(`[data-act="${qs.get('act')}"]`); if (b) b.click(); }
    window.__flow = flow;
    return;
  }

  app.innerHTML = `
    <div class="bar">
      <div class="bar-row">
        <div class="brand">${Sonly.logo()}<small>прототип</small></div>
        <div class="seg" role="tablist">${IDS.map((id) => `<button role="tab" data-tab="${id}">${concepts[id].name}</button>`).join('')}</div>
        <button class="ghost-btn" id="restart">Сначала</button>
        <button class="fs-btn" id="fs-open">${Sonly.ic('maximize-2', 16, 2.4)}На весь экран</button>
      </div>
      <div class="strip" id="strip"></div>
    </div>
    ${IDS.map((id) => `<div class="stage" data-stage="${id}" hidden><div class="phone-box"><div class="phone-host"></div></div>
      <p class="note">${concepts[id].about}${concepts[id].shell ? '' : '<br>Оплата в прототипе не настоящая. Промокод для проверки: <b>SONLY</b>.'}</p>${concepts[id].shell ? '<div class="shell-row"></div>' : ''}</div>`).join('')}`;

  const strip = $('#strip');
  const flows = {};
  let tab = null;
  /* Будильник, собранный в онбординге: кнопка «Открыть sonly» переносит его в приложение. */
  let seed = null;
  const openApp = (st) => { seed = st; location.hash = 'app'; };
  /** Переключатели под телефоном (тема, данные) — только у тех разделов, где они есть. */
  function drawShell(flow) {
    const row = $(`[data-stage="${flow.c.id}"] .shell-row`);
    if (row) row.innerHTML = flow.c.shell.html(flow.state);
  }

  function drawStrip(flow) {
    if (tab !== flow.c.id) return;
    const c = flow.c;
    const btn = (id) => `<button data-jump="${id}"${flow.id === id ? ' aria-current="true"' : ''}>${c.titles[id] || id}</button>`;
    strip.innerHTML = c.order.map(btn).join('') + '<i></i>' + (c.extra || []).map(btn).join('');
    const cur = $('[aria-current="true"]', strip);
    if (cur) strip.scrollLeft = cur.offsetLeft - strip.offsetWidth / 2 + cur.offsetWidth / 2;
  }

  function fit() {
    const bar = $('.bar');
    const k = Math.max(0.74, Math.min(1, (innerHeight - bar.offsetHeight - 96) / 868));
    $$('.stage').forEach((s) => s.style.setProperty('--k', k.toFixed(3)));
  }

  function show(next) {
    if (Sonly.sound) Sonly.sound.stop();
    tab = next;
    $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    $$('[data-stage]').forEach((s) => { s.hidden = s.dataset.stage !== tab; });
    fit();
    if (!flows[tab]) flows[tab] = new Flow($(`[data-stage="${tab}"] .phone-host`), concepts[tab], { onChange: drawStrip, onOpenApp: openApp, onState: drawShell });
    if (tab === 'app' && seed) { concepts.app.adopt(flows.app, seed); seed = null; }
    drawShell(flows[tab]);
    drawStrip(flows[tab]);
  }

  const fromHash = () => { const h = location.hash.slice(1); return IDS.includes(h) ? h : IDS[0]; };
  $('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    if (location.hash.slice(1) === b.dataset.tab) show(b.dataset.tab); else location.hash = b.dataset.tab;
  });
  strip.addEventListener('click', (e) => {
    const b = e.target.closest('[data-jump]');
    if (!b || !flows[tab]) return;
    fill(flows[tab]);
    flows[tab].jump(b.dataset.jump);
  });
  $('#restart').addEventListener('click', () => { if (flows[tab]) { flows[tab].restart(); drawShell(flows[tab]); } });
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-shell]');
    if (!b || !flows[tab] || !flows[tab].c.shell) return;
    const [key, val] = b.dataset.shell.split(':');
    flows[tab].c.shell.set(flows[tab], key, val);
    drawShell(flows[tab]);
  });
  /* На телефоне — просмотр на весь экран: без рамки, панели прототипа и нарисованной строки состояния, как настоящее
     приложение. Выйти — кнопка «Выйти» сверху, жест «назад» или Esc. На Android ещё и браузер прячет свою строку. */
  document.body.insertAdjacentHTML('beforeend', `<button class="fs-exit" id="fs-exit" aria-label="Выйти из полноэкранного просмотра">${Sonly.ic('x', 15, 2.6)}Выйти</button>`);
  const fsOn = () => document.body.classList.contains('fs');
  function fsOpen() {
    if (fsOn()) return;
    document.body.classList.add('fs', 'full');
    history.pushState({ fs: 1 }, '');
    try { const r = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen({ navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } catch (e) { /* iPhone: только CSS */ }
    fit();
  }
  function fsClose(fromHistory) {
    if (!fsOn()) return;
    document.body.classList.remove('fs', 'full');
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { /* уже вышли */ }
    if (!fromHistory && history.state && history.state.fs) history.back();
    fit();
  }
  $('#fs-open').addEventListener('click', fsOpen);
  $('#fs-exit').addEventListener('click', () => fsClose(false));
  addEventListener('popstate', () => { if (fsOn() && !(history.state && history.state.fs)) fsClose(true); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') fsClose(false); });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && fsOn() && history.state && history.state.fs) fsClose(false); });
  addEventListener('hashchange', () => show(fromHash()));
  addEventListener('resize', fit);
  show(fromHash());
})();
