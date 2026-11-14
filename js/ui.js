/* Приложение sonly: главная с будильниками, статистика со значками, настройки с виджетами и подарком другу.
   Редактор будильника, выбор, проба и настройка задания, случайное задание, звук, проверка подъёма.
   Вкладка «Утро» — в morning.js, звонок и задания — в ring.js. Устроено по присланному примеру интерфейса. */
(() => {
  'use strict';
  const { ic, esc, pad, TASKS, DAYS, SB_ICONS, wheel, daysText, taskOpts: TO } = Sonly;

  const cap = (s) => s.replace(/^./, (x) => x.toUpperCase());
  const pl = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; };
  const hm = (a) => pad(a.h) + ':' + pad(a.m);
  const fmtMin = (v) => pad(Math.floor(v / 60)) + ':' + pad(v % 60);
  /* Случайное задание: каждое утро sonly берёт одно из набора, который выбрал человек. */
  const RANDOM = { id: 'random', cat: 'mix', name: 'Случайное', desc: 'Каждое утро — новое задание из набора', ms: 'shuffle' };
  const taskOf = (a) => (a.task === 'random' ? RANDOM : TASKS.find((t) => t.id === a.task) || TASKS[0]);
  const poolOf = (a) => { const o = (a.opts || {}).random; return o && o.pool && o.pool.length ? o.pool : TASKS.map((t) => t.id); };
  const tic = (t, size = 20) => Sonly.ti(t.id, size);
  const chev = () => ic('chevron-right', 17, 2.4);
  const copy = (a) => ({ ...a, days: [...a.days], opts: JSON.parse(JSON.stringify(a.opts || {})) });
  const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const code4 = () => Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  /** Личный промокод автора: создаётся один раз, потом его можно сменить в «Партнёрам». */
  const refOf = (s) => s.ref || (s.ref = 'SUN' + code4());
  const WD = ['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье'];
  const CATS = [['all', 'Все', 'layout-grid'], ['camera', 'Камера', 'camera'], ['move', 'Движение', 'activity'], ['mind', 'Голова', 'brain'], ['voice', 'Голос', 'mic']];
  const SOUNDS = [['Спокойные', ['Рассвет', 'Капель', 'Птицы за окном']], ['Классика', ['Будильник', 'Колокол', 'Радио']], ['Громкие', ['Сирена', 'Гудок']]];
  const TABS = [['home', 'Главная', 'house'], ['morning', 'Утро', 'sunrise'], ['stats', 'Статистика', 'chart-no-axes-column'], ['settings', 'Настройки', 'settings']];
  const CHECKS = [[0, 'Выключена', ''], [3, 'Через 3 минуты', ''], [5, 'Через 5 минут', ''], [10, 'Через 10 минут', '']];
  /* Пламя серии: рисунок, а не значок из набора, чтобы у серии было своё лицо. */
  const FLAME = `<svg class="ap-flame" viewBox="0 0 64 80" aria-hidden="true"><path class="f1" d="M33 3c3 13 19 21 19 42a20 20 0 0 1-40 0c0-9 4-15 9-19 1 7 4 10 8 10 0-13-3-21 4-33z"/><path class="f2" d="M32 42c3 6 10 9 10 18a10 10 0 0 1-20 0c0-7 6-10 10-18z"/></svg>`;
  const HEX = 'M30 3.5 55.5 18v30L30 62.5 4.5 48V18z';

  /* ── Время до звонка ─────────────────────────────────────── */

  /** Ближайший звонок будильника или null. Учитывает дни недели, «один раз» и пропуск следующего звонка. */
  function nextOf(a, now) {
    if (!a.on) return null;
    let skip = a.skip;
    for (let k = 0; k <= 8; k++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k, a.h, a.m, 0);
      if (d <= now || (!a.once && !a.days.includes((d.getDay() + 6) % 7))) continue;
      if (skip) { skip = false; continue; }
      return d;
    }
    return null;
  }
  const nextRing = (s, now) => s.alarms.map((a) => ({ a, at: nextOf(a, now) })).filter((x) => x.at).sort((x, y) => x.at - y.at)[0];
  const until = (d, now) => {
    const min = Math.max(1, Math.round((d - now) / 60000)), h = Math.floor(min / 60), dd = Math.floor(h / 24);
    return dd ? `${dd}<u>д</u> ${h % 24}<u>ч</u>` : h ? `${h}<u>ч</u> ${min % 60}<u>мин</u>` : `${min}<u>мин</u>`;
  };
  const dayWord = (d, now) => { const k = Math.round((day0(d) - day0(now)) / 864e5); return k === 0 ? 'сегодня' : k === 1 ? 'завтра' : WD[(d.getDay() + 6) % 7]; };

  /* ── История подъёмов ────────────────────────────────────── */

  /** Пример истории за две недели: нужен, чтобы показать статистику заполненной. В новом аккаунте есть только настоящие подъёмы. */
  function history(s) {
    const log = (s.log || []).map((x) => ({ d: new Date(x.t), wake: x.wake, secs: x.secs, task: x.task }));
    if (s.data !== 'demo') return log;
    const a = s.alarms.find((x) => !x.once) || { h: 7, m: 30, days: [0, 1, 2, 3, 4] };
    const off = [3, -1, 5, 0, 2, 4, -2, 1, 6, 0, 2, -1, 3, 1, 2], secs = [52, 47, 44, 49, 41, 38, 43, 36, 40, 35, 37, 33, 36, 31, 34];
    const out = [], now = new Date();
    for (let k = 14; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - k);
      /* Сегодняшнее утро попадает в историю, только если время будильника уже прошло. */
      if (k === 0 && now.getHours() * 60 + now.getMinutes() < a.h * 60 + a.m + 10) continue;
      if (a.days.includes((d.getDay() + 6) % 7)) out.push({ d, wake: a.h * 60 + a.m + off[14 - k], secs: secs[14 - k] });
    }
    return out.filter((x) => !log.some((y) => y.d.getTime() === x.d.getTime())).concat(log).sort((x, y) => x.d - y.d);
  }
  /** Серия: сколько запланированных утр подряд закрыто подъёмом. Дни без будильника серию не прерывают, сегодняшнее утро ещё впереди. */
  function runs(s, h) {
    const done = new Set(h.map((x) => x.d.getTime())), now = new Date();
    const plan = (d) => s.alarms.some((a) => !a.once && a.days.includes((d.getDay() + 6) % 7));
    let run = 0, best = 0;
    for (let k = 120; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - k);
      if (done.has(d.getTime())) { run++; best = Math.max(best, run); } else if (k > 0 && plan(d)) run = 0;
    }
    return { cur: run, best };
  }
  /** Оценка стабильности по разбросу времени подъёма: до 30 минут — 70–100, до часа — 50–69, до полутора — 30–49, дальше — ниже. */
  function stats(s) {
    const h = history(s), w = h.map((x) => x.wake), r = runs(s, h);
    const spread = w.length ? Math.max(...w) - Math.min(...w) : 0;
    const score = w.length < 3 ? null : Math.round(spread <= 30 ? 100 - spread : spread <= 60 ? 70 - ((spread - 30) * 2) / 3 : spread <= 90 ? 50 - ((spread - 60) * 2) / 3 : Math.max(0, 30 - (spread - 90) / 3));
    return { h, streak: r.cur, best: r.best, score, spread };
  }
  const RANGES = [[70, 'Стабильно', 'разброс до 30 минут', '#1FA055'], [50, 'Ровно', 'от 30 минут до часа', '#FFC62B'], [30, 'Набирает ход', 'от часа до полутора', '#F08A24'], [0, 'Плавает', 'больше полутора часов', '#E5484D']];

  /* Значки за подъёмы. Серии считаются по лучшей серии, поэтому полученный значок не пропадает. */
  const BADGES = [
    ['first', 'Первое утро', 'Первый подъём с sonly', 'sunrise', (b) => b.total >= 1],
    ['s3', 'Три подряд', 'Серия из трёх утр', 'flame', (b) => b.best >= 3],
    ['s7', 'Неделя', 'Серия из семи утр', 'calendar-check', (b) => b.best >= 7],
    ['s14', 'Две недели', 'Серия из четырнадцати утр', 'trophy', (b) => b.best >= 14],
    ['n10', 'Десятка', 'Десять подъёмов всего', 'medal', (b) => b.total >= 10],
    ['fast', 'Молния', 'Задание быстрее 30 секунд', 'zap', (b) => b.fast],
    ['early', 'Ранняя пташка', 'Подъём до 6:00', 'bird', (b) => b.early],
    ['weekend', 'Без выходных', 'Подъём в субботу или воскресенье', 'coffee', (b) => b.weekend],
  ];
  function badges(s) {
    const st = stats(s), h = st.h;
    const b = { total: h.length, best: st.best, fast: h.some((x) => x.secs < 30), early: h.some((x) => x.wake < 360), weekend: h.some((x) => x.d.getDay() % 6 === 0) };
    return BADGES.map(([id, name, note, icon, test]) => ({ id, name, note, icon, on: test(b) }));
  }
  const hex = (b) => `<i class="bd-hex${b.on ? ' on' : ''}"><svg viewBox="0 0 60 66" aria-hidden="true"><path d="${HEX}"/></svg>${ic(b.on ? b.icon : 'lock', b.on ? 24 : 18, 2.2)}</i>`;

  function chart(list, metric) {
    const vals = list.map((x) => (metric === 'task' ? x.secs : x.wake));
    const lo = Math.min(...vals), hi = Math.max(...vals), gap = Math.max(2, (hi - lo) * 0.35), y0 = lo - gap, y1 = hi + gap;
    const W = 302, H = 156, L = 46, R = 10, T = 12, B = 28;
    const X = (i) => L + (list.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (list.length - 1));
    const Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const lab = (v) => (metric === 'task' ? `${Math.round(v)} с` : fmtMin(Math.round(v)));
    const pts = vals.map((v, i) => `${X(i).toFixed(1)} ${Y(v).toFixed(1)}`);
    return `<svg class="ap-chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${metric === 'task' ? 'Время на задание по дням' : 'Время подъёма по дням'}">
      <defs><linearGradient id="apArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD12E" stop-opacity=".42"/><stop offset="1" stop-color="#FFD12E" stop-opacity="0"/></linearGradient></defs>
      ${[hi, lo].map((v) => `<line class="g" x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="yl" x="${L - 9}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${lab(v)}</text>`).join('')}
      <path class="ar" d="M${pts.join(' L')} L${X(vals.length - 1).toFixed(1)} ${H - B} L${X(0).toFixed(1)} ${H - B} Z"/>
      <line class="avg" x1="${L}" x2="${W - R}" y1="${Y(avg).toFixed(1)}" y2="${Y(avg).toFixed(1)}"/>
      <path class="ln" d="M${pts.join(' L')}"/>
      ${vals.map((v, i) => `<circle class="pt${i === vals.length - 1 ? ' last' : ''}" cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${i === vals.length - 1 ? 5.5 : 3.5}"/>`).join('')}
      ${list.map((x, i) => (list.length <= 7 || i === 0 || i === list.length - 1 ? `<text class="xl" x="${X(i).toFixed(1)}" y="${H - 7}" text-anchor="${list.length <= 7 ? 'middle' : i ? 'end' : 'start'}">${list.length <= 7 ? DAYS[(x.d.getDay() + 6) % 7] : x.d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '')}</text>` : '')).join('')}
    </svg>`;
  }

  /* ── Части экранов ───────────────────────────────────────── */

  /* Панель вкладок — стекло как у Apple (css/glass.css, js/glass.js): стеклянная полоса с подложкой под выбранной вкладкой и круглая «+». */
  const tabBtns = (cur) => TABS.map(([id, name]) => `<button class="${cur === id ? 'on' : ''}" data-act="tab:${id}">${Sonly.ui(id, 24, true)}<span>${name}</span></button>`).join('');
  const tabbar = (cur) => `<nav class="ap-tabs"><div class="ap-tabs-pill lg" data-lg="bar"><i class="ap-tab-ind" aria-hidden="true"></i>${tabBtns(cur)}</div><i class="ap-lens lg" data-lg="lens" aria-hidden="true"></i>
    <button class="ap-plus lg" data-lg="bar" data-act="new" aria-label="Новый будильник">${ic('plus', 27, 2.3)}</button></nav>`;

  /** Неделя кружками: выполненные подъёмы, сегодняшний день и дни, на которые стоит будильник. */
  function weekCard(s, st, i) {
    const now = new Date(), t = (now.getDay() + 6) % 7;
    const plan = (d) => s.alarms.some((a) => a.on && !a.once && a.days.includes(d));
    const week = DAYS.map((d, k) => {
      const date = day0(new Date(now.getFullYear(), now.getMonth(), now.getDate() + k - t)).getTime();
      return { d, done: st.h.some((x) => x.d.getTime() === date), today: k === t, plan: plan(k), past: k < t };
    });
    return `<div class="ap-card ap-week" data-in style="--i:${i}"><div class="ap-card-h"><b>Эта неделя</b><span>${week.filter((w) => w.done).length} из ${week.filter((w) => w.plan).length}</span></div>
      <div class="ap-week-d">${week.map((w) => `<i class="${w.done ? 'done' : w.plan && !w.past ? 'plan' : 'off'}${w.today ? ' today' : ''}"><u>${w.done ? ic('check', 15, 3.2) : ''}</u>${w.d}</i>`).join('')}</div></div>`;
  }

  const alarmCard = (a, i) => {
    const t = taskOf(a);
    return `<article class="ap-alarm${a.on ? ' on' : ''}" data-act="edit:${a.id}" role="button" tabindex="0" data-in style="--i:${i + 5}">
      <div class="ap-alarm-main"><div><small>${a.once ? 'Один раз' : cap(daysText(a.days))}</small><b>${hm(a)}</b></div>
        <button class="ap-tg${a.on ? ' on' : ''}" data-act="toggle:${a.id}" role="switch" aria-checked="${a.on}" aria-label="Будильник ${hm(a)}"></button></div>
      <div class="ap-alarm-meta"><span class="ap-tchip cat-${t.cat}"><i>${tic(t, 15)}</i>${t.name}</span><em>${esc(a.name)}</em></div>
      ${a.on && !a.once ? `<button class="ap-skip${a.skip ? ' on' : ''}" data-act="skip:${a.id}">${ic(a.skip ? 'undo-2' : 'skip-forward', 15, 2.3)}<span>${a.skip ? 'Следующий звонок пропущен' : 'Пропустить следующий звонок'}</span>${a.skip ? '<b>Вернуть</b>' : ''}</button>` : ''}
    </article>`;
  };

  /** Строка списка: значок в плитке (color — цвет плитки), подпись, значение справа. */
  const row = (icon, label, value, act, color) => `<button class="ap-row" data-act="${act}"><i class="ap-row-i${color ? ' c' : ''}"${color ? ` style="--c:${color}"` : ''}>${icon}</i><span>${label}</span>${value ? `<em>${value}</em>` : ''}${chev()}</button>`;
  const seg = (key, cur, opts) => `<div class="ap-seg sm">${opts.map(([v, name]) => `<button class="${cur === v ? 'on' : ''}" data-act="${key}:${v}">${name}</button>`).join('')}</div>`;

  function homeHtml(s) {
    const now = new Date(), st = stats(s), ring = nextRing(s, now), rt = ring && taskOf(ring.a);
    return `<div class="ap-scroll scroll">
      <header class="ap-top" data-in><div class="ap-brand">${Sonly.logo()}</div><button class="ap-chip lg" data-act="tab:stats" aria-label="Серия подъёмов">${ic('flame', 16, 2.3)}${st.streak}</button></header>
      ${ring ? `<section class="ap-hero" data-in style="--i:1"><i class="ap-sun"></i><i class="ap-rise">${Sonly.mark()}</i><small>Зазвонит через</small><div class="ap-hero-n">${until(ring.at, now)}</div>
          <div class="ap-hero-row"><span>${ic('alarm-clock', 15, 2.3)}${dayWord(ring.at, now)} в ${hm(ring.a)}</span><span>${tic(rt, 16)}${rt.name}</span></div></section>`
        : `<section class="ap-hero idle" data-in style="--i:1"><i class="ap-sun"></i><i class="ap-rise">${Sonly.mark()}</i><small>${s.alarms.length ? 'Все будильники выключены' : 'Будильников пока нет'}</small><div class="ap-hero-n t">Поставь будильник</div>
          <button class="ap-hero-btn" data-act="new">${ic('plus', 17, 2.6)}Новый будильник</button></section>`}
      ${weekCard(s, st, 2)}
      ${Sonly.lock ? Sonly.lock.home(s, 3) : ''}
      ${s.shareHidden ? '' : `<div class="ap-card ap-share" data-in style="--i:3"><button class="ap-share-in" data-act="page:share"><i>${ic('gift', 20, 2.1)}</i><span><b>${Sonly.partner.title}</b><small>${Sonly.partner.sub}</small></span></button><button class="ap-share-x" data-act="share-hide" aria-label="Скрыть">${ic('x', 15, 2.4)}</button></div>`}
      <div class="ap-sec" data-in style="--i:4"><h2>Будильники</h2>${s.alarms.length ? `<button class="ap-more lg" data-act="al-menu" aria-label="Действия с будильниками">${ic('ellipsis', 20, 2.6)}</button>` : ''}</div>
      ${s.alarms.length ? `<div class="ap-alarms">${s.alarms.map(alarmCard).join('')}</div>`
        : `<button class="ap-add" data-act="new" data-in style="--i:5">${ic('plus', 18, 2.4)}Первый будильник</button>`}
      <button class="ap-card ap-ready" data-act="page:help" data-in style="--i:${s.alarms.length + 6}"><i>${ic('shield-check', 21, 2)}</i><span><b>Готов к звонку</b></span>${chev()}</button>
    </div>`;
  }

  /* ── Листы: редактор, задания, набор, проверка, звуки ────── */

  const blank = (s) => ({ id: null, h: 7, m: 0, days: [0, 1, 2, 3, 4], once: false, task: 'hunt', sound: s.sndDef || 'Рассвет', name: `Будильник №${s.alarms.length + 1}`, on: true, rise: s.riseDef !== false, vibro: true, check: 5, skip: false, opts: {} });
  const keepTop = (flow, enter) => { const b = flow.sheets.querySelector('.ap-sh-body'); return !enter && b ? b.scrollTop : 0; };
  const setTop = (flow, y) => { flow.sheets.querySelector('.ap-sh-body').scrollTop = y; };
  const back = (title) => `<div class="ap-sh-head"><button class="ap-x lg" data-act="ed-back" aria-label="Назад">${ic('chevron-left', 22, 2.3)}</button><b>${title}</b><span class="ap-x ghost"></span></div>`;

  function editor(flow, enter = '') {
    const e = flow.state._ed, t = taskOf(e), top = keepTop(flow, enter);
    flow.sheet(`<div class="ap-sh-head"><button class="ap-x lg" data-act="sheet-close" aria-label="Закрыть">${ic('x', 20, 2.3)}</button><b>${e.id ? 'Будильник' : 'Новый будильник'}</b>
        ${e.id ? `<button class="ap-x lg" data-act="alarm-del" aria-label="Удалить будильник">${ic('trash-2', 18, 2.1)}</button>` : '<span class="ap-x ghost"></span>'}</div>
      <div class="ap-sh-body scroll">
        <div class="ap-card ap-ed-time"><label class="ap-ed-name"><input class="js-name" value="${esc(e.name)}" maxlength="22" aria-label="Название будильника">${ic('pencil', 15, 2.1)}</label><div class="js-wheel"></div></div>
        <h3>Расписание</h3>
        <div class="ap-seg"><button class="${e.once ? '' : 'on'}" data-act="ed-mode:repeat">${ic('repeat', 16, 2.2)}Повторять</button><button class="${e.once ? 'on' : ''}" data-act="ed-mode:once">${ic('calendar-days', 16, 2.1)}Один раз</button></div>
        ${e.once ? `<div class="ap-card ap-ed-note">${ic('info', 17, 2.1)}<span>Зазвонит один раз и сам выключится.</span></div>`
          : `<div class="ap-card ap-ed-days"><small>Повторять по:</small><div>${DAYS.map((d, i) => `<button class="${e.days.includes(i) ? 'on' : ''}" data-act="ed-day:${i}">${d}</button>`).join('')}</div></div>`}
        <h3>Пробуждение</h3>
        <div class="ap-card ap-list">
          <button class="ap-row" data-act="ed-task"><i class="ap-row-i tb cat-${t.cat}">${tic(t, 19)}</i><span>Задание</span><em>${t.name}</em>${chev()}</button>
          ${t.id === 'random' ? row(ic('shuffle', 17, 2.1), 'Набор заданий', `${poolOf(e).length} из ${TASKS.length}`, 'ed-pool') : TO.has(t.id) ? row(ic('sliders-horizontal', 17, 2.1), 'Настройка', TO.summary(t.id, TO.get(e, t.id)), 'ed-opts') : ''}
          ${row(ic('music-2', 17, 2.1), 'Звук', e.sound, 'ed-sound')}
        </div>
        <h3>Правила</h3>
        <div class="ap-card ap-list">
          <div class="ap-row"><i class="ap-row-i">${ic('alarm-clock-off', 17, 2.1)}</i><span>Отложить</span><em>${ic('lock', 13, 2.5)}Нельзя</em></div>
          ${row(ic('eye', 17, 2.1), 'Проверка подъёма', e.check ? `${e.check}\u00a0мин` : 'выключена', 'ed-check')}
          <div class="ap-row"><i class="ap-row-i">${ic('volume-2', 17, 2.1)}</i><span>Громкость нарастает</span><button class="ap-tg sm${e.rise ? ' on' : ''}" data-act="ed-flag:rise" role="switch" aria-checked="${e.rise}" aria-label="Громкость нарастает"></button></div>
          <div class="ap-row"><i class="ap-row-i">${ic('vibrate', 17, 2.1)}</i><span>Вибрация</span><button class="ap-tg sm${e.vibro ? ' on' : ''}" data-act="ed-flag:vibro" role="switch" aria-checked="${e.vibro}" aria-label="Вибрация"></button></div>
        </div>
        <button class="ap-card ap-try" data-act="ed-test">${ic('play', 17, 2.6)}<span>Проверить звонок</span><em>как утром</em></button>
      </div>
      <div class="ap-sh-foot"><button class="ap-btn" data-act="alarm-save"${!e.once && !e.days.length ? ' disabled' : ''}>Сохранить</button></div>`, `ap-sheet ${enter}`);
    wheel(flow.sheets.querySelector('.js-wheel'), { h: e.h, m: e.m, onChange: (h, m) => { e.h = h; e.m = m; } });
    const name = flow.sheets.querySelector('.js-name');
    name.addEventListener('input', () => { e.name = name.value; });
    setTop(flow, top);
    if (Sonly.partner && Sonly.partner.mount) Sonly.partner.mount(flow);
  }

  /** Сетка заданий, как в примере: у каждого — «Выбрать» и пробный запуск. Сверху — случайное задание. */
  function taskPicker(flow, enter = 'push') {
    const s = flow.state, e = s._ed, cat = s._cat || 'all', top = keepTop(flow, enter);
    const pick = (id) => `<button class="ap-pick" data-act="ed-pick:${id}">${e.task === id ? `${ic('check', 12, 3.4)}Выбрано` : 'Выбрать'}</button>`;
    const card = (t) => `<div class="ap-task cat-${t.cat}${e.task === t.id ? ' on' : ''}" data-act="ed-pick:${t.id}" role="button" tabindex="0">
        <i class="ap-bub tb">${tic(t, 28)}</i><b>${t.name}</b>
        <span class="ap-task-b">${pick(t.id)}<button class="ap-try-t" data-act="ed-try:${t.id}" aria-label="Попробовать «${t.name}»">${ic('play', 13, 2.8)}</button></span></div>`;
    flow.sheet(`${back('Задание')}
      <div class="ap-chips">${CATS.map(([id, name, icon]) => `<button class="${cat === id ? 'on' : ''}" data-act="ed-cat:${id}">${ic(icon, 15, 2.2)}${name}</button>`).join('')}</div>
      <div class="ap-sh-body scroll"><div class="ap-tasks">
        ${cat === 'all' ? `<div class="ap-task rnd cat-mix${e.task === 'random' ? ' on' : ''}" data-act="ed-pick:random" role="button" tabindex="0"><i class="ap-bub tb">${tic(RANDOM, 28)}</i>
          <span class="t"><b>Случайное</b></span><span class="ap-task-b">${pick('random')}<em>${poolOf(e).length} в наборе</em></span></div>` : ''}
        ${TASKS.filter((t) => cat === 'all' || t.cat === cat).map(card).join('')}</div></div>`, `ap-sheet ${enter}`);
    setTop(flow, top);
    if (Sonly.partner && Sonly.partner.mount) Sonly.partner.mount(flow);
  }

  /** Что внутри задания: предметы, сложность, количество. Тот же блок, что и в онбординге. */
  function taskSetup(flow, enter = 'push') {
    const e = flow.state._ed, t = taskOf(e), o = TO.get(e, t.id), top = keepTop(flow, enter);
    flow.sheet(`${back(t.name)}
      <div class="ap-sh-body scroll"><div class="ap-setup-h"><b>${TO.ask(t.id)}</b>${TO.hint(t.id) ? `<p>${TO.hint(t.id)}</p>` : ''}</div>${TO.html(t.id, o)}</div>
      <div class="ap-sh-foot"><button class="ap-btn" data-act="ed-back"${TO.valid(t.id, o) ? '' : ' disabled'}>Готово</button></div>`, `ap-sheet ${enter}`);
    setTop(flow, top);
    if (Sonly.partner && Sonly.partner.mount) Sonly.partner.mount(flow);
  }

  /** Набор для случайного задания: всё включено заранее, лишнее убирают касанием. */
  function poolSetup(flow, enter = 'push') {
    const e = flow.state._ed, pool = poolOf(e), low = pool.length < 3, top = keepTop(flow, enter);
    flow.sheet(`${back('Случайное задание')}
      <div class="ap-sh-body scroll"><div class="ap-setup-h"><b>Из чего выбирать?</b></div>
        <div class="to"><div class="to-bar${low ? ' low' : ''}"><span><b>${pool.length}</b> из ${TASKS.length}${low ? ' · оставь хотя бы 3' : ''}</span><button data-act="pool-all"${pool.length === TASKS.length ? ' disabled' : ''}>${ic('rotate-ccw', 14, 2.3)}Вернуть все</button></div>
        ${CATS.slice(1).map(([id, name]) => `<h4>${name}</h4><div class="to-grid">${TASKS.filter((t) => t.cat === id).map((t) => `<button class="to-obj${pool.includes(t.id) ? ' on' : ''}" data-act="pool:${t.id}" aria-pressed="${pool.includes(t.id)}" style="--h:var(--c-${t.cat})">${tic(t, 30)}<b>${t.name}</b><em>${ic('check', 11, 3.6)}</em></button>`).join('')}</div>`).join('')}</div></div>
      <div class="ap-sh-foot"><button class="ap-btn" data-act="ed-back"${low ? ' disabled' : ''}>Готово</button></div>`, `ap-sheet ${enter}`);
    setTop(flow, top);
    if (Sonly.partner && Sonly.partner.mount) Sonly.partner.mount(flow);
  }

  function checkPicker(flow, enter = 'push') {
    const e = flow.state._ed;
    flow.sheet(`${back('Проверка подъёма')}
      <div class="ap-sh-body scroll"><div class="ap-setup-h"><b>Не дать уснуть снова</b><p>Спросим «Ты не спишь?» после задания.</p></div>
        <div class="ap-card ap-list">${CHECKS.map(([n, name, note]) => `<button class="ap-row ap-snd${note ? ' tall' : ''}${(e.check || 0) === n ? ' on' : ''}" data-act="ed-chk:${n}"><i class="ap-row-i">${ic(n ? 'eye' : 'eye-off', 17, 2.1)}</i><span>${name}${note ? `<small>${note}</small>` : ''}</span><b class="ap-radio">${ic('check', 13, 3.4)}</b></button>`).join('')}</div></div>`, `ap-sheet ${enter}`);
  }

  /** Звуки по группам. Звуки-награды открываются, когда серия доходит до нужной длины. */
  function soundRows(s, cur, act) {
    const rw = Sonly.morning ? Sonly.morning.rewards(s) : [];
    const groups = SOUNDS.map(([g, list]) => [g, list.map((n) => ({ name: n, open: true }))]).concat(rw.length ? [['Награды за серию', rw]] : []);
    return groups.map(([g, list]) => `<h3>${g}</h3><div class="ap-card ap-list">${list.map((x) => (x.open
      ? `<button class="ap-row ap-snd${cur === x.name ? ' on' : ''}" data-act="${act}:${x.name}"><i class="ap-row-i">${ic('audio-lines', 17, 2.1)}</i><span>${x.name}</span><b class="ap-radio">${ic('check', 13, 3.4)}</b></button>`
      : `<div class="ap-row ap-snd locked"><i class="ap-row-i">${ic('lock', 16, 2.2)}</i><span>${x.name}</span><em>серия ${x.n}</em></div>`)).join('')}</div>`).join('');
  }
  function soundPicker(flow, enter = 'push') {
    const s = flow.state, e = s._ed, top = keepTop(flow, enter);
    flow.sheet(`${back('Звук')}<div class="ap-sh-body scroll">${soundRows(s, e.sound, 'ed-snd')}</div>`, `ap-sheet ${enter}`);
    setTop(flow, top);
    if (Sonly.partner && Sonly.partner.mount) Sonly.partner.mount(flow);
  }

  const soon = (flow, title) => flow.sheet(`<div class="msg"><b>${esc(title)}</b><p>В прототипе этот раздел пока не подключён.</p><button class="msg-ok" data-act="sheet-close">Понятно</button></div>`, 'center');

  /* ── Экраны ──────────────────────────────────────────────── */

  const screens = {
    home: {
      chrome: false,
      render: (c) => homeHtml(c.s),
      /* Время до звонка пересчитывается раз в полминуты, пока экран открыт. */
      mount(el, c) { if (!c.still) c.at(30000, () => c.flow.rerender()); },
    },

    stats: {
      chrome: false,
      render: (c) => {
        const s = c.s, st = stats(s), now = new Date(), bd = badges(s), got = bd.filter((b) => b.on).length;
        const list = st.h.filter((x) => s.range !== '7' || (day0(now) - x.d) / 864e5 <= 7);
        const band = st.score == null ? null : RANGES.find((r) => st.score >= r[0]);
        return `<div class="ap-scroll scroll"><h1 class="ap-h1" data-in>Статистика</h1>
          <div class="ap-duo" data-in style="--i:1">
            <div class="ap-card ap-big${st.streak ? '' : ' cold'}">${FLAME}<b>${st.streak}</b><small>${pl(st.streak, 'день', 'дня', 'дней')} подряд</small>${st.best > st.streak ? `<em>рекорд ${st.best}</em>` : ''}</div>
            <button class="ap-card ap-big" data-act="st-badges"><span class="bd-count${got ? '' : ' none'}"><svg viewBox="0 0 60 66" aria-hidden="true"><path d="${HEX}"/></svg><b>${got}</b></span><small>${pl(got, 'значок', 'значка', 'значков')} из ${bd.length}</small></button></div>
          <div class="ap-duo" data-in style="--i:2">
            <div class="ap-card ap-stat"><i>${ic('sunrise', 20, 2.1)}</i><b>${st.h.length}</b><small>${pl(st.h.length, 'подъём', 'подъёма', 'подъёмов')} всего</small></div>
            <div class="ap-card ap-stat"><i>${ic('timer', 20, 2.1)}</i><b>${st.h.length ? Math.round(st.h.reduce((a, x) => a + x.secs, 0) / st.h.length) : '—'}<u>${st.h.length ? 'с' : ''}</u></b><small>в среднем на\u00a0задание</small></div></div>
          ${weekCard(s, st, 3)}
          <div class="ap-card ap-chart" data-in style="--i:4"><div class="ap-card-h">${seg('st-metric', s.metric, [['wake', 'Подъём'], ['task', 'Задание']])}<span class="ap-avg"><i></i>среднее</span></div>
            ${list.length >= 3 ? chart(list, s.metric) : `<div class="ap-empty">${ic('chart-spline', 26, 1.8)}<span>График появится после трёх подъёмов</span></div>`}
            ${seg('st-range', s.range, [['7', '7 дней'], ['30', '30 дней'], ['all', 'Всё время']])}</div>
          <div class="ap-card ap-cons" data-in style="--i:5"><div class="ap-card-h"><b>Стабильность подъёма</b><button class="ap-q" data-act="st-info" aria-label="Как считается стабильность">?</button></div>
            ${band ? `<div class="ap-cons-v"><b>${st.score}</b><span style="--c:${band[3]}">${band[1]}</span><small>разброс ${st.spread} ${pl(st.spread, 'минута', 'минуты', 'минут')}</small></div>` : `<div class="ap-cons-v none"><b>—</b><small>Нужно три подъёма</small></div>`}
            <div class="ap-cons-bar"><i style="flex:30;background:#E5484D"></i><i style="flex:20;background:#F08A24"></i><i style="flex:20;background:#FFC62B"></i><i style="flex:30;background:#1FA055"></i>${band ? `<u style="left:${st.score}%"></u>` : ''}</div>
            <div class="ap-cons-t"><span>0</span><span style="left:30%">30</span><span style="left:50%">50</span><span style="left:70%">70</span><span style="left:100%">100</span></div></div>
        </div>`;
      },
    },

    settings: {
      chrome: false,
      render: (c) => {
        const s = c.s, st = stats(s), now = new Date(), nx = nextRing(s, now), nt = nx && taskOf(nx.a);
        return `<div class="ap-scroll scroll"><h1 class="ap-h1" data-in>Настройки</h1>
          <button class="ap-card ap-gift" data-act="page:share" data-in style="--i:1"><i>${Sonly.mark()}</i><span><b>${Sonly.partner.title}</b><small>${Sonly.partner.sub}</small></span>${chev()}</button>
          <button class="ap-card ap-sub" data-act="page:sub" data-in style="--i:2"><i>${ic('check', 20, 3)}</i><span><b>Подписка активна</b><small>Год · продление ${renew()}</small></span>${chev()}</button>
          <h3>Будильник</h3>
          <div class="ap-card ap-list">${row(ic('volume-2', 17, 2.2), 'Громкость', `${s.volume} %`, 'page:volume', '#F0453A')}${row(ic('music-2', 17, 2.2), 'Звук по умолчанию', s.sndDef, 'page:sound', '#E84A9C')}${row(ic('shield-check', 17, 2.2), 'Готовность к звонку', '', 'page:help', '#12A871')}</div>
          ${Sonly.lock ? `<h3>Фокус</h3><div class="ap-card ap-list"><button class="ap-row tall" data-act="page:lock"><i class="ap-row-i c" style="--c:${Sonly.lock.COLORS.lock}">${ic('lock', 17, 2.2)}</i><span>Блокировка приложений<small>${Sonly.lock.status(s)}</small></span>${chev()}</button></div>` : ''}
          <h3>Оформление</h3>
          <div class="ap-card ap-list"><div class="ap-row col"><div><i class="ap-row-i c" style="--c:#6B5CE6">${ic('contrast', 17, 2.2)}</i><span>Тема</span></div>${seg('theme', s.theme, [['system', 'Как в системе'], ['dark', 'Тёмная'], ['light', 'Светлая']])}</div>
            ${row(ic('globe', 17, 2.2), 'Язык', 'Русский', 'page:lang', '#2F7BF6')}${row(ic('bell', 17, 2.2), 'Уведомления', `${1 + (s.nEve ? 1 : 0) + (s.nWeek ? 1 : 0)} из 3`, 'page:notify', '#F0453A')}</div>
          <h3>Виджеты</h3>
          <div class="ap-wid">
            <figure><div class="wd wd-streak${st.streak ? '' : ' cold'}">${FLAME}<b>${st.streak}</b><small>${pl(st.streak, 'день', 'дня', 'дней')} подряд</small></div><figcaption>Серия</figcaption></figure>
            <figure><div class="wd wd-next"><i class="wd-sun"></i>${nx ? `<small>${dayWord(nx.at, now)}</small><b>${hm(nx.a)}</b><span>${tic(nt, 13)}${nt.name}</span>` : '<small>будильник</small><b>—</b><span>не стоит</span>'}</div><figcaption>Следующий будильник</figcaption></figure>
          </div>
          <button class="ap-link" data-act="page:widgets">Как добавить виджет${ic('chevron-right', 14, 2.6)}</button>
          <h3>Подписка</h3>
          <div class="ap-card ap-list">${row(ic('credit-card', 17, 2.2), 'Управлять подпиской', '', 'page:sub', '#12A871')}${row(ic('rotate-ccw', 17, 2.2), 'Восстановить покупки', '', 'restore-app', '#0E9F9A')}${row(ic('ticket', 17, 2.2), 'Ввести промокод', s.promo === 'ok' ? '−25 %' : '', 'page:promo', '#D9A300')}</div>
          <h3>Поддержка</h3>
          <div class="ap-card ap-list">${row(ic('message-circle', 17, 2.2), 'Написать в поддержку', '', 'page:msg:support', '#2F7BF6')}${row(ic('lightbulb', 17, 2.2), 'Предложить идею', '', 'page:msg:idea', '#D9A300')}${row(ic('bug', 17, 2.2), 'Сообщить об ошибке', '', 'page:msg:bug', '#E5484D')}</div>
          <h3>Документы</h3>
          <div class="ap-card ap-list">${row(ic('file-text', 17, 2.2), 'Условия использования', '', 'page:doc:terms', '#7A7A85')}${row(ic('shield', 17, 2.2), 'Конфиденциальность', '', 'page:doc:privacy', '#7A7A85')}</div>
          <p class="ap-ver"><span>Сделано с ${Sonly.mark()} для ранних пташек</span>sonly 1.0 · сборка 1</p>
        </div>`;
      },
    },
  };

  /* ── Разделы настроек ────────────────────────────────────── */

  const renew = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\s?г\.$/, ''); };
  /** Строка с выключателем и пояснением. Без act — пункт, который отключить нельзя. */
  const tgRow = (icon, label, note, on, act) => `<div class="ap-row${note ? ' tall' : ''}"><i class="ap-row-i">${icon}</i><span>${label}${note ? `<small>${note}</small>` : ''}</span>${act ? `<button class="ap-tg sm${on ? ' on' : ''}" data-act="${act}" role="switch" aria-checked="${on}" aria-label="${label}"></button>` : `<em>${ic('lock', 13, 2.5)}Всегда</em>`}</div>`;
  const check = (state, label, note) => `<div class="ap-row${note ? ' tall' : ''}"><i class="ap-ck ${state}">${ic(state === 'ok' ? 'check' : state === 'warn' ? 'triangle-alert' : 'info', 15, state === 'ok' ? 3.2 : 2.3)}</i><span>${label}${note ? `<small>${note}</small>` : ''}</span></div>`;
  const MSG = { support: ['Написать в поддержку', 'Опиши, что случилось, — ответим на почту.'], idea: ['Предложить идею', 'Чего тебе не хватает в приложении?'], bug: ['Сообщить об ошибке', 'Что пошло не так и что было перед этим?'] };
  const DOCS = { terms: 'Условия использования', privacy: 'Политика конфиденциальности' };
  const PROMO_MSG = { ok: '−25 % на следующий год', bad: 'Такого кода нет', own: 'Это твой код — его вводят твои зрители.' };
  const WIDGET_STEPS = ['Зажми пустое место на экране «Домой».', 'Нажми «Изменить» вверху и выбери «Добавить виджет».', 'Найди sonly и добавь виджет.'];

  /** Раздел настроек: заголовок, содержимое и кнопки внизу (если нужны). */
  function pageOf(s, id, arg) {
    switch (id) {
      case 'volume': return ['Громкость', `<div class="ap-card ap-vol"><div class="ap-vol-n"><b class="js-vn">${s.volume}</b><u>%</u></div>
          <div class="ap-vol-r">${ic('volume-1', 20, 2)}<input type="range" class="js-vol" min="10" max="100" step="5" value="${s.volume}" aria-label="Громкость будильника" style="--p:${((s.volume - 10) / 90) * 100}%">${ic('volume-2', 20, 2)}</div></div>
        <div class="ap-card ap-list gap">${tgRow(ic('trending-up', 17, 2.1), 'Нарастание', 'За 10 секунд', s.riseDef, 'set-flag:riseDef')}${tgRow(ic('bell-ring', 17, 2.1), 'В беззвучном режиме', '', true, '')}</div>`,
        '<button class="ap-btn" data-act="vol-test">Проверить звук</button>'];
      case 'sound': return ['Звук по умолчанию', `${soundRows(s, s.sndDef, 'set-snd')}`, ''];
      case 'help': return ['Готовность к звонку', `<div class="ap-card ap-list">${check('ok', 'Уведомления включены', '')}${check(s.volume < 40 ? 'warn' : 'ok', `Громкость ${s.volume} %`, s.volume < 40 ? 'Тихо — можно проспать' : '')}${check('ok', 'Беззвучный режим не мешает', '')}${Sonly.lock && Sonly.lock.ready(s) ? check('ok', 'Приложения закроются до подъёма', '') : ''}${check('info', 'Не смахивай приложение', '')}</div>`,
        '<button class="ap-btn" data-act="ring-test">Проверить звонок</button>'];
      case 'lang': return ['Язык', `<div class="ap-card ap-list"><div class="ap-row ap-snd on"><i class="ap-row-i">${ic('globe', 17, 2.1)}</i><span>Русский</span><b class="ap-radio">${ic('check', 13, 3.4)}</b></div><div class="ap-row"><i class="ap-row-i">${ic('globe', 17, 2.1)}</i><span>English</span><em>скоро</em></div></div>`, ''];
      case 'notify': return ['Уведомления', `<div class="ap-card ap-list">${tgRow(ic('alarm-clock', 17, 2.1), 'Звонок будильника', '', true, '')}${tgRow(ic('moon', 17, 2.1), 'Напоминание вечером', 'В 22:00', s.nEve, 'set-flag:nEve')}${tgRow(ic('calendar-check', 17, 2.1), 'Итоги недели', 'По воскресеньям', s.nWeek, 'set-flag:nWeek')}</div>`, ''];
      case 'sub': return ['Подписка', `<div class="ap-card ap-plan"><span>${ic('check', 13, 3.4)}Активна</span><b>Подписка на год</b><div><u>39,99 €</u> в год</div><small>Следующее списание — ${renew()}</small></div>
        <h3>Что входит</h3><div class="ap-card ap-list">${check('ok', 'Нельзя отложить', '')}${check('ok', `Все ${TASKS.length} заданий`, '')}${check('ok', 'Серия и статистика', '')}</div>
        <div class="ap-card ap-list gap">${row(ic('credit-card', 17, 2.2), 'Управлять в App Store', '', 'soon:Управление подпиской', '#12A871')}${row(ic('rotate-ccw', 17, 2.2), 'Восстановить покупки', '', 'restore-app', '#0E9F9A')}</div>`, ''];
      case 'promo': return ['Промокод', `<p class="ap-note first">Скидка — со следующего продления.</p>
        <div class="ap-coupon${s.promo === 'ok' ? ' ok' : s.promo ? ' err' : ''}"><i>${ic('ticket', 21, 1.9)}</i><input class="js-promo" maxlength="7" value="${esc(s.promoCode || '')}" placeholder="Промокод" aria-label="Промокод" autocomplete="off" spellcheck="false"${s.promo === 'ok' ? ' disabled' : ''}>${s.promo === 'ok' ? `<em>${ic('check', 18, 3)}</em>` : '<button data-act="promo-go">Применить</button>'}</div>
        <p class="ap-coupon-msg ${s.promo === 'ok' ? 'ok' : s.promo ? 'bad' : ''}">${PROMO_MSG[s.promo] || ''}</p>`, ''];
      case 'share': case 'blog': return Sonly.partner.page(s, id);
      case 'lock': case 'lock-ex': case 'lock-night': case 'lock-demo': return Sonly.lock.page(s, id, arg);
      case 'widgets': return ['Как добавить виджет', `<div class="ap-card ap-steps">${WIDGET_STEPS.map((t, n) => `<div><b>${n + 1}</b><span>${t}</span></div>`).join('')}</div>`, ''];
      case 'msg': {
        const [title, hint] = MSG[arg] || MSG.support;
        return s.sent === arg ? [title, `<div class="ap-sent"><i>${ic('check', 26, 3)}</i><b>Отправлено</b><p>Спасибо!</p></div>`, '<button class="ap-btn" data-act="page-close">Готово</button>']
          : [title, `<p class="ap-note first">${hint}</p><textarea class="ap-area js-msg" rows="7" placeholder="Текст сообщения" aria-label="${title}"></textarea>`, `<button class="ap-btn" data-act="msg-send:${arg}">Отправить</button>`];
      }
      default: return [DOCS[arg] || 'Документ', `<div class="ap-doc"><p>Здесь будет полный текст документа «${DOCS[arg] || 'Документ'}». В прототипе он не подключён.</p></div>`, ''];
    }
  }
  function openPage(flow, id, arg = '') {
    const s = flow.state, same = s._page && s._page[0] === id, [title, body, foot, back] = pageOf(s, id, arg), top = same ? keepTop(flow, '') : 0;
    s._page = [id, arg];
    /* back — страница внутри другой страницы: вместо крестика стрелка назад. Та же страница перерисовывается без въезда. */
    flow.sheet(`<div class="ap-sh-head"><button class="ap-x lg" data-act="${back || 'page-close'}" aria-label="${back ? 'Назад' : 'Закрыть'}">${ic(back ? 'chevron-left' : 'x', back ? 22 : 20, 2.3)}</button><b>${title}</b><span class="ap-x ghost"></span></div>
      <div class="ap-sh-body scroll">${body}</div>${foot ? `<div class="ap-sh-foot">${foot}</div>` : ''}`, `ap-sheet${same ? ' now' : ''}`);
    setTop(flow, top);
    if (Sonly.partner && Sonly.partner.mount) Sonly.partner.mount(flow);
    if (Sonly.lock && Sonly.lock.mount) Sonly.lock.mount(flow);
    const vol = flow.sheets.querySelector('.js-vol');
    if (vol) vol.addEventListener('input', () => { s.volume = +vol.value; vol.style.setProperty('--p', ((s.volume - 10) / 90) * 100 + '%'); flow.sheets.querySelector('.js-vn').textContent = s.volume; Sonly.sound.setVolume(s.volume); });
  }
  /** Копирует или отправляет текст. done получает сообщение для человека. */
  function shareText(text, viaShare, done) {
    if (viaShare && navigator.share) { navigator.share({ title: 'sonly', text }).then(() => done('Отправлено'), () => done('')); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => done('Текст с кодом скопирован'), () => done('Не получилось скопировать — перепиши код вручную'));
    else done('Не получилось скопировать — перепиши код вручную');
  }

  /** Настоящий звонок: если приложение открыто и подошло время включённого будильника, он звонит сам. */
  function autoRing(flow) {
    const s = flow.state, now = new Date(), key = now.toDateString() + ' ' + now.getHours() + ':' + now.getMinutes();
    if (s._ring || s._check || !flow.el.isConnected || flow.el.closest('[hidden]')) return;
    const a = s.alarms.find((x) => x.on && x.h === now.getHours() && x.m === now.getMinutes() && x._rung !== key && (x.once || x.days.includes((now.getDay() + 6) % 7)));
    if (!a) return;
    a._rung = key;
    if (a.skip) { a.skip = false; flow.rerender(true); return; }
    Sonly.ringer.start(flow, a, false);
  }

  /* ── Оформление ──────────────────────────────────────────── */

  const sysDark = () => { const r = document.documentElement.dataset.theme; return r ? r === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  const paint = (flow) => { const t = flow.state.theme; flow.el.dataset.theme = t === 'system' ? (sysDark() ? 'dark' : 'light') : t; };
  const alarmFrom = (st) => ({ id: 'a1', h: st.time.h, m: st.time.m, days: [...st.days], once: false, task: st.task || 'hunt', sound: 'Рассвет', name: 'Утренний', on: true, rise: true, vibro: true, check: 5, skip: false, opts: JSON.parse(JSON.stringify(st.opts || {})) });

  /** Главная приложения с будильником из онбординга — тот самый экран, который человек увидит после оплаты. */
  Sonly.appPreview = (st) => `<div class="ap" data-theme="${sysDark() ? 'dark' : 'light'}"><div class="statusbar"><span>9:41</span><i class="sb-island"></i><span class="sb-right">${SB_ICONS}</span></div>
    <section class="screen">${homeHtml({ data: 'new', shareHidden: true, alarms: [alarmFrom(st)] })}</section><div class="dock">${tabbar('home')}</div><div class="homebar"></div></div>`;

  Sonly.appKit = { taskOf, tic, hm, fmtMin, stats, pl, day0, copy, blank, editor, taskPicker, poolOf, nextRing, dayWord, chev, row, FLAME, keepTop, setTop, shareText, code4, refOf, openPage };

  Sonly.register({
    id: 'app', name: 'Приложение', cls: 'ap',
    about: 'Приложение sonly по присланному примеру: будильники, утро, статистика со значками, настройки с виджетами. «Зазвонить сейчас» под телефоном запускает настоящий звонок со звуком.',
    order: ['home', 'morning', 'stats', 'settings'], extra: [],
    titles: { home: 'Главная', morning: 'Утро', stats: 'Статистика', settings: 'Настройки' },
    defaults: () => ({
      theme: 'system', data: 'new', metric: 'wake', range: '30', log: [], volume: 80, riseDef: true, sndDef: 'Рассвет', nEve: true, nWeek: true,
      brief: { weather: true, word: true, saying: true },
      alarms: [{ id: 'a1', h: 7, m: 30, days: [0, 1, 2, 3, 4], once: false, task: 'hunt', sound: 'Рассвет', name: 'Утренний', on: true, rise: true, vibro: true, check: 5, skip: false, opts: {} }],
    }),
    demo: () => ({}),
    init(flow) {
      flow.dock.innerHTML = tabbar('home');
      flow._tabs = Sonly.glass ? Sonly.glass.tabs(flow.dock.querySelector('.ap-tabs')) : null;
      paint(flow);
      Sonly.sound.stop();
      if (!flow._tick && !flow.still) flow._tick = setInterval(() => autoRing(flow), 5000);
      if (!flow._mq) { flow._mq = matchMedia('(prefers-color-scheme: dark)'); flow._mq.addEventListener('change', () => paint(flow)); }
    },
    /* Выбранная вкладка: кнопки не перерисовываются — меняется класс, у значка плавно проявляется второй тон, подложка переезжает. */
    onScreen(flow, id) {
      const pill = flow.dock.querySelector('.ap-tabs-pill');
      if (!pill) return;
      let on = null;
      pill.querySelectorAll('button').forEach((b) => { const hit = b.dataset.act === 'tab:' + id; b.classList.toggle('on', hit); if (hit) on = b; });
      if (flow._tabs) flow._tabs.put(on);
    },
    /** Будильник, собранный в онбординге, становится первым в списке. */
    adopt(flow, st) { flow.state.alarms = [alarmFrom(st)]; flow.go('home', 0); },
    /** Открывает лист для снимка экрана: редактор, задания, набор, проверка, звуки, разделы, значки, листы «Утра». */
    preview(flow, what) {
      const s = flow.state;
      if (what === 'info') { this.on(flow, 'st-info'); return; }
      if (what === 'badges') { this.on(flow, 'st-badges'); return; }
      if (/^(ring|task|woke|check)(:|$)/.test(what)) { Sonly.ringer.preview(flow, what); return; }
      if (what.startsWith('mo-')) { Sonly.morning.preview(flow, what.slice(3)); return; }
      if (what.startsWith('page-')) { const [id, arg] = what.slice(5).split('.'); openPage(flow, id, arg || ''); return; }
      s._ed = what === 'edit' ? copy(s.alarms[0]) : blank(s);
      if (what.startsWith('setup')) { s._ed.task = what.split('-')[1] || 'hunt'; taskSetup(flow, ''); } else if (what === 'tasks') taskPicker(flow, '');
      else if (what === 'pool') { s._ed.task = 'random'; poolSetup(flow, ''); } else if (what === 'checks') checkPicker(flow, ''); else if (what === 'sounds') soundPicker(flow); else editor(flow);
    },
    /* Переключатели под телефоном в оболочке просмотра. */
    shell: {
      html: (s) => `<span class="shell-ctl">Тема ${[['system', 'как в системе'], ['dark', 'тёмная'], ['light', 'светлая']].map(([v, n]) => `<button data-shell="theme:${v}"${s.theme === v ? ' aria-pressed="true"' : ''}>${n}</button>`).join('')}</span>
        <span class="shell-ctl">Данные ${[['new', 'новый аккаунт'], ['demo', 'две недели']].map(([v, n]) => `<button data-shell="data:${v}"${s.data === v ? ' aria-pressed="true"' : ''}>${n}</button>`).join('')}</span>
        <span class="shell-ctl">Сейчас <button data-shell="ring:now">зазвонить</button><button data-shell="check:now">проверка подъёма</button></span>`,
      set(flow, key, val) {
        const s = flow.state, a = s.alarms.find((x) => x.on) || s.alarms[0];
        /* «Зазвонить» — как будто подошло время будильника: такой подъём идёт в серию. */
        if (key === 'ring') { if (a && !s._ring) Sonly.ringer.start(flow, a, false); return; }
        if (key === 'check') { if (a && !s._ring) Sonly.ringer.check(flow, a); return; }
        s[key] = val;
        paint(flow);
        if (!s._ring && !s._check) flow.rerender();
      },
    },
    on(flow, act, arg, el) {
      const s = flow.state, e = s._ed, find = (id) => s.alarms.find((a) => a.id === id);
      switch (act) {
        case 'tab': if (flow.id !== arg) flow.go(arg, 0); else { const sc = flow.cur.querySelector('.scroll'); if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' }); } return true;
        case 'new': s._ed = blank(s); editor(flow); return true;
        case 'edit': s._ed = copy(find(arg)); editor(flow); return true;
        case 'toggle': { const a = find(arg); a.on = !a.on; if (!a.on) a.skip = false; flow.rerender(); return true; }
        case 'skip': { const a = find(arg); a.skip = !a.skip; flow.rerender(); return true; }
        case 'al-menu':
          flow.sheet(`<div class="msg"><b>Все будильники</b><div class="msg-col"><button class="msg-ok" data-act="al-all:on">Включить все</button><button class="msg-ok" data-act="al-all:off">Выключить все</button><button class="msg-ok ghost" data-act="sheet-close">Отмена</button></div></div>`, 'center');
          return true;
        case 'al-all': s.alarms.forEach((a) => { a.on = arg === 'on'; if (!a.on) a.skip = false; }); flow.rerender(true); flow.closeSheet(); return true;
        case 'share-hide': s.shareHidden = true; flow.rerender(); return true;
        case 'ed-mode': e.once = arg === 'once'; editor(flow); return true;
        case 'ed-day': { const d = +arg; e.days = e.days.includes(d) ? e.days.filter((x) => x !== d) : [...e.days, d].sort(); editor(flow); return true; }
        case 'ed-flag': e[arg] = !e[arg]; editor(flow); return true;
        case 'ed-task': taskPicker(flow); return true;
        case 'ed-cat': s._cat = arg; taskPicker(flow, ''); return true;
        case 'ed-pick': e.task = arg; if (arg === 'random') poolSetup(flow); else if (TO.has(arg)) taskSetup(flow); else editor(flow, 'back'); return true;
        case 'ed-try': Sonly.ringer.start(flow, { ...copy(e), task: arg }, true, 'picker', { direct: true }); return true;
        case 'ed-opts': taskSetup(flow); return true;
        case 'ed-pool': poolSetup(flow); return true;
        case 'pool': case 'pool-all': {
          const p = poolOf(e), next = act === 'pool-all' ? TASKS.map((t) => t.id) : p.includes(arg) ? p.filter((x) => x !== arg) : [...p, arg];
          e.opts = e.opts || {};
          e.opts.random = { pool: TASKS.map((t) => t.id).filter((x) => next.includes(x)) };
          /* Плитки переключаются на месте, с анимацией. */
          const pool = poolOf(e), low = pool.length < 3, root = flow.sheets;
          if (flow.still || !root.querySelector('.to-obj')) { poolSetup(flow, ''); return true; }
          TO.tiles(root, (id) => pool.includes(id), { low, full: pool.length === TASKS.length, html: `<b>${pool.length}</b> из ${TASKS.length}${low ? ' · оставь хотя бы 3' : ''}` });
          const b = root.querySelector('.ap-sh-foot .ap-btn');
          if (b) b.disabled = low;
          return true;
        }
        case 'ed-check': checkPicker(flow); return true;
        case 'ed-chk': e.check = +arg; editor(flow, 'back'); return true;
        case 'ed-sound': soundPicker(flow); return true;
        case 'ed-snd': e.sound = arg; Sonly.sound.setVolume(s.volume); Sonly.sound.play(arg); soundPicker(flow, ''); return true;
        case 'ed-back': Sonly.sound.stop(); editor(flow, 'back'); return true;
        case 'alarm-save': {
          const a = { ...e, id: e.id || 'a' + Date.now(), name: (e.name || '').trim() || 'Будильник', on: true };
          const i = s.alarms.findIndex((x) => x.id === a.id);
          if (i < 0) s.alarms.push(a); else s.alarms[i] = a;
          s.alarms.sort((x, y) => x.h * 60 + x.m - (y.h * 60 + y.m));
          if (flow.id === 'home') flow.rerender(true); else flow.go('home', 0, true);
          flow.closeSheet();
          return true;
        }
        case 'alarm-del':
          flow.sheet(`<div class="msg"><b>Удалить будильник?</b><p>${hm(e)} · ${esc(e.name)}</p><div class="msg-two"><button class="msg-ok" data-act="ed-back">Оставить</button><button class="msg-ok red" data-act="alarm-del-yes">Удалить</button></div></div>`, 'center');
          return true;
        case 'alarm-del-yes': s.alarms = s.alarms.filter((a) => a.id !== e.id); flow.rerender(true); flow.closeSheet(); return true;
        case 'theme': s.theme = arg; paint(flow); flow.rerender(); if (flow.opts.onState) flow.opts.onState(flow); return true;
        case 'st-metric': s.metric = arg; flow.rerender(); return true;
        case 'st-range': s.range = arg; flow.rerender(); return true;
        case 'st-info':
          flow.sheet(`<div class="pay-grab"></div><div class="ap-info"><b>Стабильность подъёма</b><p>Чем ровнее время подъёма, тем выше оценка.</p>
            <div class="ap-info-l">${RANGES.map(([from, name, note, col], i) => `<div><i style="background:${col}"></i><b>${name}</b><span>${from}–${i ? RANGES[i - 1][0] - 1 : 100}</span><small>${note}</small></div>`).join('')}</div>
            <button class="ap-btn" data-act="sheet-close">Понятно</button></div>`, 'ap-low');
          return true;
        case 'st-badges': {
          const bd = badges(s), got = bd.filter((b) => b.on).length;
          flow.sheet(`<div class="ap-sh-head"><button class="ap-x lg" data-act="sheet-close" aria-label="Закрыть">${ic('x', 20, 2.3)}</button><b>Значки</b><span class="ap-x ghost"></span></div>
            <div class="ap-sh-body scroll"><p class="ap-note first">${got} из ${bd.length}</p>
            <div class="bd-grid">${bd.map((b) => `<div class="bd${b.on ? ' on' : ''}">${hex(b)}<b>${b.name}</b></div>`).join('')}</div></div>`, 'ap-sheet');
          return true;
        }
        case 'soon': soon(flow, arg); return true;
        case 'page': { const i = arg.indexOf(':'); s._copied = ''; openPage(flow, i < 0 ? arg : arg.slice(0, i), i < 0 ? '' : arg.slice(i + 1)); return true; }
        case 'page-close': s._page = null; Sonly.sound.stop(); flow.rerender(true); flow.closeSheet(); return true;
        /* Закрытие листа касанием мимо: если это был раздел настроек, экран под ним обновляется. */
        case 'sheet-close': if (s._page) { s._page = null; Sonly.sound.stop(); flow.rerender(true); } return false;
        case 'set-flag': s[arg] = !s[arg]; openPage(flow, s._page[0], s._page[1]); return true;
        case 'set-snd': s.sndDef = arg; Sonly.sound.setVolume(s.volume); Sonly.sound.play(arg); openPage(flow, 'sound'); return true;
        case 'vol-test': Sonly.sound.setVolume(s.volume); Sonly.sound.play(s.sndDef); return true;
        case 'promo-go': {
          const field = flow.sheets.querySelector('.js-promo'), v = (field.value || '').trim().toUpperCase();
          /* Пустое поле: не ругаем, а показываем, куда вводить. */
          if (!v) { Sonly.nudge(field); return true; }
          s.promoCode = v;
          s.promo = v === refOf(s) ? 'own' : Sonly.isPromo(v) ? 'ok' : 'bad';
          openPage(flow, 'promo');
          return true;
        }
        case 'ref-copy': case 'ref-share':
          shareText(act === 'ref-copy' ? refOf(s) : `sonly — будильник, который нельзя отложить: выключается только заданием. Промокод ${refOf(s)} — −25 % на первый год и 3 дня бесплатно.`, false, (msg) => { s._copied = act === 'ref-copy' && /^Текст/.test(msg) ? 'Код скопирован' : msg; if (s._page && s._page[0] === 'share') openPage(flow, 'share'); });
          return true;
        case 'msg-send': s.sent = arg; openPage(flow, 'msg', arg); return true;
        case 'restore-app': flow.sheet('<div class="msg"><b>Подписка на месте</b><p>Покупка уже на этом Apple ID.</p><button class="msg-ok" data-act="sheet-close">Понятно</button></div>', 'center'); return true;
        case 'ring-test': s._page = null; Sonly.ringer.start(flow, s.alarms.find((x) => x.on) || s.alarms[0] || blank(s), true); return true;
        case 'ed-test': Sonly.ringer.start(flow, e, true, 'editor'); return true;
        case 'check-ok': s._check = null; flow.go('home', 0); return true;
        default:
          if (Sonly.ringer && Sonly.ringer.on(flow, act, arg)) return true;
          if (Sonly.morning && Sonly.morning.on(flow, act, arg, el)) return true;
          if (Sonly.partner && Sonly.partner.on(flow, act, arg, el)) return true;
          if (Sonly.lock && Sonly.lock.on(flow, act, arg, el)) return true;
          /* Нажатия внутри настройки задания: предметы, сложность, количество. */
          const done = e && act.startsWith('to-') && TO.act(e.task, TO.get(e, e.task), act, arg);
          if (done === 'keep') return true;
          if (done) {
            const o = TO.get(e, e.task);
            if ((act === 'to-obj' || act === 'to-all') && !flow.still && TO.sync(flow.sheets, e.task, o)) { const b = flow.sheets.querySelector('.ap-sh-foot .ap-btn'); if (b) b.disabled = !TO.valid(e.task, o); return true; }
            taskSetup(flow, '');
            return true;
          }
          return false;
      }
    },
    screens,
  });
})();
