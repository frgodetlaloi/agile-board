import { LogLevel, DebugSettings, BoardSettings, PluginSupportConfig, PluginType } from '../types';
export { BoardSettings } from '../types';

/**
 * Configuration par défaut du plugin - VERSION AVEC SUPPORT UNIVERSEL PLUGINS
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
    },
    
    // ✅ NOUVEAU : Configuration du support universel des plugins
    pluginSupport: {
        enabled: true,                         // Support universel activé par défaut
        loadTimeout: 10000,                    // 10 secondes pour charger les plugins
        fallbackDelay: 2000,                   // 2 secondes avant fallback
        supportedPlugins: [                    // Plugins explicitement supportés
            'dataview',
            'tasks',
            'calendar',
            'kanban',
            'templater',
            'quickadd',
            'pomodoro-timer',
            'mermaid',
            'excalidraw',
            'charts'
        ],
        ignoredPlugins: [                      // Plugins à ignorer
            'workspaces',
            'file-explorer',
            'search',
            'command-palette'
        ],
        debugMode: false                       // Debug plugins désactivé par défaut
    },
    
    ui: {
        theme: 'auto',
        showThumbnails: true,
        compactMode: false,
        
        // ✅ NOUVEAU : Options d'interface pour les plugins
        pluginUI: {
            showPluginIndicators: true,        // Afficher les indicateurs de plugins
            showPluginTooltips: true,          // Afficher les tooltips d'aide
            pluginTheme: 'auto'                // Thème automatique pour les plugins
        }
    }
};

/**
 * Configuration recommandée pour le développement - AVEC PLUGINS
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
    },
    
    // ✅ Configuration développement pour plugins
    pluginSupport: {
        enabled: true,
        loadTimeout: 15000,                    // Plus de temps en dev
        fallbackDelay: 1000,                   // Fallback plus rapide
        debugMode: true,                       // Debug plugins activé en dev
        supportedPlugins: ['*'],               // Tous les plugins en dev
        ignoredPlugins: []                     // Aucun plugin ignoré en dev
    }
};

/**
 * Configuration recommandée pour diagnostiquer des problèmes - AVEC PLUGINS
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
    },
    
    // ✅ Configuration diagnostic pour plugins
    pluginSupport: {
        enabled: true,
        loadTimeout: 20000,                    // Timeout étendu pour diagnostic
        fallbackDelay: 5000,                   // Fallback retardé
        debugMode: true,                       // Debug activé pour diagnostic
        supportedPlugins: ['*'],               // Tous les plugins
        ignoredPlugins: []                     // Aucun ignoré pour diagnostic complet
    }
};

/**
 * Configuration de production avec logs minimaux - AVEC PLUGINS OPTIMISÉS
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
    },
    
    // ✅ Configuration production pour plugins (optimisée)
    pluginSupport: {
        enabled: true,
        loadTimeout: 8000,                     // Timeout réduit en production
        fallbackDelay: 1500,                   // Fallback rapide
        debugMode: false,                      // Pas de debug en production
        supportedPlugins: [                    // Plugins essentiels uniquement
            'dataview',
            'tasks',
            'calendar',
            'kanban'
        ],
        ignoredPlugins: [                      // Ignorer les plugins non-essentiels
            'workspaces',
            'file-explorer',
            'search',
            'command-palette',
            'audio-recorder',
            'slides'
        ]
    }
};

/**
 * Configuration spéciale pour tester les plugins
 */
export const PLUGIN_TESTING_SETTINGS: Partial<BoardSettings> = {
    debug: {
        enabled: true,
        logLevel: LogLevel.VERBOSE,
        showTimestamps: true,
        showSourceLocation: true,
        logToFile: true,
        logToConsole: true,
        logFileName: 'agile-board-plugin-test.log',
        maxLogFileSize: 10 * 1024 * 1024,      // 10MB pour tests approfondis
        autoSaveInterval: 1
    },
    
    pluginSupport: {
        enabled: true,
        loadTimeout: 30000,                    // 30 secondes pour les tests
        fallbackDelay: 500,                    // Fallback très rapide pour voir les erreurs
        debugMode: true,
        supportedPlugins: ['*'],               // Tous les plugins pour tests
        ignoredPlugins: []
    },
    
    ui: {
        theme: 'auto',
        showThumbnails: true,
        compactMode: false,
        pluginUI: {
            showPluginIndicators: true,
            showPluginTooltips: true,
            pluginTheme: 'enhanced'            // Interface enrichie pour les tests
        }
    }
};

/**
 * Utilitaires pour la gestion des configurations
 */
export class SettingsUtils {
    
    /**
     * Fusionne des configurations de manière sécurisée
     */
    static mergeSettings(base: BoardSettings, override: Partial<BoardSettings>): BoardSettings {
        return {
            ...base,
            ...override,
            debug: {
                ...base.debug,
                ...override.debug
            },
            pluginSupport: {
                ...base.pluginSupport,
                ...override.pluginSupport
            },
            ui: {
                ...base.ui,
                ...override.ui,
                pluginUI: {
                    ...base.ui?.pluginUI,
                    ...override.ui?.pluginUI
                }
            }
        };
    }
    
    /**
     * Valide une configuration de plugin
     */
    static validatePluginConfig(config: Partial<PluginSupportConfig>): boolean {
        if (!config) return false;
        
        // Valider les timeouts
        if (config.loadTimeout && (config.loadTimeout < 1000 || config.loadTimeout > 60000)) {
            return false;
        }
        
        if (config.fallbackDelay && (config.fallbackDelay < 100 || config.fallbackDelay > 10000)) {
            return false;
        }
        
        // Valider les listes de plugins
        if (config.supportedPlugins && !Array.isArray(config.supportedPlugins)) {
            return false;
        }
        
        if (config.ignoredPlugins && !Array.isArray(config.ignoredPlugins)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Obtient la configuration optimale selon l'environnement
     */
    static getOptimalSettings(environment: 'development' | 'production' | 'testing' | 'diagnostic'): BoardSettings {
        const base = DEFAULT_SETTINGS;
        
        switch (environment) {
            case 'development':
                return SettingsUtils.mergeSettings(base, DEVELOPMENT_SETTINGS);
            case 'production':
                return SettingsUtils.mergeSettings(base, PRODUCTION_SETTINGS);
            case 'testing':
                return SettingsUtils.mergeSettings(base, PLUGIN_TESTING_SETTINGS);
            case 'diagnostic':
                return SettingsUtils.mergeSettings(base, DIAGNOSTIC_SETTINGS);
            default:
                return base;
        }
    }
    
    /**
     * Détecte automatiquement l'environnement
     */
    static detectEnvironment(): 'development' | 'production' | 'testing' | 'diagnostic' {
        // Vérifier si on est en mode développement
        if (process.env.NODE_ENV === 'development') {
            return 'development';
        }
        
        // Vérifier si c'est un environnement de test
        if (process.env.NODE_ENV === 'test') {
            return 'testing';
        }
        
        // Vérifier des indicateurs d'environnement de diagnostic
        if (localStorage.getItem('agile-board-diagnostic') === 'true') {
            return 'diagnostic';
        }
        
        // Par défaut : production
        return 'production';
    }
}