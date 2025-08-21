/**
 * =============================================================================
 * GESTIONNAIRE D'INTÉGRATION UNIVERSELLE AVEC LES PLUGINS OBSIDIAN - VERSION AMÉLIORÉE
 * =============================================================================
 * 
 * Fichier : src/services/PluginIntegrationManager.ts (VERSION CORRIGÉE)
 * 
 * CORRECTION MAJEURE : Support complet du plugin Tasks avec gestion des états
 */

import { App } from 'obsidian';
import { LoggerService } from './LoggerService';

export class PluginIntegrationManager {
    private app: App;
    private logger: LoggerService;
    private observers: MutationObserver[] = [];
    private eventCleanupFunctions: (() => void)[] = [];
    
    constructor(app: App, logger: LoggerService) {
        this.app = app;
        this.logger = logger;
    }

    /**
     * Configure le support universel des plugins pour un container
     */
    setupUniversalPluginSupport(
        container: HTMLElement,
        onContentChange: (newContent: string) => void,
        sourcePath: string
    ): void {
        this.logger.info('🔌 Configuration support universel plugins avec support Tasks amélioré');
        
        // 1. Surveiller les mutations DOM
        this.setupMutationObserver(container, sourcePath);
        
        // 2. Déléguer tous les événements aux plugins originaux
        this.setupEventDelegation(container, onContentChange, sourcePath);
        
        // 3. ✅ NOUVEAU : Support spécialisé pour Tasks
        this.setupTasksSpecificSupport(container, onContentChange, sourcePath);
        
        // 4. Détecter et corriger les problèmes de contexte
        this.setupContextCorrection(container, sourcePath);
        
        // 5. Appliquer les fallbacks pour plugins problématiques
        this.applyPluginFallbacks(container);
    }
    
    /**
     * ✅ NOUVEAU : Support spécialisé pour le plugin Tasks
     */
    private setupTasksSpecificSupport(
        container: HTMLElement,
        onContentChange: (newContent: string) => void,
        sourcePath: string
    ): void {
        this.logger.debug('✅ Configuration support spécialisé Tasks');
        
        // Délégation spécifique pour les tâches
        const taskHandler = (event: Event) => {
            const target = event.target as HTMLElement;
            
            // Vérifier si c'est une checkbox de tâche
            if (target.matches('input[type="checkbox"]') && 
                target.closest('.task-list-item, li')) {
                
                this.logger.debug('✅ Clic sur checkbox de tâche détecté');
                
                // Délai pour laisser le plugin Tasks traiter l'événement
                setTimeout(() => {
                    try {
                        const updatedContent = this.extractCurrentContent(container);
                        if (updatedContent !== null) {
                            this.logger.debug('🔄 Contenu Tasks mis à jour');
                            onContentChange(updatedContent);
                        }
                    } catch (error) {
                        this.logger.warn('⚠️ Erreur extraction contenu Tasks', error);
                    }
                }, 100); // Délai court pour Tasks
            }
        };
        
        container.addEventListener('change', taskHandler, true);
        container.addEventListener('click', taskHandler, true);
        
        this.eventCleanupFunctions.push(() => {
            container.removeEventListener('change', taskHandler, true);
            container.removeEventListener('click', taskHandler, true);
        });
    }
    
    /**
     * Surveille les changements DOM pour détecter les nouveaux plugins
     */
    private setupMutationObserver(container: HTMLElement, sourcePath: string): void {
        const observer = new MutationObserver((mutations) => {
            let hasPluginChanges = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as HTMLElement;
                            if (this.isPluginElement(element)) {
                                this.logger.debug('🔌 Nouveau plugin détecté:', element.className);
                                hasPluginChanges = true;
                            }
                        }
                    });
                }
                
                if (mutation.type === 'attributes') {
                    const element = mutation.target as HTMLElement;
                    if (this.isPluginElement(element)) {
                        this.logger.debug('🔄 Plugin modifié:', element.className);
                        hasPluginChanges = true;
                    }
                }
            });
            
            if (hasPluginChanges) {
                setTimeout(() => this.refreshPluginSupport(container, sourcePath), 100);
            }
        });
        
        observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-task', 'data-plugin', 'data-dataview', 'checked']
        });
        
        this.observers.push(observer);
    }
    
    /**
     * Configure la délégation d'événements universelle
     */
    private setupEventDelegation(
        container: HTMLElement, 
        onContentChange: (content: string) => void,
        sourcePath: string
    ): void {
        const eventTypes = ['click', 'change', 'input', 'keyup', 'blur', 'focus'];
        
        eventTypes.forEach(eventType => {
            const handler = (event: Event) => {
                this.handleUniversalEvent(event, onContentChange, sourcePath);
            };
            
            container.addEventListener(eventType, handler, true);
            
            this.eventCleanupFunctions.push(() => {
                container.removeEventListener(eventType, handler, true);
            });
        });
    }
    
    /**
     * Gestionnaire universel d'événements
     */
    private handleUniversalEvent(
        event: Event, 
        onContentChange: (content: string) => void,
        sourcePath: string
    ): void {
        const target = event.target as HTMLElement;
        
        // Ignorer les événements de navigation
        if (this.isNavigationEvent(event, target)) {
            this.logger.debug('🧭 Événement de navigation ignoré:', event.type);
            return;
        }
        
        // Si c'est un événement de modification, capturer le nouveau contenu
        if (this.isContentModificationEvent(event, target)) {
            this.logger.debug('✏️ Modification détectée:', event.type, target.tagName);
            
            // Délai adaptatif selon le type d'élément
            let delay = 150;
            if (target.matches('input[type="checkbox"]')) {
                delay = 200; // Plus de temps pour les tâches
            }
            
            setTimeout(() => {
                try {
                    const newContent = this.extractCurrentContent(event.currentTarget as HTMLElement);
                    if (newContent !== null) {
                        this.logger.debug('🔄 Contenu modifié par plugin, mise à jour');
                        onContentChange(newContent);
                    }
                } catch (error) {
                    this.logger.warn('⚠️ Erreur extraction contenu après modification', error);
                }
            }, delay);
        }
    }
    
    /**
     * Détermine si un événement est de navigation
     */
    private isNavigationEvent(event: Event, target: HTMLElement): boolean {
        // Liens internes et externes
        if (target.matches('a, a *, .internal-link, .internal-link *, .external-link, .external-link *')) {
            return true;
        }
        
        // Boutons d'interface des plugins
        if (target.matches('.plugin-button, .dataview-button, .nav-button, .clickable-icon')) {
            return true;
        }
        
        // Tags cliquables
        if (target.matches('.tag, .tag *, .cm-hashtag, .cm-hashtag *')) {
            return true;
        }
        
        // Boutons de contrôle des plugins
        if (target.matches('.widget-button, .collapse-button, .expand-button')) {
            return true;
        }
        
        // Éléments avec data-href (liens Obsidian)
        if (target.hasAttribute('data-href') || target.closest('[data-href]')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Détermine si un événement modifie le contenu
     */
    private isContentModificationEvent(event: Event, target: HTMLElement): boolean {
        // ✅ AMÉLIORATION : Détection plus précise pour les tâches
        if (target.matches('input[type="checkbox"]') && event.type === 'change') {
            // Vérifier si c'est dans un contexte de tâche
            const taskContext = target.closest('.task-list-item, li, .contains-task-list');
            if (taskContext) {
                this.logger.debug('✅ Modification de tâche détectée');
                return true;
            }
            return true; // Autres checkboxes
        }
        
        // Éléments éditables
        if (target.matches('[contenteditable="true"]') && ['input', 'blur'].includes(event.type)) {
            return true;
        }
        
        // Champs de saisie
        if (target.matches('input[type="text"], input[type="number"], textarea, select') && 
            ['change', 'blur'].includes(event.type)) {
            return true;
        }
        
        // Éléments avec attributs de modification de plugins
        if (target.matches('[data-editable], [data-modifiable]') && 
            ['change', 'click'].includes(event.type)) {
            return true;
        }
        
        // Boutons de modification spécifiques aux plugins
        if (target.matches('.task-toggle, .dataview-edit, .plugin-edit') && 
            event.type === 'click') {
            return true;
        }
        
        return false;
    }
    
    /**
     * Extrait le contenu actuel du container sous forme markdown
     */
    private extractCurrentContent(container: HTMLElement): string | null {
        try {
            return this.convertHtmlToMarkdown(container);
        } catch (error) {
            this.logger.warn('⚠️ Erreur extraction contenu', error);
            return null;
        }
    }
    
    /**
     * Convertit HTML généré par Obsidian vers Markdown
     */
    private convertHtmlToMarkdown(container: HTMLElement): string {
        return this.smartHtmlToMarkdownConversion(container);
    }
    
    /**
     * Conversion intelligente HTML → Markdown
     */
    private smartHtmlToMarkdownConversion(container: HTMLElement): string {
        const lines: string[] = [];
        
        this.walkNodes(container, (node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                const markdown = this.convertElementToMarkdown(element);
                if (markdown) {
                    lines.push(markdown);
                }
            } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                const text = node.textContent.trim();
                if (text && !this.isWhitespaceOnly(text)) {
                    lines.push(text);
                }
            }
        });
        
        return lines
            .filter(line => line.trim().length > 0)
            .join('\n')
            .replace(/\n\n+/g, '\n\n');
    }
    
    /**
     * Parcourt les nœuds de manière intelligente
     */
    private walkNodes(container: HTMLElement, callback: (node: Node) => void): void {
        Array.from(container.childNodes).forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                if (!element.matches('script, style, .hover-popover')) {
                    callback(node);
                }
            } else {
                callback(node);
            }
        });
    }
    
    /**
     * ✅ AMÉLIORATION : Convertit un élément HTML spécifique en Markdown avec meilleur support Tasks
     */
    private convertElementToMarkdown(element: HTMLElement): string {
        // Ignorer les éléments cachés ou techniques
        if (element.matches('.sr-only, .screen-reader-text, script, style')) {
            return '';
        }
        
        // ✅ AMÉLIORATION : Détection plus robuste des tâches
        if (this.isTaskElement(element)) {
            return this.convertTaskToMarkdown(element);
        }
        
        // Listes normales
        if (element.matches('ul, ol')) {
            return this.convertListToMarkdown(element);
        }
        
        // Paragraphes
        if (element.matches('p')) {
            return this.getTextContent(element);
        }
        
        // Titres
        if (element.matches('h1, h2, h3, h4, h5, h6')) {
            const level = parseInt(element.tagName.substring(1));
            return '#'.repeat(level) + ' ' + this.getTextContent(element);
        }
        
        // Code blocks
        if (element.matches('pre, .cm-editor')) {
            const code = this.getTextContent(element);
            const language = this.detectCodeLanguage(element);
            return language ? `\`\`\`${language}\n${code}\n\`\`\`` : `\`\`\`\n${code}\n\`\`\``;
        }
        
        // Code inline
        if (element.matches('code') && !element.closest('pre')) {
            return `\`${this.getTextContent(element)}\``;
        }
        
        // Éléments de plugins : préserver leur contenu
        if (this.isPluginElement(element)) {
            return this.preservePluginContent(element);
        }
        
        // Fallback : contenu textuel
        return this.getTextContent(element);
    }
    
    /**
     * ✅ NOUVEAU : Détection améliorée des éléments de tâche
     */
    private isTaskElement(element: HTMLElement): boolean {
        // Vérifications multiples pour couvrir tous les cas
        return element.matches('.task-list-item') ||
               element.matches('li:has(input[type="checkbox"])') ||
               element.matches('li') && element.querySelector('input[type="checkbox"]') !== null ||
               element.matches('.contains-task-list li') ||
               element.querySelector('input[type="checkbox"]') !== null;
    }
    
    /**
     * ✅ AMÉLIORATION : Convertit une tâche en Markdown avec support complet Tasks
     */
    private convertTaskToMarkdown(element: HTMLElement): string {
        const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (!checkbox) {
            // Fallback si pas de checkbox trouvée
            return this.getTextContent(element);
        }
        
        const isChecked = checkbox.checked;
        
        // ✅ NOUVEAU : Support des différents états de tâches du plugin Tasks
        let checkState = '[ ]'; // Par défaut
        
        if (isChecked) {
            // Vérifier s'il y a des attributs spécifiques au plugin Tasks
            const taskData = element.getAttribute('data-task') || 
                           element.getAttribute('data-task-status') ||
                           checkbox.getAttribute('data-task');
            
            if (taskData) {
                // Le plugin Tasks peut avoir des états spéciaux
                if (taskData.includes('completed') || taskData.includes('done')) {
                    checkState = '[x]';
                } else if (taskData.includes('cancelled')) {
                    checkState = '[-]';
                } else if (taskData.includes('forwarded')) {
                    checkState = '[>]';
                } else if (taskData.includes('scheduled')) {
                    checkState = '[<]';
                } else if (taskData.includes('important')) {
                    checkState = '[!]';
                } else {
                    checkState = '[x]'; // Par défaut pour coché
                }
            } else {
                checkState = '[x]'; // Standard coché
            }
        }
        
        // Extraire le texte de la tâche en préservant les métadonnées Tasks
        let taskText = '';
        
        // Méthode 1 : Attributs de données des plugins
        const dataTask = element.getAttribute('data-task') || 
                         element.getAttribute('data-task-text');
        if (dataTask && !dataTask.includes('completed') && !dataTask.includes('done')) {
            taskText = dataTask;
        } else {
            // Méthode 2 : Texte après la checkbox
            const clonedElement = element.cloneNode(true) as HTMLElement;
            const clonedCheckbox = clonedElement.querySelector('input[type="checkbox"]');
            if (clonedCheckbox) {
                clonedCheckbox.remove();
            }
            
            // Nettoyer les éléments de contrôle du plugin
            const controlElements = clonedElement.querySelectorAll('.task-controls, .task-metadata');
            controlElements.forEach(el => el.remove());
            
            taskText = this.getTextContent(clonedElement).trim();
        }
        
        // ✅ NOUVEAU : Préserver les métadonnées du plugin Tasks
        const taskMetadata = this.extractTasksMetadata(element);
        if (taskMetadata) {
            taskText = taskText + ' ' + taskMetadata;
        }
        
        return `- ${checkState} ${taskText}`;
    }
    
    /**
     * ✅ NOUVEAU : Extrait les métadonnées du plugin Tasks
     */
    private extractTasksMetadata(element: HTMLElement): string {
        const metadata: string[] = [];
        
        // Rechercher les dates d'échéance
        const dueDateElement = element.querySelector('.task-due-date, [data-task-due]');
        if (dueDateElement) {
            const dueDate = dueDateElement.textContent?.trim() || 
                           dueDateElement.getAttribute('data-task-due');
            if (dueDate) {
                metadata.push(`📅 ${dueDate}`);
            }
        }
        
        // Rechercher les dates de début
        const startDateElement = element.querySelector('.task-start-date, [data-task-start]');
        if (startDateElement) {
            const startDate = startDateElement.textContent?.trim() || 
                             startDateElement.getAttribute('data-task-start');
            if (startDate) {
                metadata.push(`🛫 ${startDate}`);
            }
        }
        
        // Rechercher les priorités
        const priorityElement = element.querySelector('.task-priority, [data-task-priority]');
        if (priorityElement) {
            const priority = priorityElement.textContent?.trim() || 
                           priorityElement.getAttribute('data-task-priority');
            if (priority) {
                metadata.push(`⏫ ${priority}`);
            }
        }
        
        // Rechercher les tags
        const tagElements = element.querySelectorAll('.tag, .task-tag');
        tagElements.forEach(tagEl => {
            const tag = tagEl.textContent?.trim();
            if (tag && !tag.startsWith('#')) {
                metadata.push(`#${tag}`);
            } else if (tag) {
                metadata.push(tag);
            }
        });
        
        return metadata.length > 0 ? metadata.join(' ') : '';
    }
    
    /**
     * Convertit une liste en Markdown
     */
    private convertListToMarkdown(element: HTMLElement): string {
        const isOrdered = element.tagName.toLowerCase() === 'ol';
        const items: string[] = [];
        
        const listItems = Array.from(element.children).filter(child => 
            child.tagName.toLowerCase() === 'li'
        );
        
        listItems.forEach((li, index) => {
            const prefix = isOrdered ? `${index + 1}.` : '-';
            const content = this.convertElementToMarkdown(li as HTMLElement);
            if (content) {
                items.push(`${prefix} ${content}`);
            }
        });
        
        return items.join('\n');
    }
    
    /**
     * Détecte le langage d'un bloc de code
     */
    private detectCodeLanguage(element: HTMLElement): string {
        const classList = Array.from(element.classList);
        for (const className of classList) {
            if (className.startsWith('language-')) {
                return className.substring(9);
            }
            if (className.startsWith('cm-')) {
                return className.substring(3);
            }
        }
        
        const lang = element.getAttribute('data-language') || 
                    element.getAttribute('data-lang');
        if (lang) return lang;
        
        return '';
    }
    
    /**
     * Préserve le contenu d'un élément de plugin
     */
    private preservePluginContent(element: HTMLElement): string {
        const originalMarkdown = element.getAttribute('data-original-markdown');
        if (originalMarkdown) {
            return originalMarkdown;
        }
        
        if (element.matches('.dataview, .block-language-dataview')) {
            return this.reconstructDataviewMarkdown(element);
        }
        
        if (element.matches('.tasks-plugin, [data-task], .block-language-tasks')) {
            return this.reconstructTasksMarkdown(element);
        }
        
        if (element.matches('.kanban-plugin')) {
            return this.reconstructKanbanMarkdown(element);
        }
        
        return this.getTextContent(element);
    }
    
    /**
     * Reconstruit le markdown Dataview
     */
    private reconstructDataviewMarkdown(element: HTMLElement): string {
        const query = element.getAttribute('data-query') || 
                     element.querySelector('.dataview-query')?.textContent ||
                     element.getAttribute('data-dv-query');
        
        if (query) {
            return '```dataview\n' + query + '\n```';
        }
        
        const content = this.getTextContent(element);
        if (content.includes('TABLE') || content.includes('LIST') || content.includes('TASK')) {
            return '```dataview\n' + content + '\n```';
        }
        
        return content;
    }
    
    /**
     * ✅ AMÉLIORATION : Reconstruit le markdown Tasks avec meilleur support
     */
    private reconstructTasksMarkdown(element: HTMLElement): string {
        // Essayer de récupérer la requête Tasks originale
        const query = element.getAttribute('data-tasks-query') ||
                     element.querySelector('.tasks-query')?.textContent ||
                     element.getAttribute('data-query');
        
        if (query) {
            return '```tasks\n' + query + '\n```';
        }
        
        // ✅ NOUVEAU : Détecter si c'est un bloc de requête Tasks
        const content = this.getTextContent(element);
        const tasksKeywords = ['not done', 'done', 'due', 'starts', 'scheduled', 'happens', 'path', 'heading', 'group by', 'sort by'];
        
        if (tasksKeywords.some(keyword => content.includes(keyword))) {
            return '```tasks\n' + content + '\n```';
        }
        
        // ✅ NOUVEAU : Si c'est une liste de tâches, la reconstruire
        const taskItems = element.querySelectorAll('.task-list-item, li:has(input[type="checkbox"])');
        if (taskItems.length > 0) {
            const tasks: string[] = [];
            taskItems.forEach(item => {
                const taskMarkdown = this.convertTaskToMarkdown(item as HTMLElement);
                if (taskMarkdown) {
                    tasks.push(taskMarkdown);
                }
            });
            return tasks.join('\n');
        }
        
        return content;
    }
    
    /**
     * Reconstruit le markdown Kanban
     */
    private reconstructKanbanMarkdown(element: HTMLElement): string {
        const config = element.getAttribute('data-kanban-config');
        if (config) {
            return '```kanban\n' + config + '\n```';
        }
        
        return this.getTextContent(element);
    }
    
    /**
     * Obtient le contenu textuel d'un élément de manière sécurisée
     */
    private getTextContent(element: HTMLElement): string {
        try {
            return element.textContent?.trim() || '';
        } catch (error) {
            this.logger.warn('⚠️ Erreur extraction textContent', error);
            return '';
        }
    }
    
    /**
     * Vérifie si une chaîne ne contient que des espaces
     */
    private isWhitespaceOnly(text: string): boolean {
        return /^\s*$/.test(text);
    }
    
    /**
     * ✅ AMÉLIORATION : Détermine si un élément appartient à un plugin avec meilleure détection Tasks
     */
    isPluginElement(element: HTMLElement): boolean {
        const pluginIndicators = [
            // Classes génériques de plugins
            '.dataview', '.tasks-plugin', '.pomodoro-timer', '.kanban-plugin',
            '.calendar-plugin', '.templater-plugin', '.quickadd-plugin',
            
            // ✅ NOUVEAU : Indicateurs spécifiques au plugin Tasks
            '.task-list-item', '.contains-task-list', '.tasks-widget',
            '.task-controls', '.task-metadata', '.task-due-date', '.task-priority',
            
            // Attributs de données
            '[data-plugin]', '[data-task]', '[data-dataview]', '[data-kanban]',
            '[data-task-status]', '[data-task-due]', '[data-task-start]',
            
            // Blocs de code de plugins
            '.block-language-dataview', '.block-language-tasks', 
            '.block-language-kanban', '.block-language-mermaid',
            
            // Préfixes de classes
            '.plugin-', '.widget-', '.obsidian-',
            
            // Éléments interactifs de plugins
            '.dataview-table', '.dataview-list',
            '.tasks-widget', '.calendar-widget',
            
            // Conteneurs de plugins
            '[data-type="plugin"]', '.plugin-content', '.widget-content'
        ];
        
        return pluginIndicators.some(selector => {
            try {
                return element.matches(selector);
            } catch (error) {
                return false;
            }
        });
    }
    
    /**
     * Rafraîchit le support des plugins
     */
    private refreshPluginSupport(container: HTMLElement, sourcePath: string): void {
        this.logger.debug('🔄 Rafraîchissement support plugins');
        
        const pluginElements = container.querySelectorAll(
            '.dataview, .tasks-plugin, .pomodoro-timer, [data-plugin], .plugin-, .task-list-item'
        );
        
        this.logger.debug(`🔌 ${pluginElements.length} éléments de plugins détectés après rafraîchissement`);
        
        this.setupContextCorrection(container, sourcePath);
    }
    
    /**
     * ✅ AMÉLIORATION : Configure la correction de contexte avec support Tasks
     */
    private setupContextCorrection(container: HTMLElement, sourcePath: string): void {
        setTimeout(() => {
            const pluginElements = container.querySelectorAll(
                '[data-plugin], .plugin-content, .dataview, .tasks-plugin, .task-list-item'
            );
            
            pluginElements.forEach(element => {
                try {
                    if (!element.getAttribute('data-source-path')) {
                        element.setAttribute('data-source-path', sourcePath);
                    }
                    
                    if (!element.getAttribute('data-app-context')) {
                        element.setAttribute('data-app-context', 'agile-board');
                    }
                    
                    // ✅ NOUVEAU : Contexte spécifique pour Tasks
                    if (element.matches('.task-list-item, .tasks-plugin')) {
                        element.setAttribute('data-tasks-context', 'agile-board');
                    }
                } catch (error) {
                    this.logger.warn('⚠️ Erreur ajout contexte plugin', error);
                }
            });
        }, 200);
    }
    
    /**
     * ✅ AMÉLIORATION : Applique des fallbacks avec support Tasks
     */
    private applyPluginFallbacks(container: HTMLElement): void {
        // Fallback 1 : Dataview qui ne se charge pas
        setTimeout(() => {
            const brokenDataview = container.querySelectorAll('.block-language-dataview:empty, .dataview:empty');
            brokenDataview.forEach(element => {
                if (!element.textContent?.trim()) {
                    element.innerHTML = '<em>📊 Dataview en cours de chargement...</em>';
                }
            });
        }, 2000);
        
        // Fallback 2 : Tasks qui ne se chargent pas
        setTimeout(() => {
            const brokenTasks = container.querySelectorAll('.block-language-tasks:empty, .tasks-plugin:empty');
            brokenTasks.forEach(element => {
                if (!element.textContent?.trim()) {
                    element.innerHTML = '<em>✅ Tasks en cours de chargement...</em>';
                }
            });
        }, 2000);
        
        // ✅ NOUVEAU : Fallback 3 : Vérification des tâches sans checkbox
        setTimeout(() => {
            const taskItems = container.querySelectorAll('.task-list-item');
            taskItems.forEach(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (!checkbox) {
                    this.logger.warn('⚠️ Tâche détectée sans checkbox, tentative de correction');
                    // Possibilité d'ajouter une correction ici si nécessaire
                }
            });
        }, 1000);
        
        // Fallback 4 : Forcer le rechargement des plugins récalcitrants
        setTimeout(() => {
            try {
                const event = new CustomEvent('obsidian:plugin-reload', {
                    detail: { container, timestamp: Date.now() }
                });
                document.dispatchEvent(event);
            } catch (error) {
                this.logger.warn('⚠️ Erreur dispatch événement plugin-reload', error);
            }
        }, 3000);
        
        // ✅ NOUVEAU : Fallback 5 : Support spécial pour les tâches qui ne répondent pas
        setTimeout(() => {
            try {
                const tasks = container.querySelectorAll('.task-list-item input[type="checkbox"]');
                tasks.forEach((checkbox: HTMLInputElement) => {
                    // Vérifier si l'événement change est bien écouté
                    if (!checkbox.dataset.tasksHandlerAttached) {
                        this.logger.debug('🔧 Ajout gestionnaire de fallback pour tâche');
                        
                        const fallbackHandler = (event: Event) => {
                            this.logger.debug('✅ Gestionnaire fallback Tasks déclenché');
                            // Forcer une mise à jour après un délai
                            setTimeout(() => {
                                try {
                                    const content = this.extractCurrentContent(container);
                                    if (content) {
                                        // Déclencher un événement personnalisé pour notifier le changement
                                        const changeEvent = new CustomEvent('agile-board:task-changed', {
                                            detail: { content, timestamp: Date.now() }
                                        });
                                        container.dispatchEvent(changeEvent);
                                    }
                                } catch (error) {
                                    this.logger.warn('⚠️ Erreur dans gestionnaire fallback Tasks', error);
                                }
                            }, 250);
                        };
                        
                        checkbox.addEventListener('change', fallbackHandler);
                        checkbox.dataset.tasksHandlerAttached = 'true';
                    }
                });
            } catch (error) {
                this.logger.warn('⚠️ Erreur setup fallback Tasks', error);
            }
        }, 1500);
    }
    
    /**
     * ✅ NOUVEAU : Méthode publique pour extraire le contenu (utilisée par MarkdownFrame)
     */
    public extractCurrentContentPublic(container: HTMLElement): string | null {
        return this.extractCurrentContent(container);
    }

    /**
     * Nettoie les ressources
     */
    dispose(): void {
        this.logger.debug('🧹 Nettoyage PluginIntegrationManager');
        
        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                this.logger.warn('⚠️ Erreur disconnect observer', error);
            }
        });
        this.observers = [];
        
        this.eventCleanupFunctions.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                this.logger.warn('⚠️ Erreur cleanup event listener', error);
            }
        });
        this.eventCleanupFunctions = [];
    }
    
    /**
     * Statistiques pour debugging
     */
    getStats(): { observers: number; eventListeners: number } {
        return {
            observers: this.observers.length,
            eventListeners: this.eventCleanupFunctions.length
        };
    }
}