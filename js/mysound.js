/* Свои звуки: запись с микрофона или файл с телефона, обрезка по волне, «Сделать громче».
   Звуки хранятся на телефоне (IndexedDB) и звонят так же, как встроенные: в будильнике лежит ключ вида my:<id>.
   Модуль даёт строки «Свои» для списков звуков, страницу «Свой звук» и звук для звонка (Sonly.sound спрашивает buffer). */
(() => {
  'use strict';
  const { ic, esc, pad } = Sonly;
  /* Звук хранится в исходном качестве: частота как у телефона или файла (44,1–48 кГц), стерео остаётся стерео.
     Кусок до 30 секунд — около 5 МБ на телефоне, это немного. */
  const RATE = 44100, REC_MAX = 30, CLIP_MAX = 30, BARS = 56, DB = 'sonly-sounds', STORE = 'sounds';
  const COLOR = { mic: '#FF3B30', file: '#0A84FF', song: '#FA2D48' };

  let list = [];       // [{ id, name, kind: 'mic'|'file'|'song', rate, ch: 1|2, pcm: Int16Array (каналы через один), at }]
  let loaded = false;
  let draft = null;    // то, что сейчас на странице: { chs: [Float32Array…], data: chs[0] (для волны), rate, a, b, name, loud, kind, id, at }
  let rec = null;      // идёт запись
  let prev = null;     // идёт прослушивание выбранного куска

  const K = () => Sonly.appKit;
  const key = (x) => 'my:' + x.id;
  const byKey = (k) => list.find((x) => key(x) === k);
  const dur = (x) => x.pcm.length / (x.ch || 1) / x.rate;
  const fmt = (sec) => { const v = Math.max(0, Math.round(sec)); return Math.floor(v / 60) + ':' + pad(v % 60); };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ── Хранилище ───────────────────────────────────────────── */

  function db() {
    return new Promise((ok, no) => {
      if (!window.indexedDB) { no(new Error('нет IndexedDB')); return; }
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    });
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((ok, no) => {
      const t = d.transaction(STORE, mode), req = fn(t.objectStore(STORE));
      t.oncomplete = () => ok(req && req.result);
      t.onerror = () => no(t.error);
    });
  }
  const ready = (async () => {
    try {
      const all = await tx('readonly', (st) => st.getAll());
      list = (all || []).map((r) => ({ ...r, pcm: new Int16Array(r.pcm) })).sort((x, y) => x.at - y.at);
    } catch (e) { list = []; /* приватный режим или песочница: свои звуки живут до закрытия страницы */ }
    loaded = true;
    if (list.length) document.querySelectorAll('.ms-mine').forEach((el) => { el.innerHTML = mineRows(el.dataset.cur, el.dataset.base); });
  })();

  /* ── Звук ────────────────────────────────────────────────── */

  /** Готовый к звонку буфер своего звука. Пока список не загрузился — обещание; звука нет — null. */
  function buffer(k, ctx) {
    const x = byKey(k);
    if (!x) return loaded ? null : ready.then(() => (byKey(k) ? buffer(k, ctx) : null));
    if (x._buf && x._ctx === ctx) return x._buf;
    const chs = split(x), b = ctx.createBuffer(chs.length, chs[0].length, x.rate);
    chs.forEach((c, i) => b.getChannelData(i).set(c));
    x._buf = b; x._ctx = ctx;
    return b;
  }
  /** Сохранённый звук → каналы Float32 (старые звуки — один канал). */
  function split(x) {
    const n = x.ch || 1, len = Math.floor(x.pcm.length / n), out = Array.from({ length: n }, () => new Float32Array(len));
    for (let i = 0, k = 0; i < len; i++) for (let c = 0; c < n; c++, k++) out[c][i] = x.pcm[k] / 32768;
    return out;
  }
  /** Каналы разобранного звука без копирования (больше двух не берём). */
  const chansOf = (ab) => Array.from({ length: Math.min(2, ab.numberOfChannels) }, (_, i) => ab.getChannelData(i));
  /** Разбор файла в исходном качестве: через звуковой контекст телефона (его частота, хороший пересчёт), иначе 44,1 кГц. */
  async function decodeHQ(raw) {
    const ctx = Sonly.sound.ctx();
    if (ctx) { try { return await decode(ctx, raw.slice(0)); } catch (e) { /* попробуем без контекста */ } }
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    return decode(new OAC(2, 1, RATE), raw.slice(0));
  }
  const label = (k) => { if (!/^my:/.test(k || '')) return k; const x = byKey(k); return x ? x.name : 'Свой звук'; };

  /** Наибольшая громкость куска и множитель, который доводит её почти до предела (не больше ×8 — шум не раздуваем). */
  function gainOf(chs, from = 0, to = chs[0].length) {
    let m = 0;
    chs.forEach((data) => { for (let i = from; i < to; i += 2) { const v = Math.abs(data[i]); if (v > m) m = v; } });
    return m > 0.001 ? Math.min(8, 0.95 / m) : 1;
  }
  /** Пики для волны: n столбиков от from до to (в отсчётах), 0…1 относительно самого громкого места всего звука. */
  function peaks(data, n, from = 0, to = data.length) {
    const out = [], step = (to - from) / n;
    for (let k = 0; k < n; k++) {
      let m = 0;
      const s0 = Math.floor(from + k * step), s1 = Math.max(s0 + 1, Math.floor(from + (k + 1) * step));
      for (let i = s0; i < s1; i += 3) { const v = Math.abs(data[i] || 0); if (v > m) m = v; }
      out.push(m);
    }
    const top = Math.max(0.02, ...out);
    return out.map((v) => Math.pow(v / top, 0.7));
  }
  const decode = (ctx, buf) => new Promise((ok, no) => { const p = ctx.decodeAudioData(buf, ok, no); if (p && p.then) p.then(ok, no); });

  /* ── Запись ──────────────────────────────────────────────── */

  async function startRec(flow) {
    if (rec) return;
    Sonly.sound.stop();
    const ctx = Sonly.sound.ctx();
    if (!ctx || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setMode(flow, 'nomic'); return; }
    /* iPhone: в режиме «воспроизведение» микрофон не включится — перед записью тип сессии «авто» (play() вернёт его обратно). */
    if (Sonly.sound.session) Sonly.sound.session('auto');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
    } catch (e) { setMode(flow, e && e.name === 'NotFoundError' ? 'nomic' : 'deny'); return; }
    if (ctx.state !== 'running') { try { await ctx.resume(); } catch (e) { /* продолжим как есть */ } }
    const src = ctx.createMediaStreamSource(stream), proc = ctx.createScriptProcessor(4096, 1, 1), sink = ctx.createGain();
    sink.gain.value = 0;
    rec = { stream, src, proc, sink, ctx, chunks: [], n: 0, rate: ctx.sampleRate, slots: new Float32Array(BARS), t0: performance.now() };
    proc.onaudioprocess = (ev) => {
      if (!rec) return;
      const d = ev.inputBuffer.getChannelData(0), at = rec.n / rec.rate;
      rec.chunks.push(new Float32Array(d));
      rec.n += d.length;
      let m = 0;
      for (let i = 0; i < d.length; i += 4) { const v = Math.abs(d[i]); if (v > m) m = v; }
      const k = Math.min(BARS - 1, Math.floor(at / REC_MAX * BARS));
      rec.slots[k] = Math.max(rec.slots[k], m);
    };
    src.connect(proc); proc.connect(sink); sink.connect(ctx.destination);
    flow.state._my.short = false;
    setMode(flow, 'rec');
    const loop = () => {
      if (!rec) return;
      const stage = flow.sheets.querySelector('.ms-stage.rec');
      /* Лист закрыли посреди записи — микрофон выключаем. */
      if (!stage) { endRec(); return; }
      const sec = rec.n / rec.rate;
      stage.querySelector('.js-mst').textContent = fmt(Math.floor(sec));
      const top = Math.max(0.08, ...rec.slots);
      stage.querySelectorAll('.ms-bars i').forEach((b, k) => {
        const on = k <= Math.floor(sec / REC_MAX * BARS);
        b.classList.toggle('on', on);
        if (on) b.style.setProperty('--h', Math.pow(rec.slots[k] / top, 0.7).toFixed(3));
      });
      if (sec >= REC_MAX) { stopRec(flow); return; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  /** Выключает микрофон и отдаёт записанное одним куском. */
  function endRec() {
    if (!rec) return null;
    const r = rec;
    rec = null;
    try { r.proc.disconnect(); r.src.disconnect(); r.sink.disconnect(); } catch (e) { /* уже отключено */ }
    r.stream.getTracks().forEach((t) => t.stop());
    const data = new Float32Array(r.n);
    let o = 0;
    r.chunks.forEach((c) => { data.set(c, o); o += c.length; });
    return { data, rate: r.rate };
  }
  function stopRec(flow) {
    const got = endRec();
    if (!got) return;
    const { data, rate } = got, total = data.length / rate;
    if (total < 1) { flow.state._my.short = true; setMode(flow, 'rec'); return; }
    /* Тишину по краям убираем сразу: начало и конец — там, где звук впервые и в последний раз заметно громче шума. */
    let m = 0;
    for (let i = 0; i < data.length; i += 2) m = Math.max(m, Math.abs(data[i]));
    const th = m * 0.06;
    let s0 = 0, s1 = data.length - 1;
    while (s0 < s1 && Math.abs(data[s0]) < th) s0++;
    while (s1 > s0 && Math.abs(data[s1]) < th) s1--;
    const pad0 = 0.12 * rate;
    let a = Math.max(0, s0 - pad0) / data.length, b = Math.min(data.length, s1 + pad0) / data.length;
    if ((b - a) * total < 1) { a = 0; b = 1; }
    draft = { chs: [data], data, rate, a, b, name: nextName('Мой звук'), loud: true, kind: 'mic' };
    setMode(flow, 'edit');
  }
  function nextName(base) {
    for (let n = 1; ; n++) { const name = n === 1 && base !== 'Мой звук' ? base : `${base} ${n}`; if (!list.some((x) => x.name === name)) return name; }
  }

  /* ── Файл ────────────────────────────────────────────────── */

  function pickFile(flow) {
    let inp = document.getElementById('ms-file');
    if (!inp) {
      inp = document.createElement('input');
      Object.assign(inp, { type: 'file', accept: 'audio/*,.mp3,.m4a,.wav,.aac,.ogg', id: 'ms-file', hidden: true });
      document.body.appendChild(inp);
    }
    inp.value = '';
    inp.onchange = () => { const f = inp.files && inp.files[0]; if (f) fromFile(flow, f); };
    inp.click();
  }
  async function fromFile(flow, file) {
    const s = flow.state;
    s._my = { ...(s._my || {}), file: true };
    if (file.size > 40e6) { setMode(flow, 'bad', 'big'); return; }
    setMode(flow, 'load');
    let ab = null;
    try {
      /* Целая песня в исходном качестве: из неё выбирают любые 30 секунд. В памяти она лежит, только пока открыта страница. */
      ab = await decodeHQ(await file.arrayBuffer());
    } catch (e) { ab = null; }
    if (!s._my || s._my.mode !== 'load') return; // пока открывали файл, человек ушёл со страницы
    if (!ab || ab.length < ab.sampleRate * 0.5) { setMode(flow, 'bad'); return; }
    const chs = chansOf(ab), total = ab.length / ab.sampleRate;
    const name = (file.name || '').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim().slice(0, 24) || nextName('Мой звук');
    /* Длинный файл — это песня: рамку сразу ставим на самое громкое место (обычно припев), как в поиске. */
    const len = Math.min(total > 45 ? 15 : CLIP_MAX, total), a = total > 45 ? loudest(chs[0], ab.sampleRate, len) : 0;
    draft = { chs, data: chs[0], rate: ab.sampleRate, a, b: a + len / total, name, loud: total <= 45, kind: 'file' };
    setMode(flow, 'edit');
  }

  /* ── Прослушивание ───────────────────────────────────────── */

  function stopPrev() {
    if (!prev) return;
    const p = prev;
    prev = null;
    Sonly.sound.stop();
    const w = p.flow.sheets.querySelector('.js-wave');
    if (w) w.classList.remove('play');
    const b = p.flow.sheets.querySelector('.ms-play');
    if (b) { b.classList.remove('on'); b.innerHTML = Sonly.si('play', 30); b.setAttribute('aria-label', 'Прослушать'); }
  }
  function playSel(flow) {
    if (prev) { stopPrev(); return; }
    const d = draft, ctx = Sonly.sound.ctx();
    if (!d || !ctx) return;
    if (!d._buf || d._ctx !== ctx) {
      d._buf = ctx.createBuffer(d.chs.length, d.data.length, d.rate);
      d.chs.forEach((c, i) => d._buf.getChannelData(i).set(c));
      d._ctx = ctx;
    }
    const total = d.data.length / d.rate, s0 = Math.floor(d.a * d.data.length), s1 = Math.floor(d.b * d.data.length);
    Sonly.sound.setVolume(flow.state.volume);
    const node = Sonly.sound.buffer(d._buf, { offset: d.a * total, dur: (d.b - d.a) * total, gain: d.loud ? gainOf(d.chs, s0, s1) : 1, onend: () => { if (prev && prev.node === node) stopPrev(); } });
    if (!node) return;
    prev = { flow, node, t0: performance.now(), a: d.a, b: d.b, len: (d.b - d.a) * total };
    const w = flow.sheets.querySelector('.js-wave'), btn = flow.sheets.querySelector('.ms-play');
    if (btn) { btn.classList.add('on'); btn.innerHTML = Sonly.si('pause', 30); btn.setAttribute('aria-label', 'Остановить'); }
    if (w) w.classList.add('play');
    const loop = () => {
      if (!prev || prev.node !== node) return;
      const wave = flow.sheets.querySelector('.js-wave');
      if (!wave) { stopPrev(); return; }
      const t = (performance.now() - prev.t0) / 1000;
      wave.style.setProperty('--p', (prev.a + (prev.b - prev.a) * Math.min(1, t / prev.len)).toFixed(4));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }


  /* ── Музыка: поиск по каталогу Apple и отрывок песни ───────
     Каталог — открытый поиск iTunes: десятки миллионов песен, без ключа и без скачивания. Каждая песня даёт отрывок
     в 30 секунд (обычно это припев); его режут, как в «Историях»: окно 10, 15 или 30 секунд двигается по волне.
     В настоящем приложении — Apple Music через MusicKit: целые песни у тех, у кого есть подписка. */
  const SUGG = ['Here Comes the Sun', 'Good Morning', 'Wake Me Up', 'Walking on Sunshine', 'Beautiful Day', 'Lovely Day', 'Mr. Blue Sky'];
  /* Последняя подсказка — слово «утро» на языке интерфейса: и поиск, и найденные песни — на нём, а не по-русски. */
  const MORNING = { ru: 'Утро', uk: 'Ранок', en: 'Morning', pl: 'Poranek', de: 'Morgen', es: 'Mañana', fr: 'Matin' };
  const sugg = () => SUGG.concat(MORNING[(Sonly.i18n && Sonly.i18n.lang) || 'ru'] || 'Morning');
  /* Названия песен и исполнителей приходят от Apple на своём языке — их движок перевода не трогает (data-i18n="off"),
     а подписи кнопок для экранного диктора переводятся здесь. */
  const tt = (k) => (Sonly.i18n && Sonly.i18n.t ? Sonly.i18n.t(k) : k);
  const LENS = [10, 15, 30];
  let found = { q: '', list: [], st: 'idle' };
  let qTimer = 0;
  let pv = null;       // { i, audio } — играет отрывок в результатах поиска
  /* Магазин Apple своей страны: в каждом свой набор песен (в американском нет многих украинских и русских). Страну
     узнаём по часовому поясу телефона, иначе по языку. Ищем сразу в своём и в американском и складываем без повторов. */
  const TZ = { Kiev: 'UA', Kyiv: 'UA', Uzhgorod: 'UA', Zaporozhye: 'UA', Simferopol: 'UA', Minsk: 'BY', Warsaw: 'PL', Berlin: 'DE', Vienna: 'AT', Zurich: 'CH', Paris: 'FR', Brussels: 'BE', Madrid: 'ES', Rome: 'IT', Lisbon: 'PT', London: 'GB', Dublin: 'IE', Prague: 'CZ', Bratislava: 'SK', Budapest: 'HU', Bucharest: 'RO', Sofia: 'BG', Chisinau: 'MD', Riga: 'LV', Vilnius: 'LT', Tallinn: 'EE', Helsinki: 'FI', Stockholm: 'SE', Oslo: 'NO', Copenhagen: 'DK', Amsterdam: 'NL', Istanbul: 'TR', Moscow: 'RU', Kaliningrad: 'RU', Samara: 'RU', Volgograd: 'RU', Yekaterinburg: 'RU', Omsk: 'RU', Novosibirsk: 'RU', Krasnoyarsk: 'RU', Irkutsk: 'RU', Vladivostok: 'RU', Almaty: 'KZ', Astana: 'KZ', Tashkent: 'UZ', Tbilisi: 'GE', Yerevan: 'AM', Baku: 'AZ', Bishkek: 'KG' };
  const LANG = { uk: 'UA', ru: 'RU', be: 'BY', kk: 'KZ', pl: 'PL', de: 'DE', fr: 'FR', es: 'ES', it: 'IT', pt: 'PT' };
  function store() {
    let tz = '';
    try { tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').split('/').pop(); } catch (e) { /* нет часового пояса */ }
    return TZ[tz] || LANG[(Sonly.i18n && Sonly.i18n.lang !== 'ru' ? Sonly.i18n.lang : navigator.language || 'en').slice(0, 2)] || 'US';
  }
  /* Внутри Claude (страница во фрейме claude.ai) браузеру не дают ходить на чужие сайты — каталог Apple там не открыть.
     Так и говорим, со ссылкой на сайт, где поиск работает, а не «проверь интернет». */
  const SITE = 'https://9opamine.github.io/sonly/';
  const inFrame = () => { try { return window.self !== window.top; } catch (e) { return true; } };
  const askStore = async (q, c) => {
    const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=50&country=${c}`);
    if (!r.ok) throw Object.assign(new Error(String(r.status)), { slow: r.status === 403 || r.status === 429 });
    return (await r.json()).results || [];
  };
  function stopPv(flow) {
    if (!pv) return;
    try { pv.audio.pause(); } catch (e) { /* уже остановлен */ }
    pv = null;
    if (flow) paintRes(flow);
  }
  async function search(flow, q) {
    found = { q, list: [], st: 'load' };
    paintRes(flow);
    const own = store(), shops = own === 'US' ? ['US'] : [own, 'US'];
    const got = await Promise.allSettled(shops.map((c) => askStore(q, c)));
    if (found.q !== q) return;
    const seen = new Set(), list = [];
    got.forEach((g) => (g.status === 'fulfilled' ? g.value : []).forEach((x) => {
      if (!x.previewUrl || !x.trackName) return;
      const k = `${x.trackName}|${x.artistName}`.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(k) || seen.has(x.trackId)) return;
      seen.add(k); seen.add(x.trackId);
      list.push({ title: x.trackName, artist: x.artistName || '', art: (x.artworkUrl100 || '').replace('100x100bb', '200x200bb'), url: x.previewUrl });
    }));
    const fail = got.every((g) => g.status === 'rejected');
    /* Apple отвечает «подожди», если искали слишком часто (около 20 поисков в минуту). */
    found = fail ? { q, list: [], st: got.some((g) => g.reason && g.reason.slow) ? 'slow' : inFrame() ? 'frame' : 'err' } : { q, st: 'ok', list: list.slice(0, 60) };
    paintRes(flow);
  }
  function paintRes(flow) {
    const el = flow.sheets.querySelector('.js-msres');
    if (el) el.innerHTML = musicList(flow.state);
  }
  function musicList(s) {
    const q = ((s._my && s._my.q) || '').trim();
    /* Честно о 30 секундах: каталог Apple открыто даёт только отрывок. Вся песня — файлом с телефона. */
    const whole = `<button class="ap-card ap-row tall ms-whole" data-act="ms-file"><i class="ap-row-i c" style="--c:${COLOR.file}">${Sonly.si('folder')}</i><span>Вся песня с телефона<small>Любые 30 секунд из файла</small></span>${K().chev()}</button>`;
    const src = inFrame() ? `<p class="ap-note ms-src">${ic('info', 14, 2.4)} Внутри Claude каталог Apple закрыт — песни ищутся на сайте sonly. Файл с телефона работает и здесь.</p>`
      : `<p class="ap-note ms-src">${ic('music', 14, 2.4)} Каталог Apple Music. Apple даёт открыто только 30 секунд каждой песни — из них выбираешь кусок.</p>`;
    if (!q) return `<h3>Для утра</h3><div class="ms-sugg" data-i18n="off">${sugg().map((x) => `<button data-act="ms-qset:${esc(x)}">${esc(x)}</button>`).join('')}</div>
      ${src}${whole}`;
    if (found.st === 'frame' && found.q === q) return `<div class="ms-empty"><i class="ms-big" style="--c:#FA2D48">${ic('lock', 38, 2.2)}</i><b>Внутри Claude поиск закрыт</b><p>Claude не пускает страницу к каталогу Apple. На сайте sonly поиск работает — открой его на телефоне.</p><a class="ms-retry" href="${SITE}" target="_blank" rel="noopener">Открыть сайт</a></div>${whole}`;
    if (found.st === 'slow') return `<div class="ms-empty"><i class="ms-big" style="--c:#FA2D48">${ic('hourglass', 38, 2.2)}</i><b>Apple просит подождать</b><p>Слишком много поисков подряд. Попробуй через минуту.</p><button class="ms-retry" data-act="ms-qset:${esc(q)}">Повторить</button></div>`;
    if (found.q !== q || found.st === 'load') return `<div class="ap-card ap-list ms-songs wait">${Array.from({ length: 6 }, () => '<div class="ap-row ms-song"><i class="ms-cover"></i><span><i class="ms-sk"></i><i class="ms-sk s"></i></span></div>').join('')}</div>`;
    if (found.st === 'err') return `<div class="ms-empty"><i class="ms-big" style="--c:#FA2D48">${ic('wifi-off', 38, 2.2)}</i><b>Поиск не открылся</b><p>Проверь интернет и попробуй ещё раз.</p><button class="ms-retry" data-act="ms-qset:${esc(q)}">Повторить</button></div>`;
    if (!found.list.length) return `<div class="ms-empty"><i class="ms-big" style="--c:#FA2D48">${ic('search-x', 38, 2.2)}</i><b>Ничего не нашли</b><p>Попробуй название песни или исполнителя по-другому. Если песни нет в Apple Music — выбери её файлом.</p></div>${whole}`;
    return `<div class="ap-card ap-list ms-songs" data-i18n="off">${found.list.map((x, i) => `<div class="ap-row ms-song"><button class="ms-pick" data-act="ms-song:${i}" aria-label="${esc(tt('Выбрать'))}: ${esc(x.title)} — ${esc(x.artist)}"></button>
      <img class="ms-cover" src="${esc(x.art)}" alt="" loading="lazy"><span><b>${esc(x.title)}</b><small>${esc(x.artist)}</small></span>
      <button class="ms-pv${pv && pv.i === i ? ' on' : ''}" data-act="ms-pv:${i}" aria-label="${pv && pv.i === i ? esc(tt('Остановить')) : `${esc(tt('Послушать'))}: ${esc(x.title)}`}">${Sonly.si(pv && pv.i === i ? 'pause' : 'play', 16)}</button></div>`).join('')}</div>
      <p class="ap-note ms-src">Нажми на песню, чтобы выбрать кусок.</p>${whole}`;
  }
  /** Песня выбрана: отрывок с серверов Apple → волна; окно сразу ставим на самое громкое место (обычно припев). */
  async function fromSong(flow, x) {
    const s = flow.state;
    stopPv();
    setMode(flow, 'load');
    let ab = null;
    try {
      /* Лучшее качество отрывка, какое отдаёт Apple (AAC 256 кбит/с, стерео), и разбор без пересчёта в худшее. */
      ab = await decodeHQ(await (await fetch(x.url)).arrayBuffer());
    } catch (e) { ab = null; }
    if (!s._my || s._my.mode !== 'load') return;
    if (!ab || ab.length < ab.sampleRate) { setMode(flow, 'bad', 'song'); return; }
    const chs = chansOf(ab), total = ab.length / ab.sampleRate, len = Math.min(15, total), a = loudest(chs[0], ab.sampleRate, len);
    draft = { chs, data: chs[0], rate: ab.sampleRate, a, b: a + len / total, name: `${x.title} — ${x.artist}`.slice(0, 40), loud: false, kind: 'song', art: x.art, artist: x.artist, title: x.title };
    setMode(flow, 'edit');
  }
  /** Начало (0…1) окна длиной len секунд там, где громче всего: громкость по полусекундам. */
  function loudest(data, rate, len) {
    const total = data.length / rate, step = Math.floor(rate / 2), e = [];
    for (let i = 0; i < data.length; i += step) { let m = 0; for (let j = i; j < Math.min(data.length, i + step); j += 8) m += data[j] * data[j]; e.push(m); }
    const w = Math.max(1, Math.round(len * 2));
    let best = 0, bestAt = 0;
    for (let i = 0; i + w <= e.length; i++) { let sum = 0; for (let j = i; j < i + w; j++) sum += e[j]; if (sum > best) { best = sum; bestAt = i; } }
    return Math.max(0, Math.min(bestAt / 2, total - len)) / total;
  }

  /* ── Сохранение и удаление ───────────────────────────────── */

  async function save(flow) {
    const d = draft;
    if (!d) return;
    stopPrev();
    const field = flow.sheets.querySelector('.js-msname');
    const name = ((field && field.value) || d.name || '').trim().slice(0, d.kind === 'song' ? 40 : 24) || nextName('Мой звук');
    /* Кусок сохраняется как есть — без пересчёта частоты и без сведения в моно; по краям 20 мс плавного входа и выхода. */
    const s0 = Math.floor(d.a * d.data.length), s1 = Math.floor(d.b * d.data.length), n = d.chs.length, len = s1 - s0;
    const g = d.loud ? gainOf(d.chs, s0, s1) : 1, fade = Math.floor(d.rate * 0.02), pcm = new Int16Array(len * n);
    for (let i = 0, k = 0; i < len; i++) {
      const f = i < fade ? i / fade : i > len - fade ? (len - i) / fade : 1;
      for (let c = 0; c < n; c++, k++) pcm[k] = Math.round(clamp(d.chs[c][s0 + i] * g * f, -1, 1) * 32767);
    }
    const x = { id: d.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, kind: d.kind, rate: d.rate, ch: n, pcm, at: d.at || Date.now(), ...(d.kind === 'song' ? { art: d.art, artist: d.artist, title: d.title } : {}) };
    const i = list.findIndex((y) => y.id === x.id);
    if (i < 0) list.push(x); else list[i] = x;
    try { await tx('readwrite', (st) => st.put({ ...x, pcm: pcm.buffer.slice(0) })); } catch (e) { /* без хранилища — до закрытия страницы */ }
    done(flow, key(x));
  }
  async function remove(flow, id) {
    const s = flow.state, k = 'my:' + id, fall = (v) => (v === k ? (s.sndDef !== k ? s.sndDef : Sonly.sound.def) : v);
    s.alarms.forEach((a) => { a.sound = fall(a.sound); });
    if (s._ed) s._ed.sound = fall(s._ed.sound);
    if (s.sndDef === k) s.sndDef = Sonly.sound.def;
    list = list.filter((x) => x.id !== id);
    try { await tx('readwrite', (st) => st.delete(id)); } catch (e) { /* не было в хранилище */ }
    done(flow, '');
  }
  /** Возврат к списку звуков, откуда пришли. picked — новый звук, его сразу выбираем (и он звучит, как при выборе из списка). */
  function done(flow, picked) {
    const s = flow.state, back = (s._my && s._my.back) || 'set-snd';
    stopPv();
    stopPrev();
    if (rec) endRec();
    s._my = null;
    draft = null;
    if (back === 'ed-snd') {
      s._page = null;
      if (picked) { s._ed.sound = picked; Sonly.sound.setVolume(s.volume); Sonly.sound.play(picked); }
      K().soundPicker(flow, 'back');
    } else {
      if (picked) { s.sndDef = picked; Sonly.sound.setVolume(s.volume); Sonly.sound.play(picked); }
      K().openPage(flow, 'sound', '', 'back');
    }
  }

  /* ── Страница ────────────────────────────────────────────── */

  function setMode(flow, mode, why = '') {
    const s = flow.state;
    s._my = { ...(s._my || {}), mode, why };
    if (mode !== 'rec') s._my.short = false;
    /* Первый показ страницы въезжает, смена состояния на той же странице — без въезда (openPage решает сам). */
    K().openPage(flow, 'mysnd', mode, 'push');
  }
  const bars = (vals) => `<div class="ms-bars">${vals.map((h) => `<i style="--h:${h.toFixed(3)}"></i>`).join('')}</div>`;
  const tile = (kind, size = 22, art = '') => (kind === 'song' && art ? `<i class="ap-row-i ms-art"><img src="${esc(art)}" alt=""></i>` : `<i class="ap-row-i c" style="--c:${COLOR[kind] || COLOR.mic}">${kind === 'song' ? ic('music', size - 4, 2.3) : Sonly.si(kind === 'file' ? 'folder' : 'mic', size)}</i>`);
  const empty = (kind, title, note) => `<div class="ms-empty"><i class="ms-big" style="--c:${COLOR[kind]}">${kind === 'song' ? ic('music', 38, 2.2) : Sonly.si(kind === 'file' ? 'folder' : 'mic', 40)}</i><b>${title}</b><p>${note}</p></div>`;

  /** Пример для снимков экрана (?sheet=page-mysnd.demo): восемь секунд «голоса» — нарастающие слоги. */
  function demoDraft() {
    const rate = RATE, n = rate * 8, data = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / rate, env = Math.max(0, Math.sin(t * Math.PI * 1.7)) * (0.25 + 0.6 * Math.abs(Math.sin(t * 0.7))); data[i] = env * Math.sin(2 * Math.PI * (180 + 60 * Math.sin(t * 3)) * t); }
    return { chs: [data], data, rate, a: 0.12, b: 0.78, name: 'Мой звук 1', loud: true, kind: 'mic' };
  }
  function page(s, arg) {
    const m = s._my || {}, back = 'ms-back';
    let mode = m.mode || 'rec';
    if (!s._my && arg) { mode = arg === 'demo' ? 'edit' : arg; if (arg === 'demo' && !draft) draft = demoDraft(); }
    if (mode === 'rec') {
      const on = !!rec;
      /* Кнопка записи — внизу, под пальцем, как главная кнопка на остальных страницах. */
      return ['Запись', `<div class="ap-card ms-stage rec${on ? ' on' : ''}"><div class="ms-time"><b class="js-mst">0:00</b><span>до ${fmt(REC_MAX)}</span></div>${bars(Array(BARS).fill(0))}
          <p class="ms-hint">${on ? 'Идёт запись' : 'Голос, песня, что угодно — до 30 секунд'}</p></div>`,
        `<p class="ms-cap${m.short && !on ? ' warn' : ''}">${on ? 'Нажми, чтобы закончить' : m.short ? 'Слишком коротко — ещё раз' : 'Нажми, чтобы записать'}</p>
        <div class="ms-ctl"><button class="ms-rec${on ? ' on' : ''}" data-act="ms-rec" aria-label="${on ? 'Остановить запись' : 'Записать'}"><i></i></button></div>`, back];
    }
    if (mode === 'load') return ['Свой звук', `<div class="ap-card ms-stage load"><div class="ms-time"><b>Открываем…</b></div>${bars(Array(BARS).fill(0))}</div>`, '', back];
    if (mode === 'deny') return ['Запись', empty('mic', 'Нет доступа к микрофону', 'Разреши микрофон для этой страницы или выбери готовый файл.'), '<button class="ap-btn" data-act="ms-file">Выбрать файл</button>', back];
    if (mode === 'nomic') return ['Запись', empty('mic', 'Здесь записать не выйдет', 'Микрофон недоступен. Выбери готовый звук из файлов.'), '<button class="ap-btn" data-act="ms-file">Выбрать файл</button>', back];
    if (mode === 'music') {
      return ['Музыка', `<div class="ms-q${m.q ? ' has' : ''}">${ic('search', 18, 2.4)}<input class="js-msq" type="search" value="${esc(m.q || '')}" placeholder="Песня или исполнитель" maxlength="80" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" aria-label="Поиск песни"><button class="ms-qx" data-act="ms-qx" aria-label="Очистить поиск">${ic('x', 13, 3.2)}</button></div>
        <div class="js-msres">${musicList(s)}</div>`, '', back];
    }
    if (mode === 'bad' && m.why === 'song') return ['Музыка', empty('song', 'Песня не загрузилась', 'Проверь интернет и выбери её ещё раз.'), '<button class="ap-btn" data-act="ms-music:">К поиску</button>', back];
    if (mode === 'bad') return ['Свой звук', empty('file', m.why === 'big' ? 'Файл слишком большой' : 'Этот файл не открыть', m.why === 'big' ? 'Подойдёт файл до 40 МБ.' : 'Подойдут mp3, m4a и wav.'), '<button class="ap-btn" data-act="ms-file">Выбрать другой</button>', back];
    /* edit: волна целиком, жёлтая рамка — то, что будет звонить. */
    const d = draft;
    if (!d) return ['Свой звук', empty('mic', 'Звук не найден', 'Вернись к списку и выбери снова.'), '', back];
    const total = d.data.length / d.rate;
    const song = d.kind === 'song', len = Math.round((d.b - d.a) * total);
    const head = song ? `<div class="ms-songhead" data-i18n="off"><img class="ms-cover lg" src="${esc(d.art)}" alt=""><span><b>${esc(d.title)}</b><small>${esc(d.artist)}</small></span></div>` : '';
    const lens = song ? `<div class="ap-seg sm ms-lens" role="radiogroup" aria-label="Длина куска">${LENS.filter((n) => n <= Math.round(total)).map((n) => `<button class="${len === n ? 'on' : ''}" data-act="ms-len:${n}" role="radio" aria-checked="${len === n}">${n} с</button>`).join('')}</div>` : '';
    return [song ? 'Кусок песни' : 'Свой звук', `${head}<div class="ap-card ms-stage edit"><div class="ms-time"><b class="js-msl">${fmt((d.b - d.a) * total)}</b><span class="js-msr">${fmt(d.a * total)} – ${fmt(d.b * total)}</span></div>
        <div class="ms-wave js-wave" style="--a:${d.a};--b:${d.b};--p:${d.a}">${bars(peaks(d.data, BARS))}<i class="ms-dim l"></i><i class="ms-dim r"></i>
          <div class="ms-sel"><b class="ms-h l">${ic('chevron-left', 14, 3.4)}</b><b class="ms-h r">${ic('chevron-right', 14, 3.4)}</b></div><i class="ms-head"></i></div>
        ${lens}<p class="ms-hint">${song ? 'Двигай рамку по песне или тяни за края' : total > CLIP_MAX ? `Двигай края — звонить будет до ${CLIP_MAX} секунд` : 'Двигай края, чтобы обрезать'}</p></div>
      <div class="ms-ctl"><button class="ms-play" data-act="ms-play" aria-label="Прослушать">${Sonly.si('play', 30)}</button></div>
      <div class="ap-card ap-list">
        <label class="ap-row ms-name"><i class="ap-row-i">${ic('pencil', 16, 2.2)}</i><input class="js-msname" value="${esc(d.name)}" maxlength="${song ? 40 : 24}" placeholder="Название" aria-label="Название звука" autocomplete="off"></label>
        <div class="ap-row"><i class="ap-row-i">${Sonly.si('volume')}</i><span>Сделать громче</span><button class="ap-tg sm${d.loud ? ' on' : ''}" data-act="ms-loud" role="switch" aria-checked="${d.loud}" aria-label="Сделать громче"></button></div>
      </div>
      ${d.id ? `<button class="ms-del" data-act="ms-del">${ic('trash-2', 17, 2.2)}Удалить звук</button>` : ''}`,
      '<button class="ap-btn" data-act="ms-save">Сохранить</button>', back];
  }

  /** Перетаскивание краёв: ближний к пальцу край едет за ним; кусок — от секунды до минуты. */
  function mount(flow) {
    const s = flow.state, q = flow.sheets.querySelector('.js-msq');
    if (q) {
      /* Страница открыта сразу (снимок, ссылка): запоминаем, куда вернуться. */
      if (!s._my) s._my = { back: 'set-snd', mode: 'music', q: '' };
      q.addEventListener('input', () => {
        s._my.q = q.value;
        q.parentElement.classList.toggle('has', !!q.value);
        clearTimeout(qTimer);
        const v = q.value.trim();
        if (!v) { found = { q: '', list: [], st: 'idle' }; paintRes(flow); return; }
        qTimer = setTimeout(() => search(flow, v), 380);
      });
      q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(qTimer); q.blur(); if (q.value.trim() && found.q !== q.value.trim()) search(flow, q.value.trim()); } });
    }
    const w = flow.sheets.querySelector('.js-wave'), d = draft;
    const field = flow.sheets.querySelector('.js-msname');
    if (field && d) field.addEventListener('input', () => { d.name = field.value; });
    if (!w || !d) return;
    const total = d.data.length / d.rate, minL = Math.min(1, total) / total, maxL = Math.min(1, CLIP_MAX / total);
    const paint = () => {
      w.style.setProperty('--a', d.a.toFixed(4));
      w.style.setProperty('--b', d.b.toFixed(4));
      const st = w.closest('.ms-stage');
      st.querySelector('.js-msl').textContent = fmt((d.b - d.a) * total);
      st.querySelector('.js-msr').textContent = `${fmt(d.a * total)} – ${fmt(d.b * total)}`;
    };
    let side = null;
    const at = (ev) => { const r = w.getBoundingClientRect(); return clamp((ev.clientX - r.left) / r.width, 0, 1); };
    const move = (ev) => {
      if (!side) return;
      const x = at(ev);
      if (side === 'move') { const L = d.b - d.a; d.a = clamp(x - grab, 0, 1 - L); d.b = d.a + L; paint(); return; }
      if (side === 'a') d.a = clamp(x, Math.max(0, d.b - maxL), d.b - minL);
      else d.b = clamp(x, d.a + minL, Math.min(1, d.a + maxL));
      paint();
    };
    let grab = 0;
    w.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      stopPrev();
      const x = at(ev), edge = 14 / w.getBoundingClientRect().width;
      /* Внутри рамки и не у края — двигаем всю рамку; иначе — ближний край. */
      if (x > d.a + edge && x < d.b - edge) { side = 'move'; grab = x - d.a; w.classList.add('drag', 'move'); try { w.setPointerCapture(ev.pointerId); } catch (e) { /* без захвата тоже работает */ } return; }
      side = Math.abs(x - d.a) <= Math.abs(x - d.b) ? 'a' : 'b';
      w.classList.add('drag', side);
      try { w.setPointerCapture(ev.pointerId); } catch (e) { /* без захвата тоже работает */ }
      move(ev);
    });
    w.addEventListener('pointermove', move);
    const up = () => { side = null; w.classList.remove('drag', 'a', 'b', 'move'); };
    w.addEventListener('pointerup', up);
    w.addEventListener('pointercancel', up);
  }

  /** Раздел «Свои» в списке звуков. act — что делает выбор строки там, где список открыт (ed-snd или set-snd). */
  const mineRows = (cur, act) => list.map((x) => `<div class="ap-row ap-snd my${cur === key(x) ? ' on' : ''}"><button class="ms-pick" data-act="${act}:${key(x)}" aria-label="${esc(x.name)}"></button>${tile(x.kind, 22, x.art)}<span class="ms-nm"><b>${esc(x.kind === 'song' && x.title ? x.title : x.name)}</b>${x.kind === 'song' && x.artist ? `<small>${esc(x.artist)}</small>` : ''}</span><em>${fmt(dur(x))}</em><b class="ap-radio">${ic('check', 13, 3.4)}</b><button class="ms-more" data-act="ms-edit:${x.id}:${act}" aria-label="Изменить «${esc(x.name)}»">${ic('ellipsis', 18, 2.6)}</button></div>`).join('');
  function rows(cur, act) {
    /* Обёртка без своей коробки: список, открытый раньше, чем звуки прочитались с телефона, дорисуется сам. */
    return `<h3>Музыка</h3><div class="ap-card ap-list"><button class="ap-row tall" data-act="ms-music:${act}"><i class="ap-row-i c" style="--c:${COLOR.song}">${ic('music', 18, 2.3)}</i><span>Найти песню<small>Отрывки до 30 секунд из Apple Music</small></span>${K().chev()}</button></div>
      <h3>Свои</h3><div class="ap-card ap-list"><div class="ms-mine" data-cur="${esc(cur || '')}" data-base="${act}">${mineRows(cur, act)}</div>
      <button class="ap-row" data-act="ms-new:${act}"><i class="ap-row-i">${Sonly.si('mic')}</i><span>Записать звук</span>${K().chev()}</button>
      <button class="ap-row" data-act="ms-file:${act}"><i class="ap-row-i">${Sonly.si('folder')}</i><span>Выбрать файл</span>${K().chev()}</button></div>`;
  }

  function on(flow, act, arg) {
    const s = flow.state;
    switch (act) {
      case 'ms-new': s._my = { back: arg || 'set-snd' }; draft = null; Sonly.sound.unlock(); K().openPage(flow, 'mysnd', 'rec', 'push'); return true;
      case 'ms-file':
        /* Из списка — сначала запоминаем, куда вернуться; со страницы ошибки — просто выбираем другой файл. */
        if (arg) s._my = { back: arg };
        Sonly.sound.unlock();
        pickFile(flow);
        return true;
      case 'ms-rec': Sonly.sound.unlock(); if (rec) stopRec(flow); else startRec(flow); return true;
      case 'ms-play': playSel(flow); return true;
      case 'ms-loud': {
        if (!draft) return true;
        draft.loud = !draft.loud;
        const was = !!prev;
        stopPrev();
        const b = flow.sheets.querySelector('[data-act="ms-loud"]');
        if (b) { b.classList.toggle('on', draft.loud); b.setAttribute('aria-checked', draft.loud); }
        if (was) playSel(flow);
        return true;
      }
      case 'ms-save': save(flow); return true;
      case 'ms-edit': {
        const [id, back] = arg.split(':'), x = list.find((y) => y.id === id);
        if (!x) return true;
        const chs = split(x);
        draft = { chs, data: chs[0], rate: x.rate, a: 0, b: 1, name: x.name, loud: x.kind !== 'song', kind: x.kind, id: x.id, at: x.at, ...(x.kind === 'song' ? { art: x.art, artist: x.artist, title: x.title } : {}) };
        s._my = { back: back || 'set-snd', mode: 'edit' };
        Sonly.sound.unlock();
        K().openPage(flow, 'mysnd', 'edit', 'push');
        return true;
      }
      case 'ms-del': {
        if (!draft) return true;
        stopPrev();
        const f = flow.sheets.querySelector('.js-msname');
        if (f) draft.name = f.value;
        flow.sheet(`<div class="msg"><b>Удалить звук?</b><p>«${esc(label('my:' + draft.id))}» пропадёт из будильников — вместо него зазвонит звук по умолчанию.</p><div class="msg-two"><button class="msg-ok" data-act="ms-keep">Оставить</button><button class="msg-ok red" data-act="ms-del-yes">Удалить</button></div></div>`, 'center');
        return true;
      }
      case 'ms-keep': K().openPage(flow, 'mysnd', 'edit'); return true;
      case 'ms-del-yes': if (draft) remove(flow, draft.id); return true;
      case 'ms-back':
        /* Из куска песни — назад к результатам поиска, а не к списку звуков. */
        if (draft && draft.kind === 'song' && !draft.id && s._my) { stopPrev(); draft = null; setMode(flow, 'music'); return true; }
        done(flow, '');
        return true;
      case 'ms-music':
        if (arg) s._my = { back: arg, q: (s._my && s._my.q) || '' };
        draft = null;
        Sonly.sound.unlock();
        setMode(flow, 'music');
        return true;
      case 'ms-qset': {
        s._my = s._my || { back: 'set-snd', mode: 'music' };
        s._my.q = arg;
        const q = flow.sheets.querySelector('.js-msq');
        if (q) { q.value = arg; q.parentElement.classList.add('has'); }
        search(flow, arg);
        return true;
      }
      case 'ms-qx': {
        s._my = s._my || { back: 'set-snd', mode: 'music' };
        s._my.q = '';
        found = { q: '', list: [], st: 'idle' };
        stopPv();
        const q = flow.sheets.querySelector('.js-msq');
        if (q) { q.value = ''; q.parentElement.classList.remove('has'); q.focus({ preventScroll: true }); }
        paintRes(flow);
        return true;
      }
      case 'ms-pv': {
        const i = +arg, x = found.list[i];
        if (!x) return true;
        if (pv && pv.i === i) { stopPv(flow); return true; }
        stopPv();
        Sonly.sound.stop();
        const audio = new Audio(x.url);
        audio.volume = Math.min(1, (s.volume || 70) / 100);
        audio.addEventListener('ended', () => { if (pv && pv.audio === audio) stopPv(flow); });
        audio.play().catch(() => { if (pv && pv.audio === audio) stopPv(flow); });
        pv = { i, audio };
        paintRes(flow);
        return true;
      }
      case 'ms-song': { const x = found.list[+arg]; if (x) fromSong(flow, x); return true; }
      case 'ms-len': {
        if (!draft) return true;
        stopPrev();
        const total = draft.data.length / draft.rate, L = Math.min(1, +arg / total);
        draft.a = clamp(draft.a, 0, 1 - L);
        draft.b = draft.a + L;
        const f = flow.sheets.querySelector('.js-msname');
        if (f) draft.name = f.value;
        K().openPage(flow, 'mysnd', 'edit');
        return true;
      }
      default: return false;
    }
  }

  Sonly.mysnd = { rows, page, mount, on, buffer, label, list: () => list.slice(), ready };
})();
