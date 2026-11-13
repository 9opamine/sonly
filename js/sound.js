/* Звуки будильника. Собраны из простых тонов прямо в браузере, без файлов — поэтому любой звук можно прослушать. */
(() => {
  'use strict';
  let ctx = null, master = null, timer = null, live = [], volume = 0.8;

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
  };

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
    clearInterval(timer);
    timer = null;
    live.forEach((o) => { try { o.stop(); } catch (e) { /* нота уже отзвучала */ } });
    live = [];
  }
  /** Играет звук по имени. loop — по кругу, пока не остановят; rise — начать тихо и за 10 секунд дойти до полной громкости. */
  function play(name, o = {}) {
    if (!ready()) return;
    stop();
    const snd = BANK[name] || BANK['Будильник'], now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(o.rise ? volume * 0.15 : volume, now);
    if (o.rise) master.gain.linearRampToValueAtTime(volume, now + 10);
    const bar = () => { live = live.slice(-40); snd.notes.forEach((n) => note(ctx.currentTime + 0.03, n)); };
    bar();
    if (o.loop) timer = setInterval(bar, snd.len * 1000);
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

  Sonly.sound = {
    play, stop, tick, drum, names: Object.keys(BANK),
    /** Разрешает звук: браузер включает его только после нажатия. */
    unlock: () => ready(),
    /** Громкость 0–100. mute — заглушить текущий звонок, не трогая настройку. */
    setVolume(v) { volume = Math.max(0, Math.min(1, v / 100)); if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05); },
    mute(on) { if (master && ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(on ? 0 : volume, ctx.currentTime, 0.05); } },
  };
})();
