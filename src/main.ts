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

// Import de notre type personnalisé pour les paramètres
// BoardSettings définit la structure des options de configuration du plugin
import { BoardSettings } from './types';

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

// Import des utilitaires
// Fonctions helper et configuration par défaut
import { createDefaultSettings } from './utils/settings';

// =============================================================================
// CLASSE PRINCIPALE DU PLUGIN
// =============================================================================

/**
 * Classe principale du plugin Agile Board
 * 
 * HÉRITAGE OBSIDIAN :
 * Cette classe hérite de "Plugin", ce qui lui donne accès à :
 * - this.app : L'instance principale d'Obsidian
 * - this.loadData() / this.saveData() : Persistance des données
 * - this.addCommand() : Ajout de commandes
 * - this.registerView() : Enregistrement de vues personnalisées
 * - Et bien d'autres méthodes de l'API Obsidian
 * 
 * PRINCIPE D'ORGANISATION :
 * Cette classe agit comme un ORCHESTRATEUR :
 * - Elle ne contient pas de logique métier complexe
 * - Elle coordonne les différents services et managers
 * - Elle gère l'initialisation et la destruction propre du plugin
 */
export default class AgileBoardPlugin extends Plugin {
  
  // =============================================================================
  // PROPRIÉTÉS DE LA CLASSE
  // =============================================================================
  
  /**
   * Paramètres de configuration du plugin
   * Le "!" indique à TypeScript que cette propriété sera initialisée
   * avant d'être utilisée (dans la méthode onload)
   */
  settings!: BoardSettings;
  
  /**
   * Service de gestion des layouts
   * Responsable de charger et fournir les modèles de board prédéfinis
   */
  layoutService!: LayoutService;
  
  /**
   * Service de gestion des fichiers
   * Responsable des opérations de lecture/écriture sur les fichiers markdown
   */
  fileService!: FileService;
  
  /**
   * Gestionnaire de basculement entre vues
   * Ajoute des boutons pour passer de la vue markdown à la vue board
   */
  viewSwitcher!: ViewSwitcher;
  
  /**
   * Détecteur de modèles automatique
   * Surveille les changements de fichiers et met à jour l'interface
   */
  modelDetector!: ModelDetector;

  // =============================================================================
  // MÉTHODES DU CYCLE DE VIE OBSIDIAN
  // =============================================================================

  /**
   * MÉTHODE onload() - Point d'entrée du plugin
   * 
   * CONCEPT OBSIDIAN :
   * Cette méthode est appelée automatiquement par Obsidian quand :
   * - L'utilisateur active le plugin
   * - Obsidian démarre avec le plugin déjà activé
   * 
   * RESPONSABILITÉS :
   * - Initialiser tous les composants du plugin
   * - Enregistrer les vues, commandes, et événements
   * - Préparer l'interface utilisateur
   * 
   * Le mot-clé "async" permet d'utiliser "await" pour les opérations asynchrones
   */
  async onload(): Promise<void> {
    // Log de démarrage pour le débogage
    // console.log() affiche des messages dans la console de développement (F12)
    console.log('🚀 Loading Agile Board Plugin...');
    
    try {
      // =============================================================================
      // ÉTAPE 1 : CHARGEMENT DES PARAMÈTRES
      // =============================================================================
      
      // Charger les paramètres sauvegardés ou utiliser les valeurs par défaut
      await this.loadSettings();
      
      // =============================================================================
      // ÉTAPE 2 : INITIALISATION DES SERVICES
      // =============================================================================
      
      // Initialiser les services métier (logique de base du plugin)
      await this.initializeServices();
      
      // =============================================================================
      // ÉTAPE 3 : ENREGISTREMENT DE LA VUE PERSONNALISÉE
      // =============================================================================
      
      // CONCEPT OBSIDIAN - VUES PERSONNALISÉES :
      // Obsidian permet de créer des vues personnalisées qui s'intègrent dans l'interface
      // registerView() indique à Obsidian qu'il existe un nouveau type de vue
      this.registerView(
        BOARD_VIEW_TYPE,                    // Identifiant unique de la vue
        (leaf) => new BoardView(leaf, this) // Factory function pour créer la vue
      );
      
      // =============================================================================
      // ÉTAPE 4 : INITIALISATION DES MANAGERS
      // =============================================================================
      
      // Initialiser les gestionnaires de fonctionnalités avancées
      await this.initializeManagers();
      
      // =============================================================================
      // ÉTAPE 5 : ENREGISTREMENT DES COMMANDES
      // =============================================================================
      
      // Enregistrer toutes les commandes disponibles pour l'utilisateur
      this.registerCommands();
      
      // =============================================================================
      // ÉTAPE 6 : INTERFACE UTILISATEUR
      // =============================================================================
      
      // CONCEPT OBSIDIAN - BARRE DE STATUT :
      // addStatusBarItem() ajoute un élément dans la barre de statut en bas d'Obsidian
      this.addStatusBarItem().setText('Agile Board Ready');
      
      // Logs de succès avec informations utiles
      console.log('✅ Agile Board Plugin loaded successfully');
      console.log('📋 Layouts disponibles:', this.layoutService.getAllModelNames());
      
    } catch (error) {
      // Gestion d'erreur : si quelque chose échoue pendant l'initialisation
      console.error('❌ Erreur lors du chargement du plugin:', error);
    }
  }

  /**
   * MÉTHODE onunload() - Nettoyage du plugin
   * 
   * CONCEPT OBSIDIAN :
   * Cette méthode est appelée quand :
   * - L'utilisateur désactive le plugin
   * - Obsidian se ferme
   * - Le plugin est rechargé
   * 
   * RESPONSABILITÉS :
   * - Nettoyer les ressources utilisées
   * - Désactiver les gestionnaires d'événements
   * - Éviter les fuites mémoire
   */
  async onunload(): Promise<void> {
    console.log('🛑 Unloading Agile Board Plugin...');
    
    // Nettoyer les managers dans l'ordre inverse de leur création
    // Le "?" (optional chaining) évite les erreurs si la propriété est undefined
    this.modelDetector?.onUnload();  // Arrêter la surveillance des fichiers
    this.viewSwitcher?.stop();       // Supprimer les boutons de l'interface
    
    console.log('✅ Agile Board Plugin unloaded');
  }

  // =============================================================================
  // MÉTHODES D'INITIALISATION PRIVÉES
  // =============================================================================

  /**
   * Initialise tous les services métier
   * 
   * PRINCIPE DE CONCEPTION :
   * - Les services sont initialisés avant les managers
   * - Chaque service reçoit les dépendances dont il a besoin
   * - L'ordre d'initialisation est important
   */
  private async initializeServices(): Promise<void> {
    // Service de gestion des layouts
    // Il reçoit une référence au plugin principal pour accéder à l'API Obsidian
    this.layoutService = new LayoutService(this);
    this.layoutService.load();  // Charger les layouts prédéfinis
    
    // Service de gestion des fichiers
    // Il reçoit this.app qui donne accès au vault et aux métadonnées
    this.fileService = new FileService(this.app);
  }

  /**
   * Initialise tous les gestionnaires de fonctionnalités
   * 
   * ORDRE D'INITIALISATION :
   * 1. Créer les instances avec leurs dépendances
   * 2. Activer leurs fonctionnalités (boutons, surveillance, etc.)
   */
  private async initializeManagers(): Promise<void> {
    // Gestionnaire de basculement de vues
    this.viewSwitcher = new ViewSwitcher(this);
    this.viewSwitcher.addSwitchButton();  // Ajouter le bouton dans l'interface
    
    // Détecteur de modèles automatique
    this.modelDetector = new ModelDetector(this);
    this.modelDetector.onLoad();  // Commencer la surveillance
  }

  // =============================================================================
  // MÉTHODES D'ENREGISTREMENT DES COMMANDES
  // =============================================================================

  /**
   * Enregistre toutes les commandes du plugin
   * 
   * CONCEPT OBSIDIAN - COMMANDES :
   * Les commandes sont des actions que l'utilisateur peut déclencher via :
   * - La palette de commandes (Ctrl+P)
   * - Des raccourcis clavier personnalisés
   * - Des boutons dans l'interface
   */
  private registerCommands(): void {
    // =============================================================================
    // COMMANDE PRINCIPALE : BASCULEMENT VERS VUE BOARD
    // =============================================================================
    
    this.addCommand({
      id: 'switch-to-board-view',           // Identifiant unique
      name: 'Switch to Board View',         // Nom affiché dans la palette
      callback: () => this.activateBoardView() // Fonction à exécuter
    });

    // =============================================================================
    // COMMANDES DE CRÉATION DE NOTES
    // =============================================================================
    
    // Enregistrer toutes les commandes pour créer des notes avec différents layouts
    this.registerCreationCommands();
    
    // =============================================================================
    // COMMANDES UTILITAIRES
    // =============================================================================
    
    // Enregistrer les commandes d'administration et de débogage
    this.registerUtilityCommands();
  }

  /**
   * Enregistre les commandes de création de notes avec layouts prédéfinis
   * 
   * PATTERN DE CONCEPTION :
   * - Définir une liste de layouts disponibles
   * - Créer dynamiquement une commande pour chaque layout
   * - Utiliser une convention de nommage cohérente
   */
  private registerCreationCommands(): void {
    // Définition des layouts disponibles avec leurs informations d'affichage
    const layouts = [
      { id: 'eisenhower', name: 'Eisenhower Matrix' },
      { id: 'kanban', name: 'Kanban Board' },
      { id: 'gtd', name: 'GTD Board' },
      { id: 'weekly', name: 'Weekly Planner' },
      { id: 'daily', name: 'Daily Planner' },
      { id: 'project', name: 'Project Board' },
      { id: 'simple', name: 'Simple Board' },
      { id: 'cornell', name: 'Cornell Notes' },
      { id: 'tasks-dashboard', name: 'Tasks Dashboard' },
      { id: 'dataview-analytics', name: 'Dataview Analytics' }
    ];

    // Créer une commande pour chaque layout
    layouts.forEach(layout => {
      this.addCommand({
        id: `create-${layout.id}-note`,      // ID unique : create-kanban-note
        name: `Create ${layout.name} Note`,  // Nom : Create Kanban Board Note
        callback: () => {
          // Conversion du nom : kanban → layout_kanban
          const layoutName = `layout_${layout.id.replace('-', '_')}`;
          this.createNoteWithLayout(layoutName);
        }
      });
    });
  }

  /**
   * Enregistre les commandes utilitaires et de débogage
   * 
   * TYPES DE COMMANDES UTILITAIRES :
   * - Informations : Lister les layouts disponibles
   * - Maintenance : Créer les sections manquantes
   * - Débogage : Forcer la mise à jour des boutons
   */
  private registerUtilityCommands(): void {
    // =============================================================================
    // COMMANDE D'INFORMATION
    // =============================================================================
    
    this.addCommand({
      id: 'list-layouts',
      name: 'List Available Layouts',
      callback: () => this.showAvailableLayouts()
    });

    // =============================================================================
    // COMMANDE CONDITIONNELLE
    // =============================================================================
    
    // CONCEPT OBSIDIAN - COMMANDES CONDITIONNELLES :
    // checkCallback permet de n'afficher la commande que dans certains contextes
    this.addCommand({
      id: 'create-missing-sections',
      name: 'Create Missing Sections for Current Layout',
      checkCallback: (checking: boolean) => {
        // Vérifier les conditions d'activation de la commande
        
        // 1. Il faut un fichier actif
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return false;

        // 2. Le fichier doit avoir un layout agile-board dans son frontmatter
        const fileCache = this.app.metadataCache.getFileCache(activeFile);
        const layoutName = fileCache?.frontmatter?.['agile-board'];
        if (!layoutName) return false;

        // Si on est juste en train de vérifier (checking = true), retourner true
        // Si on doit exécuter la commande (checking = false), l'exécuter
        if (!checking) {
          this.createMissingSectionsForCurrentFile();
        }
        return true;  // La commande est disponible
      }
    });

    // =============================================================================
    // COMMANDE DE DÉBOGAGE
    // =============================================================================
    
    this.addCommand({
      id: 'force-update-buttons',
      name: 'Force Update Board Buttons',
      callback: () => {
        this.modelDetector.forceUpdate();
        console.log('🔄 Boutons mis à jour manuellement');
      }
    });
  }

  // =============================================================================
  // MÉTHODES D'ACTION PUBLIQUES
  // =============================================================================

  /**
   * Active la vue Board pour le fichier actuellement ouvert
   * 
   * CONCEPT OBSIDIAN - WORKSPACES ET VUES :
   * - workspace : Gestion des onglets et panneaux
   * - leaf : Un onglet individuel dans l'interface
   * - setViewState : Changer le type de vue d'un onglet
   */
  async activateBoardView(): Promise<void> {
    // Récupérer le fichier actuellement ouvert
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      console.log('❌ Aucun fichier actif');
      return;
    }

    // Récupérer l'onglet actuel
    const leaf = this.app.workspace.activeLeaf;
    if (leaf) {
      // Changer la vue de l'onglet vers notre vue Board personnalisée
      await leaf.setViewState({
        type: BOARD_VIEW_TYPE,              // Notre type de vue personnalisé
        state: { file: activeFile.path }    // État initial : quel fichier afficher
      });
      console.log('🎯 Basculement vers Board View pour:', activeFile.basename);
    }
  }

  /**
   * Crée une nouvelle note avec un layout spécifique
   * 
   * PROCESSUS DE CRÉATION :
   * 1. Vérifier que le layout existe
   * 2. Générer le contenu markdown avec frontmatter
   * 3. Créer le fichier dans le vault
   * 4. Ouvrir le fichier dans l'interface
   * 
   * @param layoutName - Nom du layout à utiliser (ex: "layout_eisenhower")
   */
  async createNoteWithLayout(layoutName: string): Promise<void> {
    // Vérifier que le layout existe dans notre service
    const layout = this.layoutService.getModel(layoutName);
    if (!layout) {
      console.error(`❌ Layout "${layoutName}" non trouvé`);
      return;
    }

    // =============================================================================
    // GÉNÉRATION DU CONTENU MARKDOWN
    // =============================================================================
    
    // Créer le frontmatter YAML
    // Le frontmatter est un bloc de métadonnées au début des fichiers markdown
    const frontmatter = `---
agile-board: ${layoutName}
---

`;

    // Créer les sections basées sur le layout
    // layout est un tableau de blocs, chaque bloc a un titre
    const sections = layout
      .map(block => `# ${block.title}\n\n`)  // Créer un titre H1 pour chaque bloc
      .join('');                              // Joindre tous les titres

    // Contenu final du fichier
    const content = frontmatter + sections;
    
    // =============================================================================
    // CRÉATION DU FICHIER
    // =============================================================================
    
    // Générer un nom de fichier unique avec la date
    const layoutDisplayName = this.layoutService.getLayoutDisplayName(layoutName);
    const timestamp = new Date().toISOString().split('T')[0];  // Format: YYYY-MM-DD
    const fileName = `${layoutDisplayName} ${timestamp}.md`;
    
    try {
      // CONCEPT OBSIDIAN - VAULT :
      // Le vault est le système de fichiers d'Obsidian
      // vault.create() crée un nouveau fichier
      const file = await this.app.vault.create(fileName, content);
      
      // Ouvrir le fichier nouvellement créé
      await this.app.workspace.getLeaf().openFile(file);
      
      console.log(`✅ Note "${fileName}" créée avec layout ${layoutName}`);
    } catch (error) {
      console.error(`❌ Erreur création note:`, error);
    }
  }

  // =============================================================================
  // MÉTHODES D'INTERFACE UTILISATEUR
  // =============================================================================

  /**
   * Affiche une modale avec la liste des layouts disponibles
   * 
   * CONCEPT OBSIDIAN - MODALES :
   * Une modale est une fenêtre popup qui s'affiche par-dessus l'interface
   */
  private showAvailableLayouts(): void {
    // Récupérer les informations de tous les layouts
    const layouts = this.layoutService.getAllModelsInfo();
    
    // Construire le message d'affichage
    let message = 'Layouts disponibles :\n\n';
    layouts.forEach(layout => {
      message += `• **${layout.displayName}** (${layout.blockCount} sections)\n`;
      message += `  Sections: ${layout.sections.join(', ')}\n\n`;
    });

    // CRÉATION D'UNE MODALE SIMPLE
    // require('obsidian').Modal charge la classe Modal d'Obsidian
    const modal = new (require('obsidian').Modal)(this.app);
    
    // Définir le contenu HTML de la modale
    modal.contentEl.innerHTML = `
      <h2>Layouts Agile Board</h2>
      <div style="white-space: pre-wrap; font-family: var(--font-text);">${message}</div>
    `;
    
    // Afficher la modale
    modal.open();
  }

  /**
   * Crée les sections manquantes pour le fichier actuellement ouvert
   * 
   * PROCESSUS :
   * 1. Vérifier le contexte (fichier actif avec layout)
   * 2. Déléguer au FileService pour créer les sections
   * 3. Rafraîchir la vue Board si nécessaire
   */
  private async createMissingSectionsForCurrentFile(): Promise<void> {
    // Vérifications préalables
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    const fileCache = this.app.metadataCache.getFileCache(activeFile);
    const layoutName = fileCache?.frontmatter?.['agile-board'];
    if (!layoutName) return;

    const layout = this.layoutService.getModel(layoutName);
    if (!layout) return;

    try {
      // Déléguer la création des sections au FileService
      const sectionsCreated = await this.fileService.createMissingSections(activeFile, layout);
      
      if (sectionsCreated) {
        console.log('✅ Sections manquantes créées pour:', activeFile.basename);
        
        // RAFRAÎCHISSEMENT DE LA VUE BOARD
        // Si l'utilisateur est actuellement en vue Board, la recharger
        const boardView = this.app.workspace.getActiveViewOfType(BoardView);
        if (boardView) {
          // Utiliser setTimeout pour laisser le temps aux fichiers d'être sauvegardés
          setTimeout(() => {
            boardView.renderBoardLayout();
          }, 500);
        }
      } else {
        console.log('ℹ️ Aucune section manquante à créer');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création des sections:', error);
    }
  }

  // =============================================================================
  // MÉTHODES DE GESTION DES PARAMÈTRES
  // =============================================================================

  /**
   * Charge les paramètres du plugin depuis le stockage d'Obsidian
   * 
   * CONCEPT OBSIDIAN - PERSISTANCE :
   * - loadData() : Récupère les données sauvegardées du plugin
   * - Les données sont stockées dans .obsidian/plugins/[plugin-id]/data.json
   * - Object.assign() fusionne les paramètres par défaut avec les sauvegardés
   */
  async loadSettings(): Promise<void> {
    this.settings = Object.assign(
      {},                           // Objet de base vide
      createDefaultSettings(),      // Paramètres par défaut
      await this.loadData()         // Paramètres sauvegardés (peuvent être null)
    );
  }

  /**
   * Sauvegarde les paramètres actuels du plugin
   * 
   * UTILISATION :
   * Appelée chaque fois que l'utilisateur modifie un paramètre
   */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

// =============================================================================
// NOTES POUR LES DÉBUTANTS
// =============================================================================

/*
CONCEPTS CLÉS OBSIDIAN À RETENIR :

1. **Plugin Class** : Point d'entrée, hérite des capacités d'Obsidian
2. **App** : Instance principale d'Obsidian (this.app)
3. **Vault** : Système de fichiers (this.app.vault)
4. **Workspace** : Gestion des onglets et vues (this.app.workspace)
5. **Views** : Interfaces utilisateur personnalisées
6. **Commands** : Actions disponibles dans la palette de commandes
7. **Settings** : Configuration persistante du plugin

PATTERN D'ARCHITECTURE :

1. **Separation of Concerns** : Chaque classe a une responsabilité claire
2. **Dependency Injection** : Les dépendances sont passées en paramètre
3. **Service Layer** : La logique métier est dans les services
4. **Manager Pattern** : Les managers orchestrent des fonctionnalités complexes
5. **Observer Pattern** : Surveillance des changements (ModelDetector)

BONNES PRATIQUES :

1. **Gestion d'erreurs** : try/catch dans onload()
2. **Nettoyage** : onunload() pour éviter les fuites mémoire
3. **Logging** : console.log avec emojis pour le débogage
4. **Async/Await** : Pour les opérations asynchrones
5. **TypeScript** : Types stricts pour éviter les erreurs
*/