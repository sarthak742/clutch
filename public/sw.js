const CACHE_NAME = 'clutch-cache-v2'
const ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS)
    })
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() => {
        return caches.match(e.request)
      })
    )
  } else {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return cached || fetch(e.request)
      })
    )
  }
})

// ── Push Notifications ──
self.addEventListener('push', (e) => {
  let data = { title: 'CLUTCH', body: 'A deadline is approaching.', icon: '/icon-192.png' }
  try {
    if (e.data) data = { ...data, ...e.data.json() }
  } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'clutch-alert',
      renotify: true,
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow(self.location.origin)
    })
  )
})
