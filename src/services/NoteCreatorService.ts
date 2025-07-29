/**
 * =============================================================================
 * SERVICE DE CRÉATION DE NOTES AGILE BOARD
 * =============================================================================
 * 
 * Ce service s'occupe exclusivement de la création de nouvelles notes
 * avec des layouts prédéfinis.
 * 
 * RESPONSABILITÉS :
 * - Générer des noms de fichiers uniques
 * - Créer le contenu avec frontmatter et sections
 * - Créer les fichiers dans le vault Obsidian
 * - Ouvrir les notes créées
 * - Adapter le contenu selon le type de layout
 * 
 * ARCHITECTURE :
 * - Injection de dépendances (App, LayoutService, Logger)
 * - Méthodes spécialisées par fonction
 * - Gestion d'erreurs centralisée
 * - Logging détaillé pour traçabilité
 */

// =============================================================================
// IMPORTS
// =============================================================================

import { App, TFile, Notice } from 'obsidian';
import { LayoutService } from './LayoutService';
import { LoggerService } from './LoggerService';
import { BoardLayout } from '../types';

// =============================================================================
// INTERFACES POUR CE SERVICE
// =============================================================================

/**
 * Options pour la création d'une note
 */
export interface NoteCreationOptions {
    /** Nom du layout à utiliser */
    layoutName: string;
    /** Nom personnalisé du fichier (optionnel) */
    customFileName?: string;
    /** Dossier de destination (optionnel) */
    folder?: string;
    /** Ouvrir automatiquement la note créée */
    autoOpen?: boolean;
    /** Contenu personnalisé pour certaines sections */
    customContent?: Record<string, string>;
}

/**
 * Résultat de la création d'une note
 */
export interface NoteCreationResult {
    /** Fichier créé */
    file: TFile;
    /** Nom du layout utilisé */
    layoutName: string;
    /** Nom d'affichage du layout */
    displayName: string;
    /** Nombre de sections créées */
    sectionsCount: number;
}

// =============================================================================
// SERVICE PRINCIPAL
// =============================================================================

/**
 * Service de création de notes avec layouts Agile Board
 */
export class NoteCreatorService {
    
    /**
     * Constructeur avec injection de dépendances
     * 
     * @param app - Instance de l'application Obsidian
     * @param layoutService - Service de gestion des layouts
     * @param logger - Service de logging (optionnel)
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
     * Crée une nouvelle note avec un layout spécifique
     * 
     * @param options - Options de création
     * @returns Promise<NoteCreationResult> - Résultat de la création
     */
    async createNoteWithLayout(options: NoteCreationOptions): Promise<NoteCreationResult> {
        this.logger?.fileOperation('Début création de note', { options });
        
        try {
            // Validation des paramètres
            this.validateOptions(options);
            
            // Récupération du layout
            const layout = this.getLayout(options.layoutName);
            const layoutInfo = this.layoutService.getModelInfo(options.layoutName);
            const displayName = layoutInfo?.displayName || options.layoutName;
            
            // Génération du nom de fichier
            const fileName = this.generateFileName(displayName, options);
            
            // Génération du contenu
            const content = this.generateNoteContent(options.layoutName, displayName, layout, layoutInfo, options);
            
            // Création du fichier
            const file = await this.createFile(fileName, content, options.folder);
            
            // Ouverture de la note (si demandé)
            if (options.autoOpen !== false) {
                await this.openFile(file);
            }
            
            // Notification de succès
            new Notice(`✅ Note "${displayName}" créée avec succès !`, 3000);
            
            const result: NoteCreationResult = {
                file,
                layoutName: options.layoutName,
                displayName,
                sectionsCount: layout.length
            };
            
            // 🎯 CORRECTION : Logger uniquement les données sérialisables
            this.logger?.success('Note créée avec succès', {
                fileName: result.file.name,
                filePath: result.file.path,
                layoutName: result.layoutName,
                displayName: result.displayName,
                sectionsCount: result.sectionsCount
            });
            
            return result;
            
        } catch (error) {
            this.logger?.error('Erreur lors de la création de note', error);
            new Notice(`❌ Erreur lors de la création : ${error.message}`, 5000);
            throw error;
        }
    }

    // =========================================================================
    // MÉTHODES DE VALIDATION
    // =========================================================================

    /**
     * Valide les options de création
     */
    private validateOptions(options: NoteCreationOptions): void {
        if (!options.layoutName) {
            throw new Error('Le nom du layout est requis');
        }
        
        if (!this.layoutService) {
            throw new Error('LayoutService non disponible');
        }
    }

    /**
     * Récupère et valide un layout
     */
    private getLayout(layoutName: string): BoardLayout[] {
        const layout = this.layoutService.getModel(layoutName);
        if (!layout) {
            throw new Error(`Layout "${layoutName}" non trouvé`);
        }
        
        if (layout.length === 0) {
            throw new Error(`Layout "${layoutName}" est vide`);
        }
        
        return layout;
    }

    // =========================================================================
    // GÉNÉRATION DE NOMS DE FICHIERS
    // =========================================================================

    /**
     * Génère un nom de fichier unique
     */
    private generateFileName(displayName: string, options: NoteCreationOptions): string {
        // Nom personnalisé fourni
        if (options.customFileName) {
            return this.sanitizeFileName(options.customFileName);
        }
        
        // Génération automatique
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const baseName = this.sanitizeFileName(displayName);
        const fileName = `${baseName} ${timestamp}.md`;
        
        // Vérifier l'unicité
        return this.ensureUniqueFileName(fileName, options.folder);
    }

    /**
     * Nettoie un nom de fichier des caractères interdits
     */
    private sanitizeFileName(name: string): string {
        return name
            .replace(/[<>:"/\\|?*]/g, '') // Caractères interdits Windows
            .replace(/\s+/g, ' ')         // Espaces multiples → simple
            .trim();                      // Espaces en début/fin
    }

    /**
     * Assure l'unicité d'un nom de fichier
     */
    private ensureUniqueFileName(fileName: string, folder?: string): string {
        const fullPath = folder ? `${folder}/${fileName}` : fileName;
        
        // Si le fichier n'existe pas, c'est bon
        if (!this.app.vault.getAbstractFileByPath(fullPath)) {
            return fileName;
        }
        
        // Générer un nom unique avec timestamp précis
        const timestamp = new Date().toISOString()
            .replace(/[:.]/g, '-')
            .substring(0, 19); // YYYY-MM-DDTHH-MM-SS
        
        const baseName = fileName.replace('.md', '');
        return `${baseName} ${timestamp}.md`;
    }

    // =========================================================================
    // GÉNÉRATION DE CONTENU
    // =========================================================================

    /**
     * Génère le contenu complet de la note
     */
    private generateNoteContent(
        layoutName: string,
        displayName: string,
        layout: BoardLayout[],
        layoutInfo: any,
        options: NoteCreationOptions
    ): string {
        const parts = [
            this.generateFrontmatter(layoutName, layoutInfo),
            this.generateTitle(displayName),
            this.generateDescription(layoutInfo),
            this.generateSections(layout, layoutName, options.customContent),
            this.generateFooter(displayName, layout.length)
        ];
        
        return parts.filter(part => part).join('\n');
    }

    /**
     * Génère le frontmatter YAML
     */
    private generateFrontmatter(layoutName: string, layoutInfo: any): string {
        const today = new Date().toISOString().split('T')[0];
        
        return [
            '---',
            `agile-board: ${layoutName}`,
            `created: ${today}`,
            `type: agile-board`,
            `layout-type: ${layoutInfo?.category || 'custom'}`,
            layoutInfo?.tags ? `tags: [${layoutInfo.tags.join(', ')}]` : '',
            '---',
            ''
        ].filter(line => line !== '').join('\n');
    }

    /**
     * Génère le titre principal
     */
    private generateTitle(displayName: string): string {
        return `# ${displayName}\n`;
    }

    /**
     * Génère la description (si disponible)
     */
    private generateDescription(layoutInfo: any): string {
        if (!layoutInfo?.description) {
            return '';
        }
        
        return `> ${layoutInfo.description}\n\n`;
    }

    /**
     * Génère toutes les sections
     */
    private generateSections(
        layout: BoardLayout[], 
        layoutName: string, 
        customContent?: Record<string, string>
    ): string {
        return layout.map(block => {
            const sectionTitle = `## ${block.title}`;
            
            // Contenu personnalisé ou généré automatiquement
            const content = customContent?.[block.title] || 
                           this.generateSectionContent(block.title, layoutName);
            
            return `${sectionTitle}\n\n${content}\n`;
        }).join('\n');
    }

    /**
     * Génère le contenu d'une section selon son type
     */
    private generateSectionContent(sectionTitle: string, layoutName: string): string {
        const title = sectionTitle.toLowerCase();
        
        // Détection du type de section et génération du contenu approprié
        const contentMap = {
            // Sections de tâches
            'todo_tasks': () => [
                '- [ ] Première tâche à faire',
                '- [ ] Deuxième tâche importante',
                '- [ ] Autre tâche à planifier'
            ],
            'in_progress': () => [
                '- [ ] Tâche en cours de réalisation',
                '',
                '*Déplacez ici les tâches en cours d\'exécution*'
            ],
            'done': () => [
                '- [x] Exemple de tâche terminée',
                '',
                '*Les tâches complétées apparaîtront ici*'
            ],
            
            // Matrice d'Eisenhower
            'urgent_important': () => [
                '- [ ] Crise à résoudre immédiatement',
                '- [ ] Urgence critique',
                '',
                '🚨 **À traiter en priorité absolue**'
            ],
            'important_not_urgent': () => [
                '- [ ] Planification long terme',
                '- [ ] Développement personnel',
                '',
                '📋 **À planifier et organiser**'
            ],
            'urgent_not_important': () => [
                '- [ ] Interruption à gérer',
                '- [ ] Email urgent',
                '',
                '⏰ **À déléguer si possible**'
            ],
            'not_urgent_not_important': () => [
                '- [ ] Activité de loisir',
                '- [ ] Distraction',
                '',
                '🗑️ **À éliminer ou minimiser**'
            ]
        };
        
        // Détection du type de section
        const sectionType = this.detectSectionType(title, layoutName);
        const generator = contentMap[sectionType];
        
        if (generator) {
            return generator().join('\n');
        }
        
        // Contenu générique par défaut
        return [
            '- [ ] Premier élément',
            '- [ ] Deuxième élément',
            '',
            '*Ajoutez vos éléments ici*'
        ].join('\n');
    }

    /**
     * Détecte le type d'une section
     */
    private detectSectionType(title: string, layoutName: string): string {
        // Sections communes
        if (title.includes('faire') || title.includes('todo') || title.includes('backlog')) {
            return 'todo_tasks';
        }
        if (title.includes('cours') || title.includes('progress') || title.includes('doing')) {
            return 'in_progress';
        }
        if (title.includes('terminé') || title.includes('done') || title.includes('fini')) {
            return 'done';
        }
        
        // Spécifique à Eisenhower
        if (layoutName.includes('eisenhower')) {
            if (title.includes('urgent') && title.includes('important')) {
                return 'urgent_important';
            }
            if (title.includes('important') && !title.includes('urgent')) {
                return 'important_not_urgent';
            }
            if (title.includes('urgent') && !title.includes('important')) {
                return 'urgent_not_important';
            }
            if (title.includes('ni urgent') || (title.includes('pas') && (title.includes('urgent') || title.includes('important')))) {
                return 'not_urgent_not_important';
            }
        }
        
        return 'generic';
    }

    /**
     * Génère le footer informatif
     */
    private generateFooter(displayName: string, sectionsCount: number): string {
        const today = new Date().toISOString().split('T')[0];
        
        return [
            '---',
            '',
            '### 📊 Informations',
            `- **Layout** : ${displayName}`,
            `- **Sections** : ${sectionsCount}`,
            `- **Créé** : ${today}`,
            `- **Plugin** : Agile Board v0.7.0`,
            '',
            '> Cette note utilise le plugin Agile Board. Modifiez les sections selon vos besoins !'
        ].join('\n');
    }

    // =========================================================================
    // OPÉRATIONS FICHIERS
    // =========================================================================

    /**
     * Crée le fichier dans le vault
     */
    private async createFile(fileName: string, content: string, folder?: string): Promise<TFile> {
        const fullPath = folder ? `${folder}/${fileName}` : fileName;
        
        // Créer le dossier si nécessaire
        if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
            await this.app.vault.createFolder(folder);
            this.logger?.debug('Dossier créé', { folder });
        }
        
        // Créer le fichier
        const file = await this.app.vault.create(fullPath, content);
        
        this.logger?.success('Fichier créé', { 
            path: file.path,
            size: content.length 
        });
        
        return file;
    }

    /**
     * Ouvre un fichier dans Obsidian
     */
    private async openFile(file: TFile): Promise<void> {
        const leaf = this.app.workspace.getLeaf(true); // Nouvel onglet
        await leaf.openFile(file);
        
        this.logger?.debug('Fichier ouvert', { path: file.path });
    }

    // =========================================================================
    // MÉTHODES UTILITAIRES PUBLIQUES
    // =========================================================================

    /**
     * Crée une note avec des paramètres simplifiés
     */
    async createQuickNote(layoutName: string, customFileName?: string): Promise<NoteCreationResult> {
        return this.createNoteWithLayout({
            layoutName,
            customFileName,
            autoOpen: true
        });
    }

    /**
     * Vérifie si un layout est disponible
     */
    isLayoutAvailable(layoutName: string): boolean {
        return !!this.layoutService.getModel(layoutName);
    }

    /**
     * Retourne la liste des layouts disponibles pour création
     */
    getAvailableLayouts(): Array<{name: string, displayName: string, description: string}> {
        return this.layoutService.getAllModelsInfo().map(info => ({
            name: info.name,
            displayName: info.displayName,
            description: info.description
        }));
    }
}