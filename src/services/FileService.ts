import { App, TFile, Notice } from 'obsidian';
import { BoardLayout } from '../types';
import { LoggerService } from './LoggerService';
import { LayoutService } from './LayoutService';
import { FileCache } from '../cache/FileCache';
import { AgileBoardError } from '../errors/AgileBoardError';

export interface ParsedSection {
    name: string;
    startLine: number;
    endLine: number;
    content: string;
    lines: string[];
    isFromLayout: boolean;
}

export interface FileAnalysis {
    file: TFile;
    layoutName: string;
    existingSections: ParsedSection[];
    missingSections: string[];
    extraSections: string[];
    correctOrder: string[];
}

export interface NoteCreationOptions {
    layoutName: string;
    customFileName?: string;
    folder?: string;
    customContent?: Record<string, string>;
    autoOpen?: boolean;
}

export interface NoteCreationResult {
    file: TFile;
    layoutName: string;
    displayName: string;
    sectionsCount: number;
}

/**
 * Service consolidé de gestion des fichiers
 * Version adaptée aux services existants
 */
export class FileService {
    private cache: FileCache;

    constructor(
        private app: App,
        private layoutService: LayoutService,
        private logger?: LoggerService
    ) {
        this.cache = new FileCache();
    }

    // ===================================================================
    // MÉTHODES DE L'ANCIEN FILESERVICE (MAINTIEN COMPATIBILITÉ)
    // ===================================================================

    /**
 * Met à jour le contenu d'une section spécifique (méthode temporaire)
 */
  async updateSectionContent(file: TFile, sectionName: string, content: string): Promise<void> {
    try {
      const fileContent = await this.app.vault.read(file);
      const lines = fileContent.split('\n');
      const newLines: string[] = [];
      let inTargetSection = false;
      let sectionFound = false;

      for (const line of lines) {
        if (line.startsWith('# ')) {
          if (inTargetSection) {
            // Fin de la section précédente, ajouter le nouveau contenu
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
        await this.app.vault.modify(file, newLines.join('\n'));
        console.log(`✅ Section "${sectionName}" mise à jour`);
      } else {
        console.warn(`⚠️ Section "${sectionName}" non trouvée`);
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour section:', error);
      throw error;
    }
  }
    /**
     * Parse les sections d'un fichier (méthode originale maintenue)
     */
    async parseSections(file: TFile): Promise<any> {
        const cacheKey = `sections-${file.path}`;
        
        return this.cache.get(
            cacheKey,
            file.stat.mtime,
            async () => {
                this.logger?.debug('Parsing sections (cache miss)', { fileName: file.name });
                return this.parseFileContentOriginal(file);
            }
        );
    }

    /**
     * Parse original maintenu pour compatibilité
     */
    private async parseFileContentOriginal(file: TFile): Promise<any> {
        try {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            const sections: any = {};
            let currentSection = '';
            let currentContent: string[] = [];

            for (const line of lines) {
                if (line.startsWith('# ')) {
                    // Sauvegarder la section précédente
                    if (currentSection) {
                        sections[currentSection] = currentContent.join('\n').trim();
                    }
                    // Commencer une nouvelle section
                    currentSection = line.substring(2).trim();
                    currentContent = [];
                } else if (currentSection) {
                    currentContent.push(line);
                }
            }

            // Sauvegarder la dernière section
            if (currentSection) {
                sections[currentSection] = currentContent.join('\n').trim();
            }

            this.logger?.debug('Sections parsées', { 
                fileName: file.name, 
                sectionCount: Object.keys(sections).length 
            });

            return sections;
        } catch (error) {
            this.logger?.error('Erreur parsing sections', error);
            throw AgileBoardError.fileReadError(file.path, error as Error);
        }
    }

    /**
     * Retourne les sections manquantes (méthode originale)
     */
    getMissingSections(existingSections: string[], requiredSections: string[]): string[] {
        return requiredSections.filter(section => !existingSections.includes(section));
    }

    // ===================================================================
    // NOUVELLES MÉTHODES CONSOLIDÉES
    // ===================================================================

    /**
     * Analyse complète d'un fichier avec layout
     */
    async analyzeFile(file: TFile): Promise<FileAnalysis> {
        const layoutName = this.getLayoutName(file);
        if (!layoutName) {
            throw AgileBoardError.validationError('layoutName', 'Layout agile-board manquant');
        }

        const layout = this.layoutService.getModel(layoutName);
        if (!layout) {
            throw AgileBoardError.layoutNotFound(layoutName);
        }

        const sections = await this.parseSections(file);
        const existingNames = Object.keys(sections);
        const requiredSections = layout.map((block: BoardLayout) => block.title);

        return {
            file,
            layoutName,
            existingSections: this.convertToDetailedSections(sections, requiredSections),
            missingSections: this.getMissingSections(existingNames, requiredSections),
            extraSections: existingNames.filter(name => !requiredSections.includes(name)),
            correctOrder: requiredSections
        };
    }

    /**
     * Convertit les sections simples en sections détaillées
     */
    private convertToDetailedSections(sections: any, requiredSections: string[]): ParsedSection[] {
        return Object.entries(sections).map(([name, content]) => ({
            name,
            startLine: 0, // À implémenter si nécessaire
            endLine: 0,   // À implémenter si nécessaire
            content: content as string,
            lines: (content as string).split('\n'),
            isFromLayout: requiredSections.includes(name)
        }));
    }

    /**
     * Crée les sections manquantes dans un fichier
     */
    async createMissingSections(file: TFile): Promise<boolean> {
        try {
            const analysis = await this.analyzeFile(file);
            
            if (analysis.missingSections.length === 0) {
                new Notice('✅ Toutes les sections sont déjà présentes', 2000);
                return false;
            }

            const content = await this.app.vault.read(file);
            const newContent = this.addMissingSectionsToContent(
                content, 
                analysis.missingSections
            );

            await this.app.vault.modify(file, newContent);
            
            // Invalider le cache
            this.cache.invalidate(`sections-${file.path}`);
            
            new Notice(
                `✅ ${analysis.missingSections.length} section(s) ajoutée(s)`, 
                3000
            );

            this.logger?.success('Sections manquantes créées', {
                fileName: file.name,
                addedSections: analysis.missingSections
            });

            return true;

        } catch (error) {
            this.logger?.error('Erreur création sections manquantes', error);
            new Notice('❌ Erreur lors de la création des sections');
            throw error;
        }
    }

    /**
     * Crée une nouvelle note avec un layout spécifique
     */
    async createNoteWithLayout(options: NoteCreationOptions): Promise<NoteCreationResult> {
        this.logger?.fileOperation('Début création de note', { options });

        try {
            this.validateNoteCreationOptions(options);
            
            const layout = this.layoutService.getModel(options.layoutName);
            if (!layout) {
                throw AgileBoardError.layoutNotFound(options.layoutName);
            }

            const layoutInfo = this.layoutService.getModelInfo(options.layoutName);
            const displayName = layoutInfo?.displayName || options.layoutName;
            
            const fileName = this.generateFileName(displayName, options);
            const content = this.generateNoteContent(options, layout, layoutInfo);
            
            const file = await this.createFile(fileName, content, options.folder);
            
            if (options.autoOpen !== false) {
                await this.openFile(file);
            }

            new Notice(`✅ Note "${displayName}" créée avec succès !`, 3000);

            const result: NoteCreationResult = {
                file,
                layoutName: options.layoutName,
                displayName,
                sectionsCount: layout.length
            };

            this.logger?.success('Note créée avec succès', {
                fileName: result.file.name,
                filePath: result.file.path,
                layoutName: result.layoutName,
                sectionsCount: result.sectionsCount
            });

            return result;

        } catch (error) {
            this.logger?.error('Erreur création de note', error);
            new Notice('❌ Erreur lors de la création de la note');
            throw error;
        }
    }

    // ===================================================================
    // MÉTHODES UTILITAIRES PRIVÉES
    // ===================================================================

    private getLayoutName(file: TFile): string | null {
        const fileCache = this.app.metadataCache.getFileCache(file);
        return fileCache?.frontmatter?.['agile-board'] || null;
    }

    private addMissingSectionsToContent(content: string, missingSections: string[]): string {
        const lines = content.split('\n');
        const newSections = missingSections.map(sectionName => [
            '',
            `# ${sectionName}`,
            '',
            '<!-- Ajoutez votre contenu ici -->',
            ''
        ]).flat();

        return [...lines, ...newSections].join('\n');
    }

    private validateNoteCreationOptions(options: NoteCreationOptions): void {
        if (!options.layoutName || typeof options.layoutName !== 'string') {
            throw AgileBoardError.validationError('layoutName', options.layoutName);
        }
    }

    private generateFileName(displayName: string, options: NoteCreationOptions): string {
        if (options.customFileName) {
            return options.customFileName.endsWith('.md') 
                ? options.customFileName 
                : `${options.customFileName}.md`;
        }
        
        const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_');
        return `${displayName}_${timestamp}.md`;
    }

    private generateNoteContent(
        options: NoteCreationOptions,
        layout: BoardLayout[],
        layoutInfo: any
    ): string {
        const sections = layout.map(block => {
            const customContent = options.customContent?.[block.title] || '';
            return [
                `# ${block.title}`,
                '',
                customContent || '<!-- Ajoutez votre contenu ici -->',
                ''
            ].join('\n');
        });

        return [
            '---',
            `agile-board: ${options.layoutName}`,
            '---',
            '',
            ...sections
        ].join('\n');
    }

    private async createFile(fileName: string, content: string, folder?: string): Promise<TFile> {
        const fullPath = folder ? `${folder}/${fileName}` : fileName;
        
        if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
            await this.app.vault.createFolder(folder);
        }

        return await this.app.vault.create(fullPath, content);
    }

    private async openFile(file: TFile): Promise<void> {
        const leaf = this.app.workspace.getUnpinnedLeaf();
        await leaf.openFile(file);
    }

    /**
     * Dispose le service et nettoie les ressources
     */
    dispose(): void {
        this.cache.dispose();
    }
}