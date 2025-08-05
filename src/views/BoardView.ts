import { FileView, TFile } from 'obsidian';
import { BoardLayout, FileSection } from '../types';
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
      // Utiliser les services via le plugin
      const services = this.plugin.getServices ? this.plugin.getServices() : null;
      
      if (services) {
        console.log('🔧 Utilisation du nouveau système de services');
        await this.renderWithServices(services);
      }
    } catch (error) {
      console.error('❌ Erreur dans renderBoardLayout:', error);
      this.showError('Erreur lors du rendu du tableau');
    }
  }

  /**
   * Rendu avec ServiceContainer
   */
  private async renderWithServices(services: any): Promise<void> {
    try {
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

      const analysis = await services.file.analyzeFile(this.file!);
      
      // 🔧 CODE DE DEBUG - À placer ici quand les variables sont définies
      console.log('🔍 DEBUG Layout :');
      if (layout) {
        console.log('📋 Sections trouvées dans le layout:');
        layout.forEach((block, index) => {
          console.log(`  ${index + 1}. "${block.title}" (x:${block.x}, y:${block.y}, w:${block.w}, h:${block.h})`);
        });
      }

      console.log('🔍 DEBUG Sections dans le fichier:', analysis.existingSections);
      if (analysis.existingSections) {
        analysis.existingSections.forEach((section, index) => {
          console.log(`  ${index + 1}. "${section.name}" (${section.lines?.length || 0} lignes)`);
        });
      }

      console.log('🔍 DEBUG Correspondances:');
      layout.forEach(block => {
          const normalize = (str: string) => str.trim().toLowerCase();
          analysis.existingSections.forEach(section => {
              console.log(
                  `[DEBUG] Compare "${normalize(section.name)}" <-> "${normalize(block.title)}"`
              );
          });
          const matchingSection = analysis.existingSections.find(
              s => normalize(s.name) === normalize(block.title)
          );
          console.log(`  Layout "${block.title}" → Section "${matchingSection?.name || 'NON TROUVÉE'}"`);
          if (matchingSection) {
              console.log('    Contenu section:', matchingSection);
          }
      });
      
      if (analysis.missingSections.length > 0) {
        console.log('⚠️ Sections manquantes:', analysis.missingSections);
        this.showMissingSectionsError(analysis.missingSections);
        return;
      }

      // Convertir les ParsedSection vers le format attendu
      const convertedSections = analysis.existingSections.map(section => ({
        name: section.name,
        content: section.content,
        lines: section.lines || section.content.split('\n'),
        startLine: section.startLine || 0,
        endLine: section.endLine || 0,
        isFromLayout: section.isFromLayout || true
      }));

      await this.createBoard(layout, convertedSections);
      
    } catch (error) {
      console.error('❌ Erreur dans renderWithServices:', error);
      throw error;
    }
  }


  /**
   * Crée le tableau avec les sections
   */
  private async createBoard(layout: BoardLayout[], sections: any[]): Promise<void> {
    console.log('🏗️ Création du board avec', layout.length, 'blocs et', sections.length, 'sections');
    this.gridContainer = null;
    this.contentEl.empty();
    
    // Créer le conteneur principal - styles gérés par CSS
    this.gridContainer = this.contentEl.createDiv('agile-board-grid');
    this.gridContainer.style.cssText =` 
      display: grid;
      grid-template-columns: repeat(24, 1fr);
      gap: 0.5rem;
      padding: 1rem;
      height: 100%;
      overflow: auto;
      ` ;
    console.log('🟦 gridContainer créé:', this.gridContainer);
    console.log('🟦 gridContainer créé (HTML):', this.gridContainer.outerHTML);

    // Créer les frames pour chaque section
    for (const block of layout) {
      const section = sections.find(s => s.name === block.title);
      if (section) {
        await this.createFrame(block, section);
      } else {
        console.warn(`⚠️ Section "${block.title}" non trouvée`);
      }
    }
    
    console.log('✅ Board créé avec succès');
  }

  /**
   * Crée une frame pour une section
   */
  private async createFrame(layout: BoardLayout, section: any): Promise<void> {
    console.log(`🎯 Création frame pour "${layout.title}"`);
    try {
      const frameContainer = this.gridContainer!.createDiv('agile-board-frame');
      
      // Appliquer le positionnement CSS Grid
      frameContainer.style.gridColumn = `${layout.x + 1} / span ${layout.w}`;
      frameContainer.style.gridRow = `${layout.y + 1} / span ${layout.h}`;
      frameContainer.style.border = '1px solid var(--background-modifier-border)';
      frameContainer.style.minHeight = '100px';
      frameContainer.style.display = 'flex';
      frameContainer.style.flexDirection = 'column';
      frameContainer.style.overflow = 'hidden'; // Empêche le contenu de déborder du cadre

      console.log('🟦 Frame DOM ajoutée frame:', frameContainer);
      console.log('🟦 Frame DOM ajoutée frame (HTML):', frameContainer.outerHTML);
      // Titre de la section
      const titleEl = frameContainer.createDiv('frame-title');
      titleEl.textContent = layout.title;
      titleEl.style.fontWeight = 'bold';
      titleEl.style.marginBottom = '0.5rem';
      titleEl.style.borderBottom = '1px solid var(--background-modifier-border)'; // Séparateur visuel
      titleEl.style.color = 'var(--text-accent)';

      // 2. CRÉER UN CONTENEUR DÉDIÉ POUR LE CONTENU
      const contentContainer = frameContainer.createDiv('frame-content');
      // Ces styles permettent au conteneur de remplir l'espace et de défiler si nécessaire
      contentContainer.style.flex = '1';
      contentContainer.style.overflowY = 'auto';
      contentContainer.style.padding = '0.5rem';

      // Préparer l'objet FileSection pour MarkdownFrame
      const frameSection: FileSection = {
        start: section.startLine || 0,
        end: section.endLine || 0,
        lines: section.lines || section.content.split('\n'),
        name: section.name,
        content: section.content
      };

      console.log('🟦 Frame DOM ajoutée Section:', frameSection);
      // Créer la MarkdownFrame
      const frame = new MarkdownFrame(
        this.app,              
        contentContainer, // On passe le conteneur dédié, pas le cadre entier        
        this.file!,           
        frameSection,         
        (content: string) => this.onFrameContentChanged(frameSection.name || section.name, content)
      );
      
      this.frames.set(layout.title, frame);
      console.log(`✅ Frame "${layout.title}" créée`);
      
    } catch (error) {
      console.error(`❌ Erreur création frame "${layout.title}":`, error);
      throw error;
    }
  }

  /**
   * Gestionnaire de changement de contenu
   */
  private async onFrameContentChanged(sectionName: string, newContent: string): Promise<void> {
    try {
      console.log(`💾 Sauvegarde section "${sectionName}"`);
      
      const services = this.plugin.getServices ? this.plugin.getServices() : null;
      
      if (services && services.file.updateSectionContent) {
        await services.file.updateSectionContent(this.file!, sectionName, newContent);
      } else if (this.plugin.fileService && this.plugin.fileService.updateSectionContent) {
        await this.plugin.fileService.updateSectionContent(this.file!, sectionName, newContent);
      }
      
    } catch (error) {
      console.error(`❌ Erreur sauvegarde section "${sectionName}":`, error);
    }
  }

  /**
   * Affiche une erreur avec sections manquantes
   */
  private showMissingSectionsError(missingSections: string[]): void {
    this.contentEl.empty();
    const errorContainer = this.contentEl.createDiv('agile-board-error');
    
    errorContainer.createEl('h3', { text: '⚠️ Sections manquantes' });
    errorContainer.createEl('p', { 
      text: `Ce fichier ne contient pas toutes les sections requises :`
    });
    
    const list = errorContainer.createEl('ul');
    missingSections.forEach(section => {
      list.createEl('li', { text: `• ${section}` });
    });
    
    const button = errorContainer.createEl('button', {
      text: '✨ Créer les sections manquantes',
      cls: 'mod-cta'
    });
    
    button.addEventListener('click', async () => {
      try {
        const services = this.plugin.getServices ? this.plugin.getServices() : null;
        console.log('🔍 DEBUG avant test services renderBoardLayout');
        if (services) {
          await services.file.createMissingSections(this.file!);
        }
        console.log('🔍 DEBUG avant renderBoardLayout');
        await this.renderBoardLayout();
      } catch (error) {
        console.error('Erreur création sections:', error);
      }
    });
  }

  /**
   * Affiche une erreur générique
   */
  private showError(message: string): void {
    this.contentEl.empty();
    const errorEl = this.contentEl.createDiv('agile-board-error');
    errorEl.createEl('h3', { text: '❌ Erreur' });
    errorEl.createEl('p', { text: message });
  }

  /**
   * Nettoie les ressources
   */
  private cleanup(): void {
    this.frames.forEach(frame => frame.destroy());
    this.frames.clear();
    this.gridContainer?.remove();
    this.gridContainer = null;
    console.log('🔍 DEBUG cleanup');
  }
}