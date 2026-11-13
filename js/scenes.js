/* Общие сцены: график «как ощущается утро» и сцена «как звонит будильник». Разметка одна, облик у каждой концепции свой. */
(() => {
  'use strict';
  const { $, pad, tStr, taskOf, odo, ic } = Sonly;

  /**
   * График-иллюстрация. Красная линия — утро с повторами (bumps горбов), чёрная — утро с заданием.
   * Это схема ощущений, а не данные исследования: рядом с графиком всегда стоит подпись «иллюстрация».
   */
  Sonly.chart = (o = {}) => {
    const n = Math.max(1, Math.min(4, o.bumps || 3)), k = o.k || 1;
    const H = Math.round(176 * k), B = H - 26;
    const Y = (y) => +(B - (150 - y) * k).toFixed(1);
    /* between — чёрная линия проходит между красными горбами: под вторым, вверх через просвет перед третьим и дальше над ним.
       Линии встречаются один раз, под ясным углом, а не режут горбы в трёх местах. Для просвета горбы чуть уже. */
    const bw = !!o.between;
    let d = `M10 ${Y(146)}`, x = 10;
    if (bw) {
      [[14, 90], [64, 99], [114, 112]].forEach(([x0, top]) => { d += ` L${x0} ${Y(146)} C${x0 + 10} ${Y(146)} ${x0 + 11} ${Y(top)} ${x0 + 18} ${Y(top)} S${x0 + 26} ${Y(146)} ${x0 + 36} ${Y(146)}`; });
      d += ` C206 ${Y(146)} 262 ${Y(146)} 310 ${Y(104)}`;
      x = 106;
    } else {
      for (let i = 0; i < n; i++) {
        const top = Y(90 + i * 8);
        d += ` C${x + 13} ${Y(146)} ${x + 15} ${top} ${x + 25} ${top} S${x + 37} ${Y(146)} ${x + 48} ${Y(146)}`;
        x += 48;
      }
      d += ` C${x + 56} ${Y(146)} ${Math.max(x + 96, 262)} ${Y(146)} 310 ${Y(104)}`;
    }
    const blk = bw ? `M10 ${Y(148)} C60 ${Y(148)} 88 ${Y(146)} 104 ${Y(128)} S200 ${Y(30)} 310 ${Y(30)}`
      : `M10 ${Y(148)} C92 ${Y(148)} 126 ${Y(118)} 162 ${Y(86)} S250 ${Y(30)} 310 ${Y(30)}`;
    const tags = o.tags !== false;
    const tagX = (((10 + n * 24) / 320) * 100).toFixed(1);
    return `<div class="chart-wrap"><svg class="chart" viewBox="0 0 320 ${H}" role="img" aria-label="Иллюстрация: утро с повторами будильника и утро с заданием">
      <defs><linearGradient id="chz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E5484D" stop-opacity="0"/><stop offset="1" stop-color="#E5484D" stop-opacity=".13"/></linearGradient>
        <linearGradient id="chy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD12E" stop-opacity=".55"/><stop offset="1" stop-color="#FFD12E" stop-opacity="0"/></linearGradient></defs>
      ${o.grid ? [0.33, 0.66, 1].map((f) => `<line x1="10" x2="310" y1="${Y(150 - 120 * f)}" y2="${Y(150 - 120 * f)}" stroke="#E2E2E8" stroke-dasharray="2 6"/>`).join('') : ''}
      <rect class="l-zone" x="10" y="${Y(98)}" width="300" height="${(52 * k).toFixed(1)}" fill="url(#chz)"/>
      ${o.fill ? `<path class="ch-area" d="${blk} L310 ${B} L10 ${B} Z" fill="url(#chy)"/>` : ''}
      <line x1="10" y1="${B + 0.5}" x2="310" y2="${B + 0.5}" stroke="#DDDDE3"/>
      <text class="ch-x" x="10" y="${B + 18}">${o.x0 || 'звонок'}</text><text class="ch-x" x="310" y="${B + 18}" text-anchor="end">${o.x1 || '+30 минут'}</text>
      ${tags ? `<text class="l-zone ch-zone" x="${x + 10}" y="${Y(134)}">СОННАЯ ЗОНА</text>` : ''}
      <path class="ch-red" d="${d}"/><path class="ch-blk" d="${blk}"/>
      <g class="ch-m ch-mr"><circle r="5" fill="#fff" stroke="#E5484D" stroke-width="2.4"/></g>
      <g class="ch-m ch-mb"><circle r="5.5" fill="#0D0D0F"/></g>
    </svg>${tags ? `<span class="ch-tag t-red" style="left:${tagX}%;top:78%">${o.red || 'Круг откладываний'}</span><span class="ch-tag t-blk" style="left:36%;top:26%">${o.blkIcon || ''}${o.blk || 'С заданием'}</span>` : ''}</div>`;
  };

  /** Сначала рисуется линия с повторами, затем — линия с заданием; подписи появляются после своей линии. */
  Sonly.playChart = (c) => {
    const wrap = c.q('.chart-wrap'), red = $('.ch-red', wrap), blk = $('.ch-blk', wrap);
    c.seq([
      [450, () => c.draw(red, { dur: 1800, marker: $('.ch-mr', wrap) })],
      [2300, () => wrap.classList.add('s1')],
      [2900, () => c.draw(blk, { dur: 1500, marker: $('.ch-mb', wrap) })],
      [4450, () => wrap.classList.add('s2')],
    ]);
  };

  /**
   * Сцена из пяти шагов: время подошло → звонок → карточка задания → задание выполнено → звонок выключен.
   * Само задание не показывается: только карточка и отметка «готово».
   */
  Sonly.ring = (s, o = {}) => {
    const t = o.task || taskOf(s);
    const icon = o.icon || ((name, slot) => ic(name, slot === 'bell' ? 28 : 16, slot === 'bell' ? 1.9 : 3));
    return `<div class="rs" data-step="0">
      <div class="rs-time"></div>
      <div class="rs-bell"><i class="rs-w"></i><i class="rs-w w2"></i><span class="rs-i on">${icon('bell-ring', 'bell')}</span><span class="rs-i off">${icon('bell-off', 'bell')}</span></div>
      <div class="rs-task"><span class="rs-task-i">${o.taskIcon ? o.taskIcon(t) : ic(t.lu, 22, 1.9)}</span><span class="rs-task-t"><small>Задание</small><b>${t.name}</b></span><span class="rs-task-ok">${icon('check', 'ok')}</span><i class="rs-bar"><u></u></i></div>
      <div class="rs-st"><span class="st-wait">Минута до подъёма</span><span class="st-ring">Звонит, пока не выполнишь</span><span class="st-off">${icon('check', 'st')}Будильник выключен</span></div>
    </div>`;
  };

  Sonly.playRing = (c, root, s) => {
    const time = $('.rs-time', root);
    const m = (s.time.h * 60 + s.time.m + 1439) % 1440;
    odo(time, pad(Math.floor(m / 60)) + ':' + pad(m % 60));
    const step = (n) => () => { root.dataset.step = n; };
    c.seq([[700, () => odo(time, tStr(s))], [1250, step(1)], [2400, step(2)], [3200, step(3)], [4700, step(4)], [5400, step(5)]]);
  };
})();
