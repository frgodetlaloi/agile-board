/**
 * =============================================================================
 * PLUGIN AGILE BOARD POUR OBSIDIAN - FICHIER PRINCIPAL
 * =============================================================================
 * 
 * Ce fichier est le POINT D'ENTRÉE principal du plugin Obsidian.
 * 
 * CONCEPTS OBSIDIAN IMPORTANTS :
 * - Un plugin Obsidian est une extension qui ajoute des fonctionnalités à l'app
 * - Chaque plugin doit hériter de la classe "Plugin" fournie par Obsidian
 * - Le cycle de vie d'un plugin : onload() → plugin actif → onunload()
 * - Obsidian fournit une API pour interagir avec l'app (fichiers, vues, UI, etc.)
 * 
 * ARCHITECTURE DE CE PLUGIN :
 * - Services : Logique métier (LayoutService, FileService)
 * - Views : Interfaces utilisateur personnalisées (BoardView)
 * - Managers : Gestionnaires de fonctionnalités (ViewSwitcher, ModelDetector)
 * - Utils : Fonctions utilitaires (settings)
 * - Types : Définitions TypeScript pour la cohérence du code
 * 
 * @author Votre nom
 * @version 1.0.0
 */

// =============================================================================
// IMPORTS - Récupération des dépendances
// =============================================================================

// Import de la classe de base Plugin d'Obsidian
// Cette classe fournit toutes les méthodes nécessaires pour créer un plugin
import { Plugin } from 'obsidian';
import { Notice } from 'obsidian'; 

// revoir le commentaire
import { LoggerService } from './services/LoggerService';
import { AgileBoardSettingsTab } from './components/SettingsTab';

// Import de notre type personnalisé pour les paramètres
// BoardSettings définit la structure des options de configuration du plugin
import { BoardSettings, DEFAULT_SETTINGS } from './utils/settings';

// Import des services métier
// Ces classes contiennent la logique principale du plugin
import { LayoutService } from './services/LayoutService';  // Gère les layouts de board
import { FileService } from './services/FileService';      // Gère les opérations sur les fichiers
import { NoteCreatorService } from './services/NoteCreatorService';
import { BoardViewService } from './services/BoardViewService';
import { SectionManagerService } from './services/SectionManagerService';

// Import de la vue personnalisée
// BoardView est notre interface utilisateur principale pour afficher les boards
import { BoardView, BOARD_VIEW_TYPE } from './views/BoardView';

// Import des managers
// Ces classes gèrent des fonctionnalités spécifiques du plugin
import { ViewSwitcher } from './managers/ViewSwitcher';    // Bascule entre vues
import { ModelDetector } from './managers/ModelDetector';  // Détecte les modèles automatiquement

// =============================================================================
// CLASSE PRINCIPALE DU PLUGIN
// =============================================================================

/**
 * Plugin principal Agile Board v0.7.0
 * Nouveau : Système de debug configurable et modulaire
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

    // Service pour la création de notes
    /** Service pour la création de notes avec des layouts prédéfinis */
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
        // PHASE 2 : INITIALISATION DU LOGGER (NOUVEAU v0.7.0)
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
        //if (this.viewSwitcher) {
        //    this.viewSwitcher.onUnload(); 
        //}
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
        
        // Validation et correction de la configuration si nécessaire
        this.settings = this.validateSettings(this.settings);
    }

    /**
     * Sauvegarde la configuration dans le stockage d'Obsidian
     */
    async saveSettings() {
        await this.saveData(this.settings);
        
        // Mettre à jour le logger si il existe déjà
        if (this.logger) {
            this.logger.updateSettings(this.settings.debug);
            this.logger.config('Configuration sauvegardée et logger mis à jour');
        }
    }

    /**
     * Valide et corrige la configuration si nécessaire
     */
    private validateSettings(settings: BoardSettings): BoardSettings {
        // Assurer que les valeurs critiques sont définies
        if (!settings.debug) {
            settings.debug = DEFAULT_SETTINGS.debug;
        }
        
        // Validation des layouts par défaut
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
            // Initialiser les services existants
            this.layoutService = new LayoutService(this);
            this.fileService = new FileService(this.app);
            this.layoutService.load(); // Charger les modèles de layout
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
            this.viewSwitcher = new ViewSwitcher(this);
            this.modelDetector = new ModelDetector(this);

            this.modelDetector.onLoad();

            this.logger.success('Tous les services initialisés', {
                layoutsCount: this.layoutService.getAllModelNames().length,
                noteCreatorReady: !!this.noteCreator,
                boardViewServiceReady: !!this.boardViewService,
                sectionManagerReady: !!this.sectionManager,
                viewSwitcherReady: !!this.viewSwitcher, 
                modelDetectorReady: !!this.modelDetector 
            });
            this.logger.debug('Tous les services ont été initialisés avec succès');
            
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
            // Enregistrer la vue BoardView
            this.registerView('agile-board-view', (leaf) => new BoardView(leaf, this));
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
        // COMMANDES DE DEBUG (NOUVELLES v0.7.0)
        // ====================================================================
        this.addCommand({
            id: 'debug-button-state',
            name: '🔍 Debug État des Boutons',
            callback: () => {
                const activeFile = this.app.workspace.getActiveFile();
                const activeLeaf = this.app.workspace.activeLeaf;
                
                if (activeFile && activeLeaf) {
                    const debugInfo = {
                        fileName: activeFile.name,
                        currentViewType: activeLeaf.view.getViewType(),
                        hasAgileBoardLayout: !!this.app.metadataCache.getFileCache(activeFile)?.frontmatter?.['agile-board'],
                        services: {
                            viewSwitcher: !!this.viewSwitcher,
                            boardViewService: !!this.boardViewService,
                            modelDetector: !!this.modelDetector
                        }
                    };
                    
                    console.log('🔍 État actuel:', debugInfo);
                    this.logger.debug('Debug état boutons', debugInfo);
                    
                    // Forcer toutes les mises à jour possibles
                    if (this.viewSwitcher) {
                        console.log('🔄 Mise à jour ViewSwitcher...');
                        this.viewSwitcher.updateSwitchButtonForFile(activeFile);
                    }
                    
                    if (this.modelDetector) {
                        console.log('🔄 Force update ModelDetector...');
                        this.modelDetector.forceUpdate();
                    }
                    
                    new Notice(`🔍 Debug: ${debugInfo.currentViewType} | Check console F12`, 4000);
                }
            }
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
    // CONFIGURATION AUTOMATIQUE
    // ====================================================================

    /**
     * Configure la sauvegarde périodique des logs
     */
    private setupPeriodicLogSaving(): void {
        if (!this.settings.debug.logToFile) {
            return;
        }

        // Sauvegarder automatiquement toutes les 5 minutes
        this.registerInterval(
            window.setInterval(async () => {
                if (this.settings.debug.logToFile) {
                    this.logger.verbose('Sauvegarde périodique des logs', { 
                        timestamp: new Date().toISOString() 
                    });
                    await this.logger.saveLogsToFile();
                }
            }, 5 * 60 * 1000) // 5 minutes
        );

        this.logger.config('Sauvegarde périodique des logs configurée (5 min)');
    }

    /**
     * Configure les écouteurs d'événements
     */
    private setupEventListeners(): void {
        // Écouter les changements de fichier actif
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

        // Écouter les changements de layout actif
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.logger.navigation('Layout workspace modifié');
            })
        );

        this.logger.config('Écouteurs d\'événements configurés');
    }

    // ====================================================================
    // IMPLÉMENTATION DES COMMANDES
    // ====================================================================

    /**
    * Crée une note avec un layout spécifique
    */
    private async createNoteWithLayout(layoutName: string): Promise<void> {
        this.logger.fileOperation('Création de note demandée', { layoutName });
        
    try {
        // Vérification de la disponibilité du service
        if (!this.noteCreator) {
            throw new Error('NoteCreatorService non initialisé');
        }
        
        // Délégation au service spécialisé
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
        // 🎯 CORRECTION : Mieux capturer l'erreur
        this.logger.error('Erreur lors de la création de note', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            layoutName
        }, 'main.ts');
        
        // Ne pas re-lancer l'erreur car NoteCreatorService gère déjà la notification
        console.error('Détail erreur createNoteWithLayout:', error);
    }
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
     * Bascule vers la vue board pour le fichier actuel
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
                setTimeout(() => {
                    if (this.viewSwitcher && result.file) {
                        this.logger.debug('Mise à jour ViewSwitcher après basculement board');
                        this.viewSwitcher.updateSwitchButtonForFile(result.file);
                    }
                }, 500); // Délai pour laisser la vue se stabiliser
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
                
                // 🎯 NOTIFIER LE VIEWSWITCHER DU CHANGEMENT
                setTimeout(() => {
                    if (this.viewSwitcher) {
                        this.logger.debug('Mise à jour ViewSwitcher après basculement markdown');
                        this.viewSwitcher.updateSwitchButtonForFile(activeFile);
                    }
                }, 500);
                
            } else {
                this.logger.warn('Basculement vers markdown échoué');
            }
            
        } catch (error) {
            this.logger.error('Erreur basculement vers markdown', error);
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
                this.viewSwitcher.updateSwitchButtonForFile(activeFile);
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
     * =============================================================================
     * AMÉLIORATION DE listAvailableLayouts()
     * =============================================================================
     */

    /**
     * Affiche la liste détaillée des layouts disponibles
     * 
     * Version améliorée qui :
     * - Affiche les informations dans la console ET dans une notification
     * - Groupe les layouts par catégorie
     * - Montre des détails utiles pour l'utilisateur
     * - Propose des actions supplémentaires
     */
    private listAvailableLayouts(): void {
        this.logger.navigation('Liste des layouts demandée');
        
        try {
            if (!this.layoutService) {
                throw new Error('LayoutService non initialisé');
            }

            // Récupérer tous les layouts avec leurs métadonnées
            const allLayouts = this.layoutService.getAllModelsInfo();
            
            if (allLayouts.length === 0) {
                const message = 'Aucun layout disponible';
                this.logger.warn(message);
                new Notice(`⚠️ ${message}`, 3000);
                return;
            }

            // Grouper par catégorie
            const layoutsByCategory = this.groupLayoutsByCategory(allLayouts);
            
            // Afficher dans les logs (détaillé)
            this.logDetailedLayoutInfo(allLayouts, layoutsByCategory);
            
            // Afficher à l'utilisateur (résumé)
            this.showLayoutSummaryToUser(allLayouts, layoutsByCategory);
            
            // Optionnel : Créer une note avec la liste complète
            this.offerToCreateLayoutGuide(allLayouts);
            
        } catch (error) {
            this.logger.error('Erreur lors de l\'affichage des layouts', error);
            new Notice(`❌ Erreur: ${error.message}`, 4000);
        }
    }

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
        // Log général
        this.logger.info('Layouts disponibles - Résumé', {
            totalLayouts: allLayouts.length,
            categories: Object.keys(layoutsByCategory),
            layoutNames: allLayouts.map(l => l.name)
        });
        
        // Log détaillé par catégorie
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
        // Créer le message résumé
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
        
        // Afficher la notification
        new Notice(summaryText, 8000);
        
        // Log pour la console aussi
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

    /**
     * Propose de créer une note guide avec tous les layouts
     */
    private offerToCreateLayoutGuide(allLayouts: any[]): void {
        // Pour l'instant, juste log l'option
        this.logger.debug('Option guide layouts disponible', {
            layoutsCount: allLayouts.length,
            suggestion: 'Possibilité de créer une note guide avec tous les layouts'
        });
        
        // TODO: Implémenter la création d'une note guide
        // this.createLayoutGuideNote(allLayouts);
    }

    /**
     * Crée une note guide avec tous les layouts (fonction bonus)
     */
    private async createLayoutGuideNote(allLayouts: any[]): Promise<void> {
        try {
            if (!this.noteCreator) {
                return;
            }
            
            // Générer le contenu du guide
            const guideContent = this.generateLayoutGuideContent(allLayouts);
            
            // Créer le fichier guide
            const fileName = `Guide Layouts Agile Board ${new Date().toISOString().split('T')[0]}.md`;
            await this.app.vault.create(fileName, guideContent);
            
            this.logger.success('Guide des layouts créé', { fileName });
            new Notice(`📖 Guide créé: ${fileName}`, 4000);
            
        } catch (error) {
            this.logger.error('Erreur création guide layouts', error);
        }
    }

    /**
     * Génère le contenu du guide des layouts
     */
    private generateLayoutGuideContent(allLayouts: any[]): string {
        const today = new Date().toISOString().split('T')[0];
        
        const sections = [
            '---',
            'type: guide',
            `created: ${today}`,
            'tags: [agile-board, layouts, guide]',
            '---',
            '',
            '# 📋 Guide des Layouts Agile Board',
            '',
            `> Guide complet des ${allLayouts.length} layouts disponibles`,
            `> Généré automatiquement le ${today}`,
            '',
            '## 🎯 Résumé',
            '',
            `- **Total layouts** : ${allLayouts.length}`,
            `- **Plugin** : Agile Board v0.7.0`,
            `- **Utilisation** : Commandes de création de notes`,
            '',
            '## 📚 Layouts disponibles',
            ''
        ];
        
        // Grouper par catégorie pour le guide
        const layoutsByCategory = this.groupLayoutsByCategory(allLayouts);
        
        for (const [category, layouts] of Object.entries(layoutsByCategory)) {
            sections.push(`### ${this.getCategoryDisplayName(category)}`);
            sections.push('');
            
            for (const layout of layouts) {
                sections.push(`#### 📋 ${layout.displayName}`);
                sections.push('');
                sections.push(`- **Nom technique** : \`${layout.name}\``);
                sections.push(`- **Description** : ${layout.description}`);
                sections.push(`- **Sections** (${layout.sections.length}) : ${layout.sections.join(', ')}`);
                sections.push('');
                sections.push('**Utilisation :**');
                sections.push(`\`\`\`markdown`);
                sections.push(`---`);
                sections.push(`agile-board: ${layout.name}`);
                sections.push(`---`);
                sections.push(`\`\`\``);
                sections.push('');
            }
        }
        
        sections.push('---');
        sections.push('');
        sections.push('## 📖 Comment utiliser');
        sections.push('');
        sections.push('1. **Créer une note** : Utilisez les commandes "Créer une note [Type]"');
        sections.push('2. **Ajouter un layout** : Ajoutez `agile-board: layout_name` dans le frontmatter');
        sections.push('3. **Basculer en vue board** : Commande "Basculer vers la vue board"');
        sections.push('4. **Compléter les sections** : Commande "Créer les sections manquantes"');
        sections.push('');
        sections.push('> 💡 **Astuce** : Tous les layouts sont personnalisables selon vos besoins !');
        
        return sections.join('\n');
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

            // Déléguer au service spécialisé
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
    // COMMANDES DE DEBUG (NOUVELLES v0.7.0)
    // ====================================================================

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
        
        // Notification à l'utilisateur
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
    // MÉTHODES UTILITAIRES
    // ====================================================================

    /**
     * Nettoie les ressources avant arrêt du plugin
     */
    private cleanupResources(): void {
        this.logger.debug('Nettoyage des ressources en cours');
        
        // Nettoyer les services si nécessaire
        // if (this.viewSwitcher) {
        //     this.viewSwitcher.cleanup();
        // }
        
        // Vider le buffer de logs
        this.logger.clearBuffer();
        
        this.logger.debug('Ressources nettoyées');
    }

    /**
     * Retourne la liste des services chargés pour les logs
     */
    private getLoadedServices(): string[] {
        const services = ['LoggerService'];
        
        // Ajouter les autres services selon votre structure
        if (this.layoutService) services.push('LayoutService');
        if (this.fileService) services.push('FileService');
        if (this.viewSwitcher) services.push('ViewSwitcher');
        if (this.modelDetector) services.push('ModelDetector');
        if (this.noteCreator) services.push('NoteCreatorService');
        
        return services;
    }

    // ====================================================================
    // MÉTHODES D'ACCÈS POUR LES AUTRES COMPOSANTS
    // ====================================================================

    /**
     * Retourne le service de logging pour utilisation dans d'autres composants
     * @returns Instance du LoggerService
     */
    getLogger(): LoggerService {
        return this.logger;
    }

    /**
     * Retourne la configuration actuelle du plugin
     * @returns Configuration complète
     */
    getSettings(): BoardSettings {
        return this.settings;
    }

    /**
     * Met à jour une partie de la configuration
     * @param updates Mises à jour partielles
     */
    async updateSettings(updates: Partial<BoardSettings>): Promise<void> {
        this.settings = { ...this.settings, ...updates };
        await this.saveSettings();
        
        this.logger.config('Configuration mise à jour via API', updates);
    }

    // ====================================================================
    // GESTION DES ERREURS GLOBALES
    // ====================================================================

    /**
     * Gestionnaire d'erreur global pour le plugin
     * @param error Erreur capturée
     * @param context Contexte où l'erreur s'est produite
     */
    handleError(error: Error, context: string): void {
        this.logger.error(`Erreur dans ${context}`, {
            message: error.message,
            stack: error.stack,
            context
        });

        // Notification utilisateur pour les erreurs critiques
        new Notice(`❌ Erreur Agile Board: ${error.message}`, 5000);
    }

    // ====================================================================
    // HOOKS POUR INTÉGRATION AVEC LES SERVICES EXISTANTS
    // ====================================================================

    /**
     * Hook appelé après l'initialisation complète
     * Permet aux services existants de s'initialiser avec le logger
     */
    onInitializationComplete(): void {
        this.logger.success('Hook d\'initialisation complète appelé');
        
        // Notifier les autres services que le logger est disponible
        //if (this.layoutService) {
        //     this.layoutService.setLogger(this.logger);
        // }
        // if (this.fileService) {
        //     this.fileService.setLogger(this.logger);
        // }
    }

    /**
     * Hook appelé lors du changement de configuration debug
     * Permet aux services de réagir aux changements
     */
    onDebugSettingsChanged(): void {
        this.logger.config('Configuration debug modifiée - notification aux services');
        
        // Notifier les services du changement
        //if (this.viewSwitcher) {
        //     this.viewSwitcher.onDebugSettingsChanged(this.settings.debug);
        // }
    }
}