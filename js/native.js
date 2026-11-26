/*
 * Мост к приложению sonly для Android (F:\clode\sonly-app): прототип живёт в нём на весь экран в WebView — каждый экран,
 * анимация и задание те же, что здесь. Нативная часть делает то, чего не может страница: звонит в нужное время на
 * заблокированном телефоне и после перезагрузки, держит экран, вибрирует, распознаёт речь.
 * Страница → приложение: window.ReactNativeWebView.postMessage(JSON). Приложение → страница: window.sonlyNative(сообщение).
 * Без приложения (сайт, claude.ai) мост выключен и ничего не меняет.
 */
(() => {
  'use strict';
  const RN = window.ReactNativeWebView;
  const on = !!RN;
  const subs = {};
  const post = (msg) => { if (!RN) return; try { RN.postMessage(JSON.stringify(msg)); } catch (e) { /* приложение закрывается */ } };
  function receive(m) {
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { return; } }
    if (!m || !m.type) return;
    (subs[m.type] || []).forEach((f) => { try { f(m); } catch (e) { /* ошибка обработчика не ломает остальные */ } });
  }
  /** Подписка на сообщение приложения: when('ring', (m) => …). */
  const when = (type, fn) => { (subs[type] = subs[type] || []).push(fn); };
  if (on) {
    window.sonlyNative = receive;
    document.documentElement.classList.add('native');
    /* Вибрация в WebView ненадёжна — её делает приложение. */
    try { navigator.vibrate = (p) => { post({ type: 'vibrate', pattern: Array.isArray(p) ? p : [Number(p) || 0] }); return true; }; } catch (e) { /* нельзя подменить */ }
  }

  /* Будильники для приложения: только то, что нужно, чтобы позвонить вовремя. Свой звук (запись, песня) живёт в странице —
     приложение до открытия страницы звонит звуком по умолчанию, дальше играет страница. */
  let last = '';
  function syncAlarms(s) {
    if (!on || !s || !Array.isArray(s.alarms)) return;
    const S = Sonly.sound;
    const list = s.alarms.map((a) => {
      const name = S ? S.resolve(a.sound) : a.sound, mine = /^my:/.test(name || '');
      const file = S && S.fileOf ? S.fileOf(mine ? S.def : name) : '';
      return { id: a.id, name: a.name, h: a.h, m: a.m, days: a.days || [], on: !!a.on, once: !!a.once, skip: !!a.skip, task: a.task, sound: name, soundFile: file ? `snd/${file}.mp3` : '', rise: a.rise !== false, vibro: a.vibro !== false, check: a.check || 0 };
    });
    const j = JSON.stringify({ volume: s.volume, alarms: list });
    if (j === last) return;
    last = j;
    post({ type: 'alarms', volume: s.volume, alarms: list });
  }

  Sonly.native = { on, post, when, syncAlarms };
})();
