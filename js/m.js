/* Онбординг sonly: вопросы, объясняющие сцены, настройка будильника, подпись, сборка плана и подписка. */
(() => {
  'use strict';
  const { ic, esc, pad, TASKS, DAYS, PRICE, SB_ICONS, tStr, taskOf, daysText, offer, eur, today, wheel, signPad, odo, SIGN_DEMO, taskOpts: TO } = Sonly;

  const cta = (label, o = {}) => `<footer class="a-foot${o.float ? ' float' : ''}"><button class="a-cta${o.cls ? ' ' + o.cls : ''}" data-act="${o.act || 'next'}"${o.need ? ` data-need="${o.need}"` : ''}${o.off ? ' disabled' : ''}>${label}</button></footer>`;
  const head = (title, sub) => `<div class="a-head"><h1 data-in>${title}</h1>${sub ? `<p data-in style="--i:1">${sub}</p>` : ''}</div>`;
  const cap = (s) => s.replace(/^./, (x) => x.toUpperCase());
  const mins = (t) => t.h * 60 + t.m;
  const fmt = (m) => { const v = ((m % 1440) + 1440) % 1440; return pad(Math.floor(v / 60)) + ':' + pad(v % 60); };
  const pl = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many; };
  const dur = (m) => { const h = Math.floor(m / 60), r = m % 60; return [h ? `${h} ${pl(h, 'час', 'часа', 'часов')}` : '', r ? `${r} ${pl(r, 'минуту', 'минуты', 'минут')}` : ''].filter(Boolean).join(' '); };
  /* Процент сборки идёт неравномерно, с двумя короткими паузами: так он не похож на заведённый таймер. */
  const pace = (t) => (t < 0.3 ? t * 0.8 : t < 0.4 ? 0.24 + (t - 0.3) * 0.5 : t < 0.7 ? 0.29 + (t - 0.4) * 1.3 : t < 0.8 ? 0.68 + (t - 0.7) * 0.4 : 0.72 + (t - 0.8) * 1.4);

  /* Ближайший день звонка. «Завтра» пишем только тогда, когда будильник правда зазвонит завтра. */
  const WD = ['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье'];
  const WD_NAME = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const WD_TILL = ['До понедельника.', 'До вторника.', 'До среды.', 'До четверга.', 'До пятницы.', 'До субботы.', 'До воскресенья.'];
  /** Ближайший день звонка. Если будильник зазвонит ещё сегодня (ночь, время не прошло) — это «сегодня», а не «завтра». */
  function nextRing(days, time) {
    const now = new Date(), t = (now.getDay() + 6) % 7;
    const early = !!time && now.getHours() * 60 + now.getMinutes() < time.h * 60 + time.m;
    for (let k = early ? 0 : 1; k <= 7; k++) { const d = (t + k) % 7; if (days.includes(d)) return { d, today: k === 0, tomorrow: k === 1 }; }
    return { d: (t + 1) % 7, today: false, tomorrow: true };
  }
  const when = (s) => { const n = nextRing(s.days, s.time); return n.today ? 'сегодня' : n.tomorrow ? 'завтра' : WD[n.d]; };

  /** Значок задания: один и тот же во всех экранах, где задание упоминается. */
  const tic = (t, size = 20) => (t.id && Sonly.ti ? Sonly.ti(t.id, size) : t.ms ? `<span class="ms" style="font-size:${size}px" aria-hidden="true">${t.ms}</span>` : ic(t.lu, size - 2, 2.1));

  /* Конфетти разложено заранее: в конце анимации кусочки остаются на своих местах. */
  const BITS = [[-58, -34, -30, '#FFC62B', 9, 5], [-44, 22, 40, '#9ED2AE', 6, 6], [-70, 4, 20, '#D9D9DF', 7, 4], [-30, -56, 70, '#9ED2AE', 5, 9], [10, -66, -20, '#F6B9A0', 8, 5], [46, -50, 35, '#D9D9DF', 6, 6], [66, -16, -50, '#FFC62B', 5, 9],
    [62, 24, 15, '#9ED2AE', 9, 5], [34, 52, -35, '#F6B9A0', 6, 6], [-8, 62, 60, '#D9D9DF', 9, 4], [-52, 50, -15, '#FFC62B', 6, 6], [-78, -28, 45, '#F6B9A0', 5, 5], [80, 6, 80, '#D9D9DF', 5, 5], [22, -84, 10, '#FFC62B', 5, 5]];
  const bits = (k = 1) => BITS.map(([x, y, r, col, w, h]) => {
    const bw = Math.max(3, Math.round(w * (k < 1 ? 0.8 : 1))), bh = Math.max(3, Math.round(h * (k < 1 ? 0.8 : 1)));
    return `<i style="--dx:${Math.round(x * k)}px;--dy:${Math.round(y * k)}px;--dr:${r}deg;background:${col};width:${bw}px;height:${bh}px;margin:${-bh / 2}px 0 0 ${-bw / 2}px"></i>`;
  }).join('');

  /* ── Вопросы ─────────────────────────────────────────────── */

  /* Логотипы соцсетей — настоящие, из Simple Icons (js/logos.js). У TikTok — его фирменный сдвиг голубого и красного. */
  const L = Sonly.LOGOS || {};
  const logo = (inner, size) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
  const BRAND = {
    tiktok: (s) => logo(`<path fill="#25F4EE" transform="translate(-.8 -.6)" d="${L.tiktok}"/><path fill="#FE2C55" transform="translate(.8 .6)" d="${L.tiktok}"/><path fill="#fff" d="${L.tiktok}"/>`, s),
    instagram: (s) => logo(`<path fill="#fff" d="${L.instagram}"/>`, s),
    youtube: (s) => logo(`<path fill="#FF0033" d="${L.youtube}"/>`, s + 2),
    telegram: (s) => logo(`<path fill="#26A5E4" d="${L.telegram}"/>`, s + 4),
    appstore: (s) => logo(`<path fill="#fff" d="${L.appstore}"/>`, s),
  };
  const glyph = (name, size) => (BRAND[name] && L[name] ? BRAND[name](size) : ic(name, size, 2));

  /** Вопрос со строками: значок слева, отметка справа. brand — цветная плитка вместо белого кружка. */
  const rows = (key, title, sub, opts, dense) => ({
    render: (c) => `${head(title, sub)}<div class="m-rows${dense ? ' dense' : ''}">${opts.map(([icon, label, brand], i) => `<button class="m-row${c.s[key] === label ? ' on' : ''}" data-act="pick" data-key="${key}" data-val="${esc(label)}" data-in style="--i:${i + 2}"><span class="m-row-i${brand ? ' brand' : ''}"${brand ? ` style="${brand}"` : ''}>${glyph(icon, dense ? 18 : 20)}</span><b>${label}</b><em>${ic('check', 14, 3.4)}</em></button>`).join('')}</div>${cta('Продолжить', { need: key })}`,
  });
  /** Вопрос с крупными карточками 2×2: сверху картинка по смыслу ответа, под ней сам ответ и короткое пояснение. */
  const cards = (key, title, sub, opts) => ({
    render: (c) => `${head(title, sub)}<div class="m-cards">${opts.map(([visual, label, note], i) => `<button class="m-card${c.s[key] === label ? ' on' : ''}" data-act="pick" data-key="${key}" data-val="${esc(label)}" data-in style="--i:${i + 2}"><span class="m-card-v">${visual}</span><b>${label}</b>${note ? `<small>${note}</small>` : ''}<em>${ic('check', 14, 3.4)}</em></button>`).join('')}</div>${cta('Продолжить', { need: key })}`,
  });
  const bubble = (icon) => `<i class="m-bub">${ic(icon, 30, 1.8)}</i>`;
  /** Будильники без цифр: одни часики, три, пять или целая куча. У главных — жёлтые колокольчики; выбранные звенят. */
  const CLOCK = '<svg viewBox="0 0 48 48" aria-hidden="true"><path class="bl" d="M6.6 15.4a7.4 7.4 0 0 1 10.6-9.2z"/><path class="bl" d="M41.4 15.4a7.4 7.4 0 0 0-10.6-9.2z"/><path class="lgs" d="M14.6 41.4 11.4 45M33.4 41.4l3.2 3.6"/><circle class="bd" cx="24" cy="26.5" r="15.5"/><path class="hd" d="M24 18.5v8.6l5.6 3.4"/></svg>';
  const SETS = {
    1: [[50, 6, 66, 0, 3]],
    3: [[31, 30, 42, -14, 1], [69, 30, 42, 14, 1], [50, 2, 56, 0, 3]],
    5: [[18, 40, 32, -18, 1, 1], [82, 40, 32, 18, 1, 1], [32, 14, 40, -10, 2], [68, 14, 40, 10, 2], [50, 0, 50, 0, 3]],
    7: [[14, 50, 26, -24, 1, 1], [50, 60, 26, 0, 1, 1], [86, 50, 26, 22, 1, 1], [28, 26, 34, -14, 2], [72, 26, 34, 14, 2], [38, 0, 42, -6, 3], [62, 0, 42, 7, 3]],
  };
  const clocks = (n) => `<i class="m-clocks">${SETS[n].map(([x, y, s, r, z, dim], i) => `<span class="${i === SETS[n].length - 1 ? 'main' : ''}${dim ? ' dim' : ''}" style="left:${x}%;bottom:${y}px;width:${s}px;z-index:${z};--r:${r}deg;--d:${(i * 0.12).toFixed(2)}s">${CLOCK}</span>`).join('')}</i>`;

  const markIn = () => Sonly.mark().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  /** Точка на дуге утра: v от 0 (левый край) до 1 (правый). Дуга — половина окружности, поэтому длина пути и угол совпадают. */
  const arcPt = (v) => [160 - 130 * Math.cos(Math.PI * v), 146 - 130 * Math.sin(Math.PI * v)];
  /* Полноценный макет iPhone: рамка, боковые кнопки, остров. Внутри — то, что происходит на экране. */
  const dev = (inner, cls = '') => `<div class="m-dev ${cls}" data-in style="--i:2"><i class="m-dev-b l"></i><i class="m-dev-b r"></i><div class="m-dev-scr"><i class="m-dev-isl"></i>${inner}</div></div>`;

  /* Мозг-персонаж. Одна фигура со всеми позами: какие руки, рот и веки видны — решают классы на .m-brain
     (настроение: sleepy, ok, fresh, anx; состояние awake — когда «включился»). */
  const LOBES = [[72, 70, 30], [110, 54, 34], [148, 70, 30], [60, 104, 28], [160, 104, 28], [88, 124, 34], [132, 124, 34], [110, 92, 40]];
  const arm = (cls, d, hx, hy) => `<g class="br-arm ${cls}"><path d="${d}"/><circle cx="${hx}" cy="${hy}" r="8"/></g>`;
  function brain(id = 'br') {
    const disc = (d) => LOBES.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r + d}"/>`).join('');
    const eye = (x, k) => `<ellipse class="br-eye" cx="${x}" cy="114" rx="11.5" ry="12.5"/><circle class="br-pup" cx="${x + k}" cy="116" r="6.2"/><circle class="br-gl" cx="${x + k + 2.4}" cy="113.4" r="2.1"/>
        <g clip-path="url(#${id}${x})"><g class="br-lid"><rect x="${x - 13}" y="100" width="26" height="28"/><rect class="br-lash" x="${x - 13}" y="125.6" width="26" height="2.6"/></g></g>`;
    return `<svg class="m-br" viewBox="0 0 220 204" aria-hidden="true">
      <defs><linearGradient id="${id}G" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFCEDB"/><stop offset="1" stop-color="#FF9FBA"/></linearGradient>
        <clipPath id="${id}90"><ellipse cx="90" cy="114" rx="11.5" ry="12.5"/></clipPath><clipPath id="${id}130"><ellipse cx="130" cy="114" rx="11.5" ry="12.5"/></clipPath></defs>
      <ellipse class="br-sh" cx="110" cy="193" rx="46" ry="5.5"/>
      <g class="br-bob">
        <g class="br-legs"><path d="M97 150v28M123 150v28"/><path class="br-shoe" d="M83 188a14 10 0 0 1 28 0zM109 188a14 10 0 0 1 28 0z"/></g>
        <g class="br-out">${disc(4)}</g><g fill="url(#${id}G)">${disc(0)}</g>
        <path class="br-line" d="M110 22c-6 17 6 32-1 52M70 54q10-12 24-2M150 54q-10-12-24-2M46 92q6-14 24-6M174 92q-6-14-24-6M80 82q9-6 17 2M140 82q-9-6-17 2"/>
        <ellipse class="br-shine" cx="80" cy="44" rx="10" ry="5" transform="rotate(-28 80 44)"/>
        ${eye(90, 1)}${eye(130, -1)}
        <path class="br-brow" d="M79 98l19-6M141 98l-19-6"/>
        <ellipse class="br-ck" cx="72" cy="134" rx="8" ry="5"/><ellipse class="br-ck" cx="148" cy="134" rx="8" ry="5"/>
        <ellipse class="br-m yawn" cx="110" cy="141" rx="5.5" ry="7"/>
        <path class="br-m smile" d="M101 137q9 9 18 0"/>
        <path class="br-m grin" d="M98 135h24q-2 14-12 14t-12-14z"/>
        <path class="br-m wavy" d="M100 141q4.5-5 9 0t9 0"/>
        <path class="br-drop" d="M168 56q8 11 0 16q-8-5 0-16z"/>
        ${arm('dn l', 'M44 128q-14 8-12 28', 32, 158)}${arm('dn r', 'M176 128q14 8 12 28', 188, 158)}
        ${arm('up l', 'M42 112q-16-10-14-34', 28, 76)}${arm('up r', 'M178 112q16-10 14-34', 192, 76)}
        ${arm('hd l', 'M40 126q-20-10-4-34', 37, 90)}${arm('hd r', 'M180 126q20-10 4-34', 183, 90)}
      </g></svg>`;
  }
  /* Тот же мозг нужен экрану «Доброе утро» (morning.js): там он просыпается вместе с человеком. */
  Sonly.brain = brain;
  /** Маленький мозг в нужном настроении — для карточек ответа «Как ты себя чувствуешь?». */
  const mini = (mood, id) => `<i class="m-brain mini ${mood}">${brain(id)}</i>`;
  /* Что вокруг мозга: буквы сна, мысли-дела, искры. */
  const AROUND = {
    sleepy: '<span class="br-z"><b>z</b><b>z</b><b>z</b></span>',
    ok: '<span class="br-z one"><b>z</b></span>',
    fresh: '<i class="br-sp s1"></i><i class="br-sp s2"></i><i class="br-sp s3"></i><i class="br-sp s4"></i>',
    anx: () => `${[['mail', 'c1'], ['list-checks', 'c2'], ['clock', 'c3'], ['message-circle', 'c4']].map(([n, k]) => `<span class="br-chip ${k}">${ic(n, 15, 2.3)}</span>`).join('')}<span class="br-one">${ic('check', 20, 3.4)}</span>`,
  };
  /* Экран после вопроса о самочувствии: у каждого ответа свой смысл и своя сцена. bar — сколько «включается» мозг. */
  const FEEL = {
    'Разбито': { mood: 'sleepy', h: ['Дело не', 'в силе воли'], mk: 'силе воли', bar: [2600, 'мозг просыпается…', 'проснулся'], y: 'Поэтому мы меняем будильник, а не тебя.', yi: 'alarm-clock-check' },
    'Нормально': { mood: 'ok', h: ['Мозгу нужна', 'пара минут'], mk: 'пара минут', bar: [1500, 'разгоняется…', 'в строю'], y: 'Задание разгоняет его быстрее.', yi: 'zap' },
    'Бодро': { mood: 'fresh', h: ['Мозг уже', 'в строю'], mk: 'в строю', y: 'sonly сохранит это на каждое утро.', yi: 'flame' },
    'Тревожно': { mood: 'anx', h: ['В голове сразу', 'список дел'], mk: 'список дел', y: 'Одно простое задание — и мысли по местам.', yi: 'check' },
  };
  const feel = (s) => FEEL[s.feel] || FEEL['Разбито'];

  /* Ответ на «первую мысль»: у каждого варианта свой экран и своя анимация. Под сценой — сколько утра уходит. */
  const lostBar = () => `<div class="m-lost" data-in style="--i:4"><span>Утро</span><i><u class="js-lost"></u></i><b class="js-lostn">0 мин</b></div>`;
  const setLost = (c, m, max) => { c.q('.js-lost').style.width = Math.min(100, (m / max) * 100) + '%'; c.q('.js-lostn').textContent = `−${m} мин`; };
  const POSTS = [['#FFB4C8', '#FFE1E9'], ['#9FD3FF', '#DDF0FF'], ['#B7E4A8', '#E4F6DE'], ['#FFD27A', '#FFF0CC']];
  const FEED = POSTS.map(([a, b]) => `<div class="m-post"><i style="background:${a}"></i><span><u></u><u class="s"></u></span><b style="background:${b}"></b></div>`).join('');
  const thoughtHead = (a, b, mk) => `<h1 class="a-big"><span data-in>${a}</span><span data-in style="--i:1">${b.replace(mk, `<mark class="js-mk">${mk}</mark>`)}</span></h1>`;
  const THOUGHT = {
    'Ещё пять минут': {
      render: () => `<div class="m-th">${thoughtHead('Ещё пять минут…', 'И ещё пять.', 'ещё пять')}
          ${dev(`<div class="m-alr js-alr"><em class="alr-x js-x"></em><div class="alr-t js-time"></div><span class="alr-l">${ic('alarm-clock', 13, 2.4)}Будильник</span>
            <div class="alr-snz">Отложить</div><div class="alr-stop">Стоп</div><i class="alr-touch"></i>
            <div class="alr-dim">${ic('moon', 26, 2)}<b>ещё 5 минут…</b></div></div>`, 'js-dev')}
          ${lostBar()}<p class="m-th-t a-fade js-p">В sonly «отложить» нет.</p></div>${cta('Продолжить')}`,
      /* Как на самом деле: будильник звонит, палец жмёт «Отложить», телефон гаснет на пять минут — и так три раза. */
      mount(el, c) {
        const time = c.q('.js-time'), d = c.q('.js-dev'), scr = c.q('.js-alr'), x = c.q('.js-x');
        const ring = (t, lost) => () => { odo(time, t); scr.classList.remove('dim', 'tap'); d.classList.remove('buzz'); void d.offsetWidth; d.classList.add('buzz'); if (lost) setLost(c, lost, 15); };
        const tap = (n) => () => { scr.classList.add('tap'); c.at(280, () => { scr.classList.add('dim'); x.textContent = `отложен ×${n}`; x.classList.add('in'); }); };
        odo(time, '07:00');
        c.seq([[700, () => c.q('.js-mk').classList.add('on')], [900, ring('07:00')], [1700, tap(1)], [2700, ring('07:05', 5)], [3400, tap(2)],
          [4400, ring('07:10', 10)], [5100, tap(3)], [6100, ring('07:15', 15)], [6700, () => c.q('.js-p').classList.add('show')]]);
      },
    },
    'Сначала полистаю телефон': {
      render: () => `<div class="m-th">${thoughtHead('Сначала телефон…', 'а утро улетает.', 'улетает')}
          ${dev(`<div class="m-fd js-fd"><b class="fd-t js-time"></b><div class="fd-in">${FEED}${FEED}</div><i class="fd-thumb"></i></div>`)}
          ${lostBar()}<p class="m-th-t a-fade js-p">sonly не замолчит, пока не встанешь.</p></div>${cta('Продолжить')}`,
      mount(el, c) {
        const time = c.q('.js-time'), fd = c.q('.js-fd');
        odo(time, '07:00');
        c.seq([[700, () => c.q('.js-mk').classList.add('on')], [1000, () => fd.classList.add('go')],
          [1900, () => { odo(time, '07:08'); setLost(c, 8, 24); }], [2900, () => { odo(time, '07:16'); setLost(c, 16, 24); }],
          [3900, () => { odo(time, '07:24'); setLost(c, 24, 24); fd.classList.add('late'); }], [4500, () => c.q('.js-p').classList.add('show')]]);
      },
    },
    'Полежу немного': {
      render: () => `<div class="m-th">${thoughtHead('Полежу немного…', 'и снова сплю.', 'сплю')}
          <div class="m-eye js-eye" data-lid="open" data-in style="--i:2"><div class="eye-room"><i class="eye-day"></i>
            <div class="eye-win"><i class="eye-sky"></i><i class="eye-sun">${Sonly.mark()}</i><u></u><u class="v"></u></div>
            <div class="eye-clk"><b class="js-time"></b></div><i class="eye-desk"></i></div><i class="eye-lid"></i></div>
          ${lostBar()}<p class="m-th-t a-fade js-p">Задание сразу поднимает с кровати.</p></div>${cta('Продолжить')}`,
      /* Взгляд самого человека: веки тяжелеют и закрываются, а когда открываются — на часах уже позже и за окном светло. */
      mount(el, c) {
        const time = c.q('.js-time'), eye = c.q('.js-eye'), lid = (v) => () => { eye.dataset.lid = v; };
        odo(time, '07:00');
        c.seq([[700, () => c.q('.js-mk').classList.add('on')], [1100, lid('half')], [1800, lid('shut')],
          [2300, () => { odo(time, '07:20'); eye.dataset.day = '1'; setLost(c, 20, 40); }], [2800, lid('half')], [3500, lid('shut')],
          [4000, () => { odo(time, '07:40'); eye.dataset.day = '2'; setLost(c, 40, 40); }], [4600, () => { eye.dataset.lid = 'open'; eye.classList.add('late'); }],
          [5200, () => c.q('.js-p').classList.add('show')]]);
      },
    },
    'Встаю сразу': {
      render: () => `<div class="m-th">${thoughtHead('Встаёшь сразу?', 'Держи серию.', 'серию')}
          <div class="m-strk js-strk" data-in style="--i:2"><div class="strk-n">${Sonly.appKit.FLAME}<b class="js-n">1</b></div><small class="js-nl">день подряд</small>
            <div class="strk-week">${DAYS.map((d) => `<span><i>${Sonly.mark()}</i><small>${d}</small></span>`).join('')}</div></div>
          <p class="m-th-t a-fade js-p">sonly считает каждое такое утро.</p></div>${cta('Продолжить')}`,
      /* Серия растёт день за днём: в каждом дне загорается солнце, число подрастает. */
      mount(el, c) {
        const days = c.qa('.strk-week i'), n = c.q('.js-n'), nl = c.q('.js-nl');
        const day = (i) => () => { days[i].classList.add('on'); n.textContent = i + 1; nl.textContent = `${pl(i + 1, 'день', 'дня', 'дней')} подряд`; n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); };
        c.seq([[700, () => c.q('.js-mk').classList.add('on')], ...days.map((d, i) => [1000 + i * 380, day(i)]), [3900, () => c.q('.js-p').classList.add('show')]]);
      },
    },
  };
  const thought = (s) => THOUGHT[s.thought] || THOUGHT['Ещё пять минут'];
  /** Неделя кольцом из семи долей: тёмные — утра, когда человек засыпает снова. */
  const dial = (n) => {
    const C = 2 * Math.PI * 34, seg = C / 7 - 6;
    return `<i class="m-dial"><svg viewBox="0 0 86 86">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="43" cy="43" r="34" stroke-dasharray="${seg.toFixed(1)} ${(C - seg).toFixed(1)}" transform="rotate(${((i * 360) / 7 - 85).toFixed(1)} 43 43)"${i < n ? ' class="z"' : ''}/>`).join('')}</svg>${ic(n ? 'moon' : 'sun', 24, 1.9)}</i>`;
  };

  const SOURCES = [
    ['tiktok', 'TikTok', 'background:#000'],
    ['instagram', 'Instagram', 'background:radial-gradient(circle at 30% 107%,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285AEB 90%)'],
    ['youtube', 'YouTube', 'background:#fff;box-shadow:inset 0 0 0 1px #E6E6EC'],
    ['telegram', 'Telegram', 'background:#fff;box-shadow:inset 0 0 0 1px #E6E6EC'],
    ['appstore', 'App Store', 'background:linear-gradient(180deg,#19C6FB,#1A6CF2)'],
    ['users', 'Друзья или семья', 'background:#FFD12E;color:#0D0D0F'],
    ['ellipsis', 'Другое'],
  ];
  const TAGLINE = { 'Успевать вовремя': 'Вовремя и без гонки', 'Зарядка или спорт': 'С запасом на зарядку', 'Тихое время для себя': 'Тихое утро, пока все спят', 'Фора на весь день': 'С форой на весь день', 'Просыпаться человеком': 'Человеком, а не зомби' };
  const CAT_TABS = [['all', 'Все'], ['camera', 'Камера'], ['move', 'Движение'], ['mind', 'Голова'], ['voice', 'Голос']];
  /* Сколько будильников в левом телефоне на сравнении — столько, сколько человек ставит сам. */
  const ALARM_SETS = {
    'Один': [['Будильник', '07:00'], ['Повтор', '07:09'], ['Ещё повтор', '07:18']],
    'Два-три': [['Первый', '07:00'], ['Запасной', '07:05'], ['Точно встать', '07:10']],
  };
  const ALARM_FULL = [['Первый', '07:00'], ['Запасной', '07:05'], ['Ещё один', '07:10'], ['Точно встать', '07:15']];

  const screens = {
    welcome: {
      chrome: false,
      render: () => `<div class="a-wel"><div class="a-sun"></div>
        <div class="a-wel-top" data-in><div class="a-brand">${Sonly.logo()}</div>${Sonly.i18n ? `<button class="a-lang lg" data-lg="btn" data-act="lang" aria-label="Язык: ${Sonly.i18n.LANGS.find((x) => x[0] === Sonly.i18n.lang)[1]}">${Sonly.i18n.flag(Sonly.i18n.lang, 'a-flag')}<span>${Sonly.i18n.lang.toUpperCase()}</span>${ic('chevron-down', 14, 2.6)}</button>` : ''}</div>
        <h1 class="a-wel-h"><span data-in style="--i:2">Встать</span><span data-in style="--i:3">с первого</span><span data-in style="--i:4">будильника</span></h1>
        <p class="a-wel-p" data-in style="--i:6">Будильник, который нельзя отложить.</p></div>
        <footer class="a-foot a-wel-foot" data-in style="--i:8"><button class="a-cta" data-act="next">Начать</button><button class="a-link" data-act="restore">У меня уже есть подписка</button>
        <p class="a-legal">Продолжая, ты принимаешь <button data-act="legal:Условия использования">Условия</button> и <button data-act="legal:Политика конфиденциальности">Политику конфиденциальности</button></p></footer>`,
    },

    source: rows('source', 'Откуда ты узнал про sonly?', null, SOURCES, true),
    'q-alarms': cards('alarms', 'Сколько будильников ты ставишь на утро?', null, [[clocks(1), 'Один'], [clocks(3), 'Два-три'], [clocks(5), 'Четыре-пять'], [clocks(7), 'Шесть и больше']]),
    'q-thought': rows('thought', 'Первая мысль, когда звонит будильник?', null, [['timer-reset', 'Ещё пять минут'], ['smartphone', 'Сначала полистаю телефон'], ['bed-double', 'Полежу немного'], ['sunrise', 'Встаю сразу']]),

    /* Свой экран на каждый ответ про первую мысль: отложить, телефон, полежать, встать сразу. */
    'm-five': {
      render: (c) => thought(c.s).render(c),
      mount: (el, c) => thought(c.s).mount(el, c),
    },

    'q-back': cards('back', 'Бывает, что выключаешь будильник и засыпаешь снова?', null, [[dial(6), 'Почти каждое\u00a0утро'], [dial(2), 'Пару раз в\u00a0неделю'], [dial(1), 'Иногда'], [dial(0), 'Никогда']]),

    compare: {
      render: (c) => {
        const list = ALARM_SETS[c.s.alarms] || ALARM_FULL;
        const t = c.s.task ? taskOf(c.s) : { lu: 'zap' };
        return `${head('Пора настроить твой будильник')}
          <div class="m-duo" data-in style="--i:1">
            <div class="m-duo-col"><b>Обычный будильник</b>
              <div class="m-ph js-lp"><div class="m-ph-scr"><div class="m-ph-now"><small>сейчас</small><b class="js-ln"></b></div>
                ${list.map(([l, tm]) => `<div class="m-al js-l" data-t="${tm}"><span><small>${l}</small><b>${tm}</b></span><i class="m-tg red"></i></div>`).join('')}</div></div>
              <span class="m-duo-cap r">${ic('rotate-ccw', 13, 2.6)}${list.length} ${pl(list.length, 'звонок', 'звонка', 'звонков')}</span></div>
            <div class="m-duo-col"><b>${Sonly.logo()}</b>
              <div class="m-ph js-rp"><div class="m-ph-scr"><div class="m-ph-now"><small>сейчас</small><b class="js-rn"></b></div>
                <div class="m-al js-r"><span><small>С заданием</small><b>07:00</b></span><i class="m-tg green"></i></div>
                <div class="m-ph-task"><span>${tic(t, 17)}</span><b>Задание</b><i><u></u></i></div>
                <div class="m-party"><span class="m-party-c">${ic('check', 28, 2.8)}</span>${bits(0.6)}</div></div></div>
              <span class="m-duo-cap g">${ic('check', 13, 3.2)}1 звонок</span></div>
          </div>
          <p class="m-duo-t"><b>Будильник замолчит только после задания.</b>Без повторов и запасных будильников.</p>${cta('Продолжить')}`;
      },
      /* Оба телефона идут одновременно: слева будильники звонят по очереди и откладываются, справа один звонок закрывается заданием. */
      mount(el, c) {
        const L = c.qa('.js-l'), r = c.q('.js-r'), task = c.q('.m-ph-task'), party = c.q('.m-party');
        const lp = c.q('.js-lp'), rp = c.q('.js-rp'), ln = c.q('.js-ln'), rn = c.q('.js-rn');
        const label = (row, text) => { row.querySelector('small').textContent = text; };
        const buzz = (ph) => { ph.classList.remove('buzz'); void ph.offsetWidth; ph.classList.add('buzz'); };
        const steps = [];
        odo(ln, '06:59');
        odo(rn, '06:59');
        L.forEach((a, i) => steps.push([350 + i * 110, () => a.classList.add('in')], [640 + i * 110, () => a.querySelector('.m-tg').classList.add('on')]));
        steps.push([350, () => r.classList.add('in')], [640, () => r.querySelector('.m-tg').classList.add('on')]);
        let t = 1400;
        L.forEach((a, i) => {
          const last = i === L.length - 1;
          steps.push([t, () => { odo(ln, a.dataset.t); a.classList.add('ring'); buzz(lp); }],
            [t + 560, () => { a.classList.remove('ring'); a.classList.add(last ? 'bad' : 'snz'); label(a, last ? 'Паника' : 'Отложен'); if (last) lp.classList.add('late'); }]);
          t += 950;
        });
        steps.push([1400, () => { odo(rn, '07:00'); r.classList.add('ring'); buzz(rp); }], [1960, () => task.classList.add('in')], [2260, () => task.classList.add('go')],
          [3260, () => { task.classList.add('done'); r.classList.remove('ring'); r.classList.add('ok'); label(r, 'Готово'); odo(rn, '07:01'); }],
          [3560, () => { party.classList.add('go'); rp.classList.add('win'); }],
          [t + 60, () => { lp.classList.add('lose'); c.qa('.m-duo-cap').forEach((n) => n.classList.add('in')); }], [t + 460, () => c.q('.m-duo-t').classList.add('in')]);
        c.seq(steps);
      },
    },

    'q-feel': cards('feel', 'Как ты себя чувствуешь сразу после пробуждения?', null, [[mini('fresh', 'bq1'), 'Бодро'], [mini('ok', 'bq2'), 'Нормально'], [mini('sleepy', 'bq3'), 'Разбито'], [mini('anx', 'bq4'), 'Тревожно']]),

    /* Что происходит с мозгом после сна — по ответу про самочувствие: разбит, нормально, бодр или тревожно. */
    'm-will': {
      render: (c) => {
        const f = feel(c.s), around = AROUND[f.mood];
        return `<div class="m-will">
          <h1 class="a-big"><span data-in>${f.h[0]}</span><span data-in style="--i:1">${f.h[1].replace(f.mk, `<mark class="js-mk">${f.mk}</mark>`)}</span></h1>
          <div class="m-brain ${f.mood} js-brain" data-in style="--i:2"><i class="br-sunb">${Sonly.mark()}</i>${brain('brw')}${typeof around === 'function' ? around() : around}</div>
          ${f.bar ? `<div class="m-boot" data-in style="--i:3"><i><u class="js-boot" style="--t:${f.bar[0]}ms"></u></i><small class="js-bt">${f.bar[1]}</small></div>` : ''}
          <div class="m-wcard y a-fade js-y"><span>${ic(f.yi, 22, 2)}</span><div><b>${f.y}</b></div></div>
        </div>${cta('Продолжить')}`;
      },
      mount(el, c) {
        const f = feel(c.s), wake = f.bar ? 1300 + f.bar[0] : f.mood === 'anx' ? 2800 : 1000;
        c.seq([[800, () => c.q('.js-mk').classList.add('on')], [1100, () => { const b = c.q('.js-boot'); if (b) b.classList.add('go'); }],
          [wake, () => { c.q('.js-brain').classList.add('awake'); const t = c.q('.js-bt'); if (t) t.textContent = f.bar[2]; }], [wake + 500, () => c.q('.js-y').classList.add('show')]]);
      },
    },

    'q-block': rows('block', 'Что мешает встать больше всего?', null, [['smartphone', 'Листаю телефон в кровати'], ['repeat', 'Откладываю снова и снова'], ['ear-off', 'Не слышу будильник'], ['bed', 'Просыпаюсь, но лежу'], ['moon', 'Поздно ложусь'], ['snowflake', 'Не хочу из-под одеяла']], true),

    graph: {
      render: () => `${head('Создано, чтобы вставать было легче')}
        <div class="m-graph"><div class="m-graph-card" data-in style="--i:1"><div class="m-graph-h"><b>Как ощущается утро</b><span>иллюстрация</span></div>
            ${Sonly.chart({ k: 1.35, grid: true, fill: true, tags: false, between: true })}
            <div class="m-legend"><span class="l1"><i style="background:#E5484D"></i>С повторами</span><span class="l2"><i style="background:#0D0D0F"></i>С заданием</span></div></div>
          <p class="m-graph-t" data-in style="--i:3">Задание будит один раз — и насовсем.</p></div>${cta('Продолжить')}`,
      mount(el, c) { Sonly.playChart(c); },
    },

    'q-why': rows('why', 'Ради чего ты хочешь менять утро?', null, [['clock', 'Успевать вовремя'], ['dumbbell', 'Зарядка или спорт'], ['coffee', 'Тихое время для себя'], ['rocket', 'Фора на весь день'], ['smile', 'Просыпаться человеком']], true),

    /* Как это выглядит на самом деле: в телефоне по очереди идут три экрана приложения — звонок, задание, «Доброе утро». */
    how: {
      render: (c) => `${head('Как звонит sonly', 'Выключить можно только делом.')}
          <div class="m-howd">${dev(`<div class="hw js-hw" data-step="1">
              <div class="hw-s s1"><i class="hw-logo">${Sonly.logo()}</i><i class="hw-bell"><u></u><u class="w2"></u>${Sonly.mark()}</i><b class="hw-t">${tStr(c.s)}</b><span class="hw-btn">Начать задание</span><small>${ic('lock', 9, 2.8)}Отложить нельзя</small></div>
              <div class="hw-s s2"><i class="hw-logo">${Sonly.logo()}</i><em class="hw-find">Найди:</em><i class="hw-frame"><img src="img/obj/kettle.webp" alt=""><u></u><u></u><u></u><u></u><b>${ic('check', 15, 3.6)}</b></i><i class="hw-shot"></i></div>
              <div class="hw-s s3"><i class="hw-logo">${Sonly.logo()}</i><i class="hw-sun">${Sonly.mark()}</i><b class="hw-gm">Доброе утро</b><span class="hw-row"><u></u><u></u><u></u></span></div></div>`)}
            <div class="m-hsteps js-steps" data-step="1" data-in style="--i:3"><span>${ic('bell-ring', 13, 2.4)}Звонит</span><i></i><span>${ic('zap', 13, 2.4)}Задание</span><i></i><span>${ic('sun', 13, 2.4)}Утро</span></div></div>
          ${cta(c.s.task ? 'Продолжить' : 'Выбрать задание')}`,
      mount(el, c) {
        const hw = c.q('.js-hw'), st = c.q('.js-steps'), set = (n) => { hw.dataset.step = n; st.dataset.step = n; hw.classList.remove('found'); };
        if (c.still) { set(2); hw.classList.add('found'); return; }
        const loop = () => c.seq([[0, () => set(1)], [2400, () => set(2)], [3800, () => hw.classList.add('found')], [5000, () => set(3)], [7800, loop]]);
        c.at(500, loop);
      },
    },

    catalog: {
      render: (c) => {
        const cat = c.s._cat || 'all';
        const list = TASKS.filter((t) => cat === 'all' || t.cat === cat);
        return `${head('Выбери задание', 'Им выключишь будильник.')}
          <div class="m-tabs">${CAT_TABS.map(([id, name]) => `<button class="m-tab${cat === id ? ' on' : ''}" data-act="cat:${id}">${name}</button>`).join('')}</div>
          <div class="m-list scroll">${list.map((t) => `<button class="m-task${c.s.task === t.id ? ' on' : ''}" data-act="pick" data-key="task" data-val="${t.id}">
            <span class="m-task-i">${tic(t, 22)}</span><span class="t"><b>${t.name}</b><small>${t.desc}</small></span><em>${ic('check', 13, 3.6)}</em></button>`).join('')}<div class="m-list-end"></div></div>
          ${cta('Продолжить', { need: 'task' })}`;
      },
      on(act, arg, t, c) { if (act === 'cat') { c.s._cat = arg; c.flow.rerender(); return true; } return false; },
      /* У заданий без настроек шаг настройки пропускается. */
      next: (s) => (TO.has(s.task) ? null : 'time-now'),
    },

    /* Что внутри задания: предметы, сложность, количество. Всё выбрано заранее, человек только убирает лишнее. */
    'task-setup': {
      render: (c) => {
        const t = taskOf(c.s), o = TO.get(c.s, t.id);
        if (!TO.has(t.id)) return `${head(`«${t.name}» работает сразу`)}<div class="m-setup"><div class="m-setup-in"><span class="m-setup-t">${tic(t, 17)}${t.name}</span><p class="m-setup-p">${t.desc}.</p></div></div>${cta('Продолжить')}`;
        return `${head(TO.ask(t.id), TO.hint(t.id))}<div class="m-setup scroll"><div class="m-setup-in"><span class="m-setup-t">${tic(t, 17)}${t.name}</span>${TO.html(t.id, o)}</div><div class="m-list-end"></div></div>${cta('Продолжить', { off: !TO.valid(t.id, o) })}`;
      },
      on(act, arg, el, c) {
        const t = taskOf(c.s), o = TO.get(c.s, t.id);
        const done = TO.act(t.id, o, act, arg);
        if (!done) return false;
        if (done === 'keep') return true;
        /* Предметы переключаются на месте, с анимацией; остальные настройки перерисовывают экран. */
        if ((act === 'to-obj' || act === 'to-all') && !c.still && TO.sync(c.el, t.id, o)) { const b = c.q('.a-cta'); if (b) b.disabled = !TO.valid(t.id, o); return true; }
        c.flow.rerender();
        return true;
      },
    },

    'time-now': {
      render: () => `${head('Во сколько ты встаёшь сейчас?', 'Когда ты уже на ногах.')}<div class="m-wheel"><div class="js-wheel"></div></div>${cta('Продолжить')}`,
      mount(el, c) { wheel(c.q('.js-wheel'), { h: c.s.now.h, m: c.s.now.m, onChange: (h, m) => { c.s.now = { h, m }; } }); },
    },

    time: {
      render: () => `${head('Во сколько ты хочешь вставать?')}<div class="m-wheel"><div class="js-wheel"></div><span class="m-delta js-delta"></span></div>${cta('Продолжить')}`,
      mount(el, c) {
        const chip = c.q('.js-delta');
        const show = () => {
          const d = mins(c.s.now) - mins(c.s.time);
          chip.innerHTML = d > 0 ? `${ic('sunrise', 16, 2.2)}на ${dur(d)} раньше, чем сейчас` : d < 0 ? `на ${dur(-d)} позже, чем сейчас` : 'как сейчас, только с первого звонка';
          chip.classList.toggle('up', d > 0);
        };
        show();
        wheel(c.q('.js-wheel'), { h: c.s.time.h, m: c.s.time.m, onChange: (h, m) => { c.s.time = { h, m }; show(); } });
      },
    },

    /* Дуга утра: солнце переезжает со времени, когда человек встаёт сейчас, на новое время; выигранный кусок утра загорается жёлтым. */
    'm-real': {
      render: (c) => {
        const d = mins(c.s.now) - mins(c.s.time);
        if (d <= 0) {
          return `${head(`${tStr(c.s)} — уже твоё время`, 'Осталось вставать с первого звонка.')}
            <div class="m-real"><div class="m-real-note" data-in style="--i:2">${ic('lightbulb', 20, 2)}<span>Один будильник без «отложить» — и утро твоё.</span></div></div>${cta('Продолжить')}`;
        }
        const hours = Math.round((d * 365) / 60), days = Math.floor(hours / 24), dots = days >= 2 ? Math.min(days, 14) : 0;
        /* На дуге — время с 05:30 до 10:30; точки не подходят вплотную к краям. */
        const u = (m) => Math.max(0.14, Math.min(0.86, (m - 330) / 300)), a = u(mins(c.s.time)), b = Math.max(a + 0.06, u(mins(c.s.now))), pb = arcPt(b), pa = arcPt(a);
        return `${head(`${tStr(c.s)} — это реально`)}
          <div class="m-real">
            <div class="rl js-rl" data-in style="--i:1" data-a="${a.toFixed(3)}" data-b="${b.toFixed(3)}"><span class="rl-plus">${ic('sunrise', 15, 2.3)}+${dur(d)} утра</span>
              <svg viewBox="0 0 320 156" aria-hidden="true"><path class="rl-arc" d="M30 146A130 130 0 0 1 290 146"/>
                <path class="rl-gain js-gain" pathLength="1" d="M30 146A130 130 0 0 1 290 146" stroke-dasharray="0 1" stroke-dashoffset="${(-b).toFixed(3)}"/>
                <line class="rl-ground" x1="8" x2="312" y1="146" y2="146"/>
                <circle class="rl-now" cx="${pb[0].toFixed(1)}" cy="${pb[1].toFixed(1)}" r="6"/><circle class="rl-goal" cx="${pa[0].toFixed(1)}" cy="${pa[1].toFixed(1)}" r="4"/>
                <g class="rl-sun js-sun" transform="translate(${pb[0].toFixed(1)} ${pb[1].toFixed(1)})"><circle r="19"/><g transform="translate(-13 -11.2) scale(.042)">${markIn()}</g></g></svg>
              <div class="rl-cap"><b>${ic('sun', 13, 2.6)}${tStr(c.s)} · цель</b><span><i></i>${fmt(mins(c.s.now))} · сейчас</span></div></div>
            <div class="m-real-n" data-in style="--i:2"><mark class="js-mk"><span class="js-n">0</span></mark><small>${pl(hours, 'час', 'часа', 'часов')} в год</small></div>
            ${dots ? `<div class="rl-days" data-in style="--i:3"><div>${Array.from({ length: dots }, () => `<i>${Sonly.mark()}</i>`).join('')}</div><small>это ${days} ${pl(days, 'сутки', 'суток', 'суток')} утра</small></div>` : ''}
            <div class="m-real-note" data-in style="--i:4">${ic('lightbulb', 20, 2)}<span>Один будильник без «отложить» — и это время твоё.</span></div>
          </div>${cta('Продолжить')}`;
      },
      mount(el, c) {
        const rl = c.q('.js-rl');
        if (!rl) return;
        const a = +rl.dataset.a, b = +rl.dataset.b, sun = c.q('.js-sun'), gain = c.q('.js-gain'), n = c.q('.js-n'), dots = c.qa('.rl-days i');
        const hours = Math.round(((mins(c.s.now) - mins(c.s.time)) * 365) / 60);
        const put = (v) => { const [x, y] = arcPt(v); sun.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); gain.setAttribute('stroke-dasharray', `${(b - v).toFixed(3)} 1`); gain.setAttribute('stroke-dashoffset', (-v).toFixed(3)); };
        put(b);
        c.seq([[700, () => c.tween(1400, (e) => put(b + (a - b) * e), () => rl.classList.add('done'), (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2))],
          [1700, () => c.tween(1300, (q) => { n.textContent = Math.round(hours * q); })], ...dots.map((x, i) => [2000 + i * 90, () => x.classList.add('on')]), [3300, () => c.q('.js-mk').classList.add('on')]]);
      },
    },

    days: {
      render: (c) => {
        const key = [...c.s.days].sort().join(''), n = c.s.days.length;
        const preset = (id, k, name) => `<button class="a-preset${key === k ? ' on' : ''}" data-act="preset:${id}">${name}</button>`;
        const text = !n ? 'Выбери хотя бы один день' : n === 7 ? 'Каждый день' : `${cap(daysText(c.s.days))} · ${n} ${pl(n, 'день', 'дня', 'дней')} в неделю`;
        return `${head('В какие дни звонить?')}
          <div class="a-days-wrap"><span class="m-days-cap${n ? '' : ' none'}">${ic('calendar-days', 15, 2.1)}${text}</span>
            <div class="a-days">${DAYS.map((d, i) => `<button class="a-day${c.s.days.includes(i) ? ' on' : ''}" data-act="day:${i}"><b>${d[0]}</b><small>${d}</small></button>`).join('')}</div>
            <div class="a-presets">${preset('week', '01234', 'Будни')}${preset('all', '0123456', 'Каждый день')}${preset('weekend', '56', 'Выходные')}</div></div>
          ${cta('Продолжить', { need: 'days' })}`;
      },
    },
    notify: {
      render: (c) => `${head('Разреши будильнику звонить', 'Без уведомлений телефон не даст sonly тебя разбудить.')}
        <div class="a-perm">
          <div class="a-dialog" data-in style="--i:2"><b>sonly хочет отправлять тебе\u00a0уведомления</b><div class="a-dialog-b"><button data-act="deny">Не разрешать</button><button class="yes" data-act="allow">Разрешить</button></div><span class="a-hand">${ic('pointer', 26, 1.8)}</span></div>
          <p class="a-perm-warn">${c.s._denied ? 'Без уведомлений будильник не сможет зазвонить.' : ''}</p>
          <div class="a-perm-list" data-in style="--i:3">
            <div>${ic('alarm-clock', 22, 1.8)}<span><b>Звонок будильника</b><small>Сработает, даже если приложение закрыто</small></span></div>
            <div>${ic('triangle-alert', 22, 1.8)}<span><b>Предупреждения</b><small>Скажем заранее, если звонку что\u2011то мешает</small></span></div></div>
        </div>${cta('Разрешить уведомления', { act: 'allow' })}`,
      on(act, arg, t, c) {
        if (act === 'allow') { c.s.notify = true; c.s._denied = false; c.next(); return true; }
        if (act === 'deny') { c.s._denied = true; c.flow.rerender(); return true; }
        return false;
      },
    },

    promise: {
      render: (c) => `${head('Обещание себе')}
          <div class="m-pact"><div class="m-pact-card${c.s.sign ? ' signed' : ''}" data-in style="--i:2">
            <div class="m-pact-top">${Sonly.logo()}<small>${today()}</small></div>
            <p class="m-pact-text">${cap(when(c.s))} встаю в <b class="m-pact-t">${tStr(c.s)}</b> — с&nbsp;первого звонка.</p>
            <div class="m-pact-sign${c.s.sign ? ' has draw' : ''}">
              <span class="m-pact-hint">${ic('pen-line', 15, 2)}Подпись</span><i class="m-pact-line"></i>
              <svg class="js-sign" viewBox="0 0 342 160"><path d=""/></svg>
              <button class="m-pact-clear" data-act="sign-clear" aria-label="Стереть подпись">${ic('rotate-ccw', 15, 2.2)}</button>
            </div>
            <span class="m-pact-seal" aria-hidden="true"><svg viewBox="0 0 100 100"><defs><path id="mSealP" d="M50 50m-33 0a33 33 0 1 1 66 0a33 33 0 1 1-66 0"/></defs><circle class="s-bg" cx="50" cy="50" r="48"/><circle class="s-rg" cx="50" cy="50" r="44"/><circle class="s-rg" cx="50" cy="50" r="24"/><text class="s-tx"><textPath href="#mSealP" textLength="205" lengthAdjust="spacing">ПОДПИСАНО · SONLY · ПОДПИСАНО ·</textPath></text><g class="s-mk" transform="translate(34 37.7) scale(.0518)">${markIn()}</g></svg></span>
          </div></div>${cta('Продолжить', { need: 'sign' })}`,
      /* Подпись ставится прямо на листе; как только она достаточно длинная, в углу появляется печать. */
      mount(el, c) {
        const zone = c.q('.m-pact-sign'), card = c.q('.m-pact-card');
        c.pad = signPad(c.q('.js-sign'), { value: c.s.sign, onChange: (d) => { const ok = d.length > 60; c.set('sign', ok ? d : ''); zone.classList.toggle('has', ok); zone.classList.toggle('draw', !!d); card.classList.toggle('signed', ok); } });
      },
      on(act, arg, t, c) { if (act === 'sign-clear') { c.pad.clear(); return true; } return false; },
    },

    /* Сборка будильника: процент в кольце, под ним список — строки отмечаются по мере готовности. */
    loading: {
      chrome: false, noBack: true,
      render: (c) => {
        const t = taskOf(c.s), C = (2 * Math.PI * 62).toFixed(1);
        const list = [[ic('alarm-clock', 18, 2), 'Время подъёма', tStr(c.s)], [ic('calendar-days', 18, 2), 'Дни', daysText(c.s.days)], [tic(t, 20), 'Задание', t.name], [ic('sunrise', 18, 2), 'План на утро', 'Собран и сохранён']];
        return `<div class="a-load">
          <div class="m-ring js-ring"><svg viewBox="0 0 144 144" aria-hidden="true"><circle class="bg" cx="72" cy="72" r="62"/><circle class="fg js-arc" cx="72" cy="72" r="62" stroke-dasharray="${C}" stroke-dashoffset="${C}"/></svg>
            <b><span class="js-pct">0</span><small>%</small></b></div>
          <h1>Собираем твой\u00a0будильник</h1><p class="js-st"></p>
          <div class="a-load-list">${list.map(([i, x, y]) => `<div class="a-load-row"><span class="m-load-i">${i}</span><span><b>${x}</b><small>${y}</small></span><i class="a-load-ic">${ic('check', 14, 3.4)}</i></div>`).join('')}</div>
        </div>${cta('Посмотреть план', { off: true, cls: 'js-go' })}`;
      },
      mount(el, c) {
        const list = c.qa('.a-load-row'), pct = c.q('.js-pct'), arc = c.q('.js-arc'), st = c.q('.js-st'), C = 2 * Math.PI * 62;
        const lines = [`Ставим будильник на ${tStr(c.s)}`, `Отмечаем дни: ${daysText(c.s.days)}`, `Добавляем задание «${taskOf(c.s).name}»`, 'Сохраняем план на утро', 'Всё готово'];
        let shown = -1;
        c.tween(5600, (q) => {
          const v = Math.round(q * 100), k = v >= 100 ? 4 : Math.floor(v / 25);
          pct.textContent = v;
          arc.style.strokeDashoffset = (C * (1 - q)).toFixed(1);
          if (k !== shown) { shown = k; st.textContent = lines[k]; }
          list.forEach((r, i) => { r.classList.toggle('in', v >= i * 25 + 3); r.classList.toggle('ok', v >= (i + 1) * 25); });
        }, () => { c.q('.js-go').disabled = false; c.q('.js-ring').classList.add('done'); }, pace);
      },
    },

    result: {
      chrome: false,
      render: (c) => {
        const t = taskOf(c.s), n = nextRing(c.s.days, c.s.time), k = [...c.s.days].sort().join('');
        const every = k === '0123456' ? 'И так каждый день' : k === '01234' ? 'И так по будням' : k === '56' ? 'И так по выходным' : 'И так в выбранные дни';
        return `<div class="a-res scroll">
          <span class="a-res-badge" data-in>${ic('check', 20, 3)}</span>
          <h1 data-in style="--i:1">Твоё утро готово</h1>
          <p class="m-res-lead" data-in style="--i:2">${cap(when(c.s))} ты встанешь в</p>
          <div class="m-res-time js-time" data-in style="--i:3"></div>
          <p class="m-res-tag" data-in style="--i:4">${TAGLINE[c.s.why] || 'С первого звонка'}</p>
          <svg class="m-res-arrow" viewBox="0 0 44 50" aria-hidden="true"><path class="js-arrow" d="M6 4c14-4 26 2 24 12-2 8-14 8-14 1 0-8 16-6 17 8 1 8-2 14-5 20M36.4 40.5 28 45 26.6 35.6"/></svg>
          <div class="a-card a-plan" data-in style="--i:6"><span class="a-cap">${n.today ? 'Сегодня' : n.tomorrow ? 'Завтра' : WD_NAME[n.d]}</span>
            <div class="a-step"><i>${ic('alarm-clock', 16, 2.2)}</i><span>${tStr(c.s)} — звонит будильник</span></div>
            <div class="a-step"><i>${tic(t, 17)}</i><span>Задание «${t.name}»</span></div>
            <div class="a-step ok"><i>${ic('check', 16, 3.2)}</i><span>Ты на ногах. День начался.</span></div></div>
          <b class="m-res-every" data-in style="--i:8">${every}</b>
          <div class="a-res-days" data-in style="--i:9"><div>${DAYS.map((d, i) => `<i class="${c.s.days.includes(i) ? 'on' : ''}${i === n.d && c.s.days.includes(i) ? ' next' : ''}">${d}</i>`).join('')}</div></div>
          <div class="a-card a-res-sign" data-in style="--i:10"><span class="a-cap">Твоё обещание</span><svg viewBox="0 0 342 160"><path d="${c.s.sign || SIGN_DEMO}"/></svg><small>Подписано ${today()}</small></div>
        </div>${cta('Продолжить', { float: true })}`;
      },
      /* Время докручивается от нынешнего подъёма до нового, затем рисуется стрелка к плану. */
      mount(el, c) {
        const time = c.q('.js-time');
        odo(time, fmt(mins(c.s.now)));
        c.seq([[700, () => odo(time, tStr(c.s))], [1300, () => c.draw(c.q('.js-arrow'), { dur: 700 })]]);
      },
    },

    /* Промокод — билет: до ввода на нём нет ни цен, ни скидок; после верного кода билет «срабатывает» и показывает подарок. */
    promo: {
      render: (c) => {
        const ok = c.s.discount === 'code', err = c.s._promoErr && !ok;
        return `${head('Есть промокод?', ok ? '' : 'Нет кода — пропусти шаг.')}
          <div class="m-promo">
            <div class="m-tkt${ok ? ' ok' : ''}" data-in style="--i:2">
              <div class="tkt-top"><i class="tkt-sun">${Sonly.mark()}</i>
                ${ok ? `<b class="tkt-big">−25 %</b><span>на первый год</span><em>${ic('gift', 15, 2.3)}и ${PRICE.trial} дня бесплатно</em>` : '<b class="tkt-h">Код из видео</b><span>или поста любимого автора</span>'}</div>
              <i class="tkt-cut"></i>
              <div class="tkt-bot"><div class="m-coupon${ok ? ' ok' : ''}${err ? ' err' : ''}"><span class="m-coupon-i">${ic('ticket', 22, 1.9)}</span>
                <input class="js-code" id="m-code" maxlength="7" value="${esc(c.s._code || '')}" placeholder="Промокод" aria-label="Промокод" autocomplete="off" spellcheck="false"${ok ? ' disabled' : ''}>
                ${ok ? `<em>${ic('check', 18, 3)}</em>` : '<button data-act="promo-apply">Применить</button>'}</div></div>
            </div>
            <p class="a-promo-msg${err ? ' err' : ''}">${err ? 'Такого кода нет' : ''}</p>
          </div>${cta(ok ? 'Продолжить' : 'Пропустить')}`;
      },
      mount(el, c) {
        c.q('.js-code').addEventListener('keydown', (e) => {
          const b = e.key === 'Enter' && c.q('[data-act="promo-apply"]');
          if (b) b.click();
        });
      },
    },

    value: {
      render: (c) => `<div class="m-val"><h1 data-in>Твой будильник готов</h1><p data-in style="--i:1">Так он выглядит в приложении. Осталось открыть доступ.</p>
          <div class="m-iphone"><div class="m-iphone-scr"><div class="mi-real">${Sonly.appPreview(c.s)}</div></div></div>
        </div>${cta('Продолжить')}`,
    },

    paywall: {
      chrome: false,
      render: (c) => {
        const o = offer(c.s), year = c.s.plan !== 'month', t = taskOf(c.s);
        return `<div class="a-pw-top">${c.s._offerSeen ? '<span></span>' : `<button class="a-x" data-act="go:offer" aria-label="Закрыть">${ic('x', 22, 2)}</button>`}<button class="a-restore" data-act="restore">Восстановить</button></div>
          <div class="a-pw">
            <h1 data-in>Включи утро без «отложить»</h1>
            <p class="m-pw-sub" data-in style="--i:1">Выключается только заданием.</p>
            <div class="m-pw-you" data-in style="--i:2"><span>${ic('alarm-clock', 21, 2)}</span><div><b>Твой будильник на ${tStr(c.s)}</b><small>${cap(daysText(c.s.days))} · ${t.name}</small></div><em>${ic('check', 14, 3.4)}</em></div>
            <div class="m-pw-why" data-in style="--i:3"><div><span>${ic('alarm-clock-off', 19, 2)}</span><b>Нельзя отложить</b></div><div><span>${ic('layout-grid', 19, 2)}</span><b>${Sonly.TASKS.length} заданий</b></div><div><span>${ic('flame', 19, 2)}</span><b>Серия подъёмов</b></div></div>
            <div class="a-plans" data-in style="--i:4">
              <button class="a-plan-c${year ? ' on' : ''}" data-act="plan:year"><span class="a-plan-tab">Выгоднее на ${o.pct} %</span><i class="a-plan-dot">${ic('check', 13, 3.6)}</i>
                <span><b>Год</b><small>${c.s.discount ? `<s>${o.fullStr}</s> ${o.yearStr} за первый год` : `${o.yearStr} сразу за 12 месяцев`}</small></span><span class="pr">${o.perMonth}<small> / мес</small><small class="day">${o.cents} ${pl(o.cents, 'цент', 'цента', 'центов')} в день</small></span></button>
              <button class="a-plan-c${year ? '' : ' on'}" data-act="plan:month"><i class="a-plan-dot">${ic('check', 13, 3.6)}</i><span><b>Месяц</b><small>За год выйдет ${eur(PRICE.month * 12)}</small></span><span class="pr">${o.monthStr}<small> / мес</small></span></button>
            </div>
            <p class="a-reassure" data-in style="--i:5">${o.trial ? `${ic('gift', 16, 2.4)}По промокоду: ${o.trial} дня бесплатно` : `${ic('check', 16, 3)}Отмена в любой момент в App Store`}</p>
          </div>
          <footer class="a-foot"><button class="a-cta" data-act="pay">${o.trial ? `Попробовать ${o.trial} дня бесплатно` : `Оплатить ${o.pay}`}</button>
            <p class="a-pay-note">${o.trial ? `${o.trial} дня бесплатно, потом ${year ? `${o.yearStr} за первый год. Со второго года — ${o.fullStr} раз в год.` : `${o.monthStr} каждый месяц.`}` : year ? `Спишется ${o.yearStr} сразу. ${c.s.discount ? `Со второго года — ${o.fullStr} раз в год.` : `Продление — ${o.fullStr} раз в год.`}` : `Спишется ${o.monthStr} сразу, затем каждый месяц.`}</p>
            <div class="a-legal-row"><button data-act="legal:Условия использования">Условия</button><button data-act="restore">Восстановить покупку</button><button data-act="legal:Политика конфиденциальности">Конфиденциальность</button></div></footer>`;
      },
      /* Предложение показывается один раз: после него крестика на экране подписки уже нет. */
      on(act, arg, t, c) { if (act === 'go' && arg === 'offer') c.s._offerSeen = true; return false; },
    },

    offer: {
      chrome: false,
      render: (c) => `<div class="a-pw-top"><button class="a-x" data-act="back" aria-label="Закрыть">${ic('x', 22, 2)}</button><button class="a-restore" data-act="restore">Восстановить</button></div>
        <div class="a-off">
          <h1 data-in>Предложение на первый запуск</h1><p data-in style="--i:1">${c.s.discount ? 'Скидка уже применена' : 'Показываем его один раз'}</p>
          <div class="a-off-card" data-in style="--i:2"><span class="a-off-gift">${ic('gift', 26, 1.9)}</span>
            <div class="a-off-line">Первый год со скидкой <span class="a-off-pill">−25 %</span></div>
            <div class="a-off-price"><s>${eur(39.99)}</s><b>${eur(29.99)}</b><small>это ${eur(29.99 / 12)} в месяц</small></div>
            <p class="a-off-after">Со второго года — ${eur(39.99)} в год</p></div>
          <p class="a-reassure" data-in style="--i:3">${ic('check', 16, 3)}Отмена в любой момент в App Store</p>
        </div>
        <footer class="a-foot"><button class="a-cta" data-act="offer-take">Забрать год за ${eur(29.99)}</button><p class="a-pay-note">Спишется ${eur(29.99)} сразу. Со второго года — ${eur(39.99)} раз в год.</p></footer>`,
    },

    done: {
      chrome: false, noBack: true,
      render: (c) => {
        const t = taskOf(c.s), n = nextRing(c.s.days, c.s.time);
        return `<div class="a-done"><div class="a-sun"></div><span class="a-res-badge" data-in>${ic('check', 26, 3)}</span>
            <h1><span data-in style="--i:1">Готово.</span>${((t) => `<span data-in style="--i:2"${t.length > 12 ? ' class="sm"' : ''}>${t}</span>`)(n.today ? 'До утра.' : n.tomorrow ? 'До завтра.' : WD_TILL[n.d])}</h1>
            <p data-in style="--i:4">Выключить можно только заданием.</p>
            <div class="m-done-tile" data-in style="--i:5"><div class="m-atile"><div class="m-atile-top"><small>${daysText(c.s.days)}</small><i class="m-tg js-tg"></i></div><b>${tStr(c.s)}</b><em>${tic(t, 16)}${t.name}</em></div><div class="m-party">${bits()}</div></div>
            <span class="m-done-chip" data-in style="--i:6">${ic('flame', 16, 2.2)}Серия начнётся ${when(c.s)}</span></div>
          <footer class="a-foot" data-in style="--i:8"><button class="a-cta m-open" data-act="open-app">Открыть ${Sonly.logo()}</button></footer>`;
      },
      mount(el, c) { c.seq([[1150, () => c.q('.js-tg').classList.add('on')], [1350, () => c.q('.m-party').classList.add('go')]]); },
    },
  };

  Sonly.register({
    id: 'm', name: 'Онбординг', cls: 'va vm',
    about: 'Онбординг sonly. Кнопка «Открыть sonly» в конце ведёт в приложение.',
    order: ['welcome', 'source', 'q-alarms', 'q-thought', 'm-five', 'q-back', 'compare', 'q-feel', 'm-will', 'q-block', 'graph', 'q-why', 'how', 'catalog', 'task-setup', 'time-now', 'time', 'm-real', 'days', 'notify', 'promise', 'loading', 'result', 'promo', 'value', 'paywall'],
    extra: ['offer', 'done'],
    titles: {
      welcome: 'Старт', source: 'Откуда узнал', 'q-alarms': 'Сколько будильников', 'q-thought': 'Первая мысль', 'm-five': 'Ответ на первую мысль', 'q-back': 'Засыпаешь снова?', compare: 'Два телефона',
      'q-feel': 'Самочувствие', 'm-will': 'Ответ на самочувствие', 'q-block': 'Что мешает', graph: 'График утра', 'q-why': 'Ради чего', how: 'Как звонит', catalog: 'Задания', 'task-setup': 'Настройка задания',
      'time-now': 'Встаёшь сейчас', time: 'Хочешь вставать', 'm-real': '«Это реально»', days: 'Дни', notify: 'Уведомления', promise: 'Подпись', loading: 'Сборка плана', result: 'Итог',
      promo: 'Промокод', value: 'Перед оплатой', paywall: 'Подписка', offer: 'Предложение', done: 'После оплаты',
    },
    chrome: () => `<div class="a-top"><button class="a-back" data-act="back" aria-label="Назад">${ic('chevron-left', 20, 2.4)}</button><div class="a-prog"><i></i></div></div>`,
    defaults: () => ({ now: { h: 8, m: 15 } }),
    demo: () => ({ source: 'Друзья или семья', alarms: 'Четыре-пять', thought: 'Ещё пять минут', back: 'Пару раз в\u00a0неделю', feel: 'Разбито', block: 'Листаю телефон в кровати', why: 'Фора на весь день', task: 'hunt', sign: SIGN_DEMO, notify: true }),
    /* Кнопка на последнем экране открывает приложение, если оболочка умеет его показать. */
    on(flow, act, arg) {
      /* Язык со стартового экрана: список с флагами, выбор сразу перерисовывает экран. */
      if (act === 'lang' && Sonly.i18n) {
        const cur = Sonly.i18n.lang;
        flow.sheet(`<div class="pay-grab"></div><div class="a-langs"><b>Язык</b>${Sonly.i18n.LANGS.map(([id, name]) => `<button class="${id === cur ? 'on' : ''}" data-act="lang-set:${id}" aria-pressed="${id === cur}">${Sonly.i18n.flag(id, 'a-flag')}<span>${name}</span>${id === cur ? ic('check', 18, 3) : ''}</button>`).join('')}</div>`, 'pay');
        return true;
      }
      if (act === 'lang-set' && Sonly.i18n) { flow.closeSheet(); Sonly.i18n.set(arg, flow); return true; }
      if (act !== 'open-app') return false;
      if (flow.opts.onOpenApp) flow.opts.onOpenApp(flow.state); else flow.restart();
      return true;
    },
    screens,
  });
})();
