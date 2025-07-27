import { FileView, TFile } from 'obsidian';
import { BoardLayout } from '@/types';
import { MarkdownFrame } from '@/components/MarkdownFrame';
import type AgileBoardPlugin from '@/main';

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

    // Vérifier si le fichier a un layout agile-board
    const fileCache = this.app.metadataCache.getFileCache(this.file);
    const layoutName = fileCache?.frontmatter?.['agile-board'];
    console.log('🎯 Layout name détecté:', layoutName);

    if (!layoutName) {
      console.log('❌ Pas de layout agile-board trouvé');
      this.showNoLayoutMessage();
      return;
    }

    // Récupérer le layout depuis le service
    const layout = this.plugin.layoutService.getModel(layoutName);
    if (!layout) {
      console.log('❌ Layout non trouvé dans le service');
      this.showLayoutNotFoundMessage(layoutName);
      return;
    }

    // Parser les sections du fichier
    let sections = await this.plugin.fileService.parseSections(this.file);
    console.log('📚 Sections parsées:', Object.keys(sections));

    // Vérifier les sections manquantes
    const existingSections = Object.keys(sections);
    const requiredSections = layout.map(block => block.title);
    const missingSections = this.plugin.fileService.getMissingSections(existingSections, requiredSections);

    if (missingSections.length > 0) {
      console.log('🔧 Sections manquantes détectées:', missingSections);
      this.showMissingSectionsMessage(missingSections, layout);
      return;
    }

    console.log('✅ Rendu Board pour:', this.file.basename, 'avec layout:', layoutName);
    this.createGrid();
    this.createFrames(layout, sections);
  }

  private cleanup(): void {
    // Détruire toutes les frames
    for (const frame of this.frames.values()) {
      frame.destroy();
    }
    this.frames.clear();
    
    if (this.gridContainer) {
      this.gridContainer.remove();
      this.gridContainer = null;
    }
    this.contentEl.empty();
  }

  private createGrid(): void {
    console.log('🔲 Création de la grille');
    this.gridContainer = this.contentEl.createDiv('agile-board-grid');
    this.gridContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(24, 1fr);
      gap: 0.5rem;
      padding: 1rem;
      height: 100%;
      overflow: auto;
      background: var(--background-primary);
    `;
  }

  private createFrames(layout: BoardLayout[], sections: any): void {
    if (!this.gridContainer) {
      console.log('❌ Pas de gridContainer pour créer les frames');
      return;
    }

    console.log('🖼️ Création de', layout.length, 'frames');

    for (const block of layout) {
      console.log('🖼️ Création frame pour:', block.title);
      
      const frameElement = this.gridContainer.createDiv('agile-board-frame');
      frameElement.style.cssText = `
        grid-column: ${block.x + 1} / span ${block.w};
        grid-row: ${block.y + 1} / span ${block.h};
        min-height: 100px;
        display: flex;
        flex-direction: column;
        border: 2px solid var(--background-modifier-border);
        border-radius: 6px;
        background: var(--background-primary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      `;

      // Titre du cadre
      const titleElement = frameElement.createDiv('frame-title');
      titleElement.style.cssText = `
        padding: 0.5rem 0.75rem;
        font-weight: 500;
        color: var(--text-normal);
        border-bottom: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        font-size: 1.1rem;
      `;
      titleElement.textContent = block.title;

      // Contenu du cadre
      const contentElement = frameElement.createDiv('frame-content');
      contentElement.style.cssText = `
        flex: 1;
        overflow: auto;
        background: var(--background-primary);
      `;

      // Vérifier si la section existe
      const section = sections[block.title];
      if (section) {
        // Créer une MarkdownFrame pour l'édition
        const frame = new MarkdownFrame(
          this.app,
          contentElement,
          this.file!,
          section,
          (content) => this.onFrameContentChanged(block.title, content)
        );
        this.frames.set(block.title, frame);
        console.log(`✅ Frame éditable créée pour "${block.title}"`);
      } else {
        // Section manquante
        contentElement.style.padding = '0.75rem';
        contentElement.innerHTML = `
          <p><strong>❌ Section manquante:</strong> ${block.title}</p>
          <p><em>Sections disponibles:</em> ${Object.keys(sections).join(', ')}</p>
        `;
        console.log(`❌ Section "${block.title}" non trouvée`);
      }
    }
    
    console.log('✅ Toutes les frames créées');
  }

  private async onFrameContentChanged(sectionName: string, content: string): Promise<void> {
    if (!this.file) return;
    
    console.log(`💾 Changement détecté dans la section "${sectionName}"`);
    
    try {
      // Lire le fichier actuel
      const fileContent = await this.app.vault.read(this.file);
      const lines = fileContent.split('\n');
      
      // Trouver la section à modifier
      const sections = await this.plugin.fileService.parseSections(this.file);
      const section = sections[sectionName];
      
      if (!section) {
        console.log(`❌ Section "${sectionName}" non trouvée pour la sauvegarde`);
        return;
      }
      
      // Remplacer le contenu de la section
      const newLines = [
        ...lines.slice(0, section.start + 1), // Avant la section (inclus le titre)
        ...content.split('\n'),                // Nouveau contenu
        ...lines.slice(section.end)            // Après la section
      ];
      
      // Sauvegarder
      await this.app.vault.modify(this.file, newLines.join('\n'));
      console.log(`✅ Section "${sectionName}" sauvegardée`);
      
    } catch (error) {
      console.error(`❌ Erreur sauvegarde section "${sectionName}":`, error);
    }
  }

  private showNoLayoutMessage(): void {
    this.contentEl.empty();
    const message = this.contentEl.createDiv('no-layout-message');
    message.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 1.2em;
      color: var(--text-muted);
      text-align: center;
      padding: 2rem;
    `;
    message.innerHTML = `
      <div>
        <h3>❌ Pas de layout agile-board</h3>
        <p>Cette note n'a pas de layout agile-board configuré</p>
        <p>Ajoutez dans le frontmatter:<br><code>agile-board: layout_eisenhower</code></p>
      </div>
    `;
  }

  private showLayoutNotFoundMessage(layoutName: string): void {
    this.contentEl.empty();
    const message = this.contentEl.createDiv('layout-not-found-message');
    message.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 1.2em;
      color: var(--text-error);
      text-align: center;
      padding: 2rem;
    `;
    message.innerHTML = `
      <div>
        <h3>❌ Layout "${layoutName}" introuvable</h3>
        <p>Layouts disponibles: ${this.plugin.layoutService.getAllModelNames().join(', ')}</p>
      </div>
    `;
  }

  private showMissingSectionsMessage(missingBlocks: string[], layout: BoardLayout[]): void {
    this.contentEl.empty();
    const errorContainer = this.contentEl.createDiv('missing-sections-overlay');
    errorContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      height: 100%;
      padding: 2rem;
      text-align: center;
      background: var(--background-primary);
    `;

    const title = errorContainer.createEl('h2');
    title.textContent = '🔧 Sections manquantes détectées';
    title.style.cssText = `
      color: var(--text-normal);
      margin-bottom: 1rem;
    `;

    const description = errorContainer.createEl('p');
    description.textContent = 'Les sections suivantes sont requises pour ce layout :';
    description.style.cssText = `
      color: var(--text-muted);
      margin-bottom: 1rem;
    `;

    const sectionsList = errorContainer.createEl('ul');
    sectionsList.style.cssText = `
      list-style: none;
      padding: 0;
      margin: 1rem 0;
      color: var(--text-normal);
    `;

    missingBlocks.forEach(section => {
      const listItem = sectionsList.createEl('li');
      listItem.textContent = `# ${section}`;
      listItem.style.cssText = `
        font-family: var(--font-monospace);
        background: var(--background-secondary);
        padding: 0.5rem;
        margin: 0.25rem 0;
        border-radius: 4px;
      `;
    });

    const buttonContainer = errorContainer.createDiv();
    buttonContainer.style.cssText = `
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    `;

    // Bouton pour créer automatiquement
    const autoCreateButton = buttonContainer.createEl('button', { cls: 'mod-cta' });
    autoCreateButton.textContent = '✨ Créer automatiquement';
    autoCreateButton.style.cssText = `
      padding: 0.75rem 1.5rem;
      background: var(--interactive-accent);
      color: var(--text-on-accent);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
    `;

    autoCreateButton.addEventListener('click', async () => {
      if (!this.file) return;
      
      console.log('🔧 Création automatique des sections manquantes...');
      autoCreateButton.textContent = '⏳ Création...';
      autoCreateButton.disabled = true;
      
      try {
        await this.plugin.fileService.createMissingSections(this.file, layout);
        console.log('✅ Sections créées, rechargement du board...');
        
        // Recharger le board
        setTimeout(() => {
          this.renderBoardLayout();
        }, 500);
        
      } catch (error) {
        console.error('❌ Erreur création sections:', error);
        autoCreateButton.textContent = '❌ Erreur';
        setTimeout(() => {
          autoCreateButton.textContent = '✨ Créer automatiquement';
          autoCreateButton.disabled = false;
        }, 2000);
      }
    });

    // Bouton pour revenir au mode markdown
    const markdownButton = buttonContainer.createEl('button');
    markdownButton.textContent = '📝 Mode Markdown';
    markdownButton.style.cssText = `
      padding: 0.75rem 1.5rem;
      background: var(--background-secondary);
      color: var(--text-normal);
      border: 1px solid var(--background-