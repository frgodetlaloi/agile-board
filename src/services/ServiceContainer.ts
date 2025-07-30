import { App } from 'obsidian';
import { BoardSettings } from '../utils/settings';
import { LoggerService } from './LoggerService';
import { LayoutService } from './LayoutService';
import { FileService } from './FileService';
import { FileCache } from '../cache/FileCache';
import type AgileBoardPlugin from '../main';

/**
 * Container central pour l'injection de dépendances
 */
export class ServiceContainer {
    readonly logger: LoggerService;
    readonly layout: LayoutService;
    readonly file: FileService;
    readonly cache: FileCache;

    constructor(
        private app: App,
        private plugin: AgileBoardPlugin,
        private settings: BoardSettings
    ) {
        // Initialisation dans l'ordre des dépendances
        this.logger = new LoggerService(plugin, settings.debug);
        this.cache = new FileCache();
        this.layout = new LayoutService(plugin);
        this.file = new FileService(this.app, this.layout, this.logger);
    }

    /**
     * Initialise tous les services
     */
    async initialize(): Promise<void> {
        this.logger.info('Initialisation du container de services');
        
        try {
            // Charger les layouts
            this.layout.load();
            
            this.logger.success('Container de services initialisé', {
                layoutsCount: this.layout.getAllModelNames().length,
                cacheStats: this.cache.getStats()
            });
            
        } catch (error) {
            this.logger.error('Erreur initialisation container', error);
            throw error;
        }
    }

    /**
     * Met à jour les paramètres
     */
    updateSettings(settings: BoardSettings): void {
        this.logger.updateSettings(settings.debug);
        // Autres mises à jour si nécessaire
    }

    /**
     * Dispose tous les services
     */
    dispose(): void {
        this.logger.info('Nettoyage du container de services');
        this.file.dispose();
        this.cache.dispose();
        // Note: Ne pas disposer logger ici car il pourrait être utilisé après
    }

    /**
     * Statistiques pour debugging
     */
    getStats(): Record<string, unknown> {
        return {
            layouts: this.layout.getAllModelNames().length,
            cache: this.cache.getStats(),
            logger: {
                level: this.settings.debug.logLevel,
                enabled: this.settings.debug.enabled
            }
        };
    }
}