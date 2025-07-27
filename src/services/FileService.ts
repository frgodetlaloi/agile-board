/**
 * =============================================================================
 * SERVICE DE GESTION DES FICHIERS MARKDOWN
 * =============================================================================
 * 
 * Ce service gère toutes les opérations sur les fichiers markdown dans Obsidian.
 * Il s'occupe du parsing, de la modification et de la création de sections.
 * 
 * RESPONSABILITÉS PRINCIPALES :
 * - Parser les sections H1 des fichiers markdown
 * - Créer automatiquement les sections manquantes
 * - Modifier le contenu de sections spécifiques
 * - Valider la structure des fichiers
 * 
 * CONCEPTS OBSIDIAN IMPORTANTS :
 * - TFile : Représente un fichier dans le vault Obsidian
 * - App : Instance principale d'Obsidian avec accès au vault
 * - vault.read() : Lit le contenu d'un fichier
 * - vault.modify() : Modifie un fichier existant
 * 
 * PARSING MARKDOWN :
 * Les fichiers markdown sont organisés en sections délimitées par les titres H1 (#).
 * Ce service extrait chaque section avec ses métadonnées (position, contenu).
 * 
 * PATTERN DE CONCEPTION :
 * - Service Layer : Encapsule la logique métier
 * - Séparation des responsabilités : Une classe = une responsabilité
 * - Injection de dépendance : App injectée dans le constructeur
 */

// =============================================================================
// IMPORTS
// =============================================================================

// Import des classes Obsidian pour la manipulation des fichiers
import { App, TFile } from 'obsidian';

// Import des types personnalisés depuis notre fichier de types
// ATTENTION : Chemin relatif corrigé (pas d'alias @/)
import { FileSections, BoardLayout } from '../types';

// =============================================================================
// CLASSE PRINCIPALE DU SERVICE
// =============================================================================

/**
 * Service de gestion des fichiers markdown
 * 
 * PRINCIPE DE CONCEPTION :
 * Cette classe encapsule toute la logique de manipulation des fichiers.
 * Elle ne dépend que de l'API Obsidian et de nos types.
 * 
 * PATTERN DEPENDENCY INJECTION :
 * L'instance App est injectée dans le constructeur, ce qui permet :
 * - De tester la classe facilement (mock de App)
 * - De réutiliser la classe dans différents contextes
 * - De respecter le principe d'inversion de dépendance
 */
export class FileService {
  
  /**
   * CONSTRUCTEUR avec injection de dépendance
   * 
   * @param app - Instance principale d'Obsidian
   * 
   * CONCEPT OBSIDIAN - APP :
   * L'objet App donne accès à toutes les fonctionnalités d'Obsidian :
   * - app.vault : Système de fichiers
   * - app.metadataCache : Cache des métadonnées
   * - app.workspace : Gestion des vues et onglets
   * 
   * MODIFICATEUR private :
   * Rend la propriété accessible uniquement dans cette classe
   */
  constructor(private app: App) {}

  // ===========================================================================
  // MÉTHODES PRINCIPALES DE PARSING
  // ===========================================================================

  /**
   * Parse toutes les sections H1 d'un fichier markdown
   * 
   * ALGORITHME :
   * 1. Lire le contenu du fichier
   * 2. Découper en lignes
   * 3. Identifier les titres H1 (lignes commençant par "# ")
   * 4. Extraire le contenu entre chaque titre
   * 5. Créer des objets FileSection avec métadonnées
   * 
   * GESTION DES CAS LIMITES :
   * - Fichier vide : retourne objet vide
   * - Pas de sections H1 : retourne objet vide
   * - Sections vides : incluses avec tableau de lignes vide
   * - Dernière section : va jusqu'à la fin du fichier
   * 
   * @param file - Fichier Obsidian à parser
   * @returns Promise<FileSections> - Dictionnaire des sections trouvées
   * 
   * @example
   * // Pour un fichier contenant :
   * // # Section 1
   * // Contenu 1
   * // # Section 2  
   * // Contenu 2
   * 
   * const sections = await fileService.parseSections(file);
   * // Retourne :
   * // {
   * //   "Section 1": { start: 0, end: 2, lines: ["Contenu 1"] },
   * //   "Section 2": { start: 2, end: 4, lines: ["Contenu 2"] }
   * // }
   */
  async parseSections(file: TFile): Promise<FileSections> {
    // ÉTAPE 1 : Lire le contenu du fichier
    // vault.read() est asynchrone car peut nécessiter un accès disque
    const content = await this.app.vault.read(file);
    
    // ÉTAPE 2 : Découper en lignes pour traitement ligne par ligne
    const lines = content.split('\n');
    
    // ÉTAPE 3 : Initialiser la structure de retour
    const sections: FileSections = {};
    
    // VARIABLES D'ÉTAT pour le parsing
    let currentSection: string | null = null;  // Nom de la section en cours
    let sectionStart = 0;                      // Ligne de début de la section
    
    // Log de démarrage pour le débogage
    console.log('📖 Parsing sections du fichier:', file.basename);

    // ÉTAPE 4 : BOUCLE PRINCIPALE de parsing ligne par ligne
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // ÉTAPE 4.1 : Détecter les titres H1
      // Regex : ^# ([^\n#].*?)\s*$
      // ^ : début de ligne
      // # : caractère # littéral
      // ([^\n#].*?) : groupe capturant, tout sauf \n et #
      // \s*$ : espaces optionnels puis fin de ligne
      const headerMatch = line.match(/^# ([^\n#].*?)\s*$/);
      
      if (headerMatch) {
        // NOUVEAU TITRE TROUVÉ
        
        // ÉTAPE 4.2 : Sauvegarder la section précédente (si elle existe)
        if (currentSection !== null) {
          // Extraire les lignes de contenu (sans le titre)
          const sectionLines = lines.slice(sectionStart + 1, i);
          
          // Créer l'objet FileSection
          sections[currentSection] = {
            start: sectionStart,    // Index de la ligne du titre
            end: i,                 // Index de la ligne suivante (exclus)
            lines: sectionLines     // Contenu de la section
          };
          
          // Log pour le débogage
          console.log(`📄 Section "${currentSection}": ${sectionLines.length} lignes`);
        }
        
        // ÉTAPE 4.3 : Commencer la nouvelle section
        currentSection = headerMatch[1].trim();  // Nom sans espaces
        sectionStart = i;                        // Position du titre
      }
    }

    // ÉTAPE 5 : Traiter la dernière section (pas de titre suivant)
    if (currentSection !== null) {
      // La dernière section va jusqu'à la fin du fichier
      const sectionLines = lines.slice(sectionStart + 1);
      
      sections[currentSection] = {
        start: sectionStart,
        end: lines.length,        // Fin du fichier
        lines: sectionLines
      };
      
      console.log(`📄 Section "${currentSection}": ${sectionLines.length} lignes`);
    }

    // ÉTAPE 6 : Log du résultat et retour
    console.log('✅ Sections trouvées:', Object.keys(sections));
    return sections;
  }

  // ===========================================================================
  // MÉTHODES DE MODIFICATION DES FICHIERS
  // ===========================================================================

  /**
   * Crée automatiquement les sections manquantes dans un fichier
   * 
   * PROCESSUS :
   * 1. Parser les sections existantes
   * 2. Comparer avec les sections requises par le layout
   * 3. Identifier les sections manquantes
   * 4. Trouver le point d'insertion optimal
   * 5. Générer le contenu des nouvelles sections
   * 6. Insérer et sauvegarder
   * 
   * STRATÉGIE D'INSERTION :
   * - Après le frontmatter YAML (s'il existe)
   * - Sinon au début du fichier
   * - Chaque section avec titre H1 et ligne vide
   * 
   * @param file - Fichier à modifier
   * @param layout - Layout définissant les sections requises
   * @returns Promise<boolean> - true si des sections ont été créées
   * 
   * @example
   * // Layout requiert : ["Section A", "Section B", "Section C"]
   * // Fichier contient : ["Section A", "Section C"]
   * // Résultat : Ajoute "Section B" au fichier
   */
  async createMissingSections(file: TFile, layout: BoardLayout[]): Promise<boolean> {
    console.log('🔧 Vérification des sections manquantes...');
    
    // ÉTAPE 1 : Analyser l'état actuel du fichier
    const sections = await this.parseSections(file);
    const existingSections = Object.keys(sections);
    const requiredSections = layout.map(block => block.title);
    
    // ÉTAPE 2 : Identifier les sections manquantes
    const missingSections = requiredSections.filter(section => 
      !existingSections.includes(section)
    );

    // ÉTAPE 3 : Vérifier s'il y a du travail à faire
    if (missingSections.length === 0) {
      console.log('✅ Toutes les sections sont présentes');
      return false;  // Aucune modification nécessaire
    }

    console.log('📝 Sections manquantes détectées:', missingSections);
    
    // ÉTAPE 4 : Préparer la modification du fichier
    const content = await this.app.vault.read(file);
    const lines = content.split('\n');

    // ÉTAPE 5 : Trouver le point d'insertion optimal
    const insertionPoint = this.findInsertionPoint(lines);
    
    // ÉTAPE 6 : Générer le contenu des nouvelles sections
    const newSectionLines: string[] = [];
    for (const sectionTitle of missingSections) {
      newSectionLines.push('');              // Ligne vide avant la section
      newSectionLines.push(`# ${sectionTitle}`);  // Titre H1
      newSectionLines.push('');              // Ligne vide après le titre
    }

    // ÉTAPE 7 : Insérer les nouvelles sections dans le contenu
    const updatedLines = [
      ...lines.slice(0, insertionPoint),     // Contenu avant insertion
      ...newSectionLines,                    // Nouvelles sections
      ...lines.slice(insertionPoint)        // Contenu après insertion
    ];

    // ÉTAPE 8 : Sauvegarder le fichier modifié
    // vault.modify() sauvegarde et met à jour les métadonnées
    await this.app.vault.modify(file, updatedLines.join('\n'));
    
    console.log(`✅ ${missingSections.length} sections ajoutées:`, missingSections);
    return true;  // Modifications effectuées
  }

  /**
   * Trouve le point d'insertion optimal pour les nouvelles sections
   * 
   * LOGIQUE :
   * 1. Chercher un frontmatter YAML (entre --- ... ---)
   * 2. Si frontmatter trouvé : insérer après
   * 3. Sinon : insérer au début du fichier
   * 
   * FRONTMATTER YAML :
   * Bloc de métadonnées au début des fichiers markdown :
   * ---
   * title: Mon titre
   * tags: [tag1, tag2]
   * ---
   * 
   * @param lines - Lignes du fichier
   * @returns number - Index de ligne où insérer
   * 
   * @example
   * // Fichier avec frontmatter :
   * // ---
   * // title: Test
   * // ---
   * // # Existing Section
   * 
   * findInsertionPoint(lines); // Retourne 3 (après le frontmatter)
   */
  private findInsertionPoint(lines: string[]): number {
    // VARIABLES D'ÉTAT pour le parsing du frontmatter
    let frontmatterEnd = 0;
    let inFrontmatter = false;
    
    // BOUCLE de détection du frontmatter
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Première ligne : doit être "---" pour commencer un frontmatter
      if (i === 0 && line === '---') {
        inFrontmatter = true;
        continue;
      }
      
      // Si on est dans le frontmatter et qu'on trouve "---", c'est la fin
      if (inFrontmatter && line === '---') {
        frontmatterEnd = i + 1;  // Ligne après le frontmatter
        break;
      }
    }

    // DÉCISION du point d'insertion
    if (frontmatterEnd === 0) {
      // Pas de frontmatter trouvé : insérer au début
      return 0;
    } else {
      // Frontmatter trouvé : insérer après
      return frontmatterEnd;
    }
  }

  /**
   * Met à jour le contenu d'une section spécifique
   * 
   * PROCESSUS :
   * 1. Parser les sections pour trouver la section cible
   * 2. Remplacer son contenu par le nouveau
   * 3. Conserver le titre et la structure
   * 4. Sauvegarder le fichier
   * 
   * UTILISATION :
   * Appelée par MarkdownFrame quand l'utilisateur modifie une section
   * dans l'interface Board.
   * 
   * @param file - Fichier à modifier
   * @param sectionName - Nom de la section à mettre à jour
   * @param newContent - Nouveau contenu (sans le titre #)
   * 
   * @example
   * await fileService.updateSection(file, "Urgent et Important", "- Nouvelle tâche\n- Autre tâche");
   */
  async updateSection(file: TFile, sectionName: string, newContent: string): Promise<void> {
    // ÉTAPE 1 : Lire et parser le fichier
    const content = await this.app.vault.read(file);
    const lines = content.split('\n');
    const sections = await this.parseSections(file);
    const section = sections[sectionName];
    
    // ÉTAPE 2 : Vérifier que la section existe
    if (!section) {
      console.warn(`⚠️ Section "${sectionName}" non trouvée pour mise à jour`);
      return;
    }

    // ÉTAPE 3 : Construire le nouveau contenu
    const newLines = [
      ...lines.slice(0, section.start + 1),  // Avant la section (inclus le titre)
      ...newContent.split('\n'),             // Nouveau contenu
      ...lines.slice(section.end)            // Après la section
    ];

    // ÉTAPE 4 : Sauvegarder
    await this.app.vault.modify(file, newLines.join('\n'));
    console.log(`✅ Section "${sectionName}" mise à jour`);
  }

  // ===========================================================================
  // MÉTHODES UTILITAIRES
  // ===========================================================================

  /**
   * Identifie les sections manquantes par rapport à un layout
   * 
   * ALGORITHME SIMPLE :
   * Filtre les sections requises qui ne sont pas dans les sections existantes.
   * 
   * FONCTION PURE :
   * - Pas d'effets de bord
   * - Même entrée = même sortie
   * - Facilement testable
   * 
   * @param existingSections - Sections actuellement présentes
   * @param requiredSections - Sections requises par le layout
   * @returns string[] - Liste des sections manquantes
   * 
   * @example
   * const missing = fileService.getMissingSections(
   *   ["Section A", "Section C"],           // Existantes
   *   ["Section A", "Section B", "Section C"]  // Requises
   * );
   * // Retourne : ["Section B"]
   */
  getMissingSections(existingSections: string[], requiredSections: string[]): string[] {
    return requiredSections.filter(section => 
      !existingSections.includes(section)
    );
  }
}

// =============================================================================
// NOTES POUR LES DÉBUTANTS
// =============================================================================

/*
CONCEPTS CLÉS À RETENIR :

1. **Service Layer Pattern** :
   - Encapsule la logique métier
   - Sépare les responsabilités
   - Facilite les tests et la maintenance
   - Interface claire entre domaines

2. **Parsing de Fichiers** :
   - Traitement ligne par ligne
   - Machine à états (section courante)
   - Gestion des cas limites
   - Expressions régulières pour pattern matching

3. **API Obsidian** :
   - TFile : Représentation d'un fichier
   - vault.read() : Lecture asynchrone
   - vault.modify() : Écriture avec mise à jour automatique
   - Gestion des erreurs et exceptions

4. **Manipulation de Chaînes** :
   - split('\n') : Découpage en lignes
   - slice() : Extraction de sous-tableaux
   - join('\n') : Reconstruction du contenu
   - trim() : Suppression des espaces

BONNES PRATIQUES APPLIQUÉES :

1. **Gestion d'Erreurs** :
   - Vérification des préconditions
   - Retours explicites (boolean, null checks)
   - Logs informatifs pour le débogage
   - Fallbacks pour cas imprévus

2. **Performance** :
   - Parsing en une seule passe
   - Éviter les regex coûteuses
   - Manipulation efficace des tableaux
   - Logs conditionnels

3. **Lisibilité** :
   - Noms de variables explicites
   - Commentaires sur l'algorithme
   - Décomposition en étapes claires
   - Exemples dans la documentation

4. **Testabilité** :
   - Injection de dépendance (App)
   - Fonctions pures quand possible
   - Interfaces claires
   - Séparation des responsabilités

ÉVOLUTION POSSIBLE :

1. **Optimisations** :
   - Cache des sections parsées
   - Parsing incrémental
   - Validation de schemas
   - Support de markdown complexe

2. **Fonctionnalités** :
   - Backup avant modification
   - Historique des changements
   - Validation du contenu
   - Support de templates

3. **Robustesse** :
   - Gestion des conflits
   - Récupération d'erreurs
   - Validation stricte
   - Logs structurés
*/