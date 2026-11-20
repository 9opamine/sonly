/* Общий движок прототипа sonly: состояние, навигация по экранам, виджеты (барабан времени, подпись, счётчики), цены. */
window.Sonly = (() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Иконки ─────────────────────────────────────────────── */

  /** Контурная иконка Lucide по имени вида "alarm-clock". */
  function ic(name, size = 22, sw = 1.9, cls = '') {
    const key = name.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
    const node = window.lucide && window.lucide.icons && window.lucide.icons[key];
    const kids = !node ? [] : node[0] === 'svg' ? node[2] : node;
    const body = kids.map(([t, a]) => `<${t} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
    return `<svg class="ic ${cls}"${node ? '' : ` data-miss="${name}"`} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }
  /** Залитая иконка Material Symbols по имени вида "fitness_center". */
  const ms = (name, cls = '') => `<span class="ms ${cls}" aria-hidden="true">${name}</span>`;
  /* Эмодзи — только картинками Apple (img/emoji/<кодовые точки>.png), чтобы на любом телефоне и компьютере они выглядели одинаково. */
  /** Мягкий отклик «введи сюда»: поле получает фокус, его рамка коротко вздрагивает. */
  function nudge(input) {
    if (!input) return;
    const box = input.parentElement;
    input.focus({ preventScroll: true });
    box.classList.remove('nudge');
    void box.offsetWidth;
    box.classList.add('nudge');
    setTimeout(() => box.classList.remove('nudge'), 450);
  }
  const emoCode = (ch) => [...ch].map((c) => c.codePointAt(0).toString(16)).join('-');
  const emoSrc = (ch) => `img/emoji/${emoCode(ch)}.png`;
  const emo = (ch, cls = '', alt = '') => `<img class="emj${cls ? ' ' + cls : ''}" src="${emoSrc(ch)}" alt="${alt}" draggable="false">`;

  const SB_ICONS =
    '<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" width="3" height="12" rx="1"/></svg>' +
    '<svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1.2 4.4a10 10 0 0 1 13.6 0M3.6 7a6.4 6.4 0 0 1 8.8 0"/><circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none"/></svg>' +
    '<svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="23" height="12" rx="3.8" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2z" fill="currentColor" opacity=".45"/></svg>';

  /* ── Данные продукта ────────────────────────────────────── */

  const CATS = [
    { id: 'camera', name: 'Камера' },
    { id: 'move', name: 'Движение' },
    { id: 'mind', name: 'Голова' },
    { id: 'voice', name: 'Голос и ритм' },
  ];
  /* Задания. desc — одна короткая строка; lu — иконка Lucide, ms — Material Symbols (запасные, свои значки — в icons.js). */
  const TASKS = [
    { id: 'hunt', cat: 'camera', name: 'Найди предмет', desc: 'Найди и сними предмет', lu: 'scan-search', ms: 'center_focus_strong' },
    { id: 'bed', cat: 'camera', name: 'Заправь кровать', desc: 'Сними заправленную кровать', lu: 'bed-double', ms: 'bed' },
    { id: 'sky', cat: 'camera', name: 'Утреннее небо', desc: 'Сними небо за окном', lu: 'cloud-sun', ms: 'partly_cloudy_day' },
    { id: 'pills', cat: 'camera', name: 'Витамины', desc: 'Сними свои витамины', lu: 'pill', ms: 'pill' },
    { id: 'qr', cat: 'camera', name: 'Штрихкод', desc: 'Отсканируй штрихкод вдали от кровати', lu: 'qr-code', ms: 'qr_code_scanner' },
    { id: 'squat', cat: 'move', name: 'Приседания', desc: 'Камера считает повторы', lu: 'activity', ms: 'sports_gymnastics' },
    { id: 'pushup', cat: 'move', name: 'Отжимания', desc: 'Камера считает повторы', lu: 'dumbbell', ms: 'fitness_center' },
    { id: 'jump', cat: 'move', name: 'Прыжки', desc: 'Камера считает прыжки', lu: 'chevrons-up', ms: 'keyboard_double_arrow_up' },
    { id: 'steps', cat: 'move', name: 'Шаги', desc: 'Пройди нужное число шагов', lu: 'footprints', ms: 'directions_walk' },
    { id: 'shake', cat: 'move', name: 'Встряска', desc: 'Тряси, пока шкала не заполнится', lu: 'vibrate', ms: 'vibration' },
    { id: 'math', cat: 'mind', name: 'Примеры', desc: 'Реши несколько примеров', lu: 'calculator', ms: 'calculate' },
    { id: 'quiz', cat: 'mind', name: 'Викторина', desc: 'Ответь на пару вопросов', lu: 'circle-help', ms: 'quiz' },
    { id: 'memory', cat: 'mind', name: 'Память', desc: 'Запомни и повтори узор', lu: 'grid-3x3', ms: 'grid_view' },
    { id: 'pairs', cat: 'mind', name: 'Пары', desc: 'Найди одинаковые карточки', lu: 'copy', ms: 'style' },
    { id: 'phrase', cat: 'mind', name: 'Набери фразу', desc: 'Перепечатай без ошибок', lu: 'keyboard', ms: 'keyboard' },
    { id: 'tongue', cat: 'voice', name: 'Скороговорка', desc: 'Произнеси вслух', lu: 'mic', ms: 'mic' },
    { id: 'rhythm', cat: 'voice', name: 'Угадай мелодию', desc: 'Узнай мелодию по биту', lu: 'music', ms: 'music_note' },
  ];
  const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  /* intro — первый год по промокоду или предложению (−25 %); trial — пробные дни, их даёт только промокод. */
  const PRICE = { year: 39.99, month: 6.99, intro: 29.99, trial: 3 };
  /* Промокоды авторов для проверки в прототипе; свои коды партнёров — до 7 знаков, выданные по умолчанию — SUN и 4 знака. */
  const PROMO_CODES = ['SONLY', 'RANO'];
  const isPromo = (v) => PROMO_CODES.includes(v) || /^SUN-?[A-Z0-9]{4}$/.test(v);
  /* Подпись-пример для экранов, открытых без прохождения шага с подписью. */
  const SIGN_DEMO = 'M52 92 C60 52 82 36 92 60 S78 112 104 84 S132 40 144 68 S132 108 158 84 S190 50 200 76 S216 100 246 70 M150 118 C196 108 244 104 288 96';

  const eur = (n) => n.toFixed(2).replace('.', ',') + ' €';
  const tStr = (s) => pad(s.time.h) + ':' + pad(s.time.m);
  const taskOf = (s) => TASKS.find((t) => t.id === s.task) || TASKS[0];
  const today = () => new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.$/, '');
  function daysText(days) {
    const k = [...days].sort().join('');
    if (k === '0123456') return 'каждый день';
    if (k === '01234') return 'по будням';
    if (k === '56') return 'по выходным';
    return days.length ? [...days].sort().map((d) => DAYS[d]).join(', ') : 'дни не выбраны';
  }
  /** Что и сколько человек заплатит при его нынешнем выборе. */
  function offer(s) {
    const year = s.discount ? PRICE.intro : PRICE.year;
    const twelve = PRICE.month * 12;
    return {
      year, yearStr: eur(year), fullStr: eur(PRICE.year), monthStr: eur(PRICE.month), perMonth: eur(year / 12),
      save: eur(twelve - year), pct: Math.round((1 - year / twelve) * 100), cents: Math.round((year / 365) * 100),
      pay: s.plan === 'month' ? eur(PRICE.month) : eur(year),
      trial: s.discount === 'code' ? PRICE.trial : 0,
      renew: s.plan === 'month' ? `${eur(PRICE.month)} каждый месяц` : `${eur(PRICE.year)} раз в год`,
    };
  }
  const base = () => ({ time: { h: 7, m: 30 }, days: [0, 1, 2, 3, 4], task: null, sound: null, plan: 'year', discount: null, paid: null, sign: '', name: '' });

  /* ── Виджеты ────────────────────────────────────────────── */

  /**
   * Барабан «часы : минуты», как в «Часах» Apple: строки уходят по дуге и бледнеют, выбранная стоит на серой полосе.
   * Крутится колесом, пальцем и мышью. Возвращает { set(h, m) } — докрутить до нужного времени из кода.
   */
  function wheel(host, { h, m, onChange }) {
    const IH = 34, STEP = (21 * Math.PI) / 180, R = IH / STEP;
    const col = (key, n) => `<div class="wheel-col" data-col="${key}">${range(n).map((i) => `<div class="wheel-i"><b>${pad(i)}</b></div>`).join('')}</div>`;
    host.innerHTML = `<div class="wheel"><div class="wheel-band"></div>${col('h', 24)}${col('m', 60)}</div>`;
    const val = { h, m };
    const cols = {};
    $$('.wheel-col', host).forEach((el) => {
      const key = el.dataset.col;
      const items = [...el.children].map((it) => it.firstElementChild);
      cols[key] = el;
      /* Каждая строка стоит на цилиндре: чем дальше от середины, тем сильнее сжата и бледнее. */
      const paint = () => {
        const pos = el.scrollTop / IH;
        const idx = Math.max(0, Math.min(items.length - 1, Math.round(pos)));
        for (let i = Math.max(0, idx - 6); i <= Math.min(items.length - 1, idx + 6); i++) {
          const d = i - pos, a = d * STEP, it = items[i];
          if (Math.abs(a) >= Math.PI / 2) { it.style.opacity = 0; continue; }
          const cos = Math.cos(a);
          it.style.transform = `translateY(${(R * Math.sin(a) - d * IH).toFixed(2)}px) scale(${(1 - 0.03 * Math.abs(d)).toFixed(3)},${cos.toFixed(3)})`;
          it.style.opacity = (0.58 * Math.pow(cos, 1.3) + 0.42 * Math.max(0, 1 - 2 * Math.abs(d))).toFixed(3);
        }
        return idx;
      };
      el.scrollTop = val[key] * IH;
      paint();
      el.addEventListener('scroll', () => {
        const idx = paint();
        if (val[key] !== idx) { val[key] = idx; onChange(val.h, val.m); }
      }, { passive: true });
      let drag = null;
      el.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch') return;
        drag = { y: e.clientY, top: el.scrollTop, k: el.getBoundingClientRect().height / el.offsetHeight, moved: false };
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dy = (e.clientY - drag.y) / drag.k;
        if (Math.abs(dy) > 3) { drag.moved = true; el.classList.add('dragging'); }
        if (drag.moved) el.scrollTop = drag.top - dy;
      });
      const end = (e) => {
        if (!drag) return;
        const moved = drag.moved;
        drag = null;
        el.classList.remove('dragging');
        if (moved) el.scrollTo({ top: Math.round(el.scrollTop / IH) * IH, behavior: 'smooth' });
        else {
          const hit = document.elementFromPoint(e.clientX, e.clientY);
          const row = hit && hit.closest('.wheel-i');
          if (row && el.contains(row)) el.scrollTo({ top: [...el.children].indexOf(row) * IH, behavior: 'smooth' });
        }
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    });
    return { set(nh, nm) { cols.h.scrollTo({ top: nh * IH, behavior: 'smooth' }); cols.m.scrollTo({ top: nm * IH, behavior: 'smooth' }); } };
  }

  /** Поле для подписи на SVG: линия остаётся чёткой при любом масштабе телефона. */
  function signPad(svg, { value, onChange }) {
    const path = $('path', svg);
    let d = value || '', cur = null, pts = [];
    const pt = (e) => {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
      return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
    };
    const render = () => path.setAttribute('d', d + (cur || ''));
    svg.addEventListener('pointerdown', (e) => {
      svg.setPointerCapture(e.pointerId);
      const [x, y] = pt(e);
      pts = [[x, y]];
      cur = `M${x} ${y}`;
      render();
      e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => {
      if (!cur) return;
      const [x, y] = pt(e), [px, py] = pts[pts.length - 1];
      if (Math.hypot(x - px, y - py) < 1.6) return;
      pts.push([x, y]);
      cur += ` Q${px} ${py} ${(px + x) / 2} ${(py + y) / 2}`;
      render();
    });
    const end = () => {
      if (!cur) return;
      d += (pts.length < 2 ? cur + ' l0.2 0.2' : cur) + ' ';
      cur = null;
      render();
      onChange(d);
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    render();
    return { clear() { d = ''; cur = null; render(); onChange(''); } };
  }

  /** Цифры, которые прокручиваются как на счётчике. Повторный вызов с новой строкой той же длины запускает прокрутку. */
  function odo(el, str) {
    const chars = String(str).split('');
    if (el._odo && el._odo.length === chars.length) {
      el._odo.forEach((col, i) => { if (col) col.style.transform = `translateY(${-chars[i] * 10}%)`; });
      return;
    }
    el.classList.add('odo');
    el.innerHTML = chars.map((ch) => (/\d/.test(ch)
      ? `<span class="odo-d"><span class="odo-c" style="transform:translateY(${-ch * 10}%)">${'0123456789'.split('').map((n) => `<i>${n}</i>`).join('')}</span></span>`
      : `<span class="odo-s">${ch}</span>`)).join('');
    el._odo = [...el.children].map((n) => (n.classList.contains('odo-d') ? n.firstElementChild : null));
  }

  /* ── Экран, телефон, поток ──────────────────────────────── */

  const concepts = {};
  const register = (c) => { concepts[c.id] = c; };

  class Flow {
    constructor(host, concept, opts = {}) {
      this.c = concept;
      this.opts = opts;
      this.still = !!opts.still || REDUCE;
      /* shot — неподвижный кадр для снимков экрана. При «Уменьшении движения» анимации короче, но задания идут по-настоящему. */
      this.shot = !!opts.still;
      this.state = Object.assign(base(), concept.defaults ? concept.defaults() : {}, opts.state || {});
      this.history = [];
      this.timers = new Set();
      this.frames = new Set();
      host.innerHTML = `<div class="phone ${concept.cls}${this.still ? ' instant' : ''}" data-concept="${concept.id}">
        <div class="statusbar"><span>9:41</span><i class="sb-island"></i><span class="sb-right">${SB_ICONS}</span></div>
        <div class="view"></div><div class="chrome">${concept.chrome ? concept.chrome(this) : ''}</div><div class="dock"></div>
        <div class="sheets"></div><div class="homebar"></div></div>`;
      this.el = host.firstElementChild;
      this.view = $('.view', this.el);
      this.dock = $('.dock', this.el);
      this.sheets = $('.sheets', this.el);
      this.el.addEventListener('click', (e) => this.click(e));
      if (concept.init) concept.init(this);
      this.go(opts.screen || concept.order[0], 0);
    }

    /* Отложенные шаги анимаций. В неподвижном режиме всё выполняется сразу, в порядке времени. */
    at(ms, fn) {
      if (this.still) { fn(); return; }
      const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms);
      this.timers.add(id);
    }
    /** Пауза, которая нужна для смысла (показ узора, ответ, проверка), а не для красоты: идёт всегда, кроме снимков экрана. */
    wait(ms, fn) {
      if (this.shot) { fn(); return; }
      const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms);
      this.timers.add(id);
    }
    seq(list) { [...list].sort((a, b) => a[0] - b[0]).forEach(([ms, fn]) => this.at(ms, fn)); }
    tween(dur, step, done, easing = (t) => 1 - Math.pow(1 - t, 3)) {
      if (this.still) { step(1); done && done(); return; }
      const t0 = performance.now();
      const tick = (now) => {
        this.frames.delete(id);
        const p = Math.min(1, (now - t0) / dur);
        step(easing(p));
        if (p < 1) { id = requestAnimationFrame(tick); this.frames.add(id); } else done && done();
      };
      let id = requestAnimationFrame(tick);
      this.frames.add(id);
    }
    /** Рисует линию SVG от начала к концу; marker едет по линии. */
    draw(path, { dur = 1400, marker, done } = {}) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.opacity = 1;
      this.tween(dur, (p) => {
        path.style.strokeDashoffset = len * (1 - p);
        if (marker) {
          const pt = path.getPointAtLength(len * p);
          marker.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
          marker.style.opacity = 1;
        }
      }, done, (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2));
    }
    stop() {
      this.timers.forEach(clearTimeout);
      this.frames.forEach(cancelAnimationFrame);
      this.timers.clear();
      this.frames.clear();
    }

    ctx(el) {
      const f = this;
      return {
        el, flow: f, s: f.state, still: f.still,
        q: (s) => el.querySelector(s), qa: (s) => [...el.querySelectorAll(s)],
        set(k, v) { f.state[k] = v; f.refresh(); },
        at: (ms, fn) => f.at(ms, fn), wait: (ms, fn) => f.wait(ms, fn), shot: f.shot, seq: (l) => f.seq(l), tween: (...a) => f.tween(...a), draw: (...a) => f.draw(...a),
        next: () => f.next(), sheet: (h, c) => f.sheet(h, c),
      };
    }

    go(id, dir = 1, keepSheet = false) {
      const scr = this.c.screens[id];
      if (!scr) return;
      /* Экран, который держит камеру или датчики, отпускает их здесь; при перерисовке того же экрана — по своему решению. */
      if (this.leave) { const f = this.leave; this.leave = null; f(id); }
      this.stop();
      if (!keepSheet) this.closeSheet(true);
      const prev = this.cur;
      this.id = id;
      this.scr = scr;
      const el = document.createElement('section');
      el.className = `screen s-${id}${scr.chrome === false ? '' : ' has-chrome'}${scr.dock ? ' has-dock' : ''}${scr.cls ? ' ' + scr.cls : ''}${dir === 0 ? ' no-in' : ''}`;
      const c = (this.cx = this.ctx(el));
      el.innerHTML = scr.render(c);
      const flowIds = this.c.order.filter((k) => this.c.screens[k].chrome !== false);
      const at = flowIds.indexOf(id), pos = this.c.order.indexOf(id);
      /* Экраны без полоски: до первого вопроса (приветствие) — пустая, иначе на первом вопросе она бы стягивалась
         с конца в начало; после последнего (загрузка, итог) — полная. */
      this.el.style.setProperty('--p', at >= 0 ? (at + 1) / (flowIds.length + 1) : pos >= 0 && pos < this.c.order.indexOf(flowIds[0]) ? 0 : 1);
      this.el.dataset.screen = id;
      this.el.dataset.chrome = scr.chrome === false ? 'off' : 'on';
      this.el.dataset.back = scr.noBack ? 'off' : 'on';
      this.el.dataset.sb = scr.sb || 'dark';
      this.view.appendChild(el);
      this.cur = el;
      this.refresh();
      if (prev) {
        if (this.still || dir === 0) prev.remove();
        else {
          prev.classList.add(dir > 0 ? 'out-fwd' : 'out-back');
          prev.inert = true;
          setTimeout(() => prev.remove(), 460);
        }
      }
      if (!this.still && dir !== 0) el.classList.add(dir > 0 ? 'in-fwd' : 'in-back');
      if (this.c.onScreen) this.c.onScreen(this, id, scr, dir);
      if (scr.mount) scr.mount(el, c);
      if (this.opts.onChange) this.opts.onChange(this);
    }
    rerender(keepSheet) { const top = $('.scroll', this.cur); const y = top ? top.scrollTop : 0; this.go(this.id, 0, keepSheet); const now = $('.scroll', this.cur); if (now) now.scrollTop = y; }
    next() {
      const custom = this.scr.next && this.scr.next(this.state);
      const id = custom || this.c.order[this.c.order.indexOf(this.id) + 1];
      if (!id) return;
      this.history.push(this.id);
      this.go(id, 1);
    }
    back() {
      const id = this.history.pop() || this.c.order[this.c.order.indexOf(this.id) - 1];
      if (id) this.go(id, -1);
    }
    jump(id) { this.history = this.c.order.slice(0, Math.max(0, this.c.order.indexOf(id))); this.go(id, 0); }
    restart() { this.state = Object.assign(base(), this.c.defaults ? this.c.defaults() : {}); this.history = []; if (this.c.init) this.c.init(this); this.go(this.c.order[0], 0); }

    /** Кнопки с data-need="ключ" неактивны, пока в состоянии нет ответа. */
    refresh() {
      $$('[data-need]', this.cur).forEach((b) => {
        const v = this.state[b.dataset.need];
        b.disabled = v == null || v === '' || (Array.isArray(v) && !v.length);
      });
    }

    sheet(html, cls = '') {
      this.sheets.innerHTML = `<div class="sheet-bg" data-act="sheet-close"></div><div class="sheet ${cls}">${html}</div>`;
      if (this.still) this.sheets.classList.add('open');
      else requestAnimationFrame(() => requestAnimationFrame(() => this.sheets.classList.add('open')));
    }
    closeSheet(now) {
      if (!this.sheets.classList.contains('open') && !this.sheets.firstChild) return;
      this.sheets.classList.remove('open');
      if (now || this.still) this.sheets.innerHTML = '';
      else setTimeout(() => { if (!this.sheets.classList.contains('open')) this.sheets.innerHTML = ''; }, 380);
    }

    click(e) {
      const t = e.target.closest('[data-act]');
      if (!t || !this.el.contains(t) || t.disabled) return;
      const i = t.dataset.act.indexOf(':');
      const act = i < 0 ? t.dataset.act : t.dataset.act.slice(0, i);
      const arg = i < 0 ? '' : t.dataset.act.slice(i + 1);
      const s = this.state;
      if (this.scr.on && this.scr.on(act, arg, t, this.cx) === true) return;
      if (this.c.on && this.c.on(this, act, arg, t) === true) return;
      switch (act) {
        case 'next': this.next(); break;
        case 'back': this.back(); break;
        case 'go': this.history.push(this.id); this.go(arg, 1); break;
        case 'pick':
          s[t.dataset.key] = t.dataset.val;
          $$(`[data-act="pick"][data-key="${t.dataset.key}"]`, this.cur).forEach((o) => o.classList.toggle('on', o === t));
          this.refresh();
          break;
        case 'day': {
          const d = +arg;
          s.days = s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d].sort();
          this.rerender();
          break;
        }
        case 'preset': s.days = { week: [0, 1, 2, 3, 4], all: [0, 1, 2, 3, 4, 5, 6], weekend: [5, 6] }[arg]; this.rerender(); break;
        case 'promo-apply': {
          const input = $('.js-code', this.cur);
          const code = (input ? input.value : '').trim().toUpperCase();
          s._code = code;
          if (!code) { nudge(input); break; }
          if (isPromo(code)) { s.discount = 'code'; s._promoErr = false; } else s._promoErr = true;
          this.rerender();
          break;
        }
        case 'plan': s.plan = arg; this.rerender(); break;
        case 'pay': this.sheet(paySheet(s), 'pay'); break;
        case 'pay-ok': s.paid = s.plan; this.closeSheet(true); this.history.push(this.id); this.go('done', 1); break;
        case 'offer-take':
          s.discount = s.discount || 'offer';
          s.plan = 'year';
          if (this.history[this.history.length - 1] === 'paywall') this.history.pop();
          this.go('paywall', -1);
          this.sheet(paySheet(s), 'pay');
          break;
        case 'restore':
          this.sheet(`<div class="msg"><b>Покупок не найдено</b><p>На этом Apple ID нет активной подписки sonly.</p><button class="msg-ok" data-act="sheet-close">Понятно</button></div>`, 'center');
          break;
        case 'legal':
          this.sheet(`<div class="msg"><b>${esc(arg)}</b><p>В прототипе документ не подключён. В приложении здесь откроется полный текст.</p><button class="msg-ok" data-act="sheet-close">Закрыть</button></div>`, 'center');
          break;
        case 'sheet-close': this.closeSheet(); break;
        case 'restart': this.restart(); break;
        default:
      }
    }
  }

  /** Лист подтверждения покупки. В прототипе деньги не списываются, и это написано прямо на листе. */
  function paySheet(s) {
    const o = offer(s);
    return `<div class="pay-grab"></div>
      <div class="pay-head"><i class="pay-app">${Sonly.mark()}</i><div><b>sonly — ${s.plan === 'month' ? 'на месяц' : 'на год'}</b><span>Подписка с автопродлением</span></div><button data-act="sheet-close" aria-label="Закрыть">${ic('x', 18, 2.4)}</button></div>
      ${o.trial ? `<div class="pay-row"><span>Сегодня</span><b>${eur(0)}</b></div><div class="pay-row"><span>Через ${o.trial} дня</span><span>${o.pay}</span></div>` : `<div class="pay-row"><span>Сегодня</span><b>${o.pay}</b></div>`}
      <div class="pay-row"><span>Потом</span><span>${o.renew}</span></div>
      <p class="pay-note">Это прототип: покупка не настоящая, деньги не списываются.</p>
      <button class="pay-ok" data-act="pay-ok">Подтвердить</button>`;
  }

  return { $, $$, esc, pad, range, ic, ms, emo, emoSrc, nudge, SB_ICONS, CATS, TASKS, DAYS, PRICE, isPromo, SIGN_DEMO, eur, tStr, taskOf, today, daysText, offer, wheel, signPad, odo, concepts, register, Flow, REDUCE };
})();
