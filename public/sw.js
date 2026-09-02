// Minimal service worker: PWA install support + push notification
// display. No offline caching by design (a leaderboard app should
// always show live data, not a stale cached snapshot).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// This fires even if every tab/app instance is closed — the OS wakes
// the service worker just for this event. This is what makes
// notifications behave like Instagram/WhatsApp's rather than only
// working while the site is open.
self.addEventListener("push", (event) => {
  let data = { title: "Friend Quiz", body: "You have a new update.", url: "/dashboard" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payloads
  }

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/dashboard" },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
