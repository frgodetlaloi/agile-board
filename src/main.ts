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
            this.logger.success('LayoutService et FileService initialisés', {
                 layoutsCount: this.layoutService.getAllModelNames().length
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
     * Crée une nouvelle note avec un layout spécifique
     */
    private async createNoteWithLayout(layoutName: string): Promise<void> {
        this.logger.fileOperation('Création de note avec layout', { layoutName });
        
        try {
            // Implémentation à adapter selon votre structure existante
            //const note = await this.fileService.createNoteWithLayout(layoutName);
            //this.logger.success('Note créée avec succès', { layoutName, notePath: note.path });
            
            // Pour l'instant, log temporaire
            this.logger.info(`Création de note ${layoutName} - À implémenter`);
            
        } catch (error) {
            this.logger.error('Erreur lors de la création de note', error, 'main.ts');
        }
    }

    /**
     * Bascule vers la vue board pour le fichier actuel
     */
    private switchToBoardView(): void {
        this.logger.navigation('Basculement vers vue board demandé');
        
        // Implémentation à adapter selon votre structure
        //this.viewSwitcher.switchToBoardView();
        
        this.logger.info('Basculement vers vue board - À implémenter');
    }

    /**
     * Affiche la liste des layouts disponibles
     */
    private listAvailableLayouts(): void {
        this.logger.navigation('Liste des layouts demandée');
        const layouts = this.layoutService.getAllModelsInfo();
        this.logger.info('Layouts disponibles', { layouts });
        
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
            return;
        }

        // Tenter de récupérer le layout depuis le frontmatter
        const fileCache = this.app.metadataCache.getFileCache(activeFile);
        let layoutName = fileCache?.frontmatter?.['agile-board'];
        
        // Fallback vers le layout par défaut si aucun spécifié
        if (!layoutName) {
            layoutName = this.settings.defaultLayouts[0];
            this.logger.info('Aucun layout spécifié, utilisation du layout par défaut', {
                fileName: activeFile.name,
                defaultLayout: layoutName
            });
        }

        // Récupérer le layout depuis le LayoutService
        const targetLayout = this.layoutService.getModel(layoutName);
        
        if (!targetLayout) {
            this.logger.error(`Layout "${layoutName}" non trouvé`, {
                fileName: activeFile.name,
                layoutName
            });
            return;
        }

        // Créer les sections manquantes
        await this.fileService.createMissingSections(activeFile, targetLayout);
        
        this.logger.success('Sections manquantes créées', { 
            fileName: activeFile.name,
            layoutUsed: layoutName
        });
        
    } catch (error) {
        this.logger.error('Erreur lors de la création des sections', error);
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