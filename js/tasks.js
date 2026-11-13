/* Настройки заданий: что у задания внутри и что из этого выбирает человек. Одни и те же для онбординга и для приложения.
   Всё выбрано заранее разумным образом — человек только убирает лишнее или меняет сложность. */
(() => {
  'use strict';
  const { ic } = Sonly;
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
    shake: { ask: 'Сколько раз встряхнуть?', hint: '', ctl: [count('n', 30, 10, 60, 10, ['встряхивание', 'встряхивания', 'встряхиваний'], '', lvl(20, 30, 50))] },
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
    tongue: { ask: 'Какую скороговорку говорить?', hint: '', ctl: [choice('level', 'mid', [['easy', 'Простая', 'Шла Саша по шоссе'], ['mid', 'Средняя', 'Карл у Клары украл кораллы'], ['hard', 'Сложная', 'Сшит колпак не по-колпаковски']])] },
    rhythm: { ask: 'Какой длины ритм?', hint: '', ctl: [count('n', 6, 4, 10, 2, ['удар', 'удара', 'ударов'], '', lvl(4, 6, 8))] },
    quiz: { ask: 'О чём вопросы?', hint: '', ctl: [choice('topic', 'flags', [['flags', 'Флаги', 'Чей это флаг?'], ['capitals', 'Столицы', 'Столица Франции?'], ['mix', 'Вперемешку', 'Всё подряд']], 'Тема'), count('n', 3, 1, 10, 1, ['вопрос', 'вопроса', 'вопросов'], 'Сколько вопросов')] },
  };

  const ctlOf = (id) => (OPTS[id] ? OPTS[id].ctl : []);
  const def = (id) => { const o = {}; ctlOf(id).forEach((c) => { o[c.key] = c.kind === 'objects' ? [] : c.def; }); return o; };
  const picked = (o) => ALL - (o.off || []).length;

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
      return `<div class="to">${ctlOf(id).map((c) => {
        const title = c.title ? `<h4>${c.title}</h4>` : '';
        if (c.kind === 'objects') {
          const n = picked(o);
          return `<div class="to-bar${n < c.min ? ' low' : ''}"><span><b>${n}</b> из ${ALL}${n < c.min ? ` · нужно ${c.min}` : ''}</span><button data-act="to-all"${n === ALL ? ' disabled' : ''}>${ic('rotate-ccw', 14, 2.3)}Все</button></div>
            ${ROOMS.map(([room, list]) => `<h4>${room}</h4><div class="to-grid">${list.map((x) => `<button class="to-obj pic${o.off.includes(x[0]) ? '' : ' on'}" data-act="to-obj:${x[0]}" aria-pressed="${!o.off.includes(x[0])}">${pic(item(x))}<b>${x[1]}</b><em>${ic('check', 11, 3.6)}</em></button>`).join('')}</div>`).join('')}`;
        }
        if (c.kind === 'count') {
          const v = o[c.key];
          return `${title}<div class="to-step"><button data-act="to-step:${c.key}:-1" aria-label="Меньше"${v <= c.min ? ' disabled' : ''}>${ic('minus', 22, 2.6)}</button><div><b>${v}</b><small>${pl(v, c.unit)}</small></div><button data-act="to-step:${c.key}:1" aria-label="Больше"${v >= c.max ? ' disabled' : ''}>${ic('plus', 22, 2.6)}</button></div>${c.presets ? `<div class="to-opts row">${c.presets.map(([n, name]) => `<button class="to-opt${v === n ? ' on' : ''}" data-act="to-num:${c.key}:${n}" aria-pressed="${v === n}"><b>${n}</b><small>${name}</small><em>${ic('check', 12, 3.6)}</em></button>`).join('')}</div>` : ''}`;
        }
        return `${title}<div class="to-opts${c.opts.length === 3 && c.opts.every((x) => x[2].length < 14) ? ' row' : ''}">${c.opts.map(([v, name, sample]) => `<button class="to-opt${o[c.key] === v ? ' on' : ''}" data-act="to-set:${c.key}:${v}" aria-pressed="${o[c.key] === v}"><b>${name}</b><small>${sample}</small><em>${ic('check', 12, 3.6)}</em></button>`).join('')}</div>`;
      }).join('')}</div>`;
    },
    /** Применяет нажатие к настройкам. Возвращает true, если нажатие было по настройке задания. */
    act(id, o, act, arg) {
      if (act === 'to-obj') { o.off = o.off.includes(arg) ? o.off.filter((x) => x !== arg) : [...o.off, arg]; return true; }
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
