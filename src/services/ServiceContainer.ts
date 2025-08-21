/**
 * =============================================================================
 * CONTAINER CENTRAL POUR L'INJECTION DE DÉPENDANCES - VERSION MODIFIÉE
 * =============================================================================
 * 
 * Fichier : src/services/ServiceContainer.ts (VERSION MODIFIÉE)
 * 
 * Ajoute le support du PluginIntegrationManager dans le container de services.
 */

import { App } from 'obsidian';
import { BoardSettings } from '../utils/settings';
import { LoggerService } from './LoggerService';
import { LayoutService } from './LayoutService';
import { FileService } from './FileService';
import { FileCache } from '../cache/FileCache';
import { PluginIntegrationManager } from './PluginIntegrationManager';
import type AgileBoardPlugin from '../main';

/**
 * Container central pour l'injection de dépendances
 */
export class ServiceContainer {
    readonly logger: LoggerService;
    readonly layout: LayoutService;
    readonly file: FileService;
    readonly cache: FileCache;
    // ✅ NOUVEAU : Gestionnaire universel des plugins
    readonly pluginIntegration: PluginIntegrationManager;

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
        
        // ✅ NOUVEAU : Initialiser le gestionnaire de plugins
        this.pluginIntegration = new PluginIntegrationManager(this.app, this.logger);
    }

    /**
     * Initialise tous les services
     */
    async initialize(): Promise<void> {
        this.logger.info('Initialisation du container de services avec support universel plugins');
        
        try {
            // Charger les layouts
            this.layout.load();
            
            this.logger.success('Container de services initialisé avec support universel', {
                layoutsCount: this.layout.getAllModelNames().length,
                cacheStats: this.cache.getStats(),
                pluginSupportEnabled: true
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
        
        try {
            // ✅ NOUVEAU : Nettoyer le gestionnaire de plugins
            this.pluginIntegration.dispose();
            
            this.file.dispose();
            this.cache.dispose();
            
            this.logger.info('✅ Container de services nettoyé avec succès');
        } catch (error) {
            this.logger.error('❌ Erreur lors du nettoyage du container', error);
        }
        
        // Note: Ne pas disposer logger ici car il pourrait être utilisé après
    }

    /**
     * Statistiques pour debugging
     */
    getStats(): Record<string, unknown> {
        return {
            layouts: this.layout.getAllModelNames().length,
            cache: this.cache.getStats(),
            pluginIntegration: this.pluginIntegration.getStats(),
            logger: {
                level: this.settings.debug.logLevel,
                enabled: this.settings.debug.enabled
            }
        };
    }
}