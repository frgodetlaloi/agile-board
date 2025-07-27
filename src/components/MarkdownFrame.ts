import { App, TFile } from 'obsidian';
import { FileSection } from '../../types';

export class MarkdownFrame {
  private isEditing = false;
  private previewContainer!: HTMLElement;
  private editorContainer!: HTMLElement;
  private textArea!: HTMLTextAreaElement;
  private content: string;

  constructor(
    private app: App,
    private container: HTMLElement,
    private file: TFile,
    private section: FileSection,
    private onChange: (content: string) => void
  ) {
    this.content = section.lines.join('\n');
    this.initializeFrame();
  }

  private initializeFrame(): void {
    this.setupContainer();
    this.createPreviewContainer();
    this.createEditorContainer();
    this.showPreview();
  }

  private setupContainer(): void {
    this.container.empty();
    this.container.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    `;
  }

  private createPreviewContainer(): void {
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
  }

  private createEditorContainer(): void {
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
  }

  private async renderContent(): Promise<void> {
    this.previewContainer.empty();
    
    if (!this.content.trim()) {
      this.renderEmptyState();
      return;
    }

    // Utiliser le vrai moteur de rendu markdown d'Obsidian pour supporter les plugins
    try {
      const { MarkdownRenderer, Component } = require('obsidian');
      const component = new Component();
      
      // Rendu avec le moteur Obsidian qui supporte les plugins
      await MarkdownRenderer.renderMarkdown(
        this.content, 
        this.previewContainer, 
        this.file.path, 
        component
      );
      
      console.log('✅ Contenu rendu avec le moteur Obsidian (plugins supportés)');
      
      // Post-traitement pour les interactions
      this.setupInteractions();
      
    } catch (error) {
      console.warn('⚠️ Erreur rendu Obsidian, fallback vers rendu simple:', error);
      this.previewContainer.innerHTML = this.renderSimpleMarkdown(this.content);
    }
  }

  private setupInteractions(): void {
    // Permettre l'interaction avec les éléments Tasks
    const taskCheckboxes = this.previewContainer.querySelectorAll('input[type="checkbox"].task-list-item-checkbox');
    taskCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        this.handleTaskToggle(target);
      });
    });

    // Permettre l'interaction avec les liens internes
    const internalLinks = this.previewContainer.querySelectorAll('a.internal-link');
    internalLinks.forEach(link => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const href = link.getAttribute('data-href') || link.getAttribute('href');
        if (href) {
          this.app.workspace.openLinkText(href, this.file.path);
        }
      });
    });

    // Empêcher la propagation des clics sur les éléments interactifs
    const interactiveElements = this.previewContainer.querySelectorAll('input, button, a, .dataview, .task-list-item');
    interactiveElements.forEach(element => {
      element.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    });
  }

  private handleTaskToggle(checkbox: HTMLInputElement): void {
    const isChecked = checkbox.checked;
    const listItem = checkbox.closest('li');
    
    if (!listItem) return;

    // Trouver la ligne correspondante dans le markdown
    const taskText = this.getTaskTextFromListItem(listItem);
    if (!taskText) return;

    // Mettre à jour le markdown
    const lines = this.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (this.isTaskLine(line) && this.getTaskTextFromLine(line) === taskText) {
        // Basculer l'état de la tâche
        const newCheckState = isChecked ? '[x]' : '[ ]';
        lines[i] = line.replace(/\[[ x]\]/, newCheckState);
        
        this.content = lines.join('\n');
        
        // Déclencher la sauvegarde
        clearTimeout(this.changeTimeout);
        this.changeTimeout = setTimeout(() => {
          this.onChange(this.content);
        }, 500);
        
        console.log(`✅ Tâche ${isChecked ? 'cochée' : 'décochée'}: ${taskText}`);
        break;
      }
    }
  }

  private getTaskTextFromListItem(listItem: HTMLElement): string | null {
    const textNode = listItem.childNodes[listItem.childNodes.length - 1];
    return textNode?.textContent?.trim() || null;
  }

  private isTaskLine(line: string): boolean {
    return /^[\s]*[-*+] \[[ x]\]/.test(line);
  }

  private getTaskTextFromLine(line: string): string {
    const match = line.match(/^[\s]*[-*+] \[[ x]\] (.+)$/);
    return match ? match[1].trim() : '';
  }

  private renderSimpleMarkdown(content: string): string {
    let html = content;
    
    // Liens internes [[...]]
    html = html.replace(/\[\[([^\]]+)\]\]/g, '<span class="internal-link">$1</span>');
    
    // Gras **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italique *text*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Listes
    html = html.replace(/^[\s]*[-*+] (.+)$/gm, '<li>$1</li>');
    
    // Regrouper les <li> consécutives en <ul>
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
    
    // Fermer la liste si on termine par une liste
    if (inList) {
      result += '</ul>\n';
    }
    
    return result;
  }

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

  private setupPreviewEvents(): void {
    this.previewContainer.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // Ne pas entrer en mode édition si on clique sur un élément interactif
      if (this.isInteractiveElement(target)) {
        console.log('🎯 Clic sur élément interactif, pas de mode édition');
        return;
      }
      
      console.log('🖱️ Clic sur preview → mode édition');
      this.enterEditMode();
    });
  }

  private isInteractiveElement(element: HTMLElement): boolean {
    // Vérifier l'élément lui-même et ses parents
    let current: HTMLElement | null = element;
    
    while (current && current !== this.previewContainer) {
      const tagName = current.tagName.toLowerCase();
      const classList = Array.from(current.classList);
      
      // Éléments HTML interactifs
      if (['input', 'button', 'a', 'select', 'textarea'].includes(tagName)) {
        return true;
      }
      
      // Classes spéciales d'Obsidian et plugins
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
      
      // Attributs spéciaux
      if (current.hasAttribute('href') || 
          current.hasAttribute('data-href') || 
          current.hasAttribute('data-task') ||
          current.hasAttribute('contenteditable')) {
        return true;
      }
      
      current = current.parentElement;
    }
    
    return false;
  }

  private setupEditorEvents(): void {
    this.textArea.addEventListener('input', () => {
      this.content = this.textArea.value;
      // Déclencher le callback de changement avec un délai
      clearTimeout(this.changeTimeout);
      this.changeTimeout = setTimeout(() => {
        this.onChange(this.content);
      }, 1000);
    });

    this.textArea.addEventListener('blur', () => {
      console.log('📝 Blur sur textarea → mode preview');
      this.exitEditMode();
    });

    this.textArea.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        console.log('⌨️ Escape → mode preview');
        this.exitEditMode();
      }
    });
  }

  private changeTimeout: any;

  private enterEditMode(): void {
    this.isEditing = true;
    this.previewContainer.style.display = 'none';
    this.editorContainer.style.display = 'block';
    this.textArea.value = this.content;
    this.textArea.focus();
    console.log('✏️ Mode édition activé');
  }

  private exitEditMode(): void {
    if (!this.isEditing) return;
    
    this.isEditing = false;
    this.content = this.textArea.value;
    this.editorContainer.style.display = 'none';
    this.previewContainer.style.display = 'block';
    this.renderContent();
    console.log('👁️ Mode preview activé');
  }

  private showPreview(): void {
    this.previewContainer.style.display = 'block';
    this.editorContainer.style.display = 'none';
    this.isEditing = false;
  }

  updateContent(section: FileSection): void {
    this.section = section;
    this.content = section.lines.join('\n');
    
    if (this.isEditing) {
      this.textArea.value = this.content;
    } else {
      this.renderContent();
    }
  }

  getContent(): string {
    return this.isEditing ? this.textArea.value : this.content;
  }

  destroy(): void {
    this.container.empty();
    console.log('🗑️ MarkdownFrame détruite');
  }
}