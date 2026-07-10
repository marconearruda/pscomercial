// js/theme/theme-scheduler.js
import { loadTheme } from './theme-loader.js';

/**
 * Mapeamento de meses para temas.
 * Mês: 1 = Janeiro, 2 = Fevereiro, ..., 12 = Dezembro.
 * Ajuste os nomes dos temas conforme seus arquivos.
 */
const THEME_SCHEDULE = {
  1: 'reveillon-infinity',    // Janeiro
  2: 'fevereiro',  // Fevereiro
  3: 'marco',      // Março
  4: 'abril',      // Abril
  5: 'maio',       // Maio
  6: 'junho',      // Junho
  7: 'julho',      // Julho
  8: 'horizonte',     // Agosto
  9: 'independencia',   // Setembro
  10: 'aurora-rosa',    // Outubro
  11: 'horizonte-azul',  // Novembro
  12: 'natal'      // Dezembro
};

/**
 * Obtém o tema programado para o mês atual.
 * @returns {string|null} Nome do tema ou null se não houver programação.
 */
function getScheduledTheme() {
  // Força o mês de Dezembro (11) para testar o tema Natal
  const now = new Date(2026, 1); //new Date(2026, 11, 1); // Ano, Mês (0-11), Dia
  const month = now.getMonth();
  return THEME_SCHEDULE[month] || null;
}

/**
 * Aplica o tema programado, se houver.
 * Sobrescreve o tema ativo em memória e recarrega.
 */
export async function applyScheduledTheme() {
  const themeId = getScheduledTheme();
  if (themeId) {
    console.log(`[ThemeScheduler] Tema programado para este mês: "${themeId}"`);
    await loadTheme(themeId);
  } else {
    console.log('[ThemeScheduler] Nenhum tema programado para este mês. Mantendo o tema atual.');
  }
}
