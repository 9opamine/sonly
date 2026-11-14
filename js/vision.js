/* Камера и ИИ на телефоне: скелет (MediaPipe Pose) для повторов и MobileCLIP для «что на снимке».
   Всё считается на устройстве, кадры никуда не отправляются. Модели грузятся один раз и только когда нужны.
   Видео одно на всё приложение: экран задания при каждой перерисовке забирает его к себе, камера не перезапускается. */
(() => {
  'use strict';
  const url = (p) => new URL(p, document.baseURI).href;
  const MP = { bundle: 'vendor/mediapipe/vision_bundle.mjs', wasm: 'vendor/mediapipe/wasm', model: 'models/pose_landmarker_lite.task' };
  const CLIP = { ort: 'vendor/ort/ort.wasm.min.mjs', wasm: 'vendor/ort/', parts: ['models/mobileclip_s0_vision.part1.bin', 'models/mobileclip_s0_vision.part2.bin'], text: 'models/clip-text.json', size: 256 };

  let video = null, stream = null, facing = null, starting = null;
  let poseP = null, clipP = null;
  const log = (m, k) => { if (Sonly.diag) Sonly.diag.log(m, k); };
  /* ?pose=cpu / ?pose=gpu — принудительно, для проверки на телефоне. */
  const FORCE = new URLSearchParams(location.search).get('pose');
  /** Время на один кадр скелета (сглаженное) — по нему подстраивается частота распознавания. */
  const stats = { detectMs: 0, frames: 0 };

  /** Есть ли вообще камера в этом окне: нужен защищённый адрес и разрешение браузера. */
  const supported = () => !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  /**
   * Включает камеру: 'user' — фронтальная (повторы), 'environment' — основная (предметы).
   * Возвращает видео; ошибка — объект с code: 'insecure', 'denied', 'none', 'busy'.
   */
  async function camera(want = 'environment') {
    if (!supported()) throw { code: 'insecure' };
    if (stream && facing === want && stream.active) return video;
    if (starting) { try { await starting; } catch (e) { /* пробуем заново ниже */ } if (stream && facing === want && stream.active) return video; }
    stop();
    starting = (async () => {
      try {
        /* 640×480 хватает и скелету, и проверке снимка; большее разрешение только нагружает телефон и память. */
        log(`камера: прошу ${want === 'user' ? 'фронтальную' : 'основную'}`);
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: want }, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } } });
      } catch (e) {
        const n = e && e.name;
        log(`камера не включилась: ${n || e}`, 'ОШИБКА');
        throw { code: n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'none' : 'busy' };
      }
      facing = want;
      if (!video) {
        video = document.createElement('video');
        video.className = 'cam-video';
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('aria-hidden', 'true');
      }
      video.srcObject = stream;
      video.classList.toggle('mirror', want === 'user');
      await video.play().catch(() => {});
      if (!video.videoWidth) await new Promise((ok) => { video.onloadedmetadata = () => ok(); setTimeout(ok, 1500); });
      log(`камера включена: ${video.videoWidth}×${video.videoHeight}`);
      if (Sonly.diag) Sonly.diag.watch(true);
      return video;
    })();
    try { return await starting; } finally { starting = null; }
  }
  /** Выключает камеру совсем (уходя с экрана задания). */
  function stop() {
    shownIn = null;
    if (stream) log('камера выключена');
    if (Sonly.diag) Sonly.diag.watch(false);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    facing = null;
    if (video) { video.srcObject = null; video.remove(); }
  }
  /* Свернули приложение — телефон забирает камеру. Вернулись на то же задание — включаем её снова, видео не замирает. */
  let shownIn = null;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !shownIn || !shownIn.isConnected || !facing) return;
    if (stream && stream.active && stream.getVideoTracks().some((t) => t.readyState === 'live')) { if (video.paused) video.play().catch(() => {}); return; }
    const want = facing, box = shownIn;
    stream = null;
    camera(want).then(() => attach(box), () => {});
  });
  /** Ставит видео первым слоем в контейнер экрана задания. */
  function attach(box) {
    if (!video || !box) return null;
    shownIn = box;
    if (video.parentNode !== box) box.insertBefore(video, box.firstChild);
    if (video.paused) video.play().catch(() => {});
    return video;
  }
  /** Вспышка: фонарик основной камеры, если телефон его даёт. */
  async function torch(on) {
    const track = stream && stream.getVideoTracks()[0];
    if (!track || !track.getCapabilities || !track.getCapabilities().torch) return false;
    try { await track.applyConstraints({ advanced: [{ torch: !!on }] }); return true; } catch (e) { return false; }
  }

  /** Скелет: MediaPipe Pose Landmarker (облегчённая модель), на видеокарте, если получится. */
  function pose() {
    if (poseP) return poseP;
    poseP = (async () => {
      const t = performance.now();
      log('скелет: загружаю');
      const { FilesetResolver, PoseLandmarker } = await import(url(MP.bundle));
      const files = await FilesetResolver.forVisionTasks(url(MP.wasm));
      const opts = (delegate) => ({ baseOptions: { modelAssetPath: url(MP.model), delegate }, runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
      /* По умолчанию — процессор: без долгой сборки шейдеров на первом кадре (экран замирал) и без сбоев видеокарты.
         Облегчённой модели хватает 15–20 мс на кадр. Видеокарта — только по ?pose=gpu. */
      let lm, how = FORCE === 'gpu' ? 'GPU' : 'CPU';
      try { lm = await PoseLandmarker.createFromOptions(files, opts(how)); } catch (e) { if (how === 'CPU') throw e; how = 'CPU'; log(`скелет: видеокарта не подошла (${e && e.message}), считаю процессором`); lm = await PoseLandmarker.createFromOptions(files, opts('CPU')); }
      log(`скелет готов за ${Math.round(performance.now() - t)} мс (${how === 'GPU' ? 'видеокарта' : 'процессор'})`);
      return lm;
    })();
    poseP.catch((e) => { poseP = null; log(`скелет не загрузился: ${e && (e.message || e)}`, 'ОШИБКА'); });
    return poseP;
  }
  let lastTs = 0;
  /** Точки тела на текущем кадре видео или null. */
  function detect(lm, source, t) {
    const ts = Math.max(lastTs + 1, Math.round(t));
    lastTs = ts;
    const a = performance.now();
    const r = lm.detectForVideo(source, ts);
    const ms = performance.now() - a;
    /* Первые кадры — прогрев (видеокарта собирает шейдеры, до нескольких секунд): в среднее их не берём. */
    if (++stats.frames > 3) stats.detectMs = stats.detectMs ? stats.detectMs * 0.8 + ms * 0.2 : ms;
    else log(`скелет: прогрев, кадр ${stats.frames} — ${Math.round(ms)} мс`);
    if (stats.frames % 60 === 0) log(`скелет: ${Math.round(stats.detectMs)} мс на кадр`);
    return (r && r.landmarks && r.landmarks[0]) || null;
  }

  /** «Что на снимке»: картинная часть MobileCLIP-S0 (fp16, в двух частях) и готовые векторы описаний. */
  function clip() {
    if (clipP) return clipP;
    clipP = (async () => {
      const t = performance.now();
      log('распознавание предметов: загружаю');
      const ort = await import(url(CLIP.ort));
      ort.env.wasm.wasmPaths = url(CLIP.wasm);
      ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
      /* Модель работает в отдельном потоке: экран не замирает ни при загрузке, ни при проверке снимка. */
      ort.env.wasm.proxy = true;
      const [parts, text] = await Promise.all([
        Promise.all(CLIP.parts.map((p) => fetch(url(p)).then((r) => { if (!r.ok) throw new Error(p); return r.arrayBuffer(); }))),
        fetch(url(CLIP.text)).then((r) => r.json()),
      ]);
      const bytes = new Uint8Array(parts.reduce((n, b) => n + b.byteLength, 0));
      let o = 0;
      parts.forEach((b) => { bytes.set(new Uint8Array(b), o); o += b.byteLength; });
      log(`распознавание предметов: модель скачана (${Math.round(bytes.length / 1e6)} МБ)`);
      const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'], graphOptimizationLevel: 'all', enableCpuMemArena: false });
      log(`распознавание предметов готово за ${Math.round(performance.now() - t)} мс`);
      const bin = atob(text.emb), raw = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) raw[i] = bin.charCodeAt(i);
      return { ort, session, E: new Float32Array(raw.buffer), labels: text.labels, dim: text.dim, scale: text.scale };
    })();
    clipP.catch((e) => { clipP = null; log(`распознавание предметов не загрузилось: ${e && (e.message || e)}`, 'ОШИБКА'); });
    return clipP;
  }
  let canvas = null;
  /** Вектор квадратного куска кадра: rect — { x, y, s } в пикселях источника. */
  async function embed(m, source, rect) {
    const S = CLIP.size;
    canvas = canvas || Object.assign(document.createElement('canvas'), { width: S, height: S });
    const g = canvas.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(source, rect.x, rect.y, rect.s, rect.s, 0, 0, S, S);
    const d = g.getImageData(0, 0, S, S).data, px = new Float32Array(3 * S * S);
    for (let i = 0; i < S * S; i++) { px[i] = d[i * 4] / 255; px[S * S + i] = d[i * 4 + 1] / 255; px[2 * S * S + i] = d[i * 4 + 2] / 255; }
    const out = await m.session.run({ [m.session.inputNames[0]]: new m.ort.Tensor('float32', px, [1, 3, S, S]) });
    return out[m.session.outputNames[0]].data;
  }
  const size = (src) => ({ w: src.videoWidth || src.naturalWidth || src.width, h: src.videoHeight || src.naturalHeight || src.height });
  /** Квадрат по центру источника, k — доля короткой стороны. */
  function square(src, k = 1, cx = 0.5, cy = 0.5) {
    const { w, h } = size(src), s = Math.min(w, h) * k;
    return { x: Math.max(0, Math.min(w - s, w * cx - s / 2)), y: Math.max(0, Math.min(h - s, h * cy - s / 2)), s };
  }
  /**
   * Проверка снимка. rects — куски кадра (обычно рамка и кадр целиком); вероятности усредняются.
   * Возвращает решение Sonly.verdict.check и время работы.
   */
  async function look(task, source, rects) {
    const m = await clip(), t0 = performance.now(), V = Sonly.verdict;
    const list = rects && rects.length ? rects : [square(source)];
    const acc = {};
    for (const r of list) {
      const p = V.probs(await embed(m, source, r), m.E, m.labels, m.dim, m.scale);
      Object.keys(p).forEach((k) => { acc[k] = (acc[k] || 0) + p[k] / list.length; });
    }
    const res = Object.assign(V.check(task, acc), { ms: Math.round(performance.now() - t0), probs: acc });
    log(`снимок проверен за ${res.ms} мс: ${res.ok ? 'засчитано' : 'нет (' + res.why + ')'}`);
    return res;
  }

  /** Заранее грузит то, что понадобится заданию: пока звенит будильник, модель уже готова. */
  function preload(kind) {
    if (kind === 'pose') pose().catch(() => {});
    if (kind === 'cam') clip().catch(() => {});
  }

  Sonly.vision = { supported, camera, stop, attach, torch, pose, detect, clip, look, square, size, preload, stats, get video() { return video; } };
})();
