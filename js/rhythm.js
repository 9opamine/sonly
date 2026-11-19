/* Ритм и «Угадай мелодию»: мелодии для задания (бит и ноты), а также старая проверка простуканного ритма
   (её проверяет tools/say-test.cjs). Общий код для браузера (Sonly.rhythm) и Node.
   Ритм — удары с короткими и длинными паузами. Темп у человека свой, поэтому сравниваем рисунок: паузы приводим к его темпу
   и смотрим, что каждая короткая осталась короткой, а длинная — длинной. */
(function (root, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Sonly = root.Sonly || {}).rhythm = api;
})(typeof self !== 'undefined' ? self : this, () => {
  'use strict';
  const SHORT = 400, LONG = 800;
  /* Допуск: пауза может отличаться от образца на треть, темп — от вдвое быстрее до вдвое медленнее. */
  const TOL = 0.34, SLOW = 1.8, FAST = 0.55;

  /** Ритм из n ударов: время каждого удара в мс от первого. Есть и короткие, и длинные паузы; длинные не идут три подряд. */
  function make(n, rnd = Math.random) {
    for (let k = 0; k < 200; k++) {
      const gaps = Array.from({ length: n - 1 }, () => (rnd() < 0.42 ? LONG : SHORT));
      const longs = gaps.filter((g) => g === LONG).length;
      if (!longs || longs === gaps.length) continue;
      if (gaps.some((g, i) => i >= 2 && g === LONG && gaps[i - 1] === LONG && gaps[i - 2] === LONG)) continue;
      const t = [0];
      gaps.forEach((g) => t.push(t[t.length - 1] + g));
      return t;
    }
    return Array.from({ length: n }, (_, i) => i * SHORT + (i === Math.floor(n / 2) ? SHORT : 0));
  }

  /**
   * Проверка простуканного. ref — образец, taps — время касаний (мс, любое начало).
   * Возвращает { ok, why, marks } — marks[i]: попал ли удар i (первый всегда попадает), why: 'fast', 'slow', 'off', 'count'.
   */
  function score(ref, taps) {
    const n = ref.length, marks = taps.slice(0, n).map((_, i) => i === 0);
    if (taps.length < n) return { ok: false, why: 'count', marks };
    const r = ref.slice(1).map((t, i) => t - ref[i]), u = taps.slice(1, n).map((t, i) => t - taps[i]);
    const s = u.reduce((a, b) => a + b, 0) / r.reduce((a, b) => a + b, 0);
    if (s < FAST || s > SLOW) return { ok: false, why: s < FAST ? 'fast' : 'slow', marks: marks.map((m, i) => i === 0) };
    u.forEach((x, i) => { marks[i + 1] = Math.abs(x / s - r[i]) / r[i] <= TOL; });
    const ok = marks.every(Boolean);
    return { ok, why: ok ? '' : 'off', marks };
  }

  /*
   * «Угадай мелодию»: бит — удары в такт нотам мелодии, без самих нот. Только музыка, на которую нет авторских прав:
   * классика и народные песни. Ноты — [название, длительность в четвертях]; '-' — пауза. q — секунд на четверть.
   */
  const TUNES = [
    ['ode', 'Ода к радости', 'Бетховен', 0.42, 'E4 1,E4 1,F4 1,G4 1,G4 1,F4 1,E4 1,D4 1,C4 1,C4 1,D4 1,E4 1,E4 1.5,D4 .5,D4 2'],
    ['elise', 'К Элизе', 'Бетховен', 0.36, 'E5 .5,D#5 .5,E5 .5,D#5 .5,E5 .5,B4 .5,D5 .5,C5 .5,A4 1.5,- .5,C4 .5,E4 .5,A4 .5,B4 1.5'],
    ['fifth', 'Пятая симфония', 'Бетховен', 0.42, 'G4 .5,G4 .5,G4 .5,D#4 2,- .5,F4 .5,F4 .5,F4 .5,D4 2.5'],
    ['turk', 'Турецкий марш', 'Моцарт', 0.5, 'B4 .25,A4 .25,G#4 .25,A4 .25,C5 1,D5 .25,C5 .25,B4 .25,C5 .25,E5 1,F5 .25,E5 .25,D#5 .25,E5 .25,B5 .25,A5 .25,G#5 .25,A5 .25,B5 .25,A5 .25,G#5 .25,A5 .25,C6 1.5'],
    ['king', 'В пещере горного короля', 'Григ', 0.38, 'B3 .5,C#4 .5,D4 .5,E4 .5,F#4 .5,D4 .5,F#4 1,F4 .5,C#4 .5,F4 1,E4 .5,C4 .5,E4 1'],
    ['jacob', 'Братец Яков', 'народная', 0.4, 'C4 1,D4 1,E4 1,C4 1,C4 1,D4 1,E4 1,C4 1,E4 1,F4 1,G4 2,E4 1,F4 1,G4 2'],
    ['bells', 'Jingle Bells', 'Пирпонт', 0.32, 'E4 1,E4 1,E4 2,E4 1,E4 1,E4 2,E4 1,G4 1,C4 1.5,D4 .5,E4 3'],
    ['birthday', 'С днём рождения тебя', 'Хилл', 0.45, 'G4 .75,G4 .25,A4 1,G4 1,C5 1,B4 2,G4 .75,G4 .25,A4 1,G4 1,D5 1,C5 2'],
    ['star', 'Twinkle, Twinkle, Little Star', 'народная', 0.42, 'C4 1,C4 1,G4 1,G4 1,A4 1,A4 1,G4 2,F4 1,F4 1,E4 1,E4 1,D4 1,D4 1,C4 2'],
  ].map(([id, name, by, q, seq]) => ({ id, name, by, q, notes: seq.split(',').map((x) => { const [n, d] = x.trim().split(' '); return [n === '-' ? 0 : hz(n), +d]; }) }));
  /** Частота ноты: «A4» — 440 Гц, «C#5», «D#4». */
  function hz(n) {
    const m = /^([A-G])(#?)(\d)$/.exec(n), st = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (+m[3] - 4) * 12;
    return 440 * Math.pow(2, st / 12);
  }
  /** Бит мелодии: время каждого удара в мс от первого (ноты без пауз). */
  const beat = (t) => { const out = []; let at = 0; t.notes.forEach(([f, d]) => { if (f) out.push(Math.round(at * t.q * 1000)); at += d; }); return out; };
  /** Сколько длится мелодия, мс. */
  const length = (t) => Math.round(t.notes.reduce((a, x) => a + x[1], 0) * t.q * 1000);

  return { make, score, SHORT, LONG, TUNES, beat, length, hz };
});
