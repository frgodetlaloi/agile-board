/**
 * =============================================================================
 * UTILITAIRES POUR LA GESTION DES PARAMÈTRES DU PLUGIN
 * =============================================================================
 * 
 * Ce fichier contient les fonctions utilitaires pour gérer les paramètres
 * de configuration du plugin Agile Board.
 * 
 * RÔLE DANS L'ARCHITECTURE :
 * - Création des paramètres par défaut
 * - Validation des paramètres chargés
 * - Mappage des noms techniques vers les noms d'affichage
 * 
 * CONCEPT OBSIDIAN - PERSISTANCE DES DONNÉES :
 * Obsidian permet aux plugins de sauvegarder des données de configuration.
 * Ces données sont automatiquement synchronisées entre les appareils
 * et persistent entre les redémarrages.
 * 
 * PATTERN DE CONCEPTION :
 * - Fonctions pures : pas d'effets de bord
 * - Validation défensive : gestion des données corrompues
 * - Valeurs par défaut sûres : le plugin fonctionne même sans configuration
 */

// =============================================================================
// IMPORTS
// =============================================================================

// Import des types de configuration depuis notre fichier de types
import { BoardSettings } from '../types';

// Import des constantes de layouts par défaut
import { DEFAULT_LAYOUTS } from '../types';

// =============================================================================
// FONCTIONS DE GESTION DES PARAMÈTRES
// =============================================================================

/**
 * Crée les paramètres par défaut du plugin
 * 
 * UTILISATION :
 * - Appelée lors de la première installation du plugin
 * - Utilisée comme fallback si les paramètres sont corrompus
 * - Base pour la fusion avec les paramètres personnalisés
 * 
 * CHOIX DES VALEURS PAR DÉFAUT :
 * - defaultModel : Eisenhower car c'est le plus universel
 * - autoSwitchEnabled : true pour une meilleure expérience utilisateur
 * - debounceDelay : 1000ms pour équilibrer réactivité/performance
 * 
 * @returns {BoardSettings} Objet contenant tous les paramètres par défaut
 * 
 * @example
 * const defaultSettings = createDefaultSettings();
 * console.log(defaultSettings);
 * // {
 * //   defaultModel: "layout_eisenhower",
 * //   autoSwitchEnabled: true,
 * //   debounceDelay: 1000
 * // }
 */
export function createDefaultSettings(): BoardSettings {
  return {
    // Layout utilisé par défaut pour les nouvelles notes
    // Eisenhower est choisi car c'est un système de priorisation universel
    defaultModel: DEFAULT_LAYOUTS.EISENHOWER,
    
    // Activer le basculement automatique vers la vue board
    // Améliore l'expérience utilisateur en affichant directement le board
    autoSwitchEnabled: true,
    
    // Délai de 1 seconde avant sauvegarde automatique
    // Évite de sauvegarder à chaque frappe tout en restant réactif
    debounceDelay: 1000
  };
}

/**
 * Valide et nettoie les paramètres chargés depuis la sauvegarde
 * 
 * PROBLÈMES POSSIBLES :
 * - Fichier de configuration corrompu
 * - Version incompatible du plugin
 * - Manipulation manuelle du fichier JSON
 * - Types incorrects (string au lieu de number, etc.)
 * 
 * STRATÉGIE DE VALIDATION :
 * - Vérifier le type de chaque propriété
 * - Utiliser les valeurs par défaut si invalide
 * - Ne jamais faire planter le plugin à cause de paramètres incorrects
 * 
 * @param {Partial<BoardSettings>} settings - Paramètres potentiellement partiels ou corrompus
 * @returns {BoardSettings} Paramètres validés et complets
 * 
 * @example
 * // Cas normal
 * const validSettings = validateSettings({
 *   defaultModel: "layout_kanban",
 *   autoSwitchEnabled: false,
 *   debounceDelay: 500
 * });
 * 
 * // Cas avec données partielles
 * const partialSettings = validateSettings({
 *   defaultModel: "layout_kanban"
 *   // manque autoSwitchEnabled et debounceDelay
 * });
 * 
 * // Cas avec données corrompues
 * const corruptedSettings = validateSettings({
 *   defaultModel: 123, // Devrait être une string
 *   autoSwitchEnabled: "oui", // Devrait être un boolean
 *   debounceDelay: -5 // Devrait être positif
 * });
 */
export function validateSettings(settings: Partial<BoardSettings>): BoardSettings {
  // Récupérer les valeurs par défaut comme base sûre
  const defaults = createDefaultSettings();
  
  return {
    // VALIDATION DU LAYOUT PAR DÉFAUT
    // Vérifier que c'est bien une string, sinon utiliser le défaut
    defaultModel: typeof settings.defaultModel === 'string' 
      ? settings.defaultModel 
      : defaults.defaultModel,
    
    // VALIDATION DU BASCULEMENT AUTOMATIQUE
    // Vérifier que c'est bien un boolean, sinon utiliser le défaut
    autoSwitchEnabled: typeof settings.autoSwitchEnabled === 'boolean' 
      ? settings.autoSwitchEnabled 
      : defaults.autoSwitchEnabled,
    
    // VALIDATION DU DÉLAI DE SAUVEGARDE
    // Vérifier que c'est un number positif, sinon utiliser le défaut
    debounceDelay: (typeof settings.debounceDelay === 'number' && settings.debounceDelay > 0)
      ? settings.debounceDelay 
      : defaults.debounceDelay
  };
}

/**
 * Obtient le nom d'affichage convivial pour un layout technique
 * 
 * PROBLÉMATIQUE :
 * Les noms techniques (layout_eisenhower) ne sont pas user-friendly.
 * Cette fonction fait le mapping vers des noms lisibles.
 * 
 * UTILISATION :
 * - Interface utilisateur (modales, menus)
 * - Messages d'erreur et de confirmation
 * - Noms de fichiers créés automatiquement
 * 
 * EXTENSIBILITÉ :
 * Pour ajouter un nouveau layout, il suffit d'ajouter une entrée
 * dans le Record displayNames.
 * 
 * @param {string} layoutName - Nom technique du layout (ex: "layout_eisenhower")
 * @returns {string} Nom d'affichage convivial (ex: "Matrice d'Eisenhower")
 * 
 * @example
 * const displayName = getLayoutDisplayName("layout_eisenhower");
 * console.log(displayName); // "Matrice d'Eisenhower"
 * 
 * const unknownLayout = getLayoutDisplayName("layout_custom");
 * console.log(unknownLayout); // "layout_custom" (fallback)
 */
export function getLayoutDisplayName(layoutName: string): string {
  /**
   * Dictionnaire de mapping nom technique → nom d'affichage
   * 
   * RECORD TYPE :
   * Record<string, string> est équivalent à { [key: string]: string }
   * mais plus expressif et type-safe.
   * 
   * MAINTENANCE :
   * Centralise tous les noms d'affichage pour faciliter :
   * - Les changements de libellés
   * - La traduction future
   * - La cohérence dans toute l'application
   */
  const displayNames: Record<string, string> = {
    // Layouts de productivité
    'layout_eisenhower': 'Matrice d\'Eisenhower',
    'layout_gtd': 'Getting Things Done',
    
    // Layouts de flux de travail
    'layout_kanban': 'Tableau Kanban',
    
    // Layouts de planification
    'layout_weekly': 'Planificateur Hebdomadaire',
    'layout_daily': 'Planificateur Quotidien',
    
    // Layouts de projet
    'layout_project': 'Gestion de Projet',
    
    // Layouts basiques
    'layout_simple': 'Board Simple',
    
    // Layouts de prise de notes
    'layout_cornell': 'Notes Cornell',
    
    // Layouts d'intégration
    'layout_tasks_dashboard': 'Dashboard Tasks',
    'layout_dataview_analytics': 'Analytics Dataview'
  };
  
  // Retourner le nom d'affichage s'il existe, sinon le nom technique
  // L'opérateur || fournit un fallback sûr
  return displayNames[layoutName] || layoutName;
}

// =============================================================================
// FONCTIONS UTILITAIRES SUPPLÉMENTAIRES
// =============================================================================

/**
 * Vérifie si un nom de layout est valide
 * 
 * UTILISATION FUTURE :
 * Peut être utilisée pour valider les paramètres avant sauvegarde
 * ou pour vérifier les layouts personnalisés.
 * 
 * @param {string} layoutName - Nom du layout à vérifier
 * @returns {boolean} true si le layout est reconnu
 * 
 * @example
 * console.log(isValidLayoutName("layout_eisenhower")); // true
 * console.log(isValidLayoutName("layout_inexistant")); // false
 */
export function isValidLayoutName(layoutName: string): boolean {
  // Pour l'instant, on vérifie simplement si un nom d'affichage existe
  // Dans le futur, on pourrait vérifier contre une liste de layouts chargés
  const displayNames = {
    'layout_eisenhower': 'Matrice d\'Eisenhower',
    'layout_kanban': 'Tableau Kanban',
    'layout_gtd': 'Getting Things Done',
    'layout_weekly': 'Planificateur Hebdomadaire',
    'layout_daily': 'Planificateur Quotidien',
    'layout_project': 'Gestion de Projet',
    'layout_simple': 'Board Simple',
    'layout_cornell': 'Notes Cornell',
    'layout_tasks_dashboard': 'Dashboard Tasks',
    'layout_dataview_analytics': 'Analytics Dataview'
  };
  
  return layoutName in displayNames;
}

/**
 * Migre les anciens paramètres vers la version actuelle
 * 
 * GESTION DES VERSIONS :
 * Quand on change la structure des paramètres entre versions,
 * cette fonction permet de migrer automatiquement les anciennes données.
 * 
 * UTILISATION FUTURE :
 * Appelée avant validateSettings() pour adapter les vieux formats.
 * 
 * @param {any} oldSettings - Anciens paramètres de version précédente
 * @returns {Partial<BoardSettings>} Paramètres migrés au format actuel
 * 
 * @example
 * // Si on avait un ancien format avec "defaultLayout" au lieu de "defaultModel"
 * const migrated = migrateSettings({ defaultLayout: "eisenhower" });
 * console.log(migrated); // { defaultModel: "layout_eisenhower" }
 */
export function migrateSettings(oldSettings: any): Partial<BoardSettings> {
  // Pour l'instant, pas de migration nécessaire car c'est la première version
  // Dans le futur, on pourrait avoir :
  
  /*
  // Migration v1 → v2 : renommage defaultLayout → defaultModel
  if (oldSettings.defaultLayout && !oldSettings.defaultModel) {
    return {
      ...oldSettings,
      defaultModel: `layout_${oldSettings.defaultLayout}`,
      defaultLayout: undefined // Supprimer l'ancienne propriété
    };
  }
  
  // Migration v2 → v3 : nouveau format de délai
  if (typeof oldSettings.saveDelay === 'number') {
    return {
      ...oldSettings,
      debounceDelay: oldSettings.saveDelay,
      saveDelay: undefined
    };
  }
  */
  
  // Pour l'instant, retourner tel quel
  return oldSettings;
}

// =============================================================================
// NOTES POUR LES DÉBUTANTS
// =============================================================================

/*
CONCEPTS CLÉS À RETENIR :

1. **Fonctions Pures** :
   - Ne modifient pas leurs paramètres d'entrée
   - Retournent toujours le même résultat pour les mêmes entrées
   - Pas d'effets de bord (console.log, modification de variables globales)
   - Facilite les tests et le débogage

2. **Validation Défensive** :
   - Toujours vérifier les types et valeurs
   - Prévoir des fallbacks pour tous les cas d'erreur
   - Ne jamais faire confiance aux données externes
   - Utiliser typeof pour vérifier les types à l'exécution

3. **Configuration par Défaut** :
   - Permet au plugin de fonctionner sans configuration
   - Valeurs choisies pour la meilleure expérience utilisateur
   - Base stable pour la fusion avec les paramètres personnalisés

4. **Mapping de Données** :
   - Séparer les données techniques des données d'affichage
   - Utiliser des dictionnaires (Record) pour les correspondances
   - Prévoir des fallbacks pour les valeurs inconnues

BONNES PRATIQUES :

1. **Gestion d'Erreurs** :
   - Jamais de throw dans les fonctions utilitaires
   - Toujours retourner une valeur valide
   - Logger les problèmes pour le débogage

2. **Documentation** :
   - Expliquer les choix de design
   - Donner des exemples d'utilisation
   - Documenter les cas d'erreur

3. **Extensibilité** :
   - Prévoir l'ajout de nouveaux layouts
   - Structure facilement modifiable
   - Séparation des préoccupations

*/