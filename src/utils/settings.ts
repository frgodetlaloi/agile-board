// ====================================================================
// 📁 src/utils/settings.ts - Configuration par défaut mise à jour
// ====================================================================

// Extrait corrigé de src/utils/settings.ts
import { LogLevel, DebugSettings, BoardSettings } from '../types';
export { BoardSettings } from '../types';
// Configuration par défaut
export const DEFAULT_SETTINGS: BoardSettings = {
    autoCreateSections: true,
    defaultLayouts: ['layout_kanban', 'layout_eisenhower', 'layout_gtd'],
    debug: {
        enabled: false,
        logLevel: LogLevel.INFO,
        showTimestamps: true,
        showSourceLocation: true,
        logToFile: false,
        logToConsole: true,              // ← Ajouté
        logFileName: 'agile-board-debug.log',
        maxLogFileSize: 5 * 1024 * 1024  // 5MB
    }
};

// Configuration de développement
export const DEV_SETTINGS: Partial<BoardSettings> = {
    debug: {
        enabled: true,
        logLevel: LogLevel.VERBOSE,
        showTimestamps: true,
        showSourceLocation: true,
        logToFile: false,
        logToConsole: true,              // ← Ajouté
        logFileName: 'agile-board-debug.log',
        maxLogFileSize: 5 * 1024 * 1024
    }
};

// Configuration de production avec logs
export const PROD_WITH_LOGS_SETTINGS: Partial<BoardSettings> = {
    debug: {
        enabled: true,
        logLevel: LogLevel.DEBUG,
        showTimestamps: true,
        showSourceLocation: true,
        logToFile: true,
        logToConsole: false,             // ← Ajouté (false pour la production)
        logFileName: 'agile-board-debug.log',
        maxLogFileSize: 5 * 1024 * 1024
    }
};