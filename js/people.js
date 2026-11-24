/*
 * Профиль, друзья и группы.
 * Профиль: обложка (градиент или пейзаж открыток — пейзажи открывает серия), аватар (буква, мозг или своё фото),
 * рамка за серию (огонь — 7 утр подряд, золото — 30), имя и строка «о себе», код для друзей, цифры, значки, открытки.
 * «Вставай вместе»: приглашения в группы, заявки в друзья, утро всех друзей, свои группы, рейтинг недели.
 * «Друзья»: поиск по имени, нику или коду, заявки (принять или отклонить), «возможно, знакомы» — по общим друзьям,
 * отправленные заявки, список друзей, свой код и приглашение.
 * Группы: у человека их сколько угодно, и один друг может быть в нескольких. У группы название, значок, цвет,
 * цель по времени, участники (не обязательно друзья — утро видно всем в группе), серия «все вместе», код группы.
 * Своего сервера у прототипа нет: люди в поиске — пример, а заявку такой человек принимает через пару секунд.
 */
(() => {
  'use strict';
  const { ic, esc, appKit: K } = Sonly;
  /* Текст приглашения — на языке интерфейса (он уходит из приложения, экранный перевод его не видит). */
  const T = (key, vars) => (Sonly.i18n ? Sonly.i18n.t(key, vars) : key.replace(/\{(\w+)\}/g, (m, k) => vars[k]));
  const si = (id, size) => Sonly.si(id, size);
  /* Цвета аватаров и групп — системные цвета iOS парами для градиента. */
  const AV = [['#FF9F0A', '#FF6B00'], ['#30D158', '#1FA347'], ['#64D2FF', '#0A84FF'], ['#BF5AF2', '#8944D8'], ['#FF6482', '#E5305A'], ['#FFD60A', '#F5A300'], ['#7D7AFF', '#4B48D6']];
  /* Обложки-градиенты: есть сразу. Пейзажи открыток — когда серия их открыла. */
  const GRAD = [['dawn', 'Рассвет', '#FFB36B', '#FF6F91', '#8C5BD8'], ['sky', 'Небо', '#9ED8FF', '#4A90F0', '#2E5BD8'], ['sun', 'Солнце', '#FFE680', '#FFB020', '#FF7A1F'],
    ['mint', 'Мята', '#A6F2CF', '#3CC8A5', '#1E7F8C'], ['berry', 'Ягоды', '#FF9EBB', '#C455E0', '#6B3FD8'], ['night', 'Ночь', '#3A4C9A', '#3B2A6E', '#101026']];
  /* Рамки аватара — награда за лучшую серию. */
  const FRAMES = [['none', 'Без рамки', 0], ['fire', 'Огонь', 7], ['gold', 'Золото', 30]];

  /*
   * Люди в sonly (пример). n — имя, sn — фамилия, nick — ник, code — код для друзей, al — будильник (минуты суток),
   * up — через сколько минут встаёт (null — сегодня проспит), streak — серия, miss — пропуски этой недели (Пн = 0), fr — с кем дружит.
   */
  const P = (id, n, sn, g, c, nick, code, al, up, streak, more = {}) => ({ id, n, sn, g, c, nick, code, al, up, streak, miss: [], fr: [], ban: 'g:dawn', bio: '', ...more });
  const DIR = [
    P('katya', 'Катя', 'Орлова', 'f', 3, 'katya.run', 'SN-K4TQ', 390, 4, 41, { ban: 'l:aurora', ava: 'brain', frame: 'gold', bio: 'Бегаю до работы', fr: ['anya', 'sonya', 'vika', 'polina'] }),
    P('anya', 'Аня', 'Белова', 'f', 4, 'anya.yoga', 'SN-A7NB', 400, 8, 23, { ban: 'g:berry', frame: 'fire', bio: 'Йога в семь утра', fr: ['katya', 'sonya', 'vika', 'nastya'] }),
    P('max', 'Макс', 'Ершов', 'm', 2, 'max_e', 'SN-M2XR', 420, 2, 9, { ban: 'l:mountains', frame: 'fire', fr: ['artem', 'oleg', 'dima'] }),
    P('lena', 'Лена', 'Соколова', 'f', 5, 'lena.s', 'SN-L5NA', 450, null, 12, { frame: 'fire', bio: 'Учусь вставать раньше', fr: ['vika', 'sasha', 'ira'] }),
    P('dima', 'Дима', 'Кравец', 'm', 1, 'dimakr', 'SN-D8MK', 495, 6, 2, { ban: 'g:sky', miss: [1], fr: ['max', 'oleg', 'sasha', 'masha'] }),
    P('sonya', 'Соня', 'Миронова', 'f', 6, 'sonya.m', 'SN-S3PH', 405, 5, 17, { ban: 'g:sun', bio: 'Кофе и пробежка', fr: ['katya', 'anya'] }),
    P('artem', 'Артём', 'Лис', 'm', 0, 'artem.fox', 'SN-R9TL', 430, 12, 5, { ban: 'g:night', fr: ['max'] }),
    P('vika', 'Вика', 'Зайцева', 'f', 4, 'vika.z', 'SN-V6KZ', 380, 3, 28, { ban: 'g:mint', frame: 'fire', fr: ['katya', 'anya', 'lena'] }),
    P('oleg', 'Олег', 'Петров', 'm', 2, 'oleg.p', 'SN-Q2PT', 480, 9, 6, { ban: 'g:sky', bio: 'Работаю с восьми', fr: ['max', 'dima'] }),
    P('polina', 'Полина', 'Гром', 'f', 3, 'polina.g', 'SN-P7GM', 415, 7, 33, { ban: 'l:aurora', frame: 'gold', fr: ['katya'] }),
    P('sasha', 'Саша', 'Ким', 'm', 1, 'sasha.kim', 'SN-S5KM', 445, null, 3, { fr: ['lena', 'dima'] }),
    P('volkov', 'Саша', 'Волков', 'm', 6, 'volkov', 'SN-W4LK', 465, 4, 11, { ban: 'g:night' }),
    P('nastya', 'Настя', 'Рыбак', 'f', 5, 'nastya.r', 'SN-N8RB', 420, 6, 14, { ban: 'g:berry', fr: ['anya'] }),
    P('igor', 'Игорь', 'Дан', 'm', 2, 'igor.dan', 'SN-J3DN', 360, 2, 52, { ban: 'l:mountains', frame: 'gold', bio: 'Встаю в шесть' }),
    P('masha', 'Маша', 'Лебедева', 'f', 0, 'masha.l', 'SN-M9LB', 410, 10, 8, { fr: ['dima'] }),
    P('kirill', 'Кирилл', 'Ус', 'm', 4, 'kirill.us', 'SN-K7US', 500, 15, 1),
    P('ira', 'Ира', 'Новак', 'f', 6, 'ira.nov', 'SN-H6NV', 435, 5, 19, { ban: 'g:mint', fr: ['lena'] }),
  ];
  /* Группы. by — кто создал ('me' — ты: такую группу можно удалить, из чужой — выйти). goal — встать до (минуты суток). */
  const G = (id, name, icon, c, goal, members, code, by) => ({ id, name, icon, c, goal, members, code, by });
  const MINE = [G('run', 'Утренний бег', 'footprints', 0, 420, ['katya', 'anya'], 'SG-R8UN', 'me'), G('fam', 'Семья', 'house', 1, null, ['lena', 'dima'], 'SG-F4MY', 'lena'),
    G('work', 'Работа', 'briefcase', 2, 480, ['max', 'dima', 'oleg'], 'SG-W7RK', 'max')];
  /* Группы, в которые зовут или можно вступить по коду. */
  const OPEN = [G('yoga', 'Йога по утрам', 'leaf', 3, 450, ['katya', 'polina', 'sonya'], 'SG-Y4GA', 'katya'), G('birds', 'Ранние пташки', 'sunrise', 5, 390, ['igor', 'vika', 'polina', 'ira'], 'SG-P7TX', 'igor')];
  const GLYPHS = [['sunrise', 'Рассвет'], ['footprints', 'Бег'], ['dumbbell', 'Спорт'], ['bike', 'Велосипед'], ['leaf', 'Йога'], ['coffee', 'Кофе'],
    ['house', 'Дом'], ['heart', 'Сердце'], ['briefcase', 'Работа'], ['graduation-cap', 'Учёба'], ['book-open', 'Книги'], ['music', 'Музыка']];
  const EXAMPLE = [{ n: 'Аня', g: 'f', c: 4, k: 'up', t: '06:48' }, { n: 'Макс', g: 'm', c: 2, k: 'up', t: '07:02' }, { n: 'Лена', g: 'f', c: 5, k: 'late', t: '07:30' }, { n: 'Дима', g: 'm', c: 1, k: 'sleep', t: '08:15' }];
  const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const v = (f, m, w) => (f.g === 'f' ? w : m);
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const dow = () => (new Date().getDay() + 6) % 7;
  const full = (p) => (p.sn ? `${p.n} ${p.sn}` : p.n);
  const people = (n) => `${n} ${K.pl(n, 'участник', 'участника', 'участников')}`;
  let uid = 0;

  function me(s) {
    if (!s.me) s.me = { name: '', c: 2, code: 'SN-' + K.code4(), since: Date.now() };
    const m = s.me;
    if (!m.ava) m.ava = 'letter';
    if (!m.ban) m.ban = 'g:dawn';
    if (!m.frame) m.frame = 'none';
    if (m.bio == null) m.bio = '';
    if (m.nick == null) m.nick = '';
    return m;
  }

  /* ── Связи: друзья, заявки, группы ─────────────────────── */
  /** rel: id → 'friend' | 'in' (зовёт тебя) | 'out' (ты позвал). extra — заявки по коду, которого нет среди людей. */
  function net(s) {
    if (!s.pp) {
      s.pp = { rel: {}, extra: [], cheer: {}, nudge: {}, groups: [], inv: [] };
      if (s.data === 'demo') {
        ['katya', 'anya', 'max', 'lena', 'dima'].forEach((id) => { s.pp.rel[id] = 'friend'; });
        s.pp.rel.sonya = 'in';
        s.pp.rel.artem = 'in';
        s.pp.rel.vika = 'out';
        s.pp.groups = MINE.map((g) => ({ ...g, members: g.members.slice() }));
        s.pp.inv = [{ g: 'yoga', from: 'katya' }];
      }
    }
    return s.pp;
  }
  const byId = (s, id) => DIR.find((p) => p.id === id) || net(s).extra.find((p) => p.id === id);
  const relOf = (s, id) => net(s).rel[id] || '';
  const mates = (s) => DIR.filter((p) => relOf(s, p.id) === 'friend');
  const asking = (s) => DIR.filter((p) => relOf(s, p.id) === 'in');
  const sent = (s) => DIR.concat(net(s).extra).filter((p) => relOf(s, p.id) === 'out');
  const groups = (s) => net(s).groups;
  const groupOf = (s, gid) => groups(s).find((g) => g.id === gid);
  const membersOf = (s, g) => g.members.map((id) => byId(s, id)).filter(Boolean);
  /** Общие друзья: мои друзья, с которыми этот человек дружит. */
  const mutual = (s, p) => mates(s).filter((f) => f.id !== p.id && (f.fr.includes(p.id) || p.fr.includes(f.id)));
  /** «Возможно, знакомы»: не друзья и без заявок, но с общими друзьями — у кого их больше, те выше. */
  const suggest = (s) => DIR.filter((p) => !relOf(s, p.id)).map((p) => ({ p, k: mutual(s, p).length })).filter((x) => x.k).sort((a, b) => b.k - a.k).slice(0, 4).map((x) => x.p);

  /** Статус человека сейчас: встал (во сколько), спит (будильник ещё впереди), проспал. */
  function statusOf(f, nm = nowMin()) {
    if (f.up != null && nm >= f.al + f.up) return { k: 'up', t: f.al + f.up };
    return nm < f.al ? { k: 'sleep' } : { k: 'late' };
  }
  /** Моё утро сегодня: встал (из истории) или нет. */
  function myStatus(s) {
    const h = K.stats(s).h, x = h.find((y) => y.d.getTime() === K.day0(new Date()).getTime());
    return x ? { k: 'up', t: x.wake } : { k: 'sleep' };
  }

  /* ── Аватар, обложка, значок группы ─────────────────────── */
  const initial = (name) => (name.trim()[0] || '').toUpperCase();
  /** Аватар: буква имени, мозг или фото на градиенте; у себя без имени — солнце sonly. Рамка — кольцо снаружи. */
  function avatar(p, size, dot = '', cls = '') {
    const [a, b] = AV[(p.c || 0) % AV.length], ch = initial(p.n || '');
    let inner, kind = '';
    if (p.ava === 'photo' && p.photo) { inner = `<img src="${p.photo}" alt="" draggable="false">`; kind = ' photo'; }
    else if (p.ava === 'brain' && Sonly.brain) { inner = `<span class="pp-brain">${Sonly.brain('pb' + (uid++))}</span>`; kind = ' brain'; }
    else if (p.unknown) { inner = ic('hash', Math.round(size * 0.42), 2.4); kind = ' ghost'; }
    else if (ch) inner = esc(ch);
    else { inner = Sonly.mark(); kind = ' sun'; }
    const face = `<i class="pp-av${kind}${cls ? ' ' + cls : ''}" style="--a:${a};--b:${b};--s:${size}px">${inner}${dot}</i>`;
    return p.frame && p.frame !== 'none' ? `<span class="pp-fr ${p.frame}" style="--s:${size}px">${face}</span>` : face;
  }
  const flat = (p) => ({ ...p, frame: '' });
  const meP = (s) => { const m = me(s); return { n: m.name, c: m.c, ava: m.ava, photo: m.photo, frame: m.frame }; };
  /** Обложка: градиент с мягким светом или пейзаж открыток. */
  function banner(id) {
    if (id && id.startsWith('l:') && Sonly.morning && Sonly.morning.banner) return Sonly.morning.banner(id.slice(2));
    const g = GRAD.find((x) => x[0] === (id || '').slice(2)) || GRAD[0];
    return `<span class="pp-ban-g" style="--g1:${g[2]};--g2:${g[3]};--g3:${g[4]}"><i></i></span>`;
  }
  /** Значок группы: глиф Lucide на градиенте её цвета. */
  const gtile = (g, size) => { const [a, b] = AV[(g.c || 0) % AV.length]; return `<i class="pp-gt" style="--a:${a};--b:${b};--s:${size}px">${ic(g.icon, Math.round(size * 0.48), 2.2)}</i>`; };
  /** Кольцо «встали N из M». */
  const ring = (up, all) => `<span class="pp-ring${up === all ? ' full' : ''}" aria-label="Встали ${up} из ${all}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5"/>${up ? `<circle class="on" cx="18" cy="18" r="15.5" pathLength="100" stroke-dasharray="${Math.round((up / all) * 100)} 100"/>` : ''}</svg><b aria-hidden="true">${up}<u>/${all}</u></b></span>`;
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

  /* ── Навигация по листам: стопка, «назад», перерисовка на месте ── */
  const nav = (s) => s._ppNav || (s._ppNav = []);
  const cls = (enter) => `ap-sheet pp-sheet${enter ? ' ' + enter : ''}`;
  function open(flow, view, how) {
    const st = nav(flow.state);
    if (how === 'push') st.push(view); else { st.length = 0; st.push(view); }
    flow.state._ppAsk = '';
    draw(flow, view, how === 'push' || how === 'back' ? how : '');
  }
  function back(flow, msg) {
    const s = flow.state, st = nav(s);
    st.pop();
    s._ppAsk = '';
    if (msg) s._ppMsg = msg;
    if (!st.length) { flow.closeSheet(); return; }
    draw(flow, st[st.length - 1], 'back');
  }
  /** Заменить верхний лист другим (после создания группы — сразу её лист). */
  function swap(flow, view) { const st = nav(flow.state); st.pop(); st.push(view); draw(flow, view, 'push'); }
  /**
   * Перерисовать верхний лист на месте — с той же прокруткой. Пока набирают поиск — только результаты, чтобы не закрылась клавиатура.
   * soft — перерисовка не от нажатия (друг принял заявку): если человек печатает в другом поле, лист не трогаем, только сообщение.
   */
  function redraw(flow, soft) {
    const s = flow.state, st = nav(s), top = st[st.length - 1];
    if (!top || !flow.sheets.querySelector('[data-pp]')) return;
    const act = document.activeElement, typing = act && act.tagName === 'INPUT' && flow.sheets.contains(act);
    if (typing && act.classList.contains('js-ppq')) { const res = flow.sheets.querySelector('.pp-res'); if (res) res.innerHTML = results(s, s._ppQ || ''); toast(flow); return; }
    if (typing && soft) { toast(flow); return; }
    const sc = flow.sheets.querySelector('.scroll'), y = sc ? sc.scrollTop : 0;
    draw(flow, top, '');
    const now = flow.sheets.querySelector('.scroll');
    if (now) now.scrollTop = y;
  }
  function draw(flow, view, enter) {
    const i = view.indexOf(':'), k = i < 0 ? view : view.slice(0, i), a = i < 0 ? '' : view.slice(i + 1);
    if (k === 'together') together(flow, enter, a);
    else if (k === 'people') together(flow, enter, 'friends');
    else if (k === 'friend') person(flow, enter, a);
    else if (k === 'group') groupSheet(flow, enter, a);
    else if (k === 'gedit') groupEdit(flow, enter, a);
    else if (k === 'ginv') groupInvite(flow, enter, a);
    else if (k === 'gjoin') groupJoin(flow, enter);
    else if (k === 'edit') editSheet(flow, enter);
    else if (k === 'badges') badgesView(flow, enter);
    else if (k === 'badge') badgeView(flow, enter, a);
    else profile(flow, enter);
    toast(flow);
  }
  /** Короткое сообщение внизу листа — само уходит через пару секунд. */
  function toast(flow) {
    const s = flow.state, msg = s._ppMsg;
    s._ppMsg = '';
    const sh = flow.sheets.querySelector('.sheet');
    if (!msg || !sh) return;
    sh.querySelectorAll('.pp-toast').forEach((x) => x.remove());
    const t = document.createElement('div');
    t.className = 'pp-toast' + (sh.querySelector('.ap-sh-foot') ? ' up' : '');
    t.setAttribute('role', 'status');
    t.textContent = msg;
    sh.appendChild(t);
    if (flow.shot) { t.classList.add('on'); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('on')));
    setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 320); }, 2400);
  }
  const head = (flow, title, right = '<span class="ap-x ghost"></span>') => {
    const deep = nav(flow.state).length > 1;
    return `<div class="ap-sh-head"><button class="ap-x lg" data-act="${deep ? 'pp-back' : 'sheet-close'}" aria-label="${deep ? 'Назад' : 'Закрыть'}">${ic(deep ? 'chevron-left' : 'x', deep ? 22 : 20, 2.3)}</button><b>${title}</b>${right}</div>`;
  };

  /* ── Карточка на вкладке «Утро» ──────────────────────────── */
  function card(s) {
    const fr = mates(s), up = fr.filter((f) => statusOf(f).k === 'up').length + (myStatus(s).k === 'up' ? 1 : 0), ask = asking(s).length;
    const stack = fr.length ? fr.slice(0, 3).map((f) => avatar(flat(f), 42)).join('') : `${avatar(flat(meP(s)), 42)}<i class="pp-av ghost" style="--s:42px">${ic('user-plus', 18, 2.4)}</i>`;
    const sub = fr.length ? `Уже встали ${up} из ${fr.length + 1}` : ask ? `Заявки в друзья: ${ask}` : 'Утром видно, кто уже встал';
    return `<button class="ap-card mo-group pp-entry" data-act="pp-together" data-in style="--i:3"><span class="pp-stack">${stack}</span><span><b>Вставай вместе</b><small>${sub}</small></span>${K.chev()}</button>`;
  }

  /* ── Строки людей ───────────────────────────────────────── */
  function note(f, st) {
    if (st.k === 'up') return `${v(f, 'встал', 'встала')} в ${K.fmtMin(st.t)}`;
    if (st.k === 'sleep') return `спит · будильник в ${K.fmtMin(f.al)}`;
    return `${v(f, 'не встал', 'не встала')} в ${K.fmtMin(f.al)}`;
  }
  function action(s, f, st) {
    const n = net(s);
    if (st.k === 'up') return `<button class="pp-cheer${n.cheer[f.id] ? ' on' : ''}" data-act="pp-cheer:${f.id}" aria-label="${n.cheer[f.id] ? 'Поздравили' : `Поздравить: ${esc(f.n)}`}" aria-pressed="${!!n.cheer[f.id]}">${ic('party-popper', 18, 2.2)}</button>`;
    if (st.k === 'late') return n.nudge[f.id] ? `<span class="pp-sent">${ic('check', 14, 3)}Будим</span>` : `<button class="pp-wake" data-act="pp-wake:${f.id}">${ic('bell-ring', 15, 2.4)}Разбудить</button>`;
    return '';
  }
  /** Утро человека: аватар со значком статуса, имя с серией, когда встал, и что можно сделать — поздравить или разбудить. */
  function row(s, f) {
    const st = statusOf(f), fire = f.streak ? `<em class="pp-fire">${si('flame', 12)}${f.streak}</em>` : '';
    const who = `${avatar(flat(f), 46, dotOf(st.k))}<span class="pp-tx"><b>${esc(f.n)}${fire}</b><small>${note(f, st)}</small></span>`;
    return `<div class="pp-row ${st.k}"><button class="pp-who" data-act="pp-friend:${f.id}" aria-label="Профиль: ${esc(f.n)}">${who}</button>${action(s, f, st)}</div>`;
  }
  function meRow(s) {
    const st = myStatus(s), streak = K.stats(s).streak;
    return `<div class="pp-row me ${st.k}"><button class="pp-who" data-act="pp-profile:push" aria-label="Мой профиль">${avatar(flat(meP(s)), 46, dotOf(st.k))}<span class="pp-tx"><b>Ты${streak ? `<em class="pp-fire">${si('flame', 12)}${streak}</em>` : ''}</b><small>${st.k === 'up' ? `подъём в ${K.fmtMin(st.t)}` : 'ещё не встал'}</small></span></button></div>`;
  }
  /** Список утра: сначала вставшие по времени, потом проспавшие, потом спящие; себя — на своё место. */
  function morning(s, list) {
    const my = myStatus(s), rank = { up: 0, late: 1, sleep: 2 };
    const order = list.slice().sort((a, b) => { const x = statusOf(a), y = statusOf(b); return rank[x.k] - rank[y.k] || (x.t || a.al) - (y.t || b.al); });
    const rows = order.map((f) => row(s, f));
    const at = my.k === 'up' ? order.findIndex((f) => statusOf(f).k !== 'up' || statusOf(f).t > my.t) : order.findIndex((f) => statusOf(f).k === 'sleep');
    rows.splice(at < 0 ? rows.length : at, 0, meRow(s));
    return { order, html: `<div class="ap-card pp-list">${rows.join('')}</div>` };
  }
  /** Неделя: место, аватар, имя, обычный подъём и сколько утр встал с понедельника. */
  function board(s, list) {
    const lb = list.map((f) => ({ ...f, ...friendWeek(f) })).concat({ ...meP(s), name: me(s).name, n: 'Ты', me: true, ...myWeek(s) }).sort((a, b) => b.w - a.w || (a.avg ?? 1e4) - (b.avg ?? 1e4));
    return `<h3 class="pp-h">Неделя<span>утра с понедельника</span></h3>
      <div class="ap-card pp-lb">${lb.map((x, i) => `<div class="pp-lb-r${x.me ? ' me' : ''}"><b class="pp-rank r${i}">${i + 1}</b>${avatar({ ...x, n: x.me ? x.name : x.n, frame: '' }, 32)}<span>${esc(x.n)}</span><small>${x.avg != null ? `обычно ${K.fmtMin(x.avg)}` : ''}</small><em>${x.w}<u>/${dow() + 1}</u></em></div>`).join('')}</div>`;
  }
  /** Что можно сделать с человеком: добавить, принять или отклонить заявку, отменить свою. */
  function relBtn(s, p, where) {
    const rel = relOf(s, p.id);
    if (rel === 'friend') return where === 'friends' ? '' : `<span class="pp-tagr">${ic('check', 13, 3)}Друг</span>`;
    if (rel === 'in') return `<span class="pp-yn"><button class="pp-ok" data-act="pp-accept:${p.id}" aria-label="Принять заявку: ${esc(p.n)}">${ic('check', 18, 3)}</button><button class="pp-no" data-act="pp-decline:${p.id}" aria-label="Отклонить заявку: ${esc(p.n)}">${ic('x', 17, 2.8)}</button></span>`;
    if (rel === 'out') return where === 'sent' ? `<button class="pp-undo" data-act="pp-cancel:${p.id}">Отменить</button>` : `<span class="pp-tagr">Отправлено</span>`;
    return `<button class="pp-plus" data-act="pp-request:${p.id}">Добавить</button>`;
  }
  /** Человек в списках «Друзья»: аватар, имя с фамилией, ник или общие друзья, кнопка. */
  function pRow(s, p, where) {
    const mu = p.unknown ? 0 : mutual(s, p).length, isF = relOf(s, p.id) === 'friend', st = isF ? statusOf(p) : null;
    const sub = p.unknown ? 'заявка по коду' : (where === 'search' || where === 'friends' || !mu) ? '@' + p.nick : `${mu} ${K.pl(mu, 'общий друг', 'общих друга', 'общих друзей')}`;
    const who = `${avatar(flat(p), 46, st ? dotOf(st.k) : '')}<span class="pp-tx"><b class="pp-one">${esc(full(p))}</b><small>${esc(sub)}</small></span>`;
    const body = p.unknown ? `<span class="pp-who">${who}</span>` : `<button class="pp-who" data-act="pp-friend:${p.id}" aria-label="Профиль: ${esc(full(p))}">${who}${where === 'friends' ? K.chev() : ''}</button>`;
    return `<div class="pp-row">${body}${relBtn(s, p, where)}</div>`;
  }

  /* ── Вставай вместе ─────────────────────────────────────── */
  function invCard(s, x) {
    const g = OPEN.find((y) => y.id === x.g), from = byId(s, x.from);
    if (!g || !from) return '';
    return `<div class="ap-card pp-inv"><div class="pp-inv-t">${gtile(g, 46)}<span class="pp-tx"><b class="pp-one">${esc(g.name)}</b><small>${esc(from.n)} зовёт в группу · ${people(g.members.length)}</small></span></div>
      <div class="pp-inv-b"><button class="pp-inv-ok" data-act="pp-gjoin:${g.id}">Вступить</button><button class="pp-inv-no" data-act="pp-gno:${g.id}">Не сейчас</button></div></div>`;
  }
  function gRow(s, g) {
    const ms = membersOf(s, g), my = myStatus(s), all = ms.length + 1, up = ms.filter((p) => statusOf(p).k === 'up').length + (my.k === 'up' ? 1 : 0);
    return `<button class="pp-row pp-grow" data-act="pp-group:${g.id}"><span class="pp-who">${gtile(g, 46)}<span class="pp-tx"><b class="pp-one">${esc(g.name)}</b><small>${people(all)}${g.goal != null ? ` · до ${K.fmtMin(g.goal)}` : ''}</small></span></span>${ring(up, all)}</button>`;
  }
  function groupsBlock(s) {
    const gs = groups(s), n = net(s);
    return `${n.inv.map((x) => invCard(s, x)).join('')}
      ${gs.length ? `<div class="ap-card pp-list">${gs.map((g) => gRow(s, g)).join('')}</div>` : '<div class="pp-empty sm"><b>Групп пока нет</b><p>Семья, бег, работа — у каждой своя цель и своё утро</p></div>'}
      <div class="ap-card pp-list pp-after">
        <button class="pp-row pp-grow" data-act="pp-gcode"><span class="pp-who"><i class="pp-gt ghost" style="--s:46px">${ic('hash', 21, 2.4)}</i><span class="pp-tx"><b class="pp-one">Вступить по коду</b><small>Код вида SG-P7TX</small></span></span>${K.chev()}</button></div>`;
  }
  /** Утро друзей: кто встал, кто спит, кто проспал; неделя. Без друзей — пример и как это работает. */
  function morningPane(s) {
    const fr = mates(s), my = myStatus(s), n = net(s);
    const up = fr.filter((f) => statusOf(f).k === 'up').length + (my.k === 'up' ? 1 : 0), total = fr.length + 1;
    const late = fr.filter((f) => statusOf(f).k === 'late'), wake = late.filter((f) => !n.nudge[f.id]);
    if (!fr.length) {
      return `<div class="pp-empty"><span class="pp-trio">${avatar({ n: 'А', c: 4 }, 56)}${avatar(flat(meP(s)), 72)}${avatar({ n: 'М', c: 2 }, 56)}</span><b>Вставайте вместе</b><p>Утром видно, кто уже встал, а кто проспал — его можно разбудить</p></div>
        <div class="ap-card pp-list ex"><div class="pp-list-h"><b>Утро друзей</b><span class="pp-tag">Пример</span></div>
          ${EXAMPLE.map((x) => `<div class="pp-row ${x.k}"><span class="pp-who">${avatar(x, 46, dotOf(x.k))}<span class="pp-tx"><b>${x.n}</b><small>${x.k === 'up' ? `${v(x, 'встал', 'встала')} в ${x.t}` : x.k === 'late' ? `${v(x, 'не встал', 'не встала')} в ${x.t}` : `спит · будильник в ${x.t}`}</small></span></span>${x.k === 'up' ? `<span class="pp-cheer">${ic('party-popper', 18, 2.2)}</span>` : x.k === 'late' ? `<span class="pp-wake">${ic('bell-ring', 15, 2.4)}Разбудить</span>` : ''}</div>`).join('')}</div>`;
    }
    const day = morning(s, fr), strip = [{ ...meP(s), k: my.k }].concat(day.order.map((f) => ({ ...f, k: statusOf(f).k })));
    return `<div class="ap-card pp-sum"><b>${up === total ? 'Сегодня встали все' : `Уже встали ${up} из ${total}`}</b>
        <small>${wake.length ? `${wake.map((f) => f.n).join(', ')} ${wake.length > 1 ? 'не встали' : v(wake[0], 'не встал', 'не встала')} — можно разбудить` : late.length ? `${late.map((f) => f.n).join(', ')} — уже будим` : up === total ? 'Хорошее утро у всех' : 'Остальные ещё спят — их будильник впереди'}</small>
        <div class="pp-strip">${strip.slice(0, strip.length > 6 ? 5 : 6).map((x) => `<span class="pp-sv ${x.k}">${avatar(flat(x), 36)}</span>`).join('')}${strip.length > 6 ? `<span class="pp-sv more">+${strip.length - 5}</span>` : ''}</div>
        <div class="pp-bar"><i style="--p:${(up / total).toFixed(3)}"></i></div></div>
      <h3 class="pp-h">Сегодня<span>${fr.length} ${K.pl(fr.length, 'друг', 'друга', 'друзей')}</span></h3>${day.html}
      ${board(s, fr)}`;
  }
  /** Друзья: поиск сверху, ниже заявки, «возможно, знакомы», отправленные, друзья и свой код. */
  const friendsPane = (s) => `<div class="pp-q${s._ppQ ? ' has' : ''}">${ic('search', 18, 2.4)}<input class="js-ppq" type="search" value="${esc(s._ppQ || '')}" placeholder="Имя, ник или код" maxlength="40" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search" aria-label="Поиск: имя, ник или код"><button class="pp-qx" data-act="pp-qx" aria-label="Очистить поиск">${ic('x', 13, 3.2)}</button></div>
    <div class="pp-res">${results(s, s._ppQ || '')}</div>`;
  const TABS = [['morning', 'Утро'], ['groups', 'Группы'], ['friends', 'Друзья']];
  /*
   * «Вставай вместе» — три вкладки: утро друзей, группы, друзья. Вкладки меняются сразу, без анимации.
   * Справа сверху — добавить друга (со счётчиком заявок). Кнопка внизу — то, что нужно на этой вкладке.
   */
  function together(flow, enter = '', tab = '') {
    const s = flow.state, ask = asking(s).length, inv = net(s).inv.length;
    if (tab) s._ppTab = tab;
    const t = TABS.some((x) => x[0] === s._ppTab) ? s._ppTab : 'morning';
    const dot = (id) => (id === 'friends' && ask ? `<b class="pp-badge sm">${ask}</b>` : id === 'groups' && inv ? `<b class="pp-badge sm">${inv}</b>` : '');
    const seg = `<div class="ap-seg pp-tabs" role="tablist">${TABS.map(([id, name]) => `<button class="${t === id ? 'on' : ''}" data-act="pp-tab:${id}" role="tab" aria-selected="${t === id}">${name}${dot(id)}</button>`).join('')}</div>`;
    const add = `<button class="ap-x lg pp-hb" data-act="pp-tab:friends" aria-label="${ask ? `Добавить друга, заявок: ${ask}` : 'Добавить друга'}">${ic('user-plus', 19, 2.3)}${ask ? `<b class="pp-badge dot">${ask}</b>` : ''}</button>`;
    const body = t === 'groups' ? groupsBlock(s) : t === 'friends' ? friendsPane(s) : morningPane(s);
    const foot = t === 'groups' ? `<button class="ap-btn" data-act="pp-gnew">${ic('plus', 19, 2.6)}Новая группа</button>` : t === 'friends' ? `<button class="ap-btn" data-act="pp-invite">${ic('send', 19, 2.3)}Позвать друга</button>` : mates(s).length ? '' : `<button class="ap-btn" data-act="pp-tab:friends">${ic('search', 19, 2.4)}Найти друзей</button>`;
    flow.sheet(`${head(flow, 'Вставай вместе', add)}<div class="pp-tabbar">${seg}</div><div class="ap-sh-body scroll pp-tb-${t}" data-pp="together:${t}">${body}</div>${foot ? `<div class="ap-sh-foot">${foot}</div>` : ''}`, cls(enter));
    const inp = flow.sheets.querySelector('.js-ppq'), res = flow.sheets.querySelector('.pp-res');
    if (inp) {
      inp.addEventListener('input', () => { s._ppQ = inp.value; inp.parentElement.classList.toggle('has', !!inp.value); res.innerHTML = results(s, inp.value); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); });
    }
  }

  /* ── Друзья: поиск, заявки, список ──────────────────────── */
  const norm = (x) => String(x || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim().replace(/^@/, '');
  /** Код друга в тексте: SN-7K2Q, sn7k2q или четыре знака с цифрой; можно вставить целое приглашение. */
  function codeIn(q) {
    const u = String(q || '').toUpperCase(), m = u.match(/\bSN-?([A-Z0-9]{4})\b/);
    if (m) return 'SN-' + m[1];
    const b = u.replace(/\s+/g, '').match(/^([A-Z0-9]{4})$/);
    return b && /\d/.test(b[1]) ? 'SN-' + b[1] : '';
  }
  function match(p, t, code) {
    if (code && p.code === code) return true;
    const name = norm(full(p));
    return name.startsWith(t) || name.split(' ').some((w) => w.startsWith(t)) || p.nick.includes(t);
  }
  function results(s, q) {
    const t = norm(q);
    if (!t) return homeList(s);
    const code = codeIn(q), mine = me(s).code;
    if (code && code === mine) return `<div class="pp-none">${ic('hash', 28, 2.2)}<b>Это твой код</b><p>По нему тебя находят друзья</p></div>`;
    const hit = DIR.filter((p) => match(p, t, code)).slice(0, 12);
    let html = hit.length ? `<h3 class="pp-h">Люди<span>${hit.length}</span></h3><div class="ap-card pp-list">${hit.map((p) => pRow(s, p, 'search')).join('')}</div>` : '';
    if (code && !hit.length) {
      const x = net(s).extra.find((p) => p.code === code);
      html = `<h3 class="pp-h">По коду</h3><div class="ap-card pp-list"><div class="pp-row"><span class="pp-who">${avatar({ unknown: true, c: 6 }, 46)}<span class="pp-tx"><b class="pp-one">${code}</b><small>${x ? 'заявка отправлена' : 'код друга'}</small></span></span>${x ? `<button class="pp-undo" data-act="pp-cancel:${x.id}">Отменить</button>` : `<button class="pp-plus" data-act="pp-addcode:${code}">Добавить</button>`}</div></div>`;
    }
    return html || `<div class="pp-none">${ic('search', 28, 2.2)}<b>Никого не нашли</b><p>Попроси у друга ник или код</p></div>`;
  }
  function homeList(s) {
    const ask = asking(s), out = sent(s), fr = mates(s), sug = suggest(s), m = me(s);
    let h = '';
    if (ask.length) h += `<h3 class="pp-h">Заявки<span>${ask.length}</span></h3><div class="ap-card pp-list">${ask.map((p) => pRow(s, p, 'in')).join('')}</div>`;
    if (sug.length) h += `<h3 class="pp-h">Возможно, знакомы</h3><div class="ap-card pp-list">${sug.map((p) => pRow(s, p, 'sug')).join('')}</div>`;
    if (out.length) h += `<h3 class="pp-h">Отправленные</h3><div class="ap-card pp-list">${out.map((p) => pRow(s, p, 'sent')).join('')}</div>`;
    h += `<h3 class="pp-h">Мои друзья<span>${fr.length || ''}</span></h3>${fr.length ? `<div class="ap-card pp-list">${fr.map((p) => pRow(s, p, 'friends')).join('')}</div>` : '<div class="ap-card pp-hint">Пока никого — найди по имени или нику</div>'}`;
    h += `<div class="ap-card pp-code"><span><small>Твой код</small><b>${m.code}</b></span><button class="pp-copy" data-act="pp-copy">${ic('copy', 16, 2.3)}Копировать</button></div>`;
    return h;
  }
  /* ── Человек: друг, участник группы или кто-то из поиска ── */
  function person(flow, enter, id) {
    const s = flow.state, p = byId(s, id);
    if (!p || p.unknown) { back(flow); return; }
    const rel = relOf(s, id), isF = rel === 'friend', common = groups(s).filter((g) => g.members.includes(id)), see = isF || common.length > 0;
    const mu = mutual(s, p), st = statusOf(p), wk = friendWeek(p), n = net(s);
    const status = st.k === 'up' ? `<span class="pp-pill up">${ic('check', 13, 3.2)}${v(p, 'Встал', 'Встала')} в ${K.fmtMin(st.t)}</span>` : st.k === 'late' ? `<span class="pp-pill late">${ic('bell', 13, 2.6)}${v(p, 'Не встал', 'Не встала')} в ${K.fmtMin(p.al)}</span>` : `<span class="pp-pill sleep">${si('moon', 13)}Спит до ${K.fmtMin(p.al)}</span>`;
    let body = `<div class="pp-cover">${banner(p.ban)}</div>
      <div class="pp-id">${avatar(p, 96, '', 'big')}<div class="pp-id-t"><b>${esc(full(p))}</b>${p.bio ? `<p>${esc(p.bio)}</p>` : ''}${see ? status : `<small>@${esc(p.nick)}</small>`}</div></div>`;
    if (see) {
      body += `<div class="pp-stats three">${tile('fire', si('flame', 18), p.streak, `${K.pl(p.streak, 'день', 'дня', 'дней')} подряд`)}${tile('blue', ic('alarm-clock', 17, 2.4), K.fmtMin(p.al), 'будильник')}${tile('sun', si('rise', 18), `${wk.w}/${dow() + 1}`, 'на неделе')}</div>
        <div class="ap-card pp-wk">${DAYS.map((d, i) => `<span class="${wk.days[i] ? 'on' : i > dow() ? 'next' : 'miss'}${i === dow() ? ' now' : ''}"><small>${d}</small><i>${wk.days[i] ? ic('check', 13, 3.4) : ''}</i></span>`).join('')}</div>`;
    } else {
      body += `<div class="pp-stats">${tile('fire', si('flame', 18), p.streak, `${K.pl(p.streak, 'день', 'дня', 'дней')} подряд`)}${tile('blue', ic('users', 17, 2.4), mu.length, K.pl(mu.length, 'общий друг', 'общих друга', 'общих друзей'))}</div>
        <div class="ap-card pp-hint pp-lockn">${si('lock', 15)}Утро видно друзьям и группе</div>`;
    }
    if (mu.length) body += `<h3 class="pp-h">Общие друзья</h3><div class="ap-card pp-mut"><span class="pp-stack">${mu.slice(0, 4).map((f) => avatar(flat(f), 32)).join('')}</span><span class="pp-one">${esc(mu.map((f) => f.n).join(', '))}</span></div>`;
    if (isF && groups(s).length) {
      body += `<h3 class="pp-h">Мои группы<span>${common.length ? `в ${common.length} из ${groups(s).length}` : 'отметь, куда добавить'}</span></h3>
        <div class="ap-card pp-list">${groups(s).map((g) => { const on = g.members.includes(id); return `<button class="pp-row pp-chk${on ? ' on' : ''}" data-act="pp-gtoggle:${g.id}:${id}" role="checkbox" aria-checked="${on}"><span class="pp-who">${gtile(g, 46)}<span class="pp-tx"><b class="pp-one">${esc(g.name)}</b><small>${people(g.members.length + 1)}</small></span></span><i class="pp-box">${ic('check', 14, 3.4)}</i></button>`; }).join('')}</div>`;
    } else if (common.length) {
      body += `<h3 class="pp-h">Общие группы</h3><div class="ap-card pp-list">${common.map((g) => gRow(s, g)).join('')}</div>`;
    }
    if (isF) body += `<button class="ap-card pp-danger${s._ppAsk === 'unfriend:' + id ? ' ask' : ''}" data-act="pp-unfriend:${id}">${ic('user-x', 18, 2.3)}${s._ppAsk === 'unfriend:' + id ? 'Точно удалить из друзей?' : 'Удалить из друзей'}</button>`;
    let act = '';
    if (isF && st.k === 'up') act = `<button class="ap-btn${n.cheer[id] ? ' ghost' : ''}" data-act="pp-cheer:${id}">${ic('party-popper', 19, 2.3)}${n.cheer[id] ? 'Поздравили' : 'Поздравить'}</button>`;
    else if (see && st.k === 'late') act = n.nudge[id] ? `<button class="ap-btn ghost" disabled>${ic('check', 19, 2.6)}Будим</button>` : `<button class="ap-btn pp-btn-wake" data-act="pp-wake:${id}">${ic('bell-ring', 19, 2.3)}Разбудить</button>`;
    else if (rel === 'in') act = `<div class="pp-two"><button class="ap-btn ghost" data-act="pp-decline:${id}">Отклонить</button><button class="ap-btn pp-btn-ok" data-act="pp-accept:${id}">${ic('check', 19, 2.8)}Принять</button></div>`;
    else if (rel === 'out') act = `<button class="ap-btn ghost" data-act="pp-cancel:${id}">Отменить заявку</button>`;
    else if (!rel) act = `<button class="ap-btn pp-btn-ok" data-act="pp-request:${id}">${ic('user-plus', 19, 2.4)}Добавить в друзья</button>`;
    flow.sheet(`${head(flow, esc(p.n))}<div class="ap-sh-body scroll" data-pp="friend:${id}">${body}</div>${act ? `<div class="ap-sh-foot">${act}</div>` : ''}`, cls(enter));
  }

  /* ── Группа ─────────────────────────────────────────────── */
  function groupSheet(flow, enter, gid) {
    const s = flow.state, g = groupOf(s, gid);
    if (!g) { back(flow); return; }
    const ms = membersOf(s, g), my = myStatus(s), all = ms.length + 1;
    const upBy = (lim) => ms.filter((p) => { const x = statusOf(p); return x.k === 'up' && x.t <= lim; }).length + (my.k === 'up' && my.t <= lim ? 1 : 0);
    const up = upBy(g.goal != null ? g.goal : 1e4);
    /* «Дней вместе» — столько утр подряд вставали все: не больше самой короткой серии в группе. */
    const allDays = Math.min(K.stats(s).streak, ...ms.map((p) => p.streak));
    const wakes = ms.map((p) => p.al + (p.up == null ? 3 : p.up)), mw = myWeek(s).avg;
    if (mw != null) wakes.push(mw);
    const avg = wakes.length ? Math.round(wakes.reduce((a, x) => a + x, 0) / wakes.length) : null;
    const third = tile('blue', ic('alarm-clock', 17, 2.4), avg != null ? K.fmtMin(avg) : '—', 'обычно');
    let body = `<div class="pp-gh">${gtile(g, 72)}<b class="pp-one">${esc(g.name)}</b><small>${people(all)} · ${g.goal != null ? `встать до ${K.fmtMin(g.goal)}` : 'без цели по времени'}</small></div>
      <div class="pp-stats three">${tile('fire', si('flame', 18), allDays, `${K.pl(allDays, 'день', 'дня', 'дней')} вместе`)}${tile('sun', si('rise', 18), `${up}/${all}`, g.goal != null ? `до ${K.fmtMin(g.goal)}` : 'встали')}${third}</div>`;
    body += `<h3 class="pp-h">Сегодня</h3>${morning(s, ms).html}`;
    if (!ms.length) body += '<div class="ap-card pp-hint pp-after">Пока ты один — позови друзей</div>';
    else body += board(s, ms);
    body += `<div class="ap-card pp-code"><span><small>Код группы</small><b>${g.code}</b></span><button class="pp-copy" data-act="pp-gcopy:${g.id}">${ic('copy', 16, 2.3)}Копировать</button></div>`;
    flow.sheet(`${head(flow, esc(g.name), `<button class="pp-ed" data-act="pp-gedit:${g.id}">Изменить</button>`)}<div class="ap-sh-body scroll" data-pp="group:${g.id}">${body}</div>
      <div class="ap-sh-foot"><button class="ap-btn" data-act="pp-ginv:${g.id}">${ic('user-plus', 19, 2.4)}Пригласить</button></div>`, cls(enter));
  }
  /** Черновик группы: новая или копия существующей — правки применяются по «Готово». */
  function draftFor(s, id) {
    const g = id === 'new' ? null : groupOf(s, id);
    s._ppDraft = g ? { id: g.id, name: g.name, icon: g.icon, c: g.c % 6, goal: g.goal, members: g.members.slice() } : { id: null, name: '', icon: 'sunrise', c: (groups(s).length * 2 + 4) % 6, goal: null, members: [] };
    return s._ppDraft;
  }
  function keepDraft(flow) {
    const d = flow.state._ppDraft, n = flow.sheets.querySelector('.js-pgname');
    if (d && n) d.name = n.value.replace(/\s+/g, ' ').trim().slice(0, 22);
  }
  function groupEdit(flow, enter, id) {
    const s = flow.state, isNew = id === 'new', g = isNew ? null : groupOf(s, id), d = s._ppDraft && (isNew ? !s._ppDraft.id : s._ppDraft.id === id) ? s._ppDraft : draftFor(s, id);
    if (!isNew && !g) { back(flow); return; }
    const [a, b] = AV[d.c % AV.length], fr = mates(s);
    const list = fr.concat(d.members.filter((x) => !fr.some((f) => f.id === x)).map((x) => byId(s, x)).filter(Boolean));
    const own = !g || g.by === 'me', ask = s._ppAsk === 'gleave:' + id;
    let body = `<div class="pp-gprev">${gtile(d, 76)}</div>
      <div class="ap-card pp-form"><label><small>Название</small><input class="js-pgname" value="${esc(d.name)}" maxlength="22" placeholder="Например: Утренний бег" autocomplete="off"></label></div>
      <h3 class="pp-h">Значок</h3>
      <div class="pp-glyphs" role="radiogroup" aria-label="Значок группы" style="--a:${a};--b:${b}">${GLYPHS.map(([x, name]) => `<button class="${d.icon === x ? 'on' : ''}" data-act="pp-gicon:${x}" role="radio" aria-checked="${d.icon === x}" aria-label="${name}">${ic(x, 22, 2.2)}</button>`).join('')}</div>
      <div class="pp-gcolors" role="radiogroup" aria-label="Цвет группы">${AV.slice(0, 6).map(([x, y], i) => `<button class="${i === d.c ? 'on' : ''}" style="--a:${x};--b:${y}" data-act="pp-gcolor:${i}" role="radio" aria-checked="${i === d.c}" aria-label="Цвет ${i + 1}"></button>`).join('')}</div>
      <h3 class="pp-h">Цель</h3>
      <div class="ap-card ap-list"><div class="ap-row tall"><i class="ap-row-i">${ic('target', 17, 2.2)}</i><span>Цель по времени<small class="js-ggt">${d.goal != null ? `Встать до ${K.fmtMin(d.goal)}` : 'Без цели по времени'}</small></span><button class="ap-tg sm${d.goal != null ? ' on' : ''}" data-act="pp-ggoal" role="switch" aria-checked="${d.goal != null}" aria-label="Цель по времени"></button></div></div>
      ${d.goal != null ? '<div class="ap-card ap-ed-time pp-gwheel"><div class="js-gwheel"></div></div>' : ''}
      <h3 class="pp-h">Участники<span>${d.members.length ? `выбрано ${d.members.length}` : 'кроме тебя'}</span></h3>`;
    body += list.length ? `<div class="ap-card pp-list">${list.map((p) => { const on = d.members.includes(p.id); return `<button class="pp-row pp-chk${on ? ' on' : ''}" data-act="pp-gm:${p.id}" role="checkbox" aria-checked="${on}"><span class="pp-who">${avatar(flat(p), 46)}<span class="pp-tx"><b class="pp-one">${esc(full(p))}</b><small>${relOf(s, p.id) === 'friend' ? '@' + esc(p.nick) : 'не в друзьях'}</small></span></span><i class="pp-box">${ic('check', 14, 3.4)}</i></button>`; }).join('')}</div>`
      : `<button class="ap-card pp-list pp-row pp-grow" data-act="pp-people:push"><span class="pp-who"><i class="pp-gt ghost" style="--s:46px">${ic('user-plus', 21, 2.3)}</i><span class="pp-tx"><b class="pp-one">Найти друзей</b><small>Позвать можно и потом</small></span></span>${K.chev()}</button>`;
    if (!isNew) body += `<button class="ap-card pp-danger${ask ? ' ask' : ''}" data-act="pp-gleave:${id}">${ic(own ? 'trash-2' : 'log-out', 18, 2.3)}${ask ? (own ? 'Точно удалить группу?' : 'Точно выйти из группы?') : (own ? 'Удалить группу' : 'Выйти из группы')}</button>`;
    flow.sheet(`${head(flow, isNew ? 'Новая группа' : 'Группа', `<button class="pp-ed" data-act="pp-gsave">${isNew ? 'Создать' : 'Готово'}</button>`)}<div class="ap-sh-body scroll" data-pp="gedit:${id}">${body}</div>`, cls(enter));
    const host = flow.sheets.querySelector('.js-gwheel');
    if (host && d.goal != null) Sonly.wheel(host, { h: Math.floor(d.goal / 60), m: d.goal % 60, onChange: (h, m) => { d.goal = h * 60 + m; const g = flow.sheets.querySelector('.js-ggt'); if (g) g.textContent = `Встать до ${K.fmtMin(d.goal)}`; } });
  }
  /** Вступить в группу по коду. */
  function groupJoin(flow, enter) {
    flow.sheet(`${head(flow, 'Вступить по коду')}<div class="ap-sh-body scroll" data-pp="gjoin">
        <div class="pp-empty sm"><i class="pp-gt ghost" style="--s:72px">${ic('hash', 32, 2.3)}</i><b>Код группы</b><p>Его даёт тот, кто создал группу</p></div>
        <div class="ap-card pp-join"><input class="js-pgcode" placeholder="Например, SG-P7TX" maxlength="60" autocapitalize="characters" autocomplete="off" spellcheck="false" aria-label="Код группы"><button class="pp-add" data-act="pp-gjoin">Вступить</button></div></div>`, cls(enter));
  }
  function groupInvite(flow, enter, gid) {
    const s = flow.state, g = groupOf(s, gid);
    if (!g) { back(flow); return; }
    const fr = mates(s);
    const body = (fr.length ? `<h3 class="pp-h">Друзья<span>сразу в группе</span></h3><div class="ap-card pp-list">${fr.map((p) => `<div class="pp-row"><span class="pp-who">${avatar(flat(p), 46)}<span class="pp-tx"><b class="pp-one">${esc(full(p))}</b><small>@${esc(p.nick)}</small></span></span>${g.members.includes(p.id) ? `<span class="pp-tagr">${ic('check', 13, 3)}В группе</span>` : `<button class="pp-plus" data-act="pp-gadd:${g.id}:${p.id}">Добавить</button>`}</div>`).join('')}</div>` : '')
      + `<button class="ap-card pp-list pp-row pp-grow${fr.length ? ' pp-after' : ''}" data-act="pp-people:push"><span class="pp-who"><i class="pp-gt ghost" style="--s:46px">${ic('search', 20, 2.4)}</i><span class="pp-tx"><b class="pp-one">Найти друзей</b><small>По имени, нику или коду</small></span></span>${K.chev()}</button>
      <h3 class="pp-h">Или по коду<span>вступит кто угодно</span></h3><div class="ap-card pp-code pp-code-g"><span><small>Код группы</small><b>${g.code}</b></span><button class="pp-copy" data-act="pp-gcopy:${g.id}">${ic('copy', 16, 2.3)}Копировать</button></div>`;
    flow.sheet(`${head(flow, 'Пригласить')}<div class="ap-sh-body scroll" data-pp="ginv:${g.id}">${body}</div>
      <div class="ap-sh-foot"><button class="ap-btn" data-act="pp-gshare:${g.id}">${ic('send', 19, 2.3)}Отправить приглашение</button></div>`, cls(enter));
  }
  /** Вступить в группу из приглашения или по коду. */
  function join(flow, og) {
    const s = flow.state, n = net(s);
    n.inv = n.inv.filter((x) => x.g !== og.id);
    if (groupOf(s, og.id)) { s._ppMsg = 'Ты уже в этой группе'; return groupOf(s, og.id); }
    const g = { ...og, members: og.members.slice() };
    n.groups.push(g);
    s._ppMsg = `Ты в группе «${g.name}»`;
    return g;
  }

  /* ── Профиль ────────────────────────────────────────────── */
  /** Четыре цифры без повторов: пока серия не рвалась, рекорд и «утр всего» равны ей — вместо них другие факты. */
  function numbers(s) {
    const st = K.stats(s), h = st.h, wakes = h.map((x) => x.wake).sort((a, b) => a - b), secs = h.filter((x) => x.secs).map((x) => x.secs);
    const streak = tile('fire', si('flame', 18), st.streak, `${K.pl(st.streak, 'день', 'дня', 'дней')} подряд`);
    if (!h.length) return [streak, tile('sun', si('rise', 18), 0, 'утр всего'), tile('gold', ic('trophy', 17, 2.4), 0, 'рекорд серии'), tile('blue', ic('alarm-clock', 17, 2.4), '—', 'обычно встаёшь')].join('');
    const out = [streak];
    if (st.best > st.streak) out.push(tile('gold', ic('trophy', 17, 2.4), st.best, 'рекорд серии'));
    if (h.length > st.best) out.push(tile('sun', si('rise', 18), h.length, `${K.pl(h.length, 'утро', 'утра', 'утр')} всего`));
    out.push(tile('sun', si('rise', 18), K.fmtMin(wakes[0]), 'самый ранний'));
    if (secs.length) out.push(tile('violet', ic('zap', 17, 2.4), `${Math.min(...secs)} с`, 'быстрее всего'));
    out.push(tile('blue', ic('alarm-clock', 17, 2.4), K.fmtMin(Math.round(wakes.reduce((a, x) => a + x, 0) / wakes.length)), 'обычно встаёшь'));
    return out.slice(0, 4).join('');
  }
  const TIER_RANK = { myth: 0, legend: 1, epic: 2, rare: 3, common: 4 };
  /** Аватар, по которому можно сразу выбрать своё фото: значок камеры в углу. */
  const avUp = (s, size) => `<label class="pp-avup" aria-label="Поставить своё фото">${avatar(meP(s), size, '', 'big')}<b class="pp-cam">${ic('camera', 15, 2.4)}</b><input type="file" accept="image/*" class="js-ppphoto"></label>`;
  function profile(flow, enter = '') {
    const s = flow.state, m = me(s), h = K.stats(s).h;
    const fr = mates(s), gs = groups(s), ask = asking(s).length;
    const bd = K.badges ? K.badges(s) : [], got = bd.filter((b) => b.on).sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
    /* «С какого времени в sonly» — не позже первого подъёма в истории (в демо история начинается раньше первого открытия профиля). */
    const sd = new Date(Math.min(m.since, h.length ? h[0].d.getTime() : m.since)), since = `${MONTHS[sd.getMonth()]} ${sd.getFullYear()}`;
    const friendsRow = `<div class="pp-frow"><button class="pp-fc add" data-act="pp-tfriends"><i class="pp-av ghost" style="--s:58px">${ic('user-plus', 22, 2.3)}</i><small>${ask ? `Заявки: ${ask}` : 'Добавить'}</small></button>${fr.map((f) => `<button class="pp-fc" data-act="pp-friend:${f.id}" aria-label="Профиль: ${esc(f.n)}">${avatar(flat(f), 58, dotOf(statusOf(f).k))}<small>${esc(f.n)}</small></button>`).join('')}</div>`;
    const badgeRow = `<div class="pp-brow">${(got.length ? got : bd.slice(0, 5)).slice(0, 8).map((b) => `<button class="pp-bd${b.on ? ' on' : ''}" data-act="pp-badge:${b.id}" aria-label="${K.bdName(b)}${b.on ? '' : ' — ещё не получен'}">${K.hex(b, 50)}<small>${K.bdName(b)}</small></button>`).join('')}<button class="pp-bd more" data-act="pp-badges" aria-label="Все значки"><i class="pp-more">${ic('chevron-right', 20, 2.6)}</i><small>Все</small></button></div>`;
    flow.sheet(`${head(flow, 'Профиль', '<button class="pp-ed" data-act="pp-edit">Изменить</button>')}
      <div class="ap-sh-body scroll" data-pp="profile">
        <button class="pp-cover" data-act="pp-edit" aria-label="Изменить оформление">${banner(m.ban)}</button>
        <div class="pp-id">${avUp(s, 96)}<div class="pp-id-t">${m.name ? `<b>${esc(m.name)}</b>` : '<button class="pp-noname" data-act="pp-edit">Добавить имя</button>'}${m.bio ? `<p>${esc(m.bio)}</p>` : ''}<small>${m.nick ? `@${esc(m.nick)} · ` : ''}${m.code}</small></div></div>
        <div class="pp-stats">${numbers(s)}</div>
        <h3 class="pp-h">Друзья<span>${fr.length ? `${fr.length} ${K.pl(fr.length, 'друг', 'друга', 'друзей')}` : 'утром видно, кто встал'}</span></h3>
        ${friendsRow}
        <h3 class="pp-h">Группы${gs.length ? `<span>${gs.length}</span>` : ''}</h3>
        ${gs.length ? `<div class="ap-card pp-list">${gs.slice(0, 3).map((g) => gRow(s, g)).join('')}${gs.length > 3 ? `<button class="pp-row pp-grow pp-all" data-act="pp-tgroups"><span class="pp-who"><span class="pp-tx"><b class="pp-one">Все группы</b></span></span>${K.chev()}</button>` : ''}</div>`
          : `<button class="ap-card pp-list pp-row pp-grow" data-act="pp-tgroups"><span class="pp-who"><i class="pp-gt ghost" style="--s:46px">${ic('users-round', 21, 2.3)}</i><span class="pp-tx"><b class="pp-one">Вставай с группой</b><small>Семья, бег или работа</small></span></span>${K.chev()}</button>`}
        ${bd.length ? `<h3 class="pp-h">Значки<span>${got.length} из ${bd.length}</span></h3>${badgeRow}` : ''}
        <button class="ap-card pp-album" data-act="mo-album"><i class="pp-ic" style="--a:#BF5AF2;--b:#8944D8">${si('cards', 18)}</i><span><b>Открытки утра</b><small>${h.length ? `${h.length} ${K.pl(h.length, 'открытка', 'открытки', 'открыток')}` : 'Первая — завтра утром'}</small></span>${K.chev()}</button>
        <p class="pp-since">В sonly с ${since}</p>
      </div>`, cls(enter));
    hookPhoto(flow);
  }
  /* Значки из профиля открываются на том же листе: назад — к профилю, а не на экран под ним. */
  function badgesView(flow, enter) {
    flow.sheet(`${head(flow, 'Значки')}<div class="ap-sh-body scroll" data-pp="badges">${K.badgeList(flow.state, 'pp-badge')}</div>`, cls(enter));
  }
  function badgeView(flow, enter, id) {
    const b = K.badges(flow.state).find((x) => x.id === id);
    if (!b) { back(flow); return; }
    flow.sheet(`${head(flow, '<span data-k="Значок·награда">Значок</span>')}<div class="ap-sh-body scroll bd-page" data-pp="badge:${id}">${K.badgeOne(b)}</div>`, cls(enter));
  }
  /** Выбор фото с телефона — на аватаре профиля и в «Оформлении». */
  function hookPhoto(flow) {
    const file = flow.sheets.querySelector('.js-ppphoto');
    if (file) file.addEventListener('change', () => photo(flow, file.files && file.files[0]));
  }

  /* ── Оформление профиля ─────────────────────────────────── */
  function editSheet(flow, enter = 'push') {
    const s = flow.state, m = me(s), b = K.stats(s).best, scenes = (Sonly.morning && Sonly.morning.scenes) || [];
    const lockTag = (need) => `<i class="pp-lock">${si('lock', 11)}${need} ${K.pl(need, 'утро', 'утра', 'утр')}</i>`;
    const kinds = [['letter', 'Буква', avatar({ n: m.name || 'А', c: m.c }, 52)], ['brain', 'Мозг', avatar({ c: m.c, ava: 'brain' }, 52)],
      ['photo', 'Фото', m.photo ? avatar({ c: m.c, ava: 'photo', photo: m.photo }, 52) : `<i class="pp-av ghost" style="--s:52px">${ic('camera', 20, 2.2)}</i>`]];
    flow.sheet(`${head(flow, 'Оформление', '<button class="pp-ed" data-act="pp-save">Готово</button>')}
      <div class="ap-sh-body scroll" data-pp="edit">
        <div class="pp-prev"><span class="pp-cover sm">${banner(m.ban)}</span>${avatar(meP(s), 76, '', 'big')}<b>${m.name ? esc(m.name) : 'Твоё имя'}</b><small>${m.bio ? esc(m.bio) : m.code}</small></div>
        <h3 class="pp-h">Аватар</h3>
        <div class="pp-kinds">${kinds.map(([k, name, face]) => (k === 'photo'
          ? `<label class="pp-kind${m.ava === k ? ' on' : ''}">${face}<small>${name}</small><input type="file" accept="image/*" class="js-ppphoto" aria-label="Выбрать фото"></label>`
          : `<button class="pp-kind${m.ava === k ? ' on' : ''}" data-act="pp-ava:${k}">${face}<small>${name}</small></button>`)).join('')}</div>
        <div class="pp-colors" role="radiogroup" aria-label="Цвет">${AV.map(([a, c], i) => `<button class="${i === m.c ? 'on' : ''}" style="--a:${a};--b:${c}" data-act="pp-color:${i}" role="radio" aria-checked="${i === m.c}" aria-label="Цвет ${i + 1}"></button>`).join('')}</div>
        <h3 class="pp-h">Имя и о себе</h3>
        <div class="ap-card pp-form"><label><small>Имя</small><input class="js-ppname" value="${esc(m.name)}" maxlength="20" placeholder="Как тебя зовут" autocomplete="given-name"></label>
          <label><small>О себе</small><input class="js-ppbio" value="${esc(m.bio)}" maxlength="34" placeholder="Например: бегаю до работы" autocomplete="off"></label>
          <label><small>Ник — по нему тебя найдут</small><span class="pp-nick">@<input class="js-ppnick" value="${esc(m.nick)}" maxlength="20" placeholder="например, nazar.up" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></span></label></div>
        <h3 class="pp-h">Обложка<span>пейзажи открывает серия</span></h3>
        <div class="pp-bans">${GRAD.map(([id, name]) => `<button class="pp-ban${m.ban === 'g:' + id ? ' on' : ''}" data-act="pp-ban:g:${id}"><span class="pp-ban-c">${banner('g:' + id)}</span><small>${name}</small></button>`).join('')}${scenes.map(([id, full2, need]) => ({ id, need, name: id === 'aurora' ? 'Сияние' : full2 })).map(({ id, name, need }) => (need <= b
          ? `<button class="pp-ban${m.ban === 'l:' + id ? ' on' : ''}" data-act="pp-ban:l:${id}"><span class="pp-ban-c">${banner('l:' + id)}</span><small>${name}</small></button>`
          : `<span class="pp-ban off" aria-label="«${name}» откроется за ${need} утр подряд"><span class="pp-ban-c">${banner('l:' + id)}${lockTag(need)}</span><small>${name}</small></span>`)).join('')}</div>
        <h3 class="pp-h">Рамка<span>за лучшую серию</span></h3>
        <div class="pp-frames">${FRAMES.map(([id, name, need]) => (need <= b
          ? `<button class="pp-frm${m.frame === id ? ' on' : ''}" data-act="pp-frame:${id}">${avatar({ ...meP(s), frame: id }, 52)}<small>${name}</small></button>`
          : `<span class="pp-frm off">${avatar({ ...meP(s), frame: id }, 52)}${lockTag(need)}<small>${name}</small></span>`)).join('')}</div>
      </div>`, cls(enter));
    hookPhoto(flow);
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
    const k = flow.sheets.querySelector('.js-ppnick');
    if (k) {
      /* Ник: латиница, цифры, точка и подчёркивание; занятый ник из примера не берём. */
      const v2 = k.value.toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9._]/g, '').slice(0, 20);
      if (v2 && DIR.some((p) => p.nick === v2)) flow.state._ppMsg = `Ник @${v2} уже занят`;
      else m.nick = v2.length >= 3 ? v2 : '';
    }
  }
  const syncTabs = (flow) => { if (flow.id === 'home' || flow.id === 'settings' || flow.id === 'morning') flow.rerender(true); };
  function redrawEdit(flow) { redraw(flow); syncTabs(flow); }

  /* Заявку человек из примера принимает через пару секунд — так видно весь путь: отправил, принял, он в друзьях. */
  function later(flow, id) {
    if (flow.shot) return;
    setTimeout(() => {
      const s = flow.state, p = byId(s, id);
      if (!p || p.unknown || relOf(s, id) !== 'out') return;
      net(s).rel[id] = 'friend';
      s._ppMsg = `${p.n} ${v(p, 'принял', 'приняла')} заявку`;
      redraw(flow, true);
      if (!flow.sheets.querySelector('[data-pp]')) s._ppMsg = '';
      syncTabs(flow);
    }, 2400 + Math.round(Math.random() * 1200));
  }

  Sonly.people = {
    card,
    profile: (flow) => open(flow, 'profile'),
    together: (flow) => open(flow, 'together'),
    /** Маленький аватар для шапки главной и карточки в настройках. */
    avatar: (s, size) => { const p = meP(s); return avatar(p, p.frame && p.frame !== 'none' ? size - 10 : size); },
    name: (s) => me(s).name,
    /** Для значков: друзья, группы, поздравлял ли, будил ли, есть ли имя с аватаром, встала ли вся группа до цели. */
    facts(s) {
      const n = net(s), m = me(s), gs = groups(s), my = myStatus(s);
      const squad = gs.some((g) => { const ms = membersOf(s, g); return g.goal != null && ms.length && my.k === 'up' && my.t <= g.goal && ms.every((p) => { const x = statusOf(p); return x.k === 'up' && x.t <= g.goal; }); });
      return { friends: mates(s).length, groups: gs.length, cheer: +Object.values(n.cheer).some(Boolean), nudge: +Object.values(n.nudge).some(Boolean), face: +!!(m.name && ((m.ava === 'photo' && m.photo) || m.ava === 'brain')), squad: +squad };
    },
    /** Снимки и проверки: лист сразу, со стопкой «назад», как если бы до него дошли пальцем. */
    preview(flow, what) {
      const s = flow.state, st = nav(s), [k, a] = what.split(/-(.*)/s);
      st.length = 0;
      const show = (...views) => { st.push(...views); draw(flow, views[views.length - 1], ''); };
      if (k === 'together') show('together:' + (a || 'morning'));
      else if (k === 'edit') show('profile', 'edit');
      else if (k === 'people') show('together:friends');
      else if (k === 'q') { s._ppQ = a || ''; show('together:friends'); }
      else if (k === 'gjoin') show('together:groups', 'gjoin');
      else if (k === 'friend') show('together', 'friend:' + (a || 'anya'));
      else if (k === 'group') show('together', 'group:' + (a || 'run'));
      else if (k === 'gedit') { draftFor(s, a || 'new'); show('together', 'gedit:' + (a || 'new')); }
      else if (k === 'ginv') show('together', 'group:' + (a || 'run'), 'ginv:' + (a || 'run'));
      else show('profile');
    },
    on(flow, act, arg) {
      const s = flow.state, n = net(s), find = (id) => byId(s, id);
      const say = (msg) => { s._ppMsg = msg; redraw(flow); };
      switch (act) {
        case 'pp-profile': keep(flow); syncTabs(flow); open(flow, 'profile', arg === 'push' || arg === 'back' ? arg : ''); return true;
        case 'pp-together': if (arg !== 'push') s._ppTab = 'morning'; open(flow, 'together', arg === 'push' ? 'push' : ''); return true;
        case 'pp-people': {
          const st = nav(s);
          if ((st[st.length - 1] || '').startsWith('together')) { this.on(flow, 'pp-tab', 'friends'); return true; }
          open(flow, 'together:friends', arg === 'push' ? 'push' : '');
          return true;
        }
        case 'pp-tfriends': open(flow, 'together:friends', 'push'); return true;
        case 'pp-tgroups': open(flow, 'together:groups', 'push'); return true;
        case 'pp-gcode': open(flow, 'gjoin', 'push'); return true;
        /* Вкладки «Вставай вместе» меняются на месте, без анимации, прокрутка — к началу. */
        case 'pp-tab': {
          const st = nav(s);
          s._ppTab = arg;
          if ((st[st.length - 1] || '').startsWith('together')) st[st.length - 1] = 'together:' + arg; else st.push('together:' + arg);
          draw(flow, 'together:' + arg, '');
          return true;
        }
        case 'pp-friend': open(flow, 'friend:' + arg, 'push'); return true;
        case 'pp-group': open(flow, 'group:' + arg, 'push'); return true;
        case 'pp-back': keepDraft(flow); back(flow); return true;
        case 'pp-edit': open(flow, 'edit', 'push'); return true;
        case 'pp-save': keep(flow); back(flow); syncTabs(flow); return true;
        case 'pp-ava': keep(flow); me(s).ava = arg; redrawEdit(flow); return true;
        case 'pp-color': keep(flow); me(s).c = +arg; redrawEdit(flow); return true;
        case 'pp-ban': keep(flow); me(s).ban = arg; redrawEdit(flow); return true;
        case 'pp-frame': keep(flow); me(s).frame = arg; redrawEdit(flow); return true;
        case 'pp-cheer': {
          const f = find(arg);
          if (!f) return true;
          n.cheer[arg] = !n.cheer[arg];
          if (n.cheer[arg]) { Sonly.sound.fx('pop'); if (navigator.vibrate) navigator.vibrate(15); }
          say(n.cheer[arg] ? `${f.n} получит твоё поздравление` : '');
          return true;
        }
        case 'pp-wake': {
          const f = find(arg);
          if (f && !n.nudge[arg]) { n.nudge[arg] = true; if (navigator.vibrate) navigator.vibrate(20); say(`${f.n} получит громкое напоминание`); }
          return true;
        }
        /* Заявки в друзья. */
        case 'pp-request': {
          const f = find(arg);
          if (!f || relOf(s, arg)) return true;
          n.rel[arg] = 'out';
          say('Заявка отправлена');
          later(flow, arg);
          syncTabs(flow);
          return true;
        }
        case 'pp-accept': { const f = find(arg); if (f) { n.rel[arg] = 'friend'; say(`${f.n} теперь в друзьях`); syncTabs(flow); } return true; }
        case 'pp-decline': {
          delete n.rel[arg];
          if (nav(s)[nav(s).length - 1] === 'friend:' + arg) back(flow, 'Заявка отклонена'); else say('Заявка отклонена');
          syncTabs(flow);
          return true;
        }
        case 'pp-cancel':
          delete n.rel[arg];
          n.extra = n.extra.filter((p) => p.id !== arg);
          say('Заявка отменена');
          return true;
        case 'pp-addcode': {
          const code = arg;
          if (!/^SN-[A-Z0-9]{4}$/.test(code)) return true;
          if (code === me(s).code) { say('Это твой код — нужен код друга'); return true; }
          if (!n.extra.some((p) => p.code === code)) { const id = 'c-' + code.slice(3); n.extra.push({ id, n: code, code, unknown: true, c: 6, al: 0, up: null, streak: 0, miss: [], fr: [] }); n.rel[id] = 'out'; }
          say('Заявка по коду отправлена');
          return true;
        }
        case 'pp-unfriend': {
          const f = find(arg);
          if (s._ppAsk !== 'unfriend:' + arg) { s._ppAsk = 'unfriend:' + arg; redraw(flow); return true; }
          delete n.rel[arg]; delete n.cheer[arg]; delete n.nudge[arg];
          back(flow, `${f ? f.n : 'Друг'} больше не в друзьях`);
          syncTabs(flow);
          return true;
        }
        case 'pp-qx': {
          s._ppQ = '';
          const inp = flow.sheets.querySelector('.js-ppq'), res = flow.sheets.querySelector('.pp-res');
          if (inp) { inp.value = ''; inp.parentElement.classList.remove('has'); inp.focus({ preventScroll: true }); }
          if (res) res.innerHTML = results(s, '');
          return true;
        }
        /* «Копировать» кладёт в буфер только код. «Позвать друга» отправляет приглашение. */
        case 'pp-copy': K.shareText(me(s).code, false, (msg) => say(msg ? msg.replace('Текст с кодом скопирован', 'Код скопирован') : '')); return true;
        case 'pp-invite': K.shareText(T('Вставай со мной в sonly: добавь меня по коду {code}. https://9opamine.github.io/sonly/', { code: me(s).code }), true, (msg) => say(msg ? msg.replace('Текст с кодом', 'Приглашение') : '')); return true;
        /* Группы. */
        case 'pp-gnew': draftFor(s, 'new'); open(flow, 'gedit:new', 'push'); return true;
        case 'pp-gedit': draftFor(s, arg); open(flow, 'gedit:' + arg, 'push'); return true;
        case 'pp-ginv': open(flow, 'ginv:' + arg, 'push'); return true;
        case 'pp-gicon': keepDraft(flow); s._ppDraft.icon = arg; redraw(flow); return true;
        case 'pp-gcolor': keepDraft(flow); s._ppDraft.c = +arg; redraw(flow); return true;
        case 'pp-ggoal': keepDraft(flow); s._ppDraft.goal = s._ppDraft.goal == null ? 420 : null; redraw(flow); return true;
        case 'pp-gm': {
          keepDraft(flow);
          const d = s._ppDraft;
          d.members = d.members.includes(arg) ? d.members.filter((x) => x !== arg) : d.members.concat(arg);
          redraw(flow);
          return true;
        }
        case 'pp-gsave': {
          keepDraft(flow);
          const d = s._ppDraft;
          if (!d.name) { Sonly.nudge(flow.sheets.querySelector('.js-pgname')); s._ppMsg = 'Назови группу'; toast(flow); return true; }
          if (!d.id) {
            const g = { id: 'g' + Date.now(), name: d.name, icon: d.icon, c: d.c, goal: d.goal, members: d.members.slice(), code: 'SG-' + K.code4(), by: 'me' };
            n.groups.push(g);
            s._ppDraft = null;
            s._ppMsg = 'Группа создана';
            swap(flow, 'group:' + g.id);
          } else {
            Object.assign(groupOf(s, d.id), { name: d.name, icon: d.icon, c: d.c, goal: d.goal, members: d.members.slice() });
            s._ppDraft = null;
            back(flow, 'Сохранено');
          }
          syncTabs(flow);
          return true;
        }
        case 'pp-gleave': {
          const g = groupOf(s, arg);
          if (!g) return true;
          if (s._ppAsk !== 'gleave:' + arg) { keepDraft(flow); s._ppAsk = 'gleave:' + arg; redraw(flow); return true; }
          n.groups = n.groups.filter((x) => x.id !== arg);
          s._ppDraft = null;
          /* Сразу к списку групп: лист удалённой группы уже не нужен. */
          const st = nav(s);
          while (st.length > 1 && /^(gedit|group|ginv):/.test(st[st.length - 1])) st.pop();
          st.push('gone');
          back(flow, g.by === 'me' ? `Группа «${g.name}» удалена` : `Ты больше не в группе «${g.name}»`);
          syncTabs(flow);
          return true;
        }
        case 'pp-gjoin': {
          let og = arg ? OPEN.find((g) => g.id === arg) : null;
          if (!arg) {
            const inp = flow.sheets.querySelector('.js-pgcode'), u = ((inp && inp.value) || '').toUpperCase(), m = u.match(/\bSG-?([A-Z0-9]{4})\b/) || u.replace(/\s+/g, '').match(/^([A-Z0-9]{4})$/);
            const code = m ? 'SG-' + m[1] : '';
            if (!code) { Sonly.nudge(inp); s._ppMsg = 'Код группы — SG и четыре знака'; toast(flow); return true; }
            og = OPEN.concat(groups(s)).find((g) => g.code === code);
            if (!og) { s._ppMsg = 'Группу с таким кодом не нашли'; toast(flow); return true; }
          }
          if (!og) return true;
          const g = join(flow, og);
          if (/^(gedit|gjoin)/.test(nav(s)[nav(s).length - 1])) swap(flow, 'group:' + g.id); else open(flow, 'group:' + g.id, 'push');
          syncTabs(flow);
          return true;
        }
        case 'pp-gno': n.inv = n.inv.filter((x) => x.g !== arg); redraw(flow); return true;
        case 'pp-gadd': {
          const [gid, id] = arg.split(':'), g = groupOf(s, gid), f = find(id);
          if (g && f && !g.members.includes(id)) { g.members.push(id); say(`${f.n} теперь в группе`); }
          return true;
        }
        case 'pp-gtoggle': {
          const [gid, id] = arg.split(':'), g = groupOf(s, gid), f = find(id);
          if (!g || !f) return true;
          const on = g.members.includes(id);
          g.members = on ? g.members.filter((x) => x !== id) : g.members.concat(id);
          say(on ? `${f.n} больше не в «${g.name}»` : `${f.n} теперь в «${g.name}»`);
          return true;
        }
        case 'pp-gcopy': { const g = groupOf(s, arg); if (g) K.shareText(g.code, false, (msg) => say(msg ? msg.replace('Текст с кодом скопирован', 'Код группы скопирован') : '')); return true; }
        case 'pp-gshare': { const g = groupOf(s, arg); if (g) K.shareText(T('Вставай с нами в sonly: группа «{name}», код {code}. https://9opamine.github.io/sonly/', { name: Sonly.i18n ? Sonly.i18n.word(g.name) : g.name, code: g.code }), true, (msg) => say(msg ? msg.replace('Текст с кодом', 'Приглашение') : '')); return true; }
        case 'pp-badges': open(flow, 'badges', 'push'); return true;
        case 'pp-badge': open(flow, 'badge:' + arg, 'push'); return true;
        default: return false;
      }
    },
  };
})();
