/* Партнёрская программа sonly: снимай видео или делай посты о sonly со своим промокодом — получай долю с каждой покупки.
   Все числа считаются из одних правил, чтобы обещание в заголовке всегда совпадало с расчётом:
   доля берётся от того, что остаётся после комиссии магазина. Возвраты и пробные дни не оплачиваются.
   Обычный автор стартует с 10 % и растёт до 25 %; блогерам — до 40 % по заявке, которую смотрят вручную.
   Промокод можно задать свой: латиница и цифры, от 3 до 7 знаков, занятые коды не подходят.
   Данные кабинета в прототипе — пример: они видны в режиме «с историей» или по кнопке «Посмотреть пример». */
(() => {
  'use strict';
  const { ic, esc, PRICE, eur, appKit: K } = Sonly;
  const NB = ' ';
  const STORE = 15;
  /* Уровни: с какого числа оплаченных покупок, доля в процентах, название. */
  const LEVELS = [[0, 10, 'Старт'], [5, 15, 'Рост'], [20, 20, 'Про'], [50, 25, 'Топ']];
  const BLOG = { pct: 40, subs: 50000, views: 1000000 };
  /* Срок выплаты: после скольких выплаченных покупок сколько дней ждать. */
  const HOLD = [[0, 90], [3, 60], [10, 30]];
  const MIN_PAY = 5;
  const CODE = { min: 3, max: 7 };
  /* Коды, которые уже заняты другими авторами или самим sonly. */
  const TAKEN = ['SONLY', 'SUN', 'RANO', 'UTRO', 'MORNING', 'PROMO', 'FREE', 'SALE', 'ADMIN', 'TEST', 'APPLE'];
  const PLAN = { year: ['Год', PRICE.intro], month: ['Месяц', PRICE.month] };
  const PLATS = ['TikTok', 'Instagram', 'YouTube', 'Telegram'];
  const METHOD = { card: 'Карта •• 4821', paypal: 'PayPal' };
  const net = (x) => (x * (100 - STORE)) / 100;
  const share = (x, pct) => (net(x) * pct) / 100;
  /** Доля с одной покупки — в центах, как её покажут в списке; все итоги складываются из этих чисел. */
  const cent = (x) => Math.round(x * 100) / 100;
  const cuts = (l) => cent(l.reduce((a, x) => a + x.cut, 0));
  /** Самое большое, что можно получить с одной покупки: блогер, годовая подписка по коду. */
  const MAX = Math.floor(share(PRICE.intro, BLOG.pct));
  const day = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }).replace(' ', NB);
  const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  const big = (n) => (n >= 1e6 ? `${n / 1e6}${NB}млн` : num(n));
  const buys = (n) => `${n}${NB}${K.pl(n, 'покупка', 'покупки', 'покупок')}`;
  const ui = (s) => s._pt || (s._pt = { tab: 'about', lvl: null, form: { plat: 'TikTok' }, err: '', edit: false, draft: '', codeErr: '', demo: false, method: 'card' });
  const demoOn = (s) => s.data === 'demo' || ui(s).demo;

  /* Пример истории покупок по коду: сколько дней назад, тариф, что с покупкой сейчас. */
  const DEMO = [[-1, 'year', 'trial'], [-2, 'year', 'trial'], [-4, 'year', 'wait'], [-9, 'month', 'wait'], [-15, 'year', 'wait'], [-22, 'year', 'refund'],
    [-37, 'year', 'ok'], [-49, 'year', 'ok'], [-58, 'month', 'ok'], [-96, 'year', 'paid'], [-104, 'year', 'paid'], [-118, 'year', 'paid'], [-131, 'month', 'paid'], [-140, 'year', 'paid']];
  const STATUS = { trial: ['Пробные дни', ''], wait: ['На проверке', ''], ok: ['Подтверждена', 'ok'], paid: ['Выплачено', 'paid'], refund: ['Возврат', 'bad'] };
  /* Выплаты в примере: сколько дней назад, какие покупки в неё вошли (по «дней назад»), статус. */
  const DEMO_PAY = [[-2, [-96, -104], 'way'], [-27, [-118, -131, -140], 'done']];
  const PAY_ST = { way: ['В пути', ''], done: ['Зачислено', 'ok'] };

  /** Всё, что показывает кабинет: покупки, выплаты, уровень, расчёт и срок. */
  function data(s) {
    const today = K.day0(new Date()), demo = demoOn(s);
    const list = (demo ? DEMO : []).map(([d, plan, st]) => ({ ago: d, d: plus(today, d), plan, st, sum: PLAN[plan][1] }));
    const by = (...st) => list.filter((x) => st.includes(x.st)), sum = (l) => l.reduce((a, x) => a + x.sum, 0);
    const counted = by('wait', 'ok', 'paid'), li = LEVELS.reduce((a, l, i) => (counted.length >= l[0] ? i : a), 0), pct = LEVELS[li][1];
    const paid = by('paid'), hold = HOLD.reduce((a, h) => (paid.length >= h[0] ? h[1] : a), 90), open = by('wait', 'ok');
    list.forEach((x) => { x.cut = x.st === 'trial' || x.st === 'refund' ? 0 : cent(share(x.sum, pct)); });
    const pays = (demo ? DEMO_PAY : []).map(([d, ids, st]) => {
      const items = list.filter((x) => ids.includes(x.ago));
      return { d: plus(today, d), items, st, amount: cuts(items) };
    });
    const ready = by('ok'), first = ready.length ? ready[ready.length - 1] : open[open.length - 1];
    return {
      list, open, pays, li, pct, hold, counted: counted.length, trial: by('trial').length, refunds: by('refund').length,
      due: cuts(open), ready: cuts(ready), paidN: paid.length, next: LEVELS[li + 1] || null,
      paidSum: cent(pays.reduce((a, p) => a + p.amount, 0)),
      payDay: first ? plus(first.d, hold) : null, holdNext: HOLD.find((h) => h[0] > paid.length) || null,
    };
  }

  /* ── Части страницы ──────────────────────────────────────── */

  const top = (bigText, sub) => `<header class="pt-top"><i>${Sonly.mark()}</i><b>${bigText}</b><p>${sub}</p></header>`;
  const head = (icon, title) => `<button class="br-head" data-act="br-open" aria-expanded="false"><i>${ic(icon, 18, 2.1)}</i>${title}<em>${ic('chevron-down', 18, 2.4)}</em></button>`;
  const more = (html) => `<div class="br-more"><div><div class="br-in">${html}</div></div></div>`;
  /** Раскрывающиеся строки — те же, что в «После подъёма». */
  const fold = (rows, cls = '') => `<div class="ap-card br pt-fold ${cls}">${rows.map(([icon, q, a]) => `<div class="br-row">${head(icon, `<b>${q}</b>`)}${more(a)}</div>`).join('')}</div>`;
  /** Расчёт выплаты строками: сумма, комиссия магазина, остаток, доля. */
  const calc = (title, gross, pct, live) => `<div class="pt-calc"><div><span>${title}</span><b>${eur(gross)}</b></div><div><span>Комиссия App Store ${STORE}${NB}%</span><b>−${eur(gross - net(gross))}</b></div>
      <div><span>Остаётся</span><b>${eur(net(gross))}</b></div><div class="you"><span>Твои <u${live ? ' class="js-pct"' : ''}>${pct}</u>${NB}%</span><b${live ? ' class="js-cut2"' : ''}>${eur(share(gross, pct))}</b></div></div>`;
  /** Итог строками: что сложили и сколько вышло. */
  const lines = (rows, label, total) => `<div class="pt-calc">${rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}<div class="you"><span>${label}</span><b>${eur(total)}</b></div></div>`;
  const step = (n, t) => `<div class="ap-row"><i class="pt-n">${n}</i><span>${t}</span></div>`;
  const IDEAS = '<ul class="pt-ideas"><li>Как sonly будит по утрам</li><li>Неделя без «ещё пять минут»</li><li>Челлендж: 7 дней с первого звонка</li></ul>';
  const FAQ = [
    ['calendar-clock', 'Когда придут деньги?', '<p>Через 30–90 дней после покупки: столько магазин держит оплату и ждёт возвратов. Новым партнёрам — 90 дней, потом срок сокращается до 30.</p>'],
    ['credit-card', 'Как получить выплату?', `<p>Раз в месяц на карту или PayPal, сами. Минимум — ${MIN_PAY}${NB}€, остаток переходит на следующий месяц.</p>`],
    ['shopping-bag', 'Что считается покупкой?', '<p>Первая оплата подписки по твоему коду. Пробные дни и возвраты не считаются.</p>'],
    ['pencil', 'Можно сменить код?', '<p>Да, в любой момент. Старый код сразу перестанет работать — обнови его в описаниях.</p>'],
    ['ban', 'Что запрещено?', '<p>Спам в комментариях и личке, накрутки, реклама от имени sonly и покупки по своему коду.</p>'],
  ];

  /** Карточка промокода: сам код, смена, копирование и текст для поста. В режиме правки — поле на 3–7 знаков. */
  function codeCard(s) {
    const u = ui(s);
    if (u.edit) {
      const v = u.draft;
      return `<div class="ap-card pt-code edit"><label class="pt-f"><span>Свой промокод</span>
          <span class="pt-in${u.codeErr ? ' err' : ''}"><input class="js-ptcode" value="${esc(v)}" maxlength="${CODE.max}" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Свой промокод"><small class="js-cnt">${v.length}/${CODE.max}</small></span></label>
        <p class="pt-hint js-hint${u.codeErr ? ' bad' : ''}">${u.codeErr || `Латиница и цифры, ${CODE.min}–${CODE.max} знаков`}</p>
        <div class="pt-2b"><button class="ap-btn ghost" data-act="pt-edit:0">Отмена</button><button class="ap-btn" data-act="pt-save">Сохранить</button></div></div>`;
    }
    return `<div class="ap-card pt-code"><div><span><small>Твой промокод</small><b>${K.refOf(s)}</b></span>
        <button class="pt-copy" data-act="pt-edit:1" aria-label="Изменить код">${ic('pencil', 18, 2.1)}</button>
        <button class="pt-copy" data-act="ref-copy" aria-label="Скопировать код">${ic('copy', 19, 2.1)}</button></div>
      <p class="pt-perk"><i>${ic('gift', 15, 2.3)}</i>По коду −25${NB}% и ${PRICE.trial}${NB}дня бесплатно</p>
      <button class="ap-btn" data-act="ref-share">Скопировать текст для поста</button>${s._copied ? `<p class="pt-msg">${s._copied}</p>` : ''}</div>`;
  }

  function about(s) {
    const d = data(s), u = ui(s), sel = u.lvl == null ? d.li : u.lvl, pct = LEVELS[sel][1];
    return `${top(`<small>до</small>${MAX}${NB}€`, 'с каждой покупки по твоему коду')}
      ${codeCard(s)}
      <h3>Как это работает</h3>
      <div class="ap-card ap-list">${step(1, 'Сними видео или пост о sonly')}${step(2, 'Добавь промокод в описание')}${step(3, 'Получай долю с каждой покупки')}</div>
      <h3>Твоя доля</h3>
      <div class="ap-card pt-share"><div class="pt-track js-lv" style="--f:${(d.li / (LEVELS.length - 1)).toFixed(3)}"><i class="pt-line"><u></u></i>
          ${LEVELS.map(([n, p], i) => `<button class="${i === sel ? 'on' : ''}${i <= d.li ? ' got' : ''}" data-act="pt-lvl:${i}" aria-pressed="${i === sel}"><b>${p}${NB}%</b><i></i><small>${n ? buys(n) : 'сразу'}</small></button>`).join('')}</div>
        <div class="pt-get"><span>С годовой подписки</span><b class="js-cut">${eur(share(PRICE.intro, pct))}</b></div>
        <p>${d.next ? `До ${d.next[1]}${NB}% — ещё ${buys(d.next[0] - d.counted)}` : `У тебя максимум — ${d.pct}${NB}%`}</p></div>
      ${fold([['calculator', 'Как считается выплата', `${calc('Подписка на год по коду', PRICE.intro, pct, true)}<p>Возвраты и пробные дни не${NB}оплачиваются.</p>`],
    ['clapperboard', 'Что снять', IDEAS]], 'one')}
      <div class="ap-card ap-list pt-link">${K.row(ic('megaphone', 17, 2.1), 'Для блогеров', s.blogApp ? 'на проверке' : `до ${BLOG.pct}${NB}%`, 'page:blog')}</div>
      <h3>Вопросы</h3>
      ${fold(FAQ)}`;
  }

  /** Выплаты: каждая раскрывается в расчёт; ниже — куда платить. */
  function payouts(d, u) {
    const rows = d.pays.map((p) => `<div class="br-row">${head('banknote', `<span class="pt-ph"><b>${eur(p.amount)}</b><small>${day(p.d)}</small></span><small class="pt-st ${PAY_ST[p.st][1]}">${PAY_ST[p.st][0]}</small>`)}
        ${more(`${lines(p.items.map((x) => [`${PLAN[x.plan][0]} · ${day(x.d)}`, '+' + eur(x.cut)]), 'Итого', p.amount)}<p>${p.st === 'way' ? `Придёт до ${day(plus(p.d, 3))}.` : 'Пришло на карту.'}</p>`)}</div>`).join('');
    const method = `<div class="br-row">${head('wallet', `<b>Куда: <span class="js-method">${METHOD[u.method]}</span></b>`)}
        ${more(`<div class="ap-seg sm">${Object.keys(METHOD).map((k) => `<button class="${u.method === k ? 'on' : ''}" data-act="pt-method:${k}" aria-pressed="${u.method === k}">${k === 'card' ? 'Карта' : 'PayPal'}</button>`).join('')}</div>
        <p>Раз в месяц, сами. Минимум — ${MIN_PAY}${NB}€.</p>`)}</div>`;
    return `<div class="ap-card br pt-fold pt-pays">${rows}${method}</div>`;
  }

  function cabinet(s) {
    const d = data(s), u = ui(s), lvl = LEVELS[d.li], prog = d.next ? Math.min(1, (d.counted - lvl[0]) / (d.next[0] - lvl[0])) : 1;
    const level = `<div class="ap-card pt-level"><div><span>Уровень</span><b>${lvl[2]} · ${d.pct}${NB}%</b></div><i class="pt-bar"><u style="width:${Math.max(3, prog * 100).toFixed(0)}%"></u></i>
      <small>${d.next ? `До ${d.next[1]}${NB}% — ещё ${buys(d.next[0] - d.counted)}` : 'Максимальный уровень'}</small></div>`;
    if (!d.list.length) {
      return `<div class="ap-card pt-empty"><i>${ic('shopping-bag', 26, 2)}</i><b>Покупок пока нет</b><p>Они появятся после первого видео с${NB}кодом.</p>
        <button class="ap-btn" data-act="pt-demo:1">Посмотреть пример</button></div>${level}`;
    }
    const flag = u.demo && s.data !== 'demo' ? `<div class="pt-demo"><span>${ic('eye', 17, 2.2)}Пример кабинета</span><button data-act="pt-demo:0">Скрыть</button></div>` : '';
    return `${flag}<div class="ap-card pt-sum"><small>Ожидаемая выплата</small><b>${eur(d.due)}</b><p>${d.payDay ? `Ближайшая — ${eur(d.ready)}, ${day(d.payDay)}` : 'Дата появится после первой покупки'}</p>
        <div class="pt-3"><span><b>${d.counted}</b><small>${K.pl(d.counted, 'покупка', 'покупки', 'покупок')}</small></span><span><b>${d.trial}</b><small>пробуют</small></span><span><b>${d.refunds}</b><small>${K.pl(d.refunds, 'возврат', 'возврата', 'возвратов')}</small></span></div></div>
      ${level}
      ${fold([['calculator', 'Как посчитано', `${lines(Object.keys(PLAN).map((k) => { const l = d.open.filter((x) => x.plan === k); return l.length ? [`${l.length} × ${k === 'year' ? 'год' : 'месяц'} по ${eur(l[0].cut)}`, eur(cuts(l))] : null; }).filter(Boolean), 'Ожидается', d.due)}<p>С каждой покупки: цена минус ${STORE}${NB}% App Store, от остатка — твои ${d.pct}${NB}%. Возвраты и пробные дни не${NB}входят.</p>`],
    ['calendar-clock', `Срок выплаты — ${d.hold}${NB}дней`, `<p>${d.holdNext ? `Станет ${d.holdNext[1]}${NB}дней после ${d.holdNext[0]} выплаченных покупок. Сейчас их${NB}${d.paidN}.` : 'Ты проверенный партнёр — срок минимальный.'}</p>`]])}
      <h3 class="pt-h">Выплаты<span>${eur(d.paidSum)}</span></h3>
      ${payouts(d, u)}
      <h3>Покупки</h3>
      <div class="ap-card pt-list">${d.list.map((x) => `<div class="pt-row"><span><b>${PLAN[x.plan][0]}</b><small>${day(x.d)}</small></span><span class="r"><b>${x.cut ? '+' + eur(x.cut) : '—'}</b><small class="${STATUS[x.st][1]}">${STATUS[x.st][0]}</small></span></div>`).join('')}</div>
      ${s.data === 'demo' ? '<p class="ap-note">В прототипе это пример данных.</p>' : ''}`;
  }

  /** Страница для блогеров: условия и заявка. */
  function blog(s) {
    const u = ui(s), f = u.form, a = s.blogApp;
    if (a) {
      return ['Для блогеров', `<div class="ap-sent"><i>${ic('check', 26, 3)}</i><b>Заявка отправлена</b><p>Ответим на <b data-v>${esc(a.mail)}</b> в${NB}течение 5${NB}дней.</p></div>`,
        '<button class="ap-btn" data-act="page:share">Готово</button>', 'page:share'];
    }
    const field = (key, label, ph, type = 'text', mode = 'text') => `<label class="pt-f"><span>${label}</span><input class="js-pf" data-k="${key}" type="${type}" inputmode="${mode}" value="${esc(f[key] || '')}" placeholder="${ph}" autocomplete="off" spellcheck="false"></label>`;
    const cond = (t) => `<div class="ap-row"><i class="ap-ck ok">${ic('check', 15, 3.2)}</i><span>${t}</span></div>`;
    return ['Для блогеров', `${top(`<small>до</small>${BLOG.pct}${NB}%`, 'с каждой покупки по твоему коду')}
      <h3>Условия</h3>
      <div class="ap-card ap-list">${cond(`От ${num(BLOG.subs)} подписчиков`)}${cond(`От ${big(BLOG.views)} просмотров в месяц`)}${cond('Живая аудитория, без накруток')}</div>
      <p class="ap-note">Заявки смотрим вручную, ответ — до 5${NB}дней.</p>
      <h3>Заявка</h3>
      <div class="pt-form">${field('link', 'Ссылка на канал', 'tiktok.com/@…', 'url', 'url')}
        <div class="pt-f"><span>Площадка</span><div class="ap-seg sm">${PLATS.map((p) => `<button class="${f.plat === p ? 'on' : ''}" data-act="pt-plat:${p}" aria-pressed="${f.plat === p}">${p}</button>`).join('')}</div></div>
        <div class="pt-f2">${field('subs', 'Подписчиков', num(BLOG.subs), 'text', 'numeric')}${field('views', 'Просмотров в месяц', num(BLOG.views), 'text', 'numeric')}</div>
        ${field('mail', 'Почта для ответа', 'you@mail.com', 'email', 'email')}</div>
      ${u.err ? `<p class="pt-err">${u.err}</p>` : ''}`, '<button class="ap-btn" data-act="pt-send">Отправить заявку</button>', 'page:share'];
  }

  /** Содержимое страницы для общего механизма страниц приложения: заголовок, тело, низ, куда ведёт «назад». */
  function page(s, id) {
    if (id === 'blog') return blog(s);
    const u = ui(s);
    return ['Партнёрам', `<div class="ap-seg pt-tabs"><button class="${u.tab === 'about' ? 'on' : ''}" data-act="pt-tab:about">Программа</button><button class="${u.tab === 'cab' ? 'on' : ''}" data-act="pt-tab:cab">Кабинет</button></div>
      <div class="pt">${u.tab === 'cab' ? cabinet(s) : about(s)}</div>`, ''];
  }
  const collect = (flow) => { const f = ui(flow.state).form; flow.sheets.querySelectorAll('.js-pf').forEach((x) => { f[x.dataset.k] = x.value.trim(); }); return f; };
  const digits = (v) => +String(v || '').replace(/\D/g, '');
  const clean = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const hint = () => `Латиница и цифры, ${CODE.min}–${CODE.max} знаков`;

  Sonly.partner = {
    MAX, page, data,
    /** Карточка-приглашение для главной и настроек. */
    title: 'Продвигай sonly', sub: `До ${MAX}${NB}€ с каждой покупки`,
    /** После открытия страницы: поле своего кода принимает только латиницу и цифры и считает знаки. */
    mount(flow) {
      const inp = flow.sheets.querySelector('.js-ptcode');
      if (!inp) return;
      const u = ui(flow.state), cnt = flow.sheets.querySelector('.js-cnt'), msg = flow.sheets.querySelector('.js-hint');
      inp.addEventListener('input', () => {
        const raw = inp.value.toUpperCase(), v = clean(raw).slice(0, CODE.max);
        if (v !== inp.value) inp.value = v;
        u.draft = v; u.codeErr = '';
        cnt.textContent = `${v.length}/${CODE.max}`;
        const bad = raw !== v && raw.length <= CODE.max;
        msg.textContent = bad ? 'Только латиница и цифры' : hint();
        msg.classList.toggle('bad', bad);
        inp.parentNode.classList.toggle('err', bad);
      });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') flow.sheets.querySelector('[data-act="pt-save"]').click(); });
      if (!inp.closest('.instant')) setTimeout(() => { if (inp.isConnected) { inp.focus({ preventScroll: true }); inp.setSelectionRange(inp.value.length, inp.value.length); } }, 380);
    },
    on(flow, act, arg, el) {
      const s = flow.state, u = ui(s);
      switch (act) {
        /* Раскрыть строку (вопрос, выплата, «Куда»): открыта одна — остальные в этой карточке сворачиваются. */
        case 'br-open': {
          const row = el && el.closest('.br-row');
          if (!row) return true;
          const open = !row.classList.contains('open');
          row.parentNode.querySelectorAll('.br-row.open').forEach((x) => { x.classList.remove('open'); x.querySelector('.br-head').setAttribute('aria-expanded', 'false'); });
          row.classList.toggle('open', open);
          el.setAttribute('aria-expanded', String(open));
          return true;
        }
        case 'pt-tab': u.tab = arg; s._copied = ''; s._page = null; K.openPage(flow, 'share'); return true;
        /* Уровень на шкале: суммы меняются на месте. */
        case 'pt-lvl': {
          const i = +arg, pct = LEVELS[i][1], root = flow.sheets;
          u.lvl = i;
          root.querySelectorAll('.js-lv button').forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-pressed', k === i); });
          const set = (q, v) => { const n = root.querySelector(q); if (n) { n.textContent = v; n.classList.remove('tick'); void n.offsetWidth; n.classList.add('tick'); } };
          set('.js-cut', eur(share(PRICE.intro, pct)));
          set('.js-cut2', eur(share(PRICE.intro, pct)));
          set('.js-pct', pct);
          return true;
        }
        case 'pt-edit':
          u.edit = arg === '1'; u.draft = u.edit ? clean(K.refOf(s)).slice(0, CODE.max) : ''; u.codeErr = ''; s._copied = '';
          K.openPage(flow, 'share');
          return true;
        case 'pt-save': {
          const inp = flow.sheets.querySelector('.js-ptcode'), v = clean(inp ? inp.value : u.draft).slice(0, CODE.max);
          u.draft = v;
          u.codeErr = v.length < CODE.min ? `Нужно от ${CODE.min} знаков` : v !== s.ref && TAKEN.includes(v) ? `Код «${v}» уже занят — попробуй другой` : '';
          if (!u.codeErr) { s._copied = v === s.ref ? '' : 'Код сохранён — старый больше не работает'; s.ref = v; u.edit = false; }
          K.openPage(flow, 'share');
          return true;
        }
        /* Пример кабинета: показывает покупки и выплаты без режима «с историей». */
        case 'pt-demo': u.demo = arg === '1'; u.lvl = null; K.openPage(flow, 'share'); return true;
        case 'pt-method': {
          u.method = arg;
          flow.sheets.querySelectorAll('[data-act^="pt-method:"]').forEach((b) => { const on = b.dataset.act === `pt-method:${arg}`; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
          const m = flow.sheets.querySelector('.js-method');
          if (m) m.textContent = METHOD[arg];
          return true;
        }
        case 'pt-plat': collect(flow).plat = arg; u.err = ''; K.openPage(flow, 'blog'); return true;
        case 'pt-send': {
          const f = collect(flow), subs = digits(f.subs), views = digits(f.views);
          u.err = !f.link ? 'Добавь ссылку на канал.' : !/.+@.+\..+/.test(f.mail || '') ? 'Укажи почту — на неё придёт ответ.'
            : subs < BLOG.subs || views < BLOG.views ? `Пока рано: нужно от ${num(BLOG.subs)} подписчиков и ${big(BLOG.views)} просмотров в месяц. Начни с обычной программы — ${LEVELS[0][1]}${NB}% сразу.` : '';
          if (!u.err) s.blogApp = { link: f.link, plat: f.plat, subs, views, mail: f.mail };
          K.openPage(flow, 'blog');
          return true;
        }
        default: return false;
      }
    },
  };
})();
