// ===================================================================
// TYPES CORRECTS BASÉS SUR VOTRE CODE EXISTANT
// ===================================================================
// Types adaptés à la structure réelle de votre code

// ===================================================================
// ENUMS (pour utilisation comme valeurs ET types)
// ===================================================================

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

// ===================================================================
// TYPES LIÉS AUX LAYOUTS ET BOARDS
// ===================================================================

// Structure réelle utilisée dans votre code (x, y, w, h)
export interface BoardLayout {
  title: string;
  x: number;        // Position X dans la grille
  y: number;        // Position Y dans la grille  
  w: number;        // Largeur en unités de grille
  h: number;        // Hauteur en unités de grille
  content?: string;
  metadata?: any;
}

// Structure pour les modèles de board (utilisée dans layouts.ts)
export interface BoardModel {
  [layoutName: string]: BoardLayout[];
}

export interface LayoutInfo {
  name: string;
  displayName: string;
  description: string;
  sections: string[];
  blockCount: number;
  category: string;
  thumbnail?: string;
  featured?: boolean;
}

export type LayoutCategory = 
  | 'productivity' 
  | 'planning' 
  | 'project' 
  | 'personal' 
  | 'custom';

// ===================================================================
// TYPES LIÉS AUX FICHIERS ET SECTIONS
// ===================================================================

// Structure réelle utilisée dans votre code
export interface FileSection {
  start: number;      // Index de ligne de début
  end: number;        // Index de ligne de fin
  lines: string[];    // Contenu sous forme de lignes
  name?: string;      // Nom de la section (optionnel)
  content?: string;   // Contenu complet (optionnel)
}

export interface FileSections {
  [sectionName: string]: FileSection;
}

// ===================================================================
// TYPES LIÉS AUX PARAMÈTRES ET DEBUG
// ===================================================================

// Interface complète basée sur votre utilisation réelle
export interface DebugSettings {
  enabled: boolean;
  logLevel: LogLevel;
  logToFile: boolean;
  logToConsole: boolean;
  showTimestamps: boolean;        // Propriété manquante
  showSourceLocation: boolean;    // Propriété manquante
  logFileName: string;            // Propriété manquante
  maxLogFileSize: number;         // Propriété manquante
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto';
  showThumbnails: boolean;
  compactMode: boolean;
}

export interface BoardSettings {
  autoCreateSections: boolean;
  defaultLayouts: string[];
  debug: DebugSettings;
  ui?: UISettings;
}

// ===================================================================
// TYPES POUR LE LOGGER
// ===================================================================

export interface LogStats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  debugCount: number;
  lastLogTime?: string;
  bufferSize: number;              // Propriété manquante
  isEnabled: boolean;              // Propriété manquante
  currentLevel: string;            // Propriété manquante
  fileLoggingEnabled: boolean;     // Propriété manquante
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
}

// ===================================================================
// TYPES COMMUNS ET UTILITAIRES
// ===================================================================

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Timestamp {
  createdAt: string;
  updatedAt: string;
}

// Types utilitaires TypeScript
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

// ===================================================================
// CONSTANTES DE TYPES
// ===================================================================

export const LAYOUT_TYPES = [
  'kanban',
  'eisenhower', 
  'gtd',
  'custom'
] as const;

// ===================================================================
// TYPES SPÉCIALISÉS POUR OBSIDIAN
// ===================================================================

export interface ObsidianFileCache {
  frontmatter?: {
    [key: string]: any;
    'agile-board'?: string;
  };
  sections?: any[];
  headings?: any[];
}

// ===================================================================
// UTILISATION
// ===================================================================

// Dans vos fichiers :
// import { BoardModel, LayoutInfo, FileSection, BoardSettings, LogLevel } from './types';
// 
// Exemple d'utilisation de LogLevel :
// console.log(LogLevel.INFO); // → 2
// if (level >= LogLevel.DEBUG) { ... }
// 
// Exemple d'utilisation de FileSection :
// const section: FileSection = {
//   start: 5,
//   end: 10,
//   lines: ['line1', 'line2', 'line3']
// };
// console.log(section.lines.join('\n'));
//
// Exemple d'utilisation de BoardLayout :
// const layout: BoardLayout = {
//   title: 'Todo',
//   x: 0,
//   y: 0, 
//   w: 6,
//   h: 4
// };