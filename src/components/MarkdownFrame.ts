/**
 * =============================================================================
 * COMPOSANT D'ÉDITION MARKDOWN NATIF OBSIDIAN - VERSION CORRIGÉE
 * =============================================================================
 * 
 * Fichier : src/components/MarkdownFrame.ts (VERSION NATIVE)
 * 
 * Cette version utilise le moteur de rendu natif d'Obsidian sans interception,
 * permettant une intégration parfaite avec Tasks et les liens [[note.md]].
 */

import { App, TFile, MarkdownRenderer, Component } from 'obsidian';
import { FileSection } from '../types';
import { LoggerService } from '../services/LoggerService';

export class MarkdownFrame {
  
  // ===========================================================================
  // PROPRIÉTÉS D'ÉTAT DU COMPOSANT
  // ===========================================================================
  
  private isEditing = false;
  private previewContainer!: HTMLElement;
  private editorContainer!: HTMLElement;
  private textArea!: HTMLTextAreaElement;
  private content: string;
  private changeTimeout: any;
  private logger: LoggerService;
  
  // ✅ NOUVEAU : Composant Obsidian pour le rendu natif
  private obsidianComponent: Component;
  
  // ✅ NOUVEAU : États de rendu simplifiés
  private isInErrorState = false;
  private renderAttempts = 0;
  private readonly MAX_RENDER_ATTEMPTS = 2;

  // ===========================================================================
  // CONSTRUCTEUR ET INITIALISATION
  // ===========================================================================

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
      this.validateConstructorParams();
      this.content = section.lines.join('\n');
      
      // ✅ NOUVEAU : Créer un composant Obsidian pour le rendu natif
      this.obsidianComponent = new Component();
      this.obsidianComponent.load();
      
      this.initializeFrame();
      
      this.logger.debug('✅ MarkdownFrame initialisé avec rendu natif Obsidian', {
        sectionName: section.name,
        contentLength: this.content.length
      });
      
    } catch (error) {
      this.logger.error('❌ Erreur critique lors de l\'initialisation de MarkdownFrame', error);
      this.initializeErrorState();
    }
  }

  /**
   * ✅ Validation des paramètres du constructeur
   */
  private validateConstructorParams(): void {
    if (!this.app) throw new Error('App Obsidian requis');
    if (!this.container) throw new Error('Container DOM requis');
    if (!this.file) throw new Error('Fichier TFile requis');
    if (!this.section) throw new Error('Section FileSection requise');
    if (!this.onChange || typeof this.onChange !== 'function') throw new Error('Callback onChange requis');
    if (!this.logger) throw new Error('Logger requis');
  }

  /**
   * ✅ Initialise un état d'erreur de base
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
      this.container.textContent = '⚠️ Erreur critique - Veuillez recharger la page';
    }
  }

  /**
   * Initialise complètement l'interface du composant
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
      this.container.empty();
      this.container.style.cssText = `
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
      `;
    } catch (error) {
      this.logger.error('❌ Erreur setupContainer', error);
      throw error;
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
      this.previewContainer = this.container.createDiv('markdown-preview');
      this.previewContainer.style.cssText = `
        width: 100%;
        height: 100%;
        overflow: auto;
        padding: 0.5rem;
        cursor: text;
        box-sizing: border-box;
      `;
      
      this.renderContent();
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
      this.editorContainer = this.container.createDiv('markdown-editor');
      this.editorContainer.style.cssText = `
        width: 100%;
        height: 100%;
        display: none;
        box-sizing: border-box;
      `;

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

      this.textArea.value = this.content;
      this.setupEditorEvents();
      
    } catch (error) {
      this.logger.error('❌ Erreur createEditorContainer', error);
      throw error;
    }
  }

  // ===========================================================================
  // ✅ MOTEUR DE RENDU NATIF OBSIDIAN (SANS INTERCEPTION)
  // ===========================================================================

  /**
   * ✅ NOUVEAU : Rend le contenu avec le moteur natif Obsidian
   */
  private async renderContent(): Promise<void> {
    if (this.renderAttempts >= this.MAX_RENDER_ATTEMPTS) {
      this.logger.warn('🚫 Nombre maximum de tentatives de rendu atteint');
      this.renderFallback();
      return;
    }

    this.renderAttempts++;

    try {
      this.validateRenderState();
      this.previewContainer.empty();
      
      if (!this.content.trim()) {
        this.renderEmptyState();
        this.resetRenderAttempts();
        return;
      }

      // ✅ RENDU NATIF OBSIDIAN SANS INTERCEPTION
      await this.renderWithNativeObsidian();
      
      this.resetRenderAttempts();
      this.isInErrorState = false;
      
      this.logger.debug('✅ Contenu rendu avec moteur natif Obsidian', {
        contentLength: this.content.length,
        attempt: this.renderAttempts
      });
      
    } catch (error) {
      this.logger.error('❌ Erreur lors du rendu du contenu', {
        error: error.message,
        attempt: this.renderAttempts,
        sectionName: this.section.name
      });

      await this.handleRenderError(error);
    }
  }

  /**
   * ✅ Validation de l'état avant rendu
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
   * ✅ NOUVEAU : Rendu avec le moteur natif d'Obsidian (PAS D'INTERCEPTION)
   */
  private async renderWithNativeObsidian(): Promise<void> {
    try {
      // ✅ UTILISATION DIRECTE DU MOTEUR OBSIDIAN
      await MarkdownRenderer.renderMarkdown(
        this.content,
        this.previewContainer,
        this.file.path,
        this.obsidianComponent
      );
      
      // ✅ ATTENDRE LE RENDU COMPLET DES PLUGINS (SANS INTERCEPTION)
      await this.waitForPluginsToLoad();
      
      this.logger.debug('✅ Rendu natif Obsidian terminé - plugins chargés naturellement');
      
    } catch (error) {
      throw new Error(`Rendu natif échoué: ${error.message}`);
    }
  }

  /**
   * ✅ NOUVEAU : Attend que les plugins se chargent naturellement
   */
  private async waitForPluginsToLoad(): Promise<void> {
    return new Promise((resolve) => {
      // Délai court pour laisser les plugins se charger naturellement
      setTimeout(() => {
        try {
          // ✅ VÉRIFICATION SANS INTERCEPTION
          const pluginElements = this.previewContainer.querySelectorAll(
            '.dataview, .block-language-dataview, ' +
            '.tasks-query, .block-language-tasks, ' +
            '.task-list-item, ' +
            '.kanban-plugin, ' +
            '[data-plugin]'
          );
          
          this.logger.debug(`✅ ${pluginElements.length} éléments de plugins chargés naturellement`);
          
          // ✅ CONFIGURATION MINIMALE POUR L'ÉDITION
          this.setupNativeEditingSupport();
          
          resolve();
        } catch (error) {
          this.logger.warn('⚠️ Erreur vérification plugins, continuation normale', error);
          resolve();
        }
      }, 300); // Délai réduit car pas d'interception
    });
  }

  /**
   * ✅ NOUVEAU : Support d'édition natif (minimal, pas d'interception)
   */
  private setupNativeEditingSupport(): void {
    try {
      // ✅ SUPPORT MINIMAL : Détecter les modifications pour sauvegarder
      // Mais SANS intercepter les événements des plugins
      
      // Surveiller uniquement les changements dans le textarea (mode édition)
      // Les plugins fonctionnent naturellement en mode preview
      
      // ✅ DÉLÉGATION ÉVÉNEMENTS POUR SAUVEGARDER LES MODIFICATIONS
      this.previewContainer.addEventListener('input', this.debouncedSave.bind(this), true);
      this.previewContainer.addEventListener('change', this.debouncedSave.bind(this), true);
      
      this.logger.debug('✅ Support d\'édition natif configuré (minimal)');
      
    } catch (error) {
      this.logger.warn('⚠️ Erreur configuration support édition natif', error);
    }
  }

  /**
   * ✅ NOUVEAU : Sauvegarde différée des modifications
   */
  private debouncedSave(): void {
    try {
      clearTimeout(this.changeTimeout);
      this.changeTimeout = setTimeout(() => {
        try {
          // ✅ EXTRAIRE LE CONTENU MODIFIÉ DEPUIS LE DOM
          const newContent = this.extractContentFromNativeRender();
          
          if (newContent !== this.content) {
            this.content = newContent;
            this.onChange(this.content);
            this.logger.verbose('🔄 Contenu sauvegardé depuis rendu natif');
          }
        } catch (error) {
          this.logger.warn('⚠️ Erreur sauvegarde différée', error);
        }
      }, 1000); // 1 seconde de délai
    } catch (error) {
      this.logger.error('❌ Erreur debouncedSave', error);
    }
  }

  /**
   * ✅ NOUVEAU : Extraction du contenu depuis le rendu natif
   */
  private extractContentFromNativeRender(): string {
    try {
      // ✅ MÉTHODE SIMPLE : Reconstruire le markdown depuis le DOM natif
      const lines: string[] = [];
      
      // Parcourir les éléments dans l'ordre du DOM
      const walker = document.createTreeWalker(
        this.previewContainer,
        NodeFilter.SHOW_ELEMENT,
        null
      );
      
      let node;
      while (node = walker.nextNode()) {
        const element = node as HTMLElement;
        
        // ✅ TITRES
        if (element.matches('h1, h2, h3, h4, h5, h6')) {
          const level = parseInt(element.tagName.substring(1));
          const text = element.textContent?.trim() || '';
          if (text) {
            lines.push(`${'#'.repeat(level)} ${text}`);
          }
        }
        
        // ✅ TÂCHES (Support natif Tasks)
        else if (element.matches('.task-list-item')) {
          const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
          const isChecked = checkbox ? checkbox.checked : false;
          const text = element.textContent?.trim() || '';
          if (text) {
            lines.push(`- [${isChecked ? 'x' : ' '}] ${text}`);
          }
        }
        
        // ✅ LISTES NORMALES
        else if (element.matches('li') && !element.matches('.task-list-item')) {
          const text = element.textContent?.trim() || '';
          if (text) {
            lines.push(`- ${text}`);
          }
        }
        
        // ✅ PARAGRAPHES ET LIENS [[note.md]]
        else if (element.matches('p')) {
          let text = element.textContent?.trim() || '';
          
          // Préserver les liens internes Obsidian
          const internalLinks = element.querySelectorAll('.internal-link');
          internalLinks.forEach(link => {
            const linkText = link.textContent || '';
            const href = link.getAttribute('data-href') || linkText;
            text = text.replace(linkText, `[[${href}]]`);
          });
          
          if (text) {
            lines.push(text);
          }
        }
        
        // ✅ BLOCS DE CODE
        else if (element.matches('pre code')) {
          const code = element.textContent || '';
          const language = element.className.match(/language-(\w+)/)?.[1] || '';
          if (code) {
            lines.push('```' + language);
            lines.push(code);
            lines.push('```');
          }
        }
        
        // ✅ QUERIES DATAVIEW ET TASKS (préservation)
        else if (element.matches('.block-language-dataview, .block-language-tasks')) {
          const originalContent = element.getAttribute('data-original-content') ||
                                  element.textContent || '';
          if (originalContent) {
            const language = element.matches('.block-language-dataview') ? 'dataview' : 'tasks';
            lines.push('```' + language);
            lines.push(originalContent);
            lines.push('```');
          }
        }
      }
      
      return lines
        .filter(line => line.trim().length > 0)
        .join('\n')
        .replace(/\n\n+/g, '\n\n');
        
    } catch (error) {
      this.logger.error('❌ Erreur extraction contenu natif', error);
      return this.content; // Fallback vers contenu original
    }
  }

  /**
   * ✅ Gestion des erreurs de rendu
   */
  private async handleRenderError(error: Error): Promise<void> {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('timeout')) {
      this.logger.warn('⏱️ Timeout de rendu');
      this.renderFallback();
      
    } else if (this.renderAttempts < this.MAX_RENDER_ATTEMPTS) {
      this.logger.warn('🔄 Nouvelle tentative de rendu');
      setTimeout(() => this.renderContent(), 1000);
      
    } else {
      this.logger.error('💥 Échec définitif du rendu');
      this.renderFallback();
    }
  }

  /**
   * ✅ Rendu de fallback simple
   */
  private renderFallback(): void {
    try {
      this.previewContainer.empty();
      
      const fallbackDiv = this.previewContainer.createDiv('fallback-render');
      fallbackDiv.innerHTML = `
        <div style="
          color: var(--text-warning);
          background: var(--background-secondary);
          border: 1px dashed var(--background-modifier-border);
          border-radius: 4px;
          padding: 1rem;
          margin-bottom: 1rem;
        ">
          ⚠️ Mode de fallback - Rendu simplifié
        </div>
      `;
      
      const contentEl = fallbackDiv.createEl('pre');
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
      
    } catch (error) {
      this.logger.error('❌ Erreur renderFallback', error);
      this.previewContainer.textContent = this.content;
    }
  }

  /**
   * Reset sécurisé du compteur de tentatives
   */
  private resetRenderAttempts(): void {
    this.renderAttempts = 0;
  }

  /**
   * Affiche un état vide engageant
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
      this.previewContainer.textContent = 'Cliquez pour écrire...';
    }
  }

  // ===========================================================================
  // ✅ GESTION DES ÉVÉNEMENTS NATIVE (PAS D'INTERCEPTION)
  // ===========================================================================

  /**
   * ✅ NOUVEAU : Événements natifs sans interception des plugins
   */
  private setupPreviewEvents(): void {
    try {
      // ✅ SEUL ÉVÉNEMENT : Clic pour entrer en mode édition
      // Les plugins fonctionnent naturellement
      this.previewContainer.addEventListener('click', (event) => {
        try {
          const target = event.target as HTMLElement;
          
          // ✅ LAISSER LES PLUGINS GÉRER LEURS ÉLÉMENTS
          if (this.isPluginElement(target)) {
            this.logger.debug('🔌 Clic sur plugin - gestion native');
            return; // Laisser faire
          }
          
          // ✅ LAISSER LES LIENS OBSIDIAN FONCTIONNER
          if (this.isObsidianInteractiveElement(target)) {
            this.logger.debug('🔗 Clic sur élément interactif Obsidian - gestion native');
            return; // Laisser faire
          }
          
          // Sinon, entrer en mode édition
          this.logger.debug('🖱️ Clic sur contenu → mode édition');
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
   * ✅ NOUVEAU : Détection d'éléments de plugins (non-interceptés)
   */
  private isPluginElement(element: HTMLElement): boolean {
    if (!element) return false;
    
    const pluginSelectors = [
      '.task-list-item',
      '.dataview',
      '.block-language-dataview',
      '.block-language-tasks',
      '.kanban-plugin',
      '.pomodoro-timer',
      '[data-plugin]',
      'input[type="checkbox"]' // Checkboxes gérées nativement
    ];
    
    return pluginSelectors.some(selector => {
      try {
        return element.matches(selector) || element.closest(selector) !== null;
      } catch {
        return false;
      }
    });
  }

  /**
   * ✅ NOUVEAU : Détection d'éléments interactifs Obsidian
   */
  private isObsidianInteractiveElement(element: HTMLElement): boolean {
    if (!element) return false;
    
    const interactiveSelectors = [
      '.internal-link',
      '.external-link',
      '.tag',
      '.cm-hashtag',
      'a[href]',
      '[data-href]',
      'button',
      'input',
      'select',
      'textarea'
    ];
    
    return interactiveSelectors.some(selector => {
      try {
        return element.matches(selector) || element.closest(selector) !== null;
      } catch {
        return false;
      }
    });
  }

  /**
   * Configure les événements du mode édition
   */
  private setupEditorEvents(): void {
    try {
      this.textArea.addEventListener('input', () => {
        try {
          this.content = this.textArea.value;
          
          clearTimeout(this.changeTimeout);
          this.changeTimeout = setTimeout(() => {
            try {
              this.onChange(this.content);
            } catch (error) {
              this.logger.error('❌ Erreur callback onChange dans input', error);
            }
          }, 2000);
          
        } catch (error) {
          this.logger.error('❌ Erreur dans gestionnaire input', error);
        }
      });

      this.textArea.addEventListener('blur', () => {
        try {
          this.logger.debug('📝 Blur sur textarea → mode preview');
          this.exitEditMode();
        } catch (error) {
          this.logger.error('❌ Erreur dans gestionnaire blur', error);
        }
      });

      this.textArea.addEventListener('keydown', (event) => {
        try {
          if (event.key === 'Escape') {
            this.logger.debug('⌨️ Escape → mode preview');
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
  // GESTION DES MODES (PREVIEW ↔ ÉDITION)
  // ===========================================================================

  /**
   * Bascule vers le mode édition
   */
  private enterEditMode(): void {
    try {
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
      
      setTimeout(() => {
        try {
          if (this.textArea && this.isEditing) {
            this.textArea.focus();
          }
        } catch (error) {
          this.logger.warn('⚠️ Erreur focus textarea', error);
        }
      }, 10);
      
      this.logger.debug('✏️ Mode édition activé');
      
    } catch (error) {
      this.logger.error('❌ Erreur enterEditMode', error);
      this.forcePreviewMode();
    }
  }

  /**
   * Bascule vers le mode preview
   */
  private exitEditMode(): void {
    try {
      if (!this.isEditing) return;
      
      if (!this.previewContainer || !this.editorContainer) {
        throw new Error('Composants de preview non initialisés');
      }
      
      this.isEditing = false;
      this.content = this.textArea.value;
      this.editorContainer.style.display = 'none';
      this.previewContainer.style.display = 'block';
      
      this.renderContent().catch(error => {
        this.logger.error('❌ Erreur re-rendu après édition', error);
      });
      
      this.logger.debug('👁️ Mode preview activé');
      
    } catch (error) {
      this.logger.error('❌ Erreur exitEditMode', error);
      this.forcePreviewMode();
    }
  }

  /**
   * Force le mode preview en cas d'erreur
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
      
      this.logger.debug('🔧 Mode preview forcé après erreur');
      
    } catch (error) {
      this.logger.error('❌ Erreur critique dans forcePreviewMode', error);
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
  // API PUBLIQUE DU COMPOSANT
  // ===========================================================================

  /**
   * Met à jour le contenu de la section
   */
  updateContent(section: FileSection): void {
    try {
      if (!section) {
        throw new Error('Section requise pour updateContent');
      }

      if (!section.lines || !Array.isArray(section.lines)) {
        throw new Error('Section.lines requis et doit être un tableau');
      }

      this.section = section;
      this.content = section.lines.join('\n');
      
      if (this.isEditing) {
        if (this.textArea) {
          this.textArea.value = this.content;
        }
      } else {
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
   * Obtient le contenu actuel de la section
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
   * Obtient l'état du composant pour debugging
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
        sectionName: this.section?.name || 'unknown',
        nativeRender: {
          enabled: true,
          componentActive: !!this.obsidianComponent
        }
      };
    } catch (error) {
      this.logger.error('❌ Erreur getState', error);
      return { error: 'Unable to get state' };
    }
  }

  /**
   * Tente une récupération en cas d'état incohérent
   */
  recover(): void {
    try {
      this.logger.info('🔧 Tentative de récupération du composant');
      
      this.isInErrorState = false;
      this.renderAttempts = 0;
      
      this.container.empty();
      this.initializeFrame();
      
      this.logger.info('✅ Récupération réussie');
      
    } catch (error) {
      this.logger.error('❌ Échec de la récupération', error);
      this.initializeErrorState();
    }
  }

  /**
   * ✅ Détruit proprement le composant avec nettoyage natif
   */
  destroy(): void {
    try {
      // Nettoyer les timers
      if (this.changeTimeout) {
        clearTimeout(this.changeTimeout);
        this.changeTimeout = null;
      }

      // ✅ Nettoyer le composant Obsidian
      if (this.obsidianComponent) {
        this.obsidianComponent.unload();
      }

      // Nettoyer les éléments DOM
      if (this.container) {
        this.container.empty();
      }

      // Réinitialiser les références
      this.previewContainer = null as any;
      this.editorContainer = null as any;
      this.textArea = null as any;
      
      // Reset des états
      this.isEditing = false;
      this.isInErrorState = false;
      this.renderAttempts = 0;
      
      this.logger.info('🗑️ MarkdownFrame détruite proprement avec rendu natif');
      
    } catch (error) {
      this.logger.error('❌ Erreur lors de la destruction', error);
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