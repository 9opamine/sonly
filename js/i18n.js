/*
 * Языки. Интерфейс написан по-русски; другой язык накладывается словарём на лету: каждая строка, которая появляется на экране
 * (текст, подсказка в поле, название кнопки для VoiceOver), заменяется переводом до того, как её увидят.
 * Ключ словаря — русская строка; числа (07:30, 29,99, 12) в ключе заменены на {0}, {1}…, имена людей из примера — на {n0}.
 * В переводе {0:день|дня} — форма слова по числу (у украинского и польского три формы: {0:день|дні|днів}).
 * Словари — в js/i18n/<язык>.js (Sonly.I18N.en = { … }). ?lang=en — язык из адреса; ?i18n=collect — копить непереведённое.
 */
(() => {
  'use strict';
  const LANGS = [['ru', 'Русский', '\u{1F1F7}\u{1F1FA}'], ['en', 'English', '\u{1F1EC}\u{1F1E7}'], ['uk', 'Українська', '\u{1F1FA}\u{1F1E6}'], ['pl', 'Polski', '\u{1F1F5}\u{1F1F1}'], ['de', 'Deutsch', '\u{1F1E9}\u{1F1EA}'], ['es', 'Español', '\u{1F1EA}\u{1F1F8}'], ['fr', 'Français', '\u{1F1EB}\u{1F1F7}']];
  const CYR = /[А-Яа-яЁёІіЇїЄєҐґ]/;
  const NUM = /\d+(?:[:.,]\d+)*/g;
  /* Имена людей из примера: в переводе — свои формы. */
  const NAMES = ['Катя', 'Аня', 'Макс', 'Лена', 'Дима', 'Соня', 'Артём', 'Вика', 'Олег', 'Полина', 'Саша', 'Настя', 'Игорь', 'Маша', 'Кирилл', 'Ира'];
  const NAME_RE = new RegExp(`(^|[^А-Яа-яЁё])(${NAMES.join('|')})(?=$|[^А-Яа-яЁё])`, 'g');
  const LATIN = { 'Катя': 'Katya', 'Аня': 'Anya', 'Макс': 'Max', 'Лена': 'Lena', 'Дима': 'Dima', 'Соня': 'Sonya', 'Артём': 'Artem', 'Вика': 'Vika', 'Олег': 'Oleg', 'Полина': 'Polina', 'Саша': 'Sasha', 'Настя': 'Nastya', 'Игорь': 'Igor', 'Маша': 'Masha', 'Кирилл': 'Kirill', 'Ира': 'Ira' };
  const UKN = { 'Дима': 'Діма', 'Игорь': 'Ігор', 'Кирилл': 'Кирило', 'Ира': 'Іра', 'Артём': 'Артем', 'Олег': 'Олег' };
  const nameIn = (l, n) => (l === 'uk' ? UKN[n] || n : l === 'ru' ? n : LATIN[n] || n);
  /* Формы слова по числу. */
  const PLURAL = {
    en: (n) => (n === 1 ? 0 : 1),
    uk: (n) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 0 : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 1 : 2; },
    pl: (n) => { const a = n % 10, b = n % 100; return n === 1 ? 0 : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 1 : 2; },
    fr: (n) => (n <= 1 ? 0 : 1),
  };
  const qs = new URLSearchParams(location.search);
  const saved = () => { try { return localStorage.getItem('sonly-lang'); } catch (e) { return null; } };
  let lang = qs.get('lang') || saved() || 'ru';
  if (!LANGS.some((x) => x[0] === lang)) lang = 'ru';
  const collect = qs.get('i18n') === 'collect';
  const miss = new Map();
  window.__i18nMiss = miss;
  const dict = () => (window.Sonly && Sonly.I18N && Sonly.I18N[lang]) || null;

  /** Дата и день недели — по словам (их слишком много сочетаний для словаря). */
  const WORDS = () => (Sonly.I18N && Sonly.I18N[lang] && Sonly.I18N[lang].__words) || {};
  function byWords(core) {
    const W = WORDS();
    let ok = true;
    const out = core.replace(/[А-Яа-яЁё]+\.?/g, (w) => { const k = w.replace(/\.$/, ''); const v = W[w] ?? W[k] ?? W[k.toLowerCase()]; if (v == null) { ok = false; return w; } return /^[А-ЯЁ]/.test(w) && v ? v[0].toUpperCase() + v.slice(1) : v; });
    return ok ? out : null;
  }
  function fill(t, nums, names) {
    const pl = PLURAL[lang] || PLURAL.en;
    return t.replace(/\{(n?)(\d+)(?::([^}]*))?\}/g, (_, isName, i, forms) => {
      if (isName) return nameIn(lang, names[+i] || '');
      const raw = nums[+i] ?? '';
      if (!forms) return lang === 'en' && /^\d+,\d+$/.test(raw) ? raw.replace(',', '.') : raw;
      const f = forms.split('|'), n = Math.abs(parseInt(raw, 10) || 0);
      return f[Math.min(pl(n), f.length - 1)];
    });
  }
  /** Перевод одной строки; null — переводить нечего или перевода нет. */
  function tr(str) {
    const d = dict();
    if (!d || !str || !CYR.test(str)) return null;
    const lead = str.match(/^\s*/)[0], trail = str.match(/\s*$/)[0], core = str.trim().replace(/\s+/g, ' ');
    if (d[core] != null) return lead + d[core] + trail;
    const nums = [], names = [];
    let key = core.replace(NUM, (m) => { nums.push(m); return `{${nums.length - 1}}`; });
    key = key.replace(NAME_RE, (m, pre, nm) => { names.push(nm); return `${pre}{n${names.length - 1}}`; });
    if (d[key] != null) return lead + fill(d[key], nums, names) + trail;
    /* Хвосты вида «Лента — закрыто», «Неделя — ещё не получен»: основа из словаря + перевод хвоста (__suffix). */
    for (const [suf, to] of Object.entries(d.__suffix || {})) if (core.endsWith(suf) && d[core.slice(0, -suf.length)] != null) return lead + d[core.slice(0, -suf.length)] + to + trail;
    const w = byWords(core);
    if (w != null) return lead + w + trail;
    if (collect && !miss.has(key)) miss.set(key, core);
    return null;
  }
  const ATTRS = ['placeholder', 'aria-label', 'title'];
  /* Уже переведённое не трогаем повторно (украинский перевод тоже кириллица). */
  const done = new WeakMap();
  /* Буква на аватаре: на латинице — латинская. */
  const TRL = { А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'E', Ж: 'Z', З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'C', Ш: 'S', Щ: 'S', Э: 'E', Ю: 'Y', Я: 'Y' };
  function text(x) {
    const v = x.nodeValue;
    if (!CYR.test(v) || done.get(x) === v) return;
    if (lang !== 'uk' && TRL[v.trim()] && x.parentElement && x.parentElement.classList.contains('pp-av')) { x.nodeValue = TRL[v.trim()]; done.set(x, x.nodeValue); return; }
    const t = tr(v);
    if (t != null && t !== v) { x.nodeValue = t; done.set(x, t); } else done.set(x, v);
  }
  function attrs(x) {
    let m = done.get(x);
    for (const a of ATTRS) {
      const v = x.getAttribute(a);
      if (!v || !CYR.test(v) || (m && m[a] === v)) continue;
      const t = tr(v);
      if (!m) { m = {}; done.set(x, m); }
      if (t != null && t !== v) { x.setAttribute(a, t); m[a] = t; } else m[a] = v;
    }
  }
  function node(n) {
    if (n.nodeType === 3) { if (n.parentElement && !n.parentElement.closest('script, style')) text(n); return; }
    if (n.nodeType !== 1 || n.closest('script, style')) return;
    attrs(n);
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let x = w.nextNode(); x; x = w.nextNode()) { if (x.nodeType === 3) text(x); else if (!/^(SCRIPT|STYLE)$/.test(x.tagName)) attrs(x); }
  }
  let mo = null;
  function watch() {
    if (mo) { mo.disconnect(); mo = null; }
    document.documentElement.lang = lang;
    if (lang === 'ru') return;
    node(document.body);
    mo = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === 'characterData') node(m.target);
        else if (m.type === 'attributes') node(m.target);
        else m.addedNodes.forEach(node);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  /** Меняет язык: запоминает на телефоне и перерисовывает экран из исходников (обратно на русский — тоже). */
  function set(l, flow) {
    if (!LANGS.some((x) => x[0] === l)) return;
    lang = l;
    try { localStorage.setItem('sonly-lang', l); } catch (e) { /* без хранилища — до перезагрузки */ }
    watch();
    if (flow) { flow.rerender(true); }
  }
  if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch);
  Sonly.i18n = {
    LANGS, tr, set, watch,
    get lang() { return lang; },
    /** Флаг языка — картинкой Apple, как все эмодзи прототипа. */
    flag(l, cls = '') {
      const x = LANGS.find((y) => y[0] === l) || LANGS[0];
      return Sonly.emo(x[2], cls);
    },
    /** Для проверок: что встретилось без перевода. */
    missing: () => [...miss.entries()],
  };
})();
