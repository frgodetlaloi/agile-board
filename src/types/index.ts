// ====================================================================
// 📁 src/types/index.ts - Types et Interfaces mis à jour
// ====================================================================

import { TFile } from 'obsidian';

/**
 * Énumération des niveaux de log pour le système de debug
 * Ordre croissant de verbosité : NONE < ERROR < WARN < INFO < DEBUG < VERBOSE
 */
export enum LogLevel {
    NONE = 0,      // Aucun log - mode production
    ERROR = 1,     // Seulement les erreurs critiques
    WARN = 2,      // Erreurs + avertissements
    INFO = 3,      // Erreurs + avertissements + informations importantes
    DEBUG = 4,     // Tous les logs + informations de debug détaillées
    VERBOSE = 5    // Tout + traces très détaillées (développement)
}

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
    
    /** Nom du fichier de log (dans la racine du vault) */
    logFileName: string;
    
    /** Taille maximale du fichier de log en KB avant rotation */
    maxLogFileSize: number;
}

/**
 * Configuration générale du plugin
 */
export interface BoardSettings {
    /** Layouts par défaut proposés à l'utilisateur */
    defaultLayouts: string[];
    
    /** Création automatique des sections manquantes */
    autoCreateSections: boolean;
    
    /** Configuration du système de debug */
    debug: DebugSettings;
}

/**
 * Définition d'une section dans un layout de board
 */
export interface BoardLayout {
    /** Titre de la section (correspond à un header H1) */
    title: string;
    
    /** Position X dans la grille CSS (0-23) */
    x: number;
    
    /** Position Y dans la grille CSS */
    y: number;
    
    /** Largeur en nombre de colonnes */
    w: number;
    
    /** Hauteur en nombre de lignes */
    h: number;
}

/**
 * Informations descriptives d'un layout
 */
export interface LayoutInfo {
    /** Nom technique du layout */
    name: string;
    
    /** Nom affiché à l'utilisateur */
    displayName: string;
    
    /** Description courte du layout */
    description: string;
    
    /** Sections requises pour ce layout */
    sections: string[];
}

/**
 * Map des sections extraites d'un fichier markdown
 * Clé = nom de la section, Valeur = contenu
 */
export interface SectionMap {
    [sectionName: string]: string;
}

/**
 * Statistiques du système de logging
 */
export interface LogStats {
    /** Nombre d'entrées dans le buffer de logs */
    bufferSize: number;
    
    /** Indique si le debug est activé */
    isEnabled: boolean;
    
    /** Niveau de log actuel (nom lisible) */
    currentLevel: string;
    
    /** Indique si la sauvegarde fichier est active */
    fileLoggingEnabled: boolean;
}