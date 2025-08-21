/**
 * =============================================================================
 * COMPOSANT D'ÉDITION MARKDOWN INTERACTIF - VERSION AVEC SUPPORT TASKS AMÉLIORÉ
 * =============================================================================
 * 
 * Fichier : src/components/MarkdownFrame.ts (VERSION CORRIGÉE POUR TASKS)
 * 
 * Cette version intègre un support spécialisé pour le plugin Tasks.
 */

import { App, TFile } from 'obsidian';
import { FileSection } from '../types';
import { LoggerService } from '../services/LoggerService';
import { PluginIntegrationManager } from '../services/PluginIntegrationManager';

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
  
  // ✅ NOUVEAU : Gestionnaire universel des plugins
  private pluginManager: PluginIntegrationManager;
  
  // ✅ NOUVEAU : États de rendu améliorés
  private isInErrorState = false;
  private renderAttempts = 0;
  private readonly MAX_RENDER_ATTEMPTS = 3;

  // ✅ NOUVEAU : Gestionnaire d'événements Tasks
  private tasksEventHandler?: (event: CustomEvent) => void;

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
      
      // ✅ NOUVEAU : Initialiser le gestionnaire de plugins
      this.pluginManager = new PluginIntegrationManager(this.app, this.logger);
      
      this.initializeFrame();
      
      this.logger.info('✅ MarkdownFrame initialisé avec support universel plugins et Tasks spécialisé', {
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
  // MOTEUR DE RENDU MARKDOWN AVEC SUPPORT UNIVERSEL PLUGINS
  // ===========================================================================

  /**
   * ✅ NOUVEAU : Rend le contenu markdown avec support universel des plugins
   */
  private async renderContent(): Promise<void> {
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
      this.validateRenderState();
      this.previewContainer.empty();
      
      if (!this.content.trim()) {
        this.renderEmptyState();
        this.resetRenderAttempts();
        return;
      }

      // ✅ NOUVEAU : Rendu avec support universel des plugins
      await this.attemptUniversalRender();
      
      this.resetRenderAttempts();
      this.isInErrorState = false;
      
      this.logger.info('✅ Contenu rendu avec support universel plugins', {
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
   * ✅ NOUVEAU : Tentative de rendu avec support universel des plugins
   */
  private async attemptUniversalRender(): Promise<void> {
    try {
      const obsidianModules = await this.safeRequireObsidian();
      
      if (!obsidianModules) {
        throw new Error('Modules Obsidian non disponibles');
      }

      const { MarkdownRenderer, Component } = obsidianModules;
      const component = new Component();
      
      // Configurer le composant pour supporter les plugins
      component.load();
      
      // Créer un contexte de rendu enrichi
      const renderContext = {
        sourcePath: this.file.path,
        frontmatter: this.app.metadataCache.getFileCache(this.file)?.frontmatter || {},
        component: component
      };
      
      // Rendu avec timeout étendu pour les plugins
      await Promise.race([
        MarkdownRenderer.renderMarkdown(
          this.content,
          this.previewContainer,
          this.file.path,
          component
        ),
        this.createTimeoutPromise(10000) // 10 secondes pour les plugins
      ]);
      
      // ✅ NOUVEAU : Attendre que les plugins se chargent et configurer le support universel
      await this.waitForPluginsAndSetupSupport();
      
    } catch (error) {
      throw new Error(`Rendu universel échoué: ${error.message}`);
    }
  }

  /**
   * ✅ NOUVEAU : Attend les plugins et configure le support universel avec Tasks spécialisé
   */
  private async waitForPluginsAndSetupSupport(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          // ✅ CONFIGURATION DU SUPPORT UNIVERSEL DES PLUGINS
          this.pluginManager.setupUniversalPluginSupport(
            this.previewContainer,
            (newContent: string) => {
              this.handleContentChangeFromPlugin(newContent);
            },
            this.file.path
          );
          
          // ✅ NOUVEAU : Support spécialisé pour Tasks
          this.setupTasksSpecificSupport();
          
          // Statistiques pour debugging
          const pluginElements = this.previewContainer.querySelectorAll(
            '.dataview, .tasks-plugin, .task-list-item, [data-plugin], .plugin-'
          );
          
          this.logger.debug(`✅ Support universel configuré - ${pluginElements.length} éléments de plugins détectés`);
          
          resolve();
        } catch (error) {
          this.logger.warn('⚠️ Erreur configuration support universel', error);
          resolve(); // Continue même en cas d'erreur
        }
      }, 600); // Délai plus long pour le chargement complet des plugins
    });
  }

  /**
   * ✅ NOUVEAU : Configuration spécialisée pour le plugin Tasks
   */
  private setupTasksSpecificSupport(): void {
    try {
      // Écouter les événements personnalisés du gestionnaire Tasks
      this.tasksEventHandler = (event: CustomEvent) => {
        try {
          this.logger.debug('✅ Événement Tasks personnalisé reçu', event.detail);
          
          if (event.detail.content && event.detail.content !== this.content) {
            this.handleContentChangeFromPlugin(event.detail.content);
          }
        } catch (error) {
          this.logger.error('❌ Erreur dans gestionnaire événement Tasks', error);
        }
      };
      
      // Écouter sur le container preview
      this.previewContainer.addEventListener('agile-board:task-changed', this.tasksEventHandler as EventListener);
      
      // ✅ NOUVEAU : Surveillance spécifique des checkboxes de tâches
      this.setupTaskCheckboxMonitoring();
      
      this.logger.debug('✅ Support spécialisé Tasks configuré');
      
    } catch (error) {
      this.logger.warn('⚠️ Erreur configuration support Tasks spécialisé', error);
    }
  }

  /**
   * ✅ NOUVEAU : Surveillance spécifique des checkboxes de tâches
   */
  private setupTaskCheckboxMonitoring(): void {
    try {
      // Utiliser un MutationObserver pour détecter les changements d'état des tâches
      const taskObserver = new MutationObserver((mutations) => {
        let hasTaskChanges = false;
        
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && 
              mutation.attributeName === 'checked' &&
              mutation.target instanceof HTMLInputElement &&
              mutation.target.type === 'checkbox') {
            
            const checkbox = mutation.target;
            const taskItem = checkbox.closest('.task-list-item, li');
            
            if (taskItem) {
              this.logger.debug('✅ Changement d\'état de tâche détecté via MutationObserver');
              hasTaskChanges = true;
            }
          }
        });
        
        if (hasTaskChanges) {
          // Délai pour laisser le plugin Tasks traiter le changement
          setTimeout(() => {
            try {
              const newContent = this.extractCurrentContent();
              if (newContent && newContent !== this.content) {
                this.logger.debug('🔄 Contenu Tasks mis à jour via MutationObserver');
                this.handleContentChangeFromPlugin(newContent);
              }
            } catch (error) {
              this.logger.warn('⚠️ Erreur extraction contenu après changement tâche', error);
            }
          }, 150);
        }
      });
      
      // Observer les changements d'attributs sur les checkboxes
      taskObserver.observe(this.previewContainer, {
        attributes: true,
        attributeFilter: ['checked'],
        subtree: true
      });
      
      // Stocker l'observer pour le nettoyage
      (this as any).taskObserver = taskObserver;
      
    } catch (error) {
      this.logger.warn('⚠️ Erreur setup surveillance checkboxes Tasks', error);
    }
  }

  /**
   * ✅ NOUVEAU : Extrait le contenu actuel via le gestionnaire de plugins
   */
  private extractCurrentContent(): string | null {
    try {
      // Utiliser le gestionnaire de plugins pour extraire le contenu
      return this.pluginManager.extractCurrentContentPublic ? 
             this.pluginManager.extractCurrentContentPublic(this.previewContainer) :
             this.fallbackContentExtraction();
    } catch (error) {
      this.logger.warn('⚠️ Erreur extraction contenu, utilisation fallback', error);
      return this.fallbackContentExtraction();
    }
  }

  /**
   * ✅ NOUVEAU : Extraction de contenu de fallback
   */
  private fallbackContentExtraction(): string {
    try {
      // Méthode de fallback simple pour extraire le contenu
      const textContent = this.previewContainer.textContent || '';
      
      // Tenter de reconstruire un markdown basique
      const lines: string[] = [];
      const elements = this.previewContainer.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, .task-list-item');
      
      elements.forEach(element => {
        if (element.matches('.task-list-item')) {
          const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
          const isChecked = checkbox ? checkbox.checked : false;
          const text = element.textContent?.replace(/^\s*/, '').trim() || '';
          lines.push(`- [${isChecked ? 'x' : ' '}] ${text}`);
        } else if (element.matches('h1, h2, h3, h4, h5, h6')) {
          const level = parseInt(element.tagName.substring(1));
          const text = element.textContent?.trim() || '';
          lines.push(`${'#'.repeat(level)} ${text}`);
        } else {
          const text = element.textContent?.trim() || '';
          if (text) {
            lines.push(text);
          }
        }
      });
      
      return lines.join('\n');
    } catch (error) {
      this.logger.error('❌ Erreur extraction fallback', error);
      return this.content; // Retourner le contenu original en dernier recours
    }
  }

  /**
   * ✅ NOUVEAU : Gère les changements de contenu provenant des plugins
   */
  private handleContentChangeFromPlugin(newContent: string): void {
    try {
      if (newContent !== this.content) {
        this.content = newContent;
        
        // Mise à jour du textarea si en mode édition
        if (this.isEditing && this.textArea) {
          this.textArea.value = newContent;
        }
        
        // Sauvegarde différée
        clearTimeout(this.changeTimeout);
        this.changeTimeout = setTimeout(() => {
          try {
            this.onChange(this.content);
          } catch (error) {
            this.logger.error('❌ Erreur callback onChange depuis plugin', error);
          }
        }, 300);
        
        this.logger.debug('🔄 Contenu mis à jour depuis plugin');
      }
    } catch (error) {
      this.logger.error('❌ Erreur handleContentChangeFromPlugin', error);
    }
  }

  /**
   * ✅ Import sécurisé des modules Obsidian
   */
  private async safeRequireObsidian(): Promise<any> {
    try {
      return require('obsidian');
    } catch (error) {
      this.logger.warn('⚠️ Modules Obsidian non disponibles via require', error);
      
      if (this.app && (this.app as any).MarkdownRenderer) {
        return {
          MarkdownRenderer: (this.app as any).MarkdownRenderer,
          Component: (this.app as any).Component || class Component { load() {} }
        };
      }
      
      return null;
    }
  }

  /**
   * ✅ Crée une promesse de timeout
   */
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout après ${ms}ms`)), ms);
    });
  }

  /**
   * ✅ Gestion intelligente des erreurs de rendu
   */
  private async handleRenderError(error: Error): Promise<void> {
    const errorMessage = error.message.toLowerCase();
    
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
   * ✅ Fallback simple avec markdown de base
   */
  private renderSimpleFallback(): void {
    try {
      this.previewContainer.empty();
      this.previewContainer.innerHTML = this.renderSimpleMarkdown(this.content);
      
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
   * ✅ Fallback avec markdown basique
   */
  private renderBasicMarkdown(): void {
    try {
      this.previewContainer.empty();
      
      const lines = this.content.split('\n');
      for (const line of lines) {
        const lineEl = this.previewContainer.createDiv('basic-line');
        lineEl.style.marginBottom = '0.5em';
        lineEl.textContent = line || ' ';
      }
      
    } catch (error) {
      this.logger.error('❌ Erreur dans renderBasicMarkdown', error);
      this.renderPermanentFallback();
    }
  }

  /**
   * ✅ Fallback permanent en cas d'échec total
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
      this.previewContainer.textContent = `⚠️ ERREUR CRITIQUE\n\n${this.content}`;
    }
  }

  /**
   * Reset sécurisé du compteur de tentatives
   */
  private resetRenderAttempts(): void {
    this.renderAttempts = 0;
  }

  /**
   * Moteur de rendu markdown simple (fallback)
   */
  private renderSimpleMarkdown(content: string): string {
    try {
      let html = content;
      
      html = html.replace(/\[\[([^\]]+)\]\]/g, '<span class="internal-link">$1</span>');
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      html = html.replace(/^[\s]*[-*+] (.+)$/gm, '<li>$1</li>');
      
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
      return `<pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
    }
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
  // GESTION DES ÉVÉNEMENTS SIMPLIFIÉE (VERSION UNIVERSELLE)
  // ===========================================================================

  /**
   * ✅ NOUVEAU : Configuration des événements simplifiée avec support universel
   */
  private setupPreviewEvents(): void {
    try {
      // ✅ SEUL ÉVÉNEMENT NÉCESSAIRE : Clic pour édition
      // Tous les autres événements sont gérés par PluginIntegrationManager
      this.previewContainer.addEventListener('click', (event) => {
        try {
          const target = event.target as HTMLElement;
          
          // Si c'est un élément de plugin, laisser le plugin gérer
          if (this.pluginManager.isPluginElement(target)) {
            this.logger.debug('🔌 Clic sur plugin, pas de mode édition');
            event.stopPropagation();
            return;
          }
          
          // ✅ NOUVEAU : Gestion spéciale pour les tâches
          if (this.isTaskElement(target)) {
            this.logger.debug('✅ Clic sur tâche, gestion spécialisée');
            event.stopPropagation();
            this.handleTaskClick(target, event);
            return;
          }
          
          // Vérifier d'autres éléments interactifs
          if (this.isBasicInteractiveElement(target)) {
            this.logger.debug('🎯 Clic sur élément interactif basique');
            event.stopPropagation();
            return;
          }
          
          // Sinon, entrer en mode édition
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
   * ✅ NOUVEAU : Détermine si un élément est une tâche
   */
  private isTaskElement(element: HTMLElement): boolean {
    try {
      // Vérifier si c'est une checkbox dans un contexte de tâche
      if (element.matches('input[type="checkbox"]')) {
        const taskContext = element.closest('.task-list-item, li, .contains-task-list');
        return !!taskContext;
      }
      
      // Vérifier si c'est un élément de tâche
      return element.matches('.task-list-item') ||
             element.closest('.task-list-item') !== null ||
             element.matches('li') && element.querySelector('input[type="checkbox"]') !== null;
    } catch (error) {
      this.logger.warn('⚠️ Erreur isTaskElement', error);
      return false;
    }
  }

  /**
   * ✅ NOUVEAU : Gère les clics sur les tâches
   */
  private handleTaskClick(target: HTMLElement, event: Event): void {
    try {
      // Si c'est un clic sur la checkbox, laisser l'événement se propager normalement
      if (target.matches('input[type="checkbox"]')) {
        this.logger.debug('✅ Clic sur checkbox de tâche - délégation au plugin Tasks');
        
        // Programmer une vérification après que le plugin Tasks ait traité l'événement
        setTimeout(() => {
          try {
            const newContent = this.extractCurrentContent();
            if (newContent && newContent !== this.content) {
              this.logger.debug('🔄 Contenu modifié après clic checkbox');
              this.handleContentChangeFromPlugin(newContent);
            }
          } catch (error) {
            this.logger.warn('⚠️ Erreur vérification après clic checkbox', error);
          }
        }, 200);
        
        return; // Laisser l'événement continuer
      }
      
      // Pour les autres parties de la tâche, ne pas entrer en mode édition
      this.logger.debug('✅ Clic sur élément de tâche (non-checkbox)');
      
    } catch (error) {
      this.logger.error('❌ Erreur handleTaskClick', error);
    }
  }

  /**
   * ✅ NOUVEAU : Détection d'éléments interactifs basiques (non-plugins)
   */
  private isBasicInteractiveElement(element: HTMLElement): boolean {
    try {
      if (!element) return false;
      
      let current: HTMLElement | null = element;
      
      while (current && current !== this.previewContainer) {
        const tagName = current.tagName?.toLowerCase() || '';
        
        // Éléments HTML basiques interactifs
        if (['input', 'button', 'a', 'select', 'textarea'].includes(tagName)) {
          return true;
        }
        
        // Classes Obsidian basiques
        if (current.matches('.internal-link, .external-link, .tag, .cm-hashtag')) {
          return true;
        }
        
        // Attributs Obsidian
        if (current.hasAttribute('href') || current.hasAttribute('data-href')) {
          return true;
        }
        
        current = current.parentElement;
      }
      
      return false;
      
    } catch (error) {
      this.logger.warn('⚠️ Erreur isBasicInteractiveElement', error);
      return false;
    }
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
          }, 1000);
          
        } catch (error) {
          this.logger.error('❌ Erreur dans gestionnaire input', error);
        }
      });

      this.textArea.addEventListener('blur', () => {
        try {
          this.logger.info('📝 Blur sur textarea → mode preview');
          this.exitEditMode();
        } catch (error) {
          this.logger.error('❌ Erreur dans gestionnaire blur', error);
        }
      });

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
      
      this.logger.info('✏️ Mode édition activé');
      
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
      
      this.logger.info('👁️ Mode preview activé');
      
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
      
      this.logger.info('🔧 Mode preview forcé après erreur');
      
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
      const pluginStats = this.pluginManager?.getStats();
      
      return {
        isEditing: this.isEditing,
        isInErrorState: this.isInErrorState,
        renderAttempts: this.renderAttempts,
        contentLength: this.content?.length || 0,
        hasPreviewContainer: !!this.previewContainer,
        hasEditorContainer: !!this.editorContainer,
        hasTextArea: !!this.textArea,
        sectionName: this.section?.name || 'unknown',
        pluginSupport: {
          enabled: !!this.pluginManager,
          tasksSupport: !!this.tasksEventHandler,
          ...pluginStats
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
   * ✅ AMÉLIORATION : Détruit proprement le composant avec nettoyage Tasks
   */
  destroy(): void {
    try {
      // Nettoyer les timers
      if (this.changeTimeout) {
        clearTimeout(this.changeTimeout);
        this.changeTimeout = null;
      }

      // ✅ NOUVEAU : Nettoyer les gestionnaires Tasks spécifiques
      if (this.tasksEventHandler && this.previewContainer) {
        this.previewContainer.removeEventListener('agile-board:task-changed', this.tasksEventHandler as EventListener);
        this.tasksEventHandler = undefined;
      }

      // ✅ NOUVEAU : Nettoyer l'observer des tâches
      if ((this as any).taskObserver) {
        try {
          (this as any).taskObserver.disconnect();
          (this as any).taskObserver = undefined;
        } catch (error) {
          this.logger.warn('⚠️ Erreur nettoyage taskObserver', error);
        }
      }

      // ✅ NOUVEAU : Nettoyer le gestionnaire de plugins
      if (this.pluginManager) {
        this.pluginManager.dispose();
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
      
      this.logger.info('🗑️ MarkdownFrame détruite proprement avec support universel et Tasks spécialisé');
      
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