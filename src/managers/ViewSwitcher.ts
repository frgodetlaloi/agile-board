/**
 * =============================================================================
 * GESTIONNAIRE DE BASCULEMENT ENTRE VUES MARKDOWN ET BOARD
 * =============================================================================
 * 
 * Ce gestionnaire s'occupe de l'interface utilisateur pour basculer entre
 * la vue markdown standard d'Obsidian et notre vue Board personnalisée.
 * 
 * RESPONSABILITÉS PRINCIPALES :
 * - Ajouter des boutons de basculement dans l'interface Obsidian
 * - Détecter quand afficher/masquer ces boutons
 * - Gérer les transitions entre les deux types de vues
 * - Surveiller les changements de contexte (fichier, vue)
 * 
 * CONCEPTS OBSIDIAN IMPORTANTS :
 * - MarkdownView : Vue standard d'Obsidian pour les fichiers .md
 * - BoardView : Notre vue personnalisée pour les boards
 * - workspace : Gestion des onglets et panneaux d'Obsidian
 * - activeLeaf : L'onglet actuellement actif
 * - setViewState : Méthode pour changer le type de vue d'un onglet
 * 
 * INTERFACE UTILISATEUR :
 * - En vue Markdown : bouton "Mode Board" (icône layout-grid)
 * - En vue Board : bouton "Mode Markdown" (icône document)
 * - Boutons contextuels (n'apparaissent que pour les fichiers avec layout)
 * 
 * PATTERN DE CONCEPTION :
 * - Manager Pattern : Orchestre une fonctionnalité complexe
 * - Observer Pattern : Écoute les événements Obsidian
 * - Strategy Pattern : Comportement différent selon le contexte
 */

// =============================================================================
// IMPORTS
// =============================================================================

// Import des vues Obsidian pour détection de type
import { MarkdownView } from 'obsidian';

// Import de notre vue Board personnalisée et sa constante
import { BoardView, BOARD_VIEW_TYPE } from '../views/BoardView';

// Import du type du plugin principal
// ATTENTION : Chemin relatif corrigé (pas d'alias @/)
import type AgileBoardPlugin from '../main';

// =============================================================================
// CLASSE PRINCIPALE DU GESTIONNAIRE
// =============================================================================

/**
 * Gestionnaire de basculement entre vues
 * 
 * ARCHITECTURE :
 * Cette classe agit comme un contrôleur pour la fonctionnalité de basculement.
 * Elle observe les changements dans Obsidian et adapte l'interface en conséquence.
 * 
 * CYCLE DE VIE :
 * 1. Construction avec référence au plugin
 * 2. Enregistrement des écouteurs d'événements
 * 3. Gestion dynamique des boutons selon le contexte
 * 4. Nettoyage lors de la destruction du plugin
 * 
 * GESTION D'ÉTAT :
 * Pas d'état interne persistant - tout basé sur l'état actuel d'Obsidian.
 * Réactive aux changements plutôt que de maintenir un état parallèle.
 */
export class ViewSwitcher {
  
  /**
   * CONSTRUCTEUR avec injection de dépendance
   * 
   * @param plugin - Instance du plugin principal
   * 
   * INJECTION DE DÉPENDANCE :
   * Le plugin donne accès à :
   * - app : Instance Obsidian pour les opérations
   * - layoutService : Pour vérifier les layouts disponibles
   * - registerEvent : Pour s'abonner aux événements
   */
  constructor(private plugin: AgileBoardPlugin) {}

  // ===========================================================================
  // MÉTHODES DE BASCULEMENT ENTRE VUES
  // ===========================================================================

  /**
   * Bascule vers la vue Board pour un fichier donné
   * 
   * PROCESSUS :
   * 1. Obtenir l'onglet actif (activeLeaf)
   * 2. Changer son type de vue vers BOARD_VIEW_TYPE
   * 3. Passer le chemin du fichier en paramètre d'état
   * 
   * CONCEPT OBSIDIAN - SETVIEWSTATE :
   * setViewState permet de changer complètement le type de vue d'un onglet.
   * C'est comme transformer un onglet "texte" en onglet "image" par exemple.
   * 
   * @param file - Fichier à afficher en mode Board
   * 
   * @example
   * // L'utilisateur clique sur le bouton "Mode Board"
   * viewSwitcher.switchToBoardView(currentFile);
   * // L'onglet passe de MarkdownView à BoardView
   */
  async switchToBoardView(file: any): Promise<void> {
    // ÉTAPE 1 : Obtenir l'onglet actuellement actif
    const activeLeaf = this.plugin.app.workspace.activeLeaf;
    
    if (activeLeaf) {
      // ÉTAPE 2 : Changer le type de vue de l'onglet
      await activeLeaf.setViewState({
        type: BOARD_VIEW_TYPE,           // Notre type de vue personnalisé
        state: { file: file.path }       // État initial : quel fichier afficher
      });
      
      console.log('🎯 Basculement vers Board View');
    }
  }

  /**
   * Bascule vers la vue Markdown standard pour un fichier donné
   * 
   * PROCESSUS INVERSE :
   * Même principe que switchToBoardView mais vers la vue standard d'Obsidian.
   * 
   * @param file - Fichier à afficher en mode Markdown
   * 
   * @example
   * // L'utilisateur clique sur le bouton "Mode Markdown"
   * viewSwitcher.switchToMarkdownView(currentFile);
   * // L'onglet passe de BoardView à MarkdownView
   */
  async switchToMarkdownView(file: any): Promise<void> {
    const activeLeaf = this.plugin.app.workspace.activeLeaf;
    
    if (activeLeaf) {
      await activeLeaf.setViewState({
        type: 'markdown',               // Type de vue standard d'Obsidian
        state: { file: file.path }      // Même fichier, vue différente
      });
      
      console.log('📝 Basculement vers Markdown View');
    }
  }

  // ===========================================================================
  // MÉTHODES DE DÉTECTION DE CONTEXTE
  // ===========================================================================

  /**
   * Vérifie si la vue actuelle est notre BoardView
   * 
   * UTILITÉ :
   * Permet de savoir quel bouton afficher (Board → Markdown ou Markdown → Board).
   * 
   * MÉTHODE OBSIDIAN :
   * getActiveViewOfType() cherche une vue d'un type spécifique dans l'espace de travail.
   * Retourne l'instance ou null si aucune vue de ce type n'est active.
   * 
   * @returns boolean - true si on est en mode Board
   * 
   * @example
   * if (viewSwitcher.isCurrentViewBoardView()) {
   *   showMarkdownButton();
   * } else {
   *   showBoardButton();
   * }
   */
  isCurrentViewBoardView(): boolean {
    return this.plugin.app.workspace.getActiveViewOfType(BoardView) !== null;
  }

  /**
   * Vérifie si la vue actuelle est la MarkdownView standard
   * 
   * COMPLÉMENT DE isCurrentViewBoardView :
   * Ces deux méthodes permettent de couvrir tous les cas de figure.
   * 
   * @returns boolean - true si on est en mode Markdown
   */
  isCurrentViewMarkdownView(): boolean {
    return this.plugin.app.workspace.getActiveViewOfType(MarkdownView) !== null;
  }

  /**
   * Vérifie si un fichier a un layout agile-board configuré
   * 
   * LOGIQUE MÉTIER :
   * - Seuls les fichiers avec layout agile-board peuvent utiliser la vue Board
   * - Cette vérification détermine si les boutons doivent être affichés
   * 
   * ACCÈS AUX MÉTADONNÉES :
   * - metadataCache : Cache des métadonnées des fichiers
   * - getFileCache : Obtient les métadonnées d'un fichier
   * - frontmatter : Bloc YAML en début de fichier
   * 
   * @param file - Fichier à vérifier
   * @returns boolean - true si le fichier a un layout agile-board
   * 
   * @example
   * // Fichier avec frontmatter :
   * // ---
   * // agile-board: layout_eisenhower
   * // ---
   * hasAgileBoardLayout(file); // true
   * 
   * // Fichier normal sans frontmatter
   * hasAgileBoardLayout(file); // false
   */
  hasAgileBoardLayout(file: any): boolean {
    // ÉTAPE 1 : Obtenir les métadonnées du fichier
    const fileCache = this.plugin.app.metadataCache.getFileCache(file);
    
    // ÉTAPE 2 : Vérifier la présence du champ agile-board
    return fileCache?.frontmatter?.['agile-board'] !== undefined;
  }

  // ===========================================================================
  // MÉTHODES DE GESTION DES BOUTONS D'INTERFACE
  // ===========================================================================

  /**
   * Configure les écouteurs d'événements pour la gestion automatique des boutons
   * 
   * ÉVÉNEMENTS OBSIDIAN SURVEILLÉS :
   * 1. active-leaf-change : Changement d'onglet actif
   * 2. file-open : Ouverture d'un nouveau fichier
   * 3. metadataCache.on('changed') : Modification des métadonnées
   * 
   * PATTERN OBSERVER :
   * S'abonne aux événements système plutôt que de sonder constamment.
   * Plus efficace et réactif.
   * 
   * DÉLAIS (setTimeout) :
   * Petits délais pour laisser le temps à Obsidian de finaliser les changements
   * avant de mettre à jour l'interface.
   * 
   * @example
   * viewSwitcher.addSwitchButton();
   * // À partir de maintenant, les boutons apparaissent/disparaissent automatiquement
   */
  addSwitchButton(): void {
    // ÉVÉNEMENT 1 : Changement d'onglet actif
    // Déclenché quand l'utilisateur clique sur un autre onglet
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('active-leaf-change', () => {
        setTimeout(() => this.updateSwitchButton(), 50);
      })
    );

    // ÉVÉNEMENT 2 : Ouverture de fichier
    // Déclenché quand un fichier est ouvert (nouveau ou existant)
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('file-open', () => {
        setTimeout(() => this.updateSwitchButton(), 50);
      })
    );

    // ÉVÉNEMENT 3 : Changement de métadonnées
    // Déclenché quand le frontmatter d'un fichier change
    this.plugin.registerEvent(
      this.plugin.app.metadataCache.on('changed', (file) => {
        // Vérifier si c'est le fichier actuellement actif
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile && activeFile.path === file.path) {
          setTimeout(() => this.updateSwitchButtonForFile(file), 100);
        }
      })
    );

    // INITIALISATION : Mettre à jour les boutons au démarrage
    setTimeout(() => this.updateSwitchButton(), 100);
  }

  /**
   * Met à jour les boutons pour un fichier spécifique
   * 
   * UTILISATION :
   * Appelée depuis l'extérieur (ModelDetector) quand un changement est détecté.
   * Version optimisée qui évite de re-analyser le contexte.
   * 
   * @param file - Fichier pour lequel mettre à jour les boutons
   */
  updateSwitchButtonForFile(file: any): void {
    // ÉTAPE 1 : Vérifier si le fichier a un layout
    const hasLayout = this.hasAgileBoardLayout(file);
    
    if (hasLayout) {
      // FICHIER AVEC LAYOUT : Afficher le bon bouton selon la vue
      if (this.isCurrentViewMarkdownView()) {
        this.ensureBoardModeButton();
      } else if (this.isCurrentViewBoardView()) {
        this.ensureNormalModeButton();
      }
    } else {
      // FICHIER SANS LAYOUT : Masquer tous les boutons
      this.removeSwitchButtons();
    }
  }

  /**
   * Met à jour les boutons selon le contexte actuel
   * 
   * LOGIQUE GLOBALE :
   * 1. Identifier le fichier actif
   * 2. Vérifier s'il a un layout agile-board
   * 3. Déterminer la vue actuelle
   * 4. Afficher le bouton approprié
   * 
   * MÉTHODE PRINCIPALE :
   * Point d'entrée pour toutes les mises à jour automatiques.
   */
  private updateSwitchButton(): void {
    // ÉTAPE 1 : Obtenir le fichier actuellement actif
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) return;

    // ÉTAPE 2 : Vérifier si le fichier a un layout
    const hasLayout = this.hasAgileBoardLayout(activeFile);
    if (!hasLayout) {
      this.removeSwitchButtons();
      return;
    }

    // ÉTAPE 3 : Afficher le bouton approprié selon la vue
    if (this.isCurrentViewMarkdownView()) {
      this.ensureBoardModeButton();
    } else if (this.isCurrentViewBoardView()) {
      this.ensureNormalModeButton();
    } else {
      // Vue non reconnue (ni Markdown ni Board)
      this.removeSwitchButtons();
    }
  }

  /**
   * S'assure qu'un bouton "Mode Board" est présent en vue Markdown
   * 
   * PROCESSUS :
   * 1. Trouver la vue Markdown active
   * 2. Localiser la zone des actions de vue (.view-actions)
   * 3. Supprimer le bouton existant s'il y en a un
   * 4. Créer et configurer le nouveau bouton
   * 5. Ajouter les styles et l'événement click
   * 
   * GESTION D'ERREURS :
   * Try-catch pour éviter que les erreurs d'interface cassent le plugin.
   * 
   * CONCEPT OBSIDIAN - addAction :
   * addAction() est la méthode officielle pour ajouter des boutons aux vues.
   * Paramètres : (icône, tooltip, callback)
   */
  private ensureBoardModeButton(): void {
    // ÉTAPE 1 : Obtenir la vue Markdown active
    const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!markdownView) return;

    // ÉTAPE 2 : Localiser la zone des actions de vue
    const viewActions = markdownView.containerEl.querySelector('.view-actions');
    if (!viewActions) return;

    // ÉTAPE 3 : Supprimer le bouton existant pour éviter les doublons
    const existingButton = viewActions.querySelector('.agile-board-switch-button');
    if (existingButton) {
      existingButton.remove();
    }

    try {
      // ÉTAPE 4 : Créer le bouton avec l'API Obsidian
      const button = markdownView.addAction('layout-grid', 'Mode Board', () => {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile) {
          this.switchToBoardView(activeFile);
        }
      });
      
      // ÉTAPE 5 : Configuration et style du bouton
      button.addClass('agile-board-switch-button');              // Classe pour identification
      button.setAttribute('data-agile-board-button', 'board-mode'); // Attribut pour débogage
      
      // STYLES CSS INLINE pour mise en évidence
      button.style.cssText = `
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
        border-radius: 3px;
        opacity: 1;
      `;
      
      console.log('🔘 Bouton Mode Board ajouté');
      
    } catch (error) {
      // GESTION D'ERREUR : Logger sans faire planter le plugin
      console.error('Erreur lors de l\'ajout du bouton Mode Board:', error);
    }
  }

  /**
   * S'assure qu'un bouton "Mode Markdown" est présent en vue Board
   * 
   * PROCESSUS SIMILAIRE à ensureBoardModeButton mais pour BoardView.
   * 
   * DIFFÉRENCES :
   * - Utilise getActiveViewOfType(BoardView)
   * - Icône 'document' au lieu de 'layout-grid'
   * - Callback vers switchToMarkdownView
   */
  private ensureNormalModeButton(): void {
    // ÉTAPE 1 : Obtenir la vue Board active
    const boardView = this.plugin.app.workspace.getActiveViewOfType(BoardView);
    if (!boardView) return;

    // ÉTAPE 2 : Localiser la zone des actions de vue
    const viewActions = boardView.containerEl.querySelector('.view-actions');
    if (!viewActions) return;

    // ÉTAPE 3 : Supprimer le bouton existant
    const existingButton = viewActions.querySelector('.agile-board-switch-button');
    if (existingButton) {
      existingButton.remove();
    }

    try {
      // ÉTAPE 4 : Créer le bouton "Mode Markdown"
      const button = boardView.addAction('document', 'Mode Markdown', () => {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile) {
          this.switchToMarkdownView(activeFile);
        }
      });
      
      // ÉTAPE 5 : Configuration du bouton
      button.addClass('agile-board-switch-button');
      button.setAttribute('data-agile-board-button', 'normal-mode');
      
      button.style.cssText = `
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
        border-radius: 3px;
        opacity: 1;
      `;
      
      console.log('🔘 Bouton Mode Markdown ajouté');
      
    } catch (error) {
      console.error('Erreur lors de l\'ajout du bouton Mode Markdown:', error);
    }
  }

  /**
   * Supprime tous les boutons de basculement de l'interface
   * 
   * UTILISATION :
   * - Quand on ouvre un fichier sans layout agile-board
   * - Quand on bascule vers une vue non supportée
   * - Lors du nettoyage du plugin
   * 
   * SÉLECTEUR GLOBAL :
   * Utilise document.querySelectorAll pour trouver tous les boutons,
   * même s'ils sont dans des onglets différents.
   * 
   * CLASSE IDENTIFICATRICE :
   * Tous nos boutons ont la classe 'agile-board-switch-button'
   * pour un nettoyage facile et sûr.
   */
  private removeSwitchButtons(): void {
    // Trouver tous les boutons de basculement dans le document
    const buttons = document.querySelectorAll('.agile-board-switch-button');
    
    // Supprimer chaque bouton trouvé
    buttons.forEach(button => button.remove());
  }

  // ===========================================================================
  // MÉTHODES DE CYCLE DE VIE
  // ===========================================================================

  /**
   * Nettoie les ressources utilisées par le ViewSwitcher
   * 
   * APPELÉE PAR :
   * Le plugin principal lors de son déchargement (onunload).
   * 
   * NETTOYAGE :
   * - Supprime tous les boutons de l'interface
   * - Les écouteurs d'événements sont automatiquement nettoyés par Obsidian
   *   grâce à registerEvent() utilisé dans addSwitchButton()
   * 
   * IMPORTANCE :
   * Évite les fuites mémoire et les boutons orphelins dans l'interface.
   */
  stop(): void {
    this.removeSwitchButtons();
  }
}

// =============================================================================
// NOTES POUR LES DÉBUTANTS
// =============================================================================

/*
CONCEPTS CLÉS À RETENIR :

1. **Manager Pattern** :
   - Orchestre une fonctionnalité complexe
   - Coordonne plusieurs composants
   - Interface simple pour l'extérieur
   - Gestion centralisée de l'état

2. **Observer Pattern avec Obsidian** :
   - Écoute des événements système
   - Réaction automatique aux changements
   - Performance optimisée vs polling
   - Nettoyage automatique des écouteurs

3. **Interface Utilisateur Dynamique** :
   - Boutons contextuels (apparaissent/disparaissent)
   - Adaptation au contexte utilisateur
   - Intégration native avec l'interface Obsidian
   - Styles cohérents avec le thème

4. **Gestion d'État Sans État** :
   - Pas de cache interne d'état
   - Lecture de l'état depuis Obsidian
   - Réactivité aux changements externes
   - Simplification du code

CONCEPTS OBSIDIAN SPÉCIFIQUES :

1. **Workspace et Views** :
   - workspace : Gestionnaire global des onglets
   - activeLeaf : Onglet actuellement actif
   - setViewState : Changer le type de vue
   - getActiveViewOfType : Trouver une vue spécifique

2. **Événements Système** :
   - active-leaf-change : Changement d'onglet
   - file-open : Ouverture de fichier
   - metadata changed : Modification de frontmatter
   - registerEvent : Abonnement sécurisé

3. **Manipulation d'Interface** :
   - addAction : Ajouter des boutons aux vues
   - containerEl : Élément DOM de la vue
   - view-actions : Zone des boutons d'action
   - Variables CSS d'Obsidian pour le style

BONNES PRATIQUES APPLIQUÉES :

1. **Gestion d'Erreurs** :
   - Try-catch pour les opérations d'interface
   - Logs informatifs pour le débogage
   - Continuation malgré les erreurs
   - Pas de plantage du plugin

2. **Performance** :
   - Petits délais pour optimiser la réactivité
   - Suppression des boutons existants avant création
   - Écoute ciblée des événements
   - Nettoyage des ressources

3. **Expérience Utilisateur** :
   - Boutons contextuels intelligents
   - Feedback visuel (couleurs, icônes)
   - Tooltips informatifs
   - Intégration native

4. **Maintenabilité** :
   - Séparation claire des responsabilités
   - Méthodes courtes et focalisées
   - Nommage explicite
   - Documentation complète

PATTERNS D'EXTENSION :

1. **Nouveaux Types de Vue** :
   - Ajouter des détections de vue
   - Créer des boutons spécialisés
   - Gérer les transitions complexes
   - Support de vues tierces

2. **Interface Avancée** :
   - Menus contextuels
   - Raccourcis clavier
   - Animations de transition
   - Préférences utilisateur

3. **Intégration Système** :
   - Synchronisation avec d'autres plugins
   - Événements personnalisés
   - État partagé
   - Hooks d'extension

DÉBOGAGE COURANT :

1. **Boutons qui n'apparaissent pas** :
   - Vérifier hasAgileBoardLayout()
   - Contrôler les délais setTimeout
   - Examiner les erreurs dans la console
   - Tester manuellement updateSwitchButton()

2. **Boutons dupliqués** :
   - S'assurer que removeSwitchButtons() fonctionne
   - Vérifier les conditions d'affichage
   - Contrôler les abonnements d'événements
   - Tester le cycle complet

3. **Performance** :
   - Monitorer la fréquence des événements
   - Optimiser les délais
   - Réduire les accès DOM
   - Cache intelligent des résultats
*/