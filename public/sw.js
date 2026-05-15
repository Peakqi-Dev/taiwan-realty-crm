// LeadFlow service worker — minimal version.
// Purpose: enables PWA install prompt + "Add to Home Screen". No caching
// strategy yet (Server Components + auth flows make caching subtle); we
// keep it pass-through and layer real caching in later if needed.

self.addEventListener("install", () => {
  // Take over from any older SW immediately.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch — required by some browsers to count this as a real SW
// even when we don't intercept anything.
self.addEventListener("fetch", () => {
  // no-op
});
