/**
 * =============================================================================
 * PLUGIN AGILE BOARD POUR OBSIDIAN - FICHIER PRINCIPAL CORRIGÉ
 * =============================================================================
 * 
 * Ce fichier est le POINT D'ENTRÉE principal du plugin Obsidian.
 * 
 * CORRECTIONS APPLIQUÉES :
 * - Import TFile corrigé
 * - Suppression des méthodes dupliquées
 * - Ajout des notifications ViewSwitcher
 * - Commandes de debugging améliorées
 * - Gestion d'erreurs robuste
 */

// =============================================================================
// IMPORTS - Récupération des dépendances
// =============================================================================

// Import de la classe de base Plugin d'Obsidian
import { Plugin, TFile, Notice } from 'obsidian';

// Import du service de logging
import { LoggerService } from './services/LoggerService';
import { AgileBoardSettingsTab } from './components/SettingsTab';

// Import de notre type personnalisé pour les paramètres
import { BoardSettings, DEFAULT_SETTINGS } from './utils/settings';

// Import des services métier
import { LayoutService } from './services/LayoutService';
import { FileService } from './services/FileService';
import { NoteCreatorService } from './services/NoteCreatorService';
import { BoardViewService } from './services/BoardViewService';
import { SectionManagerService } from './services/SectionManagerService';

// Import de la vue personnalisée
import { BoardView, BOARD_VIEW_TYPE } from './views/BoardView';

// Import des managers
import { ViewSwitcher } from './managers/ViewSwitcher';
import { ModelDetector } from './managers/ModelDetector';

// =============================================================================
// CLASSE PRINCIPALE DU PLUGIN
// =============================================================================

/**
 * Plugin principal Agile Board v0.7.0
 * Version corrigée avec système de debug configurable et modulaire
 */
export default class AgileBoardPlugin extends Plugin {
    /** Configuration globale du plugin */
    settings: BoardSettings;
    
    /** Service de logging centralisé */
    logger: LoggerService;

    // Services existants 
    layoutService: LayoutService;
    fileService: FileService;
    viewSwitcher: ViewSwitcher;
    modelDetector: ModelDetector;

    // Services spécialisés
    noteCreator: NoteCreatorService;
    boardViewService: BoardViewService;
    sectionManager: SectionManagerService;

    /**
     * Initialisation du plugin - appelée au chargement d'Obsidian
     */
    async onload() {
        // ====================================================================
        // PHASE 1 : CHARGEMENT DE LA CONFIGURATION
        // ====================================================================
        await this.loadSettings();
        
        // ====================================================================
        // PHASE 2 : INITIALISATION DU LOGGER
        // ====================================================================
        this.logger = new LoggerService(this, this.settings.debug);
        
        // ====================================================================
        // PHASE 3 : LOG DE DÉMARRAGE
        // ====================================================================
        this.logger.startup('Plugin Agile-Board v0.7.0 en cours d\'initialisation', {
            debugEnabled: this.settings.debug.enabled,
            logLevel: this.settings.debug.logLevel,
            autoCreateSections: this.settings.autoCreateSections
        });
        
        // ====================================================================
        // PHASE 4 : INITIALISATION DES SERVICES
        // ====================================================================
        await this.initializeServices();
        
        // ====================================================================
        // PHASE 5 : ENREGISTREMENT DES VUES ET COMMANDES
        // ====================================================================
        this.registerViews();
        this.registerCommands();
        
        // ====================================================================
        // PHASE 6 : INTERFACE DE CONFIGURATION
        // ====================================================================
        this.addSettingTab(new AgileBoardSettingsTab(this.app, this));
        this.logger.config('Onglet de configuration enregistré');
        
        // ====================================================================
        // PHASE 7 : CONFIGURATION AUTOMATIQUE
        // ====================================================================
        this.setupPeriodicLogSaving();
        this.setupEventListeners();
        
        // ====================================================================
        // PHASE 8 : FINALISATION
        // ====================================================================
        this.logger.success('Plugin Agile-Board initialisé avec succès', {
            version: '0.7.0',
            loadTime: performance.now(),
            services: this.getLoadedServices()
        });
    }

    /**
     * Arrêt du plugin - appelée à la fermeture d'Obsidian
     */
    async onunload() {
        this.logger.info('Arrêt du plugin Agile-Board en cours');
        
        // Nettoyer les services
        if (this.modelDetector) {
            this.modelDetector.onUnload(); 
        }
        if (this.viewSwitcher) {
            this.viewSwitcher.stop(); 
        }
        
        // Sauvegarder les logs avant fermeture si activé
        if (this.settings.debug.logToFile) {
            this.logger.info('Sauvegarde finale des logs avant arrêt');
            await this.logger.saveLogsToFile();
        }
        
        // Nettoyer les ressources
        this.cleanupResources();
        
        this.logger.success('Plugin Agile-Board arrêté proprement');
    }

    // ====================================================================
    // GESTION DE LA CONFIGURATION
    // ====================================================================

    /**
     * Charge la configuration depuis le stockage d'Obsidian
     */
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.settings = this.validateSettings(this.settings);
    }

    /**
     * Sauvegarde la configuration dans le stockage d'Obsidian
     */
    async saveSettings() {
        await this.saveData(this.settings);
        
        if (this.logger) {
            this.logger.updateSettings(this.settings.debug);
            this.logger.config('Configuration sauvegardée et logger mis à jour');
        }
    }

    /**
     * Valide et corrige la configuration si nécessaire
     */
    private validateSettings(settings: BoardSettings): BoardSettings {
        if (!settings.debug) {
            settings.debug = DEFAULT_SETTINGS.debug;
        }
        
        if (!Array.isArray(settings.defaultLayouts) || settings.defaultLayouts.length === 0) {
            settings.defaultLayouts = DEFAULT_SETTINGS.defaultLayouts;
        }
        
        return settings;
    }

    // ====================================================================
    // INITIALISATION DES SERVICES
    // ====================================================================

    /**
     * Initialise tous les services du plugin
     */
    private async initializeServices(): Promise<void> {
        this.logger.debug('Initialisation des services en cours');
        
        try {
            // Initialiser les services de base
            this.layoutService = new LayoutService(this);
            this.fileService = new FileService(this.app);
            this.layoutService.load();
            
            // Initialiser les services spécialisés
            this.noteCreator = new NoteCreatorService(
                this.app,
                this.layoutService,
                this.logger
            );
            
            this.boardViewService = new BoardViewService(
                this.app,
                this.layoutService,
                this.logger
            );
            
            this.sectionManager = new SectionManagerService(
                this.app,
                this.layoutService,
                this.logger
            );
            
            // Initialiser les managers
            this.viewSwitcher = new ViewSwitcher(this);
            this.modelDetector = new ModelDetector(this);

            // Démarrer les managers
            this.modelDetector.onLoad();
            this.viewSwitcher.addSwitchButton();

            this.logger.success('Tous les services initialisés', {
                layoutsCount: this.layoutService.getAllModelNames().length,
                services: this.getLoadedServices()
            });
            
        } catch (error) {
            this.logger.error('Erreur lors de l\'initialisation des services', error);
            throw error;
        }
    }

    /**
     * Enregistre les vues personnalisées
     */
    private registerViews(): void {
        this.logger.debug('Enregistrement des vues personnalisées');
        
        try {
            this.registerView(BOARD_VIEW_TYPE, (leaf) => new BoardView(leaf, this));
            this.logger.success('Vue BoardView enregistrée');
            
        } catch (error) {
            this.logger.error('Erreur lors de l\'enregistrement des vues', error);
        }
    }

    /**
     * Enregistre toutes les commandes du plugin
     */
    private registerCommands(): void {
        this.logger.debug('Enregistrement des commandes');
        
        // ====================================================================
        // COMMANDES DE CRÉATION DE NOTES
        // ====================================================================
        this.addCommand({
            id: 'create-eisenhower-note',
            name: 'Créer une note Matrice d\'Eisenhower',
            callback: () => this.createNoteWithLayout('layout_eisenhower')
        });

        this.addCommand({
            id: 'create-kanban-note',
            name: 'Créer une note Kanban',
            callback: () => this.createNoteWithLayout('layout_kanban')
        });

        this.addCommand({
            id: 'create-gtd-note',
            name: 'Créer une note GTD',
            callback: () => this.createNoteWithLayout('layout_gtd')
        });

        this.addCommand({
            id: 'create-weekly-note',
            name: 'Créer un planificateur hebdomadaire',
            callback: () => this.createNoteWithLayout('layout_weekly')
        });

        this.addCommand({
            id: 'create-daily-note',
            name: 'Créer un planificateur quotidien',
            callback: () => this.createNoteWithLayout('layout_daily')
        });

        this.addCommand({
            id: 'create-project-note',
            name: 'Créer un tableau de projet',
            callback: () => this.createNoteWithLayout('layout_project')
        });

        // ====================================================================
        // COMMANDES UTILITAIRES
        // ====================================================================
        this.addCommand({
            id: 'switch-to-board-view',
            name: 'Basculer vers la vue board',
            callback: () => this.switchToBoardView()
        });

        this.addCommand({
            id: 'switch-to-markdown-view',
            name: 'Basculer vers la vue markdown',
            callback: () => this.switchToMarkdownView()
        });

        this.addCommand({
            id: 'list-layouts',
            name: 'Afficher les layouts disponibles',
            callback: () => this.listAvailableLayouts()
        });

        this.addCommand({
            id: 'create-missing-sections',
            name: 'Créer les sections manquantes',
            callback: () => this.createMissingSections()
        });

        // ====================================================================
        // COMMANDES DE DEBUG ET DIAGNOSTIC
        // ====================================================================
        this.addCommand({
            id: 'debug-button-state',
            name: '🔍 Diagnostic État des Boutons',
            callback: () => this.debugButtonState()
        });

        this.addCommand({
            id: 'force-update-buttons',
            name: '🔄 Forcer mise à jour des boutons',
            callback: () => this.forceUpdateButtons()
        });

        this.addCommand({
            id: 'toggle-debug',
            name: 'Activer/Désactiver le debug',
            callback: () => this.toggleDebug()
        });

        this.addCommand({
            id: 'test-debug-system',
            name: 'Tester le système de debug',
            callback: () => this.testDebugSystem()
        });

        this.addCommand({
            id: 'save-logs-now',
            name: 'Sauvegarder les logs maintenant',
            callback: () => this.saveLogsNow()
        });

        this.logger.success('Toutes les commandes ont été enregistrées');
    }

    // ====================================================================
    // IMPLÉMENTATION DES COMMANDES PRINCIPALES
    // ====================================================================

    /**
     * Crée une note avec un layout spécifique
     */
    private async createNoteWithLayout(layoutName: string): Promise<void> {
        this.logger.fileOperation('Création de note demandée', { layoutName });
        
        try {
            if (!this.noteCreator) {
                throw new Error('NoteCreatorService non initialisé');
            }
            
            const result = await this.noteCreator.createNoteWithLayout({
                layoutName,
                autoOpen: true
            });
            
            this.logger.success('Note créée via NoteCreatorService', {
                fileName: result.file.name,
                filePath: result.file.path,
                sectionsCount: result.sectionsCount,
                layoutUsed: result.layoutName
            });
            
        } catch (error) {
            this.logger.error('Erreur lors de la création de note', {
                message: error.message,
                layoutName
            }, 'main.ts');
            console.error('Détail erreur createNoteWithLayout:', error);
        }
    }

    /**
     * Bascule vers la vue board pour le fichier actuel
     * VERSION CORRIGÉE : Avec notification ViewSwitcher
     */
    private async switchToBoardView(): Promise<void> {
        this.logger.navigation('Basculement vers vue board demandé');
        
        try {
            if (!this.boardViewService) {
                throw new Error('BoardViewService non initialisé');
            }
            
            const result = await this.boardViewService.switchToBoardView({
                forceSwitch: false,
                newTab: false
            });
            
            if (result.success) {
                this.logger.success('Basculement réussi via BoardViewService', {
                    fileName: result.file.name,
                    layoutName: result.layoutName,
                    message: result.message
                });
                
                // 🚨 CORRECTION : Force la mise à jour des boutons
                this.forceViewSwitcherUpdate(result.file);
                
            } else {
                this.logger.warn('Basculement échoué', {
                    fileName: result.file.name,
                    message: result.message
                });
            }
            
        } catch (error) {
            this.logger.error('Erreur lors du basculement vers vue board', error, 'main.ts');
        }
    }

    /**
     * Bascule vers la vue markdown
     * VERSION CORRIGÉE : Avec notification ViewSwitcher
     */
    private async switchToMarkdownView(): Promise<void> {
        this.logger.navigation('Basculement vers vue markdown demandé');
        
        try {
            if (!this.boardViewService) {
                throw new Error('BoardViewService non initialisé');
            }
            
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
                new Notice('❌ Aucun fichier actif');
                return;
            }
            
            const success = await this.boardViewService.switchToMarkdownView(activeFile);
            
            if (success) {
                this.logger.success('Basculement vers markdown réussi', {
                    fileName: activeFile.name
                });
                
                // 🚨 CORRECTION : Force la mise à jour des boutons
                this.forceViewSwitcherUpdate(activeFile);
                
            } else {
                this.logger.warn('Basculement vers markdown échoué');
            }
            
        } catch (error) {
            this.logger.error('Erreur basculement vers markdown', error);
        }
    }

    /**
     * 🚨 NOUVELLE MÉTHODE : Force la mise à jour du ViewSwitcher
     */
    private forceViewSwitcherUpdate(file: TFile): void {
        if (this.viewSwitcher) {
            // Délai pour être sûr que la vue est complètement chargée
            setTimeout(() => {
                console.log('🔄 Force update ViewSwitcher après basculement');
                this.viewSwitcher.updateSwitchButtonForFile(file);
            }, 300);
            
            // Double vérification après un délai plus long
            setTimeout(() => {
                console.log('🔄 Double vérification ViewSwitcher');
                this.viewSwitcher.updateSwitchButtonForFile(file);
            }, 800);
        }
    }

    /**
     * Affiche la liste détaillée des layouts disponibles
     */
    private listAvailableLayouts(): void {
        this.logger.navigation('Liste des layouts demandée');
        
        try {
            if (!this.layoutService) {
                throw new Error('LayoutService non initialisé');
            }

            const allLayouts = this.layoutService.getAllModelsInfo();
            
            if (allLayouts.length === 0) {
                const message = 'Aucun layout disponible';
                this.logger.warn(message);
                new Notice(`⚠️ ${message}`, 3000);
                return;
            }

            // Grouper par catégorie
            const layoutsByCategory = this.groupLayoutsByCategory(allLayouts);
            
            // Afficher dans les logs
            this.logDetailedLayoutInfo(allLayouts, layoutsByCategory);
            
            // Afficher à l'utilisateur
            this.showLayoutSummaryToUser(allLayouts, layoutsByCategory);
            
        } catch (error) {
            this.logger.error('Erreur lors de l\'affichage des layouts', error);
            new Notice(`❌ Erreur: ${error.message}`, 4000);
        }
    }

    /**
     * Crée les sections manquantes pour le fichier actuel
     */
    private async createMissingSections(): Promise<void> {
        this.logger.fileOperation('Création des sections manquantes demandée');
        
        try {
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
                this.logger.warn('Aucun fichier actif pour créer les sections');
                new Notice('❌ Aucun fichier actif');
                return;
            }

            if (!this.sectionManager) {
                throw new Error('SectionManagerService non initialisé');
            }

            const result = await this.sectionManager.createMissingSections(activeFile, {
                insertPosition: 'layout-order',
                addDefaultContent: true,
                autoSave: true
            });

            if (result.success) {
                this.logger.success('Sections créées via SectionManagerService', {
                    fileName: activeFile.name,
                    sectionsAdded: result.sectionsAdded,
                    addedSections: result.addedSectionNames
                });
            } else {
                this.logger.warn('Création de sections échouée', {
                    fileName: activeFile.name,
                    messages: result.messages
                });
            }

        } catch (error) {
            this.logger.error('Erreur lors de la création des sections', error);
            new Notice(`❌ Erreur: ${error.message}`, 4000);
        }
    }

    // ====================================================================
    // COMMANDES DE DEBUG ET DIAGNOSTIC
    // ====================================================================

    /**
     * 🚨 NOUVELLE COMMANDE : Diagnostic complet des boutons
     */
    private debugButtonState(): void {
        const activeFile = this.app.workspace.getActiveFile();
        const activeLeaf = this.app.workspace.activeLeaf;
        
        if (activeFile && activeLeaf) {
            const diagnostics = {
                fileName: activeFile.name,
                currentViewType: activeLeaf.view.getViewType(),
                hasAgileBoardLayout: !!this.app.metadataCache.getFileCache(activeFile)?.frontmatter?.['agile-board'],
                viewSwitcherState: this.viewSwitcher?.getDiagnostics(),
                buttonsCount: document.querySelectorAll('.agile-board-switch-button').length,
                services: {
                    viewSwitcher: !!this.viewSwitcher,
                    boardViewService: !!this.boardViewService,
                    modelDetector: !!this.modelDetector
                }
            };
            
            console.group('🔍 DIAGNOSTIC BOUTONS AGILE BOARD');
            console.table(diagnostics);
            console.log('📊 Diagnostics ViewSwitcher:', diagnostics.viewSwitcherState);
            console.groupEnd();
            
            this.logger.debug('Debug état boutons', diagnostics);
            
            // Forcer toutes les mises à jour possibles
            if (this.viewSwitcher) {
                console.log('🔄 Force update ViewSwitcher...');
                this.viewSwitcher.forceUpdate();
            }
            
            if (this.modelDetector) {
                console.log('🔄 Force update ModelDetector...');
                this.modelDetector.forceUpdate();
            }
            
            new Notice(`🔍 Diagnostic terminé - Boutons: ${diagnostics.buttonsCount} | Type: ${diagnostics.currentViewType}`, 4000);
        }
    }

    /**
     * Force la mise à jour des boutons
     */
    private forceUpdateButtons(): void {
        try {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile && this.viewSwitcher) {
                this.logger.debug('Mise à jour forcée des boutons', { fileName: activeFile.name });
                
                // Reset du cache ViewSwitcher
                this.viewSwitcher.forceUpdate();
                
                // Double vérification
                setTimeout(() => {
                    this.viewSwitcher.updateSwitchButtonForFile(activeFile);
                }, 200);
                
                new Notice('🔄 Boutons mis à jour', 2000);
            } else {
                new Notice('❌ Aucun fichier actif ou ViewSwitcher indisponible', 3000);
            }
        } catch (error) {
            this.logger.error('Erreur mise à jour boutons', error);
            new Notice(`❌ Erreur: ${error.message}`, 3000);
        }
    }

    /**
     * Active/désactive le debug via commande
     */
    private async toggleDebug(): Promise<void> {
        const wasEnabled = this.settings.debug.enabled;
        this.settings.debug.enabled = !wasEnabled;
        await this.saveSettings();
        
        const status = this.settings.debug.enabled ? 'activé' : 'désactivé';
        const icon = this.settings.debug.enabled ? '✅' : '❌';
        
        this.logger.config(`Debug ${status} via commande`);
        new Notice(`${icon} Debug ${status}`, 3000);
    }

    /**
     * Lance un test complet du système de debug
     */
    private testDebugSystem(): void {
        this.logger.info('Test du système de debug lancé via commande');
        this.logger.testSystem();
        new Notice('🧪 Test de debug exécuté - vérifiez la console (F12)', 4000);
    }

    /**
     * Force la sauvegarde immédiate des logs
     */
    private async saveLogsNow(): Promise<void> {
        if (!this.settings.debug.logToFile) {
            new Notice('⚠️ Sauvegarde fichier désactivée', 3000);
            return;
        }

        this.logger.info('Sauvegarde manuelle des logs demandée');
        await this.logger.saveLogsToFile();
        new Notice('💾 Logs sauvegardés avec succès', 2000);
    }

    // ====================================================================
    // MÉTHODES UTILITAIRES POUR LAYOUTS
    // ====================================================================

    /**
     * Groupe les layouts par catégorie
     */
    private groupLayoutsByCategory(layouts: any[]): Record<string, any[]> {
        const grouped: Record<string, any[]> = {};
        
        for (const layout of layouts) {
            const category = layout.category || 'custom';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(layout);
        }
        
        return grouped;
    }

    /**
     * Affiche les informations détaillées dans les logs
     */
    private logDetailedLayoutInfo(allLayouts: any[], layoutsByCategory: Record<string, any[]>): void {
        this.logger.info('Layouts disponibles - Résumé', {
            totalLayouts: allLayouts.length,
            categories: Object.keys(layoutsByCategory),
            layoutNames: allLayouts.map(l => l.name)
        });
        
        for (const [category, layouts] of Object.entries(layoutsByCategory)) {
            this.logger.info(`Layouts - Catégorie: ${category}`, {
                category,
                count: layouts.length,
                layouts: layouts.map(layout => ({
                    name: layout.name,
                    displayName: layout.displayName,
                    description: layout.description,
                    sectionsCount: layout.sections.length,
                    sections: layout.sections
                }))
            });
        }
    }

    /**
     * Affiche un résumé à l'utilisateur
     */
    private showLayoutSummaryToUser(allLayouts: any[], layoutsByCategory: Record<string, any[]>): void {
        const categoryTexts = Object.entries(layoutsByCategory).map(([category, layouts]) => {
            const categoryName = this.getCategoryDisplayName(category);
            const layoutNames = layouts.map(l => l.displayName).join(', ');
            return `📂 **${categoryName}** (${layouts.length}) : ${layoutNames}`;
        });
        
        const summaryText = [
            `📋 **${allLayouts.length} layouts disponibles**`,
            '',
            ...categoryTexts,
            '',
            '🔍 Voir console (F12) pour détails complets'
        ].join('\n');
        
        new Notice(summaryText, 8000);
        
        console.group('🎯 LAYOUTS AGILE BOARD DISPONIBLES');
        console.log(`Total: ${allLayouts.length} layouts`);
        
        for (const [category, layouts] of Object.entries(layoutsByCategory)) {
            console.group(`📂 ${this.getCategoryDisplayName(category)} (${layouts.length})`);
            
            for (const layout of layouts) {
                console.log(`📋 ${layout.displayName} (${layout.name})`);
                console.log(`   Description: ${layout.description}`);
                console.log(`   Sections (${layout.sections.length}): ${layout.sections.join(', ')}`);
                console.log('');
            }
            
            console.groupEnd();
        }
        
        console.groupEnd();
    }

    /**
     * Nom d'affichage convivial pour les catégories
     */
    private getCategoryDisplayName(category: string): string {
        const categoryNames: Record<string, string> = {
            'productivity': '🎯 Productivité',
            'planning': '📅 Planification',
            'project': '🚀 Projets',
            'personal': '👤 Personnel',
            'custom': '🔧 Personnalisé'
        };
        
        return categoryNames[category] || `📁 ${category}`;
    }

    // ====================================================================
    // CONFIGURATION AUTOMATIQUE
    // ====================================================================

    /**
     * Configure la sauvegarde périodique des logs
     */
    private setupPeriodicLogSaving(): void {
        if (!this.settings.debug.logToFile) {
            return;
        }

        this.registerInterval(
            window.setInterval(async () => {
                if (this.settings.debug.logToFile) {
                    this.logger.verbose('Sauvegarde périodique des logs', { 
                        timestamp: new Date().toISOString() 
                    });
                    await this.logger.saveLogsToFile();
                }
            }, 5 * 60 * 1000)
        );

        this.logger.config('Sauvegarde périodique des logs configurée (5 min)');
    }

    /**
     * Configure les écouteurs d'événements
     */
    private setupEventListeners(): void {
        this.registerEvent(
            this.app.workspace.on('file-open', (file) => {
                if (file) {
                    this.logger.navigation('Fichier ouvert', { 
                        fileName: file.name,
                        path: file.path 
                    });
                }
            })
        );

        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.logger.navigation('Layout workspace modifié');
            })
        );

        this.logger.config('Écouteurs d\'événements configurés');
    }

    // ====================================================================
    // MÉTHODES UTILITAIRES
    // ====================================================================

    /**
     * Nettoie les ressources avant arrêt du plugin
     */
    private cleanupResources(): void {
        this.logger.debug('Nettoyage des ressources en cours');
        this.logger.clearBuffer();
        this.logger.debug('Ressources nettoyées');
    }

    /**
     * Retourne la liste des services chargés pour les logs
     */
    private getLoadedServices(): string[] {
        const services = ['LoggerService'];
        
        if (this.layoutService) services.push('LayoutService');
        if (this.fileService) services.push('FileService');
        if (this.viewSwitcher) services.push('ViewSwitcher');
        if (this.modelDetector) services.push('ModelDetector');
        if (this.noteCreator) services.push('NoteCreatorService');
        if (this.boardViewService) services.push('BoardViewService');
        if (this.sectionManager) services.push('SectionManagerService');
        
        return services;
    }

    // ====================================================================
    // API PUBLIQUE POUR LES AUTRES COMPOSANTS
    // ====================================================================

    /**
     * Retourne le service de logging
     */
    getLogger(): LoggerService {
        return this.logger;
    }

    /**
     * Retourne la configuration actuelle
     */
    getSettings(): BoardSettings {
        return this.settings;
    }

    /**
     * Met à jour une partie de la configuration
     */
    async updateSettings(updates: Partial<BoardSettings>): Promise<void> {
        this.settings = { ...this.settings, ...updates };
        await this.saveSettings();
        this.logger.config('Configuration mise à jour via API', updates);
    }

    /**
     * Crée une note avec des options avancées
     */
    async createAdvancedNote(layoutName: string, options?: {
        fileName?: string;
        folder?: string;
        customContent?: Record<string, string>;
    }): Promise<void> {
        if (!this.noteCreator) {
            new Notice('❌ Service de création non disponible');
            return;
        }
        
        try {
            await this.noteCreator.createNoteWithLayout({
                layoutName,
                customFileName: options?.fileName,
                folder: options?.folder,
                customContent: options?.customContent,
                autoOpen: true
            });
        } catch (error) {
            this.logger.error('Erreur création note avancée', error);
        }
    }

    /**
     * Méthode pour obtenir les layouts disponibles (pour l'interface)
     */
    getAvailableLayoutsForUI(): Array<{name: string, displayName: string, description: string}> {
        return this.noteCreator?.getAvailableLayouts() || [];
    }

    /**
     * Gestionnaire d'erreur global pour le plugin
     */
    handleError(error: Error, context: string): void {
        this.logger.error(`Erreur dans ${context}`, {
            message: error.message,
            stack: error.stack,
            context
        });

        new Notice(`❌ Erreur Agile Board: ${error.message}`, 5000);
    }

    /**
     * Hook appelé après l'initialisation complète
     */
    onInitializationComplete(): void {
        this.logger.success('Hook d\'initialisation complète appelé');
    }

    /**
     * Hook appelé lors du changement de configuration debug
     */
    onDebugSettingsChanged(): void {
        this.logger.config('Configuration debug modifiée - notification aux services');
    }
}