import { LogLevel, DebugSettings, BoardSettings } from '../types';
export { BoardSettings } from '../types';

/**
 * Configuration par défaut du plugin - VERSION CORRIGÉE
 */
export const DEFAULT_SETTINGS: BoardSettings = {
    autoCreateSections: true,
    defaultLayouts: ['layout_kanban', 'layout_eisenhower', 'layout_gtd'],
    debug: {
        enabled: false,                         // Debug désactivé par défaut (production)
        logLevel: LogLevel.INFO,               // Niveau INFO par défaut
        showTimestamps: true,                  // Affichage des timestamps
        showSourceLocation: true,              // Affichage de la source des logs
        logToFile: false,                      // Pas de sauvegarde fichier par défaut
        logToConsole: true,                    // Console activée par défaut
        logFileName: 'agile-board-debug.log',  // Nom du fichier de log
        maxLogFileSize: 5 * 1024 * 1024,       // 5MB maximum avant rotation
        autoSaveInterval: 5                    // Sauvegarde automatique toutes les 5 minutes
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
        logToFile: false,                      // Console uniquement pour dev
        logToConsole: true,
        logFileName: 'agile-board-dev.log',
        maxLogFileSize: 2 * 1024 * 1024,       // 2MB pour le dev
        autoSaveInterval: 1                    // Sauvegarde toutes les 1 minute pour dev
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
        logToFile: true,                       // Fichier pour partager les logs
        logToConsole: false,                   // Pas de pollution console en diagnostic
        logFileName: 'agile-board-diagnostic.log',
        maxLogFileSize: 1024 * 1024,           // 1MB pour diagnostic
        autoSaveInterval: 5                    // Sauvegarde toutes les 5 minutes
    }
};

/**
 * Configuration de production avec logs minimaux
 */
export const PRODUCTION_SETTINGS: Partial<BoardSettings> = {
    debug: {
        enabled: true,                         // Logs d'erreurs seulement
        logLevel: LogLevel.ERROR,
        showTimestamps: false,                 // Moins verbeux
        showSourceLocation: false,
        logToFile: true,                       // Garder les erreurs en fichier
        logToConsole: false,                   // Pas de pollution console
        logFileName: 'agile-board-errors.log',
        maxLogFileSize: 512 * 1024,            // 512KB pour erreurs seulement
        autoSaveInterval: 10                   // Sauvegarde toutes les 10 minutes
    }
};