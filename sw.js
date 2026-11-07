const CACHE_NAME = 'molham-dashboard-v69';

// الأصول والملفات المطلوبة للتخزين حتى يعمل الموقع بدون إنترنت
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './COPYRIGHT.md',
  './style.css?v=72',
  './fonts.css?v=1',
  './script.js?v=53',
  './mushaf.html',
  './mushaf.css?v=16',
  './quran-data.js',
  './mushaf.js?v=14',
  './pong.html',
  './pong.css?v=3',
  './pong.js?v=2',
  './manifest.json?v=11',
  './gnome-books.png',
  './amiri-400.ttf',
  './amiri-700.ttf',
  './amiri-quran-400.ttf',
  './cairo-400.ttf',
  './cairo-600.ttf',
  './cairo-700.ttf',
  './cairo-800.ttf',
  './orbitron-700.ttf',
  './orbitron-800.ttf',
  './firebase-app-compat.js',
  './firebase-auth-compat.js',
  './firebase-firestore-compat.js'
];

// 1. مرحلة التثبيت: حفظ جميع الملفات المهمة في الـ Cache
self.addEventListener('install', (e) => {
  console.log('Service Worker: Installed');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching Files');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. مرحلة التفعيل: مسح الكاش القديم
self.addEventListener('activate', (e) => {
  console.log('Service Worker: Activated');
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. مرحلة جلب البيانات: محاولة جلبها من الكاش أولاً، وإذا لم تتوفر يجلبها من الشبكة
self.addEventListener('fetch', (e) => {
  const request = e.request;
  if (request.method !== 'GET') return;
  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        const fallback = requestUrl.pathname.endsWith('/mushaf.html') ? './mushaf.html' : './index.html';
        return (await caches.match(fallback)) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === 'navigate') {
        const fallback = requestUrl.pathname.endsWith('/mushaf.html') ? './mushaf.html' : './index.html';
        return (await caches.match(fallback)) || Response.error();
      }
      return Response.error();
    }
  })());
});
