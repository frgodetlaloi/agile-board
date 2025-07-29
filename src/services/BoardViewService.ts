/**
 * =============================================================================
 * SERVICE DE GESTION DES VUES BOARD
 * =============================================================================
 * 
 * Ce service gère le basculement entre la vue markdown normale
 * et la vue board pour les fichiers avec layout agile-board.
 * 
 * RESPONSABILITÉS :
 * - Détecter si un fichier a un layout agile-board
 * - Basculer vers la vue board appropriée
 * - Gérer l'état des vues (markdown ↔ board)
 * - Valider la compatibilité des fichiers
 * - Synchroniser les données entre les vues
 * 
 * ARCHITECTURE :
 * - Utilise l'API Workspace d'Obsidian
 * - Intégration avec LayoutService pour validation
 * - Logging détaillé pour traçabilité
 * - Gestion d'erreurs robuste
 */

// =============================================================================
// IMPORTS
// =============================================================================

import { App, TFile, WorkspaceLeaf, Notice } from 'obsidian';
import { LayoutService } from './LayoutService';
import { LoggerService } from './LoggerService';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Informations sur un fichier avec layout agile-board
 */
export interface BoardFileInfo {
    /** Fichier concerné */
    file: TFile;
    /** Nom du layout détecté */
    layoutName: string;
    /** Nom d'affichage du layout */
    displayName: string;
    /** Layout est-il valide ? */
    isValid: boolean;
    /** Sections disponibles */
    sections: string[];
}

/**
 * Options pour le basculement de vue
 */
export interface ViewSwitchOptions {
    /** Fichier cible (défaut: fichier actif) */
    targetFile?: TFile;
    /** Forcer le basculement même si déjà en vue board */
    forceSwitch?: boolean;
    /** Créer un nouvel onglet */
    newTab?: boolean;
    /** Position du nouvel onglet */
    tabPosition?: 'left' | 'right' | 'current';
}

/**
 * Résultat du basculement
 */
export interface ViewSwitchResult {
    /** Succès du basculement */
    success: boolean;
    /** Fichier traité */
    file: TFile;
    /** Layout utilisé */
    layoutName: string;
    /** Onglet de la vue board */
    boardLeaf: WorkspaceLeaf;
    /** Message descriptif */
    message: string;
}

// =============================================================================
// SERVICE PRINCIPAL
// =============================================================================

/**
 * Service de gestion des vues board
 */
export class BoardViewService {
    
    /** ID de la vue board (doit correspondre à celui enregistré dans main.ts) */
    private static readonly BOARD_VIEW_TYPE = 'agile-board-view';
    
    /**
     * Constructeur avec injection de dépendances
     */
    constructor(
        private app: App,
        private layoutService: LayoutService,
        private logger?: LoggerService
    ) {}

    // =========================================================================
    // MÉTHODE PRINCIPALE
    // =========================================================================

    /**
     * Bascule vers la vue board pour un fichier
     * 
     * @param options - Options de basculement
     * @returns Promise<ViewSwitchResult> - Résultat du basculement
     */
    async switchToBoardView(options: ViewSwitchOptions = {}): Promise<ViewSwitchResult> {
        this.logger?.navigation('Début basculement vers vue board', { options });
        
        try {
            // Déterminer le fichier cible
            const targetFile = options.targetFile || this.app.workspace.getActiveFile();
            if (!targetFile) {
                throw new Error('Aucun fichier actif ou spécifié');
            }
            
            // Analyser le fichier
            const fileInfo = await this.analyzeFile(targetFile);
            if (!fileInfo.isValid) {
                throw new Error(`Fichier incompatible: ${fileInfo.layoutName ? `layout "${fileInfo.layoutName}" invalide` : 'aucun layout agile-board'}`);
            }
            
            // Vérifier si déjà en vue board
            if (!options.forceSwitch && this.isCurrentlyInBoardView(targetFile)) {
                const message = 'Fichier déjà affiché en vue board';
                this.logger?.info(message, { fileName: targetFile.name });
                return {
                    success: true,
                    file: targetFile,
                    layoutName: fileInfo.layoutName,
                    boardLeaf: this.getCurrentBoardLeaf(targetFile)!,
                    message
                };
            }
            
            // Effectuer le basculement
            const boardLeaf = await this.createBoardView(targetFile, fileInfo, options);
            
            const result: ViewSwitchResult = {
                success: true,
                file: targetFile,
                layoutName: fileInfo.layoutName,
                boardLeaf,
                message: `Vue board "${fileInfo.displayName}" activée`
            };
            
            this.logger?.success('Basculement réussi', {
                fileName: targetFile.name,
                layoutName: fileInfo.layoutName,
                displayName: fileInfo.displayName
            });
            
            new Notice(`📊 Vue board "${fileInfo.displayName}" activée`, 2000);
            return result;
            
        } catch (error) {
            this.logger?.error('Erreur lors du basculement', {
                message: error.message,
                fileName: options.targetFile?.name || 'non spécifié'
            });
            
            new Notice(`❌ Impossible de basculer: ${error.message}`, 4000);
            
            return {
                success: false,
                file: options.targetFile || this.app.workspace.getActiveFile()!,
                layoutName: '',
                boardLeaf: null as any,
                message: error.message
            };
        }
    }

    // =========================================================================
    // ANALYSE DE FICHIERS
    // =========================================================================

    /**
     * Analyse un fichier pour déterminer sa compatibilité board
     */
    async analyzeFile(file: TFile): Promise<BoardFileInfo> {
        this.logger?.debug('Analyse du fichier', { fileName: file.name });
        
        try {
            // Lire les métadonnées du fichier
            const fileCache = this.app.metadataCache.getFileCache(file);
            const layoutName = fileCache?.frontmatter?.['agile-board'];
            
            // Pas de layout spécifié
            if (!layoutName) {
                return {
                    file,
                    layoutName: '',
                    displayName: '',
                    isValid: false,
                    sections: []
                };
            }
            
            // Vérifier que le layout existe
            const layout = this.layoutService.getModel(layoutName);
            const layoutInfo = this.layoutService.getModelInfo(layoutName);
            
            if (!layout || !layoutInfo) {
                return {
                    file,
                    layoutName,
                    displayName: layoutName,
                    isValid: false,
                    sections: []
                };
            }
            
            // Fichier valide
            return {
                file,
                layoutName,
                displayName: layoutInfo.displayName,
                isValid: true,
                sections: layout.map(block => block.title)
            };
            
        } catch (error) {
            this.logger?.error('Erreur analyse fichier', error);
            
            return {
                file,
                layoutName: '',
                displayName: '',
                isValid: false,
                sections: []
            };
        }
    }

    /**
     * Vérifie si un fichier est actuellement affiché en vue board
     */
    isCurrentlyInBoardView(file: TFile): boolean {
        return this.getCurrentBoardLeaf(file) !== null;
    }

    /**
     * Trouve l'onglet board actuel pour un fichier
     */
    getCurrentBoardLeaf(file: TFile): WorkspaceLeaf | null {
        const leaves = this.app.workspace.getLeavesOfType(BoardViewService.BOARD_VIEW_TYPE);
        
        return leaves.find(leaf => {
            const view = leaf.view as any;
            return view.file?.path === file.path;
        }) || null;
    }

    // =========================================================================
    // CRÉATION DE VUES
    // =========================================================================

    /**
     * Crée une nouvelle vue board
     */
    private async createBoardView(
        file: TFile, 
        fileInfo: BoardFileInfo, 
        options: ViewSwitchOptions
    ): Promise<WorkspaceLeaf> {
        this.logger?.debug('Création vue board', { 
            fileName: file.name,
            layoutName: fileInfo.layoutName 
        });
        
        // Déterminer où créer la vue
        let targetLeaf: WorkspaceLeaf;
        
        if (options.newTab) {
            // Créer un nouvel onglet
            targetLeaf = this.app.workspace.getLeaf(true);
        } else {
            // Réutiliser l'onglet actuel ou en créer un
            const activeLeaf = this.app.workspace.activeLeaf;
            
            if (activeLeaf && activeLeaf.view.getViewType() === 'markdown' && 
                (activeLeaf.view as any).file?.path === file.path) {
                // Convertir l'onglet markdown actuel
                targetLeaf = activeLeaf;
            } else {
                // Créer un nouvel onglet
                targetLeaf = this.app.workspace.getLeaf(true);
            }
        }
        
        // Ouvrir le fichier avec la vue board
        await targetLeaf.setViewState({
            type: BoardViewService.BOARD_VIEW_TYPE,
            state: {
                file: file.path,
                layoutName: fileInfo.layoutName
            }
        });
        
        // Activer l'onglet
        this.app.workspace.setActiveLeaf(targetLeaf, { focus: true });
        
        this.logger?.debug('Vue board créée', { 
            leafId: (targetLeaf as any).id,
            viewType: targetLeaf.view.getViewType()
        });
        
        return targetLeaf;
    }

    // =========================================================================
    // MÉTHODES UTILITAIRES
    // =========================================================================

    /**
     * Bascule vers la vue markdown pour un fichier en vue board
     */
    async switchToMarkdownView(file?: TFile): Promise<boolean> {
        const targetFile = file || this.app.workspace.getActiveFile();
        if (!targetFile) {
            new Notice('❌ Aucun fichier spécifié');
            return false;
        }
        
        try {
            const boardLeaf = this.getCurrentBoardLeaf(targetFile);
            if (!boardLeaf) {
                new Notice('📝 Fichier déjà en vue markdown');
                return true;
            }
            
            // Basculer vers la vue markdown
            await boardLeaf.setViewState({
                type: 'markdown',
                state: { file: targetFile.path }
            });
            
            this.logger?.success('Basculement vers vue markdown', { 
                fileName: targetFile.name 
            });
            
            new Notice('📝 Vue markdown activée', 2000);
            return true;
            
        } catch (error) {
            this.logger?.error('Erreur basculement markdown', error);
            new Notice(`❌ Erreur: ${error.message}`);
            return false;
        }
    }

    /**
     * Vérifie si un fichier a un layout agile-board (sans l'analyser complètement)
     */
    hasAgileBoardLayout(file: TFile): boolean {
        const fileCache = this.app.metadataCache.getFileCache(file);
        return !!fileCache?.frontmatter?.['agile-board'];
    }

    /**
     * Retourne la liste des fichiers avec layout agile-board dans le vault
     */
    async getAllBoardFiles(): Promise<BoardFileInfo[]> {
        const boardFiles: BoardFileInfo[] = [];
        const markdownFiles = this.app.vault.getMarkdownFiles();
        
        for (const file of markdownFiles) {
            if (this.hasAgileBoardLayout(file)) {
                const fileInfo = await this.analyzeFile(file);
                if (fileInfo.isValid) {
                    boardFiles.push(fileInfo);
                }
            }
        }
        
        return boardFiles;
    }

    /**
     * Ferme toutes les vues board ouvertes
     */
    async closeAllBoardViews(): Promise<number> {
        const boardLeaves = this.app.workspace.getLeavesOfType(BoardViewService.BOARD_VIEW_TYPE);
        let closedCount = 0;
        
        for (const leaf of boardLeaves) {
            await leaf.detach();
            closedCount++;
        }
        
        if (closedCount > 0) {
            this.logger?.info('Vues board fermées', { count: closedCount });
            new Notice(`📊 ${closedCount} vue(s) board fermée(s)`);
        }
        
        return closedCount;
    }

    // =========================================================================
    // MÉTHODES DE DIAGNOSTIC
    // =========================================================================

    /**
     * Retourne des informations de diagnostic sur les vues
     */
    getDiagnosticInfo(): {
        boardViewsCount: number;
        boardFiles: string[];
        activeView: string;
        activeFile: string;
    } {
        const boardLeaves = this.app.workspace.getLeavesOfType(BoardViewService.BOARD_VIEW_TYPE);
        const activeLeaf = this.app.workspace.activeLeaf
        const activeFile = this.app.workspace.getActiveFile();
        
        return {
            boardViewsCount: boardLeaves.length,
            boardFiles: boardLeaves.map(leaf => (leaf.view as any).file?.name || 'unknown'),
            activeView: activeLeaf?.view.getViewType() || 'none',
            activeFile: activeFile?.name || 'none'
        };
    }
}