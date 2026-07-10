// js/pwa.js
// Registro do Service Worker usando caminhos resolvidos

export function initPWA() {
  if ('serviceWorker' in navigator) {
    const resolver = window.PathResolver;
    if (!resolver) {
      console.warn('[PWA] PathResolver não disponível.');
      return;
    }
    const swUrl = resolver.resolve('service-worker.js');
    navigator.serviceWorker.register(swUrl)
      .then(reg => console.log('[PWA] Service Worker registrado.', reg))
      .catch(err => console.warn('[PWA] Falha ao registrar SW.', err));
  }
}
