// js/pwa.js
// Registro do Service Worker usando caminhos resolvidos

export function initPWA() {
  if ('serviceWorker' in navigator) {
    const resolver = window.PathResolver;
    if (!resolver) {
      console.warn('[PWA] PathResolver não disponível.');
      return;
    }
    // Registra com caminho resolvido a partir da base
    const swUrl = resolver.resolve('service-worker.js');
    navigator.serviceWorker.register(swUrl)
      .then(reg => console.log('[PWA] Service Worker registrado.', reg))
      .catch(err => console.warn('[PWA] Falha ao registrar SW.', err));
  }

  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('[PWA] App rodando em modo standalone (PWA).');
  }
}
