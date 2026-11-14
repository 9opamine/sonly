/* Стекло как у Apple. Оптику — преломление по краю и лёгкую радужную кромку — даёт готовая библиотека
   js/vendor/liquid-glass.js (Deepika Rao, MIT). Здесь только подключение к прототипу:
   - стекло встаёт на каждый элемент с классом .lg, сила — по data-lg (btn, pill, bar, lens);
   - одинаковые по размеру элементы делят один фильтр: карта преломления считается один раз, а не при каждой
     перерисовке экрана — поэтому ничего не дёргается;
   - матовая часть и кромка — в css/glass.css, они видны сразу, ещё до подключения фильтра. */
(() => {
  'use strict';
  const make = window.liquidGlass;
  /* Сила преломления — около «тонкого» пресета библиотеки. chroma: 0 — без цветной каймы: на тёмном фоне она давала
     красные и зелёные разводы. Насыщенность почти не трогаем, чтобы цветные значки под стеклом не «горели». */
  const PRESET = {
    btn: { scale: -44, chroma: 0, border: 0.08, mapBlur: 7, blur: 1.5, saturate: 1.1 },
    pill: { scale: -50, chroma: 0, border: 0.07, mapBlur: 9, blur: 3, saturate: 1.1 },
    /* Под панелью едет содержимое экрана: размываем сильнее, иначе яркий значок у края растягивается в цветное пятно. */
    bar: { scale: -24, chroma: 0, border: 0.05, mapBlur: 8, blur: 10, saturate: 1.05 },
    lens: { scale: -64, chroma: 0, border: 0.14, mapBlur: 8, blur: 0, saturate: 1.05 },
  };
  const tpl = new Map(), seen = new WeakSet();
  /** Фильтр для элемента такого размера: делается один раз на скрытой заготовке и потом переиспользуется. */
  function filterFor(el) {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h || typeof make !== 'function') return '';
    const name = PRESET[el.dataset.lg] ? el.dataset.lg : 'btn', r = getComputedStyle(el).borderTopLeftRadius;
    const key = `${name}:${w}x${h}:${r}`;
    let t = tpl.get(key);
    if (!t) {
      const host = document.createElement('div');
      host.style.cssText = `position:fixed;left:-10000px;top:0;width:${w}px;height:${h}px;border-radius:${r};visibility:hidden;pointer-events:none`;
      host.setAttribute('aria-hidden', 'true');
      document.body.appendChild(host);
      make(host, PRESET[name]);
      t = host.style.backdropFilter;
      tpl.set(key, t);
      /* Заготовке фильтр больше не нужен: его забрали настоящие элементы. Скрытая копия с преломлением
         иначе так и висит на странице, а телефону лишний слой с фильтром ни к чему — особенно поверх камеры. */
      host.style.backdropFilter = host.style.webkitBackdropFilter = '';
      host.style.display = 'none';
    }
    return t;
  }
  function dress(el) {
    const f = filterFor(el);
    if (!f || el.style.backdropFilter === f) return;
    el.style.backdropFilter = f;
    el.style.webkitBackdropFilter = f;
  }
  /* Размер мог появиться позже (скрытая вкладка) или поменяться — тогда берём фильтр под новый размер. */
  const ro = new ResizeObserver((list) => list.forEach((e) => dress(e.target)));
  function scan() {
    document.querySelectorAll('.lg').forEach((el) => {
      /* Преломление нужно только там, где под стеклом есть картинка: панель вкладок и камера.
         На ровном фоне его не видно — там стекло рисует один CSS, без лишней нагрузки. */
      if (seen.has(el) || el.closest('.mi-real') || !el.closest('.cam,.ap-tabs')) return;
      seen.add(el);
      dress(el);
      ro.observe(el);
    });
  }
  let queued = 0;
  const soon = () => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; scan(); }); };
  new MutationObserver(soon).observe(document.body, { childList: true, subtree: true });

  /**
   * Панель вкладок как в iOS 26. Тап — подложка плавно переезжает на вкладку.
   * Если зажать и вести пальцем — над панелью появляется стеклянная капля, едет за пальцем и увеличивает то, что под ней;
   * отпустил — капля садится на ближайшую вкладку и растворяется в подложке.
   */
  function tabs(nav) {
    const bar = nav && nav.querySelector('.ap-tabs-pill'), ind = nav && nav.querySelector('.ap-tab-ind'), drop = nav && nav.querySelector('.ap-lens');
    if (!bar || !ind) return null;
    if (nav._tabs) return nav._tabs;
    const cells = () => [...bar.querySelectorAll('button')];
    const mid = (b) => b.offsetLeft + b.offsetWidth / 2;
    function put(b, instant) {
      if (!b) { ind.classList.add('off'); return; }
      if (instant) ind.classList.add('now');
      ind.classList.remove('off');
      ind.style.setProperty('--x', b.offsetLeft + 'px');
      ind.style.setProperty('--w', b.offsetWidth + 'px');
      if (instant) { void ind.offsetWidth; ind.classList.remove('now'); }
    }
    const sync = () => put(bar.querySelector('button.on'), true);
    const local = (e) => { const r = bar.getBoundingClientRect(), k = r.width / bar.offsetWidth || 1; return (e.clientX - r.left) / k; };
    /** Капля по центру точки x (в координатах панели). */
    const lensAt = (x) => { if (drop) drop.style.setProperty('--x', (bar.offsetLeft + x - drop.offsetWidth / 2).toFixed(1) + 'px'); };
    let drag = null;
    bar.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      drag = { id: e.pointerId, x0: e.clientX, moved: false };
      bar.classList.add('press');
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const c = cells(), x = Math.max(mid(c[0]), Math.min(mid(c[c.length - 1]), local(e)));
      if (!drag.moved && Math.abs(e.clientX - drag.x0) > 6) {
        drag.moved = true;
        try { bar.setPointerCapture(e.pointerId); } catch (_) { /* синтетический указатель */ }
        if (drop) { drop.classList.add('now'); lensAt(x); void drop.offsetWidth; drop.classList.remove('now'); drop.classList.add('on'); }
        nav.classList.add('drag');
      }
      if (drag.moved) lensAt(x);
    });
    const up = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const moved = drag.moved;
      drag = null;
      bar.classList.remove('press');
      if (!moved) return;
      const x = local(e), t = cells().reduce((a, b) => (Math.abs(mid(b) - x) < Math.abs(mid(a) - x) ? b : a));
      /* Подложка возникает под каплей и вместе с ней садится на вкладку. */
      ind.classList.add('now');
      ind.style.setProperty('--x', Math.max(0, x - ind.offsetWidth / 2) + 'px');
      void ind.offsetWidth;
      ind.classList.remove('now');
      nav.classList.remove('drag');
      lensAt(mid(t));
      put(t);
      if (drop) setTimeout(() => drop.classList.remove('on'), 260);
      t.click();
    };
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
    new ResizeObserver(sync).observe(bar);
    sync();
    nav._tabs = { put, sync };
    return nav._tabs;
  }

  Sonly.glass = { scan, tabs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
})();
