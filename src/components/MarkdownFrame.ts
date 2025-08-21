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
 * 
 * ✅ CORRECTION BUG #4 : Gestion d'erreurs complète avec fallbacks
 */

// =============================================================================
// IMPORTS
// =============================================================================

// Import des classes Obsidian pour manipulation des fichiers et rendu
import { App, TFile } from 'obsidian';

// Import des types personnalisés depuis notre fichier de types
import { FileSection } from '../types';

import { LoggerService } from '../services/LoggerService';

// =============================================================================
// CLASSE PRINCIPALE DU COMPOSANT
// =============================================================================

/**
 * Composant d'édition markdown interactif avec gestion d'erreurs robuste
 * 
 * ✅ AMÉLIORATIONS Bug #4 :
 * - Try-catch global sur toutes les opérations critiques
 * - Fallbacks intelligents en cas d'erreur de rendu
 * - Recovery automatique des états incohérents
 * - Logging détaillé des erreurs pour debugging
 * - Validation des données avant traitement
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

  /**
   * Logger pour les messages de debug et info
   * * UTILISATION :
   * Pour suivre le cycle de vie du composant et les erreurs.
   * Permet de désactiver les logs en production.
   */
  private logger: LoggerService;

  /**
   * ✅ NOUVEAU : Indicateur d'état d'erreur
   */
  private isInErrorState = false;

  /**
   * ✅ NOUVEAU : Compteur de tentatives de rendu
   */
  private renderAttempts = 0;
  private readonly MAX_RENDER_ATTEMPTS = 3;

  // ===========================================================================
  // CONSTRUCTEUR ET INITIALISATION
  // ===========================================================================

  /**
   * CONSTRUCTEUR du composant MarkdownFrame avec validation robuste
   */
  constructor(
    private app: App,
    private container: HTMLElement,
    private file: TFile,
    private section: FileSection,
    private onChange: (content: string) => void,
    logger: LoggerService
  ) {
    this.logger = logger;
    
    try {
      // ✅ VALIDATION DES PARAMÈTRES
      this.validateConstructorParams();
      
      // INITIALISATION DU CONTENU
      this.content = section.lines.join('\n');
      
      // DÉMARRAGE DE L'INITIALISATION avec gestion d'erreurs
      this.initializeFrame();
      
      this.logger.info('✅ MarkdownFrame initialisé avec succès', {
        sectionName: section.name,
        contentLength: this.content.length
      });
      
    } catch (error) {
      this.logger.error('❌ Erreur critique lors de l\'initialisation de MarkdownFrame', error);
      this.initializeErrorState();
    }
  }

  /**
   * ✅ NOUVEAU : Validation des paramètres du constructeur
   */
  private validateConstructorParams(): void {
    if (!this.app) {
      throw new Error('App Obsidian requis');
    }
    if (!this.container) {
      throw new Error('Container DOM requis');
    }
    if (!this.file) {
      throw new Error('Fichier TFile requis');
    }
    if (!this.section) {
      throw new Error('Section FileSection requise');
    }
    if (!this.onChange || typeof this.onChange !== 'function') {
      throw new Error('Callback onChange requis');
    }
    if (!this.logger) {
      throw new Error('Logger requis');
    }
  }

  /**
   * ✅ NOUVEAU : Initialise un état d'erreur de base
   */
  private initializeErrorState(): void {
    try {
      this.isInErrorState = true;
      this.container.empty();
      
      const errorDiv = this.container.createDiv('markdown-frame-error');
      errorDiv.innerHTML = `
        <div style="
          color: var(--text-error);
          background: var(--background-secondary);
          border: 1px solid var(--background-modifier-border);
          border-radius: 4px;
          padding: 1rem;
          text-align: center;
        ">
          <h4>⚠️ Erreur de composant</h4>
          <p>Impossible d'initialiser cette section.</p>
          <button onclick="location.reload()" style="
            background: var(--interactive-accent);
            color: var(--text-on-accent);
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
          ">
            🔄 Recharger
          </button>
        </div>
      `;
      
    } catch (fallbackError) {
      this.logger.error('❌ Erreur critique dans initializeErrorState', fallbackError);
      // Dernier recours : affichage texte simple
      this.container.textContent = '⚠️ Erreur critique - Veuillez recharger la page';
    }
  }

  /**
   * Initialise complètement l'interface du composant avec gestion d'erreurs
   */
  private initializeFrame(): void {
    try {
      this.setupContainer();
      this.createPreviewContainer();
      this.createEditorContainer();
      this.showPreview();
      
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'initialisation de la frame', error);
      this.initializeErrorState();
    }
  }

  /**
   * Configure le conteneur principal du composant
   */
  private setupContainer(): void {
    try {
      // NETTOYAGE PRÉALABLE
      this.container.empty();
      
      // CONFIGURATION CSS
      this.container.style.cssText = `
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
      `;
      
    } catch (error) {
      this.logger.error('❌ Erreur setupContainer', error);
      throw error; // Remonte l'erreur pour gestion de niveau supérieur
    }
  }

  // ===========================================================================
  // CRÉATION DES INTERFACES PREVIEW ET ÉDITION
  // ===========================================================================

  /**
   * Crée et configure le conteneur de preview (affichage rendu)
   */
  private createPreviewContainer(): void {
    try {
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
      
    } catch (error) {
      this.logger.error('❌ Erreur createPreviewContainer', error);
      throw error;
    }
  }

  /**
   * Crée et configure le conteneur d'édition (textarea)
   */
  private createEditorContainer(): void {
    try {
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
      
    } catch (error) {
      this.logger.error('❌ Erreur createEditorContainer', error);
      throw error;
    }
  }

  // ===========================================================================
  // MOTEUR DE RENDU MARKDOWN AVEC GESTION D'ERREURS ROBUSTE
  // ===========================================================================

  /**
   * ✅ CORRECTION BUG #4 : Rend le contenu markdown avec gestion d'erreurs complète
   */
  private async renderContent(): Promise<void> {
    // ✅ PROTECTION CONTRE LES APPELS MULTIPLES
    if (this.renderAttempts >= this.MAX_RENDER_ATTEMPTS) {
      this.logger.warn('🚫 Nombre maximum de tentatives de rendu atteint', {
        attempts: this.renderAttempts,
        sectionName: this.section.name
      });
      this.renderPermanentFallback();
      return;
    }

    this.renderAttempts++;

    try {
      // ✅ VALIDATION PRÉALABLE
      this.validateRenderState();

      // NETTOYAGE PRÉALABLE
      this.previewContainer.empty();
      
      // CAS SPÉCIAL : CONTENU VIDE
      if (!this.content.trim()) {
        this.renderEmptyState();
        this.resetRenderAttempts();
        return;
      }

      // ✅ TENTATIVE DE RENDU AVEC LE MOTEUR OBSIDIAN
      await this.attemptObsidianRender();
      
      // ✅ SUCCÈS : Reset du compteur d'erreurs
      this.resetRenderAttempts();
      this.isInErrorState = false;
      
      this.logger.info('✅ Contenu rendu avec succès', {
        engine: 'obsidian',
        contentLength: this.content.length,
        attempt: this.renderAttempts
      });
      
    } catch (error) {
      this.logger.error('❌ Erreur lors du rendu du contenu', {
        error: error.message,
        attempt: this.renderAttempts,
        sectionName: this.section.name,
        contentPreview: this.content.substring(0, 100) + '...'
      });

      // ✅ FALLBACK INTELLIGENT SELON LE TYPE D'ERREUR
      await this.handleRenderError(error);
    }
  }

  /**
   * ✅ NOUVEAU : Validation de l'état avant rendu
   */
  private validateRenderState(): void {
    if (!this.previewContainer) {
      throw new Error('previewContainer non initialisé');
    }
    if (this.content === null || this.content === undefined) {
      throw new Error('Contenu invalide');
    }
    if (!this.file || !this.file.path) {
      throw new Error('Fichier invalide');
    }
  }

  /**
   * ✅ NOUVEAU : Tentative de rendu avec le moteur Obsidian
   */
  private async attemptObsidianRender(): Promise<void> {
    try {
      // ✅ IMPORT DYNAMIQUE SÉCURISÉ
      const obsidianModules = await this.safeRequireObsidian();
      
      if (!obsidianModules) {
        throw new Error('Modules Obsidian non disponibles');
      }

      const { MarkdownRenderer, Component } = obsidianModules;
      const component = new Component();
      
      // ✅ RENDU OFFICIEL OBSIDIAN avec timeout
      await Promise.race([
        MarkdownRenderer.renderMarkdown(
          this.content,
          this.previewContainer,
          this.file.path,
          component
        ),
        this.createTimeoutPromise(5000) // Timeout de 5 secondes
      ]);
      
      // POST-TRAITEMENT pour interactions
      this.setupInteractions();
      
    } catch (error) {
      // Enrichir l'erreur avec du contexte
      throw new Error(`Rendu Obsidian échoué: ${error.message}`);
    }
  }

  /**
   * ✅ NOUVEAU : Import sécurisé des modules Obsidian
   */
  private async safeRequireObsidian(): Promise<any> {
    try {
      return require('obsidian');
    } catch (error) {
      this.logger.warn('⚠️ Modules Obsidian non disponibles via require', error);
      
      // ✅ FALLBACK : Tentative d'accès via l'app
      if (this.app && (this.app as any).MarkdownRenderer) {
        return {
          MarkdownRenderer: (this.app as any).MarkdownRenderer,
          Component: (this.app as any).Component || class Component {}
        };
      }
      
      return null;
    }
  }

  /**
   * ✅ NOUVEAU : Crée une promesse de timeout
   */
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout après ${ms}ms`)), ms);
    });
  }

  /**
   * ✅ NOUVEAU : Gestion intelligente des erreurs de rendu
   */
  private async handleRenderError(error: Error): Promise<void> {
    const errorMessage = error.message.toLowerCase();
    
    // ✅ STRATÉGIE DE FALLBACK SELON LE TYPE D'ERREUR
    if (errorMessage.includes('timeout')) {
      this.logger.warn('⏱️ Timeout de rendu - Passage en mode simple');
      this.renderSimpleFallback();
      
    } else if (errorMessage.includes('module') || errorMessage.includes('require')) {
      this.logger.warn('📦 Erreur de module - Passage en rendu de base');
      this.renderBasicMarkdown();
      
    } else if (this.renderAttempts < this.MAX_RENDER_ATTEMPTS) {
      this.logger.warn('🔄 Nouvelle tentative de rendu dans 1 seconde');
      setTimeout(() => this.renderContent(), 1000);
      
    } else {
      this.logger.error('💥 Échec définitif du rendu - Mode texte brut');
      this.renderPermanentFallback();
    }
  }

  /**
   * ✅ NOUVEAU : Fallback simple avec markdown de base
   */
  private renderSimpleFallback(): void {
    try {
      this.previewContainer.empty();
      this.previewContainer.innerHTML = this.renderSimpleMarkdown(this.content);
      
      // Ajouter un indicateur de mode fallback
      const indicator = this.previewContainer.createDiv('fallback-indicator');
      indicator.style.cssText = `
        position: absolute;
        top: 4px;
        right: 4px;
        background: var(--background-modifier-warning);
        color: var(--text-warning);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.7em;
        opacity: 0.7;
      `;
      indicator.textContent = '⚠️ Mode simplifié';
      
    } catch (error) {
      this.logger.error('❌ Erreur dans renderSimpleFallback', error);
      this.renderPermanentFallback();
    }
  }

  /**
   * ✅ NOUVEAU : Fallback avec markdown basique
   */
  private renderBasicMarkdown(): void {
    try {
      this.previewContainer.empty();
      
      // Rendu très basique ligne par ligne
      const lines = this.content.split('\n');
      for (const line of lines) {
        const lineEl = this.previewContainer.createDiv('basic-line');
        lineEl.style.marginBottom = '0.5em';
        lineEl.textContent = line || ' '; // Préserver les lignes vides
      }
      
    } catch (error) {
      this.logger.error('❌ Erreur dans renderBasicMarkdown', error);
      this.renderPermanentFallback();
    }
  }

  /**
   * ✅ NOUVEAU : Fallback permanent en cas d'échec total
   */
  private renderPermanentFallback(): void {
    try {
      this.isInErrorState = true;
      this.previewContainer.empty();
      
      const errorContainer = this.previewContainer.createDiv('permanent-fallback');
      errorContainer.innerHTML = `
        <div style="
          color: var(--text-error);
          background: var(--background-secondary);
          border: 1px dashed var(--background-modifier-border);
          border-radius: 4px;
          padding: 1rem;
          margin-bottom: 1rem;
        ">
          <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
            <span style="margin-right: 0.5rem;">⚠️</span>
            <strong>Erreur de rendu</strong>
          </div>
          <p style="margin: 0; opacity: 0.8;">
            Affichage du contenu en mode texte brut. 
            <button onclick="location.reload()" style="
              background: none; 
              border: none; 
              color: var(--text-accent); 
              text-decoration: underline; 
              cursor: pointer;
            ">Recharger</button>
          </p>
        </div>
      `;
      
      // Afficher le contenu en texte brut
      const contentEl = errorContainer.createEl('pre');
      contentEl.style.cssText = `
        white-space: pre-wrap;
        font-family: var(--font-text);
        font-size: var(--font-size-normal);
        color: var(--text-normal);
        background: var(--background-primary);
        padding: 1rem;
        border-radius: 4px;
        overflow: auto;
      `;
      contentEl.textContent = this.content;
      
    } catch (finalError) {
      this.logger.error('❌ Erreur critique dans renderPermanentFallback', finalError);
      // Dernier recours absolu
      this.previewContainer.textContent = `⚠️ ERREUR CRITIQUE\n\n${this.content}`;
    }
  }

  /**
   * ✅ AMÉLIORATION : Reset sécurisé du compteur de tentatives
   */
  private resetRenderAttempts(): void {
    this.renderAttempts = 0;
  }

  /**
   * Configure les interactions avec les éléments rendus (avec gestion d'erreurs)
   */
  private setupInteractions(): void {
    try {
      // INTERACTION 1 : TÂCHES COCHABLES
      const taskCheckboxes = this.previewContainer.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');
      taskCheckboxes.forEach(checkbox => {
        try {
          checkbox.addEventListener('change', (event) => {
            const target = event.target as HTMLInputElement;
            this.handleTaskToggle(target);
          });
        } catch (error) {
          this.logger.warn('⚠️ Erreur configuration tâche', error);
        }
      });

      // INTERACTION 2 : LIENS INTERNES OBSIDIAN
      const internalLinks = this.previewContainer.querySelectorAll('a.internal-link');
      internalLinks.forEach(link => {
        try {
          link.addEventListener('click', (event) => {
            event.preventDefault();
            
            const href = link.getAttribute('data-href') || link.getAttribute('href');
            if (href && this.app.workspace) {
              this.app.workspace.openLinkText(href, this.file.path);
            }
          });
        } catch (error) {
          this.logger.warn('⚠️ Erreur configuration lien', error);
        }
      });

      // INTERACTION 3 : PRÉVENTION GLOBALE
      const interactiveElements = this.previewContainer.querySelectorAll('input, button, a, .dataview, .task-list-item');
      interactiveElements.forEach(element => {
        try {
          element.addEventListener('click', (event) => {
            event.stopPropagation();
          });
        } catch (error) {
          this.logger.warn('⚠️ Erreur configuration interaction', error);
        }
      });
      
    } catch (error) {
      this.logger.error('❌ Erreur globale setupInteractions', error);
      // Ne pas faire échouer le rendu pour les interactions
    }
  }

  /**
   * Gère le cochage/décochage des tâches (avec validation)
   */
  private handleTaskToggle(checkbox: HTMLInputElement): void {
    try {
      // ✅ VALIDATION
      if (!checkbox) {
        throw new Error('Checkbox invalide');
      }

      const isChecked = checkbox.checked;
      const listItem = checkbox.closest('li');
      
      if (!listItem) {
        throw new Error('Élément de liste parent non trouvé');
      }

      // EXTRACTION DU TEXTE DE LA TÂCHE
      const taskText = this.getTaskTextFromListItem(listItem);
      if (!taskText) {
        throw new Error('Texte de tâche non trouvé');
      }

      // MISE À JOUR DU MARKDOWN
      const lines = this.content.split('\n');
      let updated = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (this.isTaskLine(line) && this.getTaskTextFromLine(line) === taskText) {
          const newCheckState = isChecked ? '[x]' : '[ ]';
          lines[i] = line.replace(/\[[ x]\]/, newCheckState);
          updated = true;
          break;
        }
      }

      if (updated) {
        this.content = lines.join('\n');
        
        // SAUVEGARDE DIFFÉRÉE
        clearTimeout(this.changeTimeout);
        this.changeTimeout = setTimeout(() => {
          try {
            this.onChange(this.content);
          } catch (error) {
            this.logger.error('❌ Erreur callback onChange', error);
          }
        }, 500);
        
        this.logger.info(`✅ Tâche ${isChecked ? 'cochée' : 'décochée'}`, { taskText });
      }
      
    } catch (error) {
      this.logger.error('❌ Erreur handleTaskToggle', error);
      // Restaurer l'état précédent de la checkbox
      checkbox.checked = !checkbox.checked;
    }
  }

  /**
   * Extrait le texte d'une tâche depuis un élément de liste DOM
   */
  private getTaskTextFromListItem(listItem: HTMLElement): string | null {
    try {
      const textNode = listItem.childNodes[listItem.childNodes.length - 1];
      return textNode?.textContent?.trim() || null;
    } catch (error) {
      this.logger.warn('⚠️ Erreur extraction texte tâche', error);
      return null;
    }
  }

  /**
   * Vérifie si une ligne markdown est une tâche
   */
  private isTaskLine(line: string): boolean {
    try {
      return /^[\s]*[-*+] \[[ x]\]/.test(line);
    } catch (error) {
      this.logger.warn('⚠️ Erreur vérification ligne tâche', error);
      return false;
    }
  }

  /**
   * Extrait le texte d'une tâche depuis une ligne markdown
   */
  private getTaskTextFromLine(line: string): string {
    try {
      const match = line.match(/^[\s]*[-*+] \[[ x]\] (.+)$/);
      return match ? match[1].trim() : '';
    } catch (error) {
      this.logger.warn('⚠️ Erreur extraction texte ligne', error);
      return '';
    }
  }

  /**
   * Moteur de rendu markdown simple (fallback) - Version sécurisée
   */
  private renderSimpleMarkdown(content: string): string {
    try {
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
      
      if (inList) {
        result += '</ul>\n';
      }
      
      return result;
      
    } catch (error) {
      this.logger.error('❌ Erreur renderSimpleMarkdown', error);
      // Fallback ultime : retourner le contenu en HTML échappé
      return `<pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
    }
  }

  /**
   * Affiche un état vide engageant pour inciter à l'édition
   */
  private renderEmptyState(): void {
    try {
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
      
    } catch (error) {
      this.logger.error('❌ Erreur renderEmptyState', error);
      // Fallback simple
      this.previewContainer.textContent = 'Cliquez pour écrire...';
    }
  }

  // ===========================================================================
  // GESTION DES ÉVÉNEMENTS ET INTERACTIONS (avec protection d'erreurs)
  // ===========================================================================

  /**
   * Configure les événements du mode preview avec gestion d'erreurs
   */
  private setupPreviewEvents(): void {
    try {
      this.previewContainer.addEventListener('click', (event) => {
        try {
          const target = event.target as HTMLElement;
          
          // FILTRAGE : Ne pas éditer si clic sur élément interactif
          if (this.isInteractiveElement(target)) {
            this.logger.info('🎯 Clic sur élément interactif, pas de mode édition');
            return;
          }
          
          this.logger.info('🖱️ Clic sur preview → mode édition');
          this.enterEditMode();
          
        } catch (error) {
          this.logger.error('❌ Erreur dans gestionnaire clic preview', error);
        }
      });
      
    } catch (error) {
      this.logger.error('❌ Erreur setupPreviewEvents', error);
    }
  }

  /**
   * Détecte si un élément est interactif avec validation
   */
  private isInteractiveElement(element: HTMLElement): boolean {
    try {
      if (!element) return false;
      
      let current: HTMLElement | null = element;
      
      // REMONTÉE DE LA HIÉRARCHIE DOM
      while (current && current !== this.previewContainer) {
        const tagName = current.tagName?.toLowerCase() || '';
        const classList = Array.from(current.classList || []);
        
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
      
    } catch (error) {
      this.logger.warn('⚠️ Erreur isInteractiveElement', error);
      return false; // En cas d'erreur, considérer comme non-interactif
    }
  }

  /**
   * Configure les événements du mode édition avec gestion d'erreurs
   */
  private setupEditorEvents(): void {
    try {
      // ÉVÉNEMENT 1 : Modification du contenu
      this.textArea.addEventListener('input', () => {
        try {
          this.content = this.textArea.value;
          
          // SAUVEGARDE DIFFÉRÉE (DEBOUNCING)
          clearTimeout(this.changeTimeout);
          this.changeTimeout = setTimeout(() => {
            try {
              this.onChange(this.content);
            } catch (error) {
              this.logger.error('❌ Erreur callback onChange dans input', error);
            }
          }, 1000);
          
        } catch (error) {
          this.logger.error('❌ Erreur dans gestionnaire input', error);
        }
      });

      // ÉVÉNEMENT 2 : Perte de focus (sortie d'édition)
      this.textArea.addEventListener('blur', () => {
        try {
          this.logger.info('📝 Blur sur textarea → mode preview');
          this.exitEditMode();
        } catch (error) {
          this.logger.error('❌ Erreur dans gestionnaire blur', error);
        }
      });

      // ÉVÉNEMENT 3 : Raccourcis clavier
      this.textArea.addEventListener('keydown', (event) => {
        try {
          if (event.key === 'Escape') {
            this.logger.info('⌨️ Escape → mode preview');
            this.exitEditMode();
          }
        } catch (error) {
          this.logger.error('❌ Erreur dans gestionnaire keydown', error);
        }
      });
      
    } catch (error) {
      this.logger.error('❌ Erreur setupEditorEvents', error);
    }
  }

  // ===========================================================================
  // GESTION DES MODES (PREVIEW ↔ ÉDITION) avec recovery
  // ===========================================================================

  /**
   * Bascule vers le mode édition avec gestion d'erreurs
   */
  private enterEditMode(): void {
    try {
      // ✅ VALIDATION DE L'ÉTAT
      if (this.isInErrorState) {
        this.logger.warn('⚠️ Impossible de passer en mode édition - état d\'erreur');
        return;
      }

      if (!this.textArea || !this.editorContainer) {
        throw new Error('Composants d\'édition non initialisés');
      }

      this.isEditing = true;
      this.previewContainer.style.display = 'none';
      this.editorContainer.style.display = 'block';
      this.textArea.value = this.content;
      
      // ✅ FOCUS SÉCURISÉ
      setTimeout(() => {
        try {
          if (this.textArea && this.isEditing) {
            this.textArea.focus();
          }
        } catch (error) {
          this.logger.warn('⚠️ Erreur focus textarea', error);
        }
      }, 10);
      
      this.logger.info('✏️ Mode édition activé');
      
    } catch (error) {
      this.logger.error('❌ Erreur enterEditMode', error);
      // Recovery : forcer le retour en mode preview
      this.forcePreviewMode();
    }
  }

  /**
   * Bascule vers le mode preview avec gestion d'erreurs
   */
  private exitEditMode(): void {
    try {
      if (!this.isEditing) return;
      
      // ✅ VALIDATION DE L'ÉTAT
      if (!this.previewContainer || !this.editorContainer) {
        throw new Error('Composants de preview non initialisés');
      }
      
      this.isEditing = false;
      this.content = this.textArea.value;
      this.editorContainer.style.display = 'none';
      this.previewContainer.style.display = 'block';
      
      // ✅ RE-RENDU SÉCURISÉ
      this.renderContent().catch(error => {
        this.logger.error('❌ Erreur re-rendu après édition', error);
        // En cas d'erreur, garder l'ancien contenu visible
      });
      
      this.logger.info('👁️ Mode preview activé');
      
    } catch (error) {
      this.logger.error('❌ Erreur exitEditMode', error);
      this.forcePreviewMode();
    }
  }

  /**
   * ✅ NOUVEAU : Force le mode preview en cas d'erreur
   */
  private forcePreviewMode(): void {
    try {
      this.isEditing = false;
      
      if (this.editorContainer) {
        this.editorContainer.style.display = 'none';
      }
      
      if (this.previewContainer) {
        this.previewContainer.style.display = 'block';
      }
      
      this.logger.info('🔧 Mode preview forcé après erreur');
      
    } catch (error) {
      this.logger.error('❌ Erreur critique dans forcePreviewMode', error);
      // Ultime recours : reload complet
      this.initializeErrorState();
    }
  }

  /**
   * Force l'affichage du mode preview
   */
  private showPreview(): void {
    try {
      if (this.previewContainer && this.editorContainer) {
        this.previewContainer.style.display = 'block';
        this.editorContainer.style.display = 'none';
        this.isEditing = false;
      }
    } catch (error) {
      this.logger.error('❌ Erreur showPreview', error);
    }
  }

  // ===========================================================================
  // API PUBLIQUE DU COMPOSANT (avec validation)
  // ===========================================================================

  /**
   * Met à jour le contenu de la section avec validation
   */
  updateContent(section: FileSection): void {
    try {
      // ✅ VALIDATION
      if (!section) {
        throw new Error('Section requise pour updateContent');
      }

      if (!section.lines || !Array.isArray(section.lines)) {
        throw new Error('Section.lines requis et doit être un tableau');
      }

      this.section = section;
      this.content = section.lines.join('\n');
      
      if (this.isEditing) {
        // MODE ÉDITION : Mettre à jour le textarea
        if (this.textArea) {
          this.textArea.value = this.content;
        }
      } else {
        // MODE PREVIEW : Re-rendre le contenu
        this.renderContent().catch(error => {
          this.logger.error('❌ Erreur re-rendu dans updateContent', error);
        });
      }
      
      this.logger.info('✅ Contenu mis à jour', {
        sectionName: section.name,
        contentLength: this.content.length
      });
      
    } catch (error) {
      this.logger.error('❌ Erreur updateContent', error);
    }
  }

  /**
   * Obtient le contenu actuel de la section de manière sécurisée
   */
  getContent(): string {
    try {
      if (this.isEditing && this.textArea) {
        return this.textArea.value;
      }
      return this.content || '';
      
    } catch (error) {
      this.logger.error('❌ Erreur getContent', error);
      return this.content || '';
    }
  }

  /**
   * ✅ NOUVEAU : Obtient l'état du composant pour debugging
   */
  getState(): any {
    try {
      return {
        isEditing: this.isEditing,
        isInErrorState: this.isInErrorState,
        renderAttempts: this.renderAttempts,
        contentLength: this.content?.length || 0,
        hasPreviewContainer: !!this.previewContainer,
        hasEditorContainer: !!this.editorContainer,
        hasTextArea: !!this.textArea,
        sectionName: this.section?.name || 'unknown'
      };
    } catch (error) {
      this.logger.error('❌ Erreur getState', error);
      return { error: 'Unable to get state' };
    }
  }

  /**
   * ✅ NOUVEAU : Tente une récupération en cas d'état incohérent
   */
  recover(): void {
    try {
      this.logger.info('🔧 Tentative de récupération du composant');
      
      // Reset des états
      this.isInErrorState = false;
      this.renderAttempts = 0;
      
      // Nettoyage et réinitialisation
      this.container.empty();
      this.initializeFrame();
      
      this.logger.info('✅ Récupération réussie');
      
    } catch (error) {
      this.logger.error('❌ Échec de la récupération', error);
      this.initializeErrorState();
    }
  }

  /**
   * Détruit proprement le composant avec nettoyage complet
   */
  destroy(): void {
    try {
      // ✅ NETTOYAGE DES TIMERS
      if (this.changeTimeout) {
        clearTimeout(this.changeTimeout);
        this.changeTimeout = null;
      }

      // ✅ NETTOYAGE DES ÉLÉMENTS DOM
      if (this.container) {
        this.container.empty();
      }

      // ✅ RÉINITIALISATION DES RÉFÉRENCES
      this.previewContainer = null as any;
      this.editorContainer = null as any;
      this.textArea = null as any;
      
      // ✅ RESET DES ÉTATS
      this.isEditing = false;
      this.isInErrorState = false;
      this.renderAttempts = 0;
      
      this.logger.info('🗑️ MarkdownFrame détruite proprement');
      
    } catch (error) {
      this.logger.error('❌ Erreur lors de la destruction', error);
      // Nettoyage forcé même en cas d'erreur
      try {
        if (this.container) {
          this.container.innerHTML = '';
        }
      } catch (finalError) {
        console.error('Erreur critique destruction MarkdownFrame:', finalError);
      }
    }
  }
}