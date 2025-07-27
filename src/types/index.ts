/**
 * Types principaux pour le plugin Agile Board
 * 
 * Ce fichier contient toutes les interfaces et types utilisés
 * dans le plugin pour assurer la cohérence des données.
 */

/**
 * Représente un bloc individuel dans un layout de board
 * 
 * @interface BoardLayout
 * @example
 * {
 *   title: "Urgent et Important",
 *   x: 0,     // Position horizontale (0-23)
 *   y: 0,     // Position verticale (0-99)
 *   w: 12,    // Largeur en colonnes
 *   h: 12     // Hauteur en lignes
 * }
 */
export interface BoardLayout {
  /** Titre de la section qui apparaîtra dans le board */
  title: string;
  /** Position horizontale dans la grille (0-23) */
  x: number;
  /** Position verticale dans la grille (0-99) */
  y: number;
  /** Largeur du bloc en colonnes de grille */
  w: number;
  /** Hauteur du bloc en lignes de grille */
  h: number;
}

/**
 * Modèle de board complet contenant plusieurs layouts nommés
 * 
 * @interface BoardModel
 * @example
 * {
 *   "layout_eisenhower": [
 *     { title: "Urgent et Important", x: 0, y: 0, w: 12, h: 12 },
 *     // ... autres blocs
 *   ],
 *   "layout_kanban": [
 *     { title: "À faire", x: 0, y: 0, w: 8, h: 24 },
 *     // ... autres blocs
 *   ]
 * }
 */
export interface BoardModel {
  [modelName: string]: BoardLayout[];
}

/**
 * Représente une section parsée d'un fichier markdown
 * 
 * @interface FileSection
 */
export interface FileSection {
  /** Index de la ligne où commence la section (inclus le titre #) */
  start: number;
  /** Index de la ligne où se termine la section (exclus) */
  end: number;
  /** Contenu de la section (sans le titre #) */
  lines: string[];
}

/**
 * Collection de toutes les sections d'un fichier
 * 
 * @interface FileSections
 * @example
 * {
 *   "Urgent et Important": {
 *     start: 5,
 *     end: 10,
 *     lines: ["- Tâche 1", "- Tâche 2"]
 *   }
 * }
 */
export interface FileSections {
  [sectionName: string]: FileSection;
}

/**
 * Configuration du plugin stockée dans les settings d'Obsidian
 * 
 * @interface BoardSettings
 */
export interface BoardSettings {
  /** Layout utilisé par défaut pour les nouvelles notes */
  defaultModel: string;
  /** Active/désactive le basculement automatique vers board view */
  autoSwitchEnabled: boolean;
  /** Délai en ms avant sauvegarde automatique lors de l'édition */
  debounceDelay: number;
}

/**
 * Informations détaillées sur un layout pour l'interface utilisateur
 * 
 * @interface LayoutInfo
 */
export interface LayoutInfo {
  /** Nom technique du layout */
  name: string;
  /** Nom d'affichage pour l'utilisateur */
  displayName: string;
  /** Description du layout */
  description: string;
  /** Liste des sections requises */
  sections: string[];
  /** Nombre total de blocs */
  blockCount: number;
  /** Catégorie du layout (productivity, planning, etc.) */
  category: string;
}

/**
 * Événements émis par le plugin pour la communication inter-composants
 * 
 * @interface PluginEvents
 */
export interface PluginEvents {
  'layout-changed': { layoutName: string; file: string };
  'sections-created': { sections: string[]; file: string };
  'view-switched': { from: string; to: string; file: string };
}

/**
 * Constantes pour les types de vues
 */
export const VIEW_TYPES = {
  BOARD: 'agile-board-view',
  MARKDOWN: 'markdown'
} as const;

/**
 * Constantes pour les layouts par défaut
 */
export const DEFAULT_LAYOUTS = {
  EISENHOWER: 'layout_eisenhower',
  KANBAN: 'layout_kanban',
  GTD: 'layout_gtd',
  WEEKLY: 'layout_weekly',
  DAILY: 'layout_daily'
} as const;