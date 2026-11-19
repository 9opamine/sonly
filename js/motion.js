/* Шаги и встряхивания по акселерометру телефона. Общий код для браузера (Sonly.motion) и для проверки в Node (tools/motion-test.cjs).
   На входе — ускорение с учётом тяжести (м/с²) и время; на выходе — счёт. Телефон в руке: при ходьбе ускорение колеблется
   1,5–2,5 раза в секунду, встряска — резкие рывки выше 13 м/с² сверх тяжести. */
(function (root, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Sonly = root.Sonly || {}).motion = api;
})(typeof self !== 'undefined' ? self : this, () => {
  'use strict';
  /**
   * Новый счётчик: 'steps' или 'shake'. push(ax, ay, az, tMs) → число засчитанных шагов или встряхиваний.
   * Тяжесть вычитается плавающим средним, поэтому неважно, как держат телефон.
   */
  function make(kind) {
    let g = null, sm = 0, armed = true, last = -1e9, count = 0, lastT = 0, peak = 0, rough = -1e9;
    /* Шаги: рывки сильнее 11 м/с² при ходьбе с телефоном в руке не бывают — это тряска. Пока трясут (и ещё 1,2 с после),
       шаги не считаются: иначе 20 «шагов» набирались бы встряской за пять секунд, не вставая с кровати. */
    const ROUGH = 11, CALM = 1200;
    const S = kind === 'shake'
      ? { hi: 13, lo: 4, gap: 160, smooth: 25 }
      : { hi: 1, lo: 0.3, gap: 260, smooth: 35 };
    return {
      get count() { return count; },
      /** Сейчас телефон трясут, а не идут с ним (только для шагов). */
      get shaking() { return kind !== 'shake' && lastT - rough < CALM; },
      push(ax, ay, az, t) {
        const m = Math.hypot(ax || 0, ay || 0, az || 0), dt = lastT ? Math.min(100, t - lastT) : 16;
        lastT = t;
        /* Тяжесть — очень медленное среднее модуля ускорения; всё, что сверху, — движение. */
        g = g == null ? m : g + (m - g) * (1 - Math.exp(-dt / 900));
        const dyn = m - g;
        sm += (dyn - sm) * (1 - Math.exp(-dt / S.smooth));
        const v = kind === 'shake' ? Math.abs(dyn) : sm;
        if (kind !== 'shake' && Math.abs(dyn) > ROUGH) { rough = t; armed = false; }
        const calm = kind === 'shake' || t - rough >= CALM;
        if (armed && calm && v > S.hi && t - last > S.gap) { count++; last = t; armed = false; peak = v; }
        else if (!armed && v < S.lo) armed = true;
        else if (!armed) peak = Math.max(peak, v);
        return count;
      },
    };
  }
  return { make };
});
