import { TFile } from 'obsidian';
import type AgileBoardPlugin from '@/main';

export class ModelDetector {
  private processedFiles = new Set<string>();

  constructor(private plugin: AgileBoardPlugin) {}

  onLoad(): void {
    this.plugin.registerEvent(
      this.plugin.app.metadataCache.on('changed', (file) => {
        this.handleMetadataChanged(file);
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on('file-open', (file) => {
        if (file) {
          this.handleFileOpen(file);
        }
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.workspace.on('active-leaf-change', () => {
        setTimeout(() => {
          const activeFile = this.plugin.app.workspace.getActiveFile();
          if (activeFile) {
            this.handleFileOpen(activeFile);
          }
        }, 100);
      })
    );

    setTimeout(() => {
      this.processAllOpenFiles();
    }, 1000);
  }

  onUnload(): void {
    this.processedFiles.clear();
  }

  private handleMetadataChanged(file: TFile): void {
    console.log('📝 Métadonnées changées pour:', file.basename);
    this.processFile(file);
  }

  private handleFileOpen(file: TFile): void {
    console.log('📂 Fichier ouvert:', file.basename);
    this.processFile(file);
  }

  private processAllOpenFiles(): void {
    console.log('🔍 Traitement initial de tous les fichiers ouverts...');
    
    this.plugin.app.workspace.iterateAllLeaves((leaf) => {
      const view = leaf.view;
      if (view.getViewType() === 'markdown' && (view as any).file) {
        this.processFile((view as any).file);
      }
    });
  }

  private processFile(file: TFile): void {
    if (!file.path.endsWith('.md')) return;

    const fileKey = `${file.path}-${file.stat.mtime}`;
    
    if (this.processedFiles.has(fileKey)) return;
    this.processedFiles.add(fileKey);

    this.cleanupProcessedFiles();

    const hasLayout = this.hasAgileBoardLayout(file);
    console.log(`🎯 Fichier "${file.basename}" - Layout agile-board: ${hasLayout ? 'OUI' : 'NON'}`);

    setTimeout(() => {
      this.plugin.viewSwitcher.updateSwitchButtonForFile(file);
    }, 50);
  }

  private hasAgileBoardLayout(file: TFile): boolean {
    const fileCache = this.plugin.app.metadataCache.getFileCache(file);
    const layoutName = fileCache?.frontmatter?.['agile-board'];
    
    if (!layoutName) return false;

    const layout = this.plugin.layoutService.getModel(layoutName);
    if (!layout) {
      console.warn(`⚠️ Layout "${layoutName}" spécifié mais non trouvé`);
      return false;
    }

    return true;
  }

  private cleanupProcessedFiles(): void {
    if (this.processedFiles.size > 100) {
      const entries = Array.from(this.processedFiles);
      const toKeep = entries.slice(-50);
      this.processedFiles.clear();
      toKeep.forEach(entry => this.processedFiles.add(entry));
    }
  }

  forceUpdate(): void {
    this.processedFiles.clear();
    this.processAllOpenFiles();
  }
}