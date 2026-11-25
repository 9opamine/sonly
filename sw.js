/*
 * Работа без сети для установленного приложения: каждый открытый файл сайта кладётся в кэш, а без интернета берётся оттуда.
 * Всегда сначала сеть — новая версия сайта приходит сразу, кэш нужен только когда сети нет.
 * Чужие адреса (модели ИИ, шрифты, каталог песен) не трогаем: без сети им всё равно не загрузиться.
 */
const CACHE = 'sonly-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))));
});
