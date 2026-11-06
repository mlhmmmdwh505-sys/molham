const CACHE_NAME = 'molham-dashboard-v42';

// الأصول والملفات المطلوبة للتخزين حتى يعمل الموقع بدون إنترنت
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=63',
  './fonts.css?v=1',
  './script.js?v=43',
  './mushaf.html',
  './mushaf.css?v=7',
  './quran-data.js',
  './mushaf.js?v=8',
  './pong.html',
  './pong.css?v=1',
  './pong.js?v=1',
  './manifest.json?v=11',
  './gnome-books.png',
  './assets/fonts/amiri-400.ttf',
  './assets/fonts/amiri-700.ttf',
  './assets/fonts/amiri-quran-400.ttf',
  './assets/fonts/cairo-400.ttf',
  './assets/fonts/cairo-600.ttf',
  './assets/fonts/cairo-700.ttf',
  './assets/fonts/cairo-800.ttf',
  './assets/fonts/orbitron-700.ttf',
  './assets/fonts/orbitron-800.ttf',
  './assets/vendor/firebase-app-compat.js',
  './assets/vendor/firebase-auth-compat.js',
  './assets/vendor/firebase-firestore-compat.js'
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
