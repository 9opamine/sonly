/* Настройки заданий: что у задания внутри и что из этого выбирает человек. Одни и те же для онбординга и для приложения.
   Всё выбрано заранее разумным образом — человек только убирает лишнее или меняет сложность. */
(() => {
  'use strict';
  const { ic, emo } = Sonly;
  const pl = (n, f) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? f[1] : f[2]; };

  /* Предметы для задания «Найди предмет», по комнатам: id (он же имя картинки в img/obj), название, эмодзи про запас и «что снять» — винительный падеж. */
  const ROOMS = [
    ['Ванная', [['tap', 'Кран', '🚰', 'кран'], ['soap', 'Мыло', '🧼', 'мыло'], ['shower', 'Душ', '🚿', 'душ'], ['brush', 'Зубная щётка', '🪥', 'зубную щётку'], ['shampoo', 'Шампунь', '🧴', 'шампунь'], ['mirror', 'Зеркало', '🪞', 'зеркало']]],
    ['Кухня', [['kettle', 'Чайник', '🫖', 'чайник'], ['mug', 'Кружка', '☕', 'кружку'], ['plate', 'Тарелка', '🍽️', 'тарелку'], ['pan', 'Сковорода', '🍳', 'сковороду'], ['spoon', 'Ложка', '🥄', 'ложку'], ['salt', 'Солонка', '🧂', 'солонку']]],
    ['Комната', [['book', 'Книга', '📖', 'книгу'], ['lamp', 'Лампа', '💡', 'лампу'], ['tv', 'Телевизор', '📺', 'телевизор'], ['phones', 'Наушники', '🎧', 'наушники'], ['plant', 'Цветок в горшке', '🪴', 'цветок'], ['window', 'Окно', '🪟', 'окно']]],
    ['Прихожая', [['keys', 'Ключи', '🔑', 'ключи'], ['shoes', 'Обувь', '👟', 'обувь'], ['bag', 'Рюкзак', '🎒', 'рюкзак'], ['door', 'Дверь', '🚪', 'дверь'], ['umbrella', 'Зонт', '☂️', 'зонт'], ['coat', 'Куртка', '🧥', 'куртку']]],
  ];
  const ALL = ROOMS.reduce((n, r) => n + r[1].length, 0);
  const item = ([id, name, emo, acc]) => ({ id, name, emo, acc, img: `img/obj/${id}.webp` });
  /** Картинка предмета; если картинки нет — эмодзи. */
  const pic = (x, cls = 'obj') => (x.img ? `<img class="${cls}" src="${x.img}" alt="" draggable="false">` : `<span class="emo">${x.emo}</span>`);

  const count = (key, def, min, max, step, unit, title, presets) => ({ kind: 'count', key, def, min, max, step, unit, title, presets });
  /* Три готовых уровня под счётчиком: чтобы не гадать, сколько это — много или мало. */
  const lvl = (a, b, c) => [[a, 'Легко'], [b, 'Обычно'], [c, 'Всерьёз']];
  const choice = (key, def, opts, title) => ({ kind: 'choice', key, def, opts, title });

  /* ask — заголовок экрана настройки, hint — пояснение под ним, ctl — что именно настраивается. */
  const OPTS = {
    hunt: { ask: 'Что будем искать?', hint: 'Убери то, чего у тебя нет.', ctl: [{ kind: 'objects', key: 'off', min: 5 }] },
    qr: { ask: 'Какой код сканировать?', hint: 'Повесь его подальше от кровати.', ctl: [choice('code', 'any', [['any', 'Любой штрихкод', 'Паста, книга, кофе'], ['own', 'Свой код sonly', 'Распечатай и повесь']])] },
    squat: { ask: 'Сколько приседаний?', hint: '', ctl: [count('n', 10, 5, 30, 5, ['приседание', 'приседания', 'приседаний'], '', lvl(5, 10, 20))] },
    pushup: { ask: 'Сколько отжиманий?', hint: '', ctl: [count('n', 5, 3, 20, 1, ['отжимание', 'отжимания', 'отжиманий'], '', lvl(3, 5, 10))] },
    jump: { ask: 'Сколько прыжков?', hint: '', ctl: [count('n', 15, 5, 40, 5, ['прыжок', 'прыжка', 'прыжков'], '', lvl(10, 15, 30))] },
    steps: { ask: 'Сколько шагов пройти?', hint: '', ctl: [count('n', 20, 10, 100, 10, ['шаг', 'шага', 'шагов'], '', lvl(10, 20, 50))] },
    shake: { ask: 'Сколько встряхиваний?', hint: '', ctl: [count('n', 30, 10, 60, 10, ['встряхивание', 'встряхивания', 'встряхиваний'], '', lvl(20, 30, 50))] },
    math: {
      ask: 'Какие примеры решать?', hint: '',
      ctl: [choice('level', 'mid', [['easy', 'Лёгкие', '7 + 5'], ['mid', 'Средние', '24 × 3'], ['hard', 'Сложные', '148 − 59 + 27']], 'Сложность'), count('n', 3, 1, 10, 1, ['пример', 'примера', 'примеров'], 'Сколько примеров')],
    },
    memory: {
      ask: 'Какое поле запоминать?', hint: '',
      ctl: [choice('size', '3', [['3', '3 × 3', '9 клеток'], ['4', '4 × 4', '16 клеток'], ['5', '5 × 5', '25 клеток']], 'Поле'), count('n', 2, 1, 5, 1, ['раунд', 'раунда', 'раундов'], 'Сколько раундов')],
    },
    pairs: { ask: 'Сколько пар искать?', hint: '', ctl: [count('n', 6, 4, 10, 2, ['пара', 'пары', 'пар'], '', lvl(4, 6, 8))] },
    phrase: { ask: 'Какую фразу набирать?', hint: '', ctl: [choice('len', 'mid', [['short', 'Короткая', 'Доброе утро, я встаю'], ['mid', 'Средняя', 'Сегодня я встаю с первого звонка'], ['long', 'Длинная', 'Каждое утро начинается с одного решения — встать']])] },
    tongue: { ask: 'Какая скороговорка?', hint: '', ctl: [choice('level', 'mid', [['easy', 'Простая', 'Шла Саша по шоссе и сосала сушку'], ['mid', 'Средняя', 'Карл у Клары украл кораллы, а Клара у Карла украла кларнет'], ['hard', 'Сложная', 'Сшит колпак не по-колпаковски, вылит колокол не по-колоколовски']])] },
    rhythm: { ask: 'Какой длины ритм?', hint: '', ctl: [count('n', 6, 4, 10, 2, ['удар', 'удара', 'ударов'], '', lvl(4, 6, 8))] },
    quiz: { ask: 'О чём вопросы?', hint: '', ctl: [choice('topic', 'flags', [['flags', 'Флаги', 'Чей это флаг?'], ['capitals', 'Столицы', 'Столица Франции?'], ['mix', 'Вперемешку', 'Всё подряд']], 'Тема'), count('n', 3, 1, 10, 1, ['вопрос', 'вопроса', 'вопросов'], 'Сколько вопросов')] },
  };

  const ctlOf = (id) => (OPTS[id] ? OPTS[id].ctl : []);
  const def = (id) => { const o = {}; ctlOf(id).forEach((c) => { o[c.key] = c.kind === 'objects' ? [] : c.def; }); return o; };
  const picked = (o) => ALL - (o.off || []).length;

  /* ── Вид меню ─────────────────────────────────────────────
     just — что поменяли последним нажатием: эта плитка пружинит после перерисовки. */
  let just = '';
  const check = () => `<em>${ic('check', 12, 3.6)}</em>`;
  const pop = (key, on) => (on && just === key ? ' pop' : '');
  /** Количество: большое число, «−» и «+», под ним три готовых уровня. */
  function stepper(c, o) {
    const v = o[c.key], title = c.title ? `<h4>${c.title}</h4>` : '';
    return `${title}<div class="to-step${just === c.key ? ' pop' : ''}"><button data-act="to-step:${c.key}:-1" aria-label="Меньше"${v <= c.min ? ' disabled' : ''}>${ic('minus', 22, 2.6)}</button><div><b>${v}</b><small>${pl(v, c.unit)}</small></div><button data-act="to-step:${c.key}:1" aria-label="Больше"${v >= c.max ? ' disabled' : ''}>${ic('plus', 22, 2.6)}</button></div>${c.presets ? `<div class="to-opts row">${c.presets.map(([n, name]) => `<button class="to-opt${v === n ? ' on' : ''}${pop(c.key, v === n)}" data-act="to-num:${c.key}:${n}" aria-pressed="${v === n}"><b>${n}</b><small>${name}</small>${check()}</button>`).join('')}</div>` : ''}`;
  }
  function ctl(c, o) {
    if (c.kind === 'objects') {
      const n = picked(o);
      return `<div class="to-bar${n < c.min ? ' low' : ''}"><span><b>${n}</b> из ${ALL}${n < c.min ? ` · нужно ${c.min}` : ''}</span><button data-act="to-all"${n === ALL ? ' disabled' : ''}>${ic('rotate-ccw', 14, 2.3)}Все</button></div>
        ${ROOMS.map(([room, list]) => `<h4>${room}</h4><div class="to-grid">${list.map((x) => `<button class="to-obj pic${o.off.includes(x[0]) ? '' : ' on'}" data-act="to-obj:${x[0]}" aria-pressed="${!o.off.includes(x[0])}">${pic(item(x))}<b>${x[1]}</b><em>${ic('check', 11, 3.6)}</em></button>`).join('')}</div>`).join('')}`;
    }
    if (c.kind === 'count') return stepper(c, o);
    const title = c.title ? `<h4>${c.title}</h4>` : '';
    return `${title}<div class="to-opts${c.opts.length === 3 && c.opts.every((x) => x[2].length < 14) ? ' row' : ''}">${c.opts.map(([v, name, sample]) => `<button class="to-opt${o[c.key] === v ? ' on' : ''}${pop(c.key, o[c.key] === v)}" data-act="to-set:${c.key}:${v}" aria-pressed="${o[c.key] === v}"><b>${name}</b><small>${sample}</small>${check()}</button>`).join('')}</div>`;
  }
  const C = (id, key) => ctlOf(id).find((c) => c.key === key);
  /** Плитка выбора со своим рисунком. */
  const card = (key, val, on, inner, cls = '') => `<button class="to-card${cls ? ' ' + cls : ''}${on ? ' on' : ''}${pop(key, on)}" data-act="to-set:${key}:${val}" aria-pressed="${on}">${inner}${check()}</button>`;
  /** Тёмная карточка «так будет утром»: задания всегда тёмные, поэтому и предпросмотр тёмный в любой теме. */
  const prev = (cls, inner) => `<div class="to-prev ${cls}">${inner}</div>`;
  const suns = (n) => `<span class="tp-suns">${[1, 2, 3].map((i) => `<i class="${i <= n ? 'on' : ''}">${Sonly.mark()}</i>`).join('')}</span>`;
  const MATH = { easy: ['7 + 5', 1], mid: ['24 × 3', 2], hard: ['148 − 59 + 27', 3] };
  /* Образец вопроса викторины для предпросмотра: флаг, вопрос и четыре ответа, верный подсвечен. */
  const QUIZ = {
    flags: ['🇯🇵', 'Чей это флаг?', ['Япония', 'Корея', 'Китай', 'Вьетнам'], ['🇯🇵', '🇧🇷', '🇫🇷'], 'Флаги'],
    capitals: ['🇫🇷', 'Столица Франции?', ['Лион', 'Париж', 'Ницца', 'Марсель'], ['🏛️'], 'Столицы'],
    mix: ['🇮🇹', 'Столица Италии?', ['Рим', 'Милан', 'Турин', 'Неаполь'], ['🇮🇹', '🏛️'], 'Вперемешку'],
  };
  /* Узоры для плиток поля «Памяти»: какие клетки горят. */
  const MEM = { 3: [0, 4, 5, 7], 4: [1, 6, 9, 11, 12], 5: [2, 6, 8, 12, 16, 18, 23] };
  /** Ритм-образец для предпросмотра: тот же рисунок при том же числе ударов. */
  const BEAT = (n) => { const t = [0]; for (let i = 1; i < n; i++) t.push(t[i - 1] + ([1, 0, 0, 1, 0, 1, 1, 0, 0][i - 1] ? 800 : 400)); return t; };
  const beatTrack = (n, cls = '') => { const t = BEAT(n), end = t[t.length - 1]; return `<div class="tp-track${cls}"><u></u>${t.map((x, i) => `<i style="--x:${((x / end) * 100).toFixed(1)}%;--d:${i * 60}ms;--t:${x}ms"></i>`).join('')}</div>`; };
  /** Последние два слова — неразрывно: одно слово не остаётся на последней строке. */
  const glue = (t) => t.replace(/ (\S+)$/, ' $1');
  const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
  const VIEW = {
    math(o) {
      const n = o.n, [eq, lv] = MATH[o.level] || MATH.mid;
      return prev('tp-math', `<span class="tp-eq">${eq} = <i>?</i></span>
          <div class="tp-row">${Array.from({ length: n }, (_, i) => `<i class="${i ? '' : 'now'}" style="--d:${i * 40}ms">${i + 1}</i>`).join('')}</div>`)
        + `<h4>Сложность</h4><div class="to-cards c3">${C('math', 'level').opts.map(([v, name]) => card('level', v, o.level === v, `${suns(MATH[v][1])}<b>${name}</b><small>${MATH[v][0]}</small>`)).join('')}</div>`
        + stepper(C('math', 'n'), o);
    },
    quiz(o) {
      const [flag, q, ans] = QUIZ[o.topic] || QUIZ.flags, right = o.topic === 'capitals' ? 1 : 0;
      return prev('tp-quiz', `<div class="tp-qhead">${emo(flag, 'tp-flag')}<b>${q}</b></div><div class="tp-ans">${ans.map((a, i) => `<span class="${i === right ? 'ok' : ''}">${a}</span>`).join('')}</div>`)
        + `<h4>Тема</h4><div class="to-cards c3">${Object.entries(QUIZ).map(([v, x]) => card('topic', v, o.topic === v, `<span class="tp-pics n${x[3].length}">${x[3].map((e) => emo(e)).join('')}</span><b>${x[4]}</b>`)).join('')}</div>`
        + stepper(C('quiz', 'n'), o);
    },
    memory(o) {
      return `<div class="to-cards c3">${C('memory', 'size').opts.map(([v, name, sample]) => card('size', v, o.size === v, `<span class="tp-grid" style="--n:${v}">${Array.from({ length: v * v }, (_, i) => `<i class="${MEM[v].includes(i) ? 'on' : ''}"></i>`).join('')}</span><b>${name}</b><small>${sample}</small>`, 'tall')).join('')}</div>`
        + stepper(C('memory', 'n'), o);
    },
    pairs(o) {
      const pics = TO.objects({ off: [] }), n = o.n, open = [0, 3];
      return prev('tp-pairs', `<div class="tp-cards" style="--c:${n * 2 > 12 ? 5 : 4}">${Array.from({ length: n * 2 }, (_, i) => `<i class="${open.includes(i) ? 'open' : ''}" style="--d:${i * 25}ms">${open.includes(i) ? `<img src="${pics[2].img}" alt="">` : Sonly.mark()}</i>`).join('')}</div>`)
        + stepper(C('pairs', 'n'), o);
    },
    phrase(o) {
      return `<div class="to-cards c1">${C('phrase', 'len').opts.map(([v, name, text]) => card('len', v, o.len === v, `<small>${name} · ${text.replace(/[^а-яёa-z0-9]/gi, '').length} букв</small><b class="tp-text">${glue(text)}</b>`, 'wide')).join('')}</div>`;
    },
    tongue(o) {
      const say = canSpeak();
      return `<div class="to-cards c1">${C('tongue', 'level').opts.map(([v, name, text]) => `<div class="tp-say">${card('level', v, o.level === v, `<small>${name}</small><b class="tp-text">${glue(text.replace(/-/g, '‑'))}</b>`, 'wide')}${say ? `<button class="tp-play" data-act="to-say:${v}" aria-label="Послушать">${ic('volume-2', 18, 2.3)}</button>` : ''}</div>`).join('')}</div>`;
    },
    rhythm(o) {
      return prev('tp-rhythm', `${beatTrack(o.n)}<button class="tp-listen" data-act="to-beat:${o.n}">${ic('play', 15, 2.6)}Послушать</button>`) + stepper(C('rhythm', 'n'), o);
    },
  };
  /* Шаги и встряска: телефон считает сам — показываем, что делать. */
  VIEW.steps = (o) => prev('tp-move', `<span class="tp-emo walk">${emo('🚶')}</span><small>Шагай с телефоном в руке</small>`) + stepper(ctlOf('steps')[0], o);
  VIEW.shake = (o) => prev('tp-move', `<span class="tp-emo shake">${emo('📱')}</span><small>Тряси телефон в руке</small>`) + stepper(ctlOf('shake')[0], o);
  /* Упражнения с камерой: в предпросмотре человек делает это упражнение (рисунок с экрана задания). */
  ['squat', 'pushup', 'jump'].forEach((id) => {
    VIEW[id] = (o) => (Sonly.ringer && Sonly.ringer.anim ? prev('tp-fig', Sonly.ringer.anim(id)) : '') + stepper(ctlOf(id)[0], o);
  });

  const TO = {
    has: (id) => ctlOf(id).length > 0,
    def,
    /** Настройки задания у владельца (состояние онбординга или будильник); создаются при первом обращении. */
    get(holder, id) { holder.opts = holder.opts || {}; return holder.opts[id] || (holder.opts[id] = def(id)); },
    ask: (id) => (OPTS[id] ? OPTS[id].ask : 'Настройка задания'),
    hint: (id) => (OPTS[id] ? OPTS[id].hint : ''),
    valid: (id, o) => ctlOf(id).every((c) => c.kind !== 'objects' || picked(o) >= c.min),
    /** Предметы, оставленные в списке: из них будильник называет один. */
    objects(o) {
      const out = [];
      ROOMS.forEach(([, list]) => list.forEach((x) => { if (!(o.off || []).includes(x[0])) out.push(item(x)); }));
      return out;
    },
    pic,
    /**
     * Плитки списка обновляются на месте — без перерисовки экрана, чтобы сыграла анимация.
     * on(id) — выбрана ли плитка; bar — что показать в строке над списком.
     */
    tiles(root, on, bar) {
      let k = 0;
      root.querySelectorAll('.to-obj').forEach((b) => {
        const want = on(b.dataset.act.slice(b.dataset.act.indexOf(':') + 1));
        if (b.classList.contains('on') === want) return;
        b.style.setProperty('--dl', `${k++ * 28}ms`);
        b.classList.toggle('on', want);
        b.setAttribute('aria-pressed', want);
        b.classList.remove('pop');
        void b.offsetWidth;
        b.classList.add('pop');
      });
      const el = root.querySelector('.to-bar');
      if (!el || !bar) return;
      el.classList.toggle('low', bar.low);
      el.querySelector('span').innerHTML = bar.html;
      el.querySelector('button').disabled = bar.full;
    },
    /** То же для предметов задания «Найди предмет». Возвращает false, если списка предметов на экране нет. */
    sync(root, id, o) {
      const c = ctlOf(id).find((x) => x.kind === 'objects');
      if (!c || !root || !root.querySelector('.to-obj.pic')) return false;
      const n = picked(o);
      TO.tiles(root, (oid) => !o.off.includes(oid), { low: n < c.min, full: n === ALL, html: `<b>${n}</b> из ${ALL}${n < c.min ? ` · нужно ${c.min}` : ''}` });
      return true;
    },
    /** Текст выбранного варианта: сама фраза или скороговорка. */
    sample(id, key, val) { const c = ctlOf(id).find((x) => x.key === key); return ((c && c.opts.find((x) => x[0] === val)) || [0, 0, ''])[2]; },
    /** Короткая строка о выборе: «24 предмета», «средние · 3 примера». */
    summary(id, o) {
      return ctlOf(id).map((c) => {
        if (c.kind === 'objects') return `${picked(o)} ${pl(picked(o), ['предмет', 'предмета', 'предметов'])}`;
        if (c.kind === 'count') return `${o[c.key]} ${pl(o[c.key], c.unit)}`;
        return (c.opts.find((x) => x[0] === o[c.key]) || c.opts[0])[1].toLowerCase();
      }).join(' · ');
    },
    html(id, o) {
      const out = VIEW[id] ? VIEW[id](o) : ctlOf(id).map((c) => ctl(c, o)).join('');
      just = '';
      return `<div class="to">${out}</div>`;
    },
    /** Применяет нажатие к настройкам. Возвращает true, если нажатие было по настройке задания. */
    act(id, o, act, arg) {
      if (act === 'to-obj') { o.off = o.off.includes(arg) ? o.off.filter((x) => x !== arg) : [...o.off, arg]; return true; }
      if (act === 'to-say') {
        /* Читаем скороговорку вслух голосом телефона, чтобы было понятно, как её говорить. */
        const text = TO.sample('tongue', 'level', arg);
        if (canSpeak() && text) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ru-RU'; u.rate = 0.95; speechSynthesis.speak(u); }
        return 'keep';
      }
      if (act === 'to-beat') {
        if (Sonly.sound) BEAT(+arg).forEach((t, i) => Sonly.sound.drum(0.05 + t / 1000, i > 0));
        if (typeof document !== 'undefined') document.querySelectorAll('.tp-rhythm .tp-track').forEach((tr) => { tr.classList.remove('play'); void tr.offsetWidth; tr.classList.add('play'); });
        return 'keep';
      }
      if (act === 'to-set' || act === 'to-num' || act === 'to-step') just = arg.split(':')[0];
      if (act === 'to-all') { o.off = []; return true; }
      if (act === 'to-set') { const i = arg.indexOf(':'); o[arg.slice(0, i)] = arg.slice(i + 1); return true; }
      if (act === 'to-num') { const i = arg.indexOf(':'); o[arg.slice(0, i)] = +arg.slice(i + 1); return true; }
      if (act === 'to-step') {
        const i = arg.indexOf(':'), key = arg.slice(0, i), c = ctlOf(id).find((x) => x.key === key);
        if (c) o[key] = Math.max(c.min, Math.min(c.max, o[key] + c.step * +arg.slice(i + 1)));
        return true;
      }
      return false;
    },
  };
  Sonly.taskOpts = TO;
})();
