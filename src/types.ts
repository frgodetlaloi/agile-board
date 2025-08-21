// Import pour TFile (nécessaire pour la validation)
import { TFile } from 'obsidian';

// ===================================================================
// ENUMS
// ===================================================================

export enum LogLevel {
    NONE = 0,      // Aucun log - mode production
    ERROR = 1,     // Seulement les erreurs critiques
    WARN = 2,      // Erreurs + avertissements
    INFO = 3,      // Erreurs + avertissements + informations importantes
    DEBUG = 4,     // Tous les logs + informations de debug détaillées
    VERBOSE = 5    // Tout + traces très détaillées (développement)
}

// ===================================================================
// INTERFACES
// ===================================================================

/**
 * Configuration complète du système de debug
 */
export interface DebugSettings {
    /** Active/désactive complètement le système de debug */
    enabled: boolean;
    
    /** Niveau de verbosité des logs (voir LogLevel) */
    logLevel: LogLevel;
    
    /** Affiche l'horodatage précis dans les messages */
    showTimestamps: boolean;
    
    /** Affiche le fichier source dans les messages */
    showSourceLocation: boolean;
    
    /** Active la sauvegarde des logs dans un fichier */
    logToFile: boolean;
    
    /** Active l'affichage dans la console */
    logToConsole: boolean;
    
    /** Nom du fichier de log (dans la racine du vault) */
    logFileName: string;
    
    /** Taille maximale du fichier de log en bytes avant rotation */
    maxLogFileSize: number;

    /** Intervalle de sauvegarde automatique en minutes */
    autoSaveInterval: number;
}

/**
 * Statistiques du système de logging
 */
export interface LogStats {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    debugCount: number;
    lastLogTime?: string;
    bufferSize: number;
    isEnabled: boolean;
    currentLevel: string;
    fileLoggingEnabled: boolean;
}

// ===================================================================
// INTERFACES EXISTANTES
// ===================================================================

export interface BoardLayout {
    title: string;
    x: number;
    y: number;
    w: number;
    h: number;
    content?: string;
    metadata?: any;
}

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

export interface FileSection {
    start: number;
    end: number;
    lines: string[];
    name?: string;
    content?: string;
}

export interface FileSections {
    [sectionName: string]: FileSection;
}

export interface BoardSettings {
    autoCreateSections: boolean;
    defaultLayouts: string[];
    debug: DebugSettings;
    ui?: UISettings;
}

export interface UISettings {
    theme: 'light' | 'dark' | 'auto';
    showThumbnails: boolean;
    compactMode: boolean;
}

// ===================================================================
// TYPES POUR LA VALIDATION
// ===================================================================

export type ValidatedFile = TFile & { _validated: true };
export type ValidatedLayoutName = string & { _validatedLayoutName: true };
export type ValidatedSectionName = string & { _validatedSectionName: true };
