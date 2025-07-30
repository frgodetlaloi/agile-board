/**
 * =============================================================================
 * DÉTECTEUR AUTOMATIQUE DE MODÈLES ET GESTIONNAIRE D'ÉVÉNEMENTS
 * =============================================================================
 * 
 * Ce gestionnaire surveille automatiquement les changements dans Obsidian
 * et met à jour l'interface utilisateur en conséquence.
 * 
 * RESPONSABILITÉS PRINCIPALES :
 * - Détecter quand un fichier avec layout agile-board est ouvert/modifié
 * - Mettre à jour automatiquement les boutons de basculement
 * - Surveiller les changements de métadonnées (frontmatter)
 * - Gérer les fichiers ouverts au démarrage du plugin
 * - Optimiser les performances avec un cache intelligent
 * 
 * CONCEPTS OBSIDIAN IMPORTANTS :
 * - metadataCache : Cache des métadonnées de tous les fichiers
 * - workspace : Gestionnaire des onglets et vues
 * - file-open : Événement d'ouverture de fichier
 * - active-leaf-change : Événement de changement d'onglet
 * - iterateAllLeaves : Parcours de tous les onglets ouverts
 * 
 * OPTIMISATIONS DE PERFORMANCE :
 * - Cache des fichiers déjà traités (évite les retraitements)
 * - Nettoyage automatique du cache (évite la fuite mémoire)
 * - Délais intelligents pour grouper les événements
 * - Filtrage des fichiers non-markdown
 * 
 * PATTERN DE CONCEPTION :
 * - Observer Pattern : Écoute les événements système
 * - Cache Pattern : Optimise les performances
 * - Coordinator Pattern : Coordonne avec ViewSwitcher
 */

// =============================================================================
// IMPORTS
// =============================================================================

// Import des types Obsidian pour la manipulation des fichiers
import { TFile } from 'obsidian';

// Import du type du plugin principal
// ATTENTION : Utilisation du chemin relatif corrigé (pas d'alias @/)
import type AgileBoardPlugin from '../main';

// =============================================================================
// CLASSE PRINCIPALE DU DÉTECTEUR
// =============================================================================

/**
 * Détecteur automatique de modèles et gestionnaire d'événements
 * 
 * ARCHITECTURE :
 * Cette classe agit comme un coordinateur entre les événements Obsidian
 * et les mises à jour de l'interface utilisateur.
 * 
 * PATTERN OBSERVER :
 * S'abonne à plusieurs types d'événements Obsidian et réagit en conséquence.
 * Plus efficace que de sonder constamment l'état du système.
 * 
 * GESTION DU CACHE :
 * Maintient un cache des fichiers déjà traités pour éviter les retraitements
 * inutiles et optimiser les performances.
 */
export class ModelDetector {
  
  /**
   * Cache des fichiers déjà traités
   * 
   * STRUCTURE DE DONNÉES :
   * Set<string> pour un accès O(1) et éviter les doublons.
   * 
   * CLÉ DE CACHE :
   * "chemin-du-fichier-timestamp" pour invalidation automatique
   * quand le fichier est modifié.
   * 
   * AVANTAGES :
   * - Évite les retraitements inutiles
   * - Performance optimisée pour les gros vaults
   * - Invalidation automatique lors des modifications
   */
  private processedFiles = new Set<string>();

  /**
   * CONSTRUCTEUR avec injection de dépendance
   * 
   * @param plugin - Instance du plugin principal
   * 
   * DÉPENDANCES UTILISÉES :
   * - plugin.app : Pour accéder aux APIs Obsidian
   * - plugin.layoutService : Pour valider les layouts
   * - plugin.viewSwitcher : Pour mettre à jour l'interface
   * - plugin.registerEvent : Pour l'abonnement sécurisé aux événements
   */
  constructor(private plugin: AgileBoardPlugin) {}

  // ===========================================================================
  // MÉTHODES DE CYCLE DE VIE
  // ===========================================================================

  /**
   * Initialise la surveillance des événements Obsidian
   * 
   * ÉVÉNEMENTS SURVEILLÉS :
   * 1. metadataCache.on('changed') : Modification des métadonnées
   * 2. workspace.on('file-open') : Ouverture de fichier
   * 3. workspace.on('active-leaf-change') : Changement d'onglet actif
   * 
   * DÉLAIS D'INITIALISATION :
   * Délai de 1 seconde pour laisser Obsidian finir son initialisation
   * avant de traiter les fichiers déjà ouverts.
   * 
   * PATTERN REGISTER-EVENT :
   * Utilise plugin.registerEvent() pour un nettoyage automatique
   * des écouteurs lors du déchargement du plugin.
   * 
   * @example
   * modelDetector.onLoad();
   * // À partir de maintenant, les changements sont détectés automatiquement
   */
  onLoad(): void {
    // ÉVÉNEMENT 1 : Modification des métadonnées
    // Déclenché quand le frontmatter d'un fichier change
    this.plugin.registerEvent(
      this.plugin.app.metadataCache.on('changed', (file) => {
        this.handleMetadataChanged(file);
      })
    );

    // ÉVÉNEMENT 2 : Ouverture de fichier
    // Déclenché quand un utilisateur ouvre un fichier
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('file-open', (file) => {
        if (file) {
          this.handleFileOpen(file);
        }
      })
    );

    // ÉVÉNEMENT 3 : Changement d'onglet actif
    // Déclenché quand l'utilisateur clique sur un autre onglet
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('active-leaf-change', () => {
        // DÉLAI COURT : Laisser Obsidian finaliser le changement
        setTimeout(() => {
          const activeFile = this.plugin.app.workspace.getActiveFile();
          if (activeFile) {
            this.handleFileOpen(activeFile);
          }
        }, 100);
      })
    );

    // INITIALISATION DIFFÉRÉE : Traiter les fichiers déjà ouverts
    // Délai plus long pour l'initialisation complète d'Obsidian
    setTimeout(() => {
      this.processAllOpenFiles();
    }, 1000);
  }

  /**
   * Nettoie les ressources utilisées par le détecteur
   * 
   * APPELÉE PAR :
   * Le plugin principal lors de son déchargement (onunload).
   * 
   * NETTOYAGE :
   * - Vide le cache des fichiers traités
   * - Les écouteurs d'événements sont automatiquement nettoyés par Obsidian
   * 
   * IMPORTANCE :
   * Évite les fuites mémoire et prépare un rechargement propre du plugin.
   */
  onUnload(): void {
    this.processedFiles.clear();
  }

  // ===========================================================================
  // GESTIONNAIRES D'ÉVÉNEMENTS PRIVÉS
  // ===========================================================================

  /**
   * Gère les changements de métadonnées d'un fichier
   * 
   * DÉCLENCHEMENT :
   * Quand l'utilisateur modifie le frontmatter d'un fichier.
   * Par exemple, ajouter ou changer "agile-board: layout_kanban".
   * 
   * LOGIQUE :
   * Les métadonnées changées peuvent affecter l'affichage des boutons,
   * donc on relance le traitement du fichier.
   * 
   * @param file - Fichier dont les métadonnées ont changé
   * 
   * @example
   * // L'utilisateur ajoute dans le frontmatter :
   * // agile-board: layout_eisenhower
   * // → handleMetadataChanged() est appelée
   * // → Les boutons de basculement apparaissent
   */
  private handleMetadataChanged(file: TFile): void {
    console.log('📝 Métadonnées changées pour:', file.basename);
    this.processFile(file);
  }

  /**
   * Gère l'ouverture d'un fichier
   * 
   * DÉCLENCHEMENT :
   * - Ouverture d'un nouveau fichier
   * - Basculement vers un onglet existant
   * - Navigation par liens internes
   * 
   * @param file - Fichier qui vient d'être ouvert/activé
   */
  private handleFileOpen(file: TFile): void {
    console.log('📂 Fichier ouvert:', file.basename);
    this.processFile(file);
  }

  /**
   * Traite tous les fichiers déjà ouverts au démarrage
   * 
   * UTILISATION :
   * Appelée une fois lors de l'initialisation pour traiter les fichiers
   * qui étaient déjà ouverts avant l'activation du plugin.
   * 
   * MÉTHODE OBSIDIAN :
   * iterateAllLeaves() parcourt tous les onglets ouverts dans l'espace de travail.
   * 
   * FILTRAGE :
   * Seuls les onglets avec vue markdown et fichier valide sont traités.
   * 
   * @example
   * // Au démarrage d'Obsidian avec 3 fichiers ouverts :
   * // processAllOpenFiles() va traiter les 3 fichiers
   * // et afficher les boutons appropriés
   */
  private processAllOpenFiles(): void {
    console.log('🔍 Traitement initial de tous les fichiers ouverts...');
    
    // PARCOURS DE TOUS LES ONGLETS
    this.plugin.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      
      // FILTRAGE : Seulement les vues markdown avec fichier
      if (view.getViewType() === 'markdown' && (view as any).file) {
        this.processFile((view as any).file);
      }
    });
  }

  // ===========================================================================
  // LOGIQUE MÉTIER PRINCIPALE
  // ===========================================================================

  /**
   * Traite un fichier individuel et met à jour l'interface si nécessaire
   * 
   * ALGORITHME :
   * 1. Filtrer les fichiers non-markdown
   * 2. Générer une clé de cache unique
   * 3. Vérifier si déjà traité (cache hit)
   * 4. Détecter si le fichier a un layout agile-board
   * 5. Mettre à jour l'interface via ViewSwitcher
   * 6. Nettoyer le cache si nécessaire
   * 
   * OPTIMISATION DE CACHE :
   * La clé inclut le timestamp de modification (mtime) pour invalider
   * automatiquement le cache quand le fichier change.
   * 
   * @param file - Fichier à traiter
   * 
   * @example
   * // Première fois : traitement complet
   * processFile(myFile); // Cache miss → traitement
   * 
   * // Deuxième fois (fichier inchangé) : cache hit
   * processFile(myFile); // Cache hit → pas de traitement
   * 
   * // Après modification du fichier : cache invalidé
   * processFile(myFile); // Cache miss → traitement
   */
  private processFile(file: TFile): void {
    // FILTRE 1 : Seulement les fichiers markdown
    if (!file.path.endsWith('.md')) return;

    // GÉNÉRATION DE CLÉ DE CACHE
    // Format : "chemin-timestamp" pour invalidation automatique
    const fileKey = `${file.path}-${file.stat.mtime}`;
    
    // VÉRIFICATION DU CACHE
    if (this.processedFiles.has(fileKey)) return;
    
    // MISE À JOUR DU CACHE
    this.processedFiles.add(fileKey);

    // NETTOYAGE PRÉVENTIF DU CACHE
    this.cleanupProcessedFiles();

    // DÉTECTION DU LAYOUT
    const hasLayout = this.hasAgileBoardLayout(file);
    console.log(`🎯 Fichier "${file.basename}" - Layout agile-board: ${hasLayout ? 'OUI' : 'NON'}`);

    // MISE À JOUR DE L'INTERFACE (avec délai pour stabilité)
    setTimeout(() => {
        if (this.plugin.viewSwitcher) {
            this.plugin.viewSwitcher.updateSwitchButtonForFile(file);
        }
    }, 100); // Augmenté de 50ms à 100ms

    // NOUVEAU : Double vérification pour les changements critiques
    setTimeout(() => {
        if (this.plugin.viewSwitcher) {
            this.plugin.viewSwitcher.updateSwitchButtonForFile(file);
        }
    }, 500); // Vérification supplémentaire après 500ms
  }

  /**
   * Vérifie si un fichier a un layout agile-board valide
   * 
   * VALIDATION EN DEUX ÉTAPES :
   * 1. Vérifier la présence du champ 'agile-board' dans le frontmatter
   * 2. Vérifier que le layout existe dans le LayoutService
   * 
   * GESTION D'ERREURS :
   * Si un layout est spécifié mais n'existe pas, log un warning
   * mais retourne false (traitement gracieux).
   * 
   * @param file - Fichier à vérifier
   * @returns boolean - true si le fichier a un layout valide
   * 
   * @example
   * // Fichier avec frontmatter valide :
   * // ---
   * // agile-board: layout_eisenhower
   * // ---
   * hasAgileBoardLayout(file); // true
   * 
   * // Fichier avec layout inexistant :
   * // ---
   * // agile-board: layout_inexistant
   * // ---
   * hasAgileBoardLayout(file); // false + warning
   */
  private hasAgileBoardLayout(file: TFile): boolean {
    // ÉTAPE 1 : Lire les métadonnées du fichier
    const fileCache = this.plugin.app.metadataCache.getFileCache(file);
    const layoutName = fileCache?.frontmatter?.['agile-board'];
    
    // VÉRIFICATION 1 : Présence du champ
    if (!layoutName) return false;

    // ÉTAPE 2 : Valider que le layout existe
    const layout = this.plugin.layoutService.getModel(layoutName);
    if (!layout) {
      console.warn(`⚠️ Layout "${layoutName}" spécifié mais non trouvé`);
      return false;
    }

    return true;
  }

  // ===========================================================================
  // GESTION DU CACHE ET OPTIMISATIONS
  // ===========================================================================

  /**
   * Nettoie le cache pour éviter une croissance excessive
   * 
   * STRATÉGIE DE NETTOYAGE :
   * - Limite : 100 entrées maximum dans le cache
   * - Méthode : Garder les 50 entrées les plus récentes
   * - Déclenchement : À chaque ajout dans le cache
   * 
   * POURQUOI NETTOYER :
   * - Éviter la fuite mémoire avec de gros vaults
   * - Maintenir des performances optimales
   * - Les anciennes entrées sont probablement obsolètes
   * 
   * ALGORITHME LRU SIMPLE :
   * Les entrées sont dans l'ordre d'insertion dans le Set.
   * On garde les dernières ajoutées (= les plus récemment utilisées).
   * 
   * @example
   * // Cache avec 100+ entrées
   * cleanupProcessedFiles();
   * // → Cache réduit à 50 entrées les plus récentes
   */
  private cleanupProcessedFiles(): void {
    // VÉRIFICATION DE LA LIMITE
    if (this.processedFiles.size > 100) {
      // EXTRACTION DES ENTRÉES ACTUELLES
      const entries = Array.from(this.processedFiles);
      
      // SÉLECTION DES 50 PLUS RÉCENTES
      const toKeep = entries.slice(-50);  // Les 50 dernières
      
      // RECONSTRUCTION DU CACHE
      this.processedFiles.clear();
      toKeep.forEach(entry => this.processedFiles.add(entry));
      
      console.log('🧹 Cache nettoyé: gardé 50 entrées sur', entries.length);
    }
  }

  // ===========================================================================
  // MÉTHODES UTILITAIRES PUBLIQUES
  // ===========================================================================

  /**
   * Force une mise à jour complète de tous les fichiers ouverts
   * 
   * UTILISATION :
   * - Commande de débogage
   * - Après rechargement de layouts
   * - Récupération d'état incohérent
   * 
   * PROCESSUS :
   * 1. Vider complètement le cache
   * 2. Retraiter tous les fichiers ouverts
   * 3. Mettre à jour toute l'interface
   * 
   * PERFORMANCE :
   * Opération coûteuse, à utiliser avec parcimonie.
   * 
   * @example
   * // L'utilisateur utilise la commande "Force Update Board Buttons"
   * modelDetector.forceUpdate();
   * // → Tous les boutons sont recalculés et mis à jour
   */
  forceUpdate(): void {
    // ÉTAPE 1 : Vider le cache complet
    this.processedFiles.clear();
    
    // ÉTAPE 2 : Retraiter tous les fichiers
    this.processAllOpenFiles();
    
    console.log('🔄 Mise à jour forcée terminée');
  }
}

// =============================================================================
// NOTES POUR LES DÉBUTANTS
// =============================================================================

/*
CONCEPTS CLÉS À RETENIR :

1. **Observer Pattern Appliqué** :
   - Écoute passive des événements système
   - Réaction automatique aux changements
   - Découplage entre émetteur et récepteur
   - Performance supérieure au polling

2. **Cache Pattern pour Performance** :
   - Évite les retraitements inutiles
   - Clé composite avec timestamp
   - Invalidation automatique
   - Nettoyage préventif de la mémoire

3. **Coordination de Composants** :
   - Pont entre événements et interface
   - Délégation à des composants spécialisés
   - Orchestration de mises à jour complexes
   - Séparation des responsabilités

4. **Gestion d'État Événementielle** :
   - État déduit des événements
   - Pas de synchronisation manuelle
   - Cohérence automatique
   - Robustesse face aux changements

CONCEPTS OBSIDIAN SPÉCIFIQUES :

1. **Système d'Événements** :
   - metadataCache.on('changed') : Modifications de frontmatter
   - workspace.on('file-open') : Navigation fichiers
   - workspace.on('active-leaf-change') : Changements d'onglets
   - registerEvent() : Abonnement sécurisé

2. **Métadonnées et Cache** :
   - metadataCache : Cache global des métadonnées
   - getFileCache() : Métadonnées d'un fichier spécifique
   - frontmatter : Propriétés YAML du fichier
   - Invalidation automatique lors des modifications

3. **Workspace et Navigation** :
   - activeFile : Fichier actuellement ouvert
   - iterateAllLeaves() : Parcours des onglets
   - leaf.view : Vue contenue dans un onglet
   - Détection de types de vue

PATTERNS DE PERFORMANCE :

1. **Cache Intelligent** :
   - Clé incluant timestamp pour invalidation
   - Taille limitée avec nettoyage LRU
   - Évite les calculs redondants
   - Balance mémoire vs CPU

2. **Délais Optimisés** :
   - Courts délais pour stabilité UI
   - Longs délais pour initialisation
   - Évite les cascades d'événements
   - Groupement naturel des mises à jour

3. **Filtrage Efficace** :
   - Filtre précoce des fichiers non-markdown
   - Vérification de cache avant traitement
   - Validation en étapes courtes
   - Arrêt rapide des cas invalides

BONNES PRATIQUES APPLIQUÉES :

1. **Gestion de Cycle de Vie** :
   - Initialisation différée et progressive
   - Nettoyage complet des ressources
   - Gestion des rechargements
   - État cohérent à tout moment

2. **Robustesse** :
   - Gestion gracieuse des erreurs
   - Warnings informatifs
   - Continuation malgré les problèmes
   - Récupération d'état possible

3. **Observabilité** :
   - Logs détaillés avec contexte
   - Métriques de performance (cache)
   - Traçabilité des opérations
   - Facilite le débogage

4. **Extensibilité** :
   - Interface claire pour force update
   - Séparation détection/action
   - Facilité d'ajout d'événements
   - Configuration flexible

PATTERNS D'EXTENSION POSSIBLE :

1. **Détection Avancée** :
   - Analyse de contenu des fichiers
   - Détection de patterns dans le texte
   - Heuristiques de classification
   - IA pour suggestions automatiques

2. **Cache Sophistiqué** :
   - Persistence entre sessions
   - Stratégies de nettoyage configurables
   - Métriques de hit/miss ratio
   - Cache distribué pour équipes

3. **Événements Personnalisés** :
   - Émission d'événements plugin
   - Hooks pour autres plugins
   - Configuration des déclencheurs
   - Filtres utilisateur

DÉBOGAGE ET MONITORING :

1. **Problèmes Courants** :
   - Cache qui ne se vide pas : vérifier cleanupProcessedFiles()
   - Événements manqués : contrôler les délais setTimeout
   - Performance dégradée : monitorer la taille du cache
   - Boutons incohérents : utiliser forceUpdate()

2. **Métriques à Surveiller** :
   - Taille du cache processedFiles
   - Fréquence des événements triggered
   - Ratio cache hit/miss
   - Temps de traitement des fichiers

3. **Outils de Debug** :
   - forceUpdate() pour reset complet
   - Logs console détaillés
   - Inspection du cache via console
   - Métriques de performance
*/