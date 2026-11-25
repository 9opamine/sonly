/*
 * Языки. Интерфейс написан по-русски; другой язык накладывается словарём на лету: каждая строка, которая появляется на экране
 * (текст, подсказка в поле, название кнопки для VoiceOver), заменяется переводом до того, как её увидят.
 * Ключ словаря — русская строка; числа (07:30, 29,99, 12) в ключе заменены на {0}, {1}…, имена людей из примера — на {n0},
 * название в кавычках — на «{q0}» (оно переводится отдельно, своей строкой).
 * Строка с выделенным словом (<mark>, <b>…) переводится целиком: в ключе выделенное — в [квадратных скобках]:
 * 'Держи [серию].' → 'Keep your [streak].' Так выделение встаёт на нужное слово в любом языке.
 * В переводе {0:день|дня} — форма слова по числу (у украинского и польского три формы: {0:день|дні|днів}).
 * data-ini="Пн" у элемента — в нём первая буква перевода этой строки (буквы дней недели).
 * data-k="ключ" — текст элемента переводится по этому ключу словаря (для коротких строк вроде «с» — секунд).
 * Формы слов после числа сводятся к одной: ключ '{0} часов' подходит и к «1 час», и к «3 часа».
 * Словари — в js/i18n/<язык>.js (Sonly.I18N.en = { … }). ?lang=en — язык из адреса; ?i18n=collect — копить непереведённое.
 */
(() => {
  'use strict';
  /* Порядок в списке выбора: украинский и русский — в конце. */
  const LANGS = [['en', 'English', '\u{1F1EC}\u{1F1E7}'], ['pl', 'Polski', '\u{1F1F5}\u{1F1F1}'], ['de', 'Deutsch', '\u{1F1E9}\u{1F1EA}'], ['es', 'Español', '\u{1F1EA}\u{1F1F8}'], ['fr', 'Français', '\u{1F1EB}\u{1F1F7}'], ['uk', 'Українська', '\u{1F1FA}\u{1F1E6}'], ['ru', 'Русский', '\u{1F1F7}\u{1F1FA}']];
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
  /* Основной язык — английский: его выбирают по умолчанию, и на него переходит строка, которой нет в словаре другого языка. */
  /* Проверки (автоматический браузер, tools/*.cjs) написаны по русскому тексту — им по умолчанию русский, людям английский. */
  let lang = qs.get('lang') || saved() || (navigator.webdriver ? 'ru' : 'en');
  if (!LANGS.some((x) => x[0] === lang)) lang = 'en';
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
  /*
   * Месяцы — как числа: в строке с датой («Открытка за 1 апреля…», «В sonly с августа 2026», «Декабрь 2025 г.») месяц
   * заменяется на {d0} (после числа, родительный: «апреля») или {M0} (сам по себе: «Декабрь»), и одного ключа хватает
   * на все двенадцать. Название месяца берётся у самого браузера на нужном языке — в нужной форме («квітня», «kwietnia»).
   */
  const MON_G = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const MON_N = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const MON_RE = new RegExp(`(^|[^А-Яа-яЁё])(${[...MON_G, ...MON_N].join('|')})(?=$|[^А-Яа-яЁё])`, 'gi');
  const MLOC = { ru: 'ru-RU', en: 'en-GB', uk: 'uk-UA', pl: 'pl-PL', de: 'de-DE', es: 'es-ES', fr: 'fr-FR' };
  const mcache = {};
  function monthName(i, gen) {
    const loc = MLOC[lang] || 'en-GB', k = `${loc}${i}${gen}`;
    if (mcache[k]) return mcache[k];
    const d = new Date(2024, i, 15);
    let v = MON_N[i];
    try { v = gen ? new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long' }).formatToParts(d).find((p) => p.type === 'month').value : new Intl.DateTimeFormat(loc, { month: 'long' }).format(d); } catch (e) { /* старый браузер — оставим как есть */ }
    return (mcache[k] = v);
  }
  /** Подставляет в перевод числа ({0}, {0:форма|формы}), имена ({n0}), названия в кавычках ({q0}) и месяцы ({d0}, {M0}). */
  function fill(t, nums, names, quotes = [], months = []) {
    const pl = PLURAL[lang] || PLURAL.en;
    return t.replace(/\{([nqdM]?)(\d+)(?::([^}]*))?\}/g, (_, kind, i, forms) => {
      if (kind === 'n') return nameIn(lang, names[+i] || '');
      if (kind === 'q') return quotes[+i] ?? '';
      if (kind === 'd' || kind === 'M') {
        const m = months[+i];
        if (!m) return '';
        const v = monthName(m.i, kind === 'd');
        return m.cap ? v[0].toUpperCase() + v.slice(1) : v;
      }
      const raw = nums[+i] ?? '';
      if (!forms) return lang === 'en' && /^\d+,\d+$/.test(raw) ? raw.replace(',', '.') : raw;
      const f = forms.split('|'), n = Math.abs(parseInt(raw, 10) || 0);
      return f[Math.min(pl(n), f.length - 1)];
    });
  }
  /** Ключ словаря для строки: числа → {0}, {1}…, имена → {n0}… */
  function keyOf(core, withMonths) {
    const nums = [], names = [], months = [];
    let key = core.replace(NUM, (m) => { nums.push(m); return `{${nums.length - 1}}`; });
    key = key.replace(NAME_RE, (m, pre, nm) => { names.push(nm); return `${pre}{n${names.length - 1}}`; });
    if (withMonths) {
      key = key.replace(MON_RE, (m, pre, w) => {
        const lw = w.toLowerCase(), g = MON_G.indexOf(lw);
        months.push({ i: g >= 0 ? g : MON_N.indexOf(lw), cap: /^[А-ЯЁ]/.test(w) });
        return `${pre}{${g >= 0 ? 'd' : 'M'}${months.length - 1}}`;
      });
    }
    return { key, nums, names, months };
  }
  /* Форма слова после числа сводится к одной («1 час», «2 часа», «5 часов» → «{0} часов»): одного ключа хватает на любые числа.
     Сначала ищется точный ключ, так что словарные строки с нужной формой по-прежнему главнее. */
  const FORMS = [['час', 'часа', 'часов'], ['минута', 'минуту', 'минуты', 'минут'], ['секунда', 'секунду', 'секунды', 'секунд'], ['день', 'дня', 'дней'], ['утро', 'утра', 'утр'],
    ['неделя', 'неделю', 'недели', 'недель'], ['месяц', 'месяца', 'месяцев'], ['год', 'года', 'лет'], ['раза', 'раз'], ['звонок', 'звонка', 'звонков'], ['друг', 'друга', 'друзей'],
    ['значок', 'значка', 'значков'], ['задание', 'задания', 'заданий'], ['открытка', 'открытки', 'открыток'], ['предмет', 'предмета', 'предметов'], ['человека', 'человек'],
    ['шаг', 'шага', 'шагов'], ['пример', 'примера', 'примеров'], ['вопрос', 'вопроса', 'вопросов'], ['цент', 'цента', 'центов'], ['сутки', 'суток'], ['отжимание', 'отжимания', 'отжиманий'],
    ['приседание', 'приседания', 'приседаний'], ['прыжок', 'прыжка', 'прыжков'], ['пара', 'пары', 'пар'], ['удар', 'удара', 'ударов'], ['группа', 'группы', 'групп'], ['заявка', 'заявки', 'заявок'],
    ['подъём', 'подъёма', 'подъёмов'], ['будильник', 'будильника', 'будильников'], ['мелодия', 'мелодии', 'мелодий'], ['встряхивание', 'встряхивания', 'встряхиваний'], ['слово', 'слова', 'слов'], ['буква', 'буквы', 'букв'], ['раунд', 'раунда', 'раундов'], ['клетка', 'клетки', 'клеток']];
  const CANON = {};
  FORMS.forEach((f) => f.forEach((w) => { CANON[w] = f[f.length - 1]; }));
  const FORM_RE = new RegExp('(\\{\\d+\\} )(' + Object.keys(CANON).sort((a, b) => b.length - a.length).join('|') + ')(?![А-Яа-яЁё])', 'g');
  const norm = (key) => key.replace(FORM_RE, (m, n, w) => n + CANON[w]);
  /* Ключи словаря, записанные с другой формой слова («ещё {0} утра подряд»), один раз дублируются под общей формой
     («ещё {0} утр подряд»): иначе строка находилась бы только при числах, которые дают ту же форму. */
  const normed = new Set();
  function normDict(d) {
    if (normed.has(d)) return;
    normed.add(d);
    for (const k of Object.keys(d)) { if (k[0] === '_' || typeof d[k] !== 'string') continue; const nk = norm(k); if (nk !== k && d[nk] == null) d[nk] = d[k]; }
  }
  /** Прямой поиск: строка целиком или её ключ с числами и именами (и с формами слов, сведёнными к одной). */
  function look(core) {
    const d = dict();
    if (!d) return null;
    normDict(d);
    if (d[core] != null) return d[core];
    const k = keyOf(core);
    if (d[k.key] != null) return fill(d[k.key], k.nums, k.names);
    const nk = norm(k.key);
    if (nk !== k.key && d[nk] != null) return fill(d[nk], k.nums, k.names);
    /* Строка с месяцем: ключ с {d0}/{M0} вместо названия (точные ключи вроде «… ноября …» выше главнее). */
    if (!MON_RE.test(core)) return null;
    MON_RE.lastIndex = 0;
    const km = keyOf(core, true), nm = norm(km.key);
    if (d[km.key] != null) return fill(d[km.key], km.nums, km.names, [], km.months);
    return d[nm] != null ? fill(d[nm], km.nums, km.names, [], km.months) : null;
  }
  /** «Добавляем задание «Заправь кровать»»: в словаре — 'Добавляем задание «{q0}»', название переводится своей строкой. */
  function quoted(core) {
    const d = dict(), inner = [];
    const bare = core.replace(/«([^«»]*)»/g, (m, x) => { inner.push(x); return '«\u0001»'; });
    if (!inner.length) return null;
    const k = keyOf(bare);
    let n = 0;
    let key = k.key.replace(/\u0001/g, () => `{q${n++}}`);
    if (d[key] == null) key = norm(key);
    if (d[key] == null) return null;
    return fill(d[key], k.nums, k.names, inner.map((x) => { const t = tr(x); return t == null ? x : t.trim(); }));
  }
  /**
   * Строка из двух частей через « · », « — » или «: » («Пн, Ср, Пт · 3 дня в неделю», «Отмечаем дни: по будням»):
   * если целиком её в словаре нет, каждая часть переводится отдельно. Часть без кириллицы остаётся как есть.
   */
  let depth = 0;
  function parts(core) {
    if (depth > 3) return null;
    for (const sep of [' · ', ' — ', ': ']) {
      const i = core.indexOf(sep);
      if (i <= 0 || i + sep.length >= core.length) continue;
      const a = core.slice(0, i), b = core.slice(i + sep.length);
      depth++;
      const ta = CYR.test(a) ? tr(a, true) : a, tb = CYR.test(b) ? tr(b, true) : b;
      depth--;
      if (ta != null && tb != null) return ta.trim() + sep + tb.trim();
    }
    return null;
  }
  /** Перевод одной строки; null — переводить нечего или перевода нет. quiet — не записывать в непереведённое (часть строки). */
  function tr(str, quiet) {
    const d = dict();
    if (!d || !str || !CYR.test(str)) return null;
    const lead = str.match(/^\s*/)[0], trail = str.match(/\s*$/)[0], core = str.trim().replace(/\s+/g, ' ');
    let t = look(core);
    if (t == null && core.includes('«')) t = quoted(core);
    /* Хвосты вида «Лента — закрыто», «Неделя — ещё не получен»: основа из словаря + перевод хвоста (__suffix). */
    if (t == null) for (const [suf, to] of Object.entries(d.__suffix || {})) if (core.endsWith(suf) && d[core.slice(0, -suf.length)] != null) { t = d[core.slice(0, -suf.length)] + to; break; }
    if (t == null) t = byWords(core);
    if (t == null) t = parts(core);
    if (t != null) return lead + t + trail;
    /* Нет в словаре этого языка — английский перевод лучше русского оригинала. */
    if (lang !== 'en' && lang !== 'ru' && !viaEn) {
      const keep = lang;
      lang = 'en'; viaEn = true;
      try { t = tr(str, true); } finally { lang = keep; viaEn = false; }
      if (t != null) return t;
    }
    if (collect && !quiet) { const k = keyOf(core).key; if (!miss.has(k)) miss.set(k, core); }
    return null;
  }
  let viaEn = false;
  const ATTRS = ['placeholder', 'aria-label', 'title'];
  /* Уже переведённое не трогаем повторно (украинский перевод тоже кириллица). */
  let done = new WeakMap();
  /* Русский оригинал каждой переведённой строки: при смене языка экран сначала возвращается к нему,
     иначе постоянные элементы (панель вкладок) остались бы на прошлом языке. */
  const orig = new WeakMap();
  const origA = new WeakMap();
  /* Строки с выделением, переведённые целиком: что было до перевода и какой текст получился. */
  const mix = new WeakMap();
  /* Буква на аватаре: на латинице — латинская. */
  const TRL = { А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'E', Ж: 'Z', З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'H', Ц: 'C', Ч: 'C', Ш: 'S', Щ: 'S', Э: 'E', Ю: 'Y', Я: 'Y' };
  /*
   * Без одинокого последнего слова на любом языке: в переводе два последних слова склеиваются неразрывным пробелом
   * (если вместе они не слишком длинные), а короткое слово перед ссылкой или выделением («and» перед «Privacy Policy») —
   * со следующим словом. Как правило русской вёрстки, только для всех языков сразу.
   */
  const INL = /^(A|B|STRONG|EM|I|U|SPAN|SMALL|MARK)$/;
  function glue(x, t) {
    if (!t || lang === 'ru') return t;
    let out = t.replace(/(\S+) (\S+)(\s*)$/, (m, a, b, tail) => (a.length + b.length <= 22 ? `${a}\u00a0${b}${tail}` : m));
    const nx = x.nextSibling;
    if (nx && nx.nodeType === 1 && INL.test(nx.tagName) && /\S {1}$/.test(out)) out = out.replace(/ $/, '\u00a0');
    /* \u041a\u043e\u0440\u043e\u0442\u043a\u043e\u0435 \u0441\u043b\u043e\u0432\u043e \u043c\u0435\u0436\u0434\u0443 \u0434\u0432\u0443\u043c\u044f \u0432\u044b\u0434\u0435\u043b\u0435\u043d\u0438\u044f\u043c\u0438 (\u00abTerms and Privacy Policy\u00bb) \u0434\u0435\u0440\u0436\u0438\u0442\u0441\u044f \u0438 \u0437\u0430 \u043f\u0440\u0435\u0434\u044b\u0434\u0443\u0449\u0435\u0435. */
    const pv = x.previousSibling;
    if (pv && pv.nodeType === 1 && INL.test(pv.tagName) && /^ \S/.test(out) && out.trim().split(/\s+/).length <= 2) out = out.replace(/^ /, '\u00a0');
    return out;
  }
  const put = (x, v, t) => { orig.set(x, v); t = glue(x, t); x.nodeValue = t; done.set(x, t); };
  /* По-английски цена пишется «€39.99», проценты — «25%»: цены и проценты отдельными строками (без слов) переписываются под язык. */
  const enNum = (v) => v.replace(/^(\s*)(\d+(?:,\d+)?)[\s  ]?€(\s*)$/, (m, a, n, b) => `${a}€${n.replace(',', '.')}${b}`).replace(/^(\s*)([−-]?\d+)[\s  ]%(\s*)$/, '$1$2%$3');
  function text(x) {
    const v = x.nodeValue;
    if (done.get(x) === v) return;
    if (!CYR.test(v)) { if (lang === 'en' && /\d/.test(v)) { const t = enNum(v); if (t !== v) put(x, v, t); } return; }
    const p = x.parentElement;
    if (p && p.dataset && p.dataset.ini) { const t = tr(p.dataset.ini); if (t && t.trim()) { put(x, v, t.trim()[0].toUpperCase()); return; } }
    /* data-k — короткая строка, которую по одной букве не понять («с» — секунды): переводится по своему ключу. */
    if (p && p.dataset && p.dataset.k) { const t = look(p.dataset.k); if (t != null) { put(x, v, t); return; } }
    /* Подпись под числом («день подряд» под «41»): форма слова зависит от числа, а оно в соседнем элементе.
       Переводим вместе с числом («41 день подряд» → «41 days in a row») и оставляем подпись без него. */
    const num = p && p.previousElementSibling && p.previousElementSibling.textContent.trim();
    /* Подпись может и сама содержать число («значка из 26» под «3»): вместе — «3 значка из 26», ключ «{0} значков из {1}». */
    if (num && /^\d+$/.test(num)) {
      const t = tr(`${num} ${v.trim()}`, true);
      const m = t && t.trim().match(new RegExp(`^${num}[\\s\\u00a0]+(.+)$`));
      if (m) { put(x, v, v.match(/^\s*/)[0] + m[1] + v.match(/\s*$/)[0]); return; }
    }
    if (lang !== 'uk' && TRL[v.trim()] && p && p.classList.contains('pp-av')) { put(x, v, TRL[v.trim()]); return; }
    const t = tr(v);
    if (t != null && t !== v) put(x, v, t); else done.set(x, v);
  }
  function attrs(x) {
    let m = done.get(x);
    /* Имя по умолчанию в поле («Будильник №2», группа «Семья») — тоже на языке интерфейса; набранное человеком не трогаем. */
    const list = x.tagName === 'INPUT' && x.hasAttribute('value') && x.value === x.getAttribute('value') ? ATTRS.concat('value') : ATTRS;
    for (const a of list) {
      const v = x.getAttribute(a);
      if (!v || !CYR.test(v) || (m && m[a] === v)) continue;
      const t = tr(v);
      if (!m) { m = {}; done.set(x, m); }
      if (t != null && t !== v) { let o = origA.get(x); if (!o) { o = {}; origA.set(x, o); } o[a] = v; x.setAttribute(a, t); m[a] = t; } else m[a] = v;
    }
  }
  const INLINE = /^(MARK|B|STRONG|EM|I|U|S|SPAN|SMALL|SUP|SUB|A)$/;
  /** Строка с выделенным словом: текст и выделение вместе, ключ — 'Держи [серию].'. true — переведено целиком. */
  function mixed(el) {
    const kids = el.childNodes;
    if (kids.length < 2) return false;
    const was = mix.get(el);
    if (was && was.now === el.textContent) return true;
    let key = '', words = false;
    const inl = [];
    for (const k of kids) {
      if (k.nodeType === 3) { key += k.nodeValue; if (k.nodeValue.trim()) words = true; continue; }
      if (k.nodeType !== 1 || !INLINE.test(k.tagName) || k.firstElementChild || !k.textContent.trim()) return false;
      inl.push(k);
      /* data-v — переменная часть (почта, дата): в ключе пустые скобки, сам текст остаётся как есть. */
      key += k.hasAttribute('data-v') ? '[]' : `[${k.textContent}]`;
    }
    if (!words || !inl.length || !CYR.test(key)) return false;
    const t = look(key.trim().replace(/\s+/g, ' '));
    if (t == null) return false;
    const parts = t.split(/\[([^\]]*)\]/);
    if (parts.length !== inl.length * 2 + 1) return false;
    const before = [...kids].map((k) => (k.nodeType === 3 ? k : [k, k.textContent]));
    const out = [];
    parts.forEach((s, i) => {
      if (i % 2) { const e = inl[(i - 1) / 2]; if (!e.hasAttribute('data-v')) { e.textContent = s; if (e.firstChild) done.set(e.firstChild, s); } out.push(e); return; }
      if (!s) return;
      const n = document.createTextNode(s);
      done.set(n, s);
      out.push(n);
    });
    el.replaceChildren(...out);
    mix.set(el, { before, now: el.textContent });
    return true;
  }
  function one(x) {
    attrs(x);
    mixed(x);
  }
  function node(n) {
    if (n.nodeType === 3) { if (n.parentElement && !n.parentElement.closest('script, style')) text(n); return; }
    if (n.nodeType !== 1 || n.closest('script, style')) return;
    one(n);
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let x = w.nextNode(); x; x = w.nextNode()) { if (x.nodeType === 3) text(x); else if (!/^(SCRIPT|STYLE)$/.test(x.tagName)) one(x); }
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
  /** Возвращает на экране русские оригиналы всего, что переводили и что с тех пор не менялось. */
  function restore() {
    if (!document.body) return;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let x = w.currentNode; x; x = w.nextNode()) {
      if (x.nodeType === 3) { if (orig.has(x) && done.get(x) === x.nodeValue) x.nodeValue = orig.get(x); continue; }
      const mx = mix.get(x);
      if (mx && mx.now === x.textContent) { x.replaceChildren(...mx.before.map((o) => (Array.isArray(o) ? ((o[0].textContent = o[1]), o[0]) : o))); mix.delete(x); }
      const o = origA.get(x), m = done.get(x);
      if (o && m) for (const a of Object.keys(o)) if (m[a] === x.getAttribute(a)) x.setAttribute(a, o[a]);
    }
    done = new WeakMap();
  }
  /** Меняет язык: запоминает на телефоне, возвращает экран к оригиналу и переводит заново, затем перерисовывает экран. */
  function set(l, flow) {
    if (!LANGS.some((x) => x[0] === l)) return;
    if (mo) { mo.disconnect(); mo = null; }
    restore();
    lang = l;
    try { localStorage.setItem('sonly-lang', l); } catch (e) { /* без хранилища — до перезагрузки */ }
    watch();
    if (flow) { flow.rerender(true); }
    /* Остальные экраны (онбординг, приложение) перерисовываются тоже: в них язык вписан при отрисовке — флаг, «RU», названия. */
    try { document.dispatchEvent(new CustomEvent('sonly-lang', { detail: { lang: l, flow } })); } catch (e) { /* старый браузер */ }
  }
  if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch);
  const LOCALE = { ru: 'ru-RU', en: 'en-GB', uk: 'uk-UA', pl: 'pl-PL', de: 'de-DE', es: 'es-ES', fr: 'fr-FR' };
  Sonly.i18n = {
    LANGS, tr, set, watch,
    get lang() { return lang; },
    /** Язык для дат, распознавания и чтения вслух: 'en-GB', 'de-DE'… */
    get locale() { return LOCALE[lang] || 'ru-RU'; },
    /** Слово или название (задания, пейзажа) на текущем языке — для текста не на экране. */
    word: (x) => { const t = tr(x); return t == null ? x : t.trim(); },
    /**
     * Текст не для экрана — «Поделиться», подписи на сохранённой картинке. Ключ с {именами}: значения подставляются после перевода,
     * поэтому коды и ссылки с цифрами не мешают найти строку в словаре.
     */
    t(key, vars = {}) {
      const d = dict(), en = Sonly.I18N && Sonly.I18N.en;
      const s = lang === 'ru' ? key : d && d[key] != null ? d[key] : en && en[key] != null ? en[key] : key;
      return s.replace(/\{([a-z]\w*)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    },
    /** Флаг языка — картинкой Apple, как все эмодзи прототипа. */
    flag(l, cls = '') {
      const x = LANGS.find((y) => y[0] === l) || LANGS.find((y) => y[0] === 'ru');
      return Sonly.emo(x[2], cls);
    },
    /** Для проверок: что встретилось без перевода. */
    missing: () => [...miss.entries()],
  };
})();
