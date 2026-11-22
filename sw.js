/* Service worker: تطبيق (PWA) + استقبال إشعارات الموبايل (Web Push)
   - الملفات الثابتة: الشبكة أولًا (التحديثات توصل فورًا) مع نسخة احتياطية للأوفلاين.
   - طلبات Supabase (الدخول والبيانات) مش بتتخزّن أبدًا ومش بنلمسها. */
const V = 'wasael-v18';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'assets/icon-192.png', 'assets/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;        // مش بنتدخّل في Supabase ولا CDN
  if (r.headers.has('range') || /\.(mp4|webm|mov)$/i.test(u.pathname)) return; // الفيديوهات الكبيرة ماتتخزّنش
  if (u.pathname.endsWith('/sw.js')) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') || caches.match('./') : undefined)))
  );
});

self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'وسائل إيضاح', {
    body: d.body || '', icon: 'assets/icon-192.png', badge: 'assets/favicon-32.png', dir: 'rtl', lang: 'ar',
    data: { url: d.url || './' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    for (const c of l) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
