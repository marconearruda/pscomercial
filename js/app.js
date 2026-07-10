// js/app.js
import { loadComponents } from './components.js';
import { initRouter } from './router.js';
import { initSearch } from './search.js';
import { initForms } from './forms.js';
import { initAnalytics } from './analytics.js';
import { initPWA } from './pwa.js';
import { initTheme } from './theme/theme-loader.js';
import { applyScheduledTheme } from './theme/theme-scheduler.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.PathResolver) {
    console.error('[App] PathResolver não encontrado.');
    return;
  }

  // Carrega componentes estruturais (navbar, footer)
  loadComponents();

  // Inicializa módulos
  initRouter();
  initSearch();
  initForms();
  initAnalytics();
  initPWA();

  // Carrega o tema padrão do registry (default)
  await initTheme();

  // Aplica o tema programado (sobrescreve se houver agendamento)
  await applyScheduledTheme();

  // Menu mobile toggle
  const toggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  document.dispatchEvent(new CustomEvent('polimata-app-ready'));
  console.log('[App] Polímata Platform — Sprint 1 + PTF + Scheduler carregada.');
});