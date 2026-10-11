// Bridgewater YOU - minimal service worker.
// Its only job is to meet the browser's requirements for offering a one-tap
// "Add to Phone" install on Android. It deliberately does NOT cache anything
// and does not intercept requests, so visitors always receive the newest
// version of every page straight from the site.
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function () {
  // Intentionally empty: the browser handles every request normally.
});
