/* Звуки будильника. Собраны из простых тонов прямо в браузере, без файлов — поэтому любой звук можно прослушать. */
(() => {
  'use strict';
  let ctx = null, master = null, timer = null, live = [], volume = 0.8, gen = 0;

  /* Нота: [начало, частота, длительность, форма волны, громкость, частота в конце — для скольжения]. len — длина такта. */
  const BANK = {
    'Рассвет': { len: 2.4, notes: [[0, 523, 0.9, 'sine', 0.5], [0.45, 659, 0.9, 'sine', 0.45], [0.9, 784, 0.9, 'sine', 0.45], [1.35, 1047, 1.0, 'sine', 0.4]] },
    'Капель': { len: 2.0, notes: [[0, 1319, 0.22, 'triangle', 0.5], [0.34, 1568, 0.22, 'triangle', 0.45], [0.92, 1175, 0.22, 'triangle', 0.5], [1.26, 1760, 0.3, 'triangle', 0.4]] },
    'Птицы за окном': { len: 2.2, notes: [[0, 2400, 0.09, 'sine', 0.4, 3400], [0.14, 2600, 0.09, 'sine', 0.4, 3600], [0.28, 2400, 0.12, 'sine', 0.4, 3200], [1.1, 3000, 0.08, 'sine', 0.35, 2200], [1.22, 3000, 0.08, 'sine', 0.35, 2200]] },
    'Будильник': { len: 1.0, notes: [[0, 880, 0.08, 'square', 0.28], [0.16, 880, 0.08, 'square', 0.28], [0.32, 880, 0.08, 'square', 0.28], [0.48, 880, 0.08, 'square', 0.28]] },
    'Колокол': { len: 1.8, notes: [[0, 660, 1.5, 'sine', 0.5], [0, 1320, 1.1, 'sine', 0.25], [0, 1987, 0.7, 'sine', 0.12]] },
    'Радио': { len: 2.0, notes: [[0, 392, 0.28, 'triangle', 0.5], [0.3, 523, 0.28, 'triangle', 0.5], [0.6, 659, 0.5, 'triangle', 0.5]] },
    'Сирена': { len: 1.2, notes: [[0, 620, 0.6, 'sawtooth', 0.22, 1180], [0.6, 1180, 0.6, 'sawtooth', 0.22, 620]] },
    'Гудок': { len: 1.3, notes: [[0, 196, 0.7, 'sawtooth', 0.26], [0, 247, 0.7, 'sawtooth', 0.2]] },
    /* Награды за серию. */
    'Солнечный зайчик': { len: 1.7, notes: [[0, 784, 0.2, 'triangle', 0.45], [0.18, 988, 0.2, 'triangle', 0.45], [0.36, 1175, 0.2, 'triangle', 0.45], [0.54, 1568, 0.5, 'triangle', 0.4]] },
    'Утренний бриз': { len: 2.6, notes: [[0, 440, 1.3, 'sine', 0.32], [0, 554, 1.3, 'sine', 0.26], [0, 659, 1.3, 'sine', 0.24], [1.2, 494, 1.3, 'sine', 0.3], [1.2, 622, 1.3, 'sine', 0.24], [1.2, 740, 1.3, 'sine', 0.22]] },
    'Жаворонок': { len: 1.9, notes: [[0, 2700, 0.07, 'sine', 0.34, 3500], [0.1, 2900, 0.07, 'sine', 0.34, 3700], [0.2, 2700, 0.07, 'sine', 0.34, 3500], [0.3, 3100, 0.07, 'sine', 0.34, 3900], [0.62, 3300, 0.16, 'sine', 0.3, 2500], [0.84, 3300, 0.16, 'sine', 0.3, 2500]] },
    'Звонкий ручей': { len: 1.9, notes: [[0, 1047, 0.18, 'triangle', 0.42], [0.12, 1319, 0.18, 'triangle', 0.4], [0.24, 1175, 0.18, 'triangle', 0.4], [0.36, 1568, 0.18, 'triangle', 0.38], [0.5, 1397, 0.22, 'triangle', 0.36], [0.66, 1760, 0.36, 'triangle', 0.34]] },
    'Золотой рассвет': { len: 2.9, notes: [[0, 392, 1.7, 'sine', 0.32], [0, 494, 1.7, 'sine', 0.26], [0, 587, 1.7, 'sine', 0.24], [0.8, 784, 1.5, 'sine', 0.28], [1.25, 988, 1.3, 'sine', 0.22], [1.7, 1175, 1.1, 'sine', 0.18]] },
  };

  /* iPhone глушит звук страницы переключателем «Без звука». Будильнику так нельзя: тип «воспроизведение» звучит и в беззвучном
     режиме (Safari 17+, Telegram на iOS). Перед микрофоном (скороговорка) тип возвращается на «авто». */
  function session(type) { try { if (navigator.audioSession && navigator.audioSession.type !== type) navigator.audioSession.type = type; } catch (e) { /* нет такой возможности */ } }
  function ready() {
    try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
    if (ctx.state === 'suspended') ctx.resume();
    if (!master) { master = ctx.createGain(); master.connect(ctx.destination); }
    return true;
  }
  function note(t0, [at, freq, dur, type, gain, slide]) {
    const osc = ctx.createOscillator(), amp = ctx.createGain(), t = t0 + at;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.03, dur / 3));
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    live.push(osc);
  }
  function stop() {
    gen++;
    clearInterval(timer);
    timer = null;
    live.forEach((o) => { try { o.stop(); } catch (e) { /* нота уже отзвучала */ } });
    live = [];
  }
  /** Играет звук по имени. loop — по кругу, пока не остановят; rise — начать тихо и за 10 секунд дойти до полной громкости. */
  function play(name, o = {}) {
    if (!ready()) return;
    stop();
    session('playback');
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(o.rise ? volume * 0.15 : volume, now);
    if (o.rise) master.gain.linearRampToValueAtTime(volume, now + 10);
    /* Свой звук (my:…) — записанный или из файла. Пока список своих звуков читается с телефона, ждём его; звука нет — «Рассвет». */
    if (/^my:/.test(name || '') && Sonly.mysnd) {
      const b = Sonly.mysnd.buffer(name, ctx), g = gen;
      if (b && b.then) { b.then((buf) => { if (g === gen) { if (buf) source(buf, { loop: o.loop }); else tones('Рассвет', o); } }); return; }
      if (b) { source(b, { loop: o.loop }); return; }
      name = 'Рассвет';
    }
    tones(name, o);
  }
  function tones(name, o) {
    const snd = BANK[name] || BANK['Будильник'];
    const bar = () => { live = live.slice(-40); snd.notes.forEach((n) => note(ctx.currentTime + 0.03, n)); };
    bar();
    if (o.loop) timer = setInterval(bar, snd.len * 1000);
  }
  /** Запись целиком или кусок: offset и dur в секундах, gain — множитель «Сделать громче», onend — когда кусок доиграл. */
  function source(buf, o = {}) {
    const src = ctx.createBufferSource(), t = ctx.currentTime + 0.02;
    src.buffer = buf;
    let out = src;
    if (o.gain && o.gain !== 1) { const g = ctx.createGain(); g.gain.value = o.gain; src.connect(g); out = g; }
    out.connect(master);
    if (o.loop) { src.loop = true; src.start(t); } else src.start(t, o.offset || 0, o.dur || buf.duration);
    if (o.onend) src.onended = o.onend;
    live.push(src);
    return src;
  }
  /** Прослушать запись на странице «Свой звук»: останавливает всё, что играло; громкость — из настроек. */
  function buffer(buf, o = {}) {
    if (!ready()) return null;
    stop();
    session('playback');
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(volume, ctx.currentTime);
    return source(buf, o);
  }

  /** Короткий щелчок: нажатие клавиши, удар ритма. */
  function tick(freq = 660) { if (ready()) { master.gain.setValueAtTime(volume, ctx.currentTime); note(ctx.currentTime, [0, freq, 0.07, 'triangle', 0.35]); } }

  /** Удар ритма: низкий «бум» со щелчком. at — через сколько секунд от сейчас; звуки ставятся в расписание точно, без задержек таймеров. */
  function drum(at = 0, soft = false) {
    if (!ready()) return;
    const t = ctx.currentTime + Math.max(0, at);
    master.gain.setValueAtTime(volume, ctx.currentTime);
    note(t, [0, soft ? 300 : 170, soft ? 0.12 : 0.22, 'sine', soft ? 0.5 : 0.8, soft ? 140 : 55]);
    note(t, [0, soft ? 1800 : 2600, 0.025, 'square', soft ? 0.05 : 0.09]);
  }

  /** Нота «пианино»: быстрый удар и затухание. Обертоны — чтобы мелодию было слышно и на маленьком динамике телефона. */
  function key(t, f, len, g) {
    [[1, 'triangle', g], [2, 'sine', g * 0.34], [3, 'sine', g * 0.1]].forEach(([m, type, gain]) => {
      const osc = ctx.createOscillator(), amp = ctx.createGain(), end = t + len;
      osc.type = type;
      osc.frequency.setValueAtTime(f * m, t);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(gain, t + 0.012);
      amp.gain.exponentialRampToValueAtTime(gain * (m === 1 ? 0.32 : 0.12), end);
      amp.gain.exponentialRampToValueAtTime(0.0001, end + 0.16);
      osc.connect(amp);
      amp.connect(master);
      osc.start(t);
      osc.stop(end + 0.2);
      live.push(osc);
    });
  }
  /** Мелодия нотами: [частота, длительность в четвертях], 0 — пауза; q — секунд на четверть. Возвращает длину в секундах. */
  function melody(notes, q) { return song(notes, q).len; }
  /**
   * Мелодия для «Угадай мелодию»: чистая партия «пианино» — по ней песню и узнают. full — та же мелодия с басом и барабанами:
   * так звучит награда за верный ответ. Возвращает длину в секундах и время каждой ноты (для подсветки в такт).
   */
  function song(notes, q, full = false) {
    if (!ready()) return { len: 0, at: [] };
    stop();
    session('playback');
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(volume, ctx.currentTime);
    const t0 = ctx.currentTime + 0.06, at = [];
    let t = 0;
    notes.forEach(([f, d]) => {
      if (f) {
        const len = Math.max(0.16, d * q * 0.96);
        key(t0 + t, f, len, full ? 0.3 : 0.36);
        if (full) note(t0 + t, [0, f > 400 ? f / 4 : f / 2, len, 'triangle', 0.2]);
        at.push([t, f]);
      }
      t += d * q;
    });
    if (full) {
      const beat = q < 0.36 ? q * 2 : q;
      for (let b = 0; b * beat < t - 0.02; b++) {
        const tb = t0 + b * beat;
        note(tb, [0, 150, 0.2, 'sine', b % 2 ? 0.45 : 0.7, 48]);
        note(tb + beat / 2, [0, 7000, 0.03, 'square', 0.035]);
      }
    }
    return { len: t + 0.06, at };
  }

  Sonly.sound = {
    melody, song, buffer,
    /** Звуковой контекст — для записи с микрофона и разбора файлов (свои звуки); null — браузер не умеет звук. */
    ctx: () => (ready() ? ctx : null),
    /** Тип звуковой сессии iPhone: 'playback' — звучать и в беззвучном режиме, 'auto' — перед записью с микрофона. */
    session,
    play, stop, tick, drum, names: Object.keys(BANK),
    /** Длина такта звука в секундах. */
    len: (name) => (BANK[name] || BANK['Будильник']).len,
    /** Разрешает звук: браузер включает его только после нажатия. */
    unlock: () => ready(),
    /** Громкость 0–100. mute — заглушить текущий звонок, не трогая настройку. */
    setVolume(v) { volume = Math.max(0, Math.min(1, v / 100)); if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05); },
    mute(on) { if (master && ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(on ? 0 : volume, ctx.currentTime, 0.05); } },
  };
})();
