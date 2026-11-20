/* Свои звуки: запись с микрофона или файл с телефона, обрезка по волне, «Сделать громче».
   Звуки хранятся на телефоне (IndexedDB) и звонят так же, как встроенные: в будильнике лежит ключ вида my:<id>.
   Модуль даёт строки «Свои» для списков звуков, страницу «Свой звук» и звук для звонка (Sonly.sound спрашивает buffer). */
(() => {
  'use strict';
  const { ic, esc, pad } = Sonly;
  const RATE = 22050, REC_MAX = 30, CLIP_MAX = 60, BARS = 56, DB = 'sonly-sounds', STORE = 'sounds';
  const COLOR = { mic: '#FF3B30', file: '#0A84FF' };

  let list = [];       // [{ id, name, kind: 'mic'|'file', rate, pcm: Int16Array, at }]
  let loaded = false;
  let draft = null;    // то, что сейчас на странице: { data: Float32Array, rate, a, b, name, loud, kind, id, at }
  let rec = null;      // идёт запись
  let prev = null;     // идёт прослушивание выбранного куска

  const K = () => Sonly.appKit;
  const key = (x) => 'my:' + x.id;
  const byKey = (k) => list.find((x) => key(x) === k);
  const dur = (x) => x.pcm.length / x.rate;
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
    const b = ctx.createBuffer(1, x.pcm.length, x.rate), ch = b.getChannelData(0);
    for (let i = 0; i < x.pcm.length; i++) ch[i] = x.pcm[i] / 32768;
    x._buf = b; x._ctx = ctx;
    return b;
  }
  const label = (k) => { if (!/^my:/.test(k || '')) return k; const x = byKey(k); return x ? x.name : 'Свой звук'; };

  /** Наибольшая громкость куска и множитель, который доводит её почти до предела (не больше ×8 — шум не раздуваем). */
  function gainOf(data, from = 0, to = data.length) {
    let m = 0;
    for (let i = from; i < to; i += 2) { const v = Math.abs(data[i]); if (v > m) m = v; }
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
  function resample(data, from, to) {
    if (from === to) return Float32Array.from(data);
    const n = Math.floor(data.length * to / from), out = new Float32Array(n), r = from / to;
    for (let i = 0; i < n; i++) { const x = i * r, j = Math.floor(x), f = x - j; out[i] = (data[j] || 0) * (1 - f) + (data[j + 1] || 0) * f; }
    return out;
  }
  function mono(ab) {
    const n = ab.length, out = new Float32Array(n), chs = ab.numberOfChannels;
    for (let c = 0; c < chs; c++) { const d = ab.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] / chs; }
    return out;
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
    draft = { data, rate, a, b, name: nextName('Мой звук'), loud: true, kind: 'mic' };
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
      const raw = await file.arrayBuffer();
      /* Сразу в 22 кГц: длинная песня в 48 кГц стерео заняла бы на телефоне сотню мегабайт. */
      const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      try { ab = await decode(new OAC(1, 1, RATE), raw.slice(0)); } catch (e) { ab = await decode(Sonly.sound.ctx(), raw.slice(0)); }
    } catch (e) { ab = null; }
    if (!s._my || s._my.mode !== 'load') return; // пока открывали файл, человек ушёл со страницы
    if (!ab || ab.length < ab.sampleRate * 0.5) { setMode(flow, 'bad'); return; }
    const data = mono(ab), total = data.length / ab.sampleRate;
    const name = (file.name || '').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim().slice(0, 24) || nextName('Мой звук');
    draft = { data, rate: ab.sampleRate, a: 0, b: Math.min(1, 30 / total), name, loud: true, kind: 'file' };
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
      d._buf = ctx.createBuffer(1, d.data.length, d.rate);
      d._buf.getChannelData(0).set(d.data);
      d._ctx = ctx;
    }
    const total = d.data.length / d.rate, s0 = Math.floor(d.a * d.data.length), s1 = Math.floor(d.b * d.data.length);
    Sonly.sound.setVolume(flow.state.volume);
    const node = Sonly.sound.buffer(d._buf, { offset: d.a * total, dur: (d.b - d.a) * total, gain: d.loud ? gainOf(d.data, s0, s1) : 1, onend: () => { if (prev && prev.node === node) stopPrev(); } });
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

  /* ── Сохранение и удаление ───────────────────────────────── */

  async function save(flow) {
    const d = draft;
    if (!d) return;
    stopPrev();
    const field = flow.sheets.querySelector('.js-msname');
    const name = ((field && field.value) || d.name || '').trim().slice(0, 24) || nextName('Мой звук');
    const s0 = Math.floor(d.a * d.data.length), s1 = Math.floor(d.b * d.data.length);
    const seg = resample(d.data.subarray(s0, s1), d.rate, RATE), g = d.loud ? gainOf(seg) : 1, fade = Math.floor(RATE * 0.02);
    const pcm = new Int16Array(seg.length);
    for (let i = 0; i < seg.length; i++) {
      let v = seg[i] * g;
      if (i < fade) v *= i / fade;
      if (i > seg.length - fade) v *= (seg.length - i) / fade;
      pcm[i] = Math.round(clamp(v, -1, 1) * 32767);
    }
    const x = { id: d.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, kind: d.kind, rate: RATE, pcm, at: d.at || Date.now() };
    const i = list.findIndex((y) => y.id === x.id);
    if (i < 0) list.push(x); else list[i] = x;
    try { await tx('readwrite', (st) => st.put({ ...x, pcm: pcm.buffer.slice(0) })); } catch (e) { /* без хранилища — до закрытия страницы */ }
    done(flow, key(x));
  }
  async function remove(flow, id) {
    const s = flow.state, k = 'my:' + id, fall = (v) => (v === k ? (s.sndDef !== k ? s.sndDef : 'Рассвет') : v);
    s.alarms.forEach((a) => { a.sound = fall(a.sound); });
    if (s._ed) s._ed.sound = fall(s._ed.sound);
    if (s.sndDef === k) s.sndDef = 'Рассвет';
    list = list.filter((x) => x.id !== id);
    try { await tx('readwrite', (st) => st.delete(id)); } catch (e) { /* не было в хранилище */ }
    done(flow, '');
  }
  /** Возврат к списку звуков, откуда пришли. picked — новый звук, его сразу выбираем (и он звучит, как при выборе из списка). */
  function done(flow, picked) {
    const s = flow.state, back = (s._my && s._my.back) || 'set-snd';
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
  const tile = (kind, size = 22) => `<i class="ap-row-i c" style="--c:${COLOR[kind] || COLOR.mic}">${Sonly.si(kind === 'file' ? 'folder' : 'mic', size)}</i>`;
  const empty = (kind, title, note) => `<div class="ms-empty"><i class="ms-big" style="--c:${COLOR[kind]}">${Sonly.si(kind === 'file' ? 'folder' : 'mic', 40)}</i><b>${title}</b><p>${note}</p></div>`;

  /** Пример для снимков экрана (?sheet=page-mysnd.demo): восемь секунд «голоса» — нарастающие слоги. */
  function demoDraft() {
    const rate = RATE, n = rate * 8, data = new Float32Array(n);
    for (let i = 0; i < n; i++) { const t = i / rate, env = Math.max(0, Math.sin(t * Math.PI * 1.7)) * (0.25 + 0.6 * Math.abs(Math.sin(t * 0.7))); data[i] = env * Math.sin(2 * Math.PI * (180 + 60 * Math.sin(t * 3)) * t); }
    return { data, rate, a: 0.12, b: 0.78, name: 'Мой звук 1', loud: true, kind: 'mic' };
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
    if (mode === 'bad') return ['Свой звук', empty('file', m.why === 'big' ? 'Файл слишком большой' : 'Этот файл не открыть', m.why === 'big' ? 'Подойдёт файл до 40 МБ.' : 'Подойдут mp3, m4a и wav.'), '<button class="ap-btn" data-act="ms-file">Выбрать другой</button>', back];
    /* edit: волна целиком, жёлтая рамка — то, что будет звонить. */
    const d = draft;
    if (!d) return ['Свой звук', empty('mic', 'Звук не найден', 'Вернись к списку и выбери снова.'), '', back];
    const total = d.data.length / d.rate;
    return ['Свой звук', `<div class="ap-card ms-stage edit"><div class="ms-time"><b class="js-msl">${fmt((d.b - d.a) * total)}</b><span class="js-msr">${fmt(d.a * total)} – ${fmt(d.b * total)}</span></div>
        <div class="ms-wave js-wave" style="--a:${d.a};--b:${d.b};--p:${d.a}">${bars(peaks(d.data, BARS))}<i class="ms-dim l"></i><i class="ms-dim r"></i>
          <div class="ms-sel"><b class="ms-h l">${ic('chevron-left', 14, 3.4)}</b><b class="ms-h r">${ic('chevron-right', 14, 3.4)}</b></div><i class="ms-head"></i></div>
        <p class="ms-hint">${total > CLIP_MAX ? `Двигай края — звонить будет до ${CLIP_MAX} секунд` : 'Двигай края, чтобы обрезать'}</p></div>
      <div class="ms-ctl"><button class="ms-play" data-act="ms-play" aria-label="Прослушать">${Sonly.si('play', 30)}</button></div>
      <div class="ap-card ap-list">
        <label class="ap-row ms-name"><i class="ap-row-i">${ic('pencil', 16, 2.2)}</i><input class="js-msname" value="${esc(d.name)}" maxlength="24" placeholder="Название" aria-label="Название звука" autocomplete="off"></label>
        <div class="ap-row"><i class="ap-row-i">${Sonly.si('volume')}</i><span>Сделать громче</span><button class="ap-tg sm${d.loud ? ' on' : ''}" data-act="ms-loud" role="switch" aria-checked="${d.loud}" aria-label="Сделать громче"></button></div>
      </div>
      ${d.id ? `<button class="ms-del" data-act="ms-del">${ic('trash-2', 17, 2.2)}Удалить звук</button>` : ''}`,
      '<button class="ap-btn" data-act="ms-save">Сохранить</button>', back];
  }

  /** Перетаскивание краёв: ближний к пальцу край едет за ним; кусок — от секунды до минуты. */
  function mount(flow) {
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
      if (side === 'a') d.a = clamp(x, Math.max(0, d.b - maxL), d.b - minL);
      else d.b = clamp(x, d.a + minL, Math.min(1, d.a + maxL));
      paint();
    };
    w.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      stopPrev();
      const x = at(ev);
      side = Math.abs(x - d.a) <= Math.abs(x - d.b) ? 'a' : 'b';
      w.classList.add('drag', side);
      try { w.setPointerCapture(ev.pointerId); } catch (e) { /* без захвата тоже работает */ }
      move(ev);
    });
    w.addEventListener('pointermove', move);
    const up = () => { side = null; w.classList.remove('drag', 'a', 'b'); };
    w.addEventListener('pointerup', up);
    w.addEventListener('pointercancel', up);
  }

  /** Раздел «Свои» в списке звуков. act — что делает выбор строки там, где список открыт (ed-snd или set-snd). */
  const mineRows = (cur, act) => list.map((x) => `<div class="ap-row ap-snd my${cur === key(x) ? ' on' : ''}"><button class="ms-pick" data-act="${act}:${key(x)}" aria-label="${esc(x.name)}"></button>${tile(x.kind)}<span>${esc(x.name)}</span><em>${fmt(dur(x))}</em><b class="ap-radio">${ic('check', 13, 3.4)}</b><button class="ms-more" data-act="ms-edit:${x.id}:${act}" aria-label="Изменить «${esc(x.name)}»">${ic('ellipsis', 18, 2.6)}</button></div>`).join('');
  function rows(cur, act) {
    /* Обёртка без своей коробки: список, открытый раньше, чем звуки прочитались с телефона, дорисуется сам. */
    return `<h3>Свои</h3><div class="ap-card ap-list"><div class="ms-mine" data-cur="${esc(cur || '')}" data-base="${act}">${mineRows(cur, act)}</div>
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
        const data = new Float32Array(x.pcm.length);
        for (let i = 0; i < data.length; i++) data[i] = x.pcm[i] / 32768;
        draft = { data, rate: x.rate, a: 0, b: 1, name: x.name, loud: true, kind: x.kind, id: x.id, at: x.at };
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
      case 'ms-back': done(flow, ''); return true;
      default: return false;
    }
  }

  Sonly.mysnd = { rows, page, mount, on, buffer, label, list: () => list.slice(), ready };
})();
