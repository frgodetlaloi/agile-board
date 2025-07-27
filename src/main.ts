/**
 * Plugin Agile Board pour Obsidian
 * 
 * Ce plugin permet de créer des tableaux de bord personnalisés
 * à partir de notes markdown avec des layouts prédéfinis.
 * 
 * @author Votre nom
 * @version 1.0.0
 */

import { Plugin } from 'obsidian';

// Types
import { BoardSettings } from './types';

// Services
import { LayoutService } from './services/LayoutService';
import { FileService } from './services/FileService';

// Views
import { BoardView, BOARD_VIEW_TYPE } from './views/BoardView';

// Managers
import { ViewSwitcher } from './managers/ViewSwitcher';
import { ModelDetector } from './managers/ModelDetector';

// Utils
import { createDefaultSettings } from './utils/settings';

/**
 * Plugin principal Agile Board
 * 
 * Gère l'initialisation et la coordination de tous les services
 */
export default class AgileBoardPlugin extends Plugin {
  settings!: BoardSettings;
  layoutService!: LayoutService;
  fileService!: FileService;
  viewSwitcher!: ViewSwitcher;
  modelDetector!: ModelDetector;

  /**
   * Initialisation du plugin
   */
  async onload(): Promise<void> {
    console.log('🚀 Loading Agile Board Plugin...');
    
    try {
      // Charger les paramètres
      await this.loadSettings();
      
      // Initialiser les services
      await this.initializeServices();
      
      // Enregistrer la vue Board
      this.registerView(BOARD_VIEW_TYPE, (leaf) => new BoardView(leaf, this));
      
      // Initialiser les managers
      await this.initializeManagers();
      
      // Enregistrer les commandes
      this.registerCommands();
      
      // Interface utilisateur
      this.addStatusBarItem().setText('Agile Board Ready');
      
      console.log('✅ Agile Board Plugin loaded successfully');
      console.log('📋 Layouts disponibles:', this.layoutService.getAllModelNames());
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement du plugin:', error);
    }
  }

  /**
   * Nettoyage lors du déchargement du plugin
   */
  async onunload(): Promise<void> {
    console.log('🛑 Unloading Agile Board Plugin...');
    
    // Nettoyer les managers
    this.modelDetector?.onUnload();
    this.viewSwitcher?.stop();
    
    console.log('✅ Agile Board Plugin unloaded');
  }

  /**
   * Initialise tous les services
   */
  private async initializeServices(): Promise<void> {
    this.layoutService = new LayoutService(this);
    this.layoutService.load();
    
    this.fileService = new FileService(this.app);
  }

  /**
   * Initialise tous les managers
   */
  private async initializeManagers(): Promise<void> {
    this.viewSwitcher = new ViewSwitcher(this);
    this.modelDetector = new ModelDetector(this);
    
    this.viewSwitcher.addSwitchButton();
    this.modelDetector.onLoad();
  }

  /**
   * Enregistre toutes les commandes du plugin
   */
  private registerCommands(): void {
    // Commande de basculement
    this.addCommand({
      id: 'switch-to-board-view',
      name: 'Switch to Board View',
      callback: () => this.activateBoardView()
    });

    // Commandes de création de notes
    this.registerCreationCommands();
    
    // Commandes utilitaires
    this.registerUtilityCommands();
  }

  /**
   * Enregistre les commandes de création de notes
   */
  private registerCreationCommands(): void {
    const layouts = [
      { id: 'eisenhower', name: 'Eisenhower Matrix' },
      { id: 'kanban', name: 'Kanban Board' },
      { id: 'gtd', name: 'GTD Board' },
      { id: 'weekly', name: 'Weekly Planner' },
      { id: 'daily', name: 'Daily Planner' },
      { id: 'project', name: 'Project Board' },
      { id: 'simple', name: 'Simple Board' },
      { id: 'cornell', name: 'Cornell Notes' },
      { id: 'tasks-dashboard', name: 'Tasks Dashboard' },
      { id: 'dataview-analytics', name: 'Dataview Analytics' }
    ];

    layouts.forEach(layout => {
      this.addCommand({
        id: `create-${layout.id}-note`,
        name: `Create ${layout.name} Note`,
        callback: () => this.createNoteWithLayout(`layout_${layout.id.replace('-', '_')}`)
      });
    });
  }

  /**
   * Enregistre les commandes utilitaires
   */
  private registerUtilityCommands(): void {
    this.addCommand({
      id: 'list-layouts',
      name: 'List Available Layouts',
      callback: () => this.showAvailableLayouts()
    });

    this.addCommand({
      id: 'create-missing-sections',
      name: 'Create Missing Sections for Current Layout',
      checkCallback: (checking: boolean) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return false;

        const fileCache = this.app.metadataCache.getFileCache(activeFile);
        const layoutName = fileCache?.frontmatter?.['agile-board'];
        if (!layoutName) return false;

        if (!checking) {
          this.createMissingSectionsForCurrentFile();
        }
        return true;
      }
    });

    this.addCommand({
      id: 'force-update-buttons',
      name: 'Force Update Board Buttons',
      callback: () => {
        this.modelDetector.forceUpdate();
        console.log('🔄 Boutons mis à jour manuellement');
      }
    });
  }

  /**
   * Active la vue Board pour le fichier actuel
   */
  async activateBoardView(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      console.log('❌ Aucun fichier actif');
      return;
    }

    const leaf = this.app.workspace.activeLeaf;
    if (leaf) {
      await leaf.setViewState({
        type: BOARD_VIEW_TYPE,
        state: { file: activeFile.path }
      });
      console.log('🎯 Basculement vers Board View pour:', activeFile.basename);
    }
  }

  /**
   * Crée une note avec un layout spécifique
   */
  async createNoteWithLayout(layoutName: string): Promise<void> {
    const layout = this.layoutService.getModel(layoutName);
    if (!layout) {
      console.error(`❌ Layout "${layoutName}" non trouvé`);
      return;
    }

    const frontmatter = `---
agile-board: ${layoutName}
---

`;

    const sections = layout
      .map(block => `# ${block.title}\n\n`)
      .join('');

    const content = frontmatter + sections;
    
    const layoutDisplayName = this.layoutService.getLayoutDisplayName(layoutName);
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${layoutDisplayName} ${timestamp}.md`;
    
    try {
      const file = await this.app.vault.create(fileName, content);
      await this.app.workspace.getLeaf().openFile(file);
      console.log(`✅ Note "${fileName}" créée avec layout ${layoutName}`);
    } catch (error) {
      console.error(`❌ Erreur création note:`, error);
    }
  }

  /**
   * Affiche la liste des layouts disponibles
   */
  private showAvailableLayouts(): void {
    const layouts = this.layoutService.getAllModelsInfo();
    let message = 'Layouts disponibles :\n\n';
    
    layouts.forEach(layout => {
      message += `• **${layout.displayName}** (${layout.blockCount} sections)\n`;
      message += `  Sections: ${layout.sections.join(', ')}\n\n`;
    });

    // Créer une modale simple pour afficher les layouts
    const modal = new (require('obsidian').Modal)(this.app);
    modal.contentEl.innerHTML = `
      <h2>Layouts Agile Board</h2>
      <div style="white-space: pre-wrap; font-family: var(--font-text);">${message}</div>
    `;
    modal.open();
  }

  /**
   * Crée les sections manquantes pour le fichier actuel
   */
  private async createMissingSectionsForCurrentFile(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    const fileCache = this.app.metadataCache.getFileCache(activeFile);
    const layoutName = fileCache?.frontmatter?.['agile-board'];
    if (!layoutName) return;

    const layout = this.layoutService.getModel(layoutName);
    if (!layout) return;

    try {
      const sectionsCreated = await this.fileService.createMissingSections(activeFile, layout);
      if (sectionsCreated) {
        console.log('✅ Sections manquantes créées pour:', activeFile.basename);
        
        // Si on est en mode Board, recharger la vue
        const boardView = this.app.workspace.getActiveViewOfType(BoardView);
        if (boardView) {
          setTimeout(() => {
            boardView.renderBoardLayout();
          }, 500);
        }
      } else {
        console.log('ℹ️ Aucune section manquante à créer');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création des sections:', error);
    }
  }

  /**
   * Charge les paramètres du plugin
   */
  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, createDefaultSettings(), await this.loadData());
  }

  /**
   * Sauvegarde les paramètres du plugin
   */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}