/* Счёт повторов по скелету с камеры. Общий код для браузера (Sonly.reps) и для проверки в Node (tools/reps-test.cjs).
   На входе — 33 точки тела в долях кадра (как у MediaPipe Pose) и время кадра; на выходе — счёт, фаза и подсказка.
   Повтор засчитывается только целиком: человек дошёл до нижней точки и вернулся в верхнюю. Половинки, махи руками
   и сгибания рук стоя не считаются. */
(function (root, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Sonly = root.Sonly || {}).reps = api;
})(typeof self !== 'undefined' ? self : this, () => {
  'use strict';
  /* Номера точек MediaPipe Pose. */
  const P = { nose: 0, ls: 11, rs: 12, le: 13, re: 14, lw: 15, rw: 16, lh: 23, rh: 24, lk: 25, rk: 26, la: 27, ra: 28 };
  const SEEN = 0.5;

  /** Угол в точке b между отрезками b→a и b→c, в градусах (координаты уже приведены к квадратным пикселям). */
  function angle(a, b, c) {
    const v1x = a.x - b.x, v1y = a.y - b.y, v2x = c.x - b.x, v2y = c.y - b.y;
    const d = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y) || 1;
    return (Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / d))) * 180) / Math.PI;
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  /**
   * Что меряем в каждом упражнении. Функция возвращает { v, hint } — значение для счёта или подсказку, почему считать нельзя.
   * down/up — пороги с запасом (гистерезис): ниже down — нижняя точка, выше up — верхняя. lower — нижняя точка, когда значение меньше.
   */
  const KINDS = {
    /* Приседания: насколько бедро опустилось — высота бедра над коленом в длинах голени. Стоя ≈ 1, присед до параллели ≈ 0,3.
       Работает и сбоку, и анфас (угол в колене анфас почти не меняется: бедро уходит к камере). Нужны плечи, бёдра, колени и стопы. */
    squat: {
      down: 0.52, up: 0.82, lower: true, minRep: 550,
      measure(q) {
        const legs = [[P.lh, P.lk, P.la], [P.rh, P.rk, P.ra]].filter((ids) => ids.every((i) => q.vis(i)));
        if (!legs.length || !(q.vis(P.ls) || q.vis(P.rs))) return { hint: 'body' };
        const r = legs.map(([h, k, an]) => (q.pt(k).y - q.pt(h).y) / (dist(q.pt(k), q.pt(an)) || 1));
        return { v: r.reduce((a, b) => a + b, 0) / r.length };
      },
    },
    /* Отжимания: угол в локте (плечо — локоть — запястье). Наверху ≈ 165°, внизу ≈ 90°.
       Человек должен быть в упоре: кисти ниже плеч, корпус не вертикальный — иначе это сгибание рук стоя. */
    pushup: {
      down: 105, up: 150, lower: true, minRep: 600,
      measure(q) {
        const arms = [[P.ls, P.le, P.lw], [P.rs, P.re, P.rw]].filter((ids) => ids.every((i) => q.vis(i)));
        if (!arms.length) return { hint: 'body' };
        const sh = arms.map(([s]) => q.pt(s)), wr = arms.map(([, , w]) => q.pt(w));
        const shY = sh.reduce((s, p) => s + p.y, 0) / sh.length, wrY = wr.reduce((s, p) => s + p.y, 0) / wr.length;
        const upper = arms.map(([s, e]) => dist(q.pt(s), q.pt(e))).reduce((a, b) => Math.max(a, b), 0);
        if (wrY < shY + upper * 0.25) return { hint: 'floor' };
        /* В упоре предплечья смотрят вниз, в пол: кисть ниже локтя. У стены или со сгибанием рук стоя кисть уходит вбок или вверх. */
        if (!arms.some(([, e, w]) => q.pt(w).y - q.pt(e).y > Math.abs(q.pt(w).x - q.pt(e).x) * 0.5)) return { hint: 'floor' };
        const hips = [P.lh, P.rh].filter((i) => q.vis(i));
        if (hips.length) {
          const h = hips.map((i) => q.pt(i)), hp = { x: h.reduce((s, p) => s + p.x, 0) / h.length, y: h.reduce((s, p) => s + p.y, 0) / h.length };
          const s0 = { x: sh.reduce((s, p) => s + p.x, 0) / sh.length, y: shY };
          if (hp.y - s0.y > Math.abs(hp.x - s0.x) * 1.4 && hp.y - s0.y > upper * 1.2) return { hint: 'floor' };
        }
        const a = arms.map(([s, e, w]) => angle(q.pt(s), q.pt(e), q.pt(w)));
        return { v: Math.min(...a) };
      },
    },
    /* Прыжки «ноги врозь, руки вверх»: раскрытие = руки над плечами и стопы шире бёдер. 0 — собран, 1 — раскрыт полностью.
       Махи руками без прыжка не считаются: раскрытие набирается только вместе с ногами. */
    jump: {
      down: 0.62, up: 0.28, lower: false, minRep: 250,
      measure(q) {
        const need = [P.ls, P.rs, P.lw, P.rw, P.lh, P.rh, P.la, P.ra];
        if (!need.every((i) => q.vis(i))) return { hint: 'body' };
        const sh = mid(q.pt(P.ls), q.pt(P.rs)), hp = mid(q.pt(P.lh), q.pt(P.rh));
        const torso = dist(sh, hp) || 1, hipW = Math.max(dist(q.pt(P.lh), q.pt(P.rh)), torso * 0.35);
        /* Руки: 0 — кисти у бёдер, 1 — кисти над головой. */
        const arm = (w) => Math.max(0, Math.min(1, (hp.y - q.pt(w).y) / (torso * 1.9)));
        const arms = Math.min(arm(P.lw), arm(P.rw));
        /* Ноги: 0 — стопы на ширине бёдер, 1 — стопы на 2,3 ширины бёдер и шире. */
        const legs = Math.max(0, Math.min(1, (dist(q.pt(P.la), q.pt(P.ra)) / hipW - 1.15) / 1.15));
        return { v: Math.min(arms, legs) * 0.5 + (arms + legs) * 0.25 };
      },
    },
  };

  /**
   * Новый счётчик. kind — squat, pushup или jump. aspect — ширина кадра / высота, чтобы углы были в квадратных пикселях.
   * push(landmarks, tMs) → { count, phase: 'up'|'down', depth 0…1 (насколько близко нижняя точка), hint, seen }.
   * hint: 'none' — человека нет в кадре, 'body' — видно не всё тело, 'floor' — для отжиманий нужен упор лёжа, null — всё хорошо.
   */
  function make(kind, aspect = 1) {
    const K = KINDS[kind];
    let count = 0, phase = 'up', since = 0, repStart = 0, sm = null, lastT = 0, lostSince = 0, hint = 'none', reachedDown = false;
    const st = { count: 0, phase: 'up', depth: 0, hint: 'none', seen: false };
    function out(h, depth) {
      Object.assign(st, { count, phase, hint: h, depth: depth == null ? st.depth : depth });
      return st;
    }
    return {
      get count() { return count; },
      reset() { count = 0; phase = 'up'; sm = null; reachedDown = false; },
      push(lm, t) {
        const dt = lastT ? Math.min(200, t - lastT) : 33;
        lastT = t;
        if (!lm || !lm.length) { st.seen = false; if (!lostSince) lostSince = t; return out(t - lostSince > 400 ? 'none' : hint); }
        st.seen = true;
        const q = {
          vis: (i) => lm[i] && (lm[i].visibility == null || lm[i].visibility > SEEN) && lm[i].x > -0.05 && lm[i].x < 1.05 && lm[i].y > -0.05 && lm[i].y < 1.05,
          pt: (i) => ({ x: lm[i].x * aspect, y: lm[i].y }),
        };
        const m = K.measure(q);
        if (m.v == null) {
          /* Короткие провалы распознавания не ломают повтор; подсказка — только если провал держится. */
          if (!lostSince) lostSince = t;
          if (t - lostSince > 500) hint = m.hint;
          return out(t - lostSince > 500 ? m.hint : null);
        }
        lostSince = 0;
        hint = null;
        /* Сглаживание дрожания точек: чем дольше кадр, тем сильнее верим новому значению. */
        const a = 1 - Math.exp(-dt / 70);
        sm = sm == null ? m.v : sm + (m.v - sm) * a;
        const isDown = K.lower ? sm < K.down : sm > K.down, isUp = K.lower ? sm > K.up : sm < K.up;
        const depth = Math.max(0, Math.min(1, K.lower ? (K.up - sm) / (K.up - K.down) : (sm - K.up) / (K.down - K.up)));
        if (phase === 'up' && isDown && t - since > 120) { phase = 'down'; since = t; reachedDown = true; if (!repStart) repStart = t; }
        else if (phase === 'down' && isUp && t - since > 120) {
          phase = 'up';
          since = t;
          /* Слишком быстрый повтор — дёрнулась точка, а не человек: не засчитываем. */
          if (reachedDown && t - repStart >= K.minRep) count++;
          reachedDown = false;
          repStart = 0;
        } else if (phase === 'up' && !isUp && !repStart) repStart = t;
        else if (phase === 'up' && isUp) repStart = 0;
        return out(null, depth);
      },
    };
  }

  return { make, KINDS, P, angle };
});
