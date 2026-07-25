/**
 * Minimal service worker for the customer order-tracking page.
 *
 * It exists so the page can call `registration.showNotification(...)` — the only
 * way to raise a system notification on mobile browsers (the `new Notification()`
 * constructor is blocked on Android Chrome). Tapping a notification focuses the
 * existing tracking tab, or opens it.
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (url && client.url === url && 'focus' in client) return client.focus()
      }
      if (url && self.clients.openWindow) return self.clients.openWindow(url)
      return undefined
    }),
  )
})
