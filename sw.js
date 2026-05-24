self.addEventListener('install', (e) => {
  console.log('Service Worker: Installed');
});

self.addEventListener('fetch', (e) => {
  // هذا الكود يجعل المتصفح يثق في موقعك
});