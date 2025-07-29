/**
 * =============================================================================
 * SERVICE DE GESTION DES SECTIONS
 * =============================================================================
 * 
 * Ce service gère l'analyse et la modification des sections dans les fichiers
 * avec layout agile-board.
 * 
 * RESPONSABILITÉS :
 * - Analyser les sections existantes dans un fichier
 * - Détecter les sections manquantes par rapport au layout
 * - Ajouter les sections manquantes en préservant le contenu
 * - Réorganiser les sections selon l'ordre du layout
 * - Valider la cohérence entre fichier et layout
 * 
 * ARCHITECTURE :
 * - Parsing intelligent du markdown
 * - Préservation du contenu existant
 * - Ajout non-destructif des sections
 * - Logging détaillé pour traçabilité
 */

// =============================================================================
// IMPORTS
// =============================================================================

import { App, TFile, Notice } from 'obsidian';
import { LayoutService } from './LayoutService';
import { LoggerService } from './LoggerService';
import { BoardLayout, FileSection } from '../types';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Information sur une section dans le fichier
 */
export interface ParsedSection {
    /** Nom de la section */
    name: string;
    /** Ligne de début (titre ##) */
    startLine: number;
    /** Ligne de fin (avant la section suivante) */
    endLine: number;
    /** Contenu de la section (sans le titre) */
    content: string;
    /** Lignes de contenu */
    lines: string[];
    /** Section trouvée dans le layout ? */
    isFromLayout: boolean;
}

/**
 * Résultat de l'analyse d'un fichier
 */
export interface FileAnalysis {
    /** Fichier analysé */
    file: TFile;
    /** Layout détecté */
    layoutName: string;
    /** Sections trouvées dans le fichier */
    existingSections: ParsedSection[];
    /** Sections manquantes (dans le layout mais pas le fichier) */
    missingSections: string[];
    /** Sections supplémentaires (dans le fichier mais pas le layout) */
    extraSections: string[];
    /** Ordre correct selon le layout */
    correctOrder: string[];
}

/**
 * Options pour l'ajout de sections
 */
export interface AddSectionsOptions {
    /** Position d'insertion */
    insertPosition?: 'end' | 'layout-order' | 'after-frontmatter';
    /** Ajouter du contenu par défaut aux sections */
    addDefaultContent?: boolean;
    /** Préserver l'ordre existant */
    preserveOrder?: boolean;
    /** Sauvegarder automatiquement */
    autoSave?: boolean;
}

/**
 * Résultat de l'ajout de sections
 */
export interface AddSectionsResult {
    /** Succès de l'opération */
    success: boolean;
    /** Nombre de sections ajoutées */
    sectionsAdded: number;
    /** Noms des sections ajoutées */
    addedSectionNames: string[];
    /** Nouveau contenu du fichier */
    newContent: string;
    /** Messages d'information */
    messages: string[];
}

// =============================================================================
// SERVICE PRINCIPAL
// =============================================================================

/**
 * Service de gestion des sections
 */
export class SectionManagerService {
    
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
     * Crée les sections manquantes dans un fichier
     * 
     * @param file - Fichier à modifier
     * @param options - Options d'ajout
     * @returns Promise<AddSectionsResult>
     */
    async createMissingSections(
        file: TFile, 
        options: AddSectionsOptions = {}
    ): Promise<AddSectionsResult> {
        this.logger?.fileOperation('Début création sections manquantes', { 
            fileName: file.name,
            options 
        });
        
        try {
            // Analyser le fichier
            const analysis = await this.analyzeFile(file);
            
            if (!analysis.layoutName) {
                throw new Error('Aucun layout agile-board détecté dans le fichier');
            }
            
            if (analysis.missingSections.length === 0) {
                const message = 'Toutes les sections sont déjà présentes';
                this.logger?.info(message, { 
                    fileName: file.name,
                    sectionsCount: analysis.existingSections.length 
                });
                
                new Notice(`✅ ${message}`, 2000);
                
                return {
                    success: true,
                    sectionsAdded: 0,
                    addedSectionNames: [],
                    newContent: await this.app.vault.read(file),
                    messages: [message]
                };
            }
            
            // Générer le nouveau contenu
            const newContent = await this.generateContentWithMissingSections(
                file, 
                analysis, 
                options
            );
            
            // Sauvegarder si demandé
            if (options.autoSave !== false) {
                await this.app.vault.modify(file, newContent);
                this.logger?.success('Fichier modifié', { 
                    fileName: file.name,
                    sectionsAdded: analysis.missingSections.length
                });
            }
            
            const result: AddSectionsResult = {
                success: true,
                sectionsAdded: analysis.missingSections.length,
                addedSectionNames: analysis.missingSections,
                newContent,
                messages: [`${analysis.missingSections.length} section(s) ajoutée(s)`]
            };
            
            new Notice(`✅ ${analysis.missingSections.length} section(s) ajoutée(s)`, 3000);
            
            this.logger?.success('Sections manquantes créées', {
                fileName: file.name,
                sectionsAdded: result.sectionsAdded,
                addedSections: result.addedSectionNames
            });
            
            return result;
            
        } catch (error) {
            this.logger?.error('Erreur création sections manquantes', {
                message: error.message,
                fileName: file.name
            });
            
            new Notice(`❌ Erreur: ${error.message}`, 4000);
            
            return {
                success: false,
                sectionsAdded: 0,
                addedSectionNames: [],
                newContent: '',
                messages: [error.message]
            };
        }
    }

    // =========================================================================
    // ANALYSE DE FICHIERS
    // =========================================================================

    /**
     * Analyse un fichier pour détecter ses sections et le layout
     */
    async analyzeFile(file: TFile): Promise<FileAnalysis> {
        this.logger?.debug('Début analyse fichier', { fileName: file.name });
        
        try {
            // Lire le contenu du fichier
            const content = await this.app.vault.read(file);
            
            // Détecter le layout
            const layoutName = this.detectLayout(file);
            
            // Parser les sections existantes
            const existingSections = this.parseSections(content);
            
            // Analyser les différences avec le layout
            const layoutSections = layoutName ? this.getLayoutSections(layoutName) : [];
            const existingSectionNames = existingSections.map(s => s.name);
            
            const missingSections = layoutSections.filter(
                layoutSection => !existingSectionNames.includes(layoutSection)
            );
            
            const extraSections = existingSectionNames.filter(
                existing => !layoutSections.includes(existing)
            );
            
            const analysis: FileAnalysis = {
                file,
                layoutName,
                existingSections,
                missingSections,
                extraSections,
                correctOrder: layoutSections
            };
            
            this.logger?.debug('Analyse terminée', {
                fileName: file.name,
                layoutName,
                existingSectionsCount: existingSections.length,
                missingSectionsCount: missingSections.length,
                extraSectionsCount: extraSections.length
            });
            
            return analysis;
            
        } catch (error) {
            this.logger?.error('Erreur analyse fichier', error);
            throw error;
        }
    }

    /**
     * Détecte le layout d'un fichier
     */
    private detectLayout(file: TFile): string {
        const fileCache = this.app.metadataCache.getFileCache(file);
        return fileCache?.frontmatter?.['agile-board'] || '';
    }

    /**
     * Récupère les sections d'un layout
     */
    private getLayoutSections(layoutName: string): string[] {
        const layout = this.layoutService.getModel(layoutName);
        if (!layout) {
            throw new Error(`Layout "${layoutName}" non trouvé`);
        }
        
        return layout.map(block => block.title);
    }

    /**
     * Parse les sections d'un contenu markdown
     */
    private parseSections(content: string): ParsedSection[] {
        const lines = content.split('\n');
        const sections: ParsedSection[] = [];
        let currentSection: Partial<ParsedSection> | null = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Détecter les titres de niveau 2 (sections)
            if (line.startsWith('## ')) {
                // Finaliser la section précédente
                if (currentSection) {
                    this.finalizeSection(currentSection, i - 1, lines);
                    sections.push(currentSection as ParsedSection);
                }
                
                // Commencer une nouvelle section
                currentSection = {
                    name: line.substring(3).trim(), // Enlever "## "
                    startLine: i,
                    lines: [],
                    isFromLayout: false // Sera déterminé plus tard
                };
            } else if (currentSection) {
                // Ajouter la ligne à la section courante
                currentSection.lines!.push(line);
            }
        }
        
        // Finaliser la dernière section
        if (currentSection) {
            this.finalizeSection(currentSection, lines.length - 1, lines);
            sections.push(currentSection as ParsedSection);
        }
        
        return sections;
    }

    /**
     * Finalise une section parsée
     */
    private finalizeSection(
        section: Partial<ParsedSection>, 
        endLine: number, 
        allLines: string[]
    ): void {
        section.endLine = endLine;
        section.content = section.lines!.join('\n').trim();
        
        // Enlever les lignes vides en fin
        while (section.lines!.length > 0 && section.lines![section.lines!.length - 1].trim() === '') {
            section.lines!.pop();
        }
    }

    // =========================================================================
    // GÉNÉRATION DE CONTENU
    // =========================================================================

    /**
     * Génère le nouveau contenu avec les sections manquantes
     */
    private async generateContentWithMissingSections(
        file: TFile,
        analysis: FileAnalysis,
        options: AddSectionsOptions
    ): Promise<string> {
        const originalContent = await this.app.vault.read(file);
        const lines = originalContent.split('\n');
        
        // Détecter la fin du frontmatter
        const frontmatterEnd = this.findFrontmatterEnd(lines);
        
        // Construire le nouveau contenu
        const newLines: string[] = [];
        
        // Ajouter le début (frontmatter + titre)
        newLines.push(...lines.slice(0, frontmatterEnd + 1));
        
        // Ajouter le contenu selon la stratégie choisie
        const insertPosition = options.insertPosition || 'layout-order';
        
        if (insertPosition === 'layout-order') {
            // Réorganiser selon l'ordre du layout
            await this.addSectionsInLayoutOrder(newLines, analysis, options);
        } else if (insertPosition === 'end') {
            // Garder l'existant et ajouter à la fin
            this.addExistingContent(newLines, analysis, lines, frontmatterEnd);
            this.addMissingSectionsAtEnd(newLines, analysis, options);
        } else {
            // Ajouter juste après le frontmatter
            this.addMissingSectionsAfterFrontmatter(newLines, analysis, options);
            this.addExistingContent(newLines, analysis, lines, frontmatterEnd);
        }
        
        return newLines.join('\n');
    }

    /**
     * Trouve la fin du frontmatter
     */
    private findFrontmatterEnd(lines: string[]): number {
        let frontmatterCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                frontmatterCount++;
                if (frontmatterCount === 2) {
                    return i;
                }
            }
            
            // Si on trouve un titre principal, on s'arrête après
            if (lines[i].startsWith('# ')) {
                return i;
            }
        }
        
        return 0; // Pas de frontmatter trouvé
    }

    /**
     * Ajoute les sections dans l'ordre du layout
     */
    private async addSectionsInLayoutOrder(
        newLines: string[],
        analysis: FileAnalysis,
        options: AddSectionsOptions
    ): Promise<void> {
        const existingSectionsMap = new Map(
            analysis.existingSections.map(s => [s.name, s])
        );
        
        for (const sectionName of analysis.correctOrder) {
            newLines.push(''); // Ligne vide avant la section
            newLines.push(`## ${sectionName}`);
            newLines.push('');
            
            const existingSection = existingSectionsMap.get(sectionName);
            if (existingSection) {
                // Ajouter le contenu existant
                newLines.push(...existingSection.lines);
            } else {
                // Ajouter le contenu par défaut pour la section manquante
                if (options.addDefaultContent !== false) {
                    const defaultContent = this.generateDefaultSectionContent(
                        sectionName, 
                        analysis.layoutName
                    );
                    newLines.push(...defaultContent);
                }
            }
            
            newLines.push(''); // Ligne vide après la section
        }
    }

    /**
     * Ajoute le contenu existant (sections non-layout)
     */
    private addExistingContent(
        newLines: string[],
        analysis: FileAnalysis,
        originalLines: string[],
        frontmatterEnd: number
    ): void {
        // Ajouter les sections existantes qui ne sont pas dans le layout
        for (const section of analysis.existingSections) {
            if (!analysis.correctOrder.includes(section.name)) {
                newLines.push('');
                newLines.push(`## ${section.name}`);
                newLines.push('');
                newLines.push(...section.lines);
                newLines.push('');
            }
        }
    }

    /**
     * Ajoute les sections manquantes à la fin
     */
    private addMissingSectionsAtEnd(
        newLines: string[],
        analysis: FileAnalysis,
        options: AddSectionsOptions
    ): void {
        for (const sectionName of analysis.missingSections) {
            newLines.push('');
            newLines.push(`## ${sectionName}`);
            newLines.push('');
            
            if (options.addDefaultContent !== false) {
                const defaultContent = this.generateDefaultSectionContent(
                    sectionName,
                    analysis.layoutName
                );
                newLines.push(...defaultContent);
            }
            
            newLines.push('');
        }
    }

    /**
     * Ajoute les sections manquantes après le frontmatter
     */
    private addMissingSectionsAfterFrontmatter(
        newLines: string[],
        analysis: FileAnalysis,
        options: AddSectionsOptions
    ): void {
        this.addMissingSectionsAtEnd(newLines, analysis, options);
    }

    /**
     * Génère le contenu par défaut pour une section
     */
    private generateDefaultSectionContent(sectionName: string, layoutName: string): string[] {
        const title = sectionName.toLowerCase();
        
        // Contenu spécialisé selon le type de section
        if (title.includes('faire') || title.includes('todo') || title.includes('backlog')) {
            return [
                '- [ ] Nouvelle tâche à faire',
                '- [ ] Autre tâche importante'
            ];
        }
        
        if (title.includes('cours') || title.includes('progress') || title.includes('doing')) {
            return [
                '- [ ] Tâche en cours',
                '',
                '*Tâches actuellement en cours de réalisation*'
            ];
        }
        
        if (title.includes('terminé') || title.includes('done') || title.includes('fini')) {
            return [
                '- [x] Tâche exemple terminée',
                '',
                '*Tâches complétées*'
            ];
        }
        
        // Matrice d'Eisenhower
        if (layoutName.includes('eisenhower')) {
            if (title.includes('urgent') && title.includes('important')) {
                return [
                    '- [ ] Tâche critique',
                    '',
                    '🚨 **Priorité maximale**'
                ];
            }
            
            if (title.includes('important') && !title.includes('urgent')) {
                return [
                    '- [ ] Tâche importante à planifier',
                    '',
                    '📋 **À organiser**'
                ];
            }
            
            if (title.includes('urgent') && !title.includes('important')) {
                return [
                    '- [ ] Interruption à gérer',
                    '',
                    '⏰ **À déléguer**'
                ];
            }
            
            if (title.includes('ni urgent') || (title.includes('pas') && title.includes('urgent'))) {
                return [
                    '- [ ] Activité optionnelle',
                    '',
                    '🗑️ **À éliminer**'
                ];
            }
        }
        
        // Contenu générique
        return [
            '- [ ] Nouvel élément',
            '- [ ] Autre élément',
            '',
            '*Section ajoutée automatiquement*'
        ];
    }

    // =========================================================================
    // MÉTHODES UTILITAIRES
    // =========================================================================

    /**
     * Vérifie si un fichier a toutes ses sections
     */
    async hasAllSections(file: TFile): Promise<boolean> {
        const analysis = await this.analyzeFile(file);
        return analysis.missingSections.length === 0;
    }

    /**
     * Compte les sections manquantes d'un fichier
     */
    async countMissingSections(file: TFile): Promise<number> {
        const analysis = await this.analyzeFile(file);
        return analysis.missingSections.length;
    }

    /**
     * Liste tous les fichiers avec sections manquantes
     */
    async findFilesWithMissingSections(): Promise<Array<{
        file: TFile;
        missingSectionsCount: number;
        missingSections: string[];
    }>> {
        const results = [];
        const markdownFiles = this.app.vault.getMarkdownFiles();
        
        for (const file of markdownFiles) {
            try {
                const analysis = await this.analyzeFile(file);
                if (analysis.layoutName && analysis.missingSections.length > 0) {
                    results.push({
                        file,
                        missingSectionsCount: analysis.missingSections.length,
                        missingSections: analysis.missingSections
                    });
                }
            } catch (error) {
                // Ignorer les fichiers qui ne peuvent pas être analysés
                this.logger?.debug('Erreur analyse fichier pour recherche', {
                    fileName: file.name,
                    error: error.message
                });
            }
        }
        
        return results;
    }
}