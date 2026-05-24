const CACHE_NAME = 'surgeon-dashboard-v9'; // غيرنا اسم الكاش لإصدار جديد تماماً
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png', // كشّنا الأيقونة الجديدة غصب عن المتصفح
  './style.css',
  './script.js'
];

// تثبيت السيرفس وركر وتخزين الملفات الأساسية
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting()) // إجبار التحديث فوراً بدون انتظار
  );
});

// تفعيل السيرفس وركر وحذف الكاش القديم تماماً
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // تنظيف مخلفات الماضي
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// الإستجابة الذكية وسحب الملفات الجديدة
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});
