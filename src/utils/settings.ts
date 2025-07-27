/**
 * Utilitaires pour la gestion des paramètres
 */

import { BoardSettings } from '../types';
import { DEFAULT_LAYOUTS } from '../types';

/**
 * Crée les paramètres par défaut du plugin
 */
export function createDefaultSettings(): BoardSettings {
  return {
    defaultModel: DEFAULT_LAYOUTS.EISENHOWER,
    autoSwitchEnabled: true,
    debounceDelay: 1000
  };
}

/**
 * Valide les paramètres chargés
 */
export function validateSettings(settings: Partial<BoardSettings>): BoardSettings {
  const defaults = createDefaultSettings();
  
  return {
    defaultModel: typeof settings.defaultModel === 'string' ? settings.defaultModel : defaults.defaultModel,
    autoSwitchEnabled: typeof settings.autoSwitchEnabled === 'boolean' ? settings.autoSwitchEnabled : defaults.autoSwitchEnabled,
    debounceDelay: typeof settings.debounceDelay === 'number' && settings.debounceDelay > 0 ? settings.debounceDelay : defaults.debounceDelay
  };
}

/**
 * Obtient le nom d'affichage pour un layout
 */
export function getLayoutDisplayName(layoutName: string): string {
  const displayNames: Record<string, string> = {
    'layout_eisenhower': 'Matrice d\'Eisenhower',
    'layout_kanban': 'Tableau Kanban',
    'layout_gtd': 'Getting Things Done',
    'layout_weekly': 'Planificateur Hebdomadaire',
    'layout_simple': 'Board Simple',
    'layout_cornell': 'Notes Cornell',
    'layout_daily': 'Planificateur Quotidien',
    'layout_project': 'Gestion de Projet',
    'layout_tasks_dashboard': 'Dashboard Tasks',
    'layout_dataview_analytics': 'Analytics Dataview'
  };
  
  return displayNames[layoutName] || layoutName;
}