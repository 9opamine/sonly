/* Решение по снимку: что на нём узнано и засчитано ли задание. Общий код для браузера (Sonly.verdict) и для проверки в Node.
   На входе — вектор снимка от MobileCLIP и готовые векторы описаний (models/clip-text.json). */
(function (root, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Sonly = root.Sonly || {}).verdict = api;
})(typeof self !== 'undefined' ? self : this, () => {
  'use strict';
  /* Предметы задания «Найди предмет» — те же id, что в js/tasks.js. */
  const OBJECTS = ['tap', 'soap', 'shower', 'brush', 'shampoo', 'mirror', 'kettle', 'mug', 'plate', 'pan', 'spoon', 'salt', 'book', 'lamp', 'tv', 'phones', 'plant', 'window', 'keys', 'shoes', 'bag', 'door', 'umbrella', 'coat'];
  /* Фото-задания и класс, который должен быть на снимке. */
  const TASKS = { bed: 'bed_made', sky: 'sky', pills: 'pills' };
  /* Классы «это не предмет»: на них не указываем «похоже на …». */
  const GENERIC = ['wall', 'floor', 'ceiling', 'room', 'person', 'hand', 'furniture', 'dark', 'screen', 'paper'];
  /* Порог уверенности: предмет должен быть первым и набрать не меньше MIN. */
  const MIN = 0.3;
  /* Предмет на фоне: хватит LOW, если он в LEAD раз вероятнее следующего предмета. */
  const LOW = 0.25, LEAD = 1.8;

  /** Вероятности классов: косинус снимка с каждым описанием, softmax с масштабом CLIP. */
  function probs(emb, E, labels, dim, scale) {
    let len = 0;
    for (let i = 0; i < dim; i++) len += emb[i] * emb[i];
    len = Math.sqrt(len) || 1;
    const logit = labels.map((_, li) => { let s = 0; for (let i = 0; i < dim; i++) s += emb[i] * E[li * dim + i]; return (s / len) * scale; });
    const mx = Math.max(...logit), ex = logit.map((x) => Math.exp(x - mx)), sum = ex.reduce((a, b) => a + b, 0);
    const out = {};
    labels.forEach((l, i) => { out[l] = ex[i] / sum; });
    return out;
  }
  const ranked = (p) => Object.keys(p).sort((a, b) => p[b] - p[a]);
  /** Что видно на снимке, если это не то, что просили: первый «предметный» класс. */
  const seen = (p, not) => ranked(p).find((k) => k !== not && !GENERIC.includes(k) && p[k] > 0.15) || null;

  /**
   * Засчитано ли задание. task — id предмета или фото-задания. Возвращает { ok, why, seen, p }:
   * why — 'screen' (снят экран или бумага), 'unmade' (кровать не заправлена), 'other' (на снимке другое), 'unsure' (не уверены).
   */
  function check(task, p) {
    const want = TASKS[task] || task, order = ranked(p), top = order[0];
    const res = (ok, why) => ({ ok, why: ok ? '' : why, seen: ok ? want : seen(p, want), p: p[want] || 0 });
    if ((top === 'screen' && task !== 'tv') || top === 'paper') return res(false, 'screen');
    if (task === 'bed') {
      const bed = p.bed_made + p.bed_unmade;
      if (bed < MIN) return res(false, 'other');
      return res(p.bed_made > p.bed_unmade * 1.5 && top === 'bed_made', 'unmade');
    }
    /* Остальное: среди «предметных» классов нужный — первый, с запасом над вторым. Фон (стена, комната, темнота) не мешает:
       телевизор в глубине комнаты или чайник в тёмной кухне тоже засчитываются. */
    const things = order.filter((k) => !GENERIC.includes(k));
    const first = things[0], second = p[things[1]] || 0;
    if ((top === want && p[want] >= MIN) || (first === want && p[want] >= LOW && p[want] >= second * LEAD)) return res(true);
    return res(false, p[want] > 0.12 ? 'unsure' : 'other');
  }

  return { OBJECTS, TASKS, GENERIC, MIN, probs, check, ranked };
});
