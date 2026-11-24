/* Блокировка приложений — «Утро без ленты». Включает сам человек. Со звонка все приложения закрыты, пока не выполнено задание;
   по желанию — ещё 15–60 минут после подъёма и вечером перед сном. Открыты всегда звонки и то, что человек добавил в исключения.
   Браузер тоже закрывается, иначе ленту откроют через сайт.
   В настоящем приложении это Экранное время (iOS: FamilyControls, ManagedSettings, DeviceActivity; экран блокировки —
   значок, заголовок, подпись и одна кнопка) и доступ к использованию на Android. В прототипе — настройки, запрос доступа
   и экран блокировки на примере экрана «Домой». */
(() => {
  'use strict';
  const { ic, pad, appKit: K } = Sonly;
  const NB = ' ';
  /* Приложения примера: id, подпись, значок, цвет, категория, множественное число (для «откроются»). Логотипов нет — обобщённые. */
  const APPS = [
    ['feed', 'Лента', 'image', 'linear-gradient(140deg,#F9A13A,#E1306C 52%,#8A3AB9)', 'social'],
    ['clips', 'Ролики', 'clapperboard', 'linear-gradient(140deg,#25262B,#0B0B0D)', 'video', 1],
    ['video', 'Видео', 'tv', 'linear-gradient(140deg,#FF5A5F,#E0242B)', 'video'],
    ['chats', 'Чаты', 'message-circle', 'linear-gradient(140deg,#48C6F5,#1E96D9)', 'chats', 1],
    ['games', 'Игры', 'gamepad-2', 'linear-gradient(140deg,#9C7BFF,#5B3BE0)', 'games', 1],
    ['news', 'Новости', 'newspaper', 'linear-gradient(140deg,#FFB23F,#F27A0F)', 'news', 1],
    ['shop', 'Покупки', 'shopping-bag', 'linear-gradient(140deg,#FFD84D,#F5A800)', 'shop', 1],
    ['music', 'Музыка', 'music', 'linear-gradient(140deg,#FF6B81,#E8264A)', 'other'],
    ['maps', 'Карты', 'map', 'linear-gradient(140deg,#5BE07E,#1BAF6A)', 'other', 1],
    ['mail', 'Почта', 'mail', 'linear-gradient(140deg,#57A6FF,#1A6FE8)', 'other'],
    ['bank', 'Банк', 'landmark', 'linear-gradient(140deg,#2FD1B5,#0E9F8A)', 'other'],
    ['camera', 'Камера', 'camera', 'linear-gradient(140deg,#B9B9C0,#7C7C85)', 'other'],
  ].map(([id, name, icon, bg, cat, many]) => ({ id, name, icon, bg, cat, many: !!many }));
  const DOCK = [
    { id: 'phone', name: 'Телефон', icon: 'phone', bg: 'linear-gradient(140deg,#5BE07E,#1BAF6A)', cat: 'phone' },
    { id: 'messages', name: 'Сообщения', icon: 'message-square', bg: 'linear-gradient(140deg,#5BE07E,#22B85A)', cat: 'other', many: true },
    { id: 'browser', name: 'Браузер', icon: 'compass', bg: 'linear-gradient(140deg,#62B0FF,#1F72EA)', cat: 'web' },
    { id: 'sonly', name: 'sonly', icon: '', bg: 'linear-gradient(140deg,#FFE070,#FFC21A)', cat: 'sonly' },
  ];
  const ALL = APPS.concat(DOCK);
  const app = (id) => ALL.find((a) => a.id === id);
  /* Что можно оставить открытым в режиме «Все приложения». */
  const EXC = ['messages', 'maps', 'music', 'bank', 'mail', 'camera', 'chats', 'browser'];
  /* Категории для режима «Только выбранные». */
  const CATS = [['social', 'Соцсети', 'heart'], ['video', 'Видео и ролики', 'clapperboard'], ['games', 'Игры', 'gamepad-2'], ['chats', 'Мессенджеры', 'message-circle'], ['news', 'Новости', 'newspaper'], ['shop', 'Покупки', 'shopping-bag'], ['web', 'Браузер', 'compass']];
  const EXTRA = [[0, 'Нет'], [15, '15 мин'], [30, '30 мин'], [60, '1 час']];
  const SOS = [[0, 'Нельзя'], [1, '1 раз'], [3, '3 раза']];
  /* Что внутри категорий — для подписи (в приложении это настоящие приложения с телефона). */
  const IN_CAT = { social: 'Лента, фото, истории', video: 'Ролики, видео, стримы', games: 'Все игры', chats: 'Чаты и каналы', news: 'Новости и подборки', shop: 'Магазины и скидки', web: 'Сайты в браузере' };
  /* Пример недели: сколько раз утром тянулся к закрытому приложению. */
  const WEEK = [6, 4, 5, 2, 3, 1, 2];
  const COLORS = { lock: '#5E5CE6' };

  /** Настройки блокировки; создаются при первом обращении. */
  const conf = (s) => { const L = s.lock || (s.lock = { on: false, perm: false, denied: false, extra: 30, night: false, nh: 23, nm: 0, mode: 'all', allow: ['messages'], cats: ['social', 'video', 'games'], strict: true }); if (L.weekend == null) L.weekend = true; if (L.sos == null) L.sos = 3; if (L.used == null) L.used = 0; return L; };
  /** Состояние экрана примера: сценарий, открытое приложение, подсказка. */
  const ui = (s) => s._lk || (s._lk = { scene: 'morning', app: null, toast: '' });
  /** Закрыто ли приложение при текущих настройках. Звонки и сам sonly не закрываются никогда. */
  const shut = (L, a) => a.cat !== 'phone' && a.cat !== 'sonly' && (L.mode === 'all' ? !L.allow.includes(a.id) : L.cats.includes(a.cat));
  const dur = (n) => (n >= 60 ? '1' + NB + 'час' : n + NB + 'мин');
  const hhmm = (h, m) => `${h}:${pad(m)}`;
  /** Ближайший звонок (для подписей) или 7:30, если будильников нет. */
  function ring(s) {
    const r = K.nextRing(s, new Date());
    return r ? { h: r.a.h, m: r.a.m } : { h: 7, m: 30 };
  }
  const plus = (t, n) => { const v = t.h * 60 + t.m + n; return { h: Math.floor(v / 60) % 24, m: v % 60 }; };

  /** Подпись под строкой в настройках. */
  function status(s) {
    return conf(s).on ? when(s) : 'Выключена';
  }
  /** Строка «когда» для главной и подсказок. */
  function when(s) {
    const L = conf(s), r = ring(s), start = L.night ? `С ${hhmm(L.nh, L.nm)}` : `С ${hhmm(r.h, r.m)}`;
    return `${start} до${NB}подъёма${L.extra ? ` и${NB}ещё ${dur(L.extra)}` : ''}`;
  }
  /** Карточка на главной — только когда блокировка включена. */
  function home(s, i) {
    const L = conf(s);
    if (!L.on) return '';
    return `<button class="ap-card lk-home" data-act="page:lock" data-in style="--i:${i}"><i>${ic('lock', 19, 2.3)}</i><span><b>Утро без ленты</b><small>${when(s)}</small></span>${K.chev()}</button>`;
  }

  /** Плитка приложения: маленькая (в карточке сверху) или с подписью (на экране примера). */
  function tile(a, off, big) {
    const face = a.id === 'sonly' ? `<span class="lk-mark">${Sonly.mark()}</span>` : ic(a.icon, big ? 25 : 15, 2.1);
    /* Гаснет только лицо значка, замочек остаётся жёлтым: фильтр на всю плитку перекрасил бы и его. */
    const icon = `<i class="lk-ic${off ? ' off' : ''}"><b class="lk-face" style="--ab:${a.bg}">${face}</b>${off ? `<u>${ic('lock', big ? 11 : 8, 3)}</u>` : ''}</i>`;
    return big ? `<button class="lk-app" data-act="lk-app:${a.id}" aria-label="${a.name}${off ? ' — закрыто' : ''}">${icon}<span class="lk-name">${a.name}</span></button>` : icon;
  }
  const seg = (act, cur, opts, cls = '') => `<div class="ap-seg sm${cls ? ' ' + cls : ''}">${opts.map(([v, name]) => `<button class="${cur === v ? 'on' : ''}" data-act="${act}:${v}" aria-pressed="${cur === v}">${name}</button>`).join('')}</div>`;
  const toggle = (act, on, label, sm = true) => `<button class="ap-tg${sm ? ' sm' : ''}${on ? ' on' : ''}" data-act="${act}" role="switch" aria-checked="${on}" aria-label="${label}"></button>`;
  /* Пункт, который не выключить: справа только замок — надпись «Всегда» на узком экране ломала подпись. */
  const lockRow = (icon, label, note) => `<div class="ap-row tall"><i class="ap-row-i">${icon}</i><span>${label}<small>${note}</small></span><em class="lk-always" title="Всегда" aria-label="Всегда">${ic('lock', 15, 2.4)}</em></div>`;

  /** Главная страница блокировки. */
  function main(s) {
    const L = conf(s), all = L.mode === 'all';
    const minis = APPS.map((a) => tile(a, L.on && shut(L, a), false)).join('');
    const hero = `<div class="lk-hero${L.on ? ' on' : ''}">
        <div class="lk-mini" aria-hidden="true">${minis}</div>
        <div class="lk-hero-t"><b>Утро без ленты</b><p>Пока не проснёшься, приложения закрыты${NB}— ни ленты, ни${NB}видео.</p></div>
        ${L.on ? `<div class="lk-hero-sw"><span>${ic('lock', 15, 2.5)}Включена</span>${toggle('lk-toggle', L.on, 'Блокировка приложений', false)}</div>` : ''}</div>`;
    /* Сегодня по шагам: вечером закрывается (если включено), звонок, задание, через сколько откроется. */
    const r = ring(s), open = plus(r, 2 + L.extra);
    const steps = [L.night ? [ic('moon', 15, 2.3), hhmm(L.nh, L.nm), 'закроется'] : null, [ic('alarm-clock', 15, 2.3), hhmm(r.h, r.m), 'звонок'], [ic('check', 15, 2.6), 'задание', 'проснулся'], [ic('lock-open', 15, 2.3), L.extra ? hhmm(open.h, open.m) : 'сразу', 'откроется']].filter(Boolean);
    const today = L.on ? `<h3>Сегодня</h3><div class="ap-card lk-steps">${steps.map(([i, b, sm], k) => `<span class="lk-st${k === steps.length - 1 ? ' end' : ''}"><i>${i}</i><b>${b}</b><small>${sm}</small></span>`).join('')}</div>` : '';
    const max = Math.max(...WEEK), demoWeek = s.data === 'demo';
    const stats = L.on || demoWeek ? `<h3>Утро без ленты<span class="lk-h-r">неделя</span></h3><div class="ap-card lk-week">${demoWeek ? `<div class="lk-wk-n"><span><b>${WEEK.reduce((a, x) => a + x, 0)}</b><small>раз тянулся к ленте</small></span><span><b>3${NB}ч 20${NB}мин</b><small>утром без ленты</small></span></div>
        <div class="lk-bars">${WEEK.map((x, i) => `<span><i style="--h:${(x / max).toFixed(3)}"></i><small>${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i]}</small></span>`).join('')}</div><p class="lk-wk-t">${ic('trending-down', 15, 2.4)}Тянешься к телефону всё реже</p>` : `<p class="lk-wk-e">Покажем после первого утра: сколько раз тянулся к ленте и сколько минут прошло без неё.</p>`}</div>` : '';
    const denied = L.denied && !L.perm ? `<div class="ap-card lk-warn">${ic('triangle-alert', 18, 2.2)}<span><b>Нет доступа к${NB}Экранному времени</b><small>Без него sonly не может закрывать приложения</small></span><button data-act="lk-toggle">Дать доступ</button></div>` : '';
    const whenHtml = `<h3>Когда закрывать</h3>
      <div class="ap-card ap-list">
        ${lockRow(ic('alarm-clock', 17, 2.1), 'Со звонка до подъёма', `Пока не выполнишь задание`)}
        <div class="ap-row col"><div><i class="ap-row-i">${ic('sunrise', 17, 2.1)}</i><span>И ещё после подъёма</span></div>${seg('lk-extra', L.extra, EXTRA)}</div>
        <div class="ap-row tall"><i class="ap-row-i">${ic('moon', 17, 2.1)}</i><span>Вечером перед сном<small>${L.night ? `С ${hhmm(L.nh, L.nm)} до${NB}звонка` : `Чтобы не листать в${NB}кровати`}</small></span>${toggle('lk-night', L.night, 'Вечером перед сном')}</div>
        ${L.night ? K.row(ic('clock', 17, 2.1), 'Со скольки', hhmm(L.nh, L.nm), 'page:lock-night') : ''}
        <div class="ap-row tall"><i class="ap-row-i">${ic('calendar', 17, 2.1)}</i><span>В выходные тоже<small>${L.weekend ? 'Каждый день с будильником' : 'Только по будням'}</small></span>${toggle('lk-weekend', L.weekend, 'В выходные тоже')}</div>
      </div>`;
    const exc = L.allow.map(app).filter(Boolean).map((a) => `<div class="ap-row"><i class="ap-row-i lk-ri" style="--ab:${a.bg}">${ic(a.icon, 16, 2.2)}</i><span>${a.name}</span><button class="lk-rm" data-act="lk-ex:${a.id}" aria-label="Закрывать «${a.name}» тоже">${ic('minus', 14, 3)}</button></div>`).join('');
    const whatHtml = `<h3>Что закрывать</h3>
      ${seg('lk-mode', L.mode, [['all', 'Все приложения'], ['pick', 'Только выбранные']], 'lk-mode')}
      ${all ? `<div class="ap-card ap-list lk-list">
          ${lockRow(`<span class="lk-ri-in" style="--ab:${DOCK[0].bg}">${ic('phone', 16, 2.2)}</span>`, 'Телефон', 'Звонки работают всегда')}
          ${exc}
          <button class="ap-row" data-act="page:lock-ex"><i class="ap-row-i">${ic('plus', 17, 2.4)}</i><span>Оставить открытым…</span>${K.chev()}</button></div>
        <p class="ap-note">Браузер тоже закроется${NB}— иначе ленту откроют через${NB}сайт.</p>`
        : `<div class="ap-card ap-list lk-list">${CATS.map(([id, name, icon]) => `<div class="ap-row tall"><i class="ap-row-i">${ic(icon, 17, 2.1)}</i><span>${name}<small>${IN_CAT[id]}</small></span>${toggle('lk-cat:' + id, L.cats.includes(id), name)}</div>`).join('')}</div>
        ${L.cats.length ? '' : `<p class="ap-note lk-bad">Выбери хотя бы одно — иначе закрывать${NB}нечего.</p>`}`}`;
    const rules = `<h3>Правила</h3>
      <div class="ap-card ap-list"><div class="ap-row tall"><i class="ap-row-i">${ic('shield-check', 17, 2.1)}</i><span>Снять только${NB}заданием<small>Утром выключатель не${NB}сработает</small></span>${toggle('lk-strict', L.strict, 'Снять только заданием')}</div>
        <div class="ap-row col"><div><i class="ap-row-i">${ic('siren', 17, 2.1)}</i><span>Экстренно открыть<small>${L.sos ? `В месяц, после 10${NB}секунд ожидания` : 'До задания не откроется ничего'}</small></span></div>${seg('lk-sos', L.sos, SOS)}</div></div>`;
    const demo = `<button class="ap-card ap-try lk-try" data-act="page:lock-demo">${ic('smartphone', 17, 2.3)}<span>Как это выглядит</span>${K.chev()}</button>`;
    return ['Блокировка приложений', `${hero}${denied}${today}${stats}${whenHtml}${whatHtml}${rules}${demo}`, L.on ? '' : '<button class="ap-btn" data-act="lk-toggle">Включить блокировку</button>'];
  }

  /** Что оставить открытым в режиме «Все приложения». */
  function exceptions(s) {
    const L = conf(s);
    return ['Оставить открытым', `<p class="ap-note first">Остальное закроется, пока ты не${NB}проснёшься.</p>
      <div class="ap-card ap-list">${EXC.map(app).map((a) => { const on = L.allow.includes(a.id); return `<button class="ap-row ap-snd${on ? ' on' : ''}" data-act="lk-ex:${a.id}" aria-pressed="${on}"><i class="ap-row-i lk-ri" style="--ab:${a.bg}">${ic(a.icon, 16, 2.2)}</i><span>${a.name}</span><b class="ap-radio">${ic('check', 13, 3.4)}</b></button>`; }).join('')}</div>
      ${L.allow.includes('chats') || L.allow.includes('browser') ? `<p class="ap-note">${ic('info', 14, 2.3)} В чатах и браузере тоже бывает лента${NB}— оставляй, только если без них никак.</p>` : ''}`, '', 'page:lock'];
  }

  /** Время вечерней блокировки — колесом, как время будильника. */
  function night(s) {
    const L = conf(s);
    return ['Перед сном', `<div class="ap-card ap-ed-time lk-wheel"><div class="js-lkwheel"></div></div>
      <p class="ap-note">С этого времени приложения закроются и откроются утром${NB}— после задания.</p>`, '', 'page:lock'];
  }

  /** Экран блокировки на примере экрана «Домой»: нажал на приложение — видишь, что будет утром. */
  function demo(s) {
    const L = conf(s), u = ui(s), r = ring(s), scenes = [['morning', 'Утром']].concat(L.extra ? [['after', 'После подъёма']] : []).concat(L.night ? [['night', 'Перед сном']] : []);
    if (!scenes.some(([v]) => v === u.scene)) u.scene = 'morning';
    const clock = u.scene === 'night' ? plus({ h: L.nh, m: L.nm }, 12) : u.scene === 'after' ? plus(r, 6) : plus(r, 1);
    const a = u.app && app(u.app), opens = a && (a.many ? 'откроются' : 'откроется');
    const unlock = plus(r, 2 + L.extra);
    const shield = a ? `<div class="lk-shield" role="dialog" aria-label="Экран блокировки">
        <div class="lk-sh-in"><i class="lk-sh-i"><span class="lk-mark">${Sonly.mark()}</span><u>${ic('lock', 13, 3)}</u></i>
          <b>${u.scene === 'night' ? 'Пора спать' : u.scene === 'after' ? 'Утро без ленты' : 'Сначала проснись'}</b>
          <p>${a.name} ${opens} ${u.scene === 'night' ? 'после будильника' : u.scene === 'after' ? `в${NB}${hhmm(unlock.h, unlock.m)}` : 'после задания'}</p></div>
        ${u.wait > 0 ? `<div class="lk-sos-w"><b>${u.wait}</b><small>Подожди — точно нужно?</small></div><button class="lk-sh-btn ghost" data-act="lk-sos-stop">Не надо</button>`
          : `<button class="lk-sh-btn" data-act="lk-shield-close">Понятно</button>${L.sos && u.scene !== 'night' ? `<button class="lk-sh-sos" data-act="lk-sos-go"${L.used >= L.sos ? ' disabled' : ''}>${L.used >= L.sos ? 'Экстренные на этот месяц закончились' : `Мне срочно · осталось ${L.sos - L.used} из ${L.sos}`}</button>` : ''}`}</div>` : '';
    const phone = `<div class="lk-phone lk-${u.scene}">
        <div class="lk-sb"><span>${hhmm(clock.h, clock.m)}</span><i></i><span class="lk-sb-r">${ic('signal', 13, 2.6)}${ic('wifi', 13, 2.6)}${ic('battery-full', 16, 2.2)}</span></div>
        <div class="lk-grid">${APPS.map((x) => tile(x, shut(L, x), true)).join('')}</div>
        <div class="lk-dock">${DOCK.map((x) => tile(x, shut(L, x), true)).join('')}</div>
        ${u.toast ? `<div class="lk-toast">${u.toast}</div>` : ''}
        ${shield}</div>`;
    return ['Как это выглядит', `${scenes.length > 1 ? seg('lk-scene', u.scene, scenes, 'lk-scenes') : ''}${phone}
      <p class="ap-note lk-tap">Нажми на любое приложение.</p>`, '', 'page:lock'];
  }

  function page(s, id) {
    if (id === 'lock-ex') return exceptions(s);
    if (id === 'lock-night') return night(s);
    if (id === 'lock-demo') return demo(s);
    return main(s);
  }

  /** После открытия страницы: колесо времени для вечерней блокировки. */
  function mount(flow) {
    const host = flow.sheets.querySelector('.js-lkwheel');
    if (!host) return;
    const L = conf(flow.state);
    Sonly.wheel(host, { h: L.nh, m: L.nm, onChange: (h, m) => { L.nh = h; L.nm = m; } });
  }

  const reopen = (flow, id) => K.openPage(flow, id || (flow.state._page && flow.state._page[0]) || 'lock');
  /** Запрос доступа: сначала своё объяснение, потом системное окно (в прототипе — его подобие). */
  function askPerm(flow) {
    flow.sheet(`<div class="msg lk-ask"><i class="lk-ask-i">${ic('hourglass', 26, 2.2)}<u>${ic('lock', 12, 3)}</u></i><b>Нужен доступ к${NB}Экранному времени</b>
      <p>Так sonly сможет закрывать приложения до${NB}подъёма. Что ты в них делаешь, мы не${NB}видим.</p>
      <div class="msg-col"><button class="msg-ok lk-go" data-act="lk-ask">Продолжить</button><button class="msg-ok ghost" data-act="lk-back">Не сейчас</button></div></div>`, 'center');
  }
  function systemAlert(flow) {
    flow.sheet(`<div class="lk-sys"><b>Приложение «sonly» запрашивает доступ к${NB}Экранному времени</b>
      <p>Доступ позволит ему ограничивать приложения и сайты на этом iPhone.</p>
      <div class="lk-sys-b"><button data-act="lk-sys:ok">Продолжить</button><button data-act="lk-sys:no">Не разрешать</button></div></div>`, 'center lk-sys-sheet');
  }

  Sonly.lock = {
    page, mount, status, home, conf,
    /** Для «Готовности к звонку»: строка проверки, если блокировка включена. */
    ready: (s) => conf(s).on,
    on(flow, act, arg) {
      const s = flow.state, L = conf(s), u = ui(s);
      switch (act) {
        case 'lk-toggle':
          if (L.on) {
            flow.sheet(`<div class="msg"><b>Выключить блокировку?</b><p>Утром приложения будут открыты${NB}— лента снова под${NB}рукой.</p><div class="msg-two"><button class="msg-ok" data-act="lk-back">Оставить</button><button class="msg-ok red" data-act="lk-off">Выключить</button></div></div>`, 'center');
            return true;
          }
          if (!L.perm) { askPerm(flow); return true; }
          L.on = true;
          flow.rerender(true);
          reopen(flow, 'lock');
          return true;
        case 'lk-ask': systemAlert(flow); return true;
        case 'lk-sys':
          if (arg === 'ok') { L.perm = true; L.denied = false; L.on = true; } else L.denied = true;
          /* Экран под листом (настройки, главная) тоже показывает, включена ли блокировка. */
          flow.rerender(true);
          reopen(flow, 'lock');
          return true;
        case 'lk-off': L.on = false; flow.rerender(true); reopen(flow, 'lock'); return true;
        case 'lk-back': reopen(flow, 'lock'); return true;
        case 'lk-extra': L.extra = +arg; reopen(flow); return true;
        case 'lk-night': L.night = !L.night; reopen(flow); return true;
        case 'lk-mode': L.mode = arg; reopen(flow); return true;
        case 'lk-cat': L.cats = L.cats.includes(arg) ? L.cats.filter((x) => x !== arg) : L.cats.concat(arg); reopen(flow); return true;
        case 'lk-ex': L.allow = L.allow.includes(arg) ? L.allow.filter((x) => x !== arg) : L.allow.concat(arg); reopen(flow); return true;
        case 'lk-strict': L.strict = !L.strict; reopen(flow); return true;
        case 'lk-weekend': L.weekend = !L.weekend; reopen(flow); return true;
        case 'lk-sos': L.sos = +arg; reopen(flow); return true;
        /* Экстренно: десять секунд на подумать, потом приложение открывается на 5 минут и тратится одна попытка. */
        case 'lk-sos-go': {
          if (L.used >= L.sos || u.wait > 0) return true;
          u.wait = 10;
          reopen(flow, 'lock-demo');
          clearInterval(u.timer);
          u.timer = setInterval(() => {
            if (!flow.sheets.querySelector('.lk-shield')) { clearInterval(u.timer); u.wait = 0; return; }
            u.wait -= 1;
            if (u.wait <= 0) { clearInterval(u.timer); u.wait = 0; L.used += 1; const a = app(u.app); u.app = null; u.toast = `${a ? a.name : 'Приложение'} открыто на${NB}5${NB}минут`; }
            reopen(flow, 'lock-demo');
          }, flow.shot ? 1e9 : 1000);
          return true;
        }
        case 'lk-sos-stop': clearInterval(u.timer); u.wait = 0; reopen(flow, 'lock-demo'); return true;
        case 'lk-scene': u.scene = arg; u.app = null; u.toast = ''; reopen(flow, 'lock-demo'); return true;
        /* Нажатие на приложение в примере: закрытое — экран блокировки, открытое — короткая подсказка. */
        case 'lk-app': {
          const a = app(arg);
          if (!a) return true;
          if (shut(L, a)) { u.app = arg; u.toast = ''; } else {
            u.app = null;
            u.toast = a.cat === 'phone' ? 'Звонки работают всегда' : a.cat === 'sonly' ? 'Здесь утреннее задание' : `${a.name} — в${NB}исключениях, ${a.many ? 'открыты' : 'открыто'}`;
          }
          reopen(flow, 'lock-demo');
          return true;
        }
        case 'lk-shield-close': clearInterval(u.timer); u.wait = 0; u.app = null; reopen(flow, 'lock-demo'); return true;
        default: return false;
      }
    },
  };
  Object.assign(Sonly.lock, { COLORS });
})();
