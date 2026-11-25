/* Приложение sonly: главная с будильниками, статистика со значками, настройки с виджетами и подарком другу.
   Редактор будильника, выбор, проба и настройка задания, случайное задание, звук, проверка подъёма.
   Вкладка «Утро» — в morning.js, звонок и задания — в ring.js. Устроено по присланному примеру интерфейса. */
(() => {
  'use strict';
  const { ic, esc, pad, TASKS, DAYS, SB_ICONS, wheel, daysText, taskOpts: TO } = Sonly;

  const cap = (s) => s.replace(/^./, (x) => x.toUpperCase());
  /** Имя звука для экрана: у своих звуков (my:…) — то, что задал человек. */
  /* Название звука в будильнике: старые звуки (из тонов) показываются под новым именем — тем, что правда зазвонит. */
  const sndName = (n) => { const r = Sonly.sound.resolve(n); return Sonly.mysnd ? Sonly.mysnd.label(r) : r; };
  const DEF_SND = Sonly.sound.def;
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
  /* Звуки — настоящие записи (js/sound.js): группы и значок с цветом у каждой. */
  const SOUNDS = Sonly.sound.groups();
  const SND_ICON = { 'Мелодии': ['music', '#FF9F0A'], 'Будильники': ['alarm-clock', '#0A84FF'], 'Сирены': ['siren', '#FF3B30'], 'Забавные': ['party-popper', '#AF52DE'], 'Природа': ['bird', '#34C759'] };
  const TABS = [['home', 'Главная', 'house'], ['morning', 'Утро', 'sunrise'], ['stats', 'Статистика', 'chart-no-axes-column'], ['settings', 'Настройки', 'settings']];
  const CHECKS = [[0, 'Выключена', ''], [3, 'Через 3 минуты', ''], [5, 'Через 5 минут', ''], [10, 'Через 10 минут', '']];
  /* Пламя серии: рисунок, а не значок из набора, чтобы у серии было своё лицо. */
  const FLAME = `<svg class="ap-flame" viewBox="0 0 64 80" aria-hidden="true"><path class="f1" d="M33 3c3 13 19 21 19 42a20 20 0 0 1-40 0c0-9 4-15 9-19 1 7 4 10 8 10 0-13-3-21 4-33z"/><path class="f2" d="M32 42c3 6 10 9 10 18a10 10 0 0 1-20 0c0-7 6-10 10-18z"/></svg>`;
  /*
   * Формы значков по редкости (поле 60 × 66): обычный — монета, редкий — щит, эпический — восьмилучевая розетка,
   * легендарный — печать с лучами, мифический — гранёный кристалл. DECO — внутренний ободок или грани светлой линией.
   */
  const star = (n, R, r, cx = 30, cy = 34) => Array.from({ length: n * 2 }, (_, i) => { const a = ((-90 + (i * 180) / n) * Math.PI) / 180, k = i % 2 ? r : R; return `${i ? 'L' : 'M'}${(cx + k * Math.cos(a)).toFixed(2)} ${(cy + k * Math.sin(a)).toFixed(2)}`; }).join('') + 'Z';
  const SHAPE = {
    common: 'M30 6.5a27.5 27.5 0 1 1 0 55a27.5 27.5 0 1 1 0-55Z',
    rare: 'M30 3.5 53.5 11.5C54 33 48 51 30 62.5 12 51 6 33 6.5 11.5Z',
    epic: star(8, 29.5, 22.5),
    legend: star(16, 29.5, 25.8),
    myth: 'M17 7H43L57 24 30 62 3 24Z',
  };
  const DECO = {
    common: '<circle cx="30" cy="34" r="21.5"/>',
    rare: '<path d="M30 10.5 47.5 16.5C47.8 32.5 43.3 46 30 55 16.7 46 12.2 32.5 12.5 16.5Z"/>',
    epic: '<circle cx="30" cy="34" r="16.5"/>',
    legend: '<circle cx="30" cy="34" r="20"/><circle cx="30" cy="34" r="17"/>',
    myth: '<path d="M3 24H57M17 7 23 24 30 62M43 7 37 24 30 62M23 24 30 7 37 24"/>',
  };
  /* Маска формы для каждой редкости — один раз, правилами CSS (закруглённые углы — обводкой той же формы). */
  (() => {
    const url = (d) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 66'><path d='${d}' stroke='#000' stroke-width='4' stroke-linejoin='round'/></svg>`)}")`;
    const st = document.createElement('style');
    st.textContent = Object.entries(SHAPE).map(([t, d]) => `.bd-hex.t-${t}{--shape:${url(d)}}`).join('');
    document.head.appendChild(st);
  })();
  const HEX = SHAPE.legend;
  const NBSP = ' ';

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
    return dd ? `${dd}<u data-k="дней·коротко">д</u> ${h % 24}<u>ч</u>` : h ? `${h}<u>ч</u> ${min % 60}<u>мин</u>` : `${min}<u>мин</u>`;
  };
  /* Коротко для плашки под «Зазвонит через»: «сегодня в», «завтра в», «пн,» — чтобы обе плашки всегда стояли в один ряд. */
  const shortWhen = (d, now) => { const k = Math.round((day0(d) - day0(now)) / 864e5); return k === 0 ? 'сегодня в' : k === 1 ? 'завтра в' : ['пн,', 'вт,', 'ср,', 'чт,', 'пт,', 'сб,', 'вс,'][(d.getDay() + 6) % 7]; };
  const dayWord = (d, now) => { const k = Math.round((day0(d) - day0(now)) / 864e5); return k === 0 ? 'сегодня' : k === 1 ? 'завтра' : WD[(d.getDay() + 6) % 7]; };

  /* ── История подъёмов ────────────────────────────────────── */

  /**
   * Пример истории: нужен, чтобы показать статистику заполненной. В новом аккаунте есть только настоящие подъёмы.
   * Длина — две недели, три месяца или год (s.span). В длинных есть проспанные утра: серия рвалась, рекорд больше
   * нынешней серии, подъём со временем стал раньше, а задание — быстрее; задания чередуются.
   */
  const SPAN = { '2w': 14, '3m': 91, '1y': 365 };
  const MISS = { '3m': [16, 17, 45, 46, 72, 86], '1y': [16, 17, 45, 46, 72, 86, 121, 122, 158, 199, 200, 201, 263, 264, 301, 302, 333, 350] };
  const MIX = ['math', 'memory', 'phrase', 'squat', 'quiz', 'rhythm', 'pairs'];
  function history(s) {
    const log = (s.log || []).map((x) => ({ d: new Date(x.t), wake: x.wake, secs: x.secs, task: x.task }));
    if (s.data !== 'demo') return log;
    const a = s.alarms.find((x) => !x.once) || { h: 7, m: 30, days: [0, 1, 2, 3, 4] }, span = SPAN[s.span] ? s.span : '2w', n = SPAN[span], miss = new Set(MISS[span] || []);
    const off = [3, -1, 5, 0, 2, 4, -2, 1, 6, 0, 2, -1, 3, 1, 2], secs = [52, 47, 44, 49, 41, 38, 43, 36, 40, 35, 37, 33, 36, 31, 34];
    const out = [], now = new Date(), task = a.task === 'random' ? 'math' : a.task;
    for (let k = n; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - k);
      /* Сегодняшнее утро попадает в историю, только если время будильника уже прошло. */
      if (k === 0 && now.getHours() * 60 + now.getMinutes() < a.h * 60 + a.m + 10) continue;
      if (!a.days.includes((d.getDay() + 6) % 7) || miss.has(k)) continue;
      if (k <= 14) { out.push({ d, wake: a.h * 60 + a.m + off[14 - k], secs: secs[14 - k], task }); continue; }
      /* Раньше вставал позже и дольше решал: чем дальше в прошлое, тем больше сдвиг; плюс неровность день ото дня. */
      const j = Math.sin(k * 12.9898) * 43758.5453, r = j - Math.floor(j), late = Math.round(Math.min(k, 200) / 9);
      out.push({ d, wake: a.h * 60 + a.m + late + Math.round(r * 14) - 5, secs: Math.round(34 + Math.min(k, 200) / 7 + r * 12), task: MIX[k % MIX.length] });
    }
    return out.filter((x) => !log.some((y) => y.d.getTime() === x.d.getTime())).concat(log).sort((x, y) => x.d - y.d);
  }
  /** Серия: сколько запланированных утр подряд закрыто подъёмом. Дни без будильника серию не прерывают, сегодняшнее утро ещё впереди. */
  function runs(s, h) {
    const done = new Set(h.map((x) => x.d.getTime())), now = new Date();
    const plan = (d) => s.alarms.some((a) => !a.once && a.days.includes((d.getDay() + 6) % 7));
    const first = h.length ? Math.ceil((day0(now) - day0(h[0].d)) / 864e5) : 0;
    let run = 0, best = 0;
    for (let k = Math.max(120, first); k >= 0; k--) {
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

  /*
   * Значки. У каждого редкость — как часто его получают: обычные приходят в первые дни, мифические — за год без пропусков.
   * pct — у какой доли людей он есть (пример; в приложении — по всем пользователям). Секретные до получения без названия.
   * Серии считаются по лучшей серии, поэтому полученный значок не пропадает. prog — сколько уже есть из нужного.
   */
  const TIERS = [['common', 'Обычный', 'Обычные'], ['rare', 'Редкий', 'Редкие'], ['epic', 'Эпический', 'Эпические'], ['legend', 'Легендарный', 'Легендарные'], ['myth', 'Мифический', 'Мифические']];
  const BADGES = [
    ['alarm', 'Старт', 'Поставь первый будильник с заданием', 'alarm-clock-check', 'common', 96, (b) => [b.alarms, 1]],
    ['first', 'Первое утро', 'Встань с sonly в первый раз', 'sunrise', 'common', 88, (b) => [b.total, 1]],
    ['face', 'Это я', 'Добавь имя и свой аватар', 'user-round', 'common', 61, (b) => [b.face, 1]],
    ['friend', 'Не один', 'Добавь первого друга', 'users', 'common', 54, (b) => [b.friends, 1]],
    ['s3', 'Три подряд', 'Три утра подряд без пропуска', 'flame', 'common', 47, (b) => [b.best, 3]],
    ['group', 'Команда', 'Вступи в группу или создай свою', 'users-round', 'rare', 31, (b) => [b.groups, 1]],
    ['n10', 'Десятка', 'Десять подъёмов всего', 'medal', 'rare', 34, (b) => [b.total, 10]],
    ['s7', 'Неделя', 'Семь утр подряд', 'calendar-check', 'rare', 28, (b) => [b.best, 7]],
    ['weekend', 'Без выходных', 'Встань по будильнику в субботу или воскресенье', 'coffee', 'rare', 26, (b) => [b.weekend, 1]],
    ['fast', 'Молния', 'Выполни задание быстрее 30 секунд', 'zap', 'rare', 22, (b) => [b.fast30, 1]],
    ['cheer', 'Болельщик', 'Поздравь друга с подъёмом', 'party-popper', 'rare', 19, (b) => [b.cheer, 1]],
    ['mix', 'На все руки', 'Пять разных заданий', 'shapes', 'rare', 15, (b) => [b.kinds, 5]],
    ['s14', 'Две недели', 'Четырнадцать утр подряд', 'trophy', 'epic', 11, (b) => [b.best, 14]],
    ['early', 'Жаворонок', 'Встань до 6:00', 'bird', 'epic', 9, (b) => [b.early, 1]],
    ['n50', 'Полсотни', 'Пятьдесят подъёмов', 'award', 'epic', 8, (b) => [b.total, 50]],
    ['steady', 'Как часы', 'Две недели вставать в одно время — разброс до 20 минут', 'clock', 'epic', 7, (b) => [b.steady, 1]],
    ['flash', 'Реактивный', 'Выполни задание быстрее 15 секунд', 'rocket', 'epic', 6, (b) => [b.fast15, 1]],
    ['waker', 'Будильщик', 'Разбуди проспавшего друга', 'bell-ring', 'epic', 5, (b) => [b.nudge, 1]],
    ['s30', 'Месяц', 'Тридцать утр подряд', 'crown', 'legend', 3.1, (b) => [b.best, 30]],
    ['n100', 'Сотня', 'Сто подъёмов', 'gem', 'legend', 2.4, (b) => [b.total, 100]],
    ['squad', 'Все встали', 'Вся группа встала до своей цели', 'shield-check', 'legend', 1.8, (b) => [b.squad, 1]],
    ['dawn', 'До рассвета', 'Встань до 5:00', 'moon-star', 'legend', 1.2, (b) => [b.dawn, 1]],
    ['s100', 'Несгибаемый', 'Сто утр подряд', 'flame-kindling', 'myth', 0.4, (b) => [b.best, 100]],
    ['s365', 'Целый год', 'Триста шестьдесят пять утр подряд — ни одного «отложить»', 'sparkles', 'myth', 0.05, (b) => [b.best, 365]],
    ['ny', 'Новый год', 'Встань по будильнику 1 января', 'gift', 'epic', 4, (b) => [b.ny, 1], true],
    ['f13', 'Суеверный', 'Встань по будильнику в пятницу 13-го', 'ghost', 'rare', 12, (b) => [b.f13, 1], true],
  ];
  function badges(s) {
    const st = stats(s), h = st.h, pf = Sonly.people && Sonly.people.facts ? Sonly.people.facts(s) : {};
    const last = h.slice(-14).map((x) => x.wake), steady = last.length >= 14 && Math.max(...last) - Math.min(...last) <= 20;
    const b = { alarms: s.alarms.length ? 1 : 0, total: h.length, best: st.best, fast30: +h.some((x) => x.secs < 30), fast15: +h.some((x) => x.secs < 15),
      early: +h.some((x) => x.wake < 360), dawn: +h.some((x) => x.wake < 300), weekend: +h.some((x) => x.d.getDay() % 6 === 0), kinds: new Set(h.map((x) => x.task).filter(Boolean)).size,
      steady: +steady, ny: +h.some((x) => x.d.getMonth() === 0 && x.d.getDate() === 1), f13: +h.some((x) => x.d.getDay() === 5 && x.d.getDate() === 13),
      friends: pf.friends || 0, groups: pf.groups || 0, cheer: pf.cheer || 0, nudge: pf.nudge || 0, face: pf.face || 0, squad: pf.squad || 0 };
    return BADGES.map(([id, name, note, icon, tier, pct, test, secret]) => { const [cur, need] = test(b); return { id, name, note, icon, tier, pct, secret: !!secret, on: cur >= need, cur: Math.min(cur, need), need }; });
  }
  const tierOf = (t) => TIERS.find((x) => x[0] === t) || TIERS[0];
  const pctStr = (p) => (p < 1 ? String(p).replace('.', ',') : p < 10 ? String(p).replace('.', ',') : Math.round(p)) + NBSP + '%';
  /** Значок своей формы и цвета по редкости; не полученный — серый контур той же формы с замком (секретный — со знаком вопроса). */
  /* Блик, перелив и искры у всех значков идут в одном такте от часов — где и когда бы значок ни появился, они вспыхивают вместе. */
  const beat = () => { const t = Date.now(), d = (ms) => `-${((t % ms) / 1000).toFixed(2)}s`; return `--gd:${d(3600)};--gs:${d(4000)};--gt:${d(2400)}`; };
  const hex = (b, size = 62) => `<i class="bd-hex t-${b.tier}${b.on ? ' on' : ''}" style="--s:${size}px;${beat()}"><svg class="bd-ol" viewBox="0 0 60 66" aria-hidden="true"><path d="${SHAPE[b.tier] || SHAPE.common}"/></svg>${b.on ? `<i class="bd-f"><svg viewBox="0 0 60 66" aria-hidden="true">${DECO[b.tier] || ''}</svg></i>` : ''}${b.on ? ic(b.icon, Math.round(size * 0.38), 2.2) : b.secret ? `<b class="bd-q">?</b>` : ic('lock', Math.round(size * 0.29), 2.2)}${b.on && b.tier === 'myth' ? '<i class="bd-sp" aria-hidden="true"><u></u><u></u><u></u><u></u></i>' : ''}</i>`;
  const bdName = (b) => (b.secret && !b.on ? 'Секретный' : b.name);

  /* ── График статистики ───────────────────────────────────── */

  const CW = 318, CH = 172;
  const dShort = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
  /** Плавная линия без выбросов за точки (монотонная кубическая): график не рисует значений, которых не было. */
  function smooth(P) {
    const f = (v) => v.toFixed(1), n = P.length;
    if (n < 3) return 'M' + P.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L');
    const dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = P[i + 1][0] - P[i][0]; m[i] = (P[i + 1][1] - P[i][1]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
    let d = `M${f(P[0][0])} ${f(P[0][1])}`;
    for (let i = 0; i < n - 1; i++) d += ` C${f(P[i][0] + dx[i] / 3)} ${f(P[i][1] + (t[i] * dx[i]) / 3)} ${f(P[i + 1][0] - dx[i] / 3)} ${f(P[i + 1][1] - (t[i + 1] * dx[i]) / 3)} ${f(P[i + 1][0])} ${f(P[i + 1][1])}`;
    return d;
  }
  /** Подъёмы за выбранный период и за такой же период перед ним — для сравнения. */
  function period(st, range) {
    const now = day0(new Date()), n = range === '7' ? 7 : range === '30' ? 30 : range === '90' ? 90 : 0, ago = (x) => (now - x.d) / 864e5;
    if (!n) { const h = st.h, k = Math.floor(h.length / 2); return { list: h, prev: h.length >= 6 ? h.slice(0, k) : [], cur: h.length >= 6 ? h.slice(k) : h }; }
    const list = st.h.filter((x) => ago(x) < n);
    return { list, prev: st.h.filter((x) => ago(x) >= n && ago(x) < 2 * n), cur: list };
  }
  /** Сводка над графиком: среднее за период и чем оно отличается от прошлого периода. Раньше и быстрее — зелёным. */
  function chartSum(p, metric, range) {
    const task = metric === 'task', v = (x) => (task ? x.secs : x.wake), mean = (l) => l.reduce((a, x) => a + v(x), 0) / l.length;
    if (!p.list.length) return '';
    const avg = mean(p.list), d = p.prev.length >= 2 ? Math.round(mean(p.cur) - mean(p.prev)) : null;
    /* «Всё время» сравнивает первую и вторую половину истории. Без изменений — «так же» и с чем сравнили, без повтора. */
    const when = range === '7' ? 'неделей раньше' : range === '30' ? 'месяцем раньше' : range === '90' ? 'тремя месяцами раньше' : 'в первые дни', was = (d ? 'чем ' : 'как ') + when;
    const chip = d == null ? '' : !d ? `<em>${ic('equal', 14, 2.6)}так же</em>`
      : `<em class="${d < 0 ? 'good' : 'bad'}">${ic(d < 0 ? 'trending-down' : 'trending-up', 14, 2.6)}${task ? `${d < 0 ? 'быстрее' : 'медленнее'} на ${Math.abs(d)} с` : `на ${Math.abs(d)} мин ${d < 0 ? 'раньше' : 'позже'}`}</em>`;
    return `<div class="ap-ch-sum"><div><b>${task ? `${Math.round(avg)}<u data-k="секунд·коротко">с</u>` : fmtMin(Math.round(avg))}</b><small>${task ? 'в среднем на задание' : 'в среднем подъём'}</small></div>${chip ? `<span>${chip}<small>${was}</small></span>` : ''}</div>`;
  }
  function chart(list, metric) {
    const task = metric === 'task', vals = list.map((x) => (task ? x.secs : x.wake)), n = vals.length;
    const lo = Math.min(...vals), hi = Math.max(...vals), gap = Math.max(task ? 3 : 2, (hi - lo) * 0.3), y0 = lo - gap, y1 = hi + gap;
    const L = 44, R = 8, T = 16, B = 26;
    const X = (i) => L + (n === 1 ? (CW - L - R) / 2 : (i * (CW - L - R)) / (n - 1));
    const Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (CH - T - B);
    const avg = vals.reduce((a, b) => a + b, 0) / n;
    const lab = (v) => (task ? `${Math.round(v)} с` : fmtMin(Math.round(v)));
    const P = vals.map((v, i) => [X(i), Y(v)]), line = smooth(P), best = vals.indexOf(lo);
    /* Подписи по оси X: за неделю — все дни, за месяц — четыре даты на равном расстоянии. */
    const xs = n <= 7 ? list.map((_, i) => i) : [...new Set([0, 1, 2, 3].map((k) => Math.round((k * (n - 1)) / 3)))];
    const data = list.map((x, i) => `${P[i][0].toFixed(1)}|${P[i][1].toFixed(1)}|${cap(DAYS[(x.d.getDay() + 6) % 7].toLowerCase())}, ${dShort(x.d)}|${lab(vals[i])}`).join(';');
    return `<div class="ap-ch js-chart" data-p="${data}"><svg class="ap-chart-svg" viewBox="0 0 ${CW} ${CH}" role="img" aria-label="${task ? 'Время на задание по дням' : 'Время подъёма по дням'}">
      <defs><linearGradient id="apArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD12E" stop-opacity=".4"/><stop offset="1" stop-color="#FFD12E" stop-opacity="0"/></linearGradient></defs>
      ${[hi, lo].map((v) => `<line class="g" x1="${L}" x2="${CW - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="yl" x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${lab(v)}</text>`).join('')}
      <path class="ar" d="${line} L${X(n - 1).toFixed(1)} ${CH - B} L${X(0).toFixed(1)} ${CH - B} Z"/>
      <line class="avg" x1="${L}" x2="${CW - R}" y1="${Y(avg).toFixed(1)}" y2="${Y(avg).toFixed(1)}"/>
      <path class="ln" pathLength="1" d="${line}"/>
      ${n <= 10 ? P.slice(0, -1).map(([x, y]) => `<circle class="pt" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2"/>`).join('') : ''}
      ${best !== n - 1 ? `<circle class="pt best" cx="${P[best][0].toFixed(1)}" cy="${P[best][1].toFixed(1)}" r="4.6"/>` : ''}
      <circle class="pt last" cx="${P[n - 1][0].toFixed(1)}" cy="${P[n - 1][1].toFixed(1)}" r="5.6"/>
      ${xs.map((i) => `<text class="xl" x="${X(i).toFixed(1)}" y="${CH - 6}" text-anchor="${n <= 7 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${n <= 7 ? DAYS[(list[i].d.getDay() + 6) % 7] : dShort(list[i].d)}</text>`).join('')}
      <line class="gd" x1="0" x2="0" y1="${T - 6}" y2="${CH - B}"/><circle class="sel" r="6" cx="-20" cy="-20"/>
    </svg><div class="ap-tip" aria-live="polite"><small></small><b></b></div></div>
    <div class="ap-ch-key"><span><i class="k-last"></i>последний</span>${best !== n - 1 ? `<span><i class="k-best"></i>${task ? 'быстрее всего' : 'раньше всего'}</span>` : ''}<span><i class="k-avg"></i>среднее</span></div>`;
  }
  /**
   * Касание или курсор над графиком: линия, точка и подсказка с днём и значением.
   * Плавно: точка едет по самой кривой за пальцем, а не прыгает от дня к дню; движение сглаживается по кадрам.
   * Подпись — ближайший день, после отпускания точка мягко садится на него. На телефоне вертикальное движение
   * листает экран (график не перехватывает прокрутку), горизонтальное — ведёт по графику.
   */
  function chartScrub(root) {
    const wrap = root.querySelector('.js-chart');
    if (!wrap) return;
    const svg = wrap.querySelector('svg'), tip = wrap.querySelector('.ap-tip'), gd = svg.querySelector('.gd'), dot = svg.querySelector('.sel'), ln = svg.querySelector('.ln');
    const pts = wrap.dataset.p.split(';').map((r) => { const [x, y, d, v] = r.split('|'); return { x: +x, y: +y, d, v }; });
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* Кривая по x: 240 точек вдоль линии — y под пальцем находится без пересчёта пути на каждом кадре. */
    let curve = null;
    const sample = () => {
      if (curve) return curve;
      const len = ln.getTotalLength ? ln.getTotalLength() : 0;
      curve = len ? Array.from({ length: 241 }, (_, i) => { const q = ln.getPointAtLength((i / 240) * len); return [q.x, q.y]; }) : pts.map((p) => [p.x, p.y]);
      return curve;
    };
    const yAt = (x) => {
      const c = sample();
      let lo = 0, hi = c.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m][0] < x) lo = m; else hi = m; }
      const [x0, y0] = c[lo], [x1, y1] = c[hi];
      return x1 === x0 ? y0 : y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    };
    const near = (x) => pts.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
    const x0 = pts[0].x, x1 = pts[pts.length - 1].x;
    let tx = x0, cx = null, raf = 0, shown = null, hide = 0;
    const paint = () => {
      raf = 0;
      if (cx == null) cx = tx;
      cx += (tx - cx) * (calm ? 1 : 0.3);
      if (Math.abs(tx - cx) < 0.05) cx = tx;
      const y = yAt(cx), p = near(cx);
      gd.setAttribute('x1', cx); gd.setAttribute('x2', cx);
      dot.setAttribute('cx', cx); dot.setAttribute('cy', y);
      if (p !== shown) { tip.firstChild.textContent = p.d; tip.lastChild.textContent = p.v; shown = p; }
      /* Подсказка двигается сдвигом (без перерасчёта раскладки) и не выходит за края графика. */
      const r = svg.getBoundingClientRect(), w = wrap.getBoundingClientRect(), k = r.width / CW, half = tip.offsetWidth / 2;
      const px = Math.max(half + 2, Math.min(w.width - half - 2, r.left - w.left + cx * k)), py = r.top - w.top + y * k;
      tip.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0) translate(-50%,calc(-100% - 14px))`;
      if (cx !== tx) raf = requestAnimationFrame(paint);
    };
    const go = (x) => { tx = Math.max(x0, Math.min(x1, x)); if (!raf) raf = requestAnimationFrame(paint); };
    const toX = (e) => { const r = svg.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * CW; };
    const on = (fresh) => { clearTimeout(hide); if (fresh && !wrap.classList.contains('scrub')) cx = null; wrap.classList.add('scrub'); };
    const off = (ms) => { clearTimeout(hide); hide = setTimeout(() => wrap.classList.remove('scrub'), ms); };
    let mode = null, sx = 0, sy = 0;
    svg.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') { on(true); go(toX(e)); return; }
      mode = 'wait'; sx = e.clientX; sy = e.clientY;
    });
    svg.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') { on(true); go(toX(e)); return; }
      if (mode === 'wait') {
        const dx = Math.abs(e.clientX - sx), dy = Math.abs(e.clientY - sy);
        if (dx > 6 && dx > dy) { mode = 'scrub'; try { svg.setPointerCapture(e.pointerId); } catch (er) { /* указатель уже отпущен */ } on(true); go(toX(e)); }
        else if (dy > 6) mode = null;
        return;
      }
      if (mode === 'scrub') go(toX(e));
    });
    svg.addEventListener('pointerup', (e) => {
      /* Касание без движения — показать ближайший день; после ведения — мягко сесть на ближайший день. */
      if (mode === 'wait') on(true);
      if (mode || e.pointerType === 'mouse') go(near(toX(e)).x);
      mode = null;
      off(e.pointerType === 'mouse' ? 2500 : 1800);
    });
    svg.addEventListener('pointercancel', () => { mode = null; off(250); });
    svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') off(200); });
  }

  /* ── Части экранов ───────────────────────────────────────── */

  /* Панель вкладок — стекло как у Apple (css/glass.css, js/glass.js): стеклянная полоса с подложкой под выбранной вкладкой и круглая «+». */
  const tabBtns = (cur) => TABS.map(([id, name]) => `<button class="${cur === id ? 'on' : ''}" data-act="tab:${id}">${Sonly.ui(id, 24, true)}<span>${name}</span></button>`).join('');
  const tabbar = (cur) => `<nav class="ap-tabs"><div class="ap-tabs-pill lg" data-lg="bar"><i class="ap-tab-ind" aria-hidden="true"></i>${tabBtns(cur)}</div><i class="ap-lens lg" data-lg="lens" aria-hidden="true"></i>
    <button class="ap-plus lg" data-lg="bar" data-act="new" aria-label="Новый будильник">${ic('plus', 27, 2.3)}</button></nav>`;

  /** Неделя кружками: выполненные подъёмы, сегодняшний день и дни, на которые стоит будильник. */
  function weekOf(s, st) {
    const now = new Date(), t = (now.getDay() + 6) % 7;
    const plan = (d) => s.alarms.some((a) => a.on && !a.once && a.days.includes(d));
    return DAYS.map((d, k) => {
      const date = day0(new Date(now.getFullYear(), now.getMonth(), now.getDate() + k - t)).getTime();
      return { d, done: st.h.some((x) => x.d.getTime() === date), today: k === t, plan: plan(k), past: k < t };
    });
  }
  function weekCard(s, st, i) {
    const week = weekOf(s, st);
    return `<div class="ap-card ap-week" data-in style="--i:${i}"><div class="ap-card-h"><b>Эта неделя</b><span>${week.filter((w) => w.done).length} из ${week.filter((w) => w.plan).length}</span></div>
      <div class="ap-week-d">${week.map((w) => `<i class="${w.done ? 'done' : w.plan && !w.past ? 'plan' : 'off'}${w.today ? ' today' : ''}"><u>${w.done ? ic('check', 15, 3.2) : ''}</u>${w.d}</i>`).join('')}</div></div>`;
  }

  /** Дни недели буквами: включённые подсвечены, сегодняшний — с точкой снизу. */
  const dayDots = (a, now) => { const t = (now.getDay() + 6) % 7; return `<span class="al-days" role="img" aria-label="${cap(daysText(a.days))}">${DAYS.map((d, k) => `<i class="${a.days.includes(k) ? 'on' : ''}${k === t ? ' now' : ''}" data-ini="${d}">${d[0]}</i>`).join('')}</span>`; };
  const inText = (d, now) => { const min = Math.max(1, Math.round((d - now) / 60000)), h = Math.floor(min / 60), dd = Math.floor(h / 24); return dd ? `через ${dd} д ${h % 24} ч` : h ? `через ${h} ч` : `через ${min} мин`; };

  /**
   * Карточка будильника: название, время, дни буквами и сколько до звонка; задание, звук и проверка подъёма — метками.
   * «Пропустить» называет, какой звонок пропустится, а пропущенный — какой именно и когда следующий.
   */
  const alarmCard = (a, i) => {
    const t = taskOf(a), now = new Date(), at = nextOf(a, now), skipped = a.on && a.skip ? nextOf({ ...a, skip: false }, now) : null;
    const when = !a.on ? 'выключен' : at ? inText(at, now) : '';
    const skip = !a.on || a.once ? '' : a.skip
      ? `<button class="ap-skip on" data-act="skip:${a.id}">${ic('undo-2', 15, 2.3)}<span>${skipped ? `${cap(dayWord(skipped, now))} не зазвонит` : 'Следующий звонок пропущен'}</span><b>Вернуть</b></button>`
      : `<button class="ap-skip" data-act="skip:${a.id}">${ic('skip-forward', 15, 2.3)}<span>Пропустить звонок ${at ? dayWord(at, now) : ''}</span></button>`;
    return `<article class="ap-alarm${a.on ? ' on' : ''}" data-act="edit:${a.id}" role="button" tabindex="0" data-in style="--i:${i + 5}">
      <div class="ap-alarm-main"><div><small>${esc(a.name || 'Будильник')}</small><b>${hm(a)}</b></div>
        <button class="ap-tg${a.on ? ' on' : ''}" data-act="toggle:${a.id}" role="switch" aria-checked="${a.on}" aria-label="Будильник ${hm(a)}"></button></div>
      <div class="al-when">${a.once ? `<span class="al-once">Один раз${at ? ` · ${dayWord(at, now)}` : ''}</span>` : dayDots(a, now)}<em>${when}</em></div>
      <div class="ap-alarm-meta"><span class="ap-tchip"><i class="tb cat-${t.cat}">${tic(t, 15)}</i>${t.name}</span><span class="al-chip">${Sonly.si('music', 14)}${esc(sndName(a.sound))}</span>${a.check ? `<span class="al-chip" title="Проверка подъёма через ${a.check} мин">${Sonly.si('eye', 14)}${a.check} мин</span>` : ''}</div>
      ${skip}
    </article>`;
  };

  /** Готовность к звонку: что проверено и что может помешать проснуться. Этот же список — на странице «Готовность к звонку». */
  const readiness = (s) => [
    ['ok', 'Уведомления включены', ''],
    [s.volume < 40 ? 'warn' : 'ok', `Громкость ${s.volume} %`, s.volume < 40 ? 'Тихо — можно проспать' : ''],
    ['ok', 'Беззвучный режим не мешает', ''],
  ].concat(Sonly.lock && Sonly.lock.ready(s) ? [['ok', 'Приложения закроются до подъёма', '']] : []).concat([['info', 'Не смахивай приложение', '']]);
  /** Строка на главной: итог проверок и пробный звонок в одно касание. */
  function readyCard(s, i) {
    const warn = readiness(s).find((x) => x[0] === 'warn');
    return `<div class="ap-card ap-rdy${warn ? ' warn' : ''}" data-in style="--i:${i}"><button class="ap-rdy-in" data-act="page:help">
      <i class="ap-row-i c" style="--c:${warn ? '#FF9500' : '#34C759'}">${Sonly.si('ready', 24)}</i><span><b>${warn ? 'Тихий звонок' : 'Готов к звонку'}</b><small>${warn ? warn[1] : 'Всё в порядке'}</small></span></button>
      <button class="ap-rdy-go" data-act="ring-test">${Sonly.si('play', 14)}Проверить</button></div>`;
  }

  /** Строка списка: значок в плитке (color — цвет плитки), подпись, значение справа. */
  const row = (icon, label, value, act, color) => `<button class="ap-row" data-act="${act}"><i class="ap-row-i${color ? ' c' : ''}"${color ? ` style="--c:${color}"` : ''}>${icon}</i><span>${label}</span>${value ? `<em>${value}</em>` : ''}${chev()}</button>`;
  const seg = (key, cur, opts) => `<div class="ap-seg sm">${opts.map(([v, name]) => `<button class="${cur === v ? 'on' : ''}" data-act="${key}:${v}">${name}</button>`).join('')}</div>`;

  function homeHtml(s) {
    const now = new Date(), st = stats(s), ring = nextRing(s, now), rt = ring && taskOf(ring.a);
    return `<div class="ap-scroll scroll">
      <header class="ap-top" data-in><div class="ap-brand">${Sonly.logo()}</div><span class="ap-top-r"><button class="ap-chip lg" data-act="tab:stats" aria-label="Серия подъёмов">${ic('flame', 16, 2.3)}<b class="ap-chip-n">${st.streak}</b></button>${Sonly.people ? `<button class="ap-me" data-act="pp-profile" aria-label="Профиль">${Sonly.people.avatar(s, 38)}</button>` : ''}</span></header>
      ${ring ? `<section class="ap-hero" data-in style="--i:1"><i class="ap-sun"></i><i class="ap-rise">${Sonly.mark()}</i><small>Зазвонит через</small><div class="ap-hero-n">${until(ring.at, now)}</div>
          <div class="ap-hero-row"><span>${ic('alarm-clock', 15, 2.3)}${shortWhen(ring.at, now)} ${hm(ring.a)}</span><span>${tic(rt, 16)}${rt.name}</span></div></section>`
        : `<section class="ap-hero idle" data-in style="--i:1"><i class="ap-sun"></i><i class="ap-rise">${Sonly.mark()}</i><small>${s.alarms.length ? 'Все будильники выключены' : 'Будильников пока нет'}</small><div class="ap-hero-n t">Поставь будильник</div>
          <button class="ap-hero-btn" data-act="new">${ic('plus', 17, 2.6)}Новый будильник</button></section>`}
      ${weekCard(s, st, 2)}
      ${Sonly.lock ? Sonly.lock.home(s, 3) : ''}
      ${s.shareHidden ? '' : `<div class="ap-card ap-share" data-in style="--i:3"><button class="ap-share-in" data-act="page:share"><i>${ic('gift', 20, 2.1)}</i><span><b>${Sonly.partner.title}</b><small>${Sonly.partner.sub}</small></span></button><button class="ap-share-x" data-act="share-hide" aria-label="Скрыть">${ic('x', 15, 2.4)}</button></div>`}
      <div class="ap-sec" data-in style="--i:4"><h2>Будильники</h2>${s.alarms.length ? `<button class="ap-more lg" data-act="al-menu" aria-label="Действия с будильниками">${ic('ellipsis', 20, 2.6)}</button>` : ''}</div>
      ${s.alarms.length ? `<div class="ap-alarms">${s.alarms.map(alarmCard).join('')}</div>`
        : `<button class="ap-add" data-act="new" data-in style="--i:5">${ic('plus', 18, 2.4)}Первый будильник</button>`}
      ${readyCard(s, s.alarms.length + 6)}
    </div>`;
  }

  /* ── Листы: редактор, задания, набор, проверка, звуки ────── */

  const blank = (s) => ({ id: null, h: 7, m: 0, days: [0, 1, 2, 3, 4], once: false, task: 'hunt', sound: s.sndDef || DEF_SND, name: `Будильник №${s.alarms.length + 1}`, on: true, rise: s.riseDef !== false, vibro: true, check: 5, skip: false, opts: {} });
  const keepTop = (flow, enter) => { const b = flow.sheets.querySelector('.ap-sh-body'); return !enter && b ? b.scrollTop : 0; };
  /* При возврате «назад» место в списке уже поставил сам лист (память прокрутки в core.js) — ноль его не перебивает. */
  const setTop = (flow, y) => { const b = flow.sheets.querySelector('.ap-sh-body'); if (b && (y || !b.closest('.sheet.back'))) b.scrollTop = y; };
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
          ${t.id === 'random' ? row(Sonly.si('shuffle'), 'Набор заданий', `${poolOf(e).length} из ${TASKS.length}`, 'ed-pool') : TO.has(t.id) ? row(Sonly.si('sliders'), 'Настройка', TO.summary(t.id, TO.get(e, t.id)), 'ed-opts') : ''}
          ${row(Sonly.si('music'), 'Звук', esc(sndName(e.sound)), 'ed-sound')}
        </div>
        <h3>Правила</h3>
        <div class="ap-card ap-list">
          <div class="ap-row"><i class="ap-row-i">${Sonly.si('snooze')}</i><span>Отложить</span><em>${ic('lock', 13, 2.5)}Нельзя</em></div>
          ${row(Sonly.si('eye'), 'Проверка подъёма', e.check ? `${e.check}\u00a0мин` : 'выключена', 'ed-check')}
          <div class="ap-row"><i class="ap-row-i">${Sonly.si('volume')}</i><span>Громкость нарастает</span><button class="ap-tg sm${e.rise ? ' on' : ''}" data-act="ed-flag:rise" role="switch" aria-checked="${e.rise}" aria-label="Громкость нарастает"></button></div>
          <div class="ap-row"><i class="ap-row-i">${Sonly.si('vibrate')}</i><span>Вибрация</span><button class="ap-tg sm${e.vibro ? ' on' : ''}" data-act="ed-flag:vibro" role="switch" aria-checked="${e.vibro}" aria-label="Вибрация"></button></div>
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
    const e = flow.state._ed, t = taskOf(e);
    /* У «Заправь кровать», «Утреннего неба» и «Витаминов» настроек нет — пустой лист не показываем, сразу редактор. */
    if (!TO.has(t.id)) { editor(flow, 'back'); return; }
    const o = TO.get(e, t.id), top = keepTop(flow, enter);
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
        <div class="ap-card ap-list">${CHECKS.map(([n, name, note]) => `<button class="ap-row ap-snd${note ? ' tall' : ''}${(e.check || 0) === n ? ' on' : ''}" data-act="ed-chk:${n}"><i class="ap-row-i">${Sonly.si(n ? 'eye' : 'eyeoff')}</i><span>${name}${note ? `<small>${note}</small>` : ''}</span><b class="ap-radio">${ic('check', 13, 3.4)}</b></button>`).join('')}</div></div>`, `ap-sheet ${enter}`);
  }

  /** Звуки по группам. Все доступны сразу: подарки за серию — пейзажи открыток, а не звуки. */
  function soundRows(s, cur, act) {
    const groups = SOUNDS.map(([g, list]) => [g, list.map((n) => ({ name: n, open: true }))]);
    cur = Sonly.sound.resolve(cur);
    /* Свои звуки (запись и файлы) — первыми: это то, что человек сделал сам. */
    return (Sonly.mysnd ? Sonly.mysnd.rows(cur, act) : '') + groups.map(([g, list]) => `<h3>${g}</h3><div class="ap-card ap-list">${list.map((x) => (x.open
      ? `<button class="ap-row ap-snd${cur === x.name ? ' on' : ''}" data-act="${act}:${x.name}"><i class="ap-row-i c" style="--c:${(SND_ICON[g] || SND_ICON['Мелодии'])[1]}">${ic((SND_ICON[g] || SND_ICON['Мелодии'])[0], 17, 2.3)}</i><span>${x.name}</span><b class="ap-radio">${ic('check', 13, 3.4)}</b></button>`
      : `<div class="ap-row ap-snd locked"><i class="ap-row-i">${Sonly.si('lock')}</i><span>${x.name}</span><em>серия ${x.n}</em></div>`)).join('')}</div>`).join('');
  }
  function soundPicker(flow, enter = 'push') {
    const s = flow.state, e = s._ed, top = keepTop(flow, enter);
    flow.sheet(`${back('Звук')}<div class="ap-sh-body scroll">${soundRows(s, e.sound, 'ed-snd')}</div>`, `ap-sheet ${enter}`);
    setTop(flow, top);
    if (Sonly.partner && Sonly.partner.mount) Sonly.partner.mount(flow);
  }

  /**
   * Виджеты в настройках — как они выглядят на телефоне: маленькие «Серия» и «Следующий будильник», широкий «Утро целиком»
   * и виджеты экрана блокировки. Листаются вбок; небо следующего будильника — того же цвета, что карточка утра в это время.
   */
  function widgets(s, st, now) {
    const nx = nextRing(s, now), nt = nx && taskOf(nx.a), wk = weekOf(s, st), M = Sonly.morning;
    const sky = nx && M && M.sky ? M.sky(nx.a.h * 60 + nx.a.m) : null, tone = sky ? ` style="--a:${sky.a};--b:${sky.b};--t:${sky.ink}"` : '';
    const rw = M ? M.rewards(s) : [], gift = rw.find((r) => !r.open), left = gift ? Math.max(1, gift.n - st.streak) : 0;
    const dots = `<span class="wd-week">${wk.map((w) => `<i class="${w.done ? 'on' : w.today && w.plan ? 'now' : ''}"></i>`).join('')}</span>`;
    const when = nx ? `<small>${cap(dayWord(nx.at, now))}</small><b>${hm(nx.a)}</b><span><i class="tb cat-${nt.cat}">${tic(nt, 12)}</i>${nt.name}</span>` : '<small>Будильник</small><b>—</b><span>не стоит</span>';
    const days = `${st.streak} ${pl(st.streak, 'день', 'дня', 'дней')}`;
    const C = 2 * Math.PI * 21, p = gift ? Math.min(1, st.streak / gift.n) : 1;
    const page = (inner, cap2, cls = '') => `<figure class="ap-wg-page${cls}">${inner}${cap2 ? `<figcaption>${cap2}</figcaption>` : ''}</figure>`;
    return `<div class="bf ap-wg"><div class="bf-track">
      ${page(`<div><div class="wd wd-streak${st.streak ? '' : ' cold'}">${FLAME}<b>${st.streak}</b><small>${pl(st.streak, 'день', 'дня', 'дней')} подряд</small>${dots}</div><figcaption>Серия</figcaption></div>
        <div><div class="wd wd-next"${tone}><i class="wd-sun"></i>${when}</div><figcaption>Следующий будильник</figcaption></div>`, '', ' duo')}
      ${page(`<div class="wd wd-wide"><div class="wd-next"${tone}><i class="wd-sun"></i>${when}</div>
        <div class="wd-r${st.streak ? '' : ' cold'}"><span>${FLAME}<b>${st.streak}</b></span><small>${pl(st.streak, 'день', 'дня', 'дней')} подряд</small>${dots}${gift ? `<em>${Sonly.si('gift', 12)}«${gift.name}» через ${left}</em>` : ''}</div></div>`, 'Утро целиком')}
      ${page(`<div class="wd-lock"><small>${cap(now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }))}</small><b>9:41</b>
        <div><span class="wl-ring"><svg viewBox="0 0 48 48" aria-hidden="true"><circle class="bg" cx="24" cy="24" r="21"/><circle class="fg" cx="24" cy="24" r="21" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - p)).toFixed(1)}"/></svg><i>${Sonly.si('flame', 13)}<b>${st.streak}</b></i></span>
          <span class="wl-rect">${Sonly.si('alarm', 17)}<b>${nx ? `${cap(dayWord(nx.at, now))}, ${hm(nx.a)}` : 'Будильник не стоит'}</b><small>${nx ? nt.name : `Серия ${days}`}</small></span></div></div>`, 'Экран блокировки')}
    </div><div class="bf-dots" aria-hidden="true"><i class="on"></i><i></i><i></i></div></div>`;
  }

  const soon = (flow, title) => flow.sheet(`<div class="msg"><b>${esc(title)}</b><p>В прототипе этот раздел пока не подключён.</p><button class="msg-ok" data-act="sheet-close">Понятно</button></div>`, 'center');

  /* ── Экраны ──────────────────────────────────────────────── */

  const screens = {
    home: {
      chrome: false,
      render: (c) => homeHtml(c.s),
      /* Время до звонка пересчитывается раз в полминуты, пока экран открыт. Открытый поверх лист (профиль, значки) остаётся. */
      mount(el, c) { if (!c.still) c.at(30000, () => c.flow.rerender(true)); },
    },

    stats: {
      chrome: false,
      render: (c) => {
        const s = c.s, st = stats(s), now = new Date(), bd = badges(s), got = bd.filter((b) => b.on).length;
        const per = period(st, s.range), list = per.list;
        const band = st.score == null ? null : RANGES.find((r) => st.score >= r[0]);
        return `<div class="ap-scroll scroll"><h1 class="ap-h1" data-in>Статистика</h1>
          <div class="ap-duo" data-in style="--i:1">
            <div class="ap-card ap-big${st.streak ? '' : ' cold'}">${FLAME}<b>${st.streak}</b><small>${pl(st.streak, 'день', 'дня', 'дней')} подряд</small>${st.best > st.streak ? `<em>рекорд ${st.best}</em>` : ''}</div>
            <button class="ap-card ap-big" data-act="st-badges">${Sonly.news ? Sonly.news.tag(s, 'b') : ''}<span class="bd-count${got ? '' : ' none'}"><svg viewBox="0 0 60 66" aria-hidden="true"><path d="${HEX}"/></svg><b>${got}</b></span><small>${pl(got, 'значок', 'значка', 'значков')} из ${bd.length}</small></button></div>
          <div class="ap-duo" data-in style="--i:2">
            <div class="ap-card ap-stat"><i>${ic('sunrise', 20, 2.1)}</i><b>${st.h.length}</b><small>${pl(st.h.length, 'подъём', 'подъёма', 'подъёмов')} всего</small></div>
            <div class="ap-card ap-stat"><i>${ic('timer', 20, 2.1)}</i><b>${st.h.length ? Math.round(st.h.reduce((a, x) => a + x.secs, 0) / st.h.length) : '—'}<u data-k="секунд·коротко">${st.h.length ? 'с' : ''}</u></b><small>в среднем на\u00a0задание</small></div></div>
          ${weekCard(s, st, 3)}
          <div class="ap-card ap-chart" data-in style="--i:4"><div class="ap-card-h">${seg('st-metric', s.metric, [['wake', 'Подъём'], ['task', 'Задание']])}</div>
            ${list.length >= 3 ? chartSum(per, s.metric, s.range) + chart(list, s.metric) : `<div class="ap-empty">${ic('chart-spline', 26, 1.8)}<span>${st.h.length >= 3 ? 'За эти дни мало подъёмов — выбери период длиннее' : 'График появится после трёх подъёмов'}</span></div>`}
            ${seg('st-range', s.range, [['7', '7 дней'], ['30', '30 дней'], ['90', '3 месяца'], ['all', 'Всё время']])}</div>
          <div class="ap-card ap-cons" data-in style="--i:5"><div class="ap-card-h"><b>Стабильность подъёма</b><button class="ap-q" data-act="st-info" aria-label="Как считается стабильность">?</button></div>
            ${band ? `<div class="ap-cons-v"><b>${st.score}</b><span style="--c:${band[3]}">${band[1]}</span><small>разброс ${st.spread} ${pl(st.spread, 'минута', 'минуты', 'минут')}</small></div>` : `<div class="ap-cons-v none"><b>—</b><small>Нужно три подъёма</small></div>`}
            <div class="ap-cons-bar"><i style="flex:30;background:#E5484D"></i><i style="flex:20;background:#F08A24"></i><i style="flex:20;background:#FFC62B"></i><i style="flex:30;background:#1FA055"></i>${band ? `<u style="left:${st.score}%"></u>` : ''}</div>
            <div class="ap-cons-t"><span>0</span><span style="left:30%">30</span><span style="left:50%">50</span><span style="left:70%">70</span><span style="left:100%">100</span></div></div>
        </div>`;
      },
      mount: (el) => chartScrub(el),
    },

    settings: {
      chrome: false,
      render: (c) => {
        const s = c.s, st = stats(s), now = new Date();
        return `<div class="ap-scroll scroll"><h1 class="ap-h1" data-in>Настройки</h1>
          ${Sonly.people ? `<button class="ap-card ap-prof" data-act="pp-profile" data-in style="--i:1">${Sonly.people.avatar(s, 54)}<span><b>${esc(Sonly.people.name(s) || 'Профиль')}</b><small>Друзья, значки и твои цифры</small></span>${chev()}</button>` : ''}
          <button class="ap-card ap-gift" data-act="page:share" data-in style="--i:1"><i>${Sonly.mark()}</i><span><b>${Sonly.partner.title}</b><small>${Sonly.partner.sub}</small></span>${chev()}</button>
          <h3>Будильник</h3>
          <div class="ap-card ap-list">${row(Sonly.si('volume'), 'Громкость', `${s.volume} %`, 'page:volume', '#FF3B30')}${row(Sonly.si('music'), 'Звук по умолчанию', esc(sndName(s.sndDef)), 'page:sound', '#FF2D55')}${row(Sonly.si('ready'), 'Готовность к звонку', '', 'page:help', '#34C759')}</div>
          ${Sonly.lock ? `<h3>Фокус</h3><div class="ap-card ap-list"><button class="ap-row tall" data-act="page:lock"><i class="ap-row-i c" style="--c:${Sonly.lock.COLORS.lock}">${Sonly.si('lock')}</i><span>Блокировка приложений<small>${Sonly.lock.status(s)}</small></span>${chev()}</button></div>` : ''}
          <h3>Оформление</h3>
          <div class="ap-card ap-list"><div class="ap-row col"><div><i class="ap-row-i c" style="--c:#AF52DE">${Sonly.si('theme')}</i><span>Тема</span></div>${seg('theme', s.theme, [['system', 'Как в системе'], ['dark', 'Тёмная'], ['light', 'Светлая']])}</div>
            ${row(Sonly.si('globe'), 'Язык', Sonly.i18n ? Sonly.i18n.LANGS.find((x) => x[0] === Sonly.i18n.lang)[1] : 'Русский', 'page:lang', '#0A84FF')}${row(Sonly.si('bell'), 'Уведомления', `${1 + (s.nEve ? 1 : 0) + (s.nWeek ? 1 : 0)} из 3`, 'page:notify', '#FF3B30')}</div>
          <h3>Виджеты</h3>${widgets(s, st, now)}
          <button class="ap-link" data-act="page:widgets">Как добавить виджет${ic('chevron-right', 14, 2.6)}</button>
          <h3>Подписка</h3>
          <div class="ap-card ap-list">${row(Sonly.si('card'), 'Управлять подпиской', '', 'page:sub', '#34C759')}${row(Sonly.si('restore'), 'Восстановить покупки', '', 'restore-app', '#0A84FF')}${row(Sonly.si('ticket'), 'Ввести промокод', s.promo === 'ok' ? '−25 %' : '', 'page:promo', '#FF9500')}</div>
          <h3>Поддержка</h3>
          <div class="ap-card ap-list">${row(Sonly.si('message'), 'Написать в поддержку', '', 'page:msg:support', '#0A84FF')}${row(Sonly.si('idea'), 'Предложить идею', '', 'page:msg:idea', '#FFAA00')}${row(Sonly.si('bug'), 'Сообщить об ошибке', '', 'page:msg:bug', '#FF3B30')}</div>
          <h3>Документы</h3>
          <div class="ap-card ap-list">${row(Sonly.si('doc'), 'Условия использования', '', 'page:doc:terms', '#8E8E93')}${row(Sonly.si('privacy'), 'Конфиденциальность', '', 'page:doc:privacy', '#8E8E93')}</div>
          <p class="ap-ver"><span>Сделано с ${Sonly.mark()} и любовью к утру</span>sonly 1.0 · сборка 1</p>
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
  /* Темы обращения: одно касание вместо первой фразы. Журнал проверки (diag.js) прикладывается к поддержке и ошибкам. */
  const TOPICS = { support: ['Не зазвонил', 'Не засчиталось задание', 'Камера или микрофон', 'Подписка', 'Другое'], bug: ['Зависло', 'Не тот экран', 'Звук', 'Камера', 'Другое'], idea: ['Новое задание', 'Звуки', 'Статистика', 'Утро', 'Другое'] };
  const DOCS = { terms: 'Условия использования', privacy: 'Политика конфиденциальности' };
  const PROMO_MSG = { ok: '−25 % на следующий год', bad: 'Такого кода нет', own: 'Это твой код — его вводят твои зрители.' };
  const WIDGET_STEPS = ['Зажми пустое место на экране «Домой».', 'Нажми «Изменить» вверху и выбери «Добавить виджет».', 'Найди sonly и добавь виджет.'];

  /* Картинки разделов: вместо пустой страницы со строками — то, как это выглядит на самом деле. */
  /** Уведомления так, как они придут: звонок всегда, вечернее и недельное — если включены (выключенные бледнеют). */
  function notifyPreview(s) {
    const now = new Date(), nx = nextRing(s, now);
    const ban = (on, title, when, text, i) => `<div class="pg-nt${on ? '' : ' off'}" data-in style="--i:${i}"><i class="pg-nt-app">${Sonly.mark()}</i><div><span><b>${title}</b><small>${on ? when : 'выключено'}</small></span><p>${text}</p></div></div>`;
    return `<div class="pg-nts">${ban(true, 'sonly', 'сейчас', nx ? `Будильник ${hm(nx.a)}. Выключится только заданием «${taskOf(nx.a).name}».` : 'Будильник звонит, пока не выполнишь задание.', 0)}
      ${ban(s.nEve, 'sonly', '22:00', nx ? `${cap(dayWord(nx.at, now))} подъём в ${hm(nx.a)}. Поставь телефон на зарядку.` : 'На завтра будильник не стоит.', 1)}
      ${ban(s.nWeek, 'sonly', 'вс, 19:00', 'Итоги недели готовы — посмотри, как ты вставал.', 2)}</div>`;
  }
  /** Итог проверок крупно: щит с волнами и когда зазвонит. */
  function readyHero(s) {
    const now = new Date(), nx = nextRing(s, now), warn = readiness(s).find((x) => x[0] === 'warn');
    return `<div class="ap-card pg-rdy${warn ? ' warn' : ''}"><i class="pg-rdy-i"><u></u><u></u>${Sonly.si('ready', 40)}</i><b>${warn ? 'Тихий звонок' : 'Готов к звонку'}</b>
      <span>${nx ? `${cap(dayWord(nx.at, now))} в ${hm(nx.a)} · ${taskOf(nx.a).name}` : 'Будильник не стоит'}</span></div>`;
  }
  /** Экран «Домой» в режиме правки: значки покачиваются, сверху «+», на экране — виджеты sonly. */
  function widgetHome(s) {
    const now = new Date(), st = stats(s), nx = nextRing(s, now), nt = nx && taskOf(nx.a), M = Sonly.morning;
    const sky = nx && M && M.sky ? M.sky(nx.a.h * 60 + nx.a.m) : null, tone = sky ? ` style="--a:${sky.a};--b:${sky.b};--t:${sky.ink}"` : '';
    const when = nx ? `<small>${cap(dayWord(nx.at, now))}</small><b>${hm(nx.a)}</b><span><i class="tb cat-${nt.cat}">${tic(nt, 12)}</i>${nt.name}</span>` : '<small>Будильник</small><b>—</b><span>не стоит</span>';
    const APPS = [['#FF9500', 'music'], ['#34C759', 'message'], ['#0A84FF', 'globe'], ['#FF2D55', 'calendar'], ['#AF52DE', 'theme'], ['#8E8E93', 'sliders'], ['#5AC8FA', 'cloud'], ['#FFCC00', 'book']];
    return `<div class="pg-home" aria-hidden="true"><div class="pg-home-bar"><span>${ic('plus', 15, 2.8)}</span><em>Готово</em></div>
      <div class="pg-home-w"><div class="wd wd-streak${st.streak ? '' : ' cold'}">${FLAME}<b>${st.streak}</b><small>${pl(st.streak, 'день', 'дня', 'дней')} подряд</small></div><div class="wd wd-next"${tone}><i class="wd-sun"></i>${when}</div></div>
      <div class="pg-home-apps">${APPS.map(([c, id], i) => `<i class="pg-app" style="--c:${c};--d:${(i % 3) * -0.13}s">${Sonly.si(id, 22)}</i>`).join('')}</div></div>`;
  }

  /** Раздел настроек: заголовок, содержимое и кнопки внизу (если нужны). */
  function pageOf(s, id, arg) {
    switch (id) {
      case 'volume': return ['Громкость', `<div class="ap-card ap-vol"><div class="ap-vol-n"><b class="js-vn">${s.volume}</b><u>%</u></div>
          <div class="ap-vol-r">${ic('volume-1', 20, 2)}<input type="range" class="js-vol" min="10" max="100" step="5" value="${s.volume}" aria-label="Громкость будильника" style="--p:${((s.volume - 10) / 90) * 100}%">${ic('volume-2', 20, 2)}</div></div>
        <div class="ap-card ap-list gap">${tgRow(Sonly.si('trend'), 'Нарастание', 'За 10 секунд', s.riseDef, 'set-flag:riseDef')}${tgRow(Sonly.si('ring'), 'В беззвучном режиме', '', true, '')}</div>`,
        '<button class="ap-btn" data-act="vol-test">Проверить звук</button>'];
      case 'sound': return ['Звук по умолчанию', `${soundRows(s, s.sndDef, 'set-snd')}`, ''];
      case 'help': return ['Готовность к звонку', `${readyHero(s)}<div class="ap-card ap-list">${readiness(s).map(([st, label, note]) => check(st, label, note)).join('')}</div>`,
        '<button class="ap-btn" data-act="ring-test">Проверить звонок</button>'];
      case 'lang': {
        const cur = Sonly.i18n ? Sonly.i18n.lang : 'ru', L = Sonly.i18n ? Sonly.i18n.LANGS : [['ru', 'Русский']];
        return ['Язык', `<div class="ap-card ap-list">${L.map(([id, name]) => `<button class="ap-row ap-snd${id === cur ? ' on' : ''}" data-act="set-lang:${id}" aria-pressed="${id === cur}"><i class="ap-row-i ap-flag">${Sonly.i18n ? Sonly.i18n.flag(id) : ''}</i><span>${name}</span><b class="ap-radio">${ic('check', 13, 3.4)}</b></button>`).join('')}</div>
          <p class="ap-note">Язык меняется сразу. Звонок и задания — тоже на нём.</p>`, ''];
      }
      case 'notify': return ['Уведомления', `${notifyPreview(s)}<div class="ap-card ap-list">${tgRow(Sonly.si('alarm'), 'Звонок будильника', '', true, '')}${tgRow(Sonly.si('moon'), 'Напоминание вечером', 'В 22:00', s.nEve, 'set-flag:nEve')}${tgRow(Sonly.si('calendar'), 'Итоги недели', 'По воскресеньям', s.nWeek, 'set-flag:nWeek')}</div>`, ''];
      case 'sub': return ['Подписка', `<div class="ap-card ap-plan"><span>${ic('check', 13, 3.4)}Активна</span><b>Подписка на год</b><div><u>39,99 €</u> в год</div><small>Следующее списание — ${renew()}</small></div>
        <h3>Что входит</h3><div class="ap-card ap-list">${check('ok', 'Нельзя отложить', '')}${check('ok', `Все ${TASKS.length} заданий`, '')}${check('ok', 'Серия и статистика', '')}</div>
        <div class="ap-card ap-list gap">${row(Sonly.si('card'), 'Управлять в App Store', '', 'soon:Управление подпиской', '#34C759')}${row(Sonly.si('restore'), 'Восстановить покупки', '', 'restore-app', '#0A84FF')}</div>`, ''];
      /* Билет, как в онбординге: до ввода — ни цен, ни скидок; верный код «срабатывает», и на билете появляется подарок. */
      case 'promo': return ['Промокод', `<div class="pg-tkt${s.promo === 'ok' ? ' ok' : ''}"><div class="pg-tkt-top"><i class="pg-tkt-sun">${Sonly.mark()}</i>
          ${s.promo === 'ok' ? '<b class="pg-tkt-big">−25 %</b><span>на следующий год</span>' : '<b>Код из видео</b><span>или поста любимого автора</span>'}</div><i class="pg-tkt-cut"></i><div class="pg-tkt-bot">
        <div class="ap-coupon${s.promo === 'ok' ? ' ok' : s.promo ? ' err' : ''}"><i>${ic('ticket', 21, 1.9)}</i><input class="js-promo" maxlength="7" value="${esc(s.promoCode || '')}" placeholder="Промокод" aria-label="Промокод" autocomplete="off" spellcheck="false"${s.promo === 'ok' ? ' disabled' : ''}>${s.promo === 'ok' ? `<em>${ic('check', 18, 3)}</em>` : '<button data-act="promo-go">Применить</button>'}</div>
        </div></div>
        <p class="ap-coupon-msg ${s.promo === 'ok' || !s.promo ? 'note' : 'bad'}">${s.promo && s.promo !== 'ok' ? PROMO_MSG[s.promo] : 'Скидка — со следующего продления'}</p>`, ''];
      case 'share': case 'blog': return Sonly.partner.page(s, id);
      case 'lock': case 'lock-ex': case 'lock-night': case 'lock-demo': return Sonly.lock.page(s, id, arg);
      case 'mysnd': return Sonly.mysnd.page(s, arg);
      case 'widgets': return ['Как добавить виджет', `${widgetHome(s)}<div class="ap-card ap-steps">${WIDGET_STEPS.map((t, n) => `<div><b>${n + 1}</b><span>${t}</span></div>`).join('')}</div>`, ''];
      case 'msg': {
        const [title, hint] = MSG[arg] || MSG.support;
        return s.sent === arg ? [title, `<div class="ap-sent"><i>${ic('check', 26, 3)}</i><b>Отправлено</b><p>Спасибо!</p></div>`, '<button class="ap-btn" data-act="page-close">Готово</button>']
          : [title, `<p class="ap-note first">${hint}</p>
            <div class="ap-topics" role="group" aria-label="Тема">${(TOPICS[arg] || TOPICS.support).map((x) => `<button class="${(s.msgTopic || {})[arg] === x ? 'on' : ''}" data-act="msg-topic:${arg}:${x}">${x}</button>`).join('')}</div>
            <textarea class="ap-area js-msg" rows="6" placeholder="Текст сообщения" aria-label="${title}"></textarea>
            ${arg === 'idea' ? '' : `<div class="ap-card ap-list gap">${tgRow(Sonly.si('doc'), 'Приложить журнал', '', s.msgLog !== false, 'msg-log')}</div>`}`, `<button class="ap-btn" data-act="msg-send:${arg}">Отправить</button>`];
      }
      default: return [DOCS[arg] || 'Документ', `<div class="ap-doc"><p>Здесь будет полный текст документа «${DOCS[arg] || 'Документ'}». В прототипе он не подключён.</p></div>`, ''];
    }
  }
  /** enter — въезд при переходе между страницами (push/back); та же страница перерисовывается на месте. */
  function openPage(flow, id, arg = '', enter = '') {
    const s = flow.state, same = s._page && s._page[0] === id, [title, body, foot, back] = pageOf(s, id, arg), top = same ? keepTop(flow, '') : 0;
    s._page = [id, arg];
    /* back — страница внутри другой страницы: вместо крестика стрелка назад. Та же страница перерисовывается без въезда. */
    flow.sheet(`<div class="ap-sh-head"><button class="ap-x lg" data-act="${back || 'page-close'}" aria-label="${back ? 'Назад' : 'Закрыть'}">${ic(back ? 'chevron-left' : 'x', back ? 22 : 20, 2.3)}</button><b>${title}</b><span class="ap-x ghost"></span></div>
      <div class="ap-sh-body scroll">${body}</div>${foot ? `<div class="ap-sh-foot">${foot}</div>` : ''}`, `ap-sheet${same ? ' now' : enter ? ' ' + enter : ''}`);
    setTop(flow, top);
    if (Sonly.partner && Sonly.partner.mount) Sonly.partner.mount(flow);
    if (Sonly.lock && Sonly.lock.mount) Sonly.lock.mount(flow);
    if (Sonly.mysnd && id === 'mysnd') Sonly.mysnd.mount(flow);
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
  /*
   * Будильник, чья минута пришлась на открытый звонок или проверку «Ты не спишь?», не теряется: он ждёт и звонит, как только
   * экран освободится, если с его времени прошло не больше 30 минут. Каждый будильник звонит один раз за своё время.
   * Будильники, чьё время прошло ещё до открытия приложения, не звонят задним числом.
   */
  function autoRing(flow) {
    const s = flow.state, now = new Date(), dow = (now.getDay() + 6) % 7;
    if (Sonly.ringer.busy(flow) || !flow.el.isConnected || flow.el.closest('[hidden]')) return;
    const at = (x) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), x.h, x.m).getTime(), key = (x) => now.toDateString() + ' ' + x.h + ':' + x.m;
    const due = s.alarms.filter((x) => x.on && x._rung !== key(x) && (x.once || x.days.includes(dow)) && at(x) >= (flow._since || 0) && at(x) <= now.getTime() && now.getTime() - at(x) <= 30 * 60000).sort((x, y) => at(x) - at(y));
    const a = due[0];
    if (!a) return;
    a._rung = key(a);
    if (a.skip) { a.skip = false; flow.rerender(true); return; }
    Sonly.ringer.start(flow, a, false);
  }

  /* ── Оформление ──────────────────────────────────────────── */

  const sysDark = () => { const r = document.documentElement.dataset.theme; return r ? r === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  const paint = (flow) => { const t = flow.state.theme; flow.el.dataset.theme = t === 'system' ? (sysDark() ? 'dark' : 'light') : t; };
  const alarmFrom = (st) => ({ id: 'a1', h: st.time.h, m: st.time.m, days: [...st.days], once: false, task: st.task || 'hunt', sound: DEF_SND, name: 'Утренний', on: true, rise: true, vibro: true, check: 5, skip: false, opts: JSON.parse(JSON.stringify(st.opts || {})) });

  /** Главная приложения с будильником из онбординга — тот самый экран, который человек увидит после оплаты. */
  Sonly.appPreview = (st) => `<div class="ap" data-theme="${sysDark() ? 'dark' : 'light'}"><div class="statusbar"><span>9:41</span><i class="sb-island"></i><span class="sb-right">${SB_ICONS}</span></div>
    <section class="screen">${homeHtml({ data: 'new', shareHidden: true, alarms: [alarmFrom(st)] })}</section><div class="dock">${tabbar('home')}</div><div class="homebar"></div></div>`;

  /** Список значков по редкости: сводка сверху, ниже сетки от обычных к мифическим. act — что делает нажатие на значок. */
  function badgeList(s, act) {
    const bd = badges(s), got = bd.filter((b) => b.on).length;
    const tiers = TIERS.map(([id, one, many]) => ({ id, one, many, list: bd.filter((b) => b.tier === id) }));
    return `<div class="ap-card bd-sum"><b>${got}<u> из ${bd.length}</u></b><small>Чем реже значок, тем он ярче</small>
        <div class="bd-tiers">${tiers.map((x) => `<span class="t-${x.id}"><small>${x.many}</small><i style="--p:${(x.list.filter((b) => b.on).length / x.list.length).toFixed(3)}"></i><b>${x.list.filter((b) => b.on).length}/${x.list.length}</b></span>`).join('')}</div></div>
      ${tiers.map((x) => `<h3 class="bd-h t-${x.id}">${x.many}<span>${x.list.filter((b) => b.on).length} из ${x.list.length}</span></h3>
        <div class="bd-grid">${x.list.map((b) => `<button class="bd t-${b.tier}${b.on ? ' on' : ''}${Sonly.news && Sonly.news.showing('b', b.id) ? ' is-new' : ''}" data-act="${act}:${b.id}" aria-label="${bdName(b)}${b.on ? '' : ' — ещё не получен'}">${hex(b, 58)}<b>${bdName(b)}</b><small>${!b.on && b.need > 1 ? `${b.cur} из ${b.need}` : `есть у ${pctStr(b.pct)}`}</small></button>`).join('')}</div>`).join('')}`;
  }
  /** Один значок крупно: редкость, условие, прогресс и у скольких он есть. foot — кнопка под ним (на отдельном листе). */
  function badgeOne(b, foot = '') {
    const t = tierOf(b.tier);
    return `<div class="bd-one t-${b.tier}${b.on ? ' on' : ''}">${hex(b, 112)}<span class="bd-tag t-${b.tier}">${t[1]}</span>
        <b>${bdName(b)}</b><p>${b.secret && !b.on ? 'Условие откроется, когда получишь' : b.note}</p>
        ${b.on ? `<span class="bd-got">${ic('check', 15, 3)}Получен</span>` : b.need > 1 ? `<div class="bd-prog"><i style="--p:${(b.cur / b.need).toFixed(3)}"></i></div><small class="bd-pn">${b.cur} из ${b.need}</small>` : ''}
        <small class="bd-pct">Есть у ${pctStr(b.pct)} пользователей</small>${foot}</div>`;
  }
  /* ── Панель прототипа: проверка анимаций ─────────────────── */

  /** Какая кнопка «Данные» нажата. */
  const dataOn = (s, v) => (s.mode ? s.mode === v : v === 'new' ? s.data === 'new' : s.data === 'demo' && (s.span || '2w') === v);
  /**
   * «Проснуться +1 день»: как будто прошли сутки и человек встал по будильнику. Подъёмы (и отметки «новое») сдвигаются на день
   * назад вместе с днями будильников — так серия растёт на 1, а сегодняшнее утро свободно; дальше всё по-настоящему: восход,
   * «Доброе утро», огонёк серии, а на Главной — праздник за новую открытку, пейзаж и значки.
   */
  function wakeDay(flow) {
    const s = flow.state;
    if (Sonly.ringer.busy(flow)) return;
    if (s.data === 'demo') { s.log = history(s).map((x) => ({ t: day0(x.d).getTime(), wake: x.wake, secs: x.secs, task: x.task })); s.data = 'new'; s.span = ''; s.mode = ''; }
    if (!s.alarms.length) { s.alarms = [{ ...blank(s), id: 'a' + Date.now(), name: 'Утренний', days: [0, 1, 2, 3, 4, 5, 6], task: 'math' }]; }
    const back = (t) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).getTime(); };
    s.log = (s.log || []).map((x) => ({ ...x, t: back(x.t) }));
    s.alarms.forEach((a) => { a.days = a.days.map((d) => (d + 6) % 7).sort((x, y) => x - y); });
    if (s.news) ['told', 'seen'].forEach((w) => { if (s.news[w] && s.news[w].c) s.news[w].c = s.news[w].c.map(back); });
    const a = copy(s.alarms.find((x) => x.on) || s.alarms[0]);
    a.check = 0;
    if (a.task === 'random') a.task = 'math';
    const secs = 25 + Math.floor(Math.random() * 30);
    s._ring = { a, test: false, random: false, direct: false, t0: Date.now() - (secs + 8) * 1000, t1: Date.now() - secs * 1000, mute: false, from: ['ring', 'task', 'woke', 'streak', 'check'].includes(flow.id) ? 'home' : flow.id };
    s._check = null;
    flow.closeSheet(true);
    Sonly.ringer.finish(flow);
    /* Время подъёма — около будильника (а не «сейчас» среди дня), как в настоящем утре. */
    const today = day0(new Date()).getTime(), e = (s.log || []).find((x) => x.t === today);
    if (e) e.wake = a.h * 60 + a.m + Math.floor(Math.random() * 9);
  }
  /** «Показать»: анимация без изменения данных — огонёк серии или праздник открытки, значка, пейзажа на Главной. */
  function showOff(flow, what) {
    const s = flow.state;
    if (Sonly.ringer.busy(flow)) return;
    flow.closeSheet(true);
    if (what === 'streak') {
      const a = copy(s.alarms.find((x) => x.on) || s.alarms[0] || blank(s));
      s._ring = { a, test: false, fresh: true, t0: Date.now(), from: 'home', show: true };
      flow.go('streak', 2);
      return;
    }
    if (flow.id !== 'home') flow.go('home', 0);
    setTimeout(() => Sonly.news && Sonly.news.preview(flow, what), 350);
  }

  Sonly.appKit = { taskOf, tic, hm, fmtMin, stats, pl, day0, copy, blank, editor, taskPicker, poolOf, nextRing, dayWord, chev, row, FLAME, keepTop, setTop, shareText, code4, refOf, openPage, soundPicker, badges, hex, bdName, pctStr, TIERS, badgeList, badgeOne };

  Sonly.register({
    id: 'app', name: 'Приложение', cls: 'ap', keepScroll: true,
    about: 'Приложение sonly по присланному примеру: будильники, утро, статистика со значками, настройки с виджетами. «Зазвонить сейчас» под телефоном запускает настоящий звонок со звуком.',
    order: ['home', 'morning', 'stats', 'settings'], extra: [],
    titles: { home: 'Главная', morning: 'Утро', stats: 'Статистика', settings: 'Настройки' },
    defaults: () => ({
      theme: 'system', data: 'new', metric: 'wake', range: '30', log: [], volume: 80, riseDef: true, sndDef: DEF_SND, nEve: true, nWeek: true,
      brief: { weather: true, word: true, saying: true },
      alarms: [{ id: 'a1', h: 7, m: 30, days: [0, 1, 2, 3, 4], once: false, task: 'hunt', sound: DEF_SND, name: 'Утренний', on: true, rise: true, vibro: true, check: 5, skip: false, opts: {} }],
    }),
    demo: () => ({}),
    init(flow) {
      flow.dock.innerHTML = tabbar('home');
      flow._tabs = Sonly.glass ? Sonly.glass.tabs(flow.dock.querySelector('.ap-tabs')) : null;
      paint(flow);
      Sonly.sound.stop();
      /* Расписание идёт и при «Уменьшении движения» (там flow.still тоже включён); выключено только для снимков экрана. */
      if (!flow._tick && !flow.shot) { flow._since = Date.now() - (Date.now() % 60000); flow._tick = setInterval(() => autoRing(flow), 5000); }
      /* Звуки включённых будильников скачиваются заранее: утром без интернета они уже в кэше сайта. */
      if (!flow.shot) setTimeout(() => Sonly.sound.preload([flow.state.sndDef, ...flow.state.alarms.filter((a) => a.on).map((a) => a.sound)]), 2000);
      if (!flow._mq) { flow._mq = matchMedia('(prefers-color-scheme: dark)'); flow._mq.addEventListener('change', () => paint(flow)); }
      if (Sonly.news) { Sonly.news.init(flow.state); Sonly.news.paint(flow); }
    },
    /* Выбранная вкладка: кнопки не перерисовываются — меняется класс, у значка плавно проявляется второй тон, подложка переезжает. */
    onScreen(flow, id) {
      const pill = flow.dock.querySelector('.ap-tabs-pill');
      if (!pill) return;
      let on = null;
      pill.querySelectorAll('button').forEach((b) => { const hit = b.dataset.act === 'tab:' + id; b.classList.toggle('on', hit); if (hit) on = b; });
      if (flow._tabs) flow._tabs.put(on);
      /* Новое: красные отметки на вкладках; на Главной — праздник за всё, что ещё не объявили (после подъёма, после друзей…). */
      /* Ушли с Главной (зазвонил будильник, открыли вкладку) — праздник убирается, недопоказанное объявится в следующий раз. */
      if (Sonly.news) { Sonly.news.paint(flow); if (id !== 'home') { clearTimeout(flow._nw); Sonly.news.leave(flow); } else if (!flow.shot) { clearTimeout(flow._nw); flow._nw = setTimeout(() => Sonly.news.announce(flow), 700); } }
    },
    /** Будильник, собранный в онбординге, становится первым в списке. */
    adopt(flow, st) { flow.state.alarms = [alarmFrom(st)]; flow.go('home', 0); },
    /** Открывает лист для снимка экрана: редактор, задания, набор, проверка, звуки, разделы, значки, листы «Утра». */
    preview(flow, what) {
      const s = flow.state;
      if (what === 'info') { this.on(flow, 'st-info'); return; }
      if (what === 'badges') { this.on(flow, 'st-badges'); return; }
      if (what.startsWith('badge-')) { this.on(flow, 'st-badge', what.slice(6)); return; }
      if (/^(ring|task|woke|streak|check)(:|$)/.test(what)) { Sonly.ringer.preview(flow, what); return; }
      if (what.startsWith('mo-')) { Sonly.morning.preview(flow, what.slice(3)); return; }
      if (what.startsWith('pp-') && Sonly.people) { Sonly.people.preview(flow, what.slice(3)); return; }
      if (what.startsWith('page-')) { const [id, arg] = what.slice(5).split('.'); openPage(flow, id, arg || ''); return; }
      s._ed = what === 'edit' ? copy(s.alarms[0]) : blank(s);
      if (what.startsWith('setup')) { s._ed.task = what.split('-')[1] || 'hunt'; taskSetup(flow, ''); } else if (what === 'tasks') taskPicker(flow, '');
      else if (what === 'pool') { s._ed.task = 'random'; poolSetup(flow, ''); } else if (what === 'checks') checkPicker(flow, ''); else if (what === 'sounds') soundPicker(flow); else editor(flow);
    },
    /* Переключатели под телефоном в оболочке просмотра. */
    shell: {
      html: (s) => `<span class="shell-ctl">Тема ${[['system', 'как в системе'], ['dark', 'тёмная'], ['light', 'светлая']].map(([v, n]) => `<button data-shell="theme:${v}"${s.theme === v ? ' aria-pressed="true"' : ''}>${n}</button>`).join('')}</span>
        <span class="shell-ctl">Данные ${[['empty', 'пустой'], ['new', 'новый аккаунт'], ['2w', 'две недели'], ['3m', '3 месяца'], ['1y', 'год']].map(([v, n]) => `<button data-shell="data:${v}"${dataOn(s, v) ? ' aria-pressed="true"' : ''}>${n}</button>`).join('')}</span>
        <span class="shell-ctl">Сейчас <button data-shell="ring:now">зазвонить</button><button data-shell="check:now">проверка подъёма</button><button data-shell="wake:day">проснуться +1 день</button></span>
        <span class="shell-ctl">Показать ${[['streak', 'огонёк'], ['c', 'открытка'], ['b', 'значок'], ['l', 'пейзаж']].map(([v, n]) => `<button data-shell="show:${v}">${n}</button>`).join('')}</span>`,
      set(flow, key, val) {
        const s = flow.state, a = s.alarms.find((x) => x.on) || s.alarms[0];
        /* «Зазвонить» — как будто подошло время будильника: такой подъём идёт в серию. */
        if (key === 'ring') { if (a && !Sonly.ringer.busy(flow)) Sonly.ringer.start(flow, a, false); return; }
        if (key === 'check') { if (a && !Sonly.ringer.busy(flow)) Sonly.ringer.check(flow, a); return; }
        /* Данные: новый аккаунт или пример истории нужной длины. Друзья-пример заводятся заново. */
        if (key === 'data') {
          /* Пустой — совсем с нуля: ни будильников, ни подъёмов, ни профиля, ни друзей. Каждое первое действие даёт свой значок. */
          if (val === 'empty') { s.data = 'new'; s.span = ''; s.log = []; s.alarms = []; s.me = undefined; s.mode = 'empty'; }
          else { s.data = val === 'new' ? 'new' : 'demo'; s.span = val === 'new' ? '' : val; s.mode = val; }
          s.pp = undefined; s._ppNav = undefined; s._ppQ = ''; s._ppDraft = null;
          if (Sonly.news) Sonly.news.reset(s);
          paint(flow);
          if (!s._ring && !s._check) flow.rerender();
          return;
        }
        if (key === 'wake') { wakeDay(flow); return; }
        if (key === 'show') { showOff(flow, val); return; }
        s[key] = val;
        paint(flow);
        if (!s._ring && !s._check) flow.rerender();
      },
    },
    on(flow, act, arg, el) {
      const s = flow.state, e = s._ed, find = (id) => s.alarms.find((a) => a.id === id);
      if (Sonly.news && Sonly.news.on(flow, act, arg)) return true;
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
          /* Значки по редкости: сверху сколько собрано и полоска каждой редкости, ниже — сетки от обычных к мифическим. */
          const y = arg === 'back' ? s._bdY || 0 : 0;
          if (arg !== 'back' && Sonly.news) Sonly.news.open(flow, 'b');
          flow.sheet(`<div class="ap-sh-head"><button class="ap-x lg" data-act="sheet-close" aria-label="Закрыть">${ic('x', 20, 2.3)}</button><b>Значки</b><span class="ap-x ghost"></span></div>
            <div class="ap-sh-body scroll">${badgeList(s, 'st-badge')}</div>`, `ap-sheet bd-sheet${arg === 'back' ? ' back' : ''}`);
          const sc = flow.sheets.querySelector('.scroll');
          if (sc && y) sc.scrollTop = y;
          return true;
        }
        case 'st-badge': {
          /* Один значок крупно. Из списка значков — на том же большом листе, со стрелкой назад к списку; отдельно — нижним листом. */
          const b = badges(s).find((x) => x.id === arg);
          if (!b) return true;
          const list = flow.sheets.querySelector('.bd-sheet .scroll');
          if (list) {
            s._bdY = list.scrollTop;
            flow.sheet(`<div class="ap-sh-head"><button class="ap-x lg" data-act="st-badges:back" aria-label="Ко всем значкам">${ic('chevron-left', 22, 2.4)}</button><b data-k="Значок·награда">Значок</b><span class="ap-x ghost"></span></div>
              <div class="ap-sh-body scroll bd-page">${badgeOne(b)}</div>`, 'ap-sheet bd-sheet push');
            return true;
          }
          flow.sheet(`<div class="pay-grab"></div>${badgeOne(b, '<button class="ap-btn" data-act="sheet-close">Понятно</button>')}`, 'ap-low');
          return true;
        }
        case 'soon': soon(flow, arg); return true;
        case 'set-lang': if (Sonly.i18n) { Sonly.i18n.set(arg); flow.rerender(true); openPage(flow, 'lang'); } return true;
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
          shareText(act === 'ref-copy' ? refOf(s) : (Sonly.i18n ? Sonly.i18n.t : (k, v) => k.replace('{code}', v.code))('sonly — будильник, который нельзя отложить: выключается только заданием. Промокод {code} — −25 % на первый год и 3 дня бесплатно.', { code: refOf(s) }), false, (msg) => { s._copied = act === 'ref-copy' && /^Текст/.test(msg) ? 'Код скопирован' : msg; if (s._page && s._page[0] === 'share') openPage(flow, 'share'); });
          return true;
        case 'msg-topic': {
          /* Тема меняется на месте: набранный текст не пропадает. */
          const [kind, topic] = [arg.slice(0, arg.indexOf(':')), arg.slice(arg.indexOf(':') + 1)];
          s.msgTopic = { ...(s.msgTopic || {}), [kind]: s.msgTopic && s.msgTopic[kind] === topic ? '' : topic };
          flow.sheets.querySelectorAll('.ap-topics button').forEach((b) => b.classList.toggle('on', b.dataset.act === `msg-topic:${kind}:${s.msgTopic[kind]}`));
          return true;
        }
        case 'msg-log': { s.msgLog = s.msgLog === false; const b = flow.sheets.querySelector('[data-act="msg-log"]'); if (b) { b.classList.toggle('on', s.msgLog); b.setAttribute('aria-checked', s.msgLog); } return true; }
        case 'msg-send': {
          /* Ни темы, ни текста — подсвечиваем поле, а не отправляем пустое письмо. */
          const area = flow.sheets.querySelector('.js-msg');
          if (area && !area.value.trim() && !(s.msgTopic || {})[arg]) { Sonly.nudge(area); return true; }
          s.sent = arg; openPage(flow, 'msg', arg); return true;
        }
        case 'restore-app': flow.sheet('<div class="msg"><b>Подписка на месте</b><p>Покупка уже на этом Apple ID.</p><button class="msg-ok" data-act="sheet-close">Понятно</button></div>', 'center'); return true;
        case 'ring-test': s._page = null; Sonly.ringer.start(flow, s.alarms.find((x) => x.on) || s.alarms[0] || blank(s), true); return true;
        case 'ed-test': Sonly.ringer.start(flow, e, true, 'editor'); return true;
        case 'check-ok': if (Sonly.ringer.checkOk) Sonly.ringer.checkOk(flow); else { s._check = null; flow.go('home', 2); } return true;
        default:
          if (Sonly.ringer && Sonly.ringer.on(flow, act, arg)) return true;
          if (Sonly.morning && Sonly.morning.on(flow, act, arg, el)) return true;
          if (Sonly.people && Sonly.people.on(flow, act, arg, el)) return true;
          if (Sonly.partner && Sonly.partner.on(flow, act, arg, el)) return true;
          if (Sonly.lock && Sonly.lock.on(flow, act, arg, el)) return true;
          if (Sonly.mysnd && Sonly.mysnd.on(flow, act, arg, el)) return true;
          /* Нажатия внутри настройки задания: предметы, сложность, количество. */
          const done = e && act.startsWith('to-') && TO.act(e.task, TO.get(e, e.task), act, arg);
          if (done === 'keep') return true;
          if (done) {
            const o = TO.get(e, e.task);
            const foot = () => { const b = flow.sheets.querySelector('.ap-sh-foot .ap-btn'); if (b) b.disabled = !TO.valid(e.task, o); };
            if ((act === 'to-obj' || act === 'to-all') && !flow.still && TO.sync(flow.sheets, e.task, o)) { foot(); return true; }
            /* Остальное (количество, сложность, тема) — тоже на месте: предпросмотр не начинается заново. */
            if (TO.update(flow.sheets, e.task, o)) { foot(); return true; }
            taskSetup(flow, '');
            return true;
          }
          return false;
      }
    },
    screens,
  });
})();
