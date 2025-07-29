// ====================================================================
// 📁 src/utils/settings.ts - Configuration par défaut mise à jour
// ====================================================================

import { BoardSettings, LogLevel } from '../types';

/**
 * Configuration par défaut du plugin
 * Optimisée pour un usage en production avec debug désactivé
 */
export const DEFAULT_SETTINGS: BoardSettings = {
    // Paramètres généraux existants
    defaultLayouts: ['layout_eisenhower', 'layout_kanban', 'layout_gtd'],
    autoCreateSections: true,
    
    // Nouvelle configuration de debug
    debug: {
        enabled: false,                    // Debug désactivé par défaut (production)
        logLevel: LogLevel.INFO,          // Niveau INFO quand activé
        showTimestamps: true,             // Affichage des timestamps
        showSourceLocation: true,         // Affichage de la source des logs
        logToFile: false,                 // Pas de sauvegarde fichier par défaut
        logFileName: 'agile-board-debug.log', // Nom du fichier de log
        maxLogFileSize: 1024              // 1MB maximum avant rotation
    }
};

/**
 * Configuration recommandée pour le développement
 */
export const DEVELOPMENT_SETTINGS: Partial<BoardSettings> = {
    debug: {
        enabled: true,
        logLevel: LogLevel.VERBOSE,
        showTimestamps: true,
        showSourceLocation: true,
        logToFile: false, // Console uniquement pour dev
        logFileName: 'agile-board-dev.log',
        maxLogFileSize: 2048
    }
};

/**
 * Configuration recommandée pour diagnostiquer des problèmes
 */
export const DIAGNOSTIC_SETTINGS: Partial<BoardSettings> = {
    debug: {
        enabled: true,
        logLevel: LogLevel.DEBUG,
        showTimestamps: true,
        showSourceLocation: true,
        logToFile: true, // Fichier pour partager les logs
        logFileName: 'agile-board-diagnostic.log',
        maxLogFileSize: 512
    }
};