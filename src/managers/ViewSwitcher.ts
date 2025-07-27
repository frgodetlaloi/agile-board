import { MarkdownView } from 'obsidian';
import { BoardView, BOARD_VIEW_TYPE } from '../views/BoardView';
import type AgileBoardPlugin from '@/main';

export class ViewSwitcher {
  constructor(private plugin: AgileBoardPlugin) {}

  async switchToBoardView(file: any): Promise<void> {
    const activeLeaf = this.plugin.app.workspace.activeLeaf;
    if (activeLeaf) {
      await activeLeaf.setViewState({
        type: BOARD_VIEW_TYPE,
        state: { file: file.path }
      });
      console.log('🎯 Basculement vers Board View');
    }
  }

  async switchToMarkdownView(file: any): Promise<void> {
    const activeLeaf = this.plugin.app.workspace.activeLeaf;
    if (activeLeaf) {
      await activeLeaf.setViewState({
        type: 'markdown',
        state: { file: file.path }
      });
      console.log('📝 Basculement vers Markdown View');
    }
  }

  isCurrentViewBoardView(): boolean {
    return this.plugin.app.workspace.getActiveViewOfType(BoardView) !== null;
  }

  isCurrentViewMarkdownView(): boolean {
    return this.plugin.app.workspace.getActiveViewOfType(MarkdownView) !== null;
  }

  hasAgileBoardLayout(file: any): boolean {
    const fileCache = this.plugin.app.metadataCache.getFileCache(file);
    return fileCache?.frontmatter?.['agile-board'] !== undefined;
  }

  addSwitchButton(): void {
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('active-leaf-change', () => {
        setTimeout(() => this.updateSwitchButton(), 50);
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on('file-open', () => {
        setTimeout(() => this.updateSwitchButton(), 50);
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.metadataCache.on('changed', (file) => {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile && activeFile.path === file.path) {
          setTimeout(() => this.updateSwitchButtonForFile(file), 100);
        }
      })
    );

    setTimeout(() => this.updateSwitchButton(), 100);
  }

  updateSwitchButtonForFile(file: any): void {
    const hasLayout = this.hasAgileBoardLayout(file);
    
    if (hasLayout) {
      if (this.isCurrentViewMarkdownView()) {
        this.ensureBoardModeButton();
      } else if (this.isCurrentViewBoardView()) {
        this.ensureNormalModeButton();
      }
    } else {
      this.removeSwitchButtons();
    }
  }

  private updateSwitchButton(): void {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) return;

    const hasLayout = this.hasAgileBoardLayout(activeFile);
    if (!hasLayout) {
      this.removeSwitchButtons();
      return;
    }

    if (this.isCurrentViewMarkdownView()) {
      this.ensureBoardModeButton();
    } else if (this.isCurrentViewBoardView()) {
      this.ensureNormalModeButton();
    } else {
      this.removeSwitchButtons();
    }
  }

  private ensureBoardModeButton(): void {
    const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!markdownView) return;

    const viewActions = markdownView.containerEl.querySelector('.view-actions');
    if (!viewActions) return;

    const existingButton = viewActions.querySelector('.agile-board-switch-button');
    if (existingButton) {
      existingButton.remove();
    }

    try {
      const button = markdownView.addAction('layout-grid', 'Mode Board', () => {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile) {
          this.switchToBoardView(activeFile);
        }
      });
      
      button.addClass('agile-board-switch-button');
      button.setAttribute('data-agile-board-button', 'board-mode');
      
      button.style.cssText = `
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
        border-radius: 3px;
        opacity: 1;
      `;
      
      console.log('🔘 Bouton Mode Board ajouté');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du bouton Mode Board:', error);
    }
  }

  private ensureNormalModeButton(): void {
    const boardView = this.plugin.app.workspace.getActiveViewOfType(BoardView);
    if (!boardView) return;

    const viewActions = boardView.containerEl.querySelector('.view-actions');
    if (!viewActions) return;

    const existingButton = viewActions.querySelector('.agile-board-switch-button');
    if (existingButton) {
      existingButton.remove();
    }

    try {
      const button = boardView.addAction('document', 'Mode Markdown', () => {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile) {
          this.switchToMarkdownView(activeFile);
        }
      });
      
      button.addClass('agile-board-switch-button');
      button.setAttribute('data-agile-board-button', 'normal-mode');
      
      button.style.cssText = `
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
        border-radius: 3px;
        opacity: 1;
      `;
      
      console.log('🔘 Bouton Mode Markdown ajouté');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du bouton Mode Markdown:', error);
    }
  }

  private removeSwitchButtons(): void {
    const buttons = document.querySelectorAll('.agile-board-switch-button');
    buttons.forEach(button => button.remove());
  }

  stop(): void {
    this.removeSwitchButtons();
  }
}