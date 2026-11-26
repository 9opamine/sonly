/* Новое: значки, открытки и пейзажи, которые человек ещё не видел.
   На Главной каждое новое объявляется праздником: значок выскакивает со вспышкой и лучами, открытка переворачивается, —
   и улетает в свою вкладку. Пока его не посмотрели, на вкладке, плитке и в списке горит красная отметка.
   Состояние — s.news { told — что уже объявили, seen — что уже посмотрели в списке } по видам: b — значки, c — открытки
   (день подъёма), l — пейзажи. Сохраняется вместе с приложением. */
(() => {
  'use strict';
  const { ic } = Sonly;
  const K = () => Sonly.appKit;
  const KINDS = ['b', 'c', 'l'];
  const TAB = { b: 'stats', c: 'morning', l: 'morning' };
  const REDUCE = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Что есть сейчас: полученные значки, дни с открыткой, открытые пейзажи. */
  function now(s) {
    return {
      b: K().badges(s).filter((x) => x.on).map((x) => x.id),
      c: K().stats(s).h.map((x) => x.d.getTime()),
      l: Sonly.morning ? Sonly.morning.rewards(s).filter((r) => r.open).map((r) => r.id) : [],
    };
  }
  /* Первый запуск (или данные до этой версии): всё, что уже есть, считаем виденным — праздник только для нового. */
  function init(s) {
    if (s.news && s.news.seen && s.news.told) return;
    const n = now(s);
    s.news = { seen: n, told: JSON.parse(JSON.stringify(n)) };
  }
  /** Данные целиком сменились (панель «Данные», «Сбросить»): начинаем учёт заново, без праздника за старое. */
  function reset(s) { s.news = null; init(s); }
  /** Новое по сравнению с записанным: which — 'told' (ещё не объявили) или 'seen' (ещё не смотрели). */
  function diff(s, which) {
    init(s);
    const n = now(s), out = {};
    KINDS.forEach((k) => { const was = new Set(s.news[which][k] || []); out[k] = n[k].filter((x) => !was.has(x)); });
    return out;
  }
  function mark(s, which, kind, ids) {
    init(s);
    const cur = new Set(s.news[which][kind] || []);
    (ids || now(s)[kind]).forEach((x) => cur.add(x));
    s.news[which][kind] = [...cur];
  }

  /* ── Красные отметки ─────────────────────────────────────── */

  /* Что показывать отмеченным в открытом сейчас списке: снимок новых на момент открытия (сами они уже отмечены виденными). */
  const shown = { b: new Set(), c: new Set(), l: new Set() };
  /** Открыли список значков, альбом или подарки: новое в нём помечено точкой, а сам вид считается просмотренным. */
  function open(flow, kind) {
    const s = flow.state, d = diff(s, 'seen');
    const kinds = kind === 'c' || kind === 'l' ? [kind] : [kind];
    kinds.forEach((k) => { shown[k] = new Set(d[k]); mark(s, 'seen', k); });
    paint(flow);
  }
  const showing = (kind, id) => shown[kind] && shown[kind].has(id);
  /** Сколько непросмотренного: для красной цифры на плитке. */
  const count = (s, kind) => diff(s, 'seen')[kind].length;
  /** Отметки на вкладках и плитках по текущему состоянию — после экрана, листа, праздника. */
  function paint(flow) {
    if (!flow || !flow.dock) return;
    const s = flow.state, d = diff(s, 'seen');
    const n = { b: d.b.length, c: d.c.length, l: d.l.length };
    const on = { stats: n.b > 0, morning: n.c + n.l > 0 };
    Object.entries(on).forEach(([tab, x]) => { const b = flow.dock.querySelector(`[data-act="tab:${tab}"]`); if (b) b.classList.toggle('nw-dot', x); });
    flow.el.querySelectorAll('[data-nw]').forEach((el) => {
      const k = el.dataset.nw, v = k.split('').reduce((a, x) => a + (n[x] || 0), 0);
      el.hidden = !v;
      el.textContent = v > 9 ? '9+' : String(v);
    });
  }
  /** Красная цифра на плитке (значки, альбом, подарки): kinds — 'b', 'c', 'l' или 'cl'. */
  const tag = (s, kinds) => { const v = kinds.split('').reduce((a, k) => a + count(s, k), 0); return `<i class="nw-count" data-nw="${kinds}" aria-label="Новое"${v ? '' : ' hidden'}>${v > 9 ? '9+' : v}</i>`; };

  /* ── Праздник на Главной ─────────────────────────────────── */

  let q = [], ov = null, demo = false;
  /** Объявить новое, если на Главной ничего не мешает: звонок, лист, снимок экрана. */
  function announce(flow) {
    if (ov || flow.shot || flow.id !== 'home' || !flow.el.isConnected || flow.el.closest('[hidden]')) return;
    /* Огонь серии ещё летит в значок на Главной: праздник начнётся, когда он долетит и число сменится (его зовёт сам полёт). */
    if (flow._fly && Date.now() < flow._fly) return;
    if (flow.sheets.classList.contains('open') || (Sonly.ringer && Sonly.ringer.busy && Sonly.ringer.busy(flow))) return;
    const s = flow.state, d = diff(s, 'told');
    const all = K().badges(s), order = K().TIERS.map((t) => t[0]);
    q = [];
    /* Сначала открытка этого утра (одна, самая свежая), потом пейзаж, потом значки — от обычных к самым редким. */
    if (d.c.length) q.push({ kind: 'c', id: Math.max(...d.c), ids: d.c });
    d.l.forEach((id) => q.push({ kind: 'l', id, ids: [id] }));
    d.b.map((id) => all.find((b) => b.id === id)).filter(Boolean).sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier)).forEach((b) => q.push({ kind: 'b', id: b.id, ids: [b.id], b }));
    if (!q.length) return;
    show(flow, 0);
  }
  const burst = (n = 14) => Array.from({ length: n }, (_, i) => `<u style="--a:${Math.round((360 / n) * i + (i % 2) * 11)}deg;--d:${86 + (i % 3) * 22}px;--w:${6 + (i % 4) * 2}px;--k:${i % 3}"></u>`).join('');
  function body(flow, it) {
    const s = flow.state;
    if (it.kind === 'b') {
      const b = it.b, t = K().TIERS.find((x) => x[0] === b.tier) || K().TIERS[0];
      return { k: 'Новый значок', tier: b.tier, item: K().hex(b, 150), tag: `<span class="bd-tag t-${b.tier}">${t[1]}</span>`, name: K().bdName(b), note: b.note };
    }
    if (it.kind === 'l') {
      const sc = (Sonly.morning.scenes || []).find((x) => x[0] === it.id) || [it.id, it.id];
      return { k: 'Новый пейзаж', tier: 'legend', item: `<div class="nw-card">${Sonly.morning.sample(it.id)}</div>`, tag: '', name: `«${sc[1]}»`, note: 'Теперь он может выпасть на открытке' };
    }
    const c = it.id ? Sonly.morning.cardInfo(s, it.id) : null;
    /* Подъёмов ещё нет (пустой аккаунт, «Показать»): образец открытки — тот же рисунок на рассветном небе. */
    if (!c) return it.id && !demo ? null : { k: 'Новая открытка', tier: 'rare', item: `<div class="nw-card">${Sonly.morning.sample('sea')}</div>`, tag: '', name: 'Открытка утра', note: 'Первая — после подъёма' };
    const when = c.x.d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return { k: 'Новая открытка', tier: c.find ? (c.find.lvl === 2 ? 'myth' : 'epic') : 'rare', item: `<div class="nw-card">${c.html}</div>`, tag: c.find ? `<span class="bd-tag t-${c.find.lvl === 2 ? 'myth' : 'epic'}">${c.find.lvl === 2 ? 'Очень редкая находка' : 'Редкая находка'}</span>` : '', name: c.find ? c.find.name : 'Открытка утра', note: `${when} · подъём ${K().fmtMin(c.x.wake)}` };
  }
  function show(flow, i) {
    const it = q[i];
    if (!it) { close(flow); return; }
    const v = body(flow, it);
    if (!v) { if (!demo) mark(flow.state, 'told', it.kind, it.ids); show(flow, i + 1); return; }
    const html = `<div class="nw-bg"></div>
      <div class="nw-box t-${v.tier}"><small class="nw-k">${v.k}</small>
        <div class="nw-stage nw-${it.kind}"><i class="nw-rays"></i><i class="nw-glow"></i><div class="nw-it">${v.item}</div><i class="nw-burst" aria-hidden="true">${burst()}</i></div>
        ${v.tag}<b class="nw-name">${v.name}</b><p class="nw-note">${v.note}</p></div>
      ${q.length - i > 1 ? '<button class="nw-skip" data-act="nw-skip">Пропустить</button>' : ''}
      <div class="nw-foot"><button class="ap-btn nw-ok" data-act="nw-ok">${i < q.length - 1 ? 'Дальше' : 'Забрать'}</button>${q.length > 1 ? `<small class="nw-n">${i + 1} из ${q.length}</small>` : ''}</div>`;
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'nw';
      ov.setAttribute('role', 'dialog');
      ov.setAttribute('aria-modal', 'true');
      flow.el.appendChild(ov);
      ov.addEventListener('click', (e) => { if (!e.target.closest('.nw-ok') && e.target.closest('.nw-bg, .nw-box')) next(flow); });
    }
    ov.dataset.i = i;
    ov.setAttribute('aria-label', v.k);
    ov.innerHTML = html;
    ov.classList.remove('out');
    void ov.offsetWidth;
    ov.classList.add('in');
    if (!REDUCE()) try { if (navigator.vibrate) navigator.vibrate(it.kind === 'b' && /legend|myth/.test(v.tier) ? [20, 60, 30, 60, 40] : [18, 50, 26]); } catch (e) { /* нет вибрации */ }
    /* Звук — в момент, когда вещь выскакивает: значок звенит (редкий — кристальной трелью), открытка переворачивается и искрится. */
    if (snd()) {
      if (it.kind === 'b') snd().sfx(/epic|legend|myth/.test(v.tier) ? 'rare' : 'badge', 0.22);
      /* Пейзаж переворачивается так же, как открытка, — тот же звук, и сверху светлая трель: событие реже, чуть торжественнее. */
      else { snd().sfx('card', 0.2); snd().sfx('twinkle', 0.6, 0.75); if (it.kind === 'l') snd().sfx('rare', 1.05, 0.55); }
    }
  }
  const snd = () => (Sonly.sound && Sonly.sound.sfx ? Sonly.sound : null);
  /** «Забрать»: вещь улетает в свою вкладку, вкладка вспыхивает красной точкой, затем следующее или конец. */
  function next(flow) {
    if (!ov || ov.classList.contains('out')) return;
    const i = +ov.dataset.i, it = q[i];
    if (!it) { close(flow); return; }
    if (!demo) mark(flow.state, 'told', it.kind, it.ids);
    const thing = ov.querySelector('.nw-it'), target = flow.dock.querySelector(`[data-act="tab:${TAB[it.kind]}"]`);
    ov.classList.add('out');
    const done = () => {
      paint(flow);
      if (target) { target.classList.remove('nw-pop'); void target.offsetWidth; target.classList.add('nw-pop'); }
      if (i + 1 < q.length) show(flow, i + 1); else close(flow);
    };
    if (!thing || !target || REDUCE() || !thing.animate) { setTimeout(done, REDUCE() ? 120 : 260); return; }
    const a = thing.getBoundingClientRect(), b = target.getBoundingClientRect(), k = flow.el.getBoundingClientRect().width / flow.el.offsetWidth || 1;
    const dx = (b.left + b.width / 2 - (a.left + a.width / 2)) / k, dy = (b.top + b.height / 2 - (a.top + a.height / 2)) / k;
    const fly = thing.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx * 0.55}px,${dy * 0.35 - 40}px) scale(.55)`, opacity: 1, offset: 0.45 }, { transform: `translate(${dx}px,${dy}px) scale(.12)`, opacity: 0.15 }],
      { duration: 640, easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' });
    fly.onfinish = done;
  }
  /*
   * «Пропустить»: всё, что ещё не показали, сразу пачкой — вещи веером выскакивают на месте праздника и разлетаются
   * по своим вкладкам (значки — в «Статистику», открытки и пейзажи — в «Утро»), каждая вкладка вспыхивает, когда в неё прилетело.
   */
  function skip(flow) {
    if (!ov || ov.classList.contains('out')) return;
    const i = +ov.dataset.i, rest = q.slice(i);
    if (!demo) rest.forEach((it) => mark(flow.state, 'told', it.kind, it.ids));
    const host = flow.el, stage = ov.querySelector('.nw-stage'), k = host.getBoundingClientRect().width / host.offsetWidth || 1;
    const hr = host.getBoundingClientRect(), sr = stage ? stage.getBoundingClientRect() : hr;
    const cx = (sr.left + sr.width / 2 - hr.left) / k, cy = (sr.top + sr.height / 2 - hr.top) / k;
    const items = rest.map((it) => ({ it, v: body(flow, it) })).filter((x) => x.v);
    ov.classList.add('out');
    close(flow);
    if (!items.length || REDUCE() || !host.animate) { paint(flow); return; }
    const pack = document.createElement('div');
    pack.className = 'nw-pack';
    pack.setAttribute('aria-hidden', 'true');
    host.appendChild(pack);
    const n = items.length, span = Math.min(260, 48 * (n - 1)), popped = new Set();
    let left = n;
    items.forEach(({ it, v }, j) => {
      const el = document.createElement('div'), sc = it.kind === 'b' ? 0.46 : 0.34;
      el.className = `nw-pk nw-pk-${it.kind}`;
      el.innerHTML = `<div class="nw-pk-in">${v.item}</div>`;
      el.style.left = `${cx.toFixed(1)}px`;
      el.style.top = `${cy.toFixed(1)}px`;
      pack.appendChild(el);
      /* Веер: по дуге, крайние чуть ниже и повёрнуты наружу. */
      const u = n > 1 ? j / (n - 1) - 0.5 : 0, fx = u * span, fy = Math.abs(u) * 34 - 6, rot = u * 22;
      const target = flow.dock && flow.dock.querySelector(`[data-act="tab:${TAB[it.kind]}"]`);
      const tr = target ? target.getBoundingClientRect() : { left: hr.left + hr.width / 2, top: hr.bottom, width: 0, height: 0 };
      const tx = (tr.left + tr.width / 2 - hr.left) / k - cx, ty = (tr.top + tr.height / 2 - hr.top) / k - cy;
      const wait = 340 + j * 70;
      const a = el.animate([
        { transform: 'translate(0,0) scale(.2) rotate(0deg)', opacity: 0 },
        { transform: `translate(${fx.toFixed(1)}px,${fy.toFixed(1)}px) scale(${(sc * 1.12).toFixed(3)}) rotate(${rot.toFixed(1)}deg)`, opacity: 1, offset: 0.16 },
        { transform: `translate(${fx.toFixed(1)}px,${fy.toFixed(1)}px) scale(${sc}) rotate(${rot.toFixed(1)}deg)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${(fx + (tx - fx) * 0.55).toFixed(1)}px,${(fy + (ty - fy) * 0.3 - 46).toFixed(1)}px) scale(${(sc * 0.6).toFixed(3)}) rotate(${(rot * 0.4).toFixed(1)}deg)`, opacity: 1, offset: 0.62 },
        { transform: `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(.08) rotate(0deg)`, opacity: 0.2 },
      ], { duration: 1100 + wait - 340, delay: j * 40, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
      a.onfinish = () => {
        el.remove();
        if (target && !popped.has(target)) { popped.add(target); paint(flow); }
        if (target) { target.classList.remove('nw-pop'); void target.offsetWidth; target.classList.add('nw-pop'); }
        if (--left === 0) { pack.remove(); paint(flow); }
      };
    });
    try { if (navigator.vibrate) navigator.vibrate([16, 40, 16, 40, 24]); } catch (e) { /* нет вибрации */ }
  }
  /** Ушли с Главной: праздник и летящая пачка убираются сразу. Что не успели показать, не помечено объявленным — покажется потом. */
  function leave(flow) {
    if (flow && flow.el) flow.el.querySelectorAll('.nw-pack').forEach((x) => x.remove());
    if (!ov) return;
    ov.remove();
    ov = null;
    q = [];
    demo = false;
  }
  function close(flow) {
    q = [];
    demo = false;
    if (!ov) return;
    const o = ov;
    ov = null;
    o.classList.add('out', 'gone');
    setTimeout(() => o.remove(), 260);
    paint(flow);
  }
  /**
   * Панель прототипа «Показать»: праздник без изменения данных. Значок — самый редкий из полученных (нет — легендарный «Месяц»
   * для примера), открытка — последняя (нет — образец), пейзаж — последний открытый (нет — «Море»). Учёт «нового» не трогается.
   */
  function preview(flow, kind) {
    if (ov || !flow.el.isConnected) return;
    const s = flow.state, order = K().TIERS.map((t) => t[0]);
    let it = null;
    if (kind === 'b') {
      const all = K().badges(s), got = all.filter((b) => b.on).sort((a, b) => order.indexOf(b.tier) - order.indexOf(a.tier));
      const b = got[0] || { ...(all.find((x) => x.id === 's30') || all[0]), on: true };
      it = { kind: 'b', id: b.id, ids: [b.id], b };
    } else if (kind === 'c') {
      const h = K().stats(s).h;
      it = { kind: 'c', id: h.length ? h[h.length - 1].d.getTime() : 0, ids: [] };
    } else {
      const open = Sonly.morning.rewards(s).filter((r) => r.open);
      it = { kind: 'l', id: open.length ? open[open.length - 1].id : 'sea', ids: [] };
    }
    demo = true;
    q = [it];
    show(flow, 0);
  }
  function on(flow, act) {
    if (act === 'nw-skip') { skip(flow); return true; }
    if (act !== 'nw-ok') return false;
    next(flow);
    return true;
  }

  Sonly.news = { init, reset, diff, open, showing, count, paint, tag, announce, preview, on, mark, leave };
})();
