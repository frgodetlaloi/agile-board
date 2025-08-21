/**
 * =============================================================================
 * SERVICE DE GESTION DES LAYOUTS ET MODÈLES DE BOARD
 * =============================================================================
 * 
 * Ce service gère tous les layouts (modèles) de boards disponibles dans le plugin.
 * Il s'occupe du chargement, de la validation et de la distribution des layouts.
 * 
 * RESPONSABILITÉS PRINCIPALES :
 * - Charger et valider les layouts intégrés
 * - Fournir une API d'accès aux layouts
 * - Valider la cohérence géométrique des grilles
 * - Détecter les chevauchements et erreurs de configuration
 * - Fournir des métadonnées enrichies pour l'interface utilisateur
 * 
 * CONCEPTS DE GRILLE :
 * Chaque layout est une grille de 24 colonnes × 100 lignes maximum.
 * Les blocs sont des rectangles définis par (x, y, largeur, hauteur).
 * Aucun chevauchement n'est autorisé entre les blocs.
 * 
 * PATTERN DE CONCEPTION :
 * - Service Layer : Encapsule la logique de gestion des layouts
 * - Registry Pattern : Stocke et indexe les layouts disponibles
 * - Validation : Vérifie la cohérence avant utilisation
 * - Factory : Fournit des instances configurées
 */

// =============================================================================
// IMPORTS
// =============================================================================

// Import de la classe Plugin d'Obsidian pour l'injection de dépendance
import { Plugin } from 'obsidian';

// Import des types personnalisés depuis notre fichier de types
import { BoardLayout, LayoutInfo } from '../types';

// Import des layouts et métadonnées prédéfinis
import { BUILT_IN_LAYOUTS, LAYOUT_INFO } from '../constants/layouts';
import AgileBoardPlugin from '../main';
import { LoggerService } from './LoggerService';

// =============================================================================
// CLASSE PRINCIPALE DU SERVICE
// =============================================================================

/**
 * Service de gestion des layouts de boards
 * 
 * ARCHITECTURE :
 * Cette classe agit comme un registre central pour tous les layouts.
 * Elle charge, valide et distribue les modèles de boards.
 * 
 * STOCKAGE INTERNE :
 * Utilise une Map<string, BoardLayout[]> pour un accès rapide par nom.
 * La Map offre de meilleures performances que les objets pour les clés dynamiques.
 * 
 * VALIDATION :
 * Chaque layout est validé géométriquement pour éviter :
 * - Les chevauchements de blocs
 * - Les débordements hors grille
 * - Les configurations invalides
 */
export class LayoutService {
  
  /**
   * Stockage interne des layouts validés
   * 
   * CHOIX DE STRUCTURE DE DONNÉES :
   * Map vs Object :
   * - Map : accès O(1), iteration garantie, clés dynamiques
   * - Object : plus de syntaxe, risque de pollution du prototype
   * 
   * GÉNÉRICS TYPESCRIPT :
   * Map<K, V> indique les types de clé et valeur
   * - K = string (nom du layout)
   * - V = BoardLayout[] (array de blocs)
   */
  private models = new Map<string, BoardLayout[]>();
  
  /**
   * CONSTRUCTEUR avec injection de dépendance
   * 
   * @param plugin - Instance du plugin principal
   * 
   * INJECTION DE DÉPENDANCE :
   * Le plugin est injecté pour potentiel accès futur à :
   * - Configuration utilisateur
   * - Système de logs
   * - Événements du plugin
   * 
   * MODIFICATEUR private :
   * Le plugin est stocké pour usage interne uniquement
   */
  private logger: LoggerService;


  constructor(private plugin: AgileBoardPlugin) {
    this.logger = plugin.logger; // Logger du plugin pour les logs
  }

  // ===========================================================================
  // MÉTHODES DE CHARGEMENT ET INITIALISATION
  // ===========================================================================

  /**
   * Charge et valide tous les layouts intégrés
   * 
   * PROCESSUS DE CHARGEMENT :
   * 1. Vider le cache existant
   * 2. Itérer sur tous les layouts prédéfinis
   * 3. Valider chaque layout géométriquement
   * 4. Stocker les layouts valides
   * 5. Rejeter les layouts invalides avec warning
   * 6. Logger le résumé du chargement
   * 
   * GESTION D'ERREURS :
   * Les layouts invalides sont ignorés mais loggés.
   * Le plugin continue de fonctionner avec les layouts valides.
   * 
   * VALIDATION GÉOMÉTRIQUE :
   * - Vérification des limites de grille
   * - Détection des chevauchements
   * - Validation des types de données
   * 
   * @example
   * layoutService.load();
   * // Log: "📐 3 layouts chargés"
   * // Log: "📋 Layouts disponibles: layout_eisenhower, layout_kanban, ..."
   */
  load(): void {
    this.logger.info('📐 Chargement des layouts intégrés...');
    
    // ÉTAPE 1 : Nettoyer le cache existant
    // Important pour les rechargements du plugin
    this.models.clear();
    let loadedCount = 0;

    // ÉTAPE 2 : Itérer sur tous les layouts prédéfinis
    // Object.entries() transforme un objet en array de [key, value]
    for (const [name, layout] of Object.entries(BUILT_IN_LAYOUTS)) {
      console.log(`🔍 Chargement du layout "${name}"...`);
      
      // ÉTAPE 3 : Valider le layout
      if (this.validateModel(name, layout)) {
        // LAYOUT VALIDE : l'ajouter au registre
        this.models.set(name, layout);
        loadedCount++;
        console.log(`✅ Layout "${name}" chargé (${layout.length} blocs)`);
      } else {
        // LAYOUT INVALIDE : le rejeter avec warning
        console.warn(`❌ Modèle "${name}" invalide`);
      }
    }

    // ÉTAPE 4 : Logger le résumé
    console.log(`📐 ${loadedCount} layouts chargés`);
    this.logAvailableLayouts();
  }

  /**
   * Valide complètement un layout (géométrie + cohérence)
   * 
   * VALIDATION EN PLUSIEURS ÉTAPES :
   * 1. Validation individuelle de chaque bloc
   * 2. Vérification des limites de grille
   * 3. Détection des chevauchements
   * 4. Création d'une grille de test pour simulation
   * 
   * ALGORITHME DE CHEVAUCHEMENT :
   * - Créer une grille booléenne 24×100
   * - Pour chaque bloc, marquer ses cellules
   * - Si une cellule est déjà marquée = chevauchement
   * 
   * @param name - Nom du layout (pour les logs d'erreur)
   * @param layout - Array de blocs à valider
   * @returns boolean - true si le layout est entièrement valide
   * 
   * @example
   * const isValid = layoutService.validateModel("test", [
   *   { title: "Block 1", x: 0, y: 0, w: 12, h: 12 },
   *   { title: "Block 2", x: 12, y: 0, w: 12, h: 12 }
   * ]);
   * // true si pas de chevauchement, false sinon
   */
  private validateModel(name: string, layout: BoardLayout[]): boolean {
    // ÉTAPE 1 : Créer une grille de test pour détecter les chevauchements
    // Array.from() avec callback pour créer une grille 2D
    // 24 colonnes × 100 lignes, initialisées à false
    const grid = Array.from({ length: 24 }, () => Array(100).fill(false));
    let isValid = true;

    // ÉTAPE 2 : Valider chaque bloc individuellement
    for (const block of layout) {
      // VALIDATION 2.1 : Structure et types de données
      if (!this.isValidBlock(block)) {
        console.warn(`❌ [${name}] Bloc invalide :`, block);
        isValid = false;
        continue;  // Passer au bloc suivant
      }

      // VALIDATION 2.2 : Limites de grille
      if (!this.isBlockInBounds(block)) {
        console.warn(`❌ [${name}] Bloc hors limites :`, block);
        isValid = false;
        continue;
      }

      // VALIDATION 2.3 : Chevauchements
      if (!this.checkOverlap(grid, block, name)) {
        isValid = false;
        // Continue pour trouver tous les chevauchements
      }
    }

    return isValid;
  }

  /**
   * Vérifie qu'un objet a la structure d'un BoardLayout valide
   * 
   * TYPE GUARD TYPESCRIPT :
   * Cette fonction est un "type guard" qui vérifie à l'exécution
   * qu'un objet correspond à l'interface BoardLayout.
   * 
   * VÉRIFICATIONS :
   * - Présence de toutes les propriétés requises
   * - Types corrects (string pour title, number pour les autres)
   * - Pas de vérification des valeurs (fait dans isBlockInBounds)
   * 
   * @param block - Objet à vérifier (type any pour flexibilité)
   * @returns block is BoardLayout - Type guard TypeScript
   * 
   * @example
   * const obj = { title: "Test", x: 0, y: 0, w: 5, h: 5 };
   * if (isValidBlock(obj)) {
   *   // TypeScript sait maintenant que obj est un BoardLayout
   *   console.log(obj.title); // Pas d'erreur TypeScript
   * }
   */
  private isValidBlock(block: any): block is BoardLayout {
    return (
      typeof block.title === 'string' &&    // Titre doit être une chaîne
      typeof block.x === 'number' &&        // Position X doit être un nombre
      typeof block.y === 'number' &&        // Position Y doit être un nombre
      typeof block.w === 'number' &&        // Largeur doit être un nombre
      typeof block.h === 'number'           // Hauteur doit être un nombre
    );
  }

  /**
   * Vérifie qu'un bloc respecte les limites de la grille
   * 
   * CONTRAINTES DE GRILLE :
   * - x >= 0 : pas de position négative
   * - y >= 0 : pas de position négative
   * - w > 0 : largeur positive
   * - h > 0 : hauteur positive
   * - x + w <= 24 : ne déborde pas à droite
   * - y + h <= 100 : ne déborde pas en bas
   * 
   * @param block - Bloc à vérifier (déjà validé par isValidBlock)
   * @returns boolean - true si dans les limites
   * 
   * @example
   * isBlockInBounds({ title: "Test", x: 20, y: 0, w: 5, h: 10 });
   * // false car x(20) + w(5) = 25 > 24 (déborde à droite)
   */
  private isBlockInBounds(block: BoardLayout): boolean {
    const MIN_SIZE = 2; // Taille minimale viable
    return (
      block.x >= 0 &&                    // Position X positive
      block.y >= 0 &&                    // Position Y positive
      block.w > MIN_SIZE &&              // Largeur positive
      block.h > MIN_SIZE &&              // Hauteur positive
      block.x + block.w <= 24 &&         // Pas de débordement horizontal
      block.y + block.h <= 100           // Pas de débordement vertical
    );
  }

  /**
   * Vérifie qu'un bloc ne chevauche pas avec les blocs déjà placés
   * 
   * ALGORITHME :
   * 1. Parcourir toutes les cellules du bloc
   * 2. Pour chaque cellule (x, y), vérifier si grid[x][y] est déjà true
   * 3. Si déjà true = chevauchement détecté
   * 4. Sinon, marquer la cellule comme occupée
   * 
   * EFFET DE BORD :
   * Cette fonction modifie la grille en marquant les cellules occupées.
   * C'est voulu pour la détection cumulative de chevauchements.
   * 
   * @param grid - Grille de test (modifiée par la fonction)
   * @param block - Bloc à placer
   * @param modelName - Nom du layout (pour les logs d'erreur)
   * @returns boolean - true si pas de chevauchement
   * 
   * @example
   * const grid = Array.from({ length: 24 }, () => Array(100).fill(false));
   * const block1 = { title: "A", x: 0, y: 0, w: 10, h: 10 };
   * const block2 = { title: "B", x: 5, y: 5, w: 10, h: 10 };
   * 
   * checkOverlap(grid, block1, "test"); // true (première fois)
   * checkOverlap(grid, block2, "test"); // false (chevauchement en (5,5)-(9,9))
   */
  private checkOverlap(grid: boolean[][], block: BoardLayout, modelName: string): boolean {
    // DOUBLE BOUCLE pour parcourir toutes les cellules du bloc
    for (let x = block.x; x < block.x + block.w; x++) {
      for (let y = block.y; y < block.y + block.h; y++) {
        // VÉRIFICATION DE CHEVAUCHEMENT
        if (grid[x][y]) {
          // Cellule déjà occupée = chevauchement détecté
          console.warn(`❌ [${modelName}] Chevauchement détecté au bloc "${block.title}" à (${x}, ${y})`);
          return false;
        }
        
        // MARQUAGE DE LA CELLULE comme occupée
        grid[x][y] = true;
      }
    }
    
    // Aucun chevauchement détecté
    return true;
  }

  /**
   * Affiche un résumé des layouts chargés dans la console
   * 
   * UTILITÉ :
   * - Débogage : voir quels layouts sont disponibles
   * - Vérification : confirmer que le chargement s'est bien passé
   * - Documentation : liste des sections de chaque layout
   * 
   * FORMAT DE SORTIE :
   * ```
   * 📋 Layouts disponibles: layout_eisenhower, layout_kanban
   *   • layout_eisenhower: 4 sections (Urgent et Important, Pas urgent...)
   *   • layout_kanban: 3 sections (À faire, En cours, Terminé)
   * ```
   */
  private logAvailableLayouts(): void {
    // LISTE DES NOMS pour le résumé principal
    const layouts = Array.from(this.models.keys());
    console.log('📋 Layouts disponibles:', layouts);
    
    // DÉTAIL DE CHAQUE LAYOUT
    for (const [name, layout] of this.models) {
      // Extraire les titres des blocs pour un aperçu
      const sections = layout.map(b => b.title).join(', ');
      console.log(`  • ${name}: ${layout.length} sections (${sections})`);
    }
  }

  // ===========================================================================
  // MÉTHODES D'ACCÈS PUBLIC (API DU SERVICE)
  // ===========================================================================

  /**
   * Récupère un layout par son nom
   * 
   * API PRINCIPALE :
   * Cette méthode est l'interface principale pour obtenir un layout.
   * Utilisée par BoardView, ViewSwitcher, etc.
   * 
   * RETOUR UNDEFINED :
   * Retourne undefined si le layout n'existe pas.
   * Plus sûr que de lever une exception.
   * 
   * @param name - Nom du layout (ex: "layout_eisenhower")
   * @returns BoardLayout[] | undefined - Layout ou undefined si inexistant
   * 
   * @example
   * const layout = layoutService.getModel("layout_eisenhower");
   * if (layout) {
   *   // Layout trouvé, on peut l'utiliser
   *   console.log(`Layout avec ${layout.length} blocs`);
   * } else {
   *   // Layout inexistant
   *   console.error("Layout non trouvé");
   * }
   */
  getModel(name: string): BoardLayout[] | undefined {
    return this.models.get(name);
  }

  /**
   * Retourne la liste de tous les noms de layouts disponibles
   * 
   * UTILISATION :
   * - Interface utilisateur : lister les layouts dans un menu
   * - Validation : vérifier qu'un layout existe
   * - Débogage : voir ce qui est disponible
   * 
   * @returns string[] - Array des noms de layouts
   * 
   * @example
   * const names = layoutService.getAllModelNames();
   * console.log(names); // ["layout_eisenhower", "layout_kanban", ...]
   * 
   * // Utilisation dans une interface
   * names.forEach(name => {
   *   const displayName = getLayoutDisplayName(name);
   *   addMenuItem(displayName, () => createNote(name));
   * });
   */
  getAllModelNames(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * Obtient le nom d'affichage convivial d'un layout
   * 
   * MAPPING TECHNIQUE → USER-FRIENDLY :
   * "layout_eisenhower" → "Matrice d'Eisenhower"
   * 
   * FALLBACK :
   * Si aucun nom d'affichage n'est défini, retourne le nom technique.
   * Évite les erreurs si les métadonnées sont incomplètes.
   * 
   * @param layoutName - Nom technique du layout
   * @returns string - Nom d'affichage ou nom technique si non trouvé
   * 
   * @example
   * const displayName = layoutService.getLayoutDisplayName("layout_eisenhower");
   * console.log(displayName); // "Matrice d'Eisenhower"
   * 
   * const unknownName = layoutService.getLayoutDisplayName("layout_custom");
   * console.log(unknownName); // "layout_custom" (fallback)
   */
  getLayoutDisplayName(layoutName: string): string {
    // Chercher dans les métadonnées prédéfinies
    const layoutInfo = LAYOUT_INFO[layoutName];
    
    // Retourner le nom d'affichage ou fallback vers le nom technique
    return layoutInfo ? layoutInfo.displayName : layoutName;
  }

  /**
   * Obtient les métadonnées complètes d'un layout
   * 
   * MÉTADONNÉES ENRICHIES :
   * - Nom technique et d'affichage
   * - Description et cas d'usage
   * - Liste des sections
   * - Nombre de blocs
   * - Catégorie pour organisation
   * 
   * GÉNÉRATION AUTOMATIQUE :
   * Si les métadonnées prédéfinies n'existent pas, génère des métadonnées
   * basiques à partir du layout lui-même.
   * 
   * @param name - Nom du layout
   * @returns LayoutInfo | undefined - Métadonnées ou undefined si layout inexistant
   * 
   * @example
   * const info = layoutService.getModelInfo("layout_eisenhower");
   * if (info) {
   *   console.log(`${info.displayName}: ${info.description}`);
   *   console.log(`Sections: ${info.sections.join(', ')}`);
   *   console.log(`Catégorie: ${info.category}`);
   * }
   */
  getModelInfo(name: string): LayoutInfo | undefined {
    // Vérifier que le layout existe
    const model = this.models.get(name);
    if (!model) return undefined;

    // Chercher les métadonnées prédéfinies
    const info = LAYOUT_INFO[name];
    
    // Retourner métadonnées prédéfinies ou générées automatiquement
    return info || {
      name,
      displayName: name,                              // Nom technique par défaut
      description: 'Layout personnalisé',             // Description générique
      sections: model.map(block => block.title),      // Extraire les titres des blocs
      blockCount: model.length,                       // Compter les blocs
      category: 'custom'                              // Catégorie par défaut
    };
  }

  /**
   * Retourne les métadonnées de tous les layouts disponibles
   * 
   * UTILISATION :
   * - Interface utilisateur : afficher tous les layouts avec détails
   * - Filtrage : grouper par catégorie
   * - Documentation : générer de l'aide automatiquement
   * 
   * PERFORMANCE :
   * Génère les métadonnées à la demande.
   * Pour de meilleures performances avec beaucoup de layouts,
   * on pourrait envisager un cache.
   * 
   * @returns LayoutInfo[] - Array de toutes les métadonnées
   */
  getAllModelsInfo(): LayoutInfo[] {
    return Array.from(this.models.keys())
      .map(name => this.getModelInfo(name)!)
      .filter(info => info !== undefined);
  }
}