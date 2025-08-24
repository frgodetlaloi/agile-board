import { MarkdownView } from 'obsidian';
import { BoardView, BOARD_VIEW_TYPE } from '../views/BoardView';
import type AgileBoardPlugin from '../main';
import { LoggerService } from '../services/LoggerService'; 

/**
 * Gestionnaire de basculement entre vues - VERSION CORRIGÉE
 * 
 * CORRECTIONS APPLIQUÉES :
 * - Détection améliorée des changements de vue
 * - Debouncing pour éviter les appels multiples
 * - Gestion robuste des événements Obsidian
 * - Mise à jour forcée après basculement
 */
export class ViewSwitcher {
  
  private updateTimer: number | null = null;
  private readonly DEBOUNCE_DELAY = 150; // Délai pour éviter les appels multiples
  private lastProcessedFile: string | null = null;
  private lastViewType: string | null = null;
  private logger: LoggerService;

  constructor(private plugin: AgileBoardPlugin) {
    this.logger = plugin.logger;
    this.addSwitchButton(); // Initialisation des boutons FRED
    this.updateSwitchButton(); // Mise à jour initiale FRED
  }

  // ===========================================================================
  // MÉTHODES DE BASCULEMENT ENTRE VUES (CORRIGÉES)
  // ===========================================================================

  /**
   * Bascule vers la vue Board avec mise à jour forcée des boutons
   */
  async switchToBoardView(file: any): Promise<void> {
    const activeLeaf = this.plugin.app.workspace.activeLeaf;
    
    if (activeLeaf) {
      this.logger.info('🎯 Basculement vers Board View pour:', {file: file?.basename || file?.path || 'fichier inconnu'});
      
      await activeLeaf.setViewState({
        type: BOARD_VIEW_TYPE,
        state: { file: file.path }
      });
      
      // CORRECTION: Forcer la mise à jour des boutons après basculement
      this.scheduleButtonUpdate(file, 'board-switch');
    }
  }

  /**
   * Bascule vers la vue Markdown avec mise à jour forcée des boutons
   */
  async switchToMarkdownView(file: any): Promise<void> {
    const activeLeaf = this.plugin.app.workspace.activeLeaf;
    
    if (activeLeaf) {
      this.logger.info('📝 Basculement vers Markdown View pour:', {file: file.basename});
      
      await activeLeaf.setViewState({
        type: 'markdown',
        state: { file: file.path }
      });
      
      // CORRECTION: Forcer la mise à jour des boutons après basculement
      this.scheduleButtonUpdate(file, 'markdown-switch');
    }
  }

  // ===========================================================================
  // DÉTECTION DE CONTEXTE (AMÉLIORÉE)
  // ===========================================================================

  /**
   * Vérifie si la vue actuelle est notre BoardView
   */
  isCurrentViewBoardView(): boolean {
    const boardView = this.plugin.app.workspace.getActiveViewOfType(BoardView);
    return boardView !== null;
  }

  /**
   * Vérifie si la vue actuelle est la MarkdownView standard
   */
  isCurrentViewMarkdownView(): boolean {
    const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    return markdownView !== null;
  }

  /**
   * Obtient le type de vue actuel de manière sécurisée
   */
  getCurrentViewType(): string | null {
    try {
      const activeLeaf = this.plugin.app.workspace.activeLeaf;
      return activeLeaf?.view.getViewType() || null;
    } catch (error) {
      this.logger.warn('⚠️ Erreur lors de la détection du type de vue:', error);
      return null;
    }
  }

  /**
   * Vérifie si un fichier a un layout agile-board (avec cache)
   */
  hasAgileBoardLayout(file: any): boolean {
    if (!file) return false;
    
    try {
      const fileCache = this.plugin.app.metadataCache.getFileCache(file);
      const layoutName = fileCache?.frontmatter?.['agile-board'];
      
      if (!layoutName) return false;
      
      // Vérifier que le layout existe dans le service
      const layout = this.plugin.layoutService?.getModel(layoutName);
      return !!layout;
    } catch (error) {
      this.logger.warn('⚠️ Erreur lors de la vérification du layout:', error);
      return false;
    }
  }

  // ===========================================================================
  // GESTION DES ÉVÉNEMENTS (CORRIGÉE)
  // ===========================================================================

  /**
   * Configure les écouteurs d'événements avec debouncing amélioré
   */
  addSwitchButton(): void {
    // ÉVÉNEMENT 1 : Changement d'onglet actif
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('active-leaf-change', (leaf) => {
        this.scheduleButtonUpdate(null, 'active-leaf-change');
      })
    );

    // ÉVÉNEMENT 2 : Ouverture de fichier
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('file-open', (file) => {
        if (file) {
          this.scheduleButtonUpdate(file, 'file-open');
        }
      })
    );

    // ÉVÉNEMENT 3 : Changement de métadonnées
    this.plugin.registerEvent(
      this.plugin.app.metadataCache.on('changed', (file) => {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile && activeFile.path === file.path) {
          this.scheduleButtonUpdate(file, 'metadata-changed');
        }
      })
    );

    // ÉVÉNEMENT 4 : Changement de layout workspace (NOUVEAU)
    this.plugin.registerEvent(
      this.plugin.app.workspace.on('layout-change', () => {
        this.scheduleButtonUpdate(null, 'layout-change');
      })
    );

    // INITIALISATION : Mise à jour immédiate
    this.scheduleButtonUpdate(null, 'initialization');
  }

  /**
   * Programme une mise à jour avec debouncing intelligent
   */
  private isUpdating = false;

  private async scheduleButtonUpdate(file: any = null, trigger: string): Promise<void> {
      if (this.isUpdating) return; // Protection contre la réentrance
      
      if (this.updateTimer) {
          clearTimeout(this.updateTimer);
      }
      
      this.updateTimer = window.setTimeout(async () => {
          this.isUpdating = true;
          try {
              const targetFile = file || this.plugin.app.workspace.getActiveFile();
              if (targetFile) {
                  await this.updateSwitchButtonForFile(targetFile);
              }
          } finally {
              this.isUpdating = false;
              this.updateTimer = null;
          }
      }, this.DEBOUNCE_DELAY);
  }
  /**
   * Met à jour les boutons pour un fichier spécifique (logique corrigée)
   */
  updateSwitchButtonForFile(file: any): void {
    try {
      if (!file) {
        this.logger.info('⚠️ Pas de fichier pour mise à jour boutons', {context: 'updateSwitchButtonForFile'});
        this.removeSwitchButtons();
        return;
      }

      // Détecter l'état actuel
      const hasLayout = this.hasAgileBoardLayout(file);
      const currentViewType = this.getCurrentViewType();
      const isMarkdownView = this.isCurrentViewMarkdownView();
      const isBoardView = this.isCurrentViewBoardView();

      this.logger.info(`🔍 État actuel:`, {
        fileName: file.basename,
        hasLayout,
        currentViewType,
        isMarkdownView,
        isBoardView
      });

      // Mettre en cache pour éviter les updates redondants
      const fileKey = `${file.path}-${currentViewType}`;
      if (this.lastProcessedFile === fileKey) {
        this.logger.info('⏭️ Même état, pas de mise à jour nécessaire');
        return;
      }
      this.lastProcessedFile = fileKey;

      if (!hasLayout) {
        this.logger.info('❌ Pas de layout agile-board, suppression des boutons');
        this.removeSwitchButtons();
        return;
      }

      // LOGIQUE PRINCIPALE : Afficher le bon bouton selon la vue
      if (isMarkdownView && currentViewType === 'markdown') {
        this.logger.info('📝 Vue Markdown détectée → Afficher bouton Board');
        this.removeSwitchButtons(); // Nettoyer d'abord
        setTimeout(() => this.ensureBoardModeButton(), 50);
      } else if (isBoardView && currentViewType === BOARD_VIEW_TYPE) {
        this.logger.info('📊 Vue Board détectée → Afficher bouton Markdown');
        this.removeSwitchButtons(); // Nettoyer d'abord
        setTimeout(() => this.ensureNormalModeButton(), 50);
      } else {
        this.logger.info(`❓ Vue non reconnue (${currentViewType}) → Supprimer boutons`);
        this.removeSwitchButtons();
      }

    } catch (error) {
      this.logger.error('❌ Erreur lors de la mise à jour des boutons:', error);
      this.removeSwitchButtons(); // Sécurité : nettoyer en cas d'erreur
    }
  }

  /**
   * Met à jour les boutons selon le contexte actuel (méthode principale)
   */
  private updateSwitchButton(): void {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    this.updateSwitchButtonForFile(activeFile);
  }

  // ===========================================================================
  // CRÉATION ET GESTION DES BOUTONS (CORRIGÉES)
  // ===========================================================================

  /**
   * S'assure qu'un bouton "Mode Board" est présent en vue Markdown
   */
  private ensureBoardModeButton(): void {
    try {
      const markdownView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
      if (!markdownView) {
        this.logger.info('⚠️ Pas de vue Markdown active pour ajouter le bouton Board');
        return;
      }

      const viewActions = markdownView.containerEl.querySelector('.view-actions');
      if (!viewActions) {
        this.logger.info('⚠️ Zone view-actions non trouvée');
        return;
      }

      // Nettoyer les boutons existants
      const existingButton = viewActions.querySelector('.agile-board-switch-button');
      if (existingButton) {
        this.logger.info('🧹 Suppression bouton existant');
        existingButton.remove();
      }

      // Créer le nouveau bouton
      const button = markdownView.addAction('layout-grid', 'Basculer vers la vue Board', () => {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile) {
          this.logger.info('🎯 Clic bouton Board → Basculement');
          this.switchToBoardView(activeFile);
        }
      });
      
      // Configuration du bouton
      button.addClass('agile-board-switch-button');
      button.setAttribute('data-agile-board-button', 'board-mode');
      button.setAttribute('data-tooltip', 'Vue Board (Agile Board)');
      
      button.style.cssText = `
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
        border-radius: 3px;
        opacity: 1;
      `;
      
      this.logger.info('✅ Bouton Mode Board ajouté');
      
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'ajout du bouton Mode Board:', error);
    }
  }

  /**
   * S'assure qu'un bouton "Mode Markdown" est présent en vue Board
   */
  private ensureNormalModeButton(): void {
    try {
      const boardView = this.plugin.app.workspace.getActiveViewOfType(BoardView);
      if (!boardView) {
        this.logger.info('⚠️ Pas de vue Board active pour ajouter le bouton Markdown');
        return;
      }

      const viewActions = boardView.containerEl.querySelector('.view-actions');
      if (!viewActions) {
        this.logger.info('⚠️ Zone view-actions non trouvée dans BoardView');
        return;
      }

      // Nettoyer les boutons existants
      const existingButton = viewActions.querySelector('.agile-board-switch-button');
      if (existingButton) {
        this.logger.info('🧹 Suppression bouton existant');
        existingButton.remove();
      }

      // Créer le nouveau bouton
      const button = boardView.addAction('document', 'Basculer vers la vue Markdown', () => {
        const activeFile = this.plugin.app.workspace.getActiveFile();
        if (activeFile) {
          this.logger.info('📝 Clic bouton Markdown → Basculement');
          this.switchToMarkdownView(activeFile);
        }
      });
      
      // Configuration du bouton
      button.addClass('agile-board-switch-button');
      button.setAttribute('data-agile-board-button', 'normal-mode');
      button.setAttribute('data-tooltip', 'Vue Markdown (Standard)');
      
      button.style.cssText = `
        background-color: var(--interactive-accent);
        color: var(--text-on-accent);
        border-radius: 3px;
        opacity: 1;
      `;
      
      this.logger.info('✅ Bouton Mode Markdown ajouté');
      
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'ajout du bouton Mode Markdown:', error);
    }
  }

  /**
   * Supprime tous les boutons de basculement (méthode améliorée)
   */
  private removeSwitchButtons(): void {
    try {
      // Méthode 1 : Recherche globale dans le document
      const buttons = document.querySelectorAll('.agile-board-switch-button');
      buttons.forEach(button => {
        this.logger.info('🗑️ Suppression bouton trouvé');
        button.remove();
      });
      
      // Méthode 2 : Recherche spécifique dans les vues actives
      const views = [
        this.plugin.app.workspace.getActiveViewOfType(MarkdownView),
        this.plugin.app.workspace.getActiveViewOfType(BoardView)
      ].filter(view => view !== null);
      
      views.forEach(view => {
        const viewActions = view.containerEl.querySelector('.view-actions');
        if (viewActions) {
          const buttons = viewActions.querySelectorAll('.agile-board-switch-button');
          buttons.forEach(button => button.remove());
        }
      });
      
    } catch (error) {
      this.logger.error('❌ Erreur lors de la suppression des boutons:', error);
    }
  }

  // ===========================================================================
  // MÉTHODES DE DEBUGGING ET MAINTENANCE
  // ===========================================================================

  /**
   * Force une mise à jour complète (pour le debugging)
   */
  forceUpdate(): void {
    this.logger.info('🔄 Force update des boutons ViewSwitcher');
    this.lastProcessedFile = null; // Reset du cache
    
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    
    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (activeFile) {
      this.updateSwitchButtonForFile(activeFile);
    }
  }

  /**
   * Diagnostique l'état actuel du ViewSwitcher
   */
  getDiagnostics(): any {
    const activeFile = this.plugin.app.workspace.getActiveFile();
    const currentViewType = this.getCurrentViewType();
    
    return {
      activeFile: activeFile?.basename || 'none',
      currentViewType,
      isMarkdownView: this.isCurrentViewMarkdownView(),
      isBoardView: this.isCurrentViewBoardView(),
      hasLayout: activeFile ? this.hasAgileBoardLayout(activeFile) : false,
      lastProcessedFile: this.lastProcessedFile,
      updateTimerActive: this.updateTimer !== null,
      buttonsPresent: document.querySelectorAll('.agile-board-switch-button').length
    };
  }

  /**
   * Nettoie les ressources utilisées par le ViewSwitcher
   */
  stop(): void {
    this.logger.info('🛑 Arrêt du ViewSwitcher');
    
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.removeSwitchButtons();
    this.lastProcessedFile = null;
  }
}