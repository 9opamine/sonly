/* Скороговорка: распознавание речи и сравнение услышанного с текстом. Сравнение — общее для браузера (Sonly.say) и Node (tools/say-test.cjs).
   Распознаватель путает окончания и слитное-раздельное написание («по-колпаковски» / «по колпаковски»), поэтому сравниваем
   нечётко: по словам по порядку и по буквам целиком. */
(function (root, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Sonly = root.Sonly || {}).say = api;
})(typeof self !== 'undefined' ? self : this, () => {
  'use strict';
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[‐‑-]/g, '').replace(/[^a-zа-я0-9\s]/g, ' ');
  /** Слова текста: только буквы и цифры, дефисы склеивают («по-колпаковски» → «поколпаковски»). */
  const words = (s) => norm(s).split(/\s+/).filter(Boolean);
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m || !n) return m || n;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  /** Слово сказано: совпало, или отличается на букву-две (окончание), или длинное слово совпало началом. */
  const close = (want, got) => want === got || lev(want, got) <= Math.max(1, Math.floor(want.length / 4)) || (want.length >= 6 && got.length >= 5 && want.slice(0, 5) === got.slice(0, 5));

  /**
   * Насколько услышанное похоже на скороговорку. heard — строка или несколько вариантов распознавания (берётся лучший).
   * Возвращает { got: [слово сказано?], ratio — доля сказанных слов, sim — похожесть по буквам 0…1, ok }.
   */
  function match(target, heard) {
    const want = words(target), list = (Array.isArray(heard) ? heard : [heard]).filter(Boolean);
    let best = { got: want.map(() => false), ratio: 0, sim: 0, ok: false };
    for (const h of list.length ? list : ['']) {
      const said = words(h), got = want.map(() => false);
      /* По порядку: каждое слово ищем дальше последнего найденного, заглядывая на 3 слова вперёд;
         слово, разбитое распознавателем на два, склеиваем. */
      let at = 0;
      want.forEach((w, i) => {
        for (let j = at; j < Math.min(said.length, at + 4); j++) {
          if (close(w, said[j]) || (j + 1 < said.length && close(w, said[j] + said[j + 1]))) { got[i] = true; at = j + 1; return; }
        }
      });
      const ratio = got.filter(Boolean).length / (want.length || 1);
      const a = want.join(''), b = said.join('');
      const sim = a.length ? Math.max(0, 1 - lev(a, b) / Math.max(a.length, b.length)) : 0;
      const ok = ratio >= 0.85 || (sim >= 0.8 && ratio >= 0.6);
      const score = ratio + sim;
      if (score > best.ratio + best.sim) best = { got, ratio, sim, ok };
    }
    return best;
  }

  /* ── Распознавание речи в браузере ───────────────────────── */
  let dict = null;
  const win = typeof window !== 'undefined' ? window : null;
  const SR = win && (win.SpeechRecognition || win.webkitSpeechRecognition);
  /* На claude.ai страница живёт во фрейме без микрофона — там слушает сам claude.ai (диктовка). */
  if (win && win.claude && typeof win.claude.use === 'function') win.claude.use('dictation').then((d) => { dict = d; }, () => {});
  const inFrame = () => { try { return !!win && win.self !== win.top; } catch (e) { return true; } };
  /** Чем слушать: 'native' — распознавание браузера, 'claude' — диктовка claude.ai, null — нечем. */
  const engine = () => (dict && (inFrame() || !SR) ? 'claude' : SR ? 'native' : null);
  const REASON = { 'not-allowed': 'denied', 'service-not-allowed': 'denied', 'audio-capture': 'nomic', 'no-speech': 'silence', network: 'network', aborted: 'stopped' };

  /**
   * Начинает слушать. Вызывать прямо из нажатия на кнопку. onText(варианты) — на каждый новый кусок речи;
   * onEnd(причина) — когда слушать перестали: 'end', 'silence', 'denied', 'nomic', 'network', 'stopped', 'none', 'error'.
   * Возвращает { stop() }. Слушает не дольше max мс.
   */
  function listen({ lang = 'ru-RU', onText, onEnd, max = 12000 }) {
    const how = engine();
    let ended = false, timer = 0;
    const end = (r) => { if (ended) return; ended = true; clearTimeout(timer); onEnd(r); };
    if (how === 'claude') {
      let text = '', partial = '';
      const offs = [
        dict.onPartial((e) => { partial = e.text || ''; onText([(text + ' ' + partial).trim()]); }),
        dict.onFinal((e) => { text += e.text || ''; partial = ''; onText([text.trim()]); }),
        dict.onState((e) => { if (e.state === 'idle' && e.reason) { offs.forEach((f) => f()); end(e.reason === 'stopped' || e.reason === 'viewer_stopped' ? 'end' : e.reason === 'not_granted' ? 'denied' : 'error'); } }),
      ];
      dict.start({ language: 'ru' }).catch((e) => {
        offs.forEach((f) => f());
        /* Диктовка недоступна для этого человека или языка — больше её не предлагаем, дальше слушает браузер или пример. */
        if (e && e.code === 'unavailable') dict = null;
        end(e && e.code === 'not_granted' ? 'denied' : 'error');
      });
      timer = setTimeout(() => dict.stop().catch(() => {}), max);
      return { how, stop: () => { dict.stop().catch(() => {}); } };
    }
    if (!how) { setTimeout(() => end('none'), 0); return { how, stop() {} }; }
    const r = new SR();
    let finals = '', reason = '';
    r.lang = lang;
    r.interimResults = true;
    r.continuous = true;
    r.maxAlternatives = 3;
    r.onresult = (e) => {
      let interim = [];
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finals += ' ' + res[0].transcript;
        else interim = Array.from(res).map((x) => x.transcript);
      }
      const base = finals.trim();
      onText(interim.length ? interim.map((x) => (base + ' ' + x).trim()) : [base]);
    };
    r.onerror = (e) => { reason = REASON[e.error] || 'error'; };
    r.onend = () => end(reason || 'end');
    try { r.start(); } catch (e) { setTimeout(() => end('error'), 0); }
    timer = setTimeout(() => { try { r.stop(); } catch (e) { /* уже остановлено */ } }, max);
    return { how, stop: () => { try { r.stop(); } catch (e) { /* уже остановлено */ } } };
  }

  return { words, match, lev, listen, engine };
});
