/*
 * Профиль и «Вставай вместе».
 * Профиль: обложка (градиент или пейзаж открыток — пейзажи открывает серия), аватар (буква, мозг или своё фото),
 * рамка за серию (огонь — 7 утр подряд, золото — 30), имя и строка «о себе», код для друзей, цифры, значки, открытки.
 * «Вставай вместе»: утро друзей — кто встал, кто спит, кто проспал (его можно разбудить), поздравить вставших,
 * рейтинг недели, карточка друга, свой код и добавление друга по коду.
 * Своего сервера у прототипа нет. В демо-режиме друзья — пример. В своём режиме друзей пока нет: добавленный по коду
 * друг висит как «запрос отправлен», а пример утра друзей так и подписан — «Пример».
 */
(() => {
  'use strict';
  const { ic, esc, appKit: K } = Sonly;
  const si = (id, size) => Sonly.si(id, size);
  /* Цвета аватаров — системные цвета iOS парами для градиента. */
  const AV = [['#FF9F0A', '#FF6B00'], ['#30D158', '#1FA347'], ['#64D2FF', '#0A84FF'], ['#BF5AF2', '#8944D8'], ['#FF6482', '#E5305A'], ['#FFD60A', '#F5A300'], ['#7D7AFF', '#4B48D6']];
  /* Обложки-градиенты: есть сразу. Пейзажи открыток — когда серия их открыла. */
  const GRAD = [['dawn', 'Рассвет', '#FFB36B', '#FF6F91', '#8C5BD8'], ['sky', 'Небо', '#9ED8FF', '#4A90F0', '#2E5BD8'], ['sun', 'Солнце', '#FFE680', '#FFB020', '#FF7A1F'],
    ['mint', 'Мята', '#A6F2CF', '#3CC8A5', '#1E7F8C'], ['berry', 'Ягоды', '#FF9EBB', '#C455E0', '#6B3FD8'], ['night', 'Ночь', '#3A4C9A', '#3B2A6E', '#101026']];
  /* Рамки аватара — награда за лучшую серию. */
  const FRAMES = [['none', 'Без рамки', 0], ['fire', 'Огонь', 7], ['gold', 'Золото', 30]];
  /* Друзья для демо: будильник (минуты суток), через сколько минут встаёт (null — сегодня проспит), серия, пропуски недели. */
  const DEMO = [
    { id: 'katya', n: 'Катя', g: 'f', c: 3, al: 390, up: 4, streak: 41, miss: [], ban: 'l:aurora', ava: 'brain', frame: 'gold', bio: 'Бегаю до работы' },
    { id: 'anya', n: 'Аня', g: 'f', c: 4, al: 400, up: 8, streak: 23, miss: [], ban: 'g:berry', frame: 'fire', bio: 'Йога в семь утра' },
    { id: 'max', n: 'Макс', g: 'm', c: 2, al: 420, up: 2, streak: 9, miss: [], ban: 'l:mountains', frame: 'fire', bio: '' },
    { id: 'lena', n: 'Лена', g: 'f', c: 5, al: 450, up: null, streak: 12, miss: [], ban: 'g:dawn', frame: 'fire', bio: 'Учусь вставать раньше' },
    { id: 'dima', n: 'Дима', g: 'm', c: 1, al: 495, up: 6, streak: 2, miss: [1], ban: 'g:sky', bio: '' },
  ];
  const EXAMPLE = [{ n: 'Аня', g: 'f', c: 4, k: 'up', t: '06:48' }, { n: 'Макс', g: 'm', c: 2, k: 'up', t: '07:02' }, { n: 'Лена', g: 'f', c: 5, k: 'late', t: '07:30' }, { n: 'Дима', g: 'm', c: 1, k: 'sleep', t: '08:15' }];
  const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const v = (f, m, w) => (f.g === 'f' ? w : m);
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const dow = () => (new Date().getDay() + 6) % 7;
  let uid = 0;

  function me(s) {
    if (!s.me) s.me = { name: '', c: 2, code: 'SN-' + K.code4(), since: Date.now() };
    const m = s.me;
    if (!m.ava) m.ava = 'letter';
    if (!m.ban) m.ban = 'g:dawn';
    if (!m.frame) m.frame = 'none';
    if (m.bio == null) m.bio = '';
    return m;
  }
  function friends(s) {
    if (!s.friends) s.friends = s.data === 'demo' ? DEMO.map((f) => ({ ...f, miss: f.miss.slice() })) : [];
    return s.friends;
  }
  /** Статус друга сейчас: встал (во сколько), спит (будильник ещё впереди), проспал, запрос ждёт ответа. */
  function statusOf(f, nm = nowMin()) {
    if (f.pending) return { k: 'pend' };
    if (f.up != null && nm >= f.al + f.up) return { k: 'up', t: f.al + f.up };
    return nm < f.al ? { k: 'sleep' } : { k: 'late' };
  }
  /** Моё утро сегодня: встал (из истории) или нет. */
  function myStatus(s) {
    const h = K.stats(s).h, x = h.find((y) => y.d.getTime() === K.day0(new Date()).getTime());
    return x ? { k: 'up', t: x.wake } : { k: 'sleep' };
  }

  /* ── Аватар и обложка ─────────────────────────────────────── */
  const initial = (name) => (name.trim()[0] || '').toUpperCase();
  /** Аватар: буква имени, мозг или фото на градиенте; у себя без имени — солнце sonly. Рамка — кольцо снаружи. */
  function avatar(p, size, dot = '', cls = '') {
    const [a, b] = AV[(p.c || 0) % AV.length], ch = initial(p.n || '');
    let inner, kind = '';
    if (p.ava === 'photo' && p.photo) { inner = `<img src="${p.photo}" alt="" draggable="false">`; kind = ' photo'; }
    else if (p.ava === 'brain' && Sonly.brain) { inner = `<span class="pp-brain">${Sonly.brain('pb' + (uid++))}</span>`; kind = ' brain'; }
    else if (ch) inner = esc(ch);
    else { inner = Sonly.mark(); kind = ' sun'; }
    const face = `<i class="pp-av${kind}${cls ? ' ' + cls : ''}" style="--a:${a};--b:${b};--s:${size}px">${inner}${dot}</i>`;
    return p.frame && p.frame !== 'none' ? `<span class="pp-fr ${p.frame}" style="--s:${size}px">${face}</span>` : face;
  }
  const meP = (s) => { const m = me(s); return { n: m.name, c: m.c, ava: m.ava, photo: m.photo, frame: m.frame }; };
  /** Обложка: градиент с мягким светом или пейзаж открыток. */
  function banner(id) {
    if (id && id.startsWith('l:') && Sonly.morning && Sonly.morning.banner) return Sonly.morning.banner(id.slice(2));
    const g = GRAD.find((x) => x[0] === (id || '').slice(2)) || GRAD[0];
    return `<span class="pp-ban-g" style="--g1:${g[2]};--g2:${g[3]};--g3:${g[4]}"><i></i></span>`;
  }
  const dotOf = (k) => (k === 'up' ? `<b class="pp-dot up">${ic('check', 10, 4)}</b>` : k === 'late' ? `<b class="pp-dot late">${ic('bell', 9, 3)}</b>` : k === 'sleep' ? `<b class="pp-dot sleep">${si('moon', 10)}</b>` : '');
  const tile = (cls, icon, val, label) => `<div class="pp-st ${cls}"><i class="pp-ic">${icon}</i><b>${val}</b><small>${label}</small></div>`;

  /* Неделя: сколько утр с понедельника по сегодня встал и во сколько в среднем. */
  function myWeek(s) {
    const h = K.stats(s).h, mon = new Date(); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - dow());
    const wk = h.filter((x) => x.d >= mon);
    return { w: wk.length, avg: wk.length ? Math.round(wk.reduce((a, x) => a + x.wake, 0) / wk.length) : null };
  }
  function friendWeek(f) {
    const st = statusOf(f), days = DAYS.map((_, i) => (i < dow() ? !f.miss.includes(i) : i === dow() ? st.k === 'up' : false));
    return { w: days.filter(Boolean).length, avg: f.al + (f.up == null ? 3 : f.up), days };
  }

  /* ── Карточка на вкладке «Утро» ──────────────────────────── */
  function card(s) {
    const fr = friends(s).filter((f) => !f.pending), up = fr.filter((f) => statusOf(f).k === 'up').length + (myStatus(s).k === 'up' ? 1 : 0);
    const stack = fr.length ? fr.slice(0, 3).map((f) => avatar({ ...f, frame: '' }, 42)).join('') : `${avatar({ ...meP(s), frame: '' }, 42)}<i class="pp-av ghost" style="--s:42px">${ic('user-plus', 18, 2.4)}</i>`;
    return `<button class="ap-card mo-group pp-entry" data-act="pp-together" data-in style="--i:3"><span class="pp-stack">${stack}</span><span><b>Вставай вместе</b><small>${fr.length ? `Уже встали ${up} из ${fr.length + 1}` : 'Утром видно, кто уже встал'}</small></span>${K.chev()}</button>`;
  }

  /* ── Вставай вместе ─────────────────────────────────────── */
  const head = (title, back, right = '<span class="ap-x ghost"></span>') => `<div class="ap-sh-head"><button class="ap-x lg" data-act="${back || 'sheet-close'}" aria-label="${back ? 'Назад' : 'Закрыть'}">${ic(back ? 'chevron-left' : 'x', back ? 22 : 20, 2.3)}</button><b>${title}</b>${right}</div>`;
  function note(f, st) {
    if (st.k === 'up') return `${v(f, 'встал', 'встала')} в ${K.fmtMin(st.t)}`;
    if (st.k === 'sleep') return `спит · будильник в ${K.fmtMin(f.al)}`;
    if (st.k === 'late') return `${v(f, 'не встал', 'не встала')} в ${K.fmtMin(f.al)}`;
    return 'запрос отправлен';
  }
  function action(f, st) {
    if (st.k === 'up') return `<button class="pp-cheer${f.cheer ? ' on' : ''}" data-act="pp-cheer:${f.id}" aria-label="${f.cheer ? 'Поздравили' : `Поздравить: ${esc(f.n)}`}" aria-pressed="${!!f.cheer}">${ic('party-popper', 18, 2.2)}</button>`;
    if (st.k === 'late') return f.nudge ? `<span class="pp-sent">${ic('check', 14, 3)}Будим</span>` : `<button class="pp-wake" data-act="pp-wake:${f.id}">${ic('bell-ring', 15, 2.4)}Разбудить</button>`;
    if (st.k === 'pend') return `<button class="pp-undo" data-act="pp-cancel:${f.id}">Отменить</button>`;
    return '';
  }
  function row(f) {
    const st = statusOf(f), fire = f.streak && !f.pending ? `<em class="pp-fire">${si('flame', 12)}${f.streak}</em>` : '';
    const who = `${avatar({ ...f, frame: '' }, 46, dotOf(st.k))}<span class="pp-tx"><b>${esc(f.n)}${fire}</b><small>${note(f, st)}</small></span>`;
    return `<div class="pp-row ${st.k}">${f.pending ? `<span class="pp-who">${who}</span>` : `<button class="pp-who" data-act="pp-friend:${f.id}" aria-label="Профиль: ${esc(f.n)}">${who}</button>`}${action(f, st)}</div>`;
  }
  function meRow(s) {
    const st = myStatus(s), streak = K.stats(s).streak;
    return `<div class="pp-row me ${st.k}"><button class="pp-who" data-act="pp-profile:push" aria-label="Мой профиль">${avatar({ ...meP(s), frame: '' }, 46, dotOf(st.k))}<span class="pp-tx"><b>Ты${streak ? `<em class="pp-fire">${si('flame', 12)}${streak}</em>` : ''}</b><small>${st.k === 'up' ? `подъём в ${K.fmtMin(st.t)}` : 'ещё не встал'}</small></span></button></div>`;
  }
  function together(flow, enter = '') {
    const s = flow.state, m = me(s), fr = friends(s), live = fr.filter((f) => !f.pending), pend = fr.filter((f) => f.pending);
    const my = myStatus(s), up = live.filter((f) => statusOf(f).k === 'up').length + (my.k === 'up' ? 1 : 0), total = live.length + 1;
    const late = live.filter((f) => statusOf(f).k === 'late'), wake = late.filter((f) => !f.nudge);
    let body;
    if (!live.length) {
      body = `<div class="pp-empty"><span class="pp-trio">${avatar({ n: 'А', c: 4 }, 56)}${avatar({ ...meP(s), frame: '' }, 72)}${avatar({ n: 'М', c: 2 }, 56)}</span><b>Вставайте вместе</b><p>Утром видно, кто уже встал, а кто проспал — его можно разбудить</p></div>
        <div class="ap-card pp-list ex"><div class="pp-list-h"><b>Утро друзей</b><span class="pp-tag">Пример</span></div>
          ${EXAMPLE.map((x) => `<div class="pp-row ${x.k}"><span class="pp-who">${avatar(x, 46, dotOf(x.k))}<span class="pp-tx"><b>${x.n}</b><small>${x.k === 'up' ? `${v(x, 'встал', 'встала')} в ${x.t}` : x.k === 'late' ? `${v(x, 'не встал', 'не встала')} в ${x.t}` : `спит · будильник в ${x.t}`}</small></span></span>${x.k === 'up' ? `<span class="pp-cheer">${ic('party-popper', 18, 2.2)}</span>` : x.k === 'late' ? `<span class="pp-wake">${ic('bell-ring', 15, 2.4)}Разбудить</span>` : ''}</div>`).join('')}</div>
        ${pend.length ? `<div class="ap-card pp-list">${pend.map(row).join('')}</div>` : ''}`;
    } else {
      const rank = { up: 0, late: 1, sleep: 2 };
      const order = live.slice().sort((a, b) => { const x = statusOf(a), y = statusOf(b); return rank[x.k] - rank[y.k] || (x.t || a.al) - (y.t || b.al); });
      const rows = order.map(row);
      /* Себя — на своё место по времени подъёма, а если ещё не встал — перед спящими. */
      const at = my.k === 'up' ? order.findIndex((f) => statusOf(f).k !== 'up' || statusOf(f).t > my.t) : order.findIndex((f) => statusOf(f).k === 'sleep');
      rows.splice(at < 0 ? rows.length : at, 0, meRow(s));
      /* Сверху — все утром в один ряд: зелёное кольцо — встал, красное — проспал, бледный — ещё спит. */
      const strip = [{ ...meP(s), k: my.k }].concat(order.map((f) => ({ ...f, k: statusOf(f).k })));
      const lb = live.map((f) => ({ ...f, ...friendWeek(f) })).concat({ ...meP(s), name: me(s).name, n: 'Ты', me: true, ...myWeek(s) }).sort((a, b) => b.w - a.w || (a.avg ?? 1e4) - (b.avg ?? 1e4));
      body = `<div class="ap-card pp-sum"><b>${up === total ? 'Сегодня встали все' : `Уже встали ${up} из ${total}`}</b>
          <small>${wake.length ? `${wake.map((f) => f.n).join(', ')} ${wake.length > 1 ? 'не встали' : v(wake[0], 'не встал', 'не встала')} — можно разбудить` : late.length ? `${late.map((f) => f.n).join(', ')} — уже будим` : up === total ? 'Хорошее утро у всех' : 'Остальные ещё спят — их будильник впереди'}</small>
          <div class="pp-strip">${strip.slice(0, strip.length > 6 ? 5 : 6).map((x) => `<span class="pp-sv ${x.k}">${avatar({ ...x, frame: '' }, 36)}</span>`).join('')}${strip.length > 6 ? `<span class="pp-sv more">+${strip.length - 5}</span>` : ''}</div>
          <div class="pp-bar"><i style="--p:${(up / total).toFixed(3)}"></i></div></div>
        <h3 class="pp-h">Сегодня</h3><div class="ap-card pp-list">${rows.join('')}${pend.map(row).join('')}</div>
        <h3 class="pp-h">Неделя<span>утра с понедельника</span></h3>
        <div class="ap-card pp-lb">${lb.map((x, i) => `<div class="pp-lb-r${x.me ? ' me' : ''}"><b class="pp-rank r${i}">${i + 1}</b>${avatar({ ...x, n: x.me ? x.name : x.n, frame: '' }, 32)}<span>${esc(x.n)}</span><small>${x.avg != null ? `обычно ${K.fmtMin(x.avg)}` : ''}</small><em>${x.w}<u>/${dow() + 1}</u></em></div>`).join('')}</div>`;
    }
    body += `<div class="ap-card pp-code"><span><small>Твой код</small><b>${m.code}</b></span><button class="pp-copy" data-act="pp-copy">${ic('copy', 16, 2.3)}Копировать</button></div>
      <div class="ap-card pp-join"><input class="js-ppcode" placeholder="Код друга" maxlength="9" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Код друга"><button class="pp-add" data-act="pp-add">Добавить</button></div>
      <p class="ap-note pp-msg">${s._ppMsg || ''}</p>`;
    flow.sheet(`${head('Вставай вместе', s._ppFromProfile ? 'pp-profile:back' : '')}<div class="ap-sh-body scroll">${body}</div><div class="ap-sh-foot"><button class="ap-btn" data-act="pp-invite">${ic('user-plus', 19, 2.4)}Позвать друга</button></div>`, `ap-sheet pp-sheet${enter ? ' ' + enter : ''}`);
  }

  /* ── Карточка друга ─────────────────────────────────────── */
  function friendSheet(flow, id, enter = 'push') {
    const s = flow.state, f = friends(s).find((x) => x.id === id);
    if (!f) { together(flow, 'back'); return; }
    const st = statusOf(f), wk = friendWeek(f);
    const status = st.k === 'up' ? `<span class="pp-pill up">${ic('check', 13, 3.2)}${v(f, 'Встал', 'Встала')} в ${K.fmtMin(st.t)}</span>` : st.k === 'late' ? `<span class="pp-pill late">${ic('bell', 13, 2.6)}${v(f, 'Не встал', 'Не встала')} в ${K.fmtMin(f.al)}</span>` : `<span class="pp-pill sleep">${si('moon', 13)}Спит до ${K.fmtMin(f.al)}</span>`;
    const act = st.k === 'up' ? `<button class="ap-btn${f.cheer ? ' ghost' : ''}" data-act="pp-cheer:${f.id}">${ic('party-popper', 19, 2.3)}${f.cheer ? 'Поздравили' : 'Поздравить'}</button>`
      : st.k === 'late' ? (f.nudge ? `<button class="ap-btn ghost" disabled>${ic('check', 19, 2.6)}Будим</button>` : `<button class="ap-btn pp-btn-wake" data-act="pp-wake:${f.id}">${ic('bell-ring', 19, 2.3)}Разбудить</button>`) : '';
    flow.sheet(`${head(esc(f.n), 'pp-together:back')}<div class="ap-sh-body scroll" data-friend="${f.id}">
      <div class="pp-cover">${banner(f.ban)}</div>
      <div class="pp-id">${avatar(f, 96, '', 'big')}<div class="pp-id-t"><b>${esc(f.n)}</b>${f.bio ? `<p>${esc(f.bio)}</p>` : ''}${status}</div></div>
      <div class="pp-stats three">${tile('fire', si('flame', 18), f.streak, `${K.pl(f.streak, 'день', 'дня', 'дней')} подряд`)}${tile('blue', ic('alarm-clock', 17, 2.4), K.fmtMin(f.al), 'будильник')}${tile('sun', si('rise', 18), `${wk.w}/${dow() + 1}`, 'на неделе')}</div>
      <div class="ap-card pp-wk">${DAYS.map((d, i) => `<span class="${wk.days[i] ? 'on' : i > dow() ? 'next' : 'miss'}${i === dow() ? ' now' : ''}"><small>${d}</small><i>${wk.days[i] ? ic('check', 13, 3.4) : ''}</i></span>`).join('')}</div>
      <p class="ap-note pp-msg">${s._ppMsg || ''}</p></div>
      ${act ? `<div class="ap-sh-foot">${act}</div>` : ''}`, `ap-sheet pp-sheet${enter ? ' ' + enter : ''}`);
  }

  /* ── Профиль ────────────────────────────────────────────── */
  /** Четыре цифры без повторов: пока серия не рвалась, рекорд и «утр всего» равны ей — вместо них другие факты. */
  function facts(s) {
    const st = K.stats(s), h = st.h, wakes = h.map((x) => x.wake).sort((a, b) => a - b), secs = h.filter((x) => x.secs).map((x) => x.secs);
    const bd = K.badges ? K.badges(s) : [], got = bd.filter((b) => b.on).length;
    const streak = tile('fire', si('flame', 18), st.streak, `${K.pl(st.streak, 'день', 'дня', 'дней')} подряд`), badges = tile('gold', ic('award', 17, 2.4), `${got}/${bd.length}`, 'значков');
    if (!h.length) return [streak, tile('sun', si('rise', 18), 0, 'утр всего'), badges, tile('blue', ic('alarm-clock', 17, 2.4), '—', 'обычно встаёшь')].join('');
    const out = [streak];
    if (st.best > st.streak) out.push(tile('gold', ic('trophy', 17, 2.4), st.best, 'рекорд серии'));
    if (h.length > st.best) out.push(tile('sun', si('rise', 18), h.length, `${K.pl(h.length, 'утро', 'утра', 'утр')} всего`));
    out.push(tile('sun', si('rise', 18), K.fmtMin(wakes[0]), 'самый ранний'));
    if (secs.length) out.push(tile('violet', ic('zap', 17, 2.4), `${Math.min(...secs)} с`, 'быстрее всего'));
    out.push(badges);
    return out.slice(0, 4).join('');
  }
  function profile(flow, enter = '') {
    const s = flow.state, m = me(s), h = K.stats(s).h;
    const fr = friends(s).filter((f) => !f.pending), my = myStatus(s), up = fr.filter((f) => statusOf(f).k === 'up').length + (my.k === 'up' ? 1 : 0);
    const bd = K.badges ? K.badges(s) : [], got = bd.filter((b) => b.on).length;
    const sd = new Date(m.since), since = `${MONTHS[sd.getMonth()]} ${sd.getFullYear()}`;
    flow.sheet(`${head('Профиль', '', '<button class="pp-ed" data-act="pp-edit">Изменить</button>')}
      <div class="ap-sh-body scroll">
        <button class="pp-cover" data-act="pp-edit" aria-label="Изменить оформление">${banner(m.ban)}</button>
        <div class="pp-id">${avatar(meP(s), 96, '', 'big')}<div class="pp-id-t">${m.name ? `<b>${esc(m.name)}</b>` : '<button class="pp-noname" data-act="pp-edit">Добавить имя</button>'}${m.bio ? `<p>${esc(m.bio)}</p>` : ''}<small>${m.code} · с ${since}</small></div></div>
        <div class="pp-stats">${facts(s)}</div>
        <button class="ap-card mo-group pp-entry" data-act="pp-together:push"><span class="pp-stack">${fr.length ? fr.slice(0, 3).map((f) => avatar({ ...f, frame: '' }, 40)).join('') : `<i class="pp-av ghost" style="--s:40px">${ic('user-plus', 18, 2.4)}</i>`}</span><span><b>Вставай вместе</b><small>${fr.length ? `${fr.length} ${K.pl(fr.length, 'друг', 'друга', 'друзей')} · встали ${up} из ${fr.length + 1}` : 'Позови друзей'}</small></span>${K.chev()}</button>
        ${bd.length ? `<h3 class="pp-h">Значки<span>${got} из ${bd.length}</span></h3><div class="pp-badges">${bd.map((b) => `<button class="pp-bd${b.on ? ' on' : ''}" data-act="pp-badges" aria-label="${b.name}${b.on ? '' : ' — ещё не получен'}">${K.hex ? K.hex(b) : ''}<small>${b.name}</small></button>`).join('')}</div>` : ''}
        <button class="ap-card pp-album" data-act="mo-album"><i class="pp-ic" style="--a:#BF5AF2;--b:#8944D8">${si('cards', 18)}</i><span><b>Открытки утра</b><small>${h.length ? `${h.length} ${K.pl(h.length, 'открытка', 'открытки', 'открыток')}` : 'Первая — завтра утром'}</small></span>${K.chev()}</button>
      </div>`, `ap-sheet pp-sheet${enter ? ' ' + enter : ''}`);
  }

  /* ── Оформление профиля ─────────────────────────────────── */
  function editSheet(flow, enter = 'push') {
    const s = flow.state, m = me(s), b = K.stats(s).best, scenes = (Sonly.morning && Sonly.morning.scenes) || [];
    const lockTag = (need) => `<i class="pp-lock">${si('lock', 11)}${need} ${K.pl(need, 'утро', 'утра', 'утр')}</i>`;
    const kinds = [['letter', 'Буква', avatar({ n: m.name || 'А', c: m.c }, 52)], ['brain', 'Мозг', avatar({ c: m.c, ava: 'brain' }, 52)],
      ['photo', 'Фото', m.photo ? avatar({ c: m.c, ava: 'photo', photo: m.photo }, 52) : `<i class="pp-av ghost" style="--s:52px">${ic('camera', 20, 2.2)}</i>`]];
    flow.sheet(`${head('Оформление', 'pp-profile:back', '<button class="pp-ed" data-act="pp-save">Готово</button>')}
      <div class="ap-sh-body scroll">
        <div class="pp-prev"><span class="pp-cover sm">${banner(m.ban)}</span>${avatar(meP(s), 76, '', 'big')}<b>${m.name ? esc(m.name) : 'Твоё имя'}</b><small>${m.bio ? esc(m.bio) : m.code}</small></div>
        <h3 class="pp-h">Аватар</h3>
        <div class="pp-kinds">${kinds.map(([k, name, face]) => (k === 'photo'
          ? `<label class="pp-kind${m.ava === k ? ' on' : ''}">${face}<small>${name}</small><input type="file" accept="image/*" class="js-ppphoto" aria-label="Выбрать фото"></label>`
          : `<button class="pp-kind${m.ava === k ? ' on' : ''}" data-act="pp-ava:${k}">${face}<small>${name}</small></button>`)).join('')}</div>
        <div class="pp-colors" role="radiogroup" aria-label="Цвет">${AV.map(([a, c], i) => `<button class="${i === m.c ? 'on' : ''}" style="--a:${a};--b:${c}" data-act="pp-color:${i}" role="radio" aria-checked="${i === m.c}" aria-label="Цвет ${i + 1}"></button>`).join('')}</div>
        <h3 class="pp-h">Имя и о себе</h3>
        <div class="ap-card pp-form"><label><small>Имя</small><input class="js-ppname" value="${esc(m.name)}" maxlength="20" placeholder="Как тебя зовут" autocomplete="given-name"></label>
          <label><small>О себе</small><input class="js-ppbio" value="${esc(m.bio)}" maxlength="34" placeholder="Например: бегаю до работы" autocomplete="off"></label></div>
        <h3 class="pp-h">Обложка<span>пейзажи открывает серия</span></h3>
        <div class="pp-bans">${GRAD.map(([id, name]) => `<button class="pp-ban${m.ban === 'g:' + id ? ' on' : ''}" data-act="pp-ban:g:${id}"><span class="pp-ban-c">${banner('g:' + id)}</span><small>${name}</small></button>`).join('')}${scenes.map(([id, full, need]) => ({ id, need, name: id === 'aurora' ? 'Сияние' : full })).map(({ id, name, need }) => (need <= b
          ? `<button class="pp-ban${m.ban === 'l:' + id ? ' on' : ''}" data-act="pp-ban:l:${id}"><span class="pp-ban-c">${banner('l:' + id)}</span><small>${name}</small></button>`
          : `<span class="pp-ban off" aria-label="«${name}» откроется за ${need} утр подряд"><span class="pp-ban-c">${banner('l:' + id)}${lockTag(need)}</span><small>${name}</small></span>`)).join('')}</div>
        <h3 class="pp-h">Рамка<span>за лучшую серию</span></h3>
        <div class="pp-frames">${FRAMES.map(([id, name, need]) => (need <= b
          ? `<button class="pp-frm${m.frame === id ? ' on' : ''}" data-act="pp-frame:${id}">${avatar({ ...meP(s), frame: id }, 52)}<small>${name}</small></button>`
          : `<span class="pp-frm off">${avatar({ ...meP(s), frame: id }, 52)}${lockTag(need)}<small>${name}</small></span>`)).join('')}</div>
      </div>`, `ap-sheet pp-sheet${enter ? ' ' + enter : ''}`);
    const file = flow.sheets.querySelector('.js-ppphoto');
    if (file) file.addEventListener('change', () => photo(flow, file.files && file.files[0]));
  }
  /** Фото с телефона: квадрат по центру, 256 × 256, чтобы не хранить мегабайты. */
  function photo(flow, f) {
    if (!f) return;
    keep(flow);
    const url = URL.createObjectURL(f), img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'), n = 256, k = Math.min(img.width, img.height);
      c.width = n; c.height = n;
      c.getContext('2d').drawImage(img, (img.width - k) / 2, (img.height - k) / 2, k, k, 0, 0, n, n);
      URL.revokeObjectURL(url);
      const m = me(flow.state);
      m.photo = c.toDataURL('image/jpeg', 0.86);
      m.ava = 'photo';
      redrawEdit(flow);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }
  /** Имя и «о себе» из полей — до любой перерисовки, чтобы набранное не терялось. */
  function keep(flow) {
    const m = me(flow.state), n = flow.sheets.querySelector('.js-ppname'), b = flow.sheets.querySelector('.js-ppbio');
    if (n) m.name = n.value.trim().slice(0, 20);
    if (b) m.bio = b.value.trim().slice(0, 34);
  }
  function redrawEdit(flow) {
    const sc = flow.sheets.querySelector('.scroll'), y = sc ? sc.scrollTop : 0;
    editSheet(flow, '');
    const now = flow.sheets.querySelector('.scroll');
    if (now) now.scrollTop = y;
    if (flow.id === 'home' || flow.id === 'settings') flow.rerender(true);
  }

  Sonly.people = {
    card, profile, together,
    /** Маленький аватар для шапки главной и карточки в настройках. */
    avatar: (s, size) => avatar({ ...meP(s), frame: '' }, size),
    name: (s) => me(s).name,
    preview(flow, what) {
      flow.state._ppFromProfile = false;
      if (what === 'together') together(flow);
      else if (what === 'edit') editSheet(flow, '');
      else if (what.startsWith('friend')) friendSheet(flow, what.split('-')[1] || 'anya', '');
      else profile(flow);
    },
    on(flow, act, arg) {
      const s = flow.state, fr = () => friends(s), find = (id) => fr().find((f) => f.id === id);
      /* Лист перерисовывается на месте: карточка друга или «Вставай вместе». */
      const redraw = () => { const fs = flow.sheets.querySelector('[data-friend]'), sc = flow.sheets.querySelector('.scroll'), y = sc ? sc.scrollTop : 0; if (fs) friendSheet(flow, fs.dataset.friend, ''); else together(flow, ''); const now = flow.sheets.querySelector('.scroll'); if (now) now.scrollTop = y; };
      const save = () => { if (flow.id === 'home' || flow.id === 'settings') flow.rerender(true); };
      switch (act) {
        case 'pp-profile': keep(flow); save(); s._ppMsg = ''; profile(flow, arg || ''); return true;
        case 'pp-together':
          if (arg === 'push') s._ppFromProfile = true; else if (!arg) s._ppFromProfile = false;
          s._ppMsg = '';
          together(flow, arg || '');
          return true;
        case 'pp-friend': s._ppMsg = ''; friendSheet(flow, arg); return true;
        case 'pp-edit': editSheet(flow); return true;
        case 'pp-save': keep(flow); profile(flow, 'back'); save(); return true;
        case 'pp-ava': keep(flow); me(s).ava = arg; redrawEdit(flow); return true;
        case 'pp-color': keep(flow); me(s).c = +arg; redrawEdit(flow); return true;
        case 'pp-ban': keep(flow); me(s).ban = arg; redrawEdit(flow); return true;
        case 'pp-frame': keep(flow); me(s).frame = arg; redrawEdit(flow); return true;
        case 'pp-cheer': {
          const f = find(arg);
          if (f) { f.cheer = !f.cheer; if (f.cheer) { Sonly.sound.fx('pop'); if (navigator.vibrate) navigator.vibrate(15); } }
          s._ppMsg = f && f.cheer ? `${f.n} получит твоё поздравление` : '';
          redraw();
          return true;
        }
        case 'pp-wake': {
          const f = find(arg);
          if (f && !f.nudge) { f.nudge = true; s._ppMsg = `${f.n} получит громкое напоминание — разбудим`; if (navigator.vibrate) navigator.vibrate(20); }
          redraw();
          return true;
        }
        case 'pp-cancel': s.friends = fr().filter((f) => f.id !== arg); s._ppMsg = 'Запрос отменён'; redraw(); return true;
        case 'pp-add': {
          const input = flow.sheets.querySelector('.js-ppcode'), code = ((input && input.value) || '').trim().toUpperCase().replace(/\s+/g, '');
          const ok = /^(SN-)?[A-Z0-9]{4}$/.test(code), full = code.startsWith('SN-') ? code : 'SN-' + code;
          if (!ok) s._ppMsg = 'Код — четыре буквы или цифры, например SN-7K2Q';
          else if (full === me(s).code) s._ppMsg = 'Это твой код — нужен код друга';
          else if (fr().some((f) => f.code === full)) s._ppMsg = 'Этот код уже добавлен';
          else { fr().push({ id: 'p' + Date.now(), n: full, c: fr().length % AV.length, code: full, pending: true, al: 0, up: null, streak: 0, miss: [] }); s._ppMsg = 'Запрос отправлен — друг появится, когда примет'; }
          redraw();
          return true;
        }
        case 'pp-copy': case 'pp-invite':
          K.shareText(`Вставай со мной в sonly: добавь меня по коду ${me(s).code}. https://9opamine.github.io/sonly/`, act === 'pp-invite', (msg) => { s._ppMsg = msg ? msg.replace('Текст с кодом', 'Приглашение с кодом') : ''; redraw(); });
          return true;
        case 'pp-badges': Sonly.concepts.app.on(flow, 'st-badges'); return true;
        default: return false;
      }
    },
  };
})();
