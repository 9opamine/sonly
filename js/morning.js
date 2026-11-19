/* Вкладка «Утро»: истории дня (погода, слово, поговорка), сводка «После подъёма» листаемыми карточками,
   подарки за серию (новые звуки будильника), коллекция карточек утра и группа подъёма с друзьями. */
(() => {
  'use strict';
  const { ic, esc, DAYS, TASKS, appKit: K, sound } = Sonly;
  const si = (id, size) => Sonly.si(id, size);
  const app = Sonly.concepts.app;
  const doy = (d = new Date()) => Math.round((K.day0(d) - new Date(d.getFullYear(), 0, 0)) / 864e5);
  const today = () => K.day0(new Date()).getTime();
  const cap = (x) => x.replace(/^./, (c) => c.toUpperCase());
  /* Короткие слова держатся за следующее, последние два слова — вместе: ни висячих предлогов, ни одного слова в последней строке. */
  const nb = (t) => t.replace(/(^|[\s «])([а-яёa-z]{1,2}) /gi, '$1$2 ').replace(/ (\S+)$/, ' $1');

  /* Слова дня: слово, часть речи, толкование и пример. Меняются раз в сутки. */
  const WORDS = [
    ['Заря', 'сущ., ж. р.', 'Яркое освещение горизонта перед восходом или после захода солнца.', 'Вышли в путь с первой зарёй.'],
    ['Спозаранку', 'наречие', 'Очень рано, ранним утром.', 'Спозаранку он уже был на ногах.'],
    ['Жаворонок', 'сущ., м. р.', 'Певчая птица. Так же зовут человека, который рано встаёт и рано ложится.', 'Я жаворонок: в шесть утра голова работает лучше всего.'],
    ['Утренник', 'сущ., м. р.', 'Лёгкий утренний мороз весной или осенью. А ещё детский праздник в первой половине дня.', 'Ночью ударил утренник, и лужи затянуло льдом.'],
    ['Побудка', 'сущ., ж. р.', 'Сигнал к подъёму ото сна — например, в армии.', 'Побудку сыграли ровно в шесть.'],
    ['Предрассветный', 'прилагательное', 'Бывающий перед самым рассветом.', 'Над рекой стоял предрассветный туман.'],
    ['Росистый', 'прилагательное', 'Покрытый росой.', 'Мы шли босиком по росистой траве.'],
    ['Зорька', 'сущ., ж. р.', 'Ласковое название зари.', 'Рыбаки ушли на утреннюю зорьку.'],
    ['Ни свет ни заря', 'выражение', 'Очень рано, когда ещё не рассвело.', 'Встал ни свет ни заря, чтобы успеть на поезд.'],
    ['Бодрствовать', 'глагол', 'Не спать, быть в сознании.', 'Дежурный бодрствовал всю ночь.'],
  ];
  /* Поговорка и её смысл. */
  const SAYINGS = [
    ['Кто рано встаёт, тому Бог подаёт.', 'Кто раньше начинает день, тот больше успевает.'],
    ['Утро вечера мудренее.', 'Важное лучше решать на свежую голову.'],
    ['Утренний час дарит золотом нас.', 'Утреннее время — самое ценное.'],
    ['Встанешь пораньше — шагнёшь подальше.', 'Ранний подъём даёт фору на весь день.'],
    ['Кто поздно встаёт, у того хлеба недостаёт.', 'Кто просыпает утро, тот упускает возможности.'],
    ['Долго спать — с долгом встать.', 'Лишний сон оборачивается несделанными делами.'],
    ['Ранняя птичка носок прочищает, а поздняя глаза продирает.', 'Пока один просыпается, другой уже при деле.'],
  ];
  /* Погоду в прототипе взять неоткуда: это пример. В приложении она придёт по геопозиции. */
  const W = {
    now: 4, hi: 9, lo: 1, text: 'Ясно', more: 'без осадков', feel: 2, wind: 3, rain: 0, rise: '07:42', set: '16:31',
    hours: [['08', 'sun', 4], ['11', 'sun', 7], ['14', 'weather', 9], ['17', 'cloud', 6], ['20', 'cloud', 3]],
  };
  /* Что показать после подъёма: id, название, значок, два цвета градиента, подпись в настройках. */
  const BRIEF = [
    ['weather', 'Погода', 'weather', '#3D8DFF', '#1A5AD6', 'Сейчас и по часам'],
    ['word', 'Слово дня', 'book', '#8E6CFF', '#5636D4', 'Слово, толкование и пример'],
    ['saying', 'Поговорка', 'quote', '#FF9A3C', '#E15A16', 'Народная мудрость и её смысл'],
  ];
  /* Подарки за серию — новые звуки будильника. Открываются по лучшей серии и остаются навсегда. */
  const REWARDS = [[3, 'Солнечный зайчик', '#FFAE1F'], [7, 'Утренний бриз', '#22B0D8'], [14, 'Жаворонок', '#A25BF0'], [21, 'Звонкий ручей', '#1FB574'], [30, 'Золотой рассвет', '#FF7A2E']];
  /* Небо карточки утра: чем раньше встал, тем темнее. Опорные точки по минутам суток, между ними цвет плавно смешивается. */
  const SKY = [[240, [14, 20, 46], [52, 42, 92]], [330, [27, 35, 70], [226, 116, 92]], [390, [50, 64, 122], [252, 160, 92]], [450, [76, 118, 196], [255, 204, 104]], [510, [124, 176, 234], [255, 230, 166]], [600, [146, 196, 242], [255, 242, 190]]];

  const wordOf = () => WORDS[doy() % WORDS.length];
  const sayingOf = () => SAYINGS[doy() % SAYINGS.length];
  const rewards = (s) => { const best = K.stats(s).best; return REWARDS.map(([n, name, c]) => ({ n, name, c, open: best >= n })); };
  const briefOf = (s) => s.brief || (s.brief = { weather: true, word: true, saying: true });
  const seenOf = (s) => (s.seen && s.seen.d === today() ? s.seen.ids : (s.seen = { d: today(), ids: {} }).ids);
  const grad = (b) => `--c1:${b[3]};--c2:${b[4]}`;
  const utr = (n) => K.pl(n, 'утро', 'утра', 'утр');

  function skyOf(min) {
    const m = Math.max(240, Math.min(600, min));
    let k = SKY.findIndex((x) => m <= x[0]);
    if (k < 1) k = 1;
    const [m0, a0, b0] = SKY[k - 1], [m1, a1, b1] = SKY[k], t = (m - m0) / (m1 - m0);
    const mix = (p, q) => p.map((v, i) => Math.round(v + (q[i] - v) * t));
    const a = mix(a0, a1), b = mix(b0, b1), lum = (0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2]) / 255;
    return { a: `rgb(${a})`, b: `rgb(${b})`, ink: lum > 0.56 ? '#0D0D0F' : '#fff', night: m < 330, sun: (m - 240) / 360 };
  }
  /** Псевдослучайные числа от даты: солнце на карточке одного дня всегда стоит на одном месте. */
  const rnd = (seed) => { let x = Math.floor(seed / 864e5) * 9301 + 49297; return () => ((x = (x * 9301 + 49297) % 233280) / 233280); };

  /* ── Сводка «После подъёма»: листаемые карточки ─────────── */

  const CARD = {
    weather: () => `<header><small>${si('weather', 15)}Погода</small><span>сейчас</span></header>
      <div class="bf-wx"><b>+${W.now}°</b><span><i>${W.text}</i>днём до +${W.hi}°</span><em class="bf-sun">${si('sun', 46)}</em></div>
      <div class="bf-hours">${W.hours.slice(0, 4).map(([h, g, t]) => `<span><small>${h}:00</small>${si(g, 18)}<b>+${t}°</b></span>`).join('')}</div>`,
    word: () => { const w = wordOf(); return `<header><small>${si('book', 15)}Слово дня</small><span>${w[1]}</span></header><b class="bf-w">${w[0]}</b><p>${nb(w[2])}</p>`; },
    saying: () => { const q = sayingOf(); return `<header><small>${si('quote', 15)}Поговорка</small></header><b class="bf-q">${nb(q[0])}</b><p>${nb(q[1])}</p>`; },
  };
  /** Карточки сводки. На главной «Утра» и на экране «Доброе утро» они одни и те же; нажатие открывает историю. */
  function briefCards(s, cls = '') {
    const b = briefOf(s), list = BRIEF.filter((x) => b[x[0]]);
    if (!list.length) return '';
    return `<div class="bf ${cls}"><div class="bf-track">${list.map((x) => `<button class="bf-card bf-${x[0]}" data-act="mo-story:${x[0]}" style="${grad(x)}">${CARD[x[0]]()}</button>`).join('')}</div>
      ${list.length > 1 ? `<div class="bf-dots" aria-hidden="true">${list.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>` : ''}</div>`;
  }
  /* Точки под карточками следят за прокруткой — один слушатель на всё приложение. */
  document.addEventListener('scroll', (e) => {
    const t = e.target;
    if (!t.classList || !t.classList.contains('bf-track')) return;
    const kids = [...t.children], at = t.scrollLeft;
    const i = kids.reduce((best, el, k) => (Math.abs(el.offsetLeft - kids[0].offsetLeft - at) < Math.abs(kids[best].offsetLeft - kids[0].offsetLeft - at) ? k : best), 0);
    t.parentNode.querySelectorAll('.bf-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
  }, true);

  /* ── Истории дня: погода, слово, поговорка на весь экран ── */

  const STORY = {
    weather: () => `<div class="sy-wx"><b>+${W.now}°</b><em>${si('sun', 92)}</em></div>
      <p class="sy-lead">${W.text}, ${W.more}</p><p class="sy-sub">Днём до +${W.hi}°, ночью до +${W.lo}°</p>
      <div class="sy-hours">${W.hours.map(([h, g, t]) => `<span><small>${h}:00</small>${si(g, 24)}<b>+${t}°</b></span>`).join('')}</div>
      <div class="sy-grid">${[['temp', 'Ощущается', `+${W.feel}°`], ['wind', 'Ветер', `${W.wind} м/с`], ['rise', 'Восход', W.rise], ['set', 'Закат', W.set]].map(([g, n, v]) => `<span>${si(g, 18)}<small>${n}</small><b>${v}</b></span>`).join('')}</div>
      <p class="sy-fine">Пример. В приложении погода придёт по геопозиции.</p>`,
    word: () => { const w = wordOf(); return `<b class="sy-word">${w[0]}</b><em class="sy-pos">${w[1]}</em><p class="sy-lead">${nb(w[2])}</p>
      <div class="sy-glass"><small>Пример</small><p>${nb(`«${w[3]}»`)}</p></div>`; },
    saying: () => { const q = sayingOf(); return `<i class="sy-qm">${si('quote', 54)}</i><b class="sy-say">${nb(q[0])}</b>
      <div class="sy-glass"><small>Смысл</small><p>${nb(q[1])}</p></div>`; },
  };
  const STORY_MS = 7000;
  function story(flow, k) {
    const s = flow.state, b = briefOf(s), x = BRIEF[k], [id, name, glyph] = x;
    s._story = k;
    seenOf(s)[id] = 1;
    const day = cap(new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }));
    flow.sheet(`<div class="sy" data-k="${id}" style="${grad(x)}">
      <div class="sy-bars">${BRIEF.map((_, i) => `<i class="${i < k ? 'done' : i === k ? 'on' : ''}"><u></u></i>`).join('')}</div>
      <header class="sy-top"><i class="sy-ic">${si(glyph, 19)}</i><span><b>${name}</b><small>${day}</small></span><button class="sy-x" data-act="sy-close" aria-label="Закрыть">${ic('x', 21, 2.4)}</button></header>
      <div class="sy-body">${STORY[id]()}</div>
      <button class="sy-nav prev" data-act="sy-go:-1" aria-label="Предыдущая"></button><button class="sy-nav next" data-act="sy-go:1" aria-label="Следующая"></button>
      <footer class="sy-foot"><span>${si('sun', 17)}Показывать после подъёма</span><button class="ap-tg sm${b[id] ? ' on' : ''}" data-act="mo-flag:${id}:story" role="switch" aria-checked="${!!b[id]}" aria-label="Показывать после подъёма"></button></footer></div>`, 'ap-story');
    /* Полоска сверху заполняется 7 секунд, потом история листается сама. Пока палец на экране — пауза. */
    const root = flow.sheets.querySelector('.sy'), bar = root && root.querySelector('.sy-bars .on u');
    if (!root || flow.still) return;
    bar.style.animationDuration = STORY_MS + 'ms';
    bar.addEventListener('animationend', () => { if (flow.sheets.contains(root)) storyGo(flow, 1); });
    /* Долгое удержание — это пауза, чтобы дочитать: отпущенный после него палец историю не листает. */
    let t0 = 0;
    const hold = (on) => root.classList.toggle('hold', on);
    root.addEventListener('pointerdown', (e) => { if (!e.target.closest('.sy-x,.sy-foot')) { t0 = Date.now(); hold(true); } });
    root.addEventListener('pointerup', () => { if (t0 && Date.now() - t0 > 350) root.dataset.held = '1'; t0 = 0; hold(false); });
    ['pointercancel', 'pointerleave'].forEach((t) => root.addEventListener(t, () => { t0 = 0; hold(false); }));
  }
  function storyGo(flow, dir) {
    const s = flow.state, k = (s._story || 0) + dir;
    if (k >= BRIEF.length) { closeStory(flow); return; }
    story(flow, Math.max(0, k));
  }
  function closeStory(flow) {
    flow.closeSheet();
    /* Кружки историй перекрашиваются в «просмотрено». */
    if (flow.id === 'morning') flow.rerender(true);
  }

  /* ── Карточки утра ───────────────────────────────────────── */

  const dShort = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
  /** Рекорды коллекции: самый ранний подъём и самое быстрое задание отмечаются на своих карточках. */
  const records = (h) => ({ early: Math.min(...h.map((x) => x.wake)), fast: Math.min(...h.filter((x) => x.secs).map((x) => x.secs)) });
  /** Карточка утра. tag — 'div' для мини-стопки внутри другой кнопки; rec — рекорды коллекции. */
  function cardOf(x, n, tag = 'button', rec) {
    const k = skyOf(x.wake), t = x.task && TASKS.find((y) => y.id === x.task), r = rnd(x.d.getTime());
    const act = tag === 'button' ? ` data-act="mo-card:${x.d.getTime()}" aria-label="Карточка за ${x.d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}"` : '';
    return `<${tag} class="mo-card${k.night ? ' night' : ''}"${act} style="--a:${k.a};--b:${k.b};--t:${k.ink};--sun:${k.sun.toFixed(2)};--sx:${Math.round((r() - 0.5) * 44)}%">
      <i class="mo-card-sun"></i><small>${dShort(x.d)}</small><b>${K.fmtMin(x.wake)}</b>
      <span>${DAYS[(x.d.getDay() + 6) % 7]}${t ? `<em>${Sonly.ti(t.id, 11)}</em>` : ''}</span>${n ? `<u>№ ${n}</u>` : ''}
      ${rec && (x.wake === rec.early || x.secs === rec.fast) ? `<i class="mo-rec">${x.wake === rec.early ? `<b title="Самый ранний подъём">${si('rise', 12)}</b>` : ''}${x.secs === rec.fast ? `<b title="Быстрее всего задание">${ic('zap', 11, 2.6)}</b>` : ''}</i>` : ''}</${tag}>`;
  }
  const ghostStack = () => `<div class="mo-card ghost">${si('cards', 26)}</div>`;

  /* ── Экран «Утро» ────────────────────────────────────────── */

  app.screens.morning = {
    chrome: false,
    render: (c) => {
      const s = c.s, st = K.stats(s), b = briefOf(s), seen = seenOf(s), rw = rewards(s), nx = rw.find((r) => !r.open), left = nx ? Math.max(1, nx.n - st.streak) : 0;
      const mini = st.h.slice(-3).reverse();
      return `<div class="ap-scroll scroll"><h1 class="ap-h1" data-in>Утро</h1>
        <div class="mo-brief" data-in style="--i:1">${BRIEF.map((x) => `<button class="mo-dot${seen[x[0]] ? ' seen' : ''}" data-act="mo-story:${x[0]}" style="${grad(x)}"><i>${si(x[2], 28)}</i><span>${x[1]}</span></button>`).join('')}
          <button class="mo-dot edit" data-act="mo-brief"><i>${si('sliders', 26)}</i><span>Настроить</span></button></div>
        <div class="ap-duo mo-duo" data-in style="--i:2">
          <button class="ap-card mo-tile" data-act="mo-gifts">${ring(nx ? Math.min(1, st.streak / nx.n) : 1, `<i class="mo-gift">${si('gift', 30)}</i>`)}<b>${nx ? 'Подарок за серию' : 'Все подарки твои'}</b><small>${nx ? `ещё ${left} ${utr(left)} подряд` : 'Новые звуки уже в списке'}</small></button>
          <button class="ap-card mo-tile" data-act="mo-album"><span class="mo-stack${mini.length ? '' : ' empty'}">${mini.length ? mini.map((x) => cardOf(x, 0, 'div')).join('') : ghostStack()}</span><b>Карточки утра</b><small>${st.h.length ? `${st.h.length} в коллекции` : 'Первая — после подъёма'}</small></button>
        </div>
        <button class="ap-card mo-group" data-act="mo-group" data-in style="--i:3">${faces(s)}<span><b>${s.group ? esc(s.group.name) : 'Вставайте вместе'}</b><small>${s.group ? `Код ${s.group.code}` : 'Утром видно, кто уже встал'}</small></span>${K.chev()}</button>
        <div class="ap-sec mo-sec" data-in style="--i:4"><h2>После подъёма</h2><button class="mo-link" data-act="mo-brief">Изменить</button></div>
        ${briefCards(s) ? `<div data-in style="--i:5">${briefCards(s)}</div>` : `<button class="ap-add" data-act="mo-brief" data-in style="--i:5">${si('sliders', 18)}Выбрать, что показывать</button>`}
      </div>`;
    },
  };

  /** Кольцо прогресса с картинкой внутри. */
  function ring(p, inner) {
    const C = 2 * Math.PI * 44;
    return `<span class="mo-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - p)).toFixed(1)}"/></svg>${inner}</span>`;
  }
  const faces = (s, big) => `<span class="mo-faces${big ? ' big' : ''}"><i class="me">${Sonly.mark()}</i><i>${si('people', big ? 24 : 18)}</i></span>`;
  const head = (title, close = 'sheet-close', icon = 'x') => `<div class="ap-sh-head"><button class="ap-x lg" data-act="${close}" aria-label="${icon === 'x' ? 'Закрыть' : 'Назад'}">${ic(icon === 'x' ? 'x' : 'chevron-left', icon === 'x' ? 20 : 22, 2.3)}</button><b>${title}</b><span class="ap-x ghost"></span></div>`;

  /* ── Листы ───────────────────────────────────────────────── */

  function briefSheet(flow) {
    const s = flow.state, b = briefOf(s), top = K.keepTop(flow);
    flow.sheet(`${head('После подъёма')}<div class="ap-sh-body scroll"><p class="mo-lead">Что показать на экране «Доброе утро», когда задание выполнено.</p>
      <div class="ap-card ap-list">${BRIEF.map((x) => `<div class="ap-row tall"><i class="ap-row-i c mo-grad" style="${grad(x)}">${si(x[2], 20)}</i><span>${x[1]}<small>${x[5]}</small></span><button class="ap-tg sm${b[x[0]] ? ' on' : ''}" data-act="mo-flag:${x[0]}:list" role="switch" aria-checked="${!!b[x[0]]}" aria-label="${x[1]}"></button></div>`).join('')}</div>
      <h3>Так это будет выглядеть</h3>${briefCards(s, 'in-sheet') || `<div class="ap-card mo-none">${si('sliders', 24)}<span>Ничего не выбрано — после подъёма будет только итог утра</span></div>`}</div>`, 'ap-sheet');
    K.setTop(flow, top);
  }

  function giftsSheet(flow) {
    const s = flow.state, st = K.stats(s), rw = rewards(s), nx = rw.find((r) => !r.open), left = nx ? Math.max(1, nx.n - st.streak) : 0, top = K.keepTop(flow);
    const max = REWARDS[REWARDS.length - 1][0], cur = Math.min(st.streak, max);
    const hero = nx
      ? `${ring(Math.min(1, st.streak / nx.n), `<i class="mo-gift">${si('gift', 34)}</i>`)}<small>До подарка «${nx.name}»</small><b>${left} ${utr(left)}</b><span>подряд · ${st.streak ? `серия сейчас ${st.streak}${st.best > st.streak ? `, рекорд ${st.best}` : ''}` : 'серия начнётся с первого подъёма'}</span>`
      : `${ring(1, `<i class="mo-gift">${si('gift', 34)}</i>`)}<small>Серия ${st.best} ${utr(st.best)}</small><b>Все подарки твои</b><span>Каждый звук уже есть в списке будильника</span>`;
    flow.sheet(`${head('Подарки за серию')}<div class="ap-sh-body scroll">
      <div class="ap-card gf-hero">${hero}</div>
      <div class="gf-path" aria-hidden="true"><i class="gf-line"><u style="width:${((cur / max) * 100).toFixed(1)}%"></u></i>${rw.map((r) => `<span class="${r.open ? 'on' : ''}${nx && r.n === nx.n ? ' next' : ''}" style="left:${((r.n / max) * 100).toFixed(1)}%"><i>${r.open ? si('check', 13) : ''}</i><b>${r.n}</b></span>`).join('')}</div>
      <h3>Звуки будильника</h3>
      <div class="ap-card ap-list">${rw.map((r) => { const def = s.sndDef === r.name; return `<div class="ap-row tall gf-row${r.open ? ' open' : ''}${def ? ' def' : ''}"${r.open ? ` role="button" tabindex="0" data-act="mo-use:${r.name}"` : ''}>
        <i class="gf-tile" style="--c:${r.c}">${r.open ? si('music', 20) : si('lock', 19)}<span class="gf-eq"><u></u><u></u><u></u></span></i>
        <span>${r.name}<small>${r.open ? (def ? 'Звук по умолчанию' : `За ${r.n} ${utr(r.n)} подряд`) : `Откроется на ${r.n}-е утро подряд`}</small></span>
        <button class="gf-play" data-act="mo-play:${r.name}" aria-label="Послушать «${r.name}»">${si('play', 15)}${si('pause', 15)}</button>
        ${r.open ? `<b class="ap-radio">${ic('check', 13, 3.4)}</b>` : ''}</div>`; }).join('')}</div>
      <p class="mo-fine">${nb('Открытый звук можно выбрать звуком по умолчанию. Подарок остаётся навсегда, даже если серия прервётся, а послушать можно и закрытые.')}</p></div>`, 'ap-sheet');
    K.setTop(flow, top);
  }

  function albumSheet(flow, enter = '') {
    const h = K.stats(flow.state).h, wakes = h.map((x) => x.wake).sort((a, b) => a - b);
    let body;
    if (!h.length) {
      body = `<div class="mo-empty"><span class="mo-stack big">${[450, 390, 330].map((m, i) => cardOf({ d: new Date(2026, 0, 1 + i), wake: m }, 0, 'div')).join('')}</span>
        <b>${nb('Первая карточка — завтра утром')}</b><p>${nb('После каждого подъёма здесь появляется карточка. Чем раньше встал, тем темнее на ней небо.')}</p></div>`;
    } else {
      const groups = [], rec = records(h);
      h.slice().reverse().forEach((x) => {
        const key = cap(x.d.toLocaleDateString('ru-RU', x.d.getFullYear() === new Date().getFullYear() ? { month: 'long' } : { month: 'long', year: 'numeric' }));
        (groups.find((g) => g[0] === key) || groups[groups.push([key, []]) - 1])[1].push(x);
      });
      body = `<div class="ap-card mo-sum"><span><b>${h.length}</b><small>${K.pl(h.length, 'карточка', 'карточки', 'карточек')}</small></span><span><b>${K.fmtMin(wakes[0])}</b><small>самое раннее</small></span><span><b>${K.fmtMin(wakes[Math.floor(wakes.length / 2)])}</b><small>обычно</small></span></div>
        ${groups.map(([name, list]) => `<h3 class="mo-month">${name}<span>${list.length}</span></h3><div class="mo-album">${list.map((x) => cardOf(x, h.indexOf(x) + 1, 'button', rec)).join('')}</div>`).join('')}
        <div class="mo-scale"><i></i><span><small>04:00</small><small>06:00</small><small>08:00</small><small>10:00</small></span><p>Цвет неба — время подъёма</p>
          <div class="mo-legend"><span><b>${si('rise', 12)}</b>самый ранний подъём</span><span><b>${ic('zap', 11, 2.6)}</b>быстрее всего задание</span></div></div>`;
    }
    flow.sheet(`${head('Карточки утра')}<div class="ap-sh-body scroll">${body}</div>`, `ap-sheet${enter ? ' ' + enter : ''}`);
  }

  function cardSheet(flow, t) {
    const s = flow.state, h = K.stats(s).h, i = h.findIndex((x) => x.d.getTime() === +t), x = h[i];
    if (!x) { albumSheet(flow, 'back'); return; }
    const tk = x.task && TASKS.find((y) => y.id === x.task), long = x.d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    flow.sheet(`${head(cap(x.d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })), 'mo-album-back', 'back')}<div class="ap-sh-body scroll">
      <div class="mo-big-card">${cardOf(x, i + 1, 'div', records(h))}</div>
      <div class="ap-card ap-list">
        <div class="ap-row"><i class="ap-row-i c" style="--c:#FF9500">${si('rise', 20)}</i><span>Подъём</span><em>${K.fmtMin(x.wake)} · ${long.split(',')[0]}</em></div>
        ${tk ? `<div class="ap-row"><i class="ap-row-i c tb cat-${tk.cat}">${Sonly.ti(tk.id, 19)}</i><span>${tk.name}</span><em>${x.secs ? `${x.secs} с` : ''}</em></div>` : ''}
        <div class="ap-row"><i class="ap-row-i c" style="--c:#AF52DE">${si('cards', 20)}</i><span>В коллекции</span><em>№ ${i + 1} из ${h.length}</em></div></div>
      <p class="ap-note mo-msg">${s._copied || ''}</p></div>
      <div class="ap-sh-foot mo-two"><button class="ap-btn ghost" data-act="mo-save:${t}">${si('save', 19)}Сохранить</button><button class="ap-btn" data-act="mo-share:${t}">${si('share', 19)}Поделиться</button></div>`, 'ap-sheet push');
  }

  /** Картинка карточки 1080 × 1440 для «Сохранить»: то же небо и солнце, что на экране. */
  function cardPng(x, n) {
    const k = skyOf(x.wake), w = 1080, h = 1440, cv = document.createElement('canvas'), g = cv.getContext('2d'), t = x.task && TASKS.find((y) => y.id === x.task);
    cv.width = w; cv.height = h;
    const lg = g.createLinearGradient(0, 0, 0, h);
    lg.addColorStop(0, k.a); lg.addColorStop(1, k.b);
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    const sy = h * (1.2 - k.sun * 0.32), rg = g.createRadialGradient(w / 2, sy, 0, w / 2, sy, w * 0.62);
    rg.addColorStop(0, 'rgba(255,246,206,.96)'); rg.addColorStop(0.45, 'rgba(255,210,90,.6)'); rg.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
    g.fillStyle = k.ink;
    g.globalAlpha = 0.85; g.font = '600 50px Inter, sans-serif'; g.fillText(x.d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }), 92, 172);
    g.globalAlpha = 1; g.font = '800 252px "Roboto Flex", Inter, sans-serif'; g.fillText(K.fmtMin(x.wake), 78, 420);
    g.globalAlpha = 0.88; g.font = '600 50px Inter, sans-serif'; g.fillText(cap(x.d.toLocaleDateString('ru-RU', { weekday: 'long' })) + (t ? ` · ${t.name}` : ''), 92, 506);
    g.globalAlpha = 1; g.font = '800 66px "Roboto Flex", Inter, sans-serif'; g.fillText('sonly', 92, h - 104);
    g.textAlign = 'right'; g.font = '700 46px Inter, sans-serif'; g.fillText(`№ ${n}`, w - 92, h - 108);
    return cv.toDataURL('image/png');
  }

  function groupSheet(flow) {
    const s = flow.state, g = s.group, now = K.stats(s).h.find((x) => x.d.getTime() === today());
    const body = g
      ? `<div class="ap-card mo-grp">${faces(s, true)}<b>${esc(g.name)}</b><small>Код приглашения</small><div class="mo-code">${g.code}</div></div>
        <h3>Участники</h3><div class="ap-card ap-list"><div class="ap-row tall"><i class="ap-row-i c" style="--c:#FFC62B">${Sonly.mark()}</i><span>Ты<small>${now ? `встал в ${K.fmtMin(now.wake)}` : 'сегодня ещё не вставал'}</small></span>${now ? `<em class="mo-ok">${ic('check', 15, 3.2)}</em>` : ''}</div></div>
        <p class="ap-note">${s._copied || ''}</p>`
      : `<div class="mo-grp-empty">${faces(s, true)}<b>Вставайте вместе</b><p>Утром видно, кто уже встал.</p></div>
        <label class="ap-card mo-name"><small>Название группы</small><input class="js-gname" value="Утренний клуб" maxlength="24" aria-label="Название группы"></label>`;
    const foot = g ? '<button class="ap-btn" data-act="mo-invite">Позвать друзей</button><button class="ap-btn ghost" data-act="mo-leave">Выйти из группы</button>' : '<button class="ap-btn" data-act="mo-create">Создать группу</button>';
    flow.sheet(`${head('Группа подъёма')}<div class="ap-sh-body scroll">${body}</div><div class="ap-sh-foot">${foot}</div>`, 'ap-sheet');
  }

  /* Прослушивание подарка: кнопка становится паузой, плитка — эквалайзером. Звучит два такта и замолкает сама. */
  function play(flow, name, el) {
    const s = flow.state, row = el && el.closest('.gf-row'), was = row && row.classList.contains('playing');
    flow.sheets.querySelectorAll('.gf-row.playing').forEach((x) => x.classList.remove('playing'));
    clearTimeout(flow._gfT);
    sound.stop();
    if (was) return;
    sound.setVolume(s.volume);
    sound.play(name, { loop: true });
    if (row) row.classList.add('playing');
    flow._gfT = setTimeout(() => { sound.stop(); if (row) row.classList.remove('playing'); }, Math.max(2600, (sound.len ? sound.len(name) : 2) * 2000));
  }

  Sonly.morning = {
    rewards,
    /** Небо для минуты суток — им же красится виджет следующего будильника. */
    sky: skyOf,
    /** Сводка для экрана «Доброе утро». */
    blocks: (s) => briefCards(s, 'wk-brief'),
    preview(flow, what) {
      flow.go('morning', 0);
      if (what === 'album') albumSheet(flow); else if (what === 'gifts') giftsSheet(flow); else if (what === 'group') groupSheet(flow);
      else if (what === 'brief') briefSheet(flow);
      else if (what === 'card') { const h = K.stats(flow.state).h; if (h.length) cardSheet(flow, h[h.length - 1].d.getTime()); else albumSheet(flow); }
      else if (what.startsWith('item') || what.startsWith('story')) story(flow, Math.max(0, BRIEF.findIndex((x) => x[0] === (what.split('-')[1] || 'weather'))));
    },
    on(flow, act, arg, el) {
      const s = flow.state;
      switch (act) {
        case 'mo-story': story(flow, Math.max(0, BRIEF.findIndex((x) => x[0] === arg))); return true;
        case 'sy-go': {
          const r = el && el.closest('.sy');
          if (r && r.dataset.held) { delete r.dataset.held; return true; }
          storyGo(flow, +arg);
          return true;
        }
        case 'sy-close': closeStory(flow); return true;
        case 'mo-brief': briefSheet(flow); return true;
        case 'mo-flag': {
          const [id, from] = arg.split(':'), b = briefOf(s);
          b[id] = !b[id];
          if (from === 'story') { el.classList.toggle('on', b[id]); el.setAttribute('aria-checked', b[id]); if (flow.id === 'morning') flow.rerender(true); return true; }
          if (flow.id === 'morning') flow.rerender(true);
          briefSheet(flow);
          return true;
        }
        case 'mo-gifts': giftsSheet(flow); return true;
        case 'mo-play': play(flow, arg, el); return true;
        case 'mo-use': {
          s.sndDef = arg;
          giftsSheet(flow);
          play(flow, arg, [...flow.sheets.querySelectorAll('.gf-row')].find((x) => x.dataset.act === `mo-use:${arg}`));
          return true;
        }
        case 'mo-album': albumSheet(flow); return true;
        case 'mo-album-back': s._copied = ''; albumSheet(flow, 'back'); return true;
        case 'mo-card': s._copied = ''; cardSheet(flow, arg); return true;
        case 'mo-share': {
          const h = K.stats(s).h, i = h.findIndex((x) => x.d.getTime() === +arg), x = h[i];
          if (!x) return true;
          K.shareText(`Встал в ${K.fmtMin(x.wake)} — ${x.d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}. Карточка утра № ${i + 1} в sonly.`, true, (msg) => { s._copied = msg.replace(' с кодом', ''); const n = flow.sheets.querySelector('.mo-msg'); if (n) n.textContent = s._copied; });
          return true;
        }
        case 'mo-save': {
          const h = K.stats(s).h, i = h.findIndex((x) => x.d.getTime() === +arg), x = h[i];
          if (!x) return true;
          const a = document.createElement('a');
          a.href = cardPng(x, i + 1);
          a.download = `sonly-${x.d.toISOString().slice(0, 10)}.png`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          const n = flow.sheets.querySelector('.mo-msg');
          if (n) n.textContent = 'Картинка сохранена';
          return true;
        }
        case 'mo-group': s._copied = ''; groupSheet(flow); return true;
        case 'mo-create': {
          const input = flow.sheets.querySelector('.js-gname');
          s.group = { name: ((input && input.value) || '').trim() || 'Утренний клуб', code: 'GRP-' + K.code4() };
          if (flow.id === 'morning') flow.rerender(true);
          groupSheet(flow);
          return true;
        }
        case 'mo-invite':
          K.shareText(`Вставай со мной в sonly: группа «${s.group.name}», код ${s.group.code}.`, true, (msg) => { s._copied = msg; groupSheet(flow); });
          return true;
        case 'mo-leave': s.group = null; if (flow.id === 'morning') flow.rerender(true); groupSheet(flow); return true;
        default: return false;
      }
    },
  };
})();
