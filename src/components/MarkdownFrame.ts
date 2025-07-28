/**
 * =============================================================================
 * COMPOSANT D'ÉDITION MARKDOWN INTERACTIF POUR LES SECTIONS DE BOARD
 * =============================================================================
 * * Ce composant gère l'affichage et l'édition d'une section markdown individuelle
 * dans une frame de board. Il permet de basculer entre vue preview et édition.
 * * RESPONSABILITÉS PRINCIPALES :
 * - Afficher le contenu markdown rendu (mode preview)
 * - Permettre l'édition inline du contenu (mode édition)
 * - Gérer les interactions avec les éléments markdown (tâches, liens)
 * - Sauvegarder automatiquement les modifications
 * - Intégrer avec le moteur de rendu Obsidian
 * * MODES DE FONCTIONNEMENT :
 * 1. Mode Preview : Affichage du markdown rendu avec interactions
 * 2. Mode Édition : Textarea pour modification directe du contenu
 * 3. Basculement automatique : Clic → édition, Blur/Escape → preview
 * * CONCEPTS OBSIDIAN IMPORTANTS :
 * - MarkdownRenderer : Moteur de rendu officiel d'Obsidian
 * - Component : Système de cycle de vie pour les rendus
 * - Plugins Markdown : Support des extensions comme Tasks, Dataview
 * - Variables CSS : Intégration avec le thème d'Obsidian
 * * INTERACTIONS SUPPORTÉES :
 * - Tâches cochables (checkbox tasks)
 * - Liens internes Obsidian [[...]]
 * - Éléments Dataview et autres plugins
 * - Navigation par liens avec openLinkText()
 * * PATTERN DE CONCEPTION :
 * - Component Pattern : Composant réutilisable et auto-géré
 * - State Machine : Bascule entre états preview/édition
 * - Observer Pattern : Callback pour notifier les changements
 * - Debouncing : Délai avant sauvegarde pour optimiser
 */

// =============================================================================
// IMPORTS
// =============================================================================

// Import des classes Obsidian pour manipulation des fichiers et rendu
import { App, TFile } from 'obsidian';

// Import des types personnalisés depuis notre fichier de types
// ATTENTION : Chemin relatif corrigé (pas d'alias @/)
import { FileSection } from '../types';

// =============================================================================
// CLASSE PRINCIPALE DU COMPOSANT
// =============================================================================

/**
 * Composant d'édition markdown interactif
 * * ARCHITECTURE :
 * Ce composant encapsule complètement la logique d'affichage et d'édition
 * d'une section markdown. Il gère son propre état et cycle de vie.
 * * CYCLE DE VIE :
 * 1. Construction avec paramètres
 * 2. Initialisation de l'interface (preview + éditeur)
 * 3. Gestion des événements utilisateur
 * 4. Mise à jour du contenu selon les modifications
 * 5. Destruction propre lors du nettoyage
 * * ÉTAT INTERNE :
 * - Mode actuel (preview/édition)
 * - Contenu markdown
 * - Références aux éléments DOM
 * - Timer de sauvegarde automatique
 */
export class MarkdownFrame {
  
  // ===========================================================================
  // PROPRIÉTÉS D'ÉTAT DU COMPOSANT
  // ===========================================================================
  
  /**
   * Indicateur du mode d'édition actuel
   * * ÉTATS POSSIBLES :
   * - false : Mode preview (affichage rendu)
   * - true : Mode édition (textarea visible)
   */
  private isEditing = false;
  
  /**
   * Conteneur pour l'affichage du markdown rendu
   * * UTILISATION :
   * Contient le HTML généré par le moteur de rendu Obsidian.
   * Visible en mode preview, caché en mode édition.
   */
  private previewContainer!: HTMLElement;
  
  /**
   * Conteneur pour l'interface d'édition
   * * UTILISATION :
   * Contient le textarea d'édition.
   * Visible en mode édition, caché en mode preview.
   */
  private editorContainer!: HTMLElement;
  
  /**
   * Zone de texte pour l'édition directe
   * * CONFIGURATION :
   * Styling pour s'intégrer avec le thème Obsidian.
   * Événements pour sauvegarder et basculer les modes.
   */
  private textArea!: HTMLTextAreaElement;
  
  /**
   * Contenu markdown actuel de la section
   * * SYNCHRONISATION :
   * Maintenu en sync avec le textarea et les callbacks.
   * Source de vérité pour l'état du composant.
   */
  private content: string;
  
  /**
   * Timer pour la sauvegarde différée
   * * DEBOUNCING :
   * Évite de sauvegarder à chaque frappe.
   * Améliore les performances et l'expérience utilisateur.
   */
  private changeTimeout: any;

  // ===========================================================================
  // CONSTRUCTEUR ET INITIALISATION
  // ===========================================================================

  /**
   * CONSTRUCTEUR du composant MarkdownFrame
   * * @param app - Instance principale d'Obsidian
   * @param container - Élément DOM parent où injecter le composant
   * @param file - Fichier source contenant cette section
   * @param section - Métadonnées de la section (lignes, position)
   * @param onChange - Callback appelé lors des modifications
   * * INJECTION DE DÉPENDANCES :
   * - app : Pour accès aux APIs Obsidian (rendu, navigation)
   * - container : Pour manipulation DOM
   * - file : Pour contexte de rendu (chemins relatifs, etc.)
   * - onChange : Pour notifier le parent des changements
   * * INITIALISATION :
   * Le constructeur démarre immédiatement l'initialisation complète.
   * * @example
   * const frame = new MarkdownFrame(
   * app,
   * frameElement,
   * currentFile,
   * sectionData,
   * (newContent) => saveToFile(sectionName, newContent)
   * );
   */
  constructor(
    private app: App,
    private container: HTMLElement,
    private file: TFile,
    private section: FileSection,
    private onChange: (content: string) => void
  ) {
    // INITIALISATION DU CONTENU
    // Joindre les lignes de la section avec retours à la ligne
    this.content = section.lines.join('\n');
    
    // DÉMARRAGE DE L'INITIALISATION
    this.initializeFrame();
  }

  /**
   * Initialise complètement l'interface du composant
   * * ÉTAPES D'INITIALISATION :
   * 1. Configuration du conteneur principal
   * 2. Création du conteneur preview
   * 3. Création du conteneur d'édition
   * 4. Affichage initial en mode preview
   * * PATTERN TEMPLATE METHOD :
   * Orchestration de l'initialisation en étapes définies.
   */
  private initializeFrame(): void {
    this.setupContainer();
    this.createPreviewContainer();
    this.createEditorContainer();
    this.showPreview();
  }

  /**
   * Configure le conteneur principal du composant
   * * NETTOYAGE :
   * Vide le conteneur existant pour éviter les conflits.
   * * STYLES CSS :
   * - Position relative pour positionnement des enfants
   * - Overflow hidden pour contenir le contenu
   * - Dimensions 100% pour remplir l'espace disponible
   */
  private setupContainer(): void {
    // NETTOYAGE PRÉALABLE
    this.container.empty();
    
    // CONFIGURATION CSS
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    `;
  }

  // ===========================================================================
  // CRÉATION DES INTERFACES PREVIEW ET ÉDITION
  // ===========================================================================

  /**
   * Crée et configure le conteneur de preview (affichage rendu)
   * * RESPONSABILITÉS :
   * - Affichage du contenu markdown rendu
   * - Gestion des interactions (clics, tâches, liens)
   * - Détection du basculement vers l'édition
   * * STYLES :
   * Intégration avec les variables CSS d'Obsidian pour cohérence visuelle.
   */
  private createPreviewContainer(): void {
    // CRÉATION DE L'ÉLÉMENT
    this.previewContainer = this.container.createDiv('markdown-preview');
    
    // CONFIGURATION CSS
    this.previewContainer.style.cssText = `
      width: 100%;
      height: 100%;
      overflow: auto;
      padding: 0.5rem;
      cursor: text;
      box-sizing: border-box;
    `;
    
    // RENDU INITIAL DU CONTENU
    this.renderContent();
    
    // CONFIGURATION DES ÉVÉNEMENTS
    this.setupPreviewEvents();
  }

  /**
   * Crée et configure le conteneur d'édition (textarea)
   * * RESPONSABILITÉS :
   * - Interface de modification directe du markdown
   * - Sauvegarde automatique des changements
   * - Gestion des raccourcis clavier (Escape)
   * * VISIBILITÉ :
   * Initialement caché, affiché seulement en mode édition.
   */
  private createEditorContainer(): void {
    // CRÉATION DU CONTENEUR
    this.editorContainer = this.container.createDiv('markdown-editor');
    this.editorContainer.style.cssText = `
      width: 100%;
      height: 100%;
      display: none;
      box-sizing: border-box;
    `;

    // CRÉATION DU TEXTAREA
    this.textArea = this.editorContainer.createEl('textarea');
    this.textArea.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      outline: none;
      resize: none;
      font-family: var(--font-text);
      font-size: var(--font-size-normal);
      background: transparent;
      color: var(--text-normal);
      padding: 0.5rem;
      box-sizing: border-box;
      line-height: 1.6;
    `;

    // INITIALISATION DU CONTENU
    this.textArea.value = this.content;
    
    // CONFIGURATION DES ÉVÉNEMENTS
    this.setupEditorEvents();
  }

  // ===========================================================================
  // MOTEUR DE RENDU MARKDOWN
  // ===========================================================================

  /**
   * Rend le contenu markdown avec le moteur officiel d'Obsidian
   * * MOTEUR DE RENDU :
   * Utilise MarkdownRenderer.renderMarkdown() qui supporte :
   * - Toutes les extensions markdown d'Obsidian
   * - Plugins tiers (Tasks, Dataview, etc.)
   * - Liens internes et navigation
   * - Syntaxe avancée (callouts, etc.)
   * * FALLBACK :
   * En cas d'erreur, utilise un moteur de rendu simple
   * pour maintenir la fonctionnalité de base.
   * * GESTION DU CONTENU VIDE :
   * Affiche un placeholder engageant pour inciter à l'édition.
   */
  private async renderContent(): Promise<void> {
    // NETTOYAGE PRÉALABLE
    this.previewContainer.empty();
    
    // CAS SPÉCIAL : CONTENU VIDE
    if (!this.content.trim()) {
      this.renderEmptyState();
      return;
    }

    // RENDU AVEC LE MOTEUR OBSIDIAN
    try {
      // IMPORT DYNAMIQUE pour éviter les erreurs de dépendance
      const { MarkdownRenderer, Component } = require('obsidian');
      const component = new Component();
      
      // RENDU OFFICIEL OBSIDIAN
      // Supporte tous les plugins et extensions
      await MarkdownRenderer.renderMarkdown(
        this.content,                 // Contenu à rendre
        this.previewContainer,        // Conteneur de destination
        this.file.path,              // Contexte de fichier (pour liens relatifs)
        component                    // Composant pour cycle de vie
      );
      
      console.log('✅ Contenu rendu avec le moteur Obsidian (plugins supportés)');
      
      // POST-TRAITEMENT pour interactions
      this.setupInteractions();
      
    } catch (error) {
      // FALLBACK : Rendu simple en cas d'erreur
      console.warn('⚠️ Erreur rendu Obsidian, fallback vers rendu simple:', error);
      this.previewContainer.innerHTML = this.renderSimpleMarkdown(this.content);
    }
  }

  /**
   * Configure les interactions avec les éléments rendus
   * * INTERACTIONS SUPPORTÉES :
   * 1. Tâches cochables (Tasks plugin)
   * 2. Liens internes Obsidian
   * 3. Liens externes
   * 4. Éléments Dataview
   * * PATTERN EVENT DELEGATION :
   * Ajoute des écouteurs sur les éléments spécifiques
   * plutôt que sur le conteneur global.
   * * PRÉVENTION DE PROPAGATION :
   * Empêche les clics sur éléments interactifs de déclencher
   * le mode édition.
   */
  private setupInteractions(): void {
    // INTERACTION 1 : TÂCHES COCHABLES
    // Trouve toutes les checkbox de tâches et ajoute la gestion
    const taskCheckboxes = this.previewContainer.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');
    taskCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        this.handleTaskToggle(target);
      });
    });

    // INTERACTION 2 : LIENS INTERNES OBSIDIAN
    // Gestion de la navigation via les liens [[...]]
    const internalLinks = this.previewContainer.querySelectorAll('a.internal-link');
    internalLinks.forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        
        // Récupération du lien cible
        const href = link.getAttribute('data-href') || link.getAttribute('href');
        if (href) {
          // NAVIGATION OBSIDIAN
          // openLinkText gère tous types de liens internes
          this.app.workspace.openLinkText(href, this.file.path);
        }
      });
    });

    // INTERACTION 3 : PRÉVENTION GLOBALE
    // Empêche les clics sur éléments interactifs de déclencher l'édition
    const interactiveElements = this.previewContainer.querySelectorAll('input, button, a, .dataview, .task-list-item');
    interactiveElements.forEach(element => {
      element.addEventListener('click', (event) => {
        event.stopPropagation();  // Empêche la propagation vers le conteneur
      });
    });
  }

  /**
   * Gère le cochage/décochage des tâches
   * * ALGORITHME :
   * 1. Identifier la tâche modifiée dans le DOM
   * 2. Trouver la ligne correspondante dans le markdown
   * 3. Mettre à jour la syntaxe de tâche ([ ] ↔ [x])
   * 4. Déclencher la sauvegarde automatique
   * * SYNCHRONISATION :
   * Maintient la cohérence entre affichage et source markdown.
   * * @param checkbox - Élément checkbox qui a été modifié
   * * @example
   * // Utilisateur coche une tâche dans l'affichage
   * // handleTaskToggle() met à jour le markdown :
   * // "- [ ] Tâche" → "- [x] Tâche"
   */
  private handleTaskToggle(checkbox: HTMLInputElement): void {
    const isChecked = checkbox.checked;
    const listItem = checkbox.closest('li');
    
    if (!listItem) return;

    // EXTRACTION DU TEXTE DE LA TÂCHE
    const taskText = this.getTaskTextFromListItem(listItem);
    if (!taskText) return;

    // MISE À JOUR DU MARKDOWN
    const lines = this.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // IDENTIFICATION DE LA LIGNE DE TÂCHE
      if (this.isTaskLine(line) && this.getTaskTextFromLine(line) === taskText) {
        // BASCULEMENT DE L'ÉTAT
        const newCheckState = isChecked ? '[x]' : '[ ]';
        lines[i] = line.replace(/\[[ x]\]/, newCheckState);
        
        // MISE À JOUR DU CONTENU
        this.content = lines.join('\n');
        
        // SAUVEGARDE DIFFÉRÉE
        clearTimeout(this.changeTimeout);
        this.changeTimeout = setTimeout(() => {
          this.onChange(this.content);
        }, 500);
        
        console.log(`✅ Tâche ${isChecked ? 'cochée' : 'décochée'}: ${taskText}`);
        break;
      }
    }
  }

  /**
   * Extrait le texte d'une tâche depuis un élément de liste DOM
   * * @param listItem - Élément <li> contenant la tâche
   * @returns string | null - Texte de la tâche ou null si non trouvé
   */
  private getTaskTextFromListItem(listItem: HTMLElement): string | null {
    // Le texte de la tâche est généralement dans le dernier nœud texte
    const textNode = listItem.childNodes[listItem.childNodes.length - 1];
    return textNode?.textContent?.trim() || null;
  }

  /**
   * Vérifie si une ligne markdown est une tâche
   * * @param line - Ligne de texte à vérifier
   * @returns boolean - true si c'est une ligne de tâche
   * * @example
   * isTaskLine("- [x] Tâche terminée");  // true
   * isTaskLine("- [ ] Tâche à faire");   // true
   * isTaskLine("- Simple liste");        // false
   */
  private isTaskLine(line: string): boolean {
    // REGEX pour détecter les tâches : espaces optionnels + liste + checkbox
    return /^[\s]*[-*+] \[[ x]\]/.test(line);
  }

  /**
   * Extrait le texte d'une tâche depuis une ligne markdown
   * * @param line - Ligne markdown contenant une tâche
   * @returns string - Texte de la tâche (sans la syntaxe de liste/checkbox)
   */
  private getTaskTextFromLine(line: string): string {
    const match = line.match(/^[\s]*[-*+] \[[ x]\] (.+)$/);
    return match ? match[1].trim() : '';
  }

  /**
   * Moteur de rendu markdown simple (fallback)
   * * UTILISATION :
   * Quand le moteur Obsidian n'est pas disponible ou échoue.
   * Supporte la syntaxe markdown de base.
   * * FONCTIONNALITÉS :
   * - Liens internes [[...]]
   * - Gras **texte**
   * - Italique *texte*
   * - Listes simples
   * * @param content - Contenu markdown à rendre
   * @returns string - HTML généré
   */
  private renderSimpleMarkdown(content: string): string {
    let html = content;
    
    // TRANSFORMATION 1 : Liens internes [[...]]
    html = html.replace(/\[\[([^\]]+)\]\]/g, '<span class="internal-link">$1</span>');
    
    // TRANSFORMATION 2 : Gras **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // TRANSFORMATION 3 : Italique *text*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // TRANSFORMATION 4 : Listes simples
    html = html.replace(/^[\s]*[-*+] (.+)$/gm, '<li>$1</li>');
    
    // TRANSFORMATION 5 : Regroupement des listes
    const lines = html.split('\n');
    let result = '';
    let inList = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('<li>')) {
        if (!inList) {
          result += '<ul>\n';
          inList = true;
        }
        result += line + '\n';
      } else {
        if (inList) {
          result += '</ul>\n';
          inList = false;
        }
        
        if (trimmed === '') {
          result += '<br>\n';
        } else {
          result += `<p>${trimmed}</p>\n`;
        }
      }
    }
    
    // FERMETURE DE LISTE EN COURS
    if (inList) {
      result += '</ul>\n';
    }
    
    return result;
  }

  /**
   * Affiche un état vide engageant pour inciter à l'édition
   * * DESIGN UX :
   * Message clair et incitatif plutôt qu'un vide intimidant.
   * Style cohérent avec l'interface Obsidian.
   */
  private renderEmptyState(): void {
    const placeholder = this.previewContainer.createDiv('empty-placeholder');
    placeholder.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 80px;
      color: var(--text-muted);
      font-style: italic;
      cursor: text;
    `;
    placeholder.textContent = 'Cliquez pour commencer à écrire...';
  }

  // ===========================================================================
  // GESTION DES ÉVÉNEMENTS ET INTERACTIONS
  // ===========================================================================

  /**
   * Configure les événements du mode preview
   * * DÉTECTION INTELLIGENTE :
   * Distingue les clics sur éléments interactifs des clics d'édition.
   * Évite le basculement involontaire vers l'édition.
   */
  private setupPreviewEvents(): void {
    this.previewContainer.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // FILTRAGE : Ne pas éditer si clic sur élément interactif
      if (this.isInteractiveElement(target)) {
        console.log('🎯 Clic sur élément interactif, pas de mode édition');
        return;
      }
      
      console.log('🖱️ Clic sur preview → mode édition');
      this.enterEditMode();
    });
  }

  /**
   * Détecte si un élément est interactif (ne doit pas déclencher l'édition)
   * * ÉLÉMENTS INTERACTIFS :
   * - Éléments HTML standard : input, button, a, select
   * - Éléments Obsidian : liens internes, tags
   * - Éléments de plugins : dataview, tasks
   * - Éléments avec attributs spéciaux
   * * ALGORITHME :
   * Remonte la hiérarchie DOM pour vérifier tous les parents.
   * Un élément est interactif si lui ou un parent l'est.
   * * @param element - Élément à vérifier
   * @returns boolean - true si interactif
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    let current: HTMLElement | null = element;
    
    // REMONTÉE DE LA HIÉRARCHIE DOM
    while (current && current !== this.previewContainer) {
      const tagName = current.tagName.toLowerCase();
      const classList = Array.from(current.classList);
      
      // VÉRIFICATION 1 : Éléments HTML interactifs
      if (['input', 'button', 'a', 'select', 'textarea'].includes(tagName)) {
        return true;
      }
      
      // VÉRIFICATION 2 : Classes spéciales d'Obsidian et plugins
      const interactiveClasses = [
        'internal-link',
        'external-link',
        'tag',
        'dataview',
        'task-list-item-checkbox',
        'task-list-item',
        'cm-hmd-codeblock',
        'block-language-dataview',
        'block-language-tasks'
      ];
      
      if (interactiveClasses.some(cls => classList.includes(cls))) {
        return true;
      }
      
      // VÉRIFICATION 3 : Attributs spéciaux
      if (current.hasAttribute('href') || 
          current.hasAttribute('data-href') || 
          current.hasAttribute('data-task') ||
          current.hasAttribute('contenteditable')) {
        return true;
      }
      
      // REMONTÉE AU PARENT
      current = current.parentElement;
    }
    
    return false;
  }

  /**
   * Configure les événements du mode édition
   * * ÉVÉNEMENTS GÉRÉS :
   * - input : Sauvegarde différée des modifications
   * - blur : Retour automatique au mode preview
   * - keydown : Raccourcis clavier (Escape)
   */
  private setupEditorEvents(): void {
    // ÉVÉNEMENT 1 : Modification du contenu
    this.textArea.addEventListener('input', () => {
      this.content = this.textArea.value;
      
      // SAUVEGARDE DIFFÉRÉE (DEBOUNCING)
      clearTimeout(this.changeTimeout);
      this.changeTimeout = setTimeout(() => {
        this.onChange(this.content);
      }, 1000);
    });

    // ÉVÉNEMENT 2 : Perte de focus (sortie d'édition)
    this.textArea.addEventListener('blur', () => {
      console.log('📝 Blur sur textarea → mode preview');
      this.exitEditMode();
    });

    // ÉVÉNEMENT 3 : Raccourcis clavier
    this.textArea.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        console.log('⌨️ Escape → mode preview');
        this.exitEditMode();
      }
    });
  }

  // ===========================================================================
  // GESTION DES MODES (PREVIEW ↔ ÉDITION)
  // ===========================================================================

  /**
   * Bascule vers le mode édition
   * * PROCESSUS :
   * 1. Marquer l'état comme "en édition"
   * 2. Cacher le preview
   * 3. Afficher l'éditeur
   * 4. Synchroniser le contenu
   * 5. Donner le focus au textarea
   */
  private enterEditMode(): void {
    this.isEditing = true;
    this.previewContainer.style.display = 'none';
    this.editorContainer.style.display = 'block';
    this.textArea.value = this.content;
    this.textArea.focus();
    console.log('✏️ Mode édition activé');
  }

  /**
   * Bascule vers le mode preview
   * * PROCESSUS :
   * 1. Vérifier qu'on est bien en édition
   * 2. Récupérer le contenu du textarea
   * 3. Cacher l'éditeur
   * 4. Afficher le preview
   * 5. Re-rendre le contenu
   */
  private exitEditMode(): void {
    if (!this.isEditing) return;
    
    this.isEditing = false;
    this.content = this.textArea.value;
    this.editorContainer.style.display = 'none';
    this.previewContainer.style.display = 'block';
    this.renderContent();
    console.log('👁️ Mode preview activé');
  }

  /**
   * Force l'affichage du mode preview
   * * UTILISATION :
   * Initialisation du composant et réinitialisations.
   */
  private showPreview(): void {
    this.previewContainer.style.display = 'block';
    this.editorContainer.style.display = 'none';
    this.isEditing = false;
  }

  // ===========================================================================
  // API PUBLIQUE DU COMPOSANT
  // ===========================================================================

  /**
   * Met à jour le contenu de la section
   * * UTILISATION :
   * Quand le fichier source est modifié externement.
   * Maintient la synchronisation avec la source de vérité.
   * * @param section - Nouvelles données de section
   */
  updateContent(section: FileSection): void {
    this.section = section;
    this.content = section.lines.join('\n');
    
    if (this.isEditing) {
      // MODE ÉDITION : Mettre à jour le textarea
      this.textArea.value = this.content;
    } else {
      // MODE PREVIEW : Re-rendre le contenu
      this.renderContent();
    }
  }

  /**
   * Obtient le contenu actuel de la section
   * * @returns string - Contenu markdown actuel
   */
  getContent(): string {
    return this.isEditing ? this.textArea.value : this.content;
  }

  /**
   * Détruit proprement le composant
   * * NETTOYAGE :
   * - Vide le conteneur DOM
   * - Annule les timers en cours
   * - Libère les références
   * * UTILISATION :
   * Appelée lors du nettoyage de la BoardView.
   */
  destroy(): void {
    this.container.empty();
    console.log('🗑️ MarkdownFrame détruite');
  }
}