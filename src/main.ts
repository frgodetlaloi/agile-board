import { Plugin, TFile, Notice } from 'obsidian';
import { LoggerService } from './services/LoggerService';
import { ServiceContainer } from './services/ServiceContainer';
import { BoardSettings, DEFAULT_SETTINGS } from './utils/settings';
import { BoardView, BOARD_VIEW_TYPE } from './views/BoardView';
import { ViewSwitcher } from './managers/ViewSwitcher';
import { ModelDetector } from './managers/ModelDetector';
import { AgileBoardSettingsTab } from './components/SettingsTab';

/**
 * Plugin principal Agile Board v0.8.0 - Avec ServiceContainer
 */
export default class AgileBoardPlugin extends Plugin {
    settings!: BoardSettings;
    logger!: LoggerService;
    services!: ServiceContainer;
    
    // Managers
    private viewSwitcher!: ViewSwitcher;
    private modelDetector!: ModelDetector;

    async onload(): Promise<void> {
        this.logger.info('🚀 Chargement Agile Board Plugin v0.8.1');
        
        try {
            await this.initializeCore();
            await this.initializeServices();
            await this.initializeUI();
            
            this.logger.info('✅ Agile Board Plugin chargé avec succès');
            
        } catch (error) {
            this.logger.error('❌ Erreur chargement plugin:', error);
            new Notice('❌ Erreur lors du chargement du plugin Agile Board');
        }
    }

    async onunload(): Promise<void> {
        this.logger?.info('Arrêt du plugin Agile Board');
        
        // Nettoyer les managers
        this.modelDetector?.onUnload();
        this.viewSwitcher?.stop();
        
        // Nettoyer les services
        this.services?.dispose();
        
        this.logger.info('🛑 Agile Board Plugin arrêté');
    }

    /**
     * Initialise les composants de base
     */
    private async initializeCore(): Promise<void> {
        await this.loadSettings();
        
        // Créer logger au niveau plugin d'abord
        this.logger = new LoggerService(this, this.settings.debug);
        
        // Puis créer le container
        this.services = new ServiceContainer(this.app, this, this.settings);
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
    }

    /**
     * Initialise l'interface utilisateur
     */
    private async initializeUI(): Promise<void> {
        // Enregistrer la vue avec le plugin (pas ServiceContainer)
        this.registerView(BOARD_VIEW_TYPE, (leaf) => 
            new BoardView(leaf, this)
        );
        
        // Enregistrer les commandes
        this.registerCommands();
        
        // Ajouter l'onglet de configuration
        this.addSettingTab(new AgileBoardSettingsTab(this.app, this));
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
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        this.services?.updateSettings(this.settings);
        this.logger?.updateSettings(this.settings.debug);
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
}