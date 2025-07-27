/**
 * =============================================================================
 * TYPES PRINCIPAUX POUR LE PLUGIN AGILE BOARD
 * =============================================================================
 * 
 * Ce fichier contient toutes les interfaces et types TypeScript utilisés
 * dans le plugin pour assurer la cohérence des données.
 * 
 * POURQUOI LES TYPES SONT IMPORTANTS :
 * - Prévention des erreurs à la compilation
 * - Auto-complétion dans l'éditeur
 * - Documentation du code intégrée
 * - Facilite la maintenance et les refactorings
 * 
 * CONCEPTS TYPESCRIPT POUR DÉBUTANTS :
 * - interface : Définit la structure d'un objet
 * - export : Rend le type disponible dans d'autres fichiers
 * - string, number, boolean : Types de base
 * - Array<Type> ou Type[] : Tableaux typés
 * - Record<K, V> : Objet avec clés de type K et valeurs de type V
 * - as const : Rend un objet readonly et ses valeurs littérales
 */

// =============================================================================
// INTERFACES PRINCIPALES DU DOMAINE MÉTIER
// =============================================================================

/**
 * Représente un bloc individuel dans un layout de board
 * 
 * CONCEPT MÉTIER :
 * Un BoardLayout est comme une "case" dans un tableau. Chaque case a :
 * - Un titre (ce qui s'affiche en haut de la case)
 * - Une position et une taille dans une grille de 24 colonnes
 * 
 * SYSTÈME DE COORDONNÉES :
 * - La grille fait 24 colonnes de large (x: 0-23)
 * - Elle peut faire jusqu'à 100 lignes de haut (y: 0-99)
 * - w et h définissent la largeur et hauteur en nombre de cases
 * 
 * @interface BoardLayout
 * @example
 * // Un bloc qui occupe le quart supérieur gauche de l'écran
 * {
 *   title: "Urgent et Important",
 *   x: 0,     // Commence à la colonne 0 (tout à gauche)
 *   y: 0,     // Commence à la ligne 0 (tout en haut)
 *   w: 12,    // Fait 12 colonnes de large (moitié de l'écran)
 *   h: 12     // Fait 12 lignes de haut
 * }
 */
export interface BoardLayout {
  /** 
   * Titre de la section qui apparaîtra dans le board
   * Correspond au nom d'une section H1 (# Titre) dans le fichier markdown
   */
  title: string;
  
  /** 
   * Position horizontale dans la grille (0-23)
   * 0 = colonne la plus à gauche, 23 = colonne la plus à droite
   */
  x: number;
  
  /** 
   * Position verticale dans la grille (0-99)
   * 0 = ligne du haut, plus le nombre est grand, plus c'est bas
   */
  y: number;
  
  /** 
   * Largeur du bloc en colonnes de grille
   * Minimum 1, maximum 24, doit respecter : x + w <= 24
   */
  w: number;
  
  /** 
   * Hauteur du bloc en lignes de grille
   * Minimum 1, maximum 100, doit respecter : y + h <= 100
   */
  h: number;
}

/**
 * Modèle de board complet contenant plusieurs layouts nommés
 * 
 * CONCEPT MÉTIER :
 * Un BoardModel est comme un "catalogue" de layouts disponibles.
 * Chaque layout a un nom unique et contient plusieurs blocs.
 * 
 * @interface BoardModel
 * @example
 * {
 *   "layout_eisenhower": [
 *     { title: "Urgent et Important", x: 0, y: 0, w: 12, h: 12 },
 *     { title: "Pas urgent mais Important", x: 12, y: 0, w: 12, h: 12 }
 *   ],
 *   "layout_kanban": [
 *     { title: "À faire", x: 0, y: 0, w: 8, h: 24 }
 *   ]
 * }
 */
export interface BoardModel {
  /**
   * Index signature TypeScript :
   * Permet d'avoir un nombre dynamique de propriétés
   * - La clé (string) est le nom du layout
   * - La valeur (BoardLayout[]) est un tableau de blocs
   */
  [modelName: string]: BoardLayout[];
}

// =============================================================================
// INTERFACES POUR LE PARSING DES FICHIERS MARKDOWN
// =============================================================================

/**
 * Représente une section parsée d'un fichier markdown
 * 
 * CONCEPT OBSIDIAN :
 * Dans Obsidian, les fichiers markdown sont organisés en sections avec des titres H1 (#).
 * Cette interface capture les informations de chaque section pour permettre
 * l'édition séparée de chaque partie.
 * 
 * @interface FileSection
 */
export interface FileSection {
  /** 
   * Index de la ligne où commence la section (inclut le titre #)
   * Utilisé pour savoir où commencer à lire dans le fichier
   */
  start: number;
  
  /** 
   * Index de la ligne où se termine la section (exclus)
   * Utilisé pour savoir où arrêter de lire dans le fichier
   */
  end: number;
  
  /** 
   * Contenu de la section (sans le titre #)
   * Tableau de chaînes, chaque élément = une ligne
   */
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
  /**
   * Index signature pour un accès dynamique aux sections
   * - La clé est le nom de la section (titre H1 sans #)
   * - La valeur contient les métadonnées et contenu de la section
   */
  [sectionName: string]: FileSection;
}

// =============================================================================
// INTERFACES DE CONFIGURATION
// =============================================================================

/**
 * Configuration du plugin stockée dans les settings d'Obsidian
 * 
 * CONCEPT OBSIDIAN - PERSISTANCE :
 * Obsidian permet aux plugins de sauvegarder des paramètres de configuration.
 * Ces paramètres sont automatiquement sauvegardés dans :
 * .obsidian/plugins/agile-board/data.json
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

// =============================================================================
// CONSTANTES TYPÉES
// =============================================================================

/**
 * Constantes pour les types de vues
 * 
 * PATTERN as const :
 * Le "as const" rend l'objet readonly et préserve les valeurs littérales.
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

// =============================================================================
// TYPES UTILITAIRES
// =============================================================================

/**
 * Type utilitaire pour extraire les valeurs des constantes VIEW_TYPES
 */
export type ViewType = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];

/**
 * Type utilitaire pour les noms de layouts par défaut
 */
export type DefaultLayoutName = typeof DEFAULT_LAYOUTS[keyof typeof DEFAULT_LAYOUTS];

// =============================================================================
// NOTES POUR LES DÉBUTANTS
// =============================================================================

/*
CONCEPTS TYPESCRIPT À RETENIR :

1. **Interface vs Type** :
   - interface : Extensible, idéal pour les objets
   - type : Plus flexible, idéal pour les unions et utilitaires

2. **Index Signatures** :
   - [key: string]: value permet des objets avec clés dynamiques
   - Utile pour les dictionnaires et maps

3. **as const** :
   - Rend un objet readonly
   - Préserve les types littéraux
   - Évite l'élargissement de type

4. **Export/Import** :
   - export rend disponible dans d'autres fichiers
   - import { Type } from './file' pour importer

BONNES PRATIQUES :

1. **Nommage** :
   - Interfaces en PascalCase : BoardLayout
   - Constantes en UPPER_CASE : DEFAULT_LAYOUTS

2. **Documentation** :
   - pour la documentation JSDoc
   - @interface, @example pour enrichir

3. **Organisation** :
   - Grouper les types par domaine métier
   - Interfaces principales en premier
   - Constantes à la fin
*/