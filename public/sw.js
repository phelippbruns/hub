// Service worker mínimo da PWA (F00): só torna o app instalável.
// Estratégia de cache offline e Web Push entram quando houver telas (F17).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
