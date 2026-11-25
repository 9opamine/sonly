/* Звуки будильника — настоящие записи из открытой библиотеки Freesound (все CC0, авторы в snd/CREDITS.txt), файлы в snd/.
   Файл скачивается при первом прослушивании и дальше берётся из памяти (и из кэша сайта без интернета).
   Короткие звуки интерфейса и заданий (щелчок, ритм, мелодии «Угадай мелодию») по-прежнему собираются из тонов. */
(() => {
  'use strict';
  let ctx = null, master = null, timer = null, live = [], volume = 0.8, gen = 0;

  /* [группа, название, файл в snd/, множитель громкости — все звуки доведены до одной громкости, сирены не тише]. */
  const SND = [
    ['Мелодии', 'Маримба', 'marimba', 1.01],
    ['Мелодии', 'Калимба', 'kalimba', 1.43],
    ['Мелодии', 'Шкатулка', 'musicbox', 1.29],
    ['Мелодии', 'Вибрафон', 'vibraphone', 1.81],
    ['Мелодии', 'Укулеле', 'ukulele', 1],
    ['Мелодии', 'Переливы', 'ripple', 0.97],
    ['Мелодии', 'Арпеджио', 'arpeggio', 5.33],
    ['Мелодии', 'Марш', 'march', 1.42],
    ['Мелодии', 'Рингтон', 'ringtone', 1.9],
    ['Мелодии', 'Мобильный', 'mobile', 1.48],
    ['Мелодии', 'Фанфары', 'fanfare', 1.17],
    ['Мелодии', 'Горн', 'bugle', 4.32],
    ['Будильники', 'Два колокольчика', 'twinbell', 1.09],
    ['Будильники', 'Механический', 'mechanical', 6],
    ['Будильники', 'Старинный', 'antique', 1.05],
    ['Будильники', 'Электронный', 'digital', 3.2],
    ['Будильники', 'Пищалка', 'beeper', 0.74],
    ['Будильники', 'Школьный звонок', 'school', 1.56],
    ['Будильники', 'Старый телефон', 'oldphone', 1.07],
    ['Будильники', 'Кукушка', 'cuckoo', 1.25],
    ['Будильники', 'Колокол', 'churchbell', 1.29],
    ['Будильники', 'Гонг', 'gong', 0.88],
    ['Будильники', 'Сонар', 'sonar', 1.85],
    ['Сирены', 'Полиция', 'police', 1.09],
    ['Сирены', 'Скорая', 'ambulance', 1.59],
    ['Сирены', 'Пожарные', 'firetruck', 1.08],
    ['Сирены', 'Воздушная тревога', 'airraid', 1.0],
    ['Сирены', 'Торнадо', 'tornado', 1.06],
    ['Сирены', 'Ядерная тревога', 'nuclear', 0.97],
    ['Сирены', 'Экстренное оповещение', 'eas', 0.97],
    ['Сирены', 'Штормовое предупреждение', 'storm', 1.16],
    ['Сирены', 'Тревога', 'alarm', 1.0],
    ['Сирены', 'Красная тревога', 'redalert', 0.99],
    ['Сирены', 'Погружение', 'dive', 1.31],
    ['Сирены', 'Автосигнализация', 'caralarm', 1.0],
    ['Природа', 'Петух', 'rooster', 0.96],
    ['Природа', 'Дрозд в саду', 'blackbird', 2.6],
  ];
  const DEF = 'Маримба';
  const BY = {};
  SND.forEach(([g, name, file, k]) => { BY[name] = { g, file, k }; });
  /* Прежние звуки (собранные из тонов) у тех, кто уже ставил будильник: какой настоящий звук играет вместо них. */
  const OLD = { 'Рассвет': 'Маримба', 'Капель': 'Калимба', 'Птицы за окном': 'Дрозд в саду', 'Будильник': 'Механический', 'Радио': 'Рингтон', 'Сирена': 'Тревога', 'Гудок': 'Автосигнализация',
    'Солнечный зайчик': 'Шкатулка', 'Утренний бриз': 'Вибрафон', 'Жаворонок': 'Переливы', 'Звонкий ручей': 'Переливы', 'Золотой рассвет': 'Арпеджио' };
  /** Название звука, который правда сыграет: свой (my:…) как есть, старое — его замена, неизвестное — звук по умолчанию. */
  const resolve = (name) => (/^my:/.test(name || '') ? name : BY[name] ? name : OLD[name] || DEF);

  /* Запасной сигнал — только если файл не скачался (нет сети и ещё не слушали): будильник не должен молчать. */
  const SPARE = { len: 1.0, notes: [[0, 880, 0.08, 'square', 0.28], [0.16, 880, 0.08, 'square', 0.28], [0.32, 880, 0.08, 'square', 0.28], [0.48, 880, 0.08, 'square', 0.28]] };

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
    const g = gen;
    /* Свой звук (my:…) — записанный, из файла или кусок песни. Пока список своих звуков читается с телефона, ждём его;
       звука нет — звук по умолчанию. */
    if (/^my:/.test(name || '') && Sonly.mysnd) {
      const b = Sonly.mysnd.buffer(name, ctx);
      if (b && b.then) { b.then((buf) => { if (g === gen) { if (buf) clip(buf, 1, o); else file(DEF, o, g); } }); return; }
      if (b) { clip(b, 1, o); return; }
    }
    file(resolve(name), o, g);
  }
  /* Готовые записи: скачиваем один раз, разбираем и держим в памяти. */
  const raws = {}, bufs = {};
  /* Файл скачивается отдельно от разбора: заранее (preload) — только скачать, без звукового контекста до нажатия. */
  function raw(name) {
    const x = BY[name];
    if (!raws[name]) raws[name] = fetch(`snd/${x.file}.mp3`).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); }).catch(() => { delete raws[name]; return null; });
    return raws[name];
  }
  function load(name) {
    if (!BY[name] || !ready()) return Promise.resolve(null);
    if (!bufs[name]) {
      bufs[name] = raw(name).then((a) => (a ? new Promise((ok, no) => { const p = ctx.decodeAudioData(a.slice(0), ok, no); if (p && p.then) p.then(ok, no); }) : null))
        .catch(() => null).then((buf) => { if (!buf) delete bufs[name]; return buf; });
    }
    return bufs[name];
  }
  function file(name, o, g) {
    if (/^my:/.test(name) || !BY[name]) name = DEF;
    load(name).then((buf) => {
      if (g !== gen) return;
      if (buf) clip(buf, BY[name].k, o); else spare(o);
    });
  }
  /*
   * Запись по кругу или на пробу. По краям MP3 есть доли секунды тишины от кодировщика — на стыке круга они дали бы
   * щелчок или паузу, поэтому круг идёт от первого звука до последнего (срезаем не больше 0,12 с: паузы внутри — часть звука,
   * как между звонками телефона). На пробу (выбор в списке) — до 8 секунд и плавно стихает.
   */
  function clip(buf, k, o) {
    const edge = (from, step) => {
      const d = buf.getChannelData(0), max = Math.floor(buf.sampleRate * 0.12);
      let i = 0;
      while (i < max && Math.abs(d[from + i * step] || 0) < 2e-4) i++;
      return i / buf.sampleRate;
    };
    const ls = edge(0, 1), le = buf.duration - edge(buf.length - 1, -1);
    const src = ctx.createBufferSource(), amp = ctx.createGain(), t = ctx.currentTime + 0.02;
    src.buffer = buf;
    amp.gain.value = k;
    src.connect(amp);
    amp.connect(master);
    if (o.loop) {
      src.loop = true;
      src.loopStart = ls;
      src.loopEnd = le;
      src.start(t, ls);
    } else {
      const len = Math.min(le - ls, 8);
      amp.gain.setValueAtTime(k, t + Math.max(0, len - 0.5));
      amp.gain.linearRampToValueAtTime(0.0001, t + len);
      src.start(t, ls);
      src.stop(t + len + 0.05);
    }
    live.push(src);
    return src;
  }
  function spare(o) {
    const bar = () => { live = live.slice(-40); SPARE.notes.forEach((n) => note(ctx.currentTime + 0.03, n)); };
    bar();
    if (o.loop) timer = setInterval(bar, SPARE.len * 1000);
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

  /*
   * Звуки экрана серии — мягкие, без «пианино»: 'flare' — огонь вспыхнул (короткий тёплый шорох),
   * 'win' — число перещёлкнулось (колокольчики вверх по мажорному аккорду), 'pop' — сегодняшний день залился огнём.
   * Колокольчик — синус с тихим неровным обертоном (как у челесты) и долгим мягким затуханием.
   */
  function bell(t, f, g, len) {
    [[1, g, len], [2.76, g * 0.1, len * 0.3], [5.4, g * 0.03, len * 0.15]].forEach(([m, gain, d]) => {
      const osc = ctx.createOscillator(), amp = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * m, t);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(gain, t + 0.008);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(amp);
      amp.connect(master);
      osc.start(t);
      osc.stop(t + d + 0.05);
      live.push(osc);
    });
  }
  function fx(name) {
    if (!ready()) return;
    session('playback');
    const now = ctx.currentTime, t = now + 0.02;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(volume, now);
    if (name === 'flare') {
      /* Шум через полосовой фильтр, который за полсекунды уходит вверх: «фух» вспыхнувшего огня. */
      const n = Math.floor(ctx.sampleRate * 0.7), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), amp = ctx.createGain();
      src.buffer = buf;
      bp.type = 'bandpass';
      bp.Q.value = 0.9;
      bp.frequency.setValueAtTime(260, t);
      bp.frequency.exponentialRampToValueAtTime(1900, t + 0.45);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(0.32, t + 0.12);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
      src.connect(bp); bp.connect(amp); amp.connect(master);
      src.start(t);
      src.stop(t + 0.7);
      live.push(src);
      /* Под шорохом — тёплый низкий тон, чтобы вспышка не звучала как помеха. */
      note(t, [0.02, 180, 0.4, 'sine', 0.18, 320]);
    } else if (name === 'win') {
      [659.3, 830.6, 987.8, 1318.5].forEach((f, i) => bell(t + i * 0.075, f, i === 3 ? 0.26 : 0.2, i === 3 ? 1.6 : 0.9));
      bell(t + 0.225, 1975.5, 0.06, 1.2);
    } else if (name === 'pop') {
      note(t, [0, 520, 0.11, 'sine', 0.3, 980]);
      bell(t + 0.04, 1568, 0.08, 0.5);
    }
  }

  Sonly.sound = {
    melody, song, buffer, fx,
    /** Звуковой контекст — для записи с микрофона и разбора файлов (свои звуки); null — браузер не умеет звук. */
    ctx: () => (ready() ? ctx : null),
    /** Тип звуковой сессии iPhone: 'playback' — звучать и в беззвучном режиме, 'auto' — перед записью с микрофона. */
    session,
    play, stop, tick, drum, names: SND.map((x) => x[1]),
    /** Звуки по группам для списка: [['Мелодии', ['Маримба', …]], …]. */
    groups: () => SND.reduce((out, [g, name]) => { const last = out[out.length - 1]; if (last && last[0] === g) last[1].push(name); else out.push([g, [name]]); return out; }, []),
    def: DEF, resolve,
    /** Заранее скачать звуки будильников: утром без интернета они уже будут в памяти и в кэше сайта. */
    preload(names) { [...new Set((names || []).map(resolve))].forEach((n) => { if (BY[n]) raw(n); }); },
    /** Разрешает звук: браузер включает его только после нажатия. */
    unlock: () => ready(),
    /** Громкость 0–100. mute — заглушить текущий звонок, не трогая настройку. */
    setVolume(v) { volume = Math.max(0, Math.min(1, v / 100)); if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05); },
    mute(on) { if (master && ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(on ? 0 : volume, ctx.currentTime, 0.05); } },
  };
})();
