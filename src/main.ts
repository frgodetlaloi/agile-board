import { Plugin, TFile, Notice } from 'obsidian';
import { LoggerService } from './services/LoggerService';
import { ServiceContainer } from './services/ServiceContainer';
import { BoardSettings, DEFAULT_SETTINGS, SettingsUtils } from './utils/settings';
import { BoardView, BOARD_VIEW_TYPE } from './views/BoardView';
import { ViewSwitcher } from './managers/ViewSwitcher';
import { ModelDetector } from './managers/ModelDetector';
import { AgileBoardSettingsTab } from './components/SettingsTab';

/**
 * Plugin principal Agile Board v0.9.0 - Avec Support Universel des Plugins
 */
export default class AgileBoardPlugin extends Plugin {
    settings!: BoardSettings;
    logger!: LoggerService;
    services!: ServiceContainer;
    
    // Managers
    private viewSwitcher!: ViewSwitcher;
    private modelDetector!: ModelDetector;
    private logSaveInterval: number | null = null;

    async onload(): Promise<void> {
        try {
            await this.initializeCore();
            this.logger.startup('🚀 Chargement Agile Board Plugin v0.9.0 avec support universel plugins');
            await this.initializeServices();
            await this.initializeUI();
            this.setupLogAutoSave();

            // ✅ NOUVEAU : Log des plugins détectés
            this.logDetectedPlugins();

            this.logger.info('✅ Agile Board Plugin chargé avec succès - Support universel des plugins activé');
            
        } catch (error) {
            console.error('❌ Erreur chargement plugin:', error);
            new Notice('❌ Erreur lors du chargement du plugin Agile Board');
        }
    }

    async onunload(): Promise<void> {
        this.logger?.info('Arrêt du plugin Agile Board');
        
        // ✅ NOUVEAU : Nettoyer les vues enregistrées AVANT les autres nettoyages
        try {
            // Fermer toutes les vues BoardView ouvertes
            const boardViews = this.app.workspace.getLeavesOfType(BOARD_VIEW_TYPE);
            for (const leaf of boardViews) {
                leaf.detach();
            }
            
            // Désenregistrer le type de vue pour éviter l'erreur lors du prochain chargement
            if ((this.app as any).viewRegistry?.unregisterView) {
                (this.app as any).viewRegistry.unregisterView(BOARD_VIEW_TYPE);
            }
            
        } catch (error) {
            this.logger?.warn('⚠️ Erreur nettoyage vues', error);
        }
        
        // Nettoyer les managers
        this.modelDetector?.onUnload();
        this.viewSwitcher?.stop();
        
        // Nettoyer les services (inclut maintenant PluginIntegrationManager)
        this.services?.dispose();
        
        // Nettoyer l'intervalle de logs
        if (this.logSaveInterval) {
            clearInterval(this.logSaveInterval);
            this.logSaveInterval = null;
        }
        
        this.logger?.info('🛑 Agile Board Plugin arrêté proprement');
    }

    /**
     * Initialise les composants de base
     */
    private async initializeCore(): Promise<void> {
        await this.loadSettings();
        
        // ✅ NOUVEAU : Optimiser les paramètres selon l'environnement
        this.optimizeSettingsForEnvironment();
        
        // Créer logger au niveau plugin d'abord
        this.logger = new LoggerService(this, this.settings.debug);
        
        // Puis créer le container (avec PluginIntegrationManager)
        this.services = new ServiceContainer(this.app, this, this.settings);
    }

    /**
     * ✅ NOUVEAU : Optimise les paramètres selon l'environnement détecté
     */
    private optimizeSettingsForEnvironment(): void {
        const environment = SettingsUtils.detectEnvironment();
        const optimizedSettings = SettingsUtils.getOptimalSettings(environment);
        
        // Merger avec les paramètres utilisateur existants
        this.settings = SettingsUtils.mergeSettings(optimizedSettings, this.settings);
        
        this.logger?.config('Paramètres optimisés pour environnement', {
            environment,
            pluginSupportEnabled: this.settings.pluginSupport?.enabled,
            debugMode: this.settings.pluginSupport?.debugMode
        });
    }

    /**
     * Initialise tous les services
     */
    private async initializeServices(): Promise<void> {
        await this.services.initialize();
        
        // Initialiser les managers
        this.viewSwitcher = new ViewSwitcher(this);
        this.modelDetector = new ModelDetector(this);
        
        // Démarrer les managers
        this.modelDetector.onLoad();
        this.viewSwitcher.addSwitchButton();
        
        // ✅ NOUVEAU : Log des statistiques du container avec plugins
        const stats = this.services.getStats();
        this.logger.info('📊 Services initialisés avec support universel', stats);
    }

    /**
     * Initialise l'interface utilisateur
     */
    private async initializeUI(): Promise<void> {
        try {
            // ✅ NOUVEAU : Vérifier si la vue n'est pas déjà enregistrée
            const existingViewConstructors = (this.app as any).viewRegistry?.viewByType;
            if (existingViewConstructors && existingViewConstructors[BOARD_VIEW_TYPE]) {
                this.logger.warn('⚠️ Vue BoardView déjà enregistrée, nettoyage...');
                
                // Fermer les vues existantes
                const boardViews = this.app.workspace.getLeavesOfType(BOARD_VIEW_TYPE);
                for (const leaf of boardViews) {
                    leaf.detach();
                }
                
                // Désenregistrer l'ancienne vue
                if ((this.app as any).viewRegistry?.unregisterView) {
                    (this.app as any).viewRegistry.unregisterView(BOARD_VIEW_TYPE);
                }
            }
            
            // Enregistrer la vue avec le plugin
            this.registerView(BOARD_VIEW_TYPE, (leaf) => 
                new BoardView(leaf, this)
            );
            
            // Enregistrer les commandes
            this.registerCommands();
            
            // Ajouter l'onglet de configuration
            this.addSettingTab(new AgileBoardSettingsTab(this.app, this));
            
        } catch (error) {
            this.logger.error('❌ Erreur initialisation UI', error);
            throw error;
        }
    }

    /**
     * Enregistre toutes les commandes
     */
    private registerCommands(): void {
        // Commandes de création utilisant le ServiceContainer
        const layouts = this.services.layout.getAllModelsInfo();
        
        layouts.forEach(layout => {
            this.addCommand({
                id: `create-${layout.name.replace('layout_', '')}-note`,
                name: `Créer ${layout.displayName}`,
                callback: () => this.createNote(layout.name)
            });
        });

        // Commande de basculement
        this.addCommand({
            id: 'switch-to-board-view',
            name: 'Basculer vers la vue Board',
            callback: () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    this.viewSwitcher.switchToBoardView(activeFile);
                } else {
                    new Notice('❌ Aucun fichier actif');
                }
            }
        });

        this.addCommand({
            id: 'create-missing-sections',
            name: 'Créer les sections manquantes',
            callback: () => this.createMissingSections()
        });

        // ✅ NOUVELLES COMMANDES pour les plugins
        this.addCommand({
            id: 'refresh-plugin-support',
            name: 'Actualiser le support des plugins',
            callback: () => this.refreshPluginSupport()
        });

        this.addCommand({
            id: 'toggle-plugin-debug',
            name: 'Basculer le debug des plugins',
            callback: () => this.togglePluginDebug()
        });

        this.addCommand({
            id: 'show-plugin-diagnostics',
            name: 'Afficher les diagnostics des plugins',
            callback: () => this.showPluginDiagnostics()
        });
    }

    /**
     * Crée une nouvelle note avec layout (utilise ServiceContainer)
     */
    private async createNote(layoutName: string): Promise<void> {
        try {
            await this.services.file.createNoteWithLayout({
                layoutName,
                autoOpen: true
            });
        } catch (error) {
            this.logger.error('Erreur création note', error);
        }
    }

    /**
     * Crée les sections manquantes (utilise ServiceContainer)
     */
    private async createMissingSections(): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('❌ Aucun fichier actif');
            return;
        }

        try {
            await this.services.file.createMissingSections(activeFile);
        } catch (error) {
            this.logger.error('Erreur création sections', error);
        }
    }

    // ===================================================================
    // ✅ NOUVELLES MÉTHODES POUR LE SUPPORT DES PLUGINS
    // ===================================================================

    /**
     * ✅ NOUVEAU : Log les plugins Obsidian détectés
     */
    private logDetectedPlugins(): void {
        try {
            // Obtenir la liste des plugins installés
            const enabledPlugins = Object.keys((this.app as any).plugins.enabledPlugins || {});
            const manifests = (this.app as any).plugins.manifests || {};
            
            const supportedPlugins = this.settings.pluginSupport?.supportedPlugins || [];
            const detectedSupportedPlugins = enabledPlugins.filter(pluginId => 
                supportedPlugins.includes(pluginId) || supportedPlugins.includes('*')
            );

            this.logger.info('🔌 Plugins Obsidian détectés', {
                totalEnabled: enabledPlugins.length,
                supportedDetected: detectedSupportedPlugins.length,
                supportedPlugins: detectedSupportedPlugins,
                allEnabled: enabledPlugins
            });

            // Log des plugins spécifiquement supportés
            detectedSupportedPlugins.forEach(pluginId => {
                const manifest = manifests[pluginId];
                if (manifest) {
                    this.logger.debug(`📦 Plugin supporté: ${manifest.name} v${manifest.version}`, {
                        id: pluginId,
                        author: manifest.author,
                        description: manifest.description
                    });
                }
            });

        } catch (error) {
            this.logger.warn('⚠️ Erreur lors de la détection des plugins', error);
        }
    }

    /**
     * ✅ NOUVEAU : Actualise le support des plugins
     */
    private async refreshPluginSupport(): Promise<void> {
        try {
            this.logger.info('🔄 Actualisation du support des plugins...');
            
            // Réinitialiser le gestionnaire de plugins
            if (this.services.pluginIntegration) {
                this.services.pluginIntegration.dispose();
            }
            
            // Attendre un court délai
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Re-détecter les plugins
            this.logDetectedPlugins();
            
            // Notifier les vues actives pour qu'elles se re-rendent
            const boardViews = this.app.workspace.getLeavesOfType(BOARD_VIEW_TYPE);
            for (const leaf of boardViews) {
                const view = leaf.view as BoardView;
                if (view.renderBoardLayout) {
                    await view.renderBoardLayout();
                }
            }
            
            new Notice('✅ Support des plugins actualisé');
            this.logger.success('Support des plugins actualisé avec succès');
            
        } catch (error) {
            this.logger.error('❌ Erreur lors de l\'actualisation du support des plugins', error);
            new Notice('❌ Erreur lors de l\'actualisation du support des plugins');
        }
    }

    /**
     * ✅ NOUVEAU : Bascule le mode debug des plugins
     */
    private async togglePluginDebug(): Promise<void> {
        try {
            const currentDebugMode = this.settings.pluginSupport?.debugMode || false;
            
            if (!this.settings.pluginSupport) {
                this.settings.pluginSupport = { ...this.settings.pluginSupport };
            }
            
            this.settings.pluginSupport.debugMode = !currentDebugMode;
            await this.saveSettings();
            
            const newState = this.settings.pluginSupport.debugMode ? 'activé' : 'désactivé';
            new Notice(`🔧 Debug des plugins ${newState}`);
            
            this.logger.config('Debug des plugins modifié', {
                debugMode: this.settings.pluginSupport.debugMode
            });
            
        } catch (error) {
            this.logger.error('❌ Erreur lors du basculement du debug des plugins', error);
        }
    }

    /**
     * ✅ NOUVEAU : Affiche les diagnostics des plugins
     */
    private showPluginDiagnostics(): void {
        try {
            const stats = this.services.getStats();
            const pluginStats = stats.pluginIntegration as any;
            
            // Obtenir les plugins détectés
            const enabledPlugins = Object.keys((this.app as any).plugins.enabledPlugins || {});
            const supportedPlugins = this.settings.pluginSupport?.supportedPlugins || [];
            
            const diagnostics = {
                'Support universel': this.settings.pluginSupport?.enabled ? '✅ Activé' : '❌ Désactivé',
                'Mode debug': this.settings.pluginSupport?.debugMode ? '✅ Activé' : '❌ Désactivé',
                'Plugins installés': enabledPlugins.length.toString(),
                'Plugins supportés': supportedPlugins.length.toString(),
                'Observers actifs': pluginStats?.observers?.toString() || '0',
                'Event listeners': pluginStats?.eventListeners?.toString() || '0',
                'Timeout chargement': `${this.settings.pluginSupport?.loadTimeout || 0}ms`,
                'Délai fallback': `${this.settings.pluginSupport?.fallbackDelay || 0}ms`
            };
            
            let message = '🔍 Diagnostics du support des plugins:\n\n';
            Object.entries(diagnostics).forEach(([key, value]) => {
                message += `• ${key}: ${value}\n`;
            });
            
            // Ajouter la liste des plugins supportés détectés
            const detectedSupportedPlugins = enabledPlugins.filter(pluginId => 
                supportedPlugins.includes(pluginId) || supportedPlugins.includes('*')
            );
            
            if (detectedSupportedPlugins.length > 0) {
                message += `\n📦 Plugins supportés détectés:\n`;
                detectedSupportedPlugins.forEach(pluginId => {
                    message += `  • ${pluginId}\n`;
                });
            }
            
            new Notice(message, 10000); // Afficher pendant 10 secondes
            
            // Log détaillé
            this.logger.info('📊 Diagnostics du support des plugins', {
                settings: this.settings.pluginSupport,
                stats: pluginStats,
                enabledPlugins,
                detectedSupportedPlugins
            });
            
        } catch (error) {
            this.logger.error('❌ Erreur lors de l\'affichage des diagnostics', error);
            new Notice('❌ Erreur lors de l\'affichage des diagnostics des plugins');
        }
    }

    /**
     * Configure un intervalle pour sauvegarder les logs
     */
    private setupLogAutoSave(): void {
        // Nettoyer l'ancien intervalle s'il existe
        if (this.logSaveInterval) {
            clearInterval(this.logSaveInterval);
        }

        if (this.settings.debug.enabled && this.settings.debug.logToFile) {
            const intervalInMinutes = this.settings.debug.autoSaveInterval;
            const intervalInMs = intervalInMinutes * 60 * 1000;

            this.logSaveInterval = this.registerInterval (
                window.setInterval(() => {
                    this.logger.saveLogsToFile();
                }, intervalInMs)
            ); 
            this.logger.info('📝 Intervalle de sauvegarde des logs configuré', {
                intervalMinutes: intervalInMinutes
            });
        }
    }

    // ===================================================================
    // GETTERS DE COMPATIBILITÉ (pour BoardView qui attend les anciens services)
    // ===================================================================

    /**
     * Getter pour layoutService (compatibilité BoardView)
     */
    get layoutService() {
        return this.services.layout;
    }

    /**
     * Getter pour fileService (compatibilité BoardView)
     */
    get fileService() {
        return this.services.file;
    }

    /**
     * Getter pour sectionManager (compatibilité BoardView)
     */
    get sectionManager() {
        return {
            createMissingSections: async (file: TFile) => {
                return await this.services.file.createMissingSections(file);
            }
        };
    }

    // ===================================================================
    // GESTION DES PARAMÈTRES
    // ===================================================================

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        
        // ✅ NOUVEAU : Valider la configuration des plugins
        if (this.settings.pluginSupport && !SettingsUtils.validatePluginConfig(this.settings.pluginSupport)) {
            this.settings.pluginSupport = DEFAULT_SETTINGS.pluginSupport;
            console.warn('⚠️ Configuration des plugins invalide, utilisation des paramètres par défaut');
        }
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        this.services?.updateSettings(this.settings);
        this.logger?.updateSettings(this.settings.debug);
        this.setupLogAutoSave();
        
        // ✅ NOUVEAU : Log des changements de configuration des plugins
        this.logger?.config('Paramètres sauvegardés', {
            pluginSupportEnabled: this.settings.pluginSupport?.enabled,
            debugMode: this.settings.pluginSupport?.debugMode
        });
    }

    // ===================================================================
    // API PUBLIQUE
    // ===================================================================

    getServices(): ServiceContainer {
        return this.services;
    }

    getSettings(): BoardSettings {
        return this.settings;
    }

    async updateSettings(updates: Partial<BoardSettings>): Promise<void> {
        this.settings = { ...this.settings, ...updates };
        await this.saveSettings();
    }

    getLogger(): LoggerService {
        return this.logger;
    }

    // ✅ NOUVELLES MÉTHODES D'API POUR LES PLUGINS

    /**
     * ✅ NOUVEAU : Obtient les statistiques du support des plugins
     */
    getPluginSupportStats(): any {
        return this.services?.getStats()?.pluginIntegration || {};
    }

    /**
     * ✅ NOUVEAU : Vérifie si un plugin spécifique est supporté
     */
    isPluginSupported(pluginId: string): boolean {
        const supportedPlugins = this.settings.pluginSupport?.supportedPlugins || [];
        return supportedPlugins.includes(pluginId) || supportedPlugins.includes('*');
    }

    /**
     * ✅ NOUVEAU : Active/désactive le support d'un plugin spécifique
     */
    async togglePluginSupport(pluginId: string, enabled: boolean): Promise<void> {
        if (!this.settings.pluginSupport) {
            this.settings.pluginSupport = { ...DEFAULT_SETTINGS.pluginSupport };
        }

        const supportedPlugins = [...(this.settings.pluginSupport.supportedPlugins || [])];
        
        if (enabled && !supportedPlugins.includes(pluginId)) {
            supportedPlugins.push(pluginId);
        } else if (!enabled) {
            const index = supportedPlugins.indexOf(pluginId);
            if (index > -1) {
                supportedPlugins.splice(index, 1);
            }
        }

        this.settings.pluginSupport.supportedPlugins = supportedPlugins;
        await this.saveSettings();

        this.logger.config(`Support du plugin ${pluginId} ${enabled ? 'activé' : 'désactivé'}`);
    }
}