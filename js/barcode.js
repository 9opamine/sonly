/* Штрихкоды EAN-13, UPC-A и EAN-8 — те, что на пасте, книгах, кофе, — без BarcodeDetector (его нет в Safari на iPhone).
   Общий код для браузера (Sonly.barcode) и для проверки в Node (tools/barcode-test.cjs).
   Кадр читается по линиям: строки, столбцы и две диагонали. На каждой линии яркость делится на тёмное и светлое
   по местному порогу, из переходов получаются ширины полос; дальше ищутся служебные полосы EAN, цифры узнаются
   по ширинам (ближайший образец) и проверяются контрольной цифрой. Код засчитывается, только если его прочли
   хотя бы на двух линиях: случайный «код» из узора обоев так не пройдёт. */
(function (root, make) {
  const api = make();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Sonly = root.Sonly || {}).barcode = api;
})(typeof self !== 'undefined' ? self : this, () => {
  'use strict';
  /* Ширины полос цифры в модулях: левая половина, набор L (пробел, полоса, пробел, полоса). G — L задом наперёд, R = L. */
  const L = [[3, 2, 1, 1], [2, 2, 2, 1], [2, 1, 2, 2], [1, 4, 1, 1], [1, 1, 3, 2], [1, 2, 3, 1], [1, 1, 1, 4], [1, 3, 1, 2], [1, 2, 1, 3], [3, 1, 1, 2]];
  const G = L.map((r) => r.slice().reverse());
  /* Первая цифра EAN-13 зашифрована в том, какие из шести левых цифр — L, а какие — G. */
  const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
  const MAXD = 1.5;

  /** Контрольная цифра: справа налево веса 3, 1, 3, 1… */
  function checkDigit(ds) {
    let s = 0;
    for (let i = 0; i < ds.length; i++) s += ds[ds.length - 1 - i] * (i % 2 ? 1 : 3);
    return (10 - (s % 10)) % 10;
  }
  /** Ближайшая цифра по четырём ширинам. */
  function digit(r, at, table) {
    const sum = r[at] + r[at + 1] + r[at + 2] + r[at + 3], k = 7 / sum;
    let best = -1, bd = 99;
    for (let d = 0; d < 10; d++) {
      const p = table[d], dist = Math.abs(r[at] * k - p[0]) + Math.abs(r[at + 1] * k - p[1]) + Math.abs(r[at + 2] * k - p[2]) + Math.abs(r[at + 3] * k - p[3]);
      if (dist < bd) { bd = dist; best = d; }
    }
    return { d: best, dist: bd };
  }
  /** Служебные полосы — по модулю каждая; перед кодом и после — пустое поле не уже трёх модулей. */
  function frame(r, i, n, mods, guards) {
    if (i < 1 || i + n > r.length - 1) return 0;
    let total = 0;
    for (let j = 0; j < n; j++) total += r[i + j];
    const m = total / mods;
    if (r[i - 1] < m * 3 || r[i + n] < m * 3) return 0;
    for (const j of guards) if (r[i + j] < m * 0.45 || r[i + j] > m * 1.8) return 0;
    return m;
  }
  function ean13(r, i) {
    if (!frame(r, i, 59, 95, [0, 1, 2, 27, 28, 29, 30, 31, 56, 57, 58])) return null;
    const ds = [], par = [];
    for (let k = 0; k < 6; k++) {
      const a = digit(r, i + 3 + k * 4, L), b = digit(r, i + 3 + k * 4, G), x = a.dist <= b.dist ? a : b;
      if (x.dist > MAXD) return null;
      par.push(a.dist <= b.dist ? 'L' : 'G');
      ds.push(x.d);
    }
    const first = PARITY.indexOf(par.join(''));
    if (first < 0) return null;
    for (let k = 0; k < 6; k++) {
      const x = digit(r, i + 32 + k * 4, L);
      if (x.dist > MAXD) return null;
      ds.push(x.d);
    }
    const all = [first, ...ds];
    if (checkDigit(all.slice(0, 12)) !== all[12]) return null;
    return { text: all.join(''), format: first === 0 ? 'upc_a' : 'ean_13' };
  }
  function ean8(r, i) {
    if (!frame(r, i, 43, 67, [0, 1, 2, 19, 20, 21, 22, 23, 40, 41, 42])) return null;
    const ds = [];
    for (let k = 0; k < 4; k++) { const x = digit(r, i + 3 + k * 4, L); if (x.dist > MAXD) return null; ds.push(x.d); }
    for (let k = 0; k < 4; k++) { const x = digit(r, i + 24 + k * 4, L); if (x.dist > MAXD) return null; ds.push(x.d); }
    if (checkDigit(ds.slice(0, 7)) !== ds[7]) return null;
    return { text: ds.join(''), format: 'ean_8' };
  }
  /** Все коды на одной линии ширин (начиная с тёмной полосы). */
  function fromRuns(r, darkFirst) {
    const out = [];
    for (let i = darkFirst ? 0 : 1; i < r.length; i += 2) {
      const x = ean13(r, i) || ean8(r, i);
      if (x) out.push(x);
    }
    return out;
  }

  /** Скользящий минимум и максимум окна 2w+1 (очередь), порог — середина; где перепада нет — считаем светлым. */
  function runsOf(v, w, smooth = true) {
    const n = v.length, s = new Float32Array(n);
    for (let i = 0; i < n; i++) s[i] = smooth ? (v[i > 0 ? i - 1 : 0] + 2 * v[i] + v[i < n - 1 ? i + 1 : n - 1]) / 4 : v[i];
    const lo = new Float32Array(n), hi = new Float32Array(n), qa = new Int32Array(n), qb = new Int32Array(n);
    let ah = 0, at = 0, bh = 0, bt = 0;
    for (let j = 0; j < n + w; j++) {
      if (j < n) {
        while (at > ah && s[qa[at - 1]] >= s[j]) at--;
        qa[at++] = j;
        while (bt > bh && s[qb[bt - 1]] <= s[j]) bt--;
        qb[bt++] = j;
      }
      const i = j - w;
      if (i < 0) continue;
      while (qa[ah] < i - w) ah++;
      while (qb[bh] < i - w) bh++;
      lo[i] = s[qa[ah]];
      hi[i] = s[qb[bh]];
    }
    const runs = [];
    let last = 0, dark = false;
    const isDark = (i) => hi[i] - lo[i] > 28 && s[i] < (lo[i] + hi[i]) / 2;
    dark = isDark(0);
    const startDark = dark;
    for (let i = 1; i < n; i++) {
      const d = isDark(i);
      if (d === dark) continue;
      const ta = (lo[i - 1] + hi[i - 1]) / 2, tb = (lo[i] + hi[i]) / 2, a = s[i - 1] - ta, b = s[i] - tb;
      const pos = i - 1 + (a === b ? 0.5 : Math.max(0, Math.min(1, a / (a - b))));
      runs.push(pos - last);
      last = pos;
      dark = d;
    }
    runs.push(n - last);
    return { runs, startDark };
  }
  /** Яркость вдоль отрезка (билинейно). g — серый кадр w×h. */
  function line(g, w, h, x0, y0, x1, y1) {
    const len = Math.floor(Math.hypot(x1 - x0, y1 - y0)), out = new Float32Array(len), dx = (x1 - x0) / len, dy = (y1 - y0) / len;
    for (let i = 0; i < len; i++) {
      const x = Math.min(w - 1.001, Math.max(0, x0 + dx * i)), y = Math.min(h - 1.001, Math.max(0, y0 + dy * i));
      const xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, p = yi * w + xi;
      out[i] = (g[p] * (1 - fx) + g[p + 1] * fx) * (1 - fy) + (g[p + w] * (1 - fx) + g[p + w + 1] * fx) * fy;
    }
    return out;
  }
  /**
   * Линии чтения: строки и столбцы по середине кадра и диагонали. Строки и столбцы — не реже чем через 22 точки:
   * в высоком кадре камеры iPhone (720 × 1280) 13 строк шли бы через 64 точки, и невысокую этикетку пересекала бы одна.
   */
  function lines(w, h) {
    const out = [], nh = Math.max(13, Math.min(41, Math.round((h * 0.6) / 22) + 1)), nv = Math.max(11, Math.min(41, Math.round((w * 0.7) / 22) + 1));
    for (let k = 0; k < nh; k++) { const y = h * (0.2 + 0.6 * (k / (nh - 1))); out.push([0, y, w - 1, y]); }
    for (let k = 0; k < nv; k++) { const x = w * (0.15 + 0.7 * (k / (nv - 1))); out.push([x, 0, x, h - 1]); }
    const c = [w / 2, h / 2], R = Math.min(w, h) * 0.48;
    [Math.PI / 9, -Math.PI / 9, Math.PI / 2 + Math.PI / 9, Math.PI / 2 - Math.PI / 9].forEach((a) => out.push([c[0] - Math.cos(a) * R, c[1] - Math.sin(a) * R, c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R]));
    return out;
  }
  /**
   * Ищет коды на сером кадре. Возвращает { text, format, lines } того кода, что прочли чаще всего, или null.
   * need — на скольких линиях код должен прочитаться (по умолчанию 2).
   */
  function decodeGray(g, w, h, need = 2) {
    const seen = new Map();
    for (const [x0, y0, x1, y1] of lines(w, h)) {
      const v = line(g, w, h, x0, y0, x1, y1);
      const found = new Set();
      for (const [win, sm] of [[6, false], [12, true], [36, true]]) {
        const { runs, startDark } = runsOf(v, win, sm);
        const rev = runs.slice().reverse(), revDark = runs.length % 2 ? startDark : !startDark;
        for (const x of [...fromRuns(runs, startDark), ...fromRuns(rev, revDark)]) found.add(x.format + ':' + x.text);
      }
      found.forEach((key) => seen.set(key, (seen.get(key) || 0) + 1));
    }
    let best = null;
    seen.forEach((n, key) => { if (n >= need && (!best || n > best.lines)) { const [format, text] = key.split(':'); best = { text, format, lines: n }; } });
    return best;
  }
  /** То же по картинке браузера: видео, холст или ImageData; кадр уменьшается до longest точек по длинной стороне. */
  let cv = null;
  function decode(src, o = {}) {
    let img = src;
    if (!(src && src.data && src.width)) {
      const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
      if (!sw || !sh) return null;
      const k = Math.min(1, (o.longest || 1280) / Math.max(sw, sh)), w = Math.round(sw * k), h = Math.round(sh * k);
      cv = cv || document.createElement('canvas');
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      const c = cv.getContext('2d', { willReadFrequently: true });
      c.drawImage(src, 0, 0, w, h);
      img = c.getImageData(0, 0, w, h);
    }
    const n = img.width * img.height, g = new Uint8Array(n), d = img.data;
    for (let i = 0; i < n; i++) g[i] = (d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) >> 8;
    return decodeGray(g, img.width, img.height, o.need || 2);
  }

  /** Модули EAN-13 для печати: строка из 0 и 1 (95 модулей). code — 12 или 13 цифр. */
  function bits(code) {
    const ds = String(code).replace(/\D/g, '').slice(0, 12).split('').map(Number);
    if (ds.length !== 12) return '';
    ds.push(checkDigit(ds));
    const enc = (p, bar) => p.map((w, i) => ((i % 2 === 0) !== bar ? '0' : '1').repeat(w)).join('');
    let s = '101';
    for (let k = 0; k < 6; k++) s += enc(PARITY[ds[0]][k] === 'L' ? L[ds[k + 1]] : G[ds[k + 1]], false);
    s += '01010';
    for (let k = 0; k < 6; k++) s += enc(L[ds[k + 7]], true);
    return s + '101';
  }
  /** Полный код с контрольной цифрой. */
  const full = (code12) => { const ds = String(code12).replace(/\D/g, '').slice(0, 12).split('').map(Number); return ds.length === 12 ? ds.join('') + checkDigit(ds) : ''; };
  /** Картинка штрихкода для печати (SVG): полосы и цифры под ними. */
  function svg(code12, o = {}) {
    const b = bits(code12), text = full(code12), m = o.module || 3, qz = 11, h = o.height || 70, W = (95 + qz * 2) * m;
    if (!b) return '';
    let rects = '';
    for (let i = 0; i < 95; i++) if (b[i] === '1') rects += `<rect x="${(qz + i) * m}" y="0" width="${m}" height="${h}"/>`;
    const font = `font-family="ui-monospace,Menlo,Consolas,monospace" font-size="${m * 6.4}" text-anchor="middle"`;
    const digits = `<text x="${(qz - 4) * m}" y="${h + m * 7}" ${font}>${text[0]}</text><text x="${(qz + 24) * m}" y="${h + m * 7}" ${font} letter-spacing="${m * 1.6}">${text.slice(1, 7)}</text><text x="${(qz + 71) * m}" y="${h + m * 7}" ${font} letter-spacing="${m * 1.6}">${text.slice(7)}</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h + m * 9}" width="${W}" height="${h + m * 9}"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects}${digits}</g></svg>`;
  }

  return { decode, decodeGray, runsOf, fromRuns, bits, svg, full, checkDigit };
});
