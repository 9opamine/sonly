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
    /* Приседания: насколько опустились плечи и таз над стопами — от стойки этого человека (rel: запоминается, какой он стоя).
       Стопы при приседе стоят на месте, а плечи и таз идут вниз одинаково анфас, сбоку и сзади, при любой высоте телефона.
       Углы и длины частей ноги для этого не годятся: анфас колени выходят к камере, голень в кадре укорачивается, и присед
       выглядит почти как стойка. Плечи MediaPipe видит надёжно, даже когда точка таза анфас «не доезжает» вниз.
       Повтор — опустился до 0,82 стойки (бедро примерно на 45–50° от вертикали, присед до середины) и встал до 0,92.
       Наклон без приседа не считается: таз должен опуститься сам (gate). Сдвинулись стопы — человек переходит, это не повтор (foot).
       Нужны плечи, таз и стопы. */
    squat: {
      rel: true, down: 0.82, up: 0.92, gate: 0.9, gateOn: 'hip', shallow: 0.9, lower: true, minRep: 550,
      measure(q) {
        const legs = [[P.lh, P.la], [P.rh, P.ra]].filter((ids) => ids.every((i) => q.vis(i)));
        const sh = [P.ls, P.rs].filter((i) => q.vis(i));
        if (!legs.length || !sh.length) return { hint: 'body' };
        const avg = (f, list) => list.reduce((s, x) => s + f(x), 0) / list.length;
        const foot = { x: avg(([, an]) => q.pt(an).x, legs), y: avg(([, an]) => q.pt(an).y, legs) };
        return { c: { torso: foot.y - avg((i) => q.pt(i).y, sh), hip: foot.y - avg(([h]) => q.pt(h).y, legs) }, foot };
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
    /* Для мерок «от стойки»: сглаженные значения и стойка по каждой мерке, самое низкое место попытки, подсказка «глубже». */
    let cs = {}, base = {}, dip = 1, deeperTill = 0;
    const st = { count: 0, phase: 'up', depth: 0, hint: 'none', seen: false };
    function out(h, depth) {
      Object.assign(st, { count, phase, hint: h, depth: depth == null ? st.depth : depth });
      return st;
    }
    /**
     * Мерки → одно число: 1 — как стоит этот человек, меньше — ниже.
     * Стойка — верхняя огибающая: вверх догоняет быстро (человек выпрямился, подошёл ближе), вниз сползает медленно
     * и только наверху (отошёл, телефон чуть съехал). Во время приседа она не меняется.
     */
    function relative(c, dt) {
      const a = 1 - Math.exp(-dt / 70), rise = 1 - Math.exp(-dt / 250), fall = 1 - Math.exp(-dt / 5000), r = {};
      Object.keys(c).forEach((n) => {
        const s = (cs[n] = cs[n] == null ? c[n] : cs[n] + (c[n] - cs[n]) * a);
        if (base[n] == null) base[n] = s;
        else if (s > base[n]) base[n] += (s - base[n]) * rise;
        else if (phase === 'up' && s > base[n] * 0.9) base[n] += (s - base[n]) * fall;
        r[n] = base[n] > 0.05 ? s / base[n] : 1;
      });
      const v = Object.values(r).reduce((x, y) => x + y, 0) / Object.keys(r).length, g = r[K.gateOn] != null ? r[K.gateOn] : v;
      return { v, g, gateOk: K.gate == null || g < K.gate };
    }
    /* Где стоят стопы. Ушли больше чем на десятую часть роста в кадре — человек перешёл (или телефон сдвинули):
       стойка запоминается заново, начатый повтор не считается. Отошёл подальше — иначе выглядело бы как присед. */
    let foot = null, home = null, footAt = null, drift = 0;
    function moved(f, dt) {
      const a = 1 - Math.exp(-dt / 70);
      foot = foot ? { x: foot.x + (f.x - foot.x) * a, y: foot.y + (f.y - foot.y) * a } : { ...f };
      const scale = base.torso || cs.torso || 0;
      if (!home || !scale) { home = { ...foot }; return false; }
      if (Math.hypot(foot.x - home.x, foot.y - home.y) > scale * 0.1) { home = { ...foot }; return true; }
      const b = 1 - Math.exp(-dt / 1500);
      home.x += (foot.x - home.x) * b;
      home.y += (foot.y - home.y) * b;
      return false;
    }
    return {
      get count() { return count; },
      reset() { count = 0; phase = 'up'; sm = null; reachedDown = false; cs = {}; base = {}; dip = 1; foot = home = null; },
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
        if (m.v == null && !m.c) {
          /* Короткие провалы распознавания не ломают повтор; подсказка — только если провал держится. */
          if (!lostSince) lostSince = t;
          if (t - lostSince > 500) hint = m.hint;
          return out(t - lostSince > 500 ? m.hint : null);
        }
        lostSince = 0;
        hint = null;
        let gateOk = true, g = 1;
        if (m.foot && moved(m.foot, dt)) { cs = {}; base = {}; phase = 'up'; reachedDown = false; repStart = 0; dip = 1; }
        if (m.c) ({ v: sm, g, gateOk } = relative(m.c, dt));
        /* Насколько уехали стопы с начала повтора (самое дальнее место, а не только конец: отошёл и вернулся — тоже не повтор). */
        if (repStart && footAt && foot) drift = Math.max(drift, Math.hypot(foot.x - footAt.x, foot.y - footAt.y));
        else {
          /* Сглаживание дрожания точек: чем дольше кадр, тем сильнее верим новому значению. */
          const a = 1 - Math.exp(-dt / 70);
          sm = sm == null ? m.v : sm + (m.v - sm) * a;
        }
        const isDown = (K.lower ? sm < K.down : sm > K.down) && gateOk, isUp = K.lower ? sm > K.up : sm < K.up;
        const depth = Math.max(0, Math.min(1, K.lower ? (K.up - sm) / (K.up - K.down) : (sm - K.up) / (K.down - K.up)));
        /* Присел, но не до середины, и встал — подсказываем «глубже» (только у мерок от стойки; наклон без приседа — не попытка). */
        if (K.shallow != null && phase === 'up') {
          if (g < K.gate + 0.05) dip = Math.min(dip, sm);
          if (isUp && sm > K.up + 0.03) { if (dip < K.shallow) deeperTill = t + 2500; dip = 1; }
        }
        const begin = () => { repStart = t; footAt = foot && { ...foot }; drift = 0; };
        if (phase === 'up' && isDown && t - since > 120) { phase = 'down'; since = t; reachedDown = true; dip = 1; deeperTill = 0; if (!repStart) begin(); }
        else if (phase === 'down' && isUp && t - since > 120) {
          phase = 'up';
          since = t;
          /* Слишком быстрый повтор — дёрнулась точка, а не человек: не засчитываем.
             Повтор — на месте: если стопы за это время уезжали, человек отходил или подходил к телефону. */
          if (reachedDown && t - repStart >= K.minRep && drift < (base.torso || 1) * 0.06) count++;
          reachedDown = false;
          repStart = 0;
        } else if (phase === 'up' && !isUp && !repStart) begin();
        else if (phase === 'up' && isUp) repStart = 0;
        return out(t < deeperTill ? 'deeper' : null, depth);
      },
    };
  }

  return { make, KINDS, P, angle };
});
