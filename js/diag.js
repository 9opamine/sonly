/* Диагностика для проверки на телефоне: журнал шагов камеры и ИИ, ошибки, потеря видеокарты, время кадра.
   Журнал пишется в память браузера и переживает падение вкладки: открыл ссылку снова — видно, на каком шаге оборвалось.
   Панель на экране — с ?debug=1. Без неё журнал тоже ведётся (тихо), чтобы было что показать после сбоя. */
(() => {
  'use strict';
  const KEY = 'sonly-diag', MAX = 120;
  const qs = new URLSearchParams(location.search);
  const on = qs.get('debug') === '1';
  const t0 = performance.now();
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const save = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* приватный режим — живём без журнала */ } };
  /* Прошлый запуск: если он не дошёл до «страница закрыта», значит, вкладка упала или зависла насмерть. */
  const prev = load();
  const crashed = prev.lines && prev.lines.length && !prev.closed;
  const run = { started: new Date().toISOString(), ua: navigator.userAgent, lines: [], closed: false, prev: crashed ? prev : null };
  let panel = null, list = null;
  function log(msg, kind = '') {
    const line = `${((performance.now() - t0) / 1000).toFixed(1)}с ${kind === 'ОШИБКА' ? 'ОШИБКА ' : ''}${msg}`;
    run.lines.push(line);
    if (run.lines.length > MAX) run.lines.splice(0, run.lines.length - MAX);
    save(run);
    if (list) { const li = document.createElement('div'); li.textContent = line; if (kind) li.className = 'd-' + kind.replace(/\W/g, ''); list.appendChild(li); list.scrollTop = list.scrollHeight; if (kind && panel) panel.classList.remove('min'); }
  }
  addEventListener('pagehide', () => { run.closed = true; save(run); });
  addEventListener('error', (e) => log(`${e.message || e.type} ${e.filename ? e.filename.split('/').pop() + ':' + e.lineno : ''}`, 'ОШИБКА'));
  addEventListener('unhandledrejection', (e) => log(String((e.reason && (e.reason.message || e.reason.code)) || e.reason), 'ОШИБКА'));
  /* Видеокарта отказала (iPhone так делает при нехватке памяти) — это главный подозреваемый в зависаниях. */
  document.addEventListener('webglcontextlost', () => log('видеокарта отключила WebGL', 'ОШИБКА'), true);
  document.addEventListener('visibilitychange', () => log(document.visibilityState === 'visible' ? 'страница снова на экране' : 'страница свёрнута'));
  /* Память, если браузер её показывает (Chrome), — раз в 3 секунды, пока идёт задание с камерой. */
  let memTimer = 0;
  const mem = () => (performance.memory ? `память JS ${Math.round(performance.memory.usedJSHeapSize / 1e6)} МБ` : '');

  function show() {
    if (!on || panel) return;
    const css = document.createElement('style');
    css.textContent = `.diag{position:fixed;left:8px;right:8px;top:calc(env(safe-area-inset-top,0px) + 108px);z-index:200;max-height:46vh;display:flex;flex-direction:column;border-radius:16px;background:rgba(10,10,12,.94);color:#E8E8EE;font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;box-shadow:0 10px 30px rgba(0,0,0,.5)}
      .diag header{display:flex;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.1);font:600 12px system-ui,sans-serif}
      .diag header b{flex:1}.diag button{font:600 12px system-ui,sans-serif;color:#0D0D0F;background:#FFC700;border-radius:10px;padding:6px 10px}
      .diag button.g{background:#2A2A30;color:#fff}.diag .l{overflow:auto;padding:8px 10px}.diag .d-ОШИБКА{color:#FF8A8A}.diag .d-прошлый{color:#FFD86A}
      .diag figure{display:inline-flex;flex-direction:column;gap:2px;margin:4px 6px 4px 0;font-size:10px;color:#9A9AA2}.diag figure img{width:72px;height:72px;border-radius:8px;object-fit:cover}
      .diag.min{left:auto;right:12px;top:calc(env(safe-area-inset-top,0px) + 60px);background:none;box-shadow:none}
      .diag.min .l,.diag.min header b,.diag.min .js-copy{display:none}.diag.min header{padding:0;border:0}.diag.min .js-min{background:rgba(42,42,48,.92)}`;
    document.head.appendChild(css);
    panel = document.createElement('div');
    /* Свёрнут по умолчанию — не закрывает кнопки; сам разворачивается при ошибке или если прошлый запуск оборвался. */
    panel.className = 'diag min';
    panel.innerHTML = '<header><b>Журнал проверки</b><button class="js-copy">Скопировать</button><button class="g js-min">Журнал</button></header><div class="l"></div>';
    list = panel.querySelector('.l');
    document.body.appendChild(panel);
    panel.querySelector('.js-min').onclick = () => panel.classList.toggle('min');
    panel.querySelector('.js-copy').onclick = () => {
      const text = [`sonly · ${run.ua}`, ...(run.prev ? ['— прошлый запуск (оборвался):', ...run.prev.lines, '— этот запуск:'] : []), ...run.lines].join('\n');
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => log('журнал скопирован'), () => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); log('журнал скопирован'); } catch (e) { log('скопировать не вышло — сделай снимок экрана'); } ta.remove(); });
    };
    /* Строки, записанные до появления панели, — сначала; потом — где оборвался прошлый запуск. */
    run.lines.forEach((l) => { const li = document.createElement('div'); li.textContent = l; list.appendChild(li); });
    if (run.prev) log(`прошлый запуск оборвался на шаге: «${run.prev.lines[run.prev.lines.length - 1]}»`, 'прошлый');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
  log(`открыто: ${innerWidth}×${innerHeight}, плотность ×${devicePixelRatio}, ${/iPhone|iPad|Macintosh.*Mobile/.test(navigator.userAgent) ? 'iOS' : /Android/.test(navigator.userAgent) ? 'Android' : 'компьютер'}`);

  window.Sonly = window.Sonly || {};
  Sonly.diag = {
    on, log,
    /** Что именно увидел ИИ: маленькая картинка вырезанного куска кадра — только на экране, в память не пишется. */
    pic(canvas, caption) {
      if (!list) return;
      try {
        const f = document.createElement('figure'), im = new Image();
        im.src = canvas.toDataURL('image/jpeg', 0.7);
        f.appendChild(im);
        if (caption) f.appendChild(document.createTextNode(caption));
        list.appendChild(f);
        list.scrollTop = list.scrollHeight;
      } catch (e) { /* холст недоступен — без картинки */ }
    },
    /** Запуск и остановка отметок памяти — пока идёт задание с камерой. */
    watch(yes) { clearInterval(memTimer); memTimer = yes && performance.memory ? setInterval(() => log(mem()), 3000) : 0; },
  };
})();
