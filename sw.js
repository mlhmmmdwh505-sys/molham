const CACHE_NAME = 'surgeon-dashboard-v5';

// الأصول والملفات المطلوبة للتخزين حتى يعمل الموقع بدون إنترنت
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=9',
  './script.js?v=14',
  './manifest.json?v=8',
  './gnome-books.svg',
  './gnome-books.png',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800&display=swap'
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
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
