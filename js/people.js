/*
 * Профиль и «Вставай вместе».
 * Профиль: имя и цвет, код для друзей, цифры (серия, рекорд, утр всего, обычный подъём), значки, друзья, открытки.
 * «Вставай вместе»: кто из друзей уже встал, кто ещё спит, кто проспал — его можно разбудить; встал — поздравить;
 * рейтинг недели; свой код и добавление друга по коду.
 * Своего сервера у прототипа нет. В демо-режиме друзья — пример. В своём режиме друзей пока нет: добавленный по коду
 * друг висит как «запрос отправлен», а пример утра группы так и подписан — «Пример».
 */
(() => {
  'use strict';
  const { ic, esc, appKit: K } = Sonly;
  const si = (id, size) => Sonly.si(id, size);
  /* Цвета аватаров — системные цвета iOS парами для градиента. */
  const AV = [['#FF9F0A', '#FF6B00'], ['#30D158', '#1FA347'], ['#64D2FF', '#0A84FF'], ['#BF5AF2', '#8944D8'], ['#FF6482', '#E5305A'], ['#FFD60A', '#F5A300'], ['#7D7AFF', '#4B48D6']];
  /* Друзья для демо: будильник (минуты суток), через сколько минут встаёт (null — сегодня проспит), серия, пропуски этой недели. */
  const DEMO = [
    { id: 'katya', n: 'Катя', g: 'f', c: 3, al: 390, up: 4, streak: 41, miss: [] },
    { id: 'anya', n: 'Аня', g: 'f', c: 4, al: 400, up: 8, streak: 23, miss: [] },
    { id: 'max', n: 'Макс', g: 'm', c: 2, al: 420, up: 2, streak: 9, miss: [] },
    { id: 'lena', n: 'Лена', g: 'f', c: 5, al: 450, up: null, streak: 12, miss: [] },
    { id: 'dima', n: 'Дима', g: 'm', c: 1, al: 495, up: 6, streak: 2, miss: [1] },
  ];
  const EXAMPLE = [{ n: 'Аня', g: 'f', c: 4, k: 'up', t: '06:48' }, { n: 'Макс', g: 'm', c: 2, k: 'up', t: '07:02' }, { n: 'Лена', g: 'f', c: 5, k: 'late', t: '07:30' }, { n: 'Дима', g: 'm', c: 1, k: 'sleep', t: '08:15' }];
  const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const v = (f, m, w) => (f.g === 'f' ? w : m);
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const dow = () => (new Date().getDay() + 6) % 7;

  function me(s) {
    if (!s.me) s.me = { name: '', c: 2, code: 'SN-' + K.code4(), since: Date.now() };
    return s.me;
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
  const initial = (name) => (name.trim()[0] || '').toUpperCase();
  /** Аватар: буква имени на градиенте; у себя без имени — солнце sonly. dot — значок статуса в углу. */
  function av(name, c, size, dot = '', cls = '') {
    const [a, b] = AV[c % AV.length], ch = initial(name);
    return `<i class="pp-av${cls ? ' ' + cls : ''}${ch ? '' : ' sun'}" style="--a:${a};--b:${b};--s:${size}px">${ch ? esc(ch) : Sonly.mark()}${dot}</i>`;
  }
  const myAv = (s, size, dot, cls) => { const m = me(s); return av(m.name, m.c, size, dot, cls); };
  const dotOf = (k) => (k === 'up' ? `<b class="pp-dot up">${ic('check', 10, 4)}</b>` : k === 'late' ? `<b class="pp-dot late">${ic('bell', 9, 3)}</b>` : k === 'sleep' ? `<b class="pp-dot sleep">${si('moon', 10)}</b>` : '');

  /* Неделя: сколько утр с понедельника по сегодня встал и во сколько в среднем. */
  function myWeek(s) {
    const h = K.stats(s).h, mon = new Date(); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - dow());
    const wk = h.filter((x) => x.d >= mon);
    return { w: wk.length, avg: wk.length ? Math.round(wk.reduce((a, x) => a + x.wake, 0) / wk.length) : null };
  }
  function friendWeek(f) {
    const st = statusOf(f), past = Array.from({ length: dow() }, (_, i) => i).filter((i) => !f.miss.includes(i)).length;
    return { w: past + (st.k === 'up' ? 1 : 0), avg: f.al + (f.up == null ? 3 : f.up) };
  }

  /* ── Карточка на вкладке «Утро» ──────────────────────────── */
  function card(s) {
    const fr = friends(s).filter((f) => !f.pending), up = fr.filter((f) => statusOf(f).k === 'up').length + (myStatus(s).k === 'up' ? 1 : 0);
    const stack = fr.length ? fr.slice(0, 3).map((f) => av(f.n, f.c, 42)).join('') : `${myAv(s, 42)}<i class="pp-av ghost" style="--s:42px">${ic('user-plus', 18, 2.4)}</i>`;
    return `<button class="ap-card mo-group pp-entry" data-act="pp-together" data-in style="--i:3"><span class="pp-stack">${stack}</span><span><b>Вставай вместе</b><small>${fr.length ? `Уже встали ${up} из ${fr.length + 1}` : 'Утром видно, кто уже встал'}</small></span>${K.chev()}</button>`;
  }

  /* ── Вставай вместе ─────────────────────────────────────── */
  const head = (title, back) => `<div class="ap-sh-head"><button class="ap-x lg" data-act="${back ? 'pp-profile:back' : 'sheet-close'}" aria-label="${back ? 'Назад' : 'Закрыть'}">${ic(back ? 'chevron-left' : 'x', back ? 22 : 20, 2.3)}</button><b>${title}</b><span class="ap-x ghost"></span></div>`;
  function row(f, mine) {
    const st = mine ? myStatus(mine) : statusOf(f), name = mine ? 'Ты' : f.n, c = mine ? me(mine).c : f.c;
    const fire = f && f.streak && !f.pending ? `<em class="pp-fire">${si('flame', 12)}${f.streak}</em>` : '';
    let note, act = '';
    if (st.k === 'up') note = mine ? `подъём в ${K.fmtMin(st.t)}` : `${v(f, 'встал', 'встала')} в ${K.fmtMin(st.t)}`;
    else if (st.k === 'sleep') note = mine ? 'ещё не встал' : `спит · будильник в ${K.fmtMin(f.al)}`;
    else if (st.k === 'late') note = `${v(f, 'не встал', 'не встала')} в ${K.fmtMin(f.al)}`;
    else note = 'запрос отправлен';
    if (!mine && st.k === 'up') act = `<button class="pp-cheer${f.cheer ? ' on' : ''}" data-act="pp-cheer:${f.id}" aria-label="${f.cheer ? 'Поздравили' : `Поздравить: ${esc(f.n)}`}" aria-pressed="${!!f.cheer}">${ic('party-popper', 18, 2.2)}</button>`;
    if (!mine && st.k === 'late') act = f.nudge ? `<span class="pp-sent">${ic('check', 14, 3)}Будим</span>` : `<button class="pp-wake" data-act="pp-wake:${f.id}">${ic('bell-ring', 15, 2.4)}Разбудить</button>`;
    if (!mine && st.k === 'pend') act = `<button class="pp-undo" data-act="pp-cancel:${f.id}">Отменить</button>`;
    return `<div class="pp-row ${st.k}${mine ? ' me' : ''}">${av(mine ? me(mine).name : name, c, 44, dotOf(st.k))}<span class="pp-tx"><b>${esc(name)}${fire}</b><small>${note}</small></span>${act}</div>`;
  }
  function together(flow, enter = '', back = false) {
    const s = flow.state, m = me(s), fr = friends(s), live = fr.filter((f) => !f.pending), pend = fr.filter((f) => f.pending);
    const my = myStatus(s), up = live.filter((f) => statusOf(f).k === 'up').length + (my.k === 'up' ? 1 : 0), total = live.length + 1;
    const late = live.filter((f) => statusOf(f).k === 'late'), wake = late.filter((f) => !f.nudge);
    let body;
    if (!live.length) {
      body = `<div class="pp-empty"><span class="pp-stack big">${av('А', 4, 60)}${myAv(s, 60)}${av('М', 2, 60)}</span><b>Вставайте вместе</b><p>Утром видно, кто уже встал, а кто проспал — его можно разбудить</p></div>
        <div class="ap-card pp-list ex"><div class="pp-list-h"><b>Утро друзей</b><span class="pp-tag">Пример</span></div>
          ${EXAMPLE.map((x) => `<div class="pp-row ${x.k}">${av(x.n, x.c, 44, dotOf(x.k))}<span class="pp-tx"><b>${x.n}</b><small>${x.k === 'up' ? `${v(x, 'встал', 'встала')} в ${x.t}` : x.k === 'late' ? `${v(x, 'не встал', 'не встала')} в ${x.t}` : `спит · будильник в ${x.t}`}</small></span>${x.k === 'up' ? `<span class="pp-cheer">${ic('party-popper', 18, 2.2)}</span>` : x.k === 'late' ? `<span class="pp-wake">${ic('bell-ring', 15, 2.4)}Разбудить</span>` : ''}</div>`).join('')}</div>
        ${pend.length ? `<div class="ap-card pp-list">${pend.map((f) => row(f)).join('')}</div>` : ''}`;
    } else {
      const order = live.slice().sort((a, b) => { const r = { up: 0, late: 1, sleep: 2 }, x = statusOf(a), y = statusOf(b); return r[x.k] - r[y.k] || (x.t || a.al) - (y.t || b.al); });
      const rows = order.map((f) => row(f));
      /* Себя — на своё место по времени подъёма, а если ещё не встал — перед спящими. */
      const at = my.k === 'up' ? order.findIndex((f) => statusOf(f).k !== 'up' || statusOf(f).t > my.t) : order.findIndex((f) => statusOf(f).k === 'sleep');
      rows.splice(at < 0 ? rows.length : at, 0, row(null, s));
      const lb = live.map((f) => ({ n: f.n, c: f.c, ...friendWeek(f) })).concat({ n: 'Ты', c: m.c, name: m.name, me: true, ...myWeek(s) })
        .sort((a, b) => b.w - a.w || (a.avg ?? 1e4) - (b.avg ?? 1e4));
      body = `<div class="ap-card pp-sum"><span class="pp-stack">${live.slice(0, 5).map((f) => av(f.n, f.c, 40, dotOf(statusOf(f).k))).join('')}${myAv(s, 40, dotOf(my.k))}</span>
          <b>Встали ${up} из ${total}</b><div class="pp-bar"><i style="--p:${(up / total).toFixed(3)}"></i></div>
          <small>${wake.length ? `${wake.map((f) => f.n).join(', ')} ${wake.length > 1 ? 'не встали' : v(wake[0], 'не встал', 'не встала')} — можно разбудить` : late.length ? `${late.map((f) => f.n).join(', ')} — уже будим` : up === total ? 'Сегодня встали все' : 'Остальные ещё спят — их будильник впереди'}</small></div>
        <h3 class="pp-h">Сегодня</h3><div class="ap-card pp-list">${rows.join('')}${pend.map((f) => row(f)).join('')}</div>
        <h3 class="pp-h">Неделя<span>утра с понедельника</span></h3>
        <div class="ap-card pp-lb">${lb.map((x, i) => `<div class="pp-lb-r${x.me ? ' me' : ''}"><b class="pp-rank r${i}">${i + 1}</b>${av(x.me ? x.name : x.n, x.c, 32)}<span>${esc(x.n)}</span><small>${x.avg != null ? `обычно ${K.fmtMin(x.avg)}` : ''}</small><em>${x.w}<u>/${dow() + 1}</u></em></div>`).join('')}</div>`;
    }
    body += `<div class="ap-card pp-code"><span><small>Твой код</small><b>${m.code}</b></span><button class="pp-copy" data-act="pp-copy">${ic('copy', 16, 2.3)}Копировать</button></div>
      <div class="ap-card pp-join"><input class="js-ppcode" placeholder="Код друга" maxlength="9" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Код друга"><button class="pp-add" data-act="pp-add">Добавить</button></div>
      <p class="ap-note pp-msg">${s._ppMsg || ''}</p>`;
    flow.sheet(`${head('Вставай вместе', back)}<div class="ap-sh-body scroll">${body}</div><div class="ap-sh-foot"><button class="ap-btn" data-act="pp-invite">${ic('user-plus', 19, 2.4)}Позвать друга</button></div>`, `ap-sheet pp-sheet${enter ? ' ' + enter : ''}`);
  }

  /* ── Профиль ────────────────────────────────────────────── */
  function profile(flow, enter = '') {
    const s = flow.state, m = me(s), st = K.stats(s), h = st.h, wakes = h.map((x) => x.wake).sort((a, b) => a - b);
    const fr = friends(s).filter((f) => !f.pending), my = myStatus(s), up = fr.filter((f) => statusOf(f).k === 'up').length + (my.k === 'up' ? 1 : 0);
    const bd = K.badges ? K.badges(s) : [], got = bd.filter((b) => b.on).length;
    const sd = new Date(m.since), since = `${['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'][sd.getMonth()]} ${sd.getFullYear()}`;
    const tile = (cls, icon, val, label) => `<div class="pp-st ${cls}"><i class="pp-ic">${icon}</i><b>${val}</b><small>${label}</small></div>`;
    const edit = s._ppEdit ? `<div class="ap-card pp-edit"><label><small>Имя</small><input class="js-ppname" value="${esc(m.name)}" maxlength="20" placeholder="Как тебя зовут" autocomplete="given-name" aria-label="Имя"></label>
        <div class="pp-colors" role="radiogroup" aria-label="Цвет">${AV.map(([a, b], i) => `<button class="${i === m.c ? 'on' : ''}" style="--a:${a};--b:${b}" data-act="pp-color:${i}" role="radio" aria-checked="${i === m.c}" aria-label="Цвет ${i + 1}"></button>`).join('')}</div></div>` : '';
    flow.sheet(`<div class="ap-sh-head"><button class="ap-x lg" data-act="sheet-close" aria-label="Закрыть">${ic('x', 20, 2.3)}</button><b>Профиль</b><button class="pp-ed" data-act="pp-edit">${s._ppEdit ? 'Готово' : 'Изменить'}</button></div>
      <div class="ap-sh-body scroll">
        <div class="pp-hero">${myAv(s, 92, '', 'big')}${m.name ? `<b>${esc(m.name)}</b>` : `<button class="pp-noname" data-act="pp-edit">Добавить имя</button>`}<small>${m.code} · в sonly с ${since}</small></div>
        ${edit}
        <div class="pp-stats">${tile('fire', si('flame', 18), st.streak, `${K.pl(st.streak, 'день', 'дня', 'дней')} подряд`)}${tile('gold', ic('trophy', 17, 2.4), st.best, 'лучшая серия')}
          ${tile('sun', si('rise', 18), h.length, K.pl(h.length, 'утро', 'утра', 'утр') + ' всего')}${tile('blue', ic('alarm-clock', 17, 2.4), wakes.length ? K.fmtMin(wakes[Math.floor(wakes.length / 2)]) : '—', 'обычно встаёшь')}</div>
        <button class="ap-card mo-group pp-entry" data-act="pp-together:push"><span class="pp-stack">${fr.length ? fr.slice(0, 3).map((f) => av(f.n, f.c, 40)).join('') : `<i class="pp-av ghost" style="--s:40px">${ic('user-plus', 18, 2.4)}</i>`}</span><span><b>Вставай вместе</b><small>${fr.length ? `${fr.length} ${K.pl(fr.length, 'друг', 'друга', 'друзей')} · встали ${up} из ${fr.length + 1}` : 'Позови друзей'}</small></span>${K.chev()}</button>
        ${bd.length ? `<h3 class="pp-h">Значки<span>${got} из ${bd.length}</span></h3><div class="pp-badges">${bd.map((b) => `<button class="pp-bd${b.on ? ' on' : ''}" data-act="pp-badges" aria-label="${b.name}${b.on ? '' : ' — ещё не получен'}">${K.hex ? K.hex(b) : ''}<small>${b.name}</small></button>`).join('')}</div>` : ''}
        <button class="ap-card pp-album" data-act="mo-album"><i class="pp-ic" style="--a:#BF5AF2;--b:#8944D8">${si('cards', 18)}</i><span><b>Открытки утра</b><small>${h.length ? `${h.length} ${K.pl(h.length, 'открытка', 'открытки', 'открыток')}` : 'Первая — завтра утром'}</small></span>${K.chev()}</button>
      </div>`, `ap-sheet pp-sheet${enter ? ' ' + enter : ''}`);
  }

  Sonly.people = {
    card, profile, together,
    /** Маленький аватар для шапки главной и карточки в настройках. */
    avatar: (s, size) => myAv(s, size),
    name: (s) => me(s).name,
    preview(flow, what) {
      if (what === 'together') together(flow); else profile(flow);
    },
    on(flow, act, arg) {
      const s = flow.state, fr = () => friends(s), find = (id) => fr().find((f) => f.id === id);
      /* Лист «Вставай вместе» перерисовывается на месте; если он открыт из профиля — со стрелкой назад. */
      const redraw = () => together(flow, '', !!flow.sheets.querySelector('[data-act="pp-profile:back"]'));
      switch (act) {
        case 'pp-profile': s._ppMsg = ''; profile(flow, arg === 'back' ? 'back' : ''); return true;
        case 'pp-together': s._ppMsg = ''; together(flow, arg === 'push' ? 'push' : '', arg === 'push'); return true;
        case 'pp-edit': {
          /* «Готово»: имя из поля сохраняется, даже если человек не ушёл с него. */
          const input = flow.sheets.querySelector('.js-ppname');
          if (input) me(s).name = input.value.trim().slice(0, 20);
          s._ppEdit = !s._ppEdit;
          profile(flow);
          if (s._ppEdit) { const n = flow.sheets.querySelector('.js-ppname'); if (n) n.focus({ preventScroll: true }); }
          if (flow.id === 'home' || flow.id === 'settings') flow.rerender(true);
          return true;
        }
        case 'pp-color': {
          const input = flow.sheets.querySelector('.js-ppname');
          if (input) me(s).name = input.value.trim().slice(0, 20);
          me(s).c = +arg;
          profile(flow);
          if (flow.id === 'home' || flow.id === 'settings') flow.rerender(true);
          return true;
        }
        case 'pp-cheer': {
          const f = find(arg);
          if (f) { f.cheer = !f.cheer; if (f.cheer) { Sonly.sound.fx('pop'); if (navigator.vibrate) navigator.vibrate(15); } }
          s._ppMsg = f && f.cheer ? `${f.n} получит твоё поздравление` : '';
          redraw();
          return true;
        }
        case 'pp-wake': {
          const f = find(arg);
          if (f) { f.nudge = true; s._ppMsg = `${f.n} получит громкое напоминание — разбудим`; if (navigator.vibrate) navigator.vibrate(20); }
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
        case 'pp-copy': case 'pp-invite': {
          K.shareText(`Вставай со мной в sonly: добавь меня по коду ${me(s).code}. https://9opamine.github.io/sonly/`, act === 'pp-invite', (msg) => { s._ppMsg = msg ? msg.replace('Текст с кодом', 'Приглашение с кодом') : ''; redraw(); });
          return true;
        }
        case 'pp-badges': Sonly.concepts.app.on(flow, 'st-badges'); return true;
        default: return false;
      }
    },
  };
})();
