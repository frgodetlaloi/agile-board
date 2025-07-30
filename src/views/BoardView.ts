import { FileView, TFile } from 'obsidian';
import { BoardLayout } from '../types';
import { MarkdownFrame } from '../components/MarkdownFrame';
import type AgileBoardPlugin from '../main';

export const BOARD_VIEW_TYPE = 'agile-board-view';

export class BoardView extends FileView {
  private plugin: AgileBoardPlugin;
  private gridContainer: HTMLElement | null = null;
  private frames = new Map<string, MarkdownFrame>();

  constructor(leaf: any, plugin: AgileBoardPlugin) {
    super(leaf);
    this.plugin = plugin;
    console.log('🎯 BoardView constructor appelé');
  }

  getViewType(): string {
    return BOARD_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.file ? `${this.file.basename} (Board)` : 'Agile Board';
  }

  getIcon(): string {
    return 'layout-grid';
  }

  async onLoadFile(file: TFile): Promise<void> {
    console.log('📂 onLoadFile appelé pour:', file.basename);
    await this.renderBoardLayout();
  }

  async onUnloadFile(file: TFile): Promise<void> {
    console.log('📂 onUnloadFile appelé pour:', file.basename);
    this.cleanup();
  }

  // Méthode publique pour recharger le board
  async renderBoardLayout(): Promise<void> {
    console.log('🎨 renderBoardLayout début');
    
    if (!this.file) {
      console.log('❌ Pas de fichier dans renderBoardLayout');
      return;
    }

    console.log('📄 Fichier actuel:', this.file.basename);
    this.cleanup();

    try {
      // TRANSITION : Utiliser les services via le plugin
      const services = this.plugin.getServices ? this.plugin.getServices() : null;
      
      if (services) {
        // NOUVEAU SYSTÈME : Utiliser ServiceContainer
        await this.renderWithServices(services);
      } else {
        // ANCIEN SYSTÈME : Utiliser les services individuels
        await this.renderWithLegacyServices();
      }
    } catch (error) {
      console.error('❌ Erreur dans renderBoardLayout:', error);
      this.showError('Erreur lors du rendu du tableau');
    }
  }

  /**
   * NOUVEAU : Rendu avec ServiceContainer
   */
  private async renderWithServices(services: any): Promise<void> {
    const fileCache = this.app.metadataCache.getFileCache(this.file!);
    const layoutName = fileCache?.frontmatter?.['agile-board'];

    if (!layoutName) {
      this.showError('Ce fichier n\'a pas de layout agile-board');
      return;
    }

    const layout = services.layout.getModel(layoutName);
    if (!layout) {
      this.showError(`Layout "${layoutName}" non trouvé`);
      return;
    }

    // Analyser le fichier
    const analysis = await services.file.analyzeFile(this.file!);
    
    if (analysis.missingSections.length > 0) {
      this.showMissingSectionsError(analysis.missingSections);
      return;
    }

    await this.createBoard(layout, analysis.existingSections);
  }

  /**
   * ANCIEN : Rendu avec services individuels (pour compatibilité)
   */
  private async renderWithLegacyServices(): Promise<void> {
    const fileCache = this.app.metadataCache.getFileCache(this.file!);
    const layoutName = fileCache?.frontmatter?.['agile-board'];

    if (!layoutName) {
      this.showError('Ce fichier n\'a pas de layout agile-board');
      return;
    }

    const layout = this.plugin.layoutService?.getModel(layoutName);
    if (!layout) {
      this.showError(`Layout "${layoutName}" non trouvé`);
      return;
    }

    // Parser les sections avec l'ancien système
    const sections = await this.plugin.fileService?.parseSections(this.file!);
    if (!sections) {
      this.showError('Impossible de parser les sections');
      return;
    }

    // Vérifier les sections manquantes
    const requiredSections = layout.map((block: BoardLayout) => block.title);
    const existingSections = Object.keys(sections);
    const missingSections = requiredSections.filter(section => 
      !existingSections.includes(section)
    );

    if (missingSections.length > 0) {
      this.showMissingSectionsError(missingSections);
      return;
    }

    // Convertir pour compatibilité
    const convertedSections = Object.entries(sections).map(([name, content]) => ({
      name,
      content: content as string,
      lines: (content as string).split('\n'),
      startLine: 0,
      endLine: 0,
      isFromLayout: true
    }));

    await this.createBoard(layout, convertedSections);
  }

  /**
   * Crée le tableau avec les sections
   */
  private async createBoard(layout: BoardLayout[], sections: any[]): Promise<void> {
    this.contentEl.empty();
    
    // Créer le conteneur principal
    this.gridContainer = this.contentEl.createDiv('agile-board-grid');
    this.gridContainer.style.display = 'grid';
    this.gridContainer.style.gridTemplateColumns = 'repeat(24, 1fr)';
    this.gridContainer.style.gap = '1rem';
    this.gridContainer.style.padding = '1rem';

    // Créer les frames pour chaque section
    for (const block of layout) {
      const section = sections.find(s => s.name === block.title);
      if (section) {
        await this.createFrame(block, section);
      }
    }

    console.log('✅ Board créé avec succès');
  }

  /**
 * Crée une frame pour une section
 */
  private async createFrame(layout: BoardLayout, section: any): Promise<void> {
    const frameContainer = this.gridContainer!.createDiv('frame-container');
    
    // Appliquer le positionnement CSS Grid
    frameContainer.style.gridColumn = `${layout.x + 1} / span ${layout.w}`;
    frameContainer.style.gridRow = `${layout.y + 1} / span ${layout.h}`;
    frameContainer.style.border = '1px solid var(--background-modifier-border)';
    frameContainer.style.borderRadius = '8px';
    frameContainer.style.backgroundColor = 'var(--background-secondary)';
    frameContainer.style.padding = '0.5rem';

    // Créer le titre
    const titleEl = frameContainer.createDiv('frame-title');
    titleEl.textContent = layout.title;
    titleEl.style.fontWeight = 'bold';
    titleEl.style.marginBottom = '0.5rem';
    titleEl.style.color = 'var(--text-accent)';

    // CORRECTION : Créer la frame markdown avec les 5 paramètres requis
    const frame = new MarkdownFrame(
      this.app,              // 1. App instance
      frameContainer,        // 2. Container
      this.file!,           // 3. File
      section,              // 4. Section
      (content: string) => this.onFrameContentChanged(section.name, content) // 5. onChange callback
    );

    this.frames.set(layout.title, frame);
  }

  /**
   * Gestionnaire de changement de contenu
   */
  private async onFrameContentChanged(sectionName: string, content: string): Promise<void> {
    try {
      // TRANSITION : Utiliser le service approprié
      const services = this.plugin.getServices ? this.plugin.getServices() : null;
      
      if (services && services.file.updateSectionContent) {
        // NOUVEAU SYSTÈME
        await services.file.updateSectionContent(this.file!, sectionName, content);
      } else if (this.plugin.fileService) {
        // ANCIEN SYSTÈME - Méthode alternative
        console.log('Mise à jour de section (ancien système):', sectionName);
        // Implémentation basique pour la transition
        await this.updateSectionLegacy(sectionName, content);
      }
      
      console.log(`✅ Section "${sectionName}" mise à jour`);
    } catch (error) {
      console.error('❌ Erreur mise à jour section:', error);
    }
  }

  /**
   * Mise à jour de section (méthode legacy)
   */
  private async updateSectionLegacy(sectionName: string, content: string): Promise<void> {
    try {
      const fileContent = await this.app.vault.read(this.file!);
      const lines = fileContent.split('\n');
      const newLines: string[] = [];
      let inTargetSection = false;
      let sectionFound = false;

      for (const line of lines) {
        if (line.startsWith('# ')) {
          if (inTargetSection) {
            // Fin de la section précédente
            newLines.push(...content.split('\n'));
            inTargetSection = false;
          }
          
          const currentSection = line.substring(2).trim();
          if (currentSection === sectionName) {
            inTargetSection = true;
            sectionFound = true;
            newLines.push(line); // Garder le titre
            continue;
          }
        }
        
        if (!inTargetSection) {
          newLines.push(line);
        }
      }

      // Si on était encore dans la section à la fin
      if (inTargetSection) {
        newLines.push(...content.split('\n'));
      }

      if (sectionFound) {
        await this.app.vault.modify(this.file!, newLines.join('\n'));
      }
    } catch (error) {
      console.error('Erreur mise à jour legacy:', error);
    }
  }

  /**
   * Affiche une erreur
   */
  private showError(message: string): void {
    this.contentEl.empty();
    const errorEl = this.contentEl.createDiv('agile-board-error');
    errorEl.style.padding = '2rem';
    errorEl.style.textAlign = 'center';
    errorEl.style.color = 'var(--text-error)';
    errorEl.textContent = message;
  }

  /**
   * Affiche l'erreur de sections manquantes avec bouton d'action
   */
  private showMissingSectionsError(missingSections: string[]): void {
    this.contentEl.empty();
    
    const container = this.contentEl.createDiv('missing-sections-container');
    container.style.padding = '2rem';
    container.style.textAlign = 'center';

    const title = container.createEl('h3');
    title.textContent = 'Sections manquantes détectées';
    title.style.color = 'var(--text-error)';
    title.style.marginBottom = '1rem';

    const list = container.createEl('ul');
    list.style.listStyle = 'disc';
    list.style.textAlign = 'left';
    list.style.display = 'inline-block';
    list.style.marginBottom = '1.5rem';

    for (const section of missingSections) {
      const item = list.createEl('li');
      item.textContent = section;
      item.style.marginBottom = '0.5rem';
    }

    const button = container.createEl('button');
    button.textContent = 'Créer les sections manquantes';
    button.style.padding = '0.5rem 1rem';
    button.style.backgroundColor = 'var(--interactive-accent)';
    button.style.color = 'var(--text-on-accent)';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';

    button.addEventListener('click', async () => {
      try {
        // TRANSITION : Utiliser le service approprié
        const services = this.plugin.getServices ? this.plugin.getServices() : null;
        
        if (services) {
          await services.file.createMissingSections(this.file!);
        } else if (this.plugin.sectionManager) {
          await this.plugin.sectionManager.createMissingSections(this.file!);
        }
        
        // Recharger la vue
        await this.renderBoardLayout();
      } catch (error) {
        console.error('Erreur création sections:', error);
      }
    });
  }

  /**
   * Nettoie les ressources
   */
  private cleanup(): void {
    this.frames.forEach(frame => frame.destroy());
    this.frames.clear();
    this.gridContainer = null;
  }
}