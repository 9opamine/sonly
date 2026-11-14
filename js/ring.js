/* Звонок будильника: экран звонка, задание и экран подъёма.
   Экраны заданий всегда тёмные, сверху логотип, текста — одна строка. Пока задание выполняется, снизу встаёт солнце.
   Фото-задания — камера на весь экран; в «Найди предмет» предмет выбирает крутка в жёлтом квадрате.
   Примеры, викторина, память, пары и фраза работают по-настоящему. Камеры и датчиков в прототипе нет:
   снимок «проверяется» по нажатию затвора, а приседания, отжимания и прыжки показывает нарисованный человек со скелетом —
   так в приложении повторы будет считать ИИ по камере, без кнопки. */
(() => {
  'use strict';
  const { ic, emo, esc, pad, taskOpts: TO, sound, appKit: K } = Sonly;
  const app = Sonly.concepts.app;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const norm = (x) => x.trim().toLowerCase().replace(/ё/g, 'е');
  const shuffle = (list) => { for (let i = list.length - 1; i > 0; i--) { const j = rnd(0, i); [list[i], list[j]] = [list[j], list[i]]; } return list; };
  const pic = (x) => TO.pic(x);

  /* Камера и ИИ по-настоящему, если окно их даёт (https, разрешение). ?cam=0 — всегда пример без камеры. */
  const NOCAM = new URLSearchParams(location.search).get('cam') === '0';
  const canLive = () => !NOCAM && !!Sonly.vision && Sonly.vision.supported();
  /* Подсказки на камере повторов: что сделать, чтобы счёт пошёл. Одна строка. */
  const PLACE = { squat: 'Поставь телефон и отойди на 2 шага', jump: 'Поставь телефон и отойди на 2 шага', pushup: 'Положи телефон сбоку и прими упор' };
  const HINT = { wait: 'Включаем камеру…', load: 'Загружаем ИИ…', body: 'Отойди — нужно видеть тебя целиком', floor: 'Прими упор лёжа боком к камере', go: 'Камера считает сама' };
  const hintOf = (h, id) => (h === 'none' ? PLACE[id] : HINT[h] || HINT.go);
  /* Почему камера не включилась — коротко, одной строкой. */
  const NOCAM_SAY = { insecure: 'Камера недоступна в этом окне', denied: 'Нет доступа к камере', none: 'Камера не найдена', busy: 'Камера занята', model: 'ИИ не загрузился' };
  /* Как назвать то, что ИИ увидел вместо нужного: «Похоже на …». */
  const SEEN_ACC = { bed_made: 'кровать', bed_unmade: 'кровать', sky: 'небо', pills: 'таблетки' };

  /* Как проверяется задание: math, quiz, memory, pairs, phrase — по-настоящему; cam и pose — камерой и ИИ, count — датчиками; voice — с заменой. */
  const KIND = { math: 'math', quiz: 'quiz', memory: 'memory', pairs: 'pairs', phrase: 'phrase', hunt: 'cam', bed: 'cam', sky: 'cam', pills: 'cam', qr: 'cam', squat: 'pose', pushup: 'pose', jump: 'pose', steps: 'count', shake: 'count', rhythm: 'rhythm', tongue: 'voice' };
  /* Что снимать в остальных фото-заданиях. Картинок для них пока нет — показываем эмодзи. */
  const SHOT = { bed: { emo: '🛏️', acc: 'заправленную кровать' }, sky: { emo: '🌤️', acc: 'небо за окном' }, pills: { emo: '💊', acc: 'свои витамины' } };
  /* Картинки — эмодзи Apple: одинаково на любом телефоне. */
  Object.values(SHOT).forEach((x) => { x.img = Sonly.emoSrc(x.emo); });
  /* Викторина: флаг, страна, «чья столица» и столица. */
  const LANDS = [
    ['🇫🇷', 'Франция', 'Франции', 'Париж'], ['🇩🇪', 'Германия', 'Германии', 'Берлин'], ['🇮🇹', 'Италия', 'Италии', 'Рим'], ['🇪🇸', 'Испания', 'Испании', 'Мадрид'],
    ['🇯🇵', 'Япония', 'Японии', 'Токио'], ['🇧🇷', 'Бразилия', 'Бразилии', 'Бразилиа'], ['🇨🇦', 'Канада', 'Канады', 'Оттава'], ['🇺🇦', 'Украина', 'Украины', 'Киев'],
    ['🇵🇱', 'Польша', 'Польши', 'Варшава'], ['🇬🇧', 'Великобритания', 'Великобритании', 'Лондон'], ['🇺🇸', 'США', 'США', 'Вашингтон'], ['🇸🇪', 'Швеция', 'Швеции', 'Стокгольм'],
    ['🇳🇴', 'Норвегия', 'Норвегии', 'Осло'], ['🇰🇷', 'Южная Корея', 'Южной Кореи', 'Сеул'], ['🇲🇽', 'Мексика', 'Мексики', 'Мехико'], ['🇦🇺', 'Австралия', 'Австралии', 'Канберра'],
    ['🇬🇷', 'Греция', 'Греции', 'Афины'], ['🇵🇹', 'Португалия', 'Португалии', 'Лиссабон'], ['🇨🇭', 'Швейцария', 'Швейцарии', 'Берн'], ['🇹🇷', 'Турция', 'Турции', 'Анкара'],
    ['🇳🇱', 'Нидерланды', 'Нидерландов', 'Амстердам'], ['🇮🇳', 'Индия', 'Индии', 'Нью-Дели'], ['🇦🇷', 'Аргентина', 'Аргентины', 'Буэнос-Айрес'], ['🇫🇮', 'Финляндия', 'Финляндии', 'Хельсинки'],
    ['🇨🇿', 'Чехия', 'Чехии', 'Прага'], ['🇪🇬', 'Египет', 'Египта', 'Каир'],
  ];
  const COUNT = { squat: 'приседаний', pushup: 'отжиманий', jump: 'прыжков', steps: 'шагов', shake: 'встряхиваний', rhythm: 'ударов ритма' };
  /* Скелет для заданий с повторами: 14 точек тела и кости между ними. a — верхняя точка движения, b — нижняя; ms — один повтор.
     Порядок точек: голова, шея, плечи, локти, запястья, бёдра, колени, стопы (левая, правая). */
  const BONES = [[1, 2], [1, 3], [2, 4], [4, 6], [3, 5], [5, 7], [2, 8], [3, 9], [8, 9], [8, 10], [10, 12], [9, 11], [11, 13]];
  const STAND = [[120, 46], [120, 74], [94, 84], [146, 84], [86, 122], [154, 122], [84, 158], [156, 158], [104, 160], [136, 160], [102, 212], [138, 212], [100, 264], [140, 264]];
  const POSE = {
    squat: { ms: 1500, a: STAND, b: [[120, 100], [120, 126], [94, 136], [146, 136], [97, 152], [143, 152], [109, 146], [131, 146], [102, 206], [138, 206], [76, 218], [164, 218], [96, 264], [144, 264]] },
    jump: { ms: 820, a: STAND, b: [[120, 24], [120, 52], [94, 62], [146, 62], [74, 40], [166, 40], [68, 10], [172, 10], [104, 138], [136, 138], [88, 188], [152, 188], [76, 238], [164, 238]] },
    pushup: { ms: 1300, floor: 238,
      a: [[48, 150], [66, 160], [76, 166], [80, 162], [76, 198], [82, 196], [76, 232], [84, 230], [140, 180], [144, 176], [176, 198], [180, 194], [212, 218], [216, 214]],
      b: [[46, 196], [64, 202], [76, 206], [80, 202], [98, 196], [102, 192], [76, 232], [84, 230], [140, 214], [144, 210], [176, 222], [180, 218], [212, 228], [216, 224]] },
  };
  const poseAt = (id, u) => POSE[id].a.map((p, i) => [p[0] + (POSE[id].b[i][0] - p[0]) * u, p[1] + (POSE[id].b[i][1] - p[1]) * u]);
  /** Ход одного повтора: вниз, короткая пауза, вверх. Возвращает 0 в верхней точке и 1 в нижней. */
  const wave = (t) => { const s = (x) => x * x * (3 - 2 * x); return t < 0.44 ? s(t / 0.44) : t < 0.56 ? 1 : 1 - s((t - 0.56) / 0.44); };
  /* Крутка: расстояние между предметами и середина экрана телефона. */
  const STEP = 150, MID = 195;
  const reelX = (i) => (MID - (i + 0.5) * STEP).toFixed(1);

  function problem(level) {
    if (level === 'easy') { const a = rnd(3, 15), b = rnd(2, 12); return a > b && Math.random() < 0.5 ? { q: `${a} − ${b}`, a: a - b } : { q: `${a} + ${b}`, a: a + b }; }
    if (level === 'hard') { const a = rnd(110, 199), b = rnd(21, 89), c = rnd(13, 49); return { q: `${a} − ${b} + ${c}`, a: a - b + c }; }
    if (Math.random() < 0.5) { const a = rnd(12, 29), b = rnd(3, 8); return { q: `${a} × ${b}`, a: a * b }; }
    const a = rnd(24, 79), b = rnd(13, 58);
    return { q: `${a} + ${b}`, a: a + b };
  }
  /** Вопросы викторины: страны не повторяются, у каждого вопроса четыре ответа. */
  function quizOf(topic, n) {
    return shuffle(LANDS.slice()).slice(0, n).map((land) => {
      const cap = topic === 'capitals' || (topic === 'mix' && Math.random() < 0.5), col = cap ? 3 : 1;
      const opts = shuffle([land, ...shuffle(LANDS.filter((x) => x !== land)).slice(0, 3)]).map((x) => x[col]);
      return { flag: land[0], q: cap ? `Столица ${land[2]}?` : 'Чей это флаг?', opts, a: opts.indexOf(land[col]) };
    });
  }
  /** Новый узор для задания «Память»: клеток на одну больше, чем сторона поля. */
  function pattern(k) {
    const cells = new Set();
    while (cells.size < k.size + 1) cells.add(rnd(0, k.size * k.size - 1));
    Object.assign(k, { cells: [...cells], hit: [], miss: -1, phase: 'show', showMs: 1400 + cells.size * 180 });
  }
  /** Крутка для «Найди предмет»: случайная лента предметов, на 22-м месте — тот, который надо снять. */
  function spin(k, list) {
    const others = list.filter((x) => !k.target || x.id !== k.target.id);
    k.target = others[rnd(0, others.length - 1)] || list[0];
    const reel = Array.from({ length: 25 }, () => list[rnd(0, list.length - 1)]);
    reel[22] = k.target;
    Object.assign(k, { reel, T: 22, phase: 'spin' });
  }
  /** Готовит задание по настройкам будильника. */
  function begin(r) {
    const t = K.taskOf(r.a), o = TO.get(r.a, t.id), k = { kind: KIND[t.id], i: 0, n: 1 };
    if (k.kind === 'math') Object.assign(k, { n: o.n, list: Array.from({ length: o.n }, () => problem(o.level)), input: '' });
    else if (k.kind === 'quiz') Object.assign(k, { n: o.n, list: quizOf(o.topic, o.n), ok: null, bad: [] });
    else if (k.kind === 'memory') { k.size = +o.size; k.n = o.n; pattern(k); }
    else if (k.kind === 'pairs') { const pics = shuffle(TO.objects({ off: [] })).slice(0, o.n); k.n = o.n; k.cards = shuffle([...pics, ...pics]).map((p, id) => ({ id, p, open: false, done: false })); }
    else if (k.kind === 'phrase') Object.assign(k, { text: TO.sample('phrase', 'len', o.len), val: '' });
    else if (k.kind === 'voice') Object.assign(k, { text: TO.sample('tongue', 'level', o.level), phase: 'idle', got: [], heard: '' });
    else if (k.kind === 'rhythm') Object.assign(k, { beats: o.n, ref: Sonly.rhythm.make(o.n), phase: 'intro', taps: [], marks: null, tries: 0 });
    else if (k.kind === 'count' || k.kind === 'pose') { k.n = o.n; k.auto = { steps: 520, shake: 300 }[t.id] || 0; }
    else if (t.id === 'hunt') { k.list = TO.objects(o); k.rerolls = 1; spin(k, k.list); }
    else if (t.id === 'qr') Object.assign(k, { phase: 'aim', qr: true, target: { acc: o.code === 'own' ? 'свой код sonly' : 'любой штрихкод' } });
    else Object.assign(k, { phase: 'aim', target: SHOT[t.id] });
    r.k = k;
  }
  /* Ритм слушают, скороговорку говорят: пока идёт такое задание, звонок молчит (и «Заглушить» не глушит удары).
     Вернулся на экран звонка — звонит снова, с той же громкостью и тем же «заглушено». */
  const QUIET = { voice: 1, rhythm: 1 };
  function hush(flow, r) {
    if (!r || r.hushed || flow.shot) return;
    r.hushed = true;
    sound.stop();
    sound.mute(false);
  }
  function unhush(flow, r) {
    if (!r || !r.hushed) return;
    r.hushed = false;
    if (r.direct || flow.shot) return;
    sound.play(r.a.sound, { loop: true });
    if (r.mute) sound.mute(true);
  }
  /** iPhone даёт датчики движения только после разрешения, и спросить можно лишь по нажатию — оно здесь и есть. */
  function askMotion(k) {
    const D = window.DeviceMotionEvent;
    if (k && k.kind === 'count' && k.auto && D && typeof D.requestPermission === 'function') D.requestPermission().then((r) => { if (r !== 'granted') k.sensors = 'off'; }, () => { k.sensors = 'off'; });
  }
  const ensure = (s) => { if (!s._ring) s._ring = { a: K.copy(s.alarms.find((a) => a.on) || s.alarms[0] || K.blank(s)), test: true, t0: Date.now() }; return s._ring; };

  /**
   * Запускает звонок. test — проверка из приложения: её можно закрыть, в серию она не идёт.
   * from — куда вернуться после проверки; o.direct — пробный запуск: сразу задание, без звонка и звука.
   */
  function start(flow, alarm, test, from, o = {}) {
    const s = flow.state, a = K.copy(alarm);
    let random = false;
    if (a.task === 'random') { const pool = K.poolOf(alarm); a.task = pool[rnd(0, pool.length - 1)]; random = true; }
    clearTimeout(flow._chk);
    s._check = null;
    s._ring = { a, test, random, direct: !!o.direct, t0: Date.now(), mute: false, from: from || (['ring', 'task', 'woke', 'check'].includes(flow.id) ? 'home' : flow.id) };
    flow.closeSheet(true);
    if (o.direct) { begin(s._ring); askMotion(s._ring.k); sound.unlock(); s._ring.t1 = Date.now(); flow.go('task', 1); return; }
    flow.go('ring', 1);
    if (!flow.shot) { sound.setVolume(s.volume); sound.play(alarm.sound, { loop: true, rise: alarm.rise }); }
  }
  /** Выход со звонка или проверки: туда, откуда пришли. Из редактора и выбора задания — обратно в них. */
  function exit(flow) {
    const s = flow.state, r = s._ring || {}, back = r.from === 'editor' || r.from === 'picker';
    sound.stop();
    s._ring = null;
    flow.go(back || !r.from ? 'home' : r.from, 0);
    if (back) { K.editor(flow); if (r.from === 'picker') K.taskPicker(flow, ''); }
  }
  /** Проверка подъёма: «Ты не спишь?». Если не ответить за минуту, будильник зазвонит снова. */
  function checkNow(flow, alarm) {
    const s = flow.state;
    if (s._ring) return;
    s._check = { a: K.copy(alarm), t0: Date.now() };
    flow.closeSheet(true);
    flow.go('check', 1);
    if (!flow.shot) sound.tick(988);
  }
  /** Задание выполнено: звонок замолкает, настоящий подъём попадает в историю. */
  function finish(flow) {
    const s = flow.state, r = s._ring, now = new Date();
    r.secs = Math.max(1, Math.round((Date.now() - (r.t1 || Date.now())) / 1000));
    r.at = nowHM();
    sound.stop();
    if (!r.test) {
      const day = K.day0(now).getTime();
      s.log = (s.log || []).filter((x) => x.t !== day).concat({ t: day, wake: now.getHours() * 60 + now.getMinutes(), secs: r.secs, task: r.a.task });
      const a = s.alarms.find((x) => x.id === r.a.id);
      if (a && a.once) a.on = false;
      if (r.a.check && !flow.shot) { const again = K.copy(r.a); flow._chk = setTimeout(() => checkNow(flow, again), r.a.check * 60000); }
    }
    if (!flow.shot) { sound.tick(784); setTimeout(() => sound.tick(1175), 140); }
    sunrise(flow);
  }
  /**
   * Переход к «Доброе утро»: солнце встаёт (в повторах — то самое, что росло), небо светлеет,
   * и солнце плавно переезжает на своё место на экране подъёма.
   */
  function sunrise(flow) {
    const box = flow.cur && flow.cur.firstElementChild;
    if (flow.still || !box || REDUCE()) { flow.go('woke', 1); return; }
    const grown = box.querySelector('.tk-grow');
    const layer = document.createElement('div');
    layer.className = 'sr';
    layer.innerHTML = `<i class="sr-sky"></i>${grown ? '' : `<i class="sr-sun"><i class="sr-glow"></i>${Sonly.mark()}</i>`}`;
    box.appendChild(layer);
    box.classList.add('rising');
    if (grown) grown.classList.add('final');
    if (flow.el.dataset.theme !== 'dark') flow.el.dataset.sb = 'dark';
    void layer.offsetWidth;
    layer.classList.add('go');
    flow.at(1350, () => {
      const sun = (grown || layer).querySelector('.mark');
      const a = sun.getBoundingClientRect(), p = flow.el.getBoundingClientRect(), k = p.width / flow.el.offsetWidth || 1;
      flow.state._ring.morph = { x: (a.left - p.left) / k, y: (a.top - p.top) / k, w: a.width / k };
      flow.go('woke', 0);
    });
  }
  const REDUCE = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step = (flow, k) => { k.i++; if (k.i >= k.n) finish(flow); else flow.rerender(); };
  /** Засчитанный повтор: число и солнце обновляются на месте, без перерисовки — солнце растёт плавно. На последнем — восход. */
  function count(flow, k) {
    if (k.i >= k.n) return;
    k.i++;
    sound.tick(520 + k.i * 14);
    const root = flow.cur, box = root && root.querySelector('.tk-grow'), num = root && root.querySelector('.js-cnt');
    if (!box || !num || flow.still) flow.rerender();
    else {
      box.style.setProperty('--g', (k.i / k.n).toFixed(3));
      num.textContent = k.i;
      num.classList.remove('pop');
      void num.offsetWidth;
      num.classList.add('pop');
      const tk = root.querySelector('.tk');
      if (tk) tk.style.setProperty('--p', (k.i / k.n).toFixed(2));
    }
    if (k.i >= k.n) flow.wait(520, () => finish(flow));
  }

  /* ── Разметка заданий ────────────────────────────────────── */

  /**
   * Фраза: что уже набрано. Знаки препинания и тире не набирают — они засчитываются сами; регистр и «ё» не важны.
   * Возвращает отметки по каждому знаку образца ('ok', 'no', 'cur' — следующий, '' — ещё не набран) и готовность.
   */
  function typed(text, val) {
    const keep = (ch) => /[a-zа-яё0-9 ]/i.test(ch), low = (ch) => ch.toLowerCase().replace('ё', 'е');
    const got = [...val.replace(/\s+/g, ' ').replace(/^ /, '')].filter(keep).map(low);
    const marks = [];
    let j = 0, bad = 0, lastSpace = true, cur = false;
    [...text].forEach((ch, i) => {
      const skip = !keep(ch) || (ch === ' ' && lastSpace);
      if (skip) { marks[i] = j > 0 && j <= got.length ? 'ok' : ''; return; }
      lastSpace = ch === ' ';
      if (j < got.length) { const ok = got[j] === low(ch); marks[i] = ok ? 'ok' : 'no'; if (!ok) bad++; } else if (!cur) { marks[i] = 'cur'; cur = true; } else marks[i] = '';
      j++;
    });
    return { marks, done: !bad && got.length === j, over: got.length > j, pct: Math.min(1, got.length / (j || 1)), bad };
  }
  const spans = (k) => { const st = typed(k.text, k.val); return [...k.text].map((ch, i) => `<span class="${st.marks[i] || ''}">${ch === ' ' ? ' ' : esc(ch)}</span>`).join(''); };
  const head = (k, x) => `<header class="tk-top"><button class="tk-x lg" data-act="task-back" aria-label="Назад">${ic(x || 'chevron-left', 22, 2.3)}</button><div class="tk-logo">${Sonly.logo()}</div><span class="tk-n"></span></header>`;
  /** Прогресс задания отрезками: пройденные — жёлтые, текущий — пульсирует. */
  const prog = (n, done) => (n < 2 ? '' : `<div class="tk-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${done}">${Array.from({ length: n }, (_, i) => `<i class="${i < done ? 'on' : i === done ? 'now' : ''}"></i>`).join('')}</div>`);
  /* Скороговорка: что написать под микрофоном в каждом состоянии. Одна строка. */
  const VOICE = { idle: 'Нажми и скажи вслух', listen: 'Слушаю — говори', ok: 'Чётко!', retry: 'Почти — скажи ещё раз', silence: 'Не слышно — скажи громче', denied: 'Нет доступа к микрофону', nomic: 'Микрофон не найден', network: 'Нужен интернет для распознавания', none: 'Распознавание речи недоступно', error: 'Не получилось — ещё раз', demo: 'Пример: слова загораются сами' };
  /* Ритм: заголовок по состоянию. */
  const RHYTHM = { intro: 'Слушай ритм', play: 'Слушай ритм', tap: 'Повтори ритм', ok: 'Точно в ритм!', fast: 'Слишком быстро', slow: 'Слишком медленно', off: 'Сбился — слушай ещё', count: 'Не достучал — слушай ещё' };
  const BODY = {
    math: (k) => {
      const q = k.list[Math.min(k.i, k.n - 1)], st = k.solved ? ' ok' : k.bad ? ' bad' : '';
      return `<div class="tk-body tk-math">${prog(k.n, k.i)}
        <div class="tk-q${st}${k.fresh ? ' in' : ''}"><i class="tk-qglow"></i><span>${q.q}</span><b>${k.input ? esc(k.input) : '<i></i>'}</b>${k.solved ? `<u class="tk-okb">${ic('check', 22, 3.4)}</u>` : ''}</div>
        <p class="tk-say-st${k.bad ? ' bad' : ''}">${k.bad ? 'Не то — попробуй ещё раз' : ' '}</p>
        <div class="tk-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-act="key:${n}">${n}</button>`).join('')}<button data-act="key:del" aria-label="Стереть">${ic('delete', 24, 2)}</button><button data-act="key:0">0</button><button class="ok" data-act="key:ok" aria-label="Ответить"${k.input && !k.solved ? '' : ' disabled'}>${ic('check', 26, 3)}</button></div></div>`;
    },
    memory: (k) => {
      const left = k.cells.length - k.hit.length;
      return `<div class="tk-body tk-mem">${prog(k.n, k.i)}<h2 class="tk-h">${k.phase === 'show' ? 'Запомни клетки' : k.phase === 'bad' ? 'Не та клетка' : 'Повтори узор'}</h2>
        <div class="tk-memhint">${k.phase === 'show' ? `<i class="tk-membar" style="--d:${k.showMs}ms"></i>` : k.phase === 'input' ? `<span class="tk-dots">${k.cells.map((_, i) => `<i class="${i < k.hit.length ? 'on' : ''}"></i>`).join('')}</span><small>${left === 1 ? 'Осталась 1 клетка' : `Осталось ${left} ${K.pl(left, 'клетка', 'клетки', 'клеток')}`}</small>` : '<small>Смотри ещё раз</small>'}</div>
        <div class="tk-grid${k.phase === 'show' ? ' show' : ''}" style="--n:${k.size}">${Array.from({ length: k.size * k.size }, (_, i) => `<button class="${k.phase === 'show' && k.cells.includes(i) ? 'lit' : k.hit.includes(i) ? 'hit' : i === k.miss ? 'miss' : k.phase === 'bad' && k.cells.includes(i) ? 'was' : ''}" style="--d:${k.cells.indexOf(i) * 90}ms" data-act="cell:${i}" aria-label="Клетка ${i + 1}"${k.phase === 'input' ? '' : ' disabled'}></button>`).join('')}</div></div>`;
    },
    quiz: (k) => {
      const q = k.list[Math.min(k.i, k.n - 1)];
      return `<div class="tk-body tk-quiz">${prog(k.n, k.i)}<div class="tk-qcard${k.ok == null && !k.bad.length ? ' new' : ''}"><i class="tk-qglow"></i><span class="tk-flag">${emo(q.flag, 'tk-flagimg')}</span><h2 class="tk-h">${q.q}</h2></div>
        <div class="tk-ans">${q.opts.map((x, j) => { const cl = k.ok === j ? 'ok' : k.bad.includes(j) ? 'no' : ''; return `<button class="${cl}" data-act="ans:${j}"${k.ok != null || k.bad.includes(j) ? ' disabled' : ''}><i>${cl === 'ok' ? ic('check', 18, 3.4) : cl === 'no' ? ic('x', 18, 3.4) : 'АБВГ'[j]}</i><span>${esc(x)}</span></button>`; }).join('')}</div></div>`;
    },
    pairs: (k) => `<div class="tk-body tk-pairs">${prog(k.n, k.i)}<h2 class="tk-h">${k.i >= k.n ? 'Все пары найдены' : 'Найди пары'}</h2>
        <div class="tk-cards${k.cards.length > 16 ? ' c5' : ''}">${k.cards.map((c) => `<button class="tk-cardx${c.open || c.done ? ' open' : ''}${c.done ? ' done' : ''}${k.just === c.id ? ' flip' : ''}${k.wait && c.open && !c.done ? ' no' : ''}" data-act="card:${c.id}" aria-label="Карточка"><i class="tk-back">${Sonly.mark()}</i>${pic(c.p)}</button>`).join('')}</div></div>`,
    phrase: (k) => {
      const st = typed(k.text, k.val);
      return `<div class="tk-body tk-top-al tk-phrase"><h2 class="tk-h">Перепечатай</h2><div class="tk-text js-text">${spans(k)}</div>
        <div class="tk-bar"><i class="js-bar" style="transform:scaleX(${st.pct.toFixed(3)})"></i></div>
        <input class="tk-input js-in" value="${esc(k.val)}" placeholder="Печатай здесь" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-label="Фраза"></div>`;
    },
    /* Повторы: солнце из логотипа — сначала маленькое и серое, с каждым повтором больше и жёлтее. */
    count: (k, t) => `<div class="tk-body tk-count"><h2 class="tk-h">${k.n} ${COUNT[t.id]}</h2>
        <div class="tk-grow${k.i >= k.n ? ' final' : ''}" style="--g:${(k.i / k.n).toFixed(3)}"><i class="tk-glow"></i>${Sonly.mark()}</div>
        <p class="tk-cnt"><b class="js-cnt">${k.i}</b><span>из ${k.n}</span></p>
        <p class="tk-live ${t.id}">${K.tic(t, 24)}<span>${k.sensors === 'off' ? 'Датчиков нет — пример' : t.id === 'steps' ? 'Шагай — телефон считает' : 'Тряси телефон'}</span></p></div>`,
    /* Скороговорка: слова загораются, как только распознаватель их услышал. */
    voice: (k) => {
      const shown = k.text.split(/\s+/), ph = k.phase, rec = ph === 'listen' || ph === 'demo';
      return `<div class="tk-body tk-voice"><h2 class="tk-h">${ph === 'ok' ? 'Чётко!' : 'Скажи вслух'}</h2>
        <div class="tk-say${ph === 'ok' ? ' ok' : ''}">${shown.map((w, i) => `<span class="tk-w${k.got[i] ? ' got' : ph === 'retry' && k.tried ? ' miss' : ''}" data-i="${i}">${esc(w).replace(/-/g, '‑')}</span>`).map((x, i, all) => (i < all.length - 1 ? x + (i === all.length - 2 ? ' ' : ' ') : x)).join('')}</div>
        <p class="tk-heard js-heard">${k.heard ? `«${esc(k.heard.length > 44 ? '…' + k.heard.slice(-43) : k.heard)}»` : ' '}</p>
        <button class="tk-mic${rec ? ' rec' : ''}${ph === 'ok' ? ' ok' : ''}" data-act="mic" aria-label="${rec ? 'Остановить' : 'Говорить'}"${ph === 'ok' ? ' disabled' : ''}><i class="tk-micw"></i><i class="tk-micw w2"></i>${ic(ph === 'ok' ? 'check' : rec ? 'square' : 'mic', rec ? 26 : 34, 2.4)}</button>
        <p class="tk-st js-st${['denied', 'nomic', 'network', 'none', 'error', 'silence'].includes(ph) ? ' warn' : ''}">${VOICE[ph] || VOICE.idle}</p></div>`;
    },
    /* Ритм: сначала слушаешь, потом стучишь по солнцу; точки на дорожке — удары с паузами. */
    rhythm: (k) => {
      const end = k.ref[k.ref.length - 1], ph = k.phase, res = ph === 'ok' || ph === 'bad';
      const dot = (i) => (res && k.marks ? (k.marks[i] ? 'good' : 'bad') : ph === 'tap' && i < k.taps.length ? 'tap' : '');
      return `<div class="tk-body tk-rhythm"><h2 class="tk-h">${ph === 'bad' ? RHYTHM[k.why] || RHYTHM.off : RHYTHM[ph]}</h2>
        <div class="tk-track js-track"><u></u>${k.ref.map((t, i) => `<i class="${dot(i)}" style="--x:${((t / end) * 100).toFixed(2)}%"></i>`).join('')}</div>
        <button class="tk-pad js-pad${ph === 'tap' ? ' on' : ''}${ph === 'ok' ? ' ok' : ''}" aria-label="Стучи здесь"${ph === 'tap' ? '' : ' disabled'}><i class="tk-padring"></i><i class="tk-padring r2"></i>${Sonly.mark()}</button>
        <p class="tk-st">${ph === 'tap' ? `Стучи по солнцу · ${k.taps.length} из ${k.beats}` : ph === 'ok' ? ' ' : `${emo('👂', 'tk-ear')}Запомни паузы`}</p>
        <button class="tk-again" data-act="rh-replay"${ph === 'tap' ? '' : ' disabled'}>${ic('rotate-ccw', 15, 2.5)}Послушать ещё раз</button></div>`;
    },
  };
  const FEED = '<div class="cam-feed"><i class="cf-wall"></i><i class="cf-desk"></i><i class="cf-light"></i><i class="cf-bokeh b1"></i><i class="cf-bokeh b2"></i><i class="cf-bokeh b3"></i></div>';

  /* ── Скороговорка ─────────────────────────────────────────── */

  /** Обновляет слова и строку «услышано» на месте, без перерисовки: распознаватель присылает текст много раз в секунду. */
  function paintVoice(root, k) {
    if (!root) return;
    root.querySelectorAll('.tk-w').forEach((w) => { const on = !!k.got[+w.dataset.i]; if (on && !w.classList.contains('got')) { w.classList.add('got', 'pop'); } });
    const h = root.querySelector('.js-heard');
    if (h) h.textContent = k.heard ? `«${k.heard.length > 44 ? '…' + k.heard.slice(-43) : k.heard}»` : ' ';
  }
  /** Нажатие на микрофон: начать слушать, остановить или, если речи распознать нечем, показать пример. */
  function micTap(flow, k) {
    if (k.phase === 'ok') return;
    if (k.phase === 'listen' || k.phase === 'demo') { if (k.eng) k.eng.stop(); return; }
    const S = Sonly.say, root = () => flow.cur;
    const how = S && S.engine();
    if (!how || k.phase === 'none' || k.phase === 'denied') { k.phase = 'demo'; k.got = []; k.heard = ''; flow.rerender(); return; }
    k.phase = 'listen';
    k.tried = true;
    k.heard = '';
    k.got = [];
    k.eng = S.listen({
      lang: 'ru-RU',
      onText(list) {
        const m = S.match(k.text, list);
        k.heard = list[0] || '';
        m.got.forEach((g, i) => { if (g) k.got[i] = true; });
        paintVoice(root(), k);
        if (m.ok && k.phase === 'listen') { k.phase = 'ok'; k.got = k.got.map(() => true); if (k.eng) k.eng.stop(); sound.tick(1175); flow.rerender(); flow.wait(1100, () => finish(flow)); }
      },
      onEnd(reason) {
        k.eng = null;
        if (k.phase !== 'listen') return;
        k.phase = reason === 'end' || reason === 'stopped' ? 'retry' : reason;
        if (!VOICE[k.phase]) k.phase = 'error';
        flow.rerender();
      },
    });
    flow.rerender();
  }
  function mountVoice(c, k) {
    const el = c.el;
    c.flow.leave = (next) => { if (next !== 'task' && k.eng) k.eng.stop(); };
    /* Нечем распознавать: сразу говорим об этом, а не после нажатия. */
    if (k.phase === 'idle' && Sonly.say && !Sonly.say.engine()) { k.phase = 'none'; c.flow.rerender(); return; }
    if (k.phase === 'demo') {
      /* Пример без распознавания: слова загораются по очереди, как будто их сказали. */
      const words = k.text.split(/\s+/);
      words.forEach((w, i) => c.wait(500 + i * 380, () => { k.got[i] = true; k.heard = words.slice(0, i + 1).join(' ').toLowerCase().replace(/[,.]/g, ''); paintVoice(el, k); }));
      c.wait(700 + words.length * 380, () => { k.phase = 'ok'; sound.tick(1175); c.flow.rerender(); });
    }
    if (k.phase === 'ok') c.wait(1100, () => finish(c.flow));
  }

  /* ── Ритм ─────────────────────────────────────────────────── */

  function mountRhythm(c, k) {
    const el = c.el, track = c.q('.js-track'), pad = c.q('.js-pad'), dots = track ? [...track.querySelectorAll('i')] : [];
    const pulse = () => { pad.classList.remove('hit'); void pad.offsetWidth; pad.classList.add('hit'); };
    if (k.phase === 'intro') c.wait(650, () => { k.phase = 'play'; c.flow.rerender(); });
    if (k.phase === 'play') {
      /* Образец: звук стоит в расписании звуковой карты, точки и солнце мигают в такт. */
      const lead = 450;
      k.ref.forEach((t, i) => { sound.drum((lead + t) / 1000, false); c.wait(lead + t, () => { dots[i].classList.add('lit'); pulse(); }); });
      c.wait(lead + k.ref[k.ref.length - 1] + 750, () => { k.phase = 'tap'; k.taps = []; c.flow.rerender(); });
    }
    if (k.phase === 'tap') {
      const gap = Math.max(...k.ref.slice(1).map((t, i) => t - k.ref[i]));
      let wait = 0;
      const judge = () => {
        const r = Sonly.rhythm.score(k.ref, k.taps);
        k.marks = r.marks;
        k.why = r.why;
        k.phase = r.ok ? 'ok' : 'bad';
        k.tries += r.ok ? 0 : 1;
        sound.tick(r.ok ? 1175 : 247);
        c.flow.rerender();
      };
      const down = (e) => {
        e.preventDefault();
        if (c.flow.cur !== el || k.phase !== 'tap') return;
        k.taps.push(performance.now());
        const i = k.taps.length - 1;
        sound.drum(0, true);
        pulse();
        if (dots[i]) dots[i].classList.add('tap');
        const st = c.q('.tk-st');
        if (st) st.textContent = `Стучи по солнцу · ${k.taps.length} из ${k.beats}`;
        clearTimeout(wait);
        if (k.taps.length >= k.beats) { c.wait(180, judge); return; }
        /* Замолчал надолго — значит, сбился: проверяем, что успел. */
        wait = setTimeout(() => { if (c.flow.cur === el && k.phase === 'tap' && k.taps.length) judge(); }, gap * 2.4 + 600);
      };
      pad.addEventListener('pointerdown', down);
      c.flow.leave = () => clearTimeout(wait);
    }
    if (k.phase === 'ok') c.wait(1000, () => finish(c.flow));
    if (k.phase === 'bad') c.wait(1900, () => { k.phase = 'play'; k.taps = []; k.marks = null; c.flow.rerender(); });
  }

  /** Человек для меню настройки: повторяет упражнение без скриптов (анимация SVG прямо в разметке). */
  function anim(id) {
    const A = poseAt(id, 0), B = poseAt(id, 1), d = (POSE[id].ms / 1000).toFixed(2);
    const av = (attr, a, b) => `<animate attributeName="${attr}" values="${a};${b};${b};${a}" keyTimes="0;.42;.58;1" dur="${d}s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;0 0 1 1;.45 0 .55 1"/>`;
    const line = (cls, [p, q]) => `<line class="${cls}" x1="${A[p][0]}" y1="${A[p][1]}" x2="${A[q][0]}" y2="${A[q][1]}">${av('x1', A[p][0], B[p][0])}${av('y1', A[p][1], B[p][1])}${av('x2', A[q][0], B[q][0])}${av('y2', A[q][1], B[q][1])}</line>`;
    const dot = (cls, i, r) => `<circle class="${cls}" cx="${A[i][0]}" cy="${A[i][1]}" r="${r}">${av('cx', A[i][0], B[i][0])}${av('cy', A[i][1], B[i][1])}</circle>`;
    const torso = (P) => [2, 3, 9, 8].map((i) => P[i].join(',')).join(' ');
    const flat = !!POSE[id].floor;
    return `<svg class="ps-fig tp-figsvg${flat ? ' flat' : ''}" viewBox="${flat ? '22 124 212 127' : '0 0 240 300'}" aria-hidden="true">${POSE[id].floor ? `<line class="ps-floor" x1="14" x2="226" y1="${POSE[id].floor}" y2="${POSE[id].floor}"/>` : ''}
      <g class="ps-body"><polygon points="${torso(A)}"><animate attributeName="points" values="${torso(A)};${torso(B)};${torso(B)};${torso(A)}" keyTimes="0;.42;.58;1" dur="${d}s" repeatCount="indefinite"/></polygon>${BONES.map((b) => line('b', b)).join('')}${dot('', 0, 19)}</g>
      <g class="ps-skel">${BONES.map((b) => line('s', b)).join('')}${A.map((_, i) => (i ? dot('j', i, 4.6) : dot('h', 0, 19))).join('')}</g></svg>`;
  }

  /** Что сказать, если снимок не засчитан: одна короткая строка. */
  function missSay(k, res) {
    const T = k.target || {};
    if (res.why === 'screen') return 'Сними сам предмет, а не экран';
    if (res.why === 'unmade') return 'Кровать ещё не заправлена';
    if (res.why === 'unsure') return 'Не разглядеть — подойди ближе';
    const seen = res.seen && (SEEN_ACC[res.seen] || (TO.objects({ off: [] }).find((x) => x.id === res.seen) || {}).acc);
    return seen ? `Это похоже на ${seen}` : `Не вижу ${T.acc}`;
  }

  /**
   * Фото-задание: камера на весь экран, поверх неё — только прозрачные элементы.
   * k.live === 'on' — настоящая камера: в квадрате пустой видоискатель, снимок проверяет ИИ. Иначе — пример с нарисованным предметом.
   */
  function camera(k) {
    const spinning = k.phase === 'spin' || k.phase === 'stop', T = k.target || {}, busy = k.phase === 'scan' || k.phase === 'done', live = k.live === 'on', miss = k.phase === 'miss';
    const loading = live && k.ai !== 'ok' && k.phase === 'aim';
    const say = loading ? HINT.load : k.phase === 'done' ? 'Готово' : k.phase === 'scan' ? 'Проверяем снимок…' : miss ? missSay(k, k.res || {}) : k.qr ? `Отсканируй ${T.acc}` : k.list ? `Найди и сфотографируй ${T.acc}` : `Сними ${T.acc}`;
    const note = !live && k.nocam ? `<span class="cam-note">${NOCAM_SAY[k.nocam] || NOCAM_SAY.busy} — пример</span>` : '';
    /* Проверка снимка: уголки сходятся на предмете, по нему проходит блик; когда предмет узнан — уголки зеленеют. */
    const lock = busy || live ? `<i class="cam-lk"><u></u><u></u><u></u><u></u></i>${T.img && k.phase === 'scan' && !live ? '<i class="cam-sweep"></i>' : ''}` : '';
    const scene = spinning
      ? `<p class="cam-find">Найди:</p>
         <div class="spin${k.phase === 'stop' ? ' stop' : ''}"><i class="spin-frame"></i><div class="spin-track js-track" style="transform:translateX(${reelX(k.phase === 'stop' ? k.T : 1)}px)">${k.reel.map((o, i) => `<span class="spin-i${k.phase === 'stop' && i === k.T ? ' hit' : ''}">${pic(o)}</span>`).join('')}</div></div>`
      : `<div class="cam-pill top lg${busy || miss ? ' ' + k.phase : ''}" data-lg="pill"><b>${say}</b>${note}${k.list && k.rerolls && k.phase === 'aim' ? `<button data-act="respin">${ic('rotate-ccw', 14, 2.6)}Ещё раз</button>` : ''}</div>
         ${k.qr ? `<div class="cam-qr${busy ? ' ' + k.phase : ''}"><i></i><i></i><i></i><i></i><u></u>${k.phase === 'done' ? `<b class="cam-ok">${ic('check', 30, 3.2)}</b>` : ''}</div>`
          : `<div class="cam-obj js-frame${busy || miss ? ' ' + k.phase : ''}${live ? ' live' : ''}"${T.img ? ` style="--m:url(${T.img})"` : ''}>${live ? '' : pic(T)}${lock}${k.phase === 'done' ? `<i class="cam-ok">${ic('check', 30, 3.2)}</i>` : ''}</div>`}`;
    return `<div class="cam${live ? ' live' : ''}${k.flash ? ' flash' : ''}${k.flip ? ' flip' : ''}${k.phase === 'scan' ? ' snap' : ''}${busy ? ' held' : ''}">
      ${live ? '' : FEED}${head(k, 'chevron-left')}${scene}
      <div class="cam-bar"><button class="cam-b lg" data-act="cam-flip" aria-label="Другая камера"${spinning || busy ? ' disabled' : ''}>${ic('switch-camera', 22, 2)}</button>
        <button class="tk-shot" data-act="shot" aria-label="Снять"${k.phase === 'aim' && !loading ? '' : ' disabled'}><i></i></button>
        <button class="cam-b lg${k.flash ? ' on' : ''}" data-act="cam-flash" aria-label="Вспышка"${spinning || busy ? ' disabled' : ''}>${ic('zap', 22, 2.2)}</button></div>
    </div>`;
  }

  /* ── Настоящая камера ─────────────────────────────────────── */

  /** Кадр видео на экране (object-fit: cover): из долей кадра в точки экрана и обратно. */
  function fit(box, video) {
    const bw = box.clientWidth, bh = box.clientHeight, vw = video.videoWidth || 1, vh = video.videoHeight || 1, k = Math.max(bw / vw, bh / vh);
    return { bw, bh, vw, vh, k, ox: (bw - vw * k) / 2, oy: (bh - vh * k) / 2 };
  }
  /**
   * Включает камеру для экрана задания. Пока камера и ИИ готовятся, на экране пример; когда всё готово — экран
   * перерисовывается в живой режим. Если камеры нет — задание остаётся примером, и на экране написано почему.
   */
  function wantLive(c, k, facing, model) {
    const el = c.el, V = Sonly.vision;
    c.flow.leave = (next) => { if (next !== 'task') V.stop(); };
    if (k.nocam || !canLive()) { if (!k.nocam && !canLive()) k.nocam = NOCAM ? 'busy' : 'insecure'; return false; }
    if (k.live === 'on') return true;
    if (k.live === 'wait') return false;
    k.live = 'wait';
    /* Во время крутки экран не перерисовываем — она начнётся заново; живое видео появится, когда крутка встанет. */
    /* Экран к этому моменту мог уже перерисоваться — проверяем, что мы всё ещё в этом задании, а не тот же элемент. */
    const here = () => c.flow.id === 'task' && c.flow.state._ring && c.flow.state._ring.k === k;
    const redraw = () => { if (here() && k.phase !== 'spin' && k.phase !== 'stop') c.flow.rerender(); };
    /* Камера и ИИ готовятся отдельно: видео появляется сразу, а пока модель скачивается (на мобильном интернете — десятки секунд),
       на нём написано «Загружаем ИИ…» и снимать нельзя. Что-то не вышло — камера выключается, задание становится примером с причиной. */
    let failed = false;
    const fail = (e) => {
      if (failed) return;
      failed = true;
      k.live = 'off';
      k.nocam = (e && e.code) || 'busy';
      V.stop();
      redraw();
    };
    if (k.ai !== 'ok') k.ai = 'load';
    /* Камера включилась уже после ошибки ИИ или после ухода с задания — сразу выключаем её. */
    V.camera(facing).then(() => { if (failed || !here()) { V.stop(); return; } k.live = 'on'; redraw(); }, fail);
    model().then(() => {
      if (failed) return;
      k.ai = 'ok';
      /* Скелет сам начнёт считать, как только модель готова; у фото-задания включаем кнопку «Снять». */
      if (k.live === 'on' && k.kind === 'cam') redraw();
    }, () => fail({ code: 'model' }));
    return false;
  }
  /** Скелет поверх живого видео: 14 точек как у рисованного человека, в координатах экрана. */
  const MP14 = [0, -1, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  function skeleton(svg) {
    svg.innerHTML = `<g class="ps-skel">${BONES.map(() => '<line/>').join('')}${MP14.map((_, i) => (i ? '<circle class="j" r="5"/>' : '<circle class="h" r="18"/>')).join('')}</g>`;
    return { g: svg.firstChild, lines: [...svg.querySelectorAll('line')], dots: [...svg.querySelectorAll('circle')] };
  }
  function drawSkeleton(sk, svg, box, video, pts, mirror) {
    if (!pts) { sk.g.style.opacity = 0; return; }
    const f = fit(box, video);
    svg.setAttribute('viewBox', `0 0 ${f.bw} ${f.bh}`);
    const at = (i) => {
      const p = i < 0 ? { x: (pts[11].x + pts[12].x) / 2, y: (pts[11].y + pts[12].y) / 2, visibility: Math.min(pts[11].visibility, pts[12].visibility) } : pts[i];
      let x = f.ox + p.x * f.vw * f.k;
      if (mirror) x = f.bw - x;
      return { x, y: f.oy + p.y * f.vh * f.k, ok: (p.visibility == null ? 1 : p.visibility) > 0.5 };
    };
    const q = MP14.map(at);
    sk.g.style.opacity = 1;
    BONES.forEach(([a, b], i) => {
      const l = sk.lines[i];
      l.setAttribute('x1', q[a].x.toFixed(1)); l.setAttribute('y1', q[a].y.toFixed(1)); l.setAttribute('x2', q[b].x.toFixed(1)); l.setAttribute('y2', q[b].y.toFixed(1));
      l.style.opacity = q[a].ok && q[b].ok ? 1 : 0;
    });
    const r = Math.max(10, Math.hypot(q[2].x - q[3].x, q[2].y - q[3].y) * 0.32);
    q.forEach((p, i) => {
      const d = sk.dots[i];
      d.setAttribute('cx', p.x.toFixed(1)); d.setAttribute('cy', p.y.toFixed(1));
      if (!i) d.setAttribute('r', r.toFixed(1));
      d.style.opacity = p.ok ? 1 : 0;
    });
  }
  /** Повторы с камеры: скелет на каждом кадре, счётчик засчитывает только полные повторы. */
  function livePose(c, k, t) {
    const V = Sonly.vision, box = c.q('.cam'), hint = c.q('.js-hint'), svg = c.q('.js-skel'), el = c.el;
    const video = V.attach(box);
    if (!video || !svg) return;
    const sk = skeleton(svg);
    let lm = null, rid = 0, lastV = -1, lastRun = 0;
    const say = (s) => { if (hint && hint.textContent !== s) hint.textContent = s; };
    if (!lm) say(k.ai === 'ok' ? hintOf('none', t.id) : HINT.load);
    V.pose().then((x) => { lm = x; k.ai = 'ok'; say(hintOf('none', t.id)); }, () => {});
    const frame = (now) => {
      c.flow.frames.delete(rid);
      if (c.flow.cur !== el || k.i >= k.n) return;
      rid = requestAnimationFrame(frame);
      c.flow.frames.add(rid);
      /* Не чаще 15 кадров в секунду и не чаще, чем телефон успевает: пауза — полтора времени прошлого кадра. */
      const gap = Math.min(250, Math.max(66, (V.stats.detectMs || 0) * 1.5));
      if (!lm || video.readyState < 2 || video.currentTime === lastV || now - lastRun < gap) return;
      lastV = video.currentTime;
      lastRun = now;
      k.rc = k.rc || Sonly.reps.make(t.id, (video.videoWidth || 16) / (video.videoHeight || 9));
      let pts = null;
      try { pts = V.detect(lm, video, now); } catch (e) { if (Sonly.diag) Sonly.diag.log(`скелет: сбой кадра (${e && e.message})`, 'ОШИБКА'); return; }
      const st = k.rc.push(pts, now);
      drawSkeleton(sk, svg, box, video, pts, video.classList.contains('mirror'));
      svg.classList.toggle('dn', st.phase === 'down');
      say(hintOf(st.hint, t.id));
      while (k.i < Math.min(st.count, k.n)) count(c.flow, k);
    };
    rid = requestAnimationFrame(frame);
    c.flow.frames.add(rid);
  }
  /** Снимок для проверки: кадр видео целиком и квадрат видоискателя в пикселях кадра. */
  function snapshot(box, video, frame) {
    const f = fit(box, video), cv = document.createElement('canvas'), s = Math.min(1, 1280 / Math.max(f.vw, f.vh));
    cv.width = Math.round(f.vw * s);
    cv.height = Math.round(f.vh * s);
    cv.className = 'cam-video cam-shot';
    cv.getContext('2d').drawImage(video, 0, 0, cv.width, cv.height);
    const rects = [Sonly.vision.square(cv, 1)];
    if (frame) {
      const b = box.getBoundingClientRect(), r = frame.getBoundingClientRect(), z = b.width / box.clientWidth || 1;
      const x = (r.left - b.left) / z, y = (r.top - b.top) / z, w = r.width / z;
      const sx = ((x - f.ox) / f.k) * s, sy = ((y - f.oy) / f.k) * s, sw = (w / f.k) * s, pad = sw * 0.12;
      const side = Math.min(cv.width, cv.height, sw + pad * 2);
      rects.unshift({ x: Math.max(0, Math.min(cv.width - side, sx - pad)), y: Math.max(0, Math.min(cv.height - side, sy - pad)), s: side });
    }
    return { cv, rects };
  }

  /** Человек в кадре и скелет поверх него: так ИИ видит позу и сам считает повторы. */
  function figure(id, u) {
    const p = poseAt(id, u), ln = (cls) => BONES.map(([a, b]) => `<line class="${cls}" x1="${p[a][0]}" y1="${p[a][1]}" x2="${p[b][0]}" y2="${p[b][1]}"/>`).join('');
    const torso = [2, 3, 9, 8].map((i) => p[i].join(',')).join(' ');
    return `<svg class="ps-fig js-fig" viewBox="0 0 240 300" aria-hidden="true">${POSE[id].floor ? `<line class="ps-floor" x1="14" x2="226" y1="${POSE[id].floor}" y2="${POSE[id].floor}"/>` : ''}
      <g class="ps-body"><polygon points="${torso}"/>${ln('b')}<circle cx="${p[0][0]}" cy="${p[0][1]}" r="19"/></g>
      <g class="ps-skel">${ln('s')}${p.map((q, i) => (i ? `<circle class="j" cx="${q[0]}" cy="${q[1]}" r="4.6"/>` : `<circle class="h" cx="${q[0]}" cy="${q[1]}" r="19"/>`)).join('')}</g></svg>`;
  }
  /** Ставит человека и скелет в позу u (0 — верхняя точка повтора, 1 — нижняя). */
  function setPose(fig, id, u) {
    const p = poseAt(id, u), put = (l, [a, b]) => { l.setAttribute('x1', p[a][0].toFixed(1)); l.setAttribute('y1', p[a][1].toFixed(1)); l.setAttribute('x2', p[b][0].toFixed(1)); l.setAttribute('y2', p[b][1].toFixed(1)); };
    fig.b.forEach((l, i) => put(l, BONES[i]));
    fig.s.forEach((l, i) => put(l, BONES[i]));
    fig.dots.forEach((d, i) => { d.setAttribute('cx', p[i][0].toFixed(1)); d.setAttribute('cy', p[i][1].toFixed(1)); });
    fig.head.setAttribute('cx', p[0][0].toFixed(1));
    fig.head.setAttribute('cy', p[0][1].toFixed(1));
    fig.torso.setAttribute('points', [2, 3, 9, 8].map((i) => p[i].map((v) => v.toFixed(1)).join(',')).join(' '));
  }
  /** Повторы через камеру: человек в кадре, скелет поверх, счёт идёт сам. Внизу растёт солнце. */
  function pose(k, t) {
    const live = k.live === 'on';
    const sub = live ? (k.ai === 'ok' ? hintOf('none', t.id) : HINT.load) : k.live === 'wait' ? HINT.wait : k.nocam ? `${NOCAM_SAY[k.nocam] || NOCAM_SAY.busy} — пример` : HINT.go;
    return `<div class="cam ps${live ? ' live' : ''}">${live ? '<svg class="ps-skel-live js-skel" aria-hidden="true"></svg>' : FEED}${head(k)}
      <div class="cam-pill top lg" data-lg="pill"><b>${k.n} ${COUNT[t.id]}</b><span class="ps-live${k.nocam && !live ? ' off' : ''}"><i></i><span class="js-hint">${sub}</span></span></div>
      ${live ? '' : `<div class="ps-stage"><i class="ps-box"><u></u><u></u><u></u><u></u></i>${figure(t.id, 0.6)}</div>`}
      <div class="ps-hud"><div class="tk-grow${k.i >= k.n ? ' final' : ''}" style="--g:${(k.i / k.n).toFixed(3)}"><i class="tk-glow"></i>${Sonly.mark()}</div>
        <p class="tk-cnt"><b class="js-cnt">${k.i}</b><span>из ${k.n}</span></p></div>
    </div>`;
  }

  /* ── Экраны ──────────────────────────────────────────────── */

  Object.assign(app.screens, {
    ring: {
      chrome: false, sb: 'light',
      render: (c) => {
        const r = ensure(c.s), a = r.a, t = K.taskOf(a), now = new Date();
        const sum = TO.has(t.id) ? TO.summary(t.id, TO.get(a, t.id)) : t.desc;
        return `<div class="rg${r.mute ? ' mute' : ''}"><i class="tk-dawn" style="--p:.45"></i>
          <header class="rg-top">${r.test ? `<button class="rg-x lg" data-act="ring-exit" aria-label="Закрыть проверку">${ic('x', 20, 2.3)}</button>` : '<span class="rg-x ghost"></span>'}
            <div class="rg-logo">${Sonly.logo()}</div>
            <button class="rg-x lg" data-act="ring-mute" aria-label="${r.mute ? 'Включить звук' : 'Заглушить'}">${ic(r.mute ? 'volume-x' : 'volume-2', 20, 2.1)}</button></header>
          <div class="rg-mid"><div class="rg-bell"><i class="rg-wave"></i><i class="rg-wave w2"></i><i class="rg-halo"></i>${Sonly.mark()}</div>
            <div class="rg-time js-now">${nowHM()}</div>
            <small>${now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (x) => x.toUpperCase())}</small>
            <span class="rg-snd"><i class="rg-eq"><u></u><u></u><u></u><u></u></i>${r.test ? 'Проверка' : esc(a.name)} · ${a.sound}</span></div>
          <div class="rg-card">${r.random ? `<small>${ic('dices', 13, 2.4)}Случайное задание</small>` : ''}
            <div class="rg-task"><i class="tb cat-${t.cat}">${K.tic(t, 28)}</i><span><b>${t.name}</b><em>${sum}</em></span></div>
            <button class="ap-btn" data-act="ring-go">${r.k && r.k.i ? 'Продолжить' : 'Начать задание'}</button>
            <p>${ic('lock', 13, 2.5)}Отложить нельзя</p></div>
        </div>`;
      },
      mount(el, c) {
        const node = c.q('.js-now');
        const tick = () => { node.textContent = nowHM(); c.wait(5000, tick); };
        if (!c.shot) c.wait(5000, tick);
        /* Пока звенит будильник, ИИ для задания уже грузится — к нажатию «Начать задание» он готов. */
      },
    },

    task: {
      chrome: false, sb: 'light',
      render: (c) => {
        const r = ensure(c.s);
        if (!r.k) begin(r);
        const k = r.k, t = K.taskOf(r.a);
        if (k.kind === 'cam') return camera(k);
        if (k.kind === 'pose') return pose(k, t);
        return `<div class="tk tk-${k.kind}" style="--p:${(k.i / k.n).toFixed(2)}"><i class="tk-dawn"></i>${head(k)}${BODY[k.kind](k, t)}</div>`;
      },
      /* Задержки внутри заданий: показ узора, закрытие непарных карточек, крутка, «проверка» снимка и речи. */
      mount(el, c) {
        const k = c.s._ring.k, again = () => c.flow.rerender(), t = K.taskOf(c.s._ring.a);
        if (c.shot) return;
        if (k.kind === 'pose' && k.i < k.n) {
          if (wantLive(c, k, 'user', () => Sonly.vision.pose())) livePose(c, k, t);
          else if (k.live !== 'wait') {
            /* Пример без камеры: нарисованный человек делает повтор за повтором; каждый засчитывается, когда он вернулся наверх. */
            const svg = c.q('.js-fig'), fig = { b: [...svg.querySelectorAll('line.b')], s: [...svg.querySelectorAll('line.s')], dots: [...svg.querySelectorAll('.ps-skel circle')], head: svg.querySelector('.ps-body circle'), torso: svg.querySelector('.ps-body polygon') };
            const one = () => c.tween(POSE[t.id].ms, (e) => setPose(fig, t.id, wave(e)), () => { count(c.flow, k); if (k.i < k.n) c.wait(160, one); }, (x) => x);
            setPose(fig, t.id, 0);
            c.wait(900, one);
          }
        }
        if (k.kind === 'count' && k.auto && k.i < k.n) {
          const tick = () => { count(c.flow, k); if (k.i < k.n) c.wait(k.auto, tick); };
          if (k.sensors === 'off' || !Sonly.motion) c.wait(900, tick);
          else {
            /* Шаги и встряска — по акселерометру. Если за полторы секунды датчик молчит (компьютер, запрет), показываем пример. */
            k.mc = k.mc || Sonly.motion.make(t.id);
            let got = k.sensors === 'on';
            const onM = (e) => {
              const a = e.accelerationIncludingGravity;
              if (!a || a.x == null) return;
              got = true;
              k.sensors = 'on';
              const n = k.mc.push(a.x, a.y, a.z, e.timeStamp || performance.now());
              while (k.i < Math.min(n, k.n)) count(c.flow, k);
            };
            window.addEventListener('devicemotion', onM);
            c.flow.leave = () => window.removeEventListener('devicemotion', onM);
            if (!got) c.wait(1600, () => {
              if (got) return;
              window.removeEventListener('devicemotion', onM);
              k.sensors = 'off';
              const s = c.q('.tk-live span');
              if (s) s.textContent = 'Датчиков нет — пример';
              tick();
            });
          }
        }
        if (k.kind === 'math') { k.fresh = false; if (k.solved) c.wait(520, () => { k.solved = false; k.input = ''; k.fresh = true; step(c.flow, k); }); }
        if (k.kind === 'quiz' && k.ok != null) c.wait(700, () => { k.ok = null; k.bad = []; step(c.flow, k); });
        if (k.kind === 'memory' && k.phase === 'show') c.wait(k.showMs, () => { k.phase = 'input'; again(); });
        if (k.kind === 'memory' && k.phase === 'bad') c.wait(1100, () => { pattern(k); again(); });
        if (k.kind === 'pairs' && k.wait) c.wait(800, () => { k.cards.forEach((x) => { if (!x.done) x.open = false; }); k.wait = false; k.just = -1; again(); });
        if (QUIET[k.kind]) hush(c.flow, c.s._ring);
        if (k.kind === 'voice') mountVoice(c, k);
        if (k.kind === 'rhythm') mountRhythm(c, k);
        if (k.kind === 'cam') {
          const live = wantLive(c, k, k.flip ? 'user' : 'environment', k.qr ? () => Promise.resolve() : () => Sonly.vision.clip()), box = c.q('.cam');
          if (live) {
            const v = Sonly.vision.attach(box);
            /* Снятый кадр стоит поверх видео, пока его проверяют. */
            if (k.snap && v && ['scan', 'done', 'miss'].includes(k.phase)) box.insertBefore(k.snap, v.nextSibling);
            if (k.qr && k.phase === 'aim' && 'BarcodeDetector' in window) {
              /* Код ищется сам, без кнопки: как только в кадре штрихкод или QR — готово. */
              const det = new window.BarcodeDetector(), el = c.el;
              const look = () => {
                if (c.flow.cur !== el || k.phase !== 'aim') return;
                det.detect(v).then((codes) => { if (codes.length && c.flow.cur === el && k.phase === 'aim') { k.phase = 'done'; sound.tick(1175); again(); } else c.wait(350, look); }, () => c.wait(700, look));
              };
              c.wait(400, look);
            }
          }
          if (k.phase === 'spin') {
            /* Крутка: предметы едут через квадрат, замедляются и встают на выпавшем. Каждый проезд — щелчок. */
            const track = c.q('.js-track');
            let last = 1;
            c.tween(3200, (e) => {
              const pos = 1 + (k.T - 1) * e;
              track.style.transform = `translateX(${reelX(pos)}px)`;
              if (Math.round(pos) !== last) { last = Math.round(pos); sound.tick(1500); }
            }, () => { k.phase = 'stop'; again(); }, (t) => 1 - Math.pow(1 - t, 4));
          }
          if (k.phase === 'stop') { sound.tick(988); c.wait(900, () => { k.phase = 'aim'; again(); }); }
          if (k.phase === 'scan' && live && k.snap) {
            /* Настоящая проверка: ИИ смотрит на квадрат видоискателя и на кадр целиком. Анимация уголков идёт не меньше секунды. */
            const t0 = Date.now(), el = c.el, task = t.id === 'hunt' ? k.target.id : t.id;
            const show = (res) => {
              if (c.flow.cur !== el) return;
              k.res = res;
              c.wait(Math.max(0, 1100 - (Date.now() - t0)), () => { k.phase = res.ok ? 'done' : 'miss'; sound.tick(res.ok ? 1175 : 330); again(); });
            };
            Sonly.vision.look(task, k.snap, k.rects).then(show, () => show({ ok: false, why: 'unsure' }));
          } else if (k.phase === 'scan') c.wait(1500, () => { k.phase = 'done'; sound.tick(1175); again(); });
          if (k.phase === 'miss') c.wait(2300, () => { k.phase = 'aim'; k.snap = null; again(); });
          if (k.phase === 'done') c.wait(900, () => finish(c.flow));
        }
        if (k.kind === 'phrase') {
          const input = c.q('.js-in'), text = c.q('.js-text');
          const bar = c.q('.js-bar');
          input.addEventListener('input', () => {
            k.val = input.value;
            const st = typed(k.text, k.val);
            text.innerHTML = spans(k);
            bar.style.transform = `scaleX(${st.pct.toFixed(3)})`;
            text.classList.toggle('bad', st.bad > 0 || st.over);
            if (st.done && !k.fin) { k.fin = true; input.blur(); text.classList.add('ok'); sound.tick(1175); c.wait(500, () => finish(c.flow)); }
          });
          input.focus({ preventScroll: true });
        }
      },
    },

    woke: {
      chrome: false,
      render: (c) => {
        const r = ensure(c.s), st = K.stats(c.s);
        if (r.secs == null) { r.secs = 42; r.at = nowHM(); }
        const note = r.test ? (r.direct ? 'Пробный запуск' : 'Проверка — в серию не идёт') : r.a.check ? `Проверим через ${r.a.check} мин` : '';
        return `<div class="wk${r.morph ? ' morph' : ''}"><div class="wk-logo">${Sonly.logo()}</div><div class="wk-sun">${r.morph ? '<i class="wk-flare"></i>' : ''}${Sonly.mark()}</div>
          <h1>Доброе утро</h1>
          <div class="wk-row"><div><b><span class="js-secs">${r.morph ? 0 : r.secs}</span> с</b><small>на задание</small></div><div><b>${r.at}</b><small>подъём</small></div><div><b>${st.streak}</b><small>${K.pl(st.streak, 'день', 'дня', 'дней')} подряд</small></div></div>
          ${note ? `<p class="${r.test ? 'wk-note' : 'wk-chk'}">${ic(r.test ? 'info' : 'eye', 15, 2.3)}${note}</p>` : ''}
          ${!r.direct && Sonly.morning ? Sonly.morning.blocks(c.s) : ''}
          <button class="ap-btn" data-act="ring-done">${r.from === 'picker' ? 'К заданиям' : r.from === 'editor' ? 'К будильнику' : 'На главную'}</button></div>`;
      },
      /* Солнце приезжает с экрана задания на своё место, время на задание досчитывается. */
      mount(el, c) {
        const r = c.s._ring, m = r && r.morph;
        if (!m) return;
        r.morph = null;
        /* Двигаем весь блок солнца вместе со свечением; размеры меряем по самому значку. */
        const sun = c.q('.wk-sun'), mark = c.q('.wk-sun .mark'), out = c.q('.js-secs');
        if (c.still || !sun || !mark) return;
        const b = mark.getBoundingClientRect(), p = c.flow.el.getBoundingClientRect(), k = p.width / c.flow.el.offsetWidth || 1;
        const dx = m.x - (b.left - p.left) / k, dy = m.y - (b.top - p.top) / k, sc = m.w / (b.width / k);
        sun.style.transformOrigin = '0 0';
        sun.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${sc.toFixed(3)})`;
        sun.getBoundingClientRect();
        sun.style.transition = 'transform .95s cubic-bezier(.22,1,.36,1)';
        sun.style.transform = '';
        if (out) c.at(420, () => c.tween(900, (e) => { out.textContent = Math.round(r.secs * e); }));
      },
    },
  });
  app.screens.check = {
    chrome: false, sb: 'light',
    render: (c) => {
      const s = c.s, k = s._check || (s._check = { a: K.copy(s.alarms[0] || K.blank(s)), t0: Date.now() });
      const left = Math.max(0, 60 - Math.floor((Date.now() - k.t0) / 1000));
      return `<div class="ck js-ck" style="--l:${(left / 60).toFixed(3)}"><i class="tk-dawn" style="--p:.3"></i><div class="wk-logo">${Sonly.logo()}</div>
        <div class="ck-sky"><i class="ck-glow"></i><i class="ck-sun">${Sonly.mark()}</i><u></u></div>
        <h1>Ты не спишь?</h1>
        <div class="ck-n"><b class="js-left">${left}</b><small>сек</small></div>
        <button class="ap-btn" data-act="check-ok">Я не сплю</button></div>`;
    },
    /* Счёт идёт по часам, а не по числу тиков: если вкладка спала, проверка всё равно закончится вовремя.
       Солнце садится вместе с минутой: не ответил — будильник звонит снова. */
    mount(el, c) {
      if (c.shot) return;
      const k = c.s._check, out = c.q('.js-left'), root = c.q('.js-ck');
      const tick = () => {
        const ms = Math.max(0, 60000 - (Date.now() - k.t0)), left = Math.ceil(ms / 1000);
        out.textContent = left;
        root.style.setProperty('--l', (ms / 60000).toFixed(3));
        if (ms > 0) { c.wait(250, tick); return; }
        c.s._check = null;
        start(c.flow, k.a, false);
      };
      tick();
    },
  };
  app.extra = ['ring', 'task', 'woke', 'check'];
  Object.assign(app.titles, { ring: 'Звонок', task: 'Задание', woke: 'Подъём', check: 'Проверка' });

  Sonly.ringer = {
    start,
    anim,
    check: checkNow,
    /** Готовит экран для снимка: «ring:math», «task:memory», «task:hunt.spin», «woke», «check». */
    preview(flow, what) {
      const [scr, spec] = what.split(':'), [task, phase] = (spec || '').split('.'), s = flow.state;
      if (scr === 'check') { s._check = { a: K.copy(s.alarms[0]), t0: Date.now() - 18000 }; flow.go('check', 0); return; }
      s._ring = { a: K.copy(s.alarms[0]), test: scr !== 'woke', t0: Date.now() };
      if (task) s._ring.a.task = task;
      if (scr === 'task') {
        begin(s._ring);
        const k = s._ring.k;
        if (k.kind === 'cam' && phase) k.phase = phase; else if (k.kind === 'cam' && k.list) k.phase = 'aim';
        if (k.kind === 'math') k.input = '';
        if (k.kind === 'count' || k.kind === 'pose') k.i = Math.round(k.n * 0.4);
        if (k.kind === 'pairs') { k.cards.slice(0, 4).forEach((x, i) => { if (i < 2) { x.open = true; } }); const p = k.cards[0].p; k.cards.filter((x) => x.p === p).forEach((x) => { x.open = true; x.done = true; }); k.i = 1; }
      }
      /* Предпросмотр подъёма: сегодняшнее утро уже в истории, как после настоящего звонка. */
      if (scr === 'woke') { const t = K.day0(new Date()).getTime(); if (!(s.log || []).some((x) => x.t === t)) s.log = (s.log || []).concat({ t, wake: new Date().getHours() * 60 + new Date().getMinutes(), secs: 42, task: s._ring.a.task }); }
      flow.go(scr, 0);
    },
    /** Нажатия на экранах звонка и задания. Возвращает true, если нажатие обработано. */
    on(flow, act, arg) {
      const s = flow.state, r = s._ring, k = r && r.k;
      if (!r) return false;
      switch (act) {
        case 'ring-go': if (!r.k) begin(r); askMotion(r.k); sound.unlock(); r.t1 = r.t1 || Date.now(); flow.go('task', 1); return true;
        case 'task-back': if (r.direct) exit(flow); else { unhush(flow, r); flow.go('ring', -1); } return true;
        case 'ring-mute': {
          r.mute = !r.mute;
          sound.mute(r.mute);
          /* Экран не перерисовывается: меняется только значок, солнце не дёргается. */
          const rg = flow.cur && flow.cur.querySelector('.rg'), b = rg && rg.querySelector('[data-act="ring-mute"]');
          if (!b || flow.still) { flow.rerender(); return true; }
          rg.classList.toggle('mute', r.mute);
          b.innerHTML = ic(r.mute ? 'volume-x' : 'volume-2', 20, 2.1);
          b.setAttribute('aria-label', r.mute ? 'Включить звук' : 'Заглушить');
          return true;
        }
        case 'ring-exit': case 'ring-done': exit(flow); return true;
        case 'key':
          if (k.solved) return true;
          if (arg === 'ok') {
            /* Верно — карточка зеленеет, и через полсекунды выезжает следующий пример. */
            if (+k.input === k.list[k.i].a) { k.solved = true; k.bad = false; sound.tick(1175); flow.rerender(); return true; }
            k.bad = true;
            k.input = '';
            sound.tick(247);
          } else if (arg === 'del') k.input = k.input.slice(0, -1);
          else if (k.input.length < 4) { k.input += arg; k.bad = false; sound.tick(880); }
          flow.rerender();
          return true;
        case 'ans': {
          const j = +arg;
          if (k.ok != null || k.bad.includes(j)) return true;
          if (j === k.list[k.i].a) { k.ok = j; sound.tick(1175); } else { k.bad.push(j); sound.tick(247); }
          flow.rerender();
          return true;
        }
        case 'cell': {
          const i = +arg;
          if (k.phase !== 'input' || k.hit.includes(i)) return true;
          if (!k.cells.includes(i)) { k.miss = i; k.phase = 'bad'; sound.tick(247); } else {
            k.hit.push(i);
            sound.tick(660 + k.hit.length * 90);
            if (k.hit.length === k.cells.length) { k.i++; if (k.i >= k.n) { finish(flow); return true; } pattern(k); }
          }
          flow.rerender();
          return true;
        }
        case 'card': {
          const card = k.cards[+arg];
          if (card.open || card.done || k.wait) return true;
          card.open = true;
          k.just = card.id;
          const open = k.cards.filter((x) => x.open && !x.done);
          if (open.length === 2) {
            if (open[0].p.id !== open[1].p.id) { k.wait = true; sound.tick(247); } else { open.forEach((x) => { x.done = true; }); k.i++; sound.tick(1175); }
          }
          flow.rerender();
          if (k.i >= k.n) flow.wait(700, () => finish(flow));
          return true;
        }
        case 'rep': if (!k.auto) count(flow, k); return true;
        case 'respin': if (k.rerolls > 0) { k.rerolls--; spin(k, k.list); flow.rerender(); } return true;
        case 'cam-flash': case 'cam-flip': {
          /* Вспышка и смена камеры переключаются на месте — подпись и предмет не появляются заново. */
          const key = act === 'cam-flash' ? 'flash' : 'flip', cam = flow.cur && flow.cur.querySelector('.cam');
          k[key] = !k[key];
          if (k.live === 'on') {
            /* Живая камера: вспышка — фонарик телефона, смена — другая камера. */
            if (key === 'flash') Sonly.vision.torch(k.flash);
            else Sonly.vision.camera(k.flip ? 'user' : 'environment').then(() => { if (cam && cam.isConnected) Sonly.vision.attach(cam); }, () => {});
          }
          if (!cam || flow.still) { flow.rerender(); return true; }
          cam.classList.toggle(key, k[key]);
          if (key === 'flash') cam.querySelector('[data-act="cam-flash"]').classList.toggle('on', k.flash);
          return true;
        }
        case 'shot': if (k.phase === 'aim' && !(k.live === 'on' && k.ai !== 'ok')) {
          /* Живая камера: снимок — это кадр видео и квадрат видоискателя; дальше его проверяет ИИ. */
          const box = flow.cur && flow.cur.querySelector('.cam'), v = Sonly.vision && Sonly.vision.video;
          if (k.live === 'on' && !k.qr && box && v && v.videoWidth) { const sh = snapshot(box, v, box.querySelector('.js-frame')); k.snap = sh.cv; k.rects = sh.rects; }
          k.phase = 'scan'; sound.tick(1800); flow.rerender();
        } return true;
        case 'mic': micTap(flow, k); return true;
        case 'rh-replay': if (k.phase === 'tap') { k.phase = 'play'; k.taps = []; k.marks = null; flow.rerender(); } return true;
        default: return false;
      }
    },
  };
})();
