/* Вкладка «Утро» — по присланному примеру: что показать после подъёма (погода, слово дня, поговорка),
   подарки за серию (новые звуки будильника), карточки утра и группа подъёма с друзьями. */
(() => {
  'use strict';
  const { ic, esc, DAYS, TASKS, appKit: K, sound } = Sonly;
  const app = Sonly.concepts.app;
  const doy = (d = new Date()) => Math.round((K.day0(d) - new Date(d.getFullYear(), 0, 0)) / 864e5);

  /* Слова и поговорки дня — настоящие, с толкованиями по словарю. Меняются раз в сутки. */
  const WORDS = [
    ['Заря', 'Яркое освещение горизонта перед восходом или после захода солнца.'],
    ['Спозаранку', 'Очень рано, ранним утром.'],
    ['Жаворонок', 'Певчая птица. Так же зовут человека, который рано встаёт и рано ложится.'],
    ['Утренник', 'Лёгкий утренний мороз весной или осенью. И детский праздник в первой половине дня.'],
    ['Побудка', 'Сигнал к подъёму ото сна — например, в армии.'],
    ['Предрассветный', 'Бывающий перед рассветом: предрассветный туман, предрассветная тишина.'],
    ['Росистый', 'Покрытый росой: росистая трава, росистое утро.'],
    ['Зорька', 'Ласковое название зари.'],
    ['Ни свет ни заря', 'Очень рано, когда ещё не рассвело.'],
    ['Бодрствовать', 'Не спать, быть в сознании.'],
  ];
  /* Поговорка и её смысл — он виден, когда строку раскрывают. */
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
  const WEATHER = { now: 4, hi: 9, text: 'Ясно, без осадков', feel: 2, wind: 3, rain: 0, rise: '07:42' };
  const BRIEF = [['weather', 'Погода', 'cloud-sun', '#2F7BF6'], ['word', 'Слово дня', 'book-open', '#7C5CF0'], ['saying', 'Поговорка', 'quote', '#F07A1A']];
  /* Подарки за серию — новые звуки будильника. Открываются по лучшей серии и остаются навсегда. */
  const REWARDS = [[3, 'Солнечный зайчик'], [7, 'Утренний бриз'], [14, 'Жаворонок']];
  /* Цвет карточки утра зависит от того, как рано человек встал: чем раньше, тем темнее небо. */
  const SKY = [[330, '#1B2342', '#E9785A', '#fff'], [390, '#33427A', '#FFA65C', '#fff'], [450, '#4F78C4', '#FFCF66', '#fff'], [1440, '#8EC1F0', '#FFF0B8', '#0D0D0F']];

  const wordOf = () => WORDS[doy() % WORDS.length];
  const sayingOf = () => SAYINGS[doy() % SAYINGS.length];
  const rewards = (s) => { const best = K.stats(s).best; return REWARDS.map(([n, name]) => ({ n, name, open: best >= n })); };
  const briefOf = (s) => s.brief || (s.brief = { weather: true, word: true, saying: true });

  /** Строки сводки, которые человек увидит на экране «Доброе утро». */
  function briefRows(s, cls = '') {
    const b = briefOf(s), w = wordOf(), say = sayingOf(), out = [];
    /* Строка: значок, заголовок, стрелка. По нажатию плавно раскрывается и показывает подробности. */
    const row = (col, icon, title, more) => `<div class="br-row"><button class="br-head" data-act="br-open" aria-expanded="false"><i style="--c:${col}">${ic(icon, 19, 2.1)}</i><b>${title}</b><em>${ic('chevron-down', 18, 2.4)}</em></button>
      <div class="br-more"><div><div class="br-in">${more}</div></div></div></div>`;
    const cell = (name, val) => `<span><small>${name}</small><b>${val}</b></span>`;
    if (b.weather) out.push(row('#2F7BF6', 'sun', `+${WEATHER.now}° · днём до +${WEATHER.hi}°`, `<p>${WEATHER.text}</p><div class="br-wx">${cell('Ощущается', `+${WEATHER.feel}°`)}${cell('Ветер', `${WEATHER.wind} м/с`)}${cell('Осадки', `${WEATHER.rain} %`)}${cell('Восход', WEATHER.rise)}</div>`));
    if (b.word) out.push(row('#7C5CF0', 'book-open', w[0], `<small class="br-cap">Слово дня</small><p>${w[1]}</p>`));
    if (b.saying) out.push(row('#F07A1A', 'quote', say[0], `<small class="br-cap">Народная поговорка</small><p>${say[1]}</p>`));
    return out.length ? `<div class="ap-card br ${cls}">${out.join('')}</div>` : '';
  }
  /** Кольцо прогресса с картинкой внутри. */
  const ring = (p, inner) => { const C = 2 * Math.PI * 44; return `<span class="mo-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" cx="50" cy="50" r="44" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - p)).toFixed(1)}"/></svg>${inner}</span>`; };
  const faces = (s, big) => `<span class="mo-faces${big ? ' big' : ''}"><i class="me">${Sonly.mark()}</i><i>${ic('user-plus', big ? 20 : 16, 2.1)}</i><i>${ic('user-plus', big ? 20 : 16, 2.1)}</i></span>`;
  const cardOf = (x) => {
    const [, a, b, ink] = SKY.find((k) => x.wake < k[0]), t = x.task && TASKS.find((y) => y.id === x.task);
    return `<div class="mo-card" style="--a:${a};--b:${b};--t:${ink}"><i class="mo-card-sun"></i><small>${x.d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</small><b>${K.fmtMin(x.wake)}</b><span>${DAYS[(x.d.getDay() + 6) % 7]}${t ? ` · ${t.name}` : ''}</span></div>`;
  };
  const head = (title, close = 'sheet-close') => `<div class="ap-sh-head"><button class="ap-x lg" data-act="${close}" aria-label="Закрыть">${ic('x', 20, 2.3)}</button><b>${title}</b><span class="ap-x ghost"></span></div>`;

  /* ── Экран «Утро» ────────────────────────────────────────── */

  app.screens.morning = {
    chrome: false,
    render: (c) => {
      const s = c.s, st = K.stats(s), b = briefOf(s), nx = rewards(s).find((r) => !r.open), left = nx ? Math.max(1, nx.n - st.streak) : 0;
      const mini = st.h.slice(-3).reverse();
      return `<div class="ap-scroll scroll"><h1 class="ap-h1" data-in>Утро</h1>
        <div class="mo-brief" data-in style="--i:1">${BRIEF.map(([id, name, icon, col]) => `<button class="mo-dot${b[id] ? ' on' : ''}" data-act="mo-item:${id}" style="--c:${col}"><i>${ic(icon, 26, 2)}</i><span>${name}</span></button>`).join('')}
          <button class="mo-dot edit" data-act="mo-brief"><i>${ic('sliders-horizontal', 24, 2)}</i><span>Настроить</span></button></div>
        <div class="ap-duo mo-duo" data-in style="--i:2">
          <button class="ap-card mo-tile" data-act="mo-gifts">${ring(nx ? Math.min(1, st.streak / nx.n) : 1, `<i class="mo-gift">${ic('gift', 30, 2)}</i>`)}<b>${nx ? 'Подарок за серию' : 'Все подарки твои'}</b><small>${nx ? `ещё ${left} ${K.pl(left, 'утро', 'утра', 'утр')} подряд` : 'Новые звуки уже в списке'}</small></button>
          <button class="ap-card mo-tile" data-act="mo-album"><span class="mo-stack">${mini.length ? mini.map(cardOf).join('') : '<div class="mo-card ghost"></div><div class="mo-card ghost"></div><div class="mo-card ghost"></div>'}</span><b>Карточки утра</b><small>${st.h.length ? `${st.h.length} в коллекции` : 'Первая — после\u00a0подъёма'}</small></button>
        </div>
        <button class="ap-card mo-group" data-act="mo-group" data-in style="--i:3">${faces(s)}<span><b>${s.group ? esc(s.group.name) : 'Вставайте вместе'}</b>${s.group ? `<small>Код ${s.group.code}</small>` : ''}</span>${K.chev()}</button>
        <div class="ap-sec" data-in style="--i:4"><h2>После подъёма</h2></div>
        ${briefRows(s) || `<button class="ap-add" data-act="mo-brief" data-in style="--i:5">${ic('sliders-horizontal', 18, 2.2)}Выбрать, что показывать</button>`}
      </div>`;
    },
  };

  /* ── Листы ───────────────────────────────────────────────── */

  function itemSheet(flow, id) {
    const s = flow.state, b = briefOf(s), [, name, icon, col] = BRIEF.find((x) => x[0] === id), w = wordOf();
    const body = id === 'weather' ? `<div class="mo-big" style="--c:${col}"><i>${ic('sun', 34, 2)}</i><b>+${WEATHER.now}°</b><span>Днём до +${WEATHER.hi}° · ${WEATHER.text.toLowerCase()}</span></div>`
      : id === 'word' ? `<div class="mo-big" style="--c:${col}"><i>${ic('book-open', 32, 2)}</i><b>${w[0]}</b><span>${w[1]}</span></div>`
        : `<div class="mo-big" style="--c:${col}"><i>${ic('quote', 32, 2)}</i><b>${sayingOf()[0]}</b><span>${sayingOf()[1]}</span></div>`;
    flow.sheet(`<div class="pay-grab"></div><div class="mo-item"><h2>${name}</h2>${body}
      <div class="ap-card ap-list"><div class="ap-row"><i class="ap-row-i c" style="--c:${col}">${ic(icon, 17, 2.2)}</i><span>Показывать после подъёма</span><button class="ap-tg sm${b[id] ? ' on' : ''}" data-act="mo-flag:${id}:item" role="switch" aria-checked="${!!b[id]}" aria-label="Показывать после подъёма"></button></div></div>
      <button class="ap-btn" data-act="sheet-close">Готово</button></div>`, 'ap-low');
  }

  function briefSheet(flow) {
    const s = flow.state, b = briefOf(s);
    flow.sheet(`${head('После подъёма')}<div class="ap-sh-body scroll">
      <div class="ap-card ap-list">${BRIEF.map(([id, name, icon, col]) => `<div class="ap-row"><i class="ap-row-i c" style="--c:${col}">${ic(icon, 17, 2.2)}</i><span>${name}</span><button class="ap-tg sm${b[id] ? ' on' : ''}" data-act="mo-flag:${id}:list" role="switch" aria-checked="${!!b[id]}" aria-label="${name}"></button></div>`).join('')}</div>
      <h3>Так это будет выглядеть</h3>${briefRows(s) || '<div class="ap-empty mo-none">Ничего не выбрано</div>'}</div>`, 'ap-sheet');
  }

  function giftsSheet(flow) {
    const s = flow.state, st = K.stats(s), rw = rewards(s);
    flow.sheet(`${head('Подарки за серию')}<div class="ap-sh-body scroll">
      <div class="ap-card ap-list">${rw.map((r) => `<div class="ap-row tall mo-rw${r.open ? ' open' : ''}">${ring(r.open ? 1 : Math.min(1, st.streak / r.n), `<b>${r.n}</b>`)}<span>${r.name}<small>${r.open ? 'Открыт' : `Серия из ${r.n} ${K.pl(r.n, 'утра', 'утр', 'утр')} · сейчас ${st.streak}`}</small></span>${r.open ? `<button class="mo-play" data-act="mo-play:${r.name}" aria-label="Прослушать «${r.name}»">${ic('play', 15, 2.8)}</button>` : `<em>${ic('lock', 13, 2.5)}</em>`}</div>`).join('')}</div></div>`, 'ap-sheet');
  }

  function albumSheet(flow) {
    const h = K.stats(flow.state).h.slice().reverse();
    flow.sheet(`${head('Карточки утра')}<div class="ap-sh-body scroll">${h.length
      ? `<div class="mo-album">${h.map(cardOf).join('')}</div>`
      : `<div class="ap-sent"><i>${ic('image', 26, 2.2)}</i><b>Пока пусто</b><p>Первая появится завтра утром.</p></div>`}</div>`, 'ap-sheet');
  }

  function groupSheet(flow) {
    const s = flow.state, g = s.group, today = K.stats(s).h.find((x) => x.d.getTime() === K.day0(new Date()).getTime());
    const body = g
      ? `<div class="ap-card mo-grp">${faces(s, true)}<b>${esc(g.name)}</b><small>Код приглашения</small><div class="mo-code">${g.code}</div></div>
        <h3>Участники</h3><div class="ap-card ap-list"><div class="ap-row tall"><i class="ap-row-i c" style="--c:#FFC62B">${Sonly.mark()}</i><span>Ты<small>${today ? `встал в ${K.fmtMin(today.wake)}` : 'сегодня ещё не вставал'}</small></span>${today ? `<em class="mo-ok">${ic('check', 15, 3.2)}</em>` : ''}</div></div>
        <p class="ap-note">${s._copied || ''}</p>`
      : `<div class="mo-grp-empty">${faces(s, true)}<b>Вставайте вместе</b><p>Утром видно, кто уже встал.</p></div>
        <label class="ap-card mo-name"><small>Название группы</small><input class="js-gname" value="Утренний клуб" maxlength="24" aria-label="Название группы"></label>`;
    const foot = g ? '<button class="ap-btn" data-act="mo-invite">Позвать друзей</button><button class="ap-btn ghost" data-act="mo-leave">Выйти из группы</button>' : '<button class="ap-btn" data-act="mo-create">Создать группу</button>';
    flow.sheet(`${head('Группа подъёма')}<div class="ap-sh-body scroll">${body}</div><div class="ap-sh-foot">${foot}</div>`, 'ap-sheet');
  }

  Sonly.morning = {
    rewards,
    /** Сводка для экрана «Доброе утро». */
    blocks: (s) => briefRows(s, 'wk-brief'),
    preview(flow, what) {
      flow.go('morning', 0);
      if (what === 'album') albumSheet(flow); else if (what === 'gifts') giftsSheet(flow); else if (what === 'group') groupSheet(flow);
      else if (what === 'brief') briefSheet(flow); else if (what.startsWith('item')) itemSheet(flow, what.split('-')[1] || 'word');
    },
    on(flow, act, arg, el) {
      const s = flow.state;
      switch (act) {
        /* Раскрыть строку сводки. Открыта всегда одна — остальные сворачиваются. */
        case 'br-open': {
          const row = el && el.closest('.br-row');
          if (!row) return true;
          const open = !row.classList.contains('open');
          row.parentNode.querySelectorAll('.br-row.open').forEach((x) => { x.classList.remove('open'); x.querySelector('.br-head').setAttribute('aria-expanded', 'false'); });
          row.classList.toggle('open', open);
          el.setAttribute('aria-expanded', open);
          return true;
        }
        case 'mo-item': itemSheet(flow, arg); return true;
        case 'mo-brief': briefSheet(flow); return true;
        case 'mo-flag': {
          const [id, from] = arg.split(':'), b = briefOf(s);
          b[id] = !b[id];
          if (flow.id === 'morning') flow.rerender(true);
          if (from === 'item') itemSheet(flow, id); else briefSheet(flow);
          return true;
        }
        case 'mo-gifts': giftsSheet(flow); return true;
        case 'mo-play': sound.setVolume(s.volume); sound.play(arg); return true;
        case 'mo-album': albumSheet(flow); return true;
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
