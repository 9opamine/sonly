/* Ритм: какой ритм простучать и как проверить. Общий код для браузера (Sonly.rhythm) и Node (tools/rhythm-test.cjs).
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

  return { make, score, SHORT, LONG };
});
