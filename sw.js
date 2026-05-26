const CACHE_NAME = 'surgeon-dashboard-v2'; // قمنا بتغيير الإصدار هنا لإجبار المتصفح على التحديث

self.addEventListener('install', (e) => {
  console.log('Service Worker: Installed');
  // إجبار الـ Service Worker الجديد على التفعيل فوراً بدون انتظار إغلاق المتصفح
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('Service Worker: Activated');
  // حذف أي كاش قديم مخزن في المتصفح يمنع ظهور الأيقونة الجديدة
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
    }).then(() => self.clients.claim()) // جعل التحديث يطبق فوراً على كل التبويبات المفتوحة
  );
});

self.addEventListener('fetch', (e) => {
  // هذا الكود يضمن استمرار عمل التطبيق كـ PWA مع السماح بجلب الملفات الجديدة مباشرة
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
