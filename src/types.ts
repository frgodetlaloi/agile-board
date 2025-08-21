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
// INTERFACES DE DEBUG
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
// INTERFACES LAYOUT ET BOARD
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

// ===================================================================
// INTERFACES DE FICHIERS ET SECTIONS
// ===================================================================

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

// ===================================================================
// ✅ NOUVEAUX TYPES POUR LE SUPPORT UNIVERSEL DES PLUGINS
// ===================================================================

/**
 * Configuration pour le support des plugins
 */
export interface PluginSupportConfig {
    /** Active le support universel des plugins */
    enabled: boolean;
    
    /** Timeout pour le chargement des plugins (ms) */
    loadTimeout: number;
    
    /** Délai avant de considérer un plugin comme défaillant (ms) */
    fallbackDelay: number;
    
    /** Liste des plugins supportés explicitement */
    supportedPlugins: string[];
    
    /** Liste des plugins à ignorer */
    ignoredPlugins: string[];
    
    /** Active le debugging spécifique aux plugins */
    debugMode: boolean;
}

/**
 * Métadonnées d'un plugin détecté
 */
export interface PluginMetadata {
    /** Nom du plugin */
    name: string;
    
    /** Type du plugin (dataview, tasks, etc.) */
    type: PluginType;
    
    /** Version détectée */
    version?: string;
    
    /** État du plugin */
    status: PluginStatus;
    
    /** Sélecteurs CSS utilisés par le plugin */
    selectors: string[];
    
    /** Événements supportés par le plugin */
    supportedEvents: string[];
    
    /** Configuration spécifique au plugin */
    config?: Record<string, unknown>;
}

/**
 * Types de plugins supportés
 */
export enum PluginType {
    TASKS = 'tasks',
    DATAVIEW = 'dataview',
    CALENDAR = 'calendar',
    KANBAN = 'kanban',
    TEMPLATER = 'templater',
    QUICKADD = 'quickadd',
    POMODORO = 'pomodoro-timer',
    MERMAID = 'mermaid',
    EXCALIDRAW = 'excalidraw',
    CHARTS = 'charts',
    OTHER = 'other'
}

/**
 * État d'un plugin
 */
export enum PluginStatus {
    LOADING = 'loading',
    LOADED = 'loaded',
    READY = 'ready',
    ERROR = 'error',
    DISABLED = 'disabled',
    NOT_FOUND = 'not_found'
}

/**
 * Événement de changement de plugin
 */
export interface PluginChangeEvent {
    /** Type d'événement */
    type: 'content-change' | 'state-change' | 'error';
    
    /** Plugin concerné */
    plugin: PluginMetadata;
    
    /** Nouveau contenu (si applicable) */
    newContent?: string;
    
    /** Ancien contenu (si applicable) */
    oldContent?: string;
    
    /** Données supplémentaires */
    data?: Record<string, unknown>;
    
    /** Timestamp de l'événement */
    timestamp: number;
}

/**
 * Configuration d'un gestionnaire de plugin
 */
export interface PluginHandlerConfig {
    /** Sélecteurs CSS pour détecter le plugin */
    selectors: string[];
    
    /** Méthode pour extraire le contenu markdown */
    extractMarkdown: (element: HTMLElement) => string;
    
    /** Méthode pour détecter les changements */
    detectChanges: (element: HTMLElement) => boolean;
    
    /** Événements à surveiller */
    watchEvents: string[];
    
    /** Délai avant de considérer le contenu comme stable */
    stabilityDelay: number;
}

/**
 * Résultat de conversion HTML vers Markdown
 */
export interface MarkdownConversionResult {
    /** Contenu markdown converti */
    markdown: string;
    
    /** Succès de la conversion */
    success: boolean;
    
    /** Erreurs rencontrées */
    errors: string[];
    
    /** Avertissements */
    warnings: string[];
    
    /** Métadonnées de la conversion */
    metadata: {
        /** Plugins détectés */
        pluginsDetected: PluginType[];
        
        /** Éléments convertis */
        elementsProcessed: number;
        
        /** Temps de traitement (ms) */
        processingTime: number;
    };
}

// ===================================================================
// INTERFACES DE CONFIGURATION
// ===================================================================

export interface BoardSettings {
    autoCreateSections: boolean;
    defaultLayouts: string[];
    debug: DebugSettings;
    ui?: UISettings;
    
    // ✅ NOUVEAU : Configuration du support des plugins
    pluginSupport?: PluginSupportConfig;
}

export interface UISettings {
    theme: 'light' | 'dark' | 'auto';
    showThumbnails: boolean;
    compactMode: boolean;
    
    // ✅ NOUVEAU : Options d'interface pour les plugins
    pluginUI?: {
        /** Afficher les indicateurs de plugins */
        showPluginIndicators: boolean;
        
        /** Afficher les tooltips d'aide pour les plugins */
        showPluginTooltips: boolean;
        
        /** Thème spécifique pour les plugins */
        pluginTheme: 'auto' | 'minimal' | 'enhanced';
    };
}

// ===================================================================
// TYPES POUR LA VALIDATION
// ===================================================================

export type ValidatedFile = TFile & { _validated: true };
export type ValidatedLayoutName = string & { _validatedLayoutName: true };
export type ValidatedSectionName = string & { _validatedSectionName: true };

// ✅ NOUVEAUX TYPES DE VALIDATION POUR LES PLUGINS
export type ValidatedPluginElement = HTMLElement & { _validatedPlugin: true };
export type ValidatedPluginConfig = PluginSupportConfig & { _validated: true };

// ===================================================================
// TYPES UTILITAIRES POUR LES PLUGINS
// ===================================================================

/**
 * Callback pour les changements de contenu des plugins
 */
export type PluginContentChangeCallback = (newContent: string) => void;

/**
 * Callback pour les erreurs de plugins
 */
export type PluginErrorCallback = (error: Error, plugin: PluginMetadata) => void;

/**
 * Options pour la configuration du support universel
 */
export interface UniversalPluginSupportOptions {
    /** Container à surveiller */
    container: HTMLElement;
    
    /** Callback pour les changements de contenu */
    onContentChange: PluginContentChangeCallback;
    
    /** Callback pour les erreurs */
    onError?: PluginErrorCallback;
    
    /** Chemin du fichier source */
    sourcePath: string;
    
    /** Configuration spécifique */
    config?: Partial<PluginSupportConfig>;
}

/**
 * Statistiques du gestionnaire de plugins
 */
export interface PluginManagerStats {
    /** Nombre d'observers actifs */
    observers: number;
    
    /** Nombre d'event listeners actifs */
    eventListeners: number;
    
    /** Nombre de plugins détectés */
    pluginsDetected: number;
    
    /** Nombre d'erreurs rencontrées */
    errors: number;
    
    /** Temps de fonctionnement (ms) */
    uptime: number;
    
    /** Dernière activité */
    lastActivity: number;
}

// ===================================================================
// TYPES POUR LES GESTIONNAIRES DE PLUGINS SPÉCIFIQUES
// ===================================================================

/**
 * Configuration spécifique pour le plugin Tasks
 */
export interface TasksPluginConfig {
    /** Requêtes Tasks supportées */
    supportedQueries: string[];
    
    /** Format de date par défaut */
    defaultDateFormat: string;
    
    /** Symboles de priorité */
    prioritySymbols: Record<string, string>;
}

/**
 * Configuration spécifique pour le plugin Dataview
 */
export interface DataviewPluginConfig {
    /** Types de requêtes supportées */
    supportedQueryTypes: ('TABLE' | 'LIST' | 'TASK' | 'CALENDAR')[];
    
    /** Champs personnalisés reconnus */
    customFields: string[];
    
    /** Format d'affichage par défaut */
    defaultDisplayFormat: 'table' | 'list' | 'cards';
}