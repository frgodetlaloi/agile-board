/**
 * =============================================================================
 * GESTIONNAIRE D'INTÉGRATION UNIVERSELLE AVEC LES PLUGINS OBSIDIAN
 * =============================================================================
 * 
 * Fichier : src/services/PluginIntegrationManager.ts
 * 
 * Ce service permet le support automatique de tous les plugins Obsidian
 * (Tasks, Dataview, Pomodoro Timer, etc.) sans modification de code spécifique.
 * 
 * PRINCIPE : Délégation d'événements + conversion intelligente HTML→Markdown
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
     * @param container - Container où surveiller les plugins
     * @param onContentChange - Callback lors de changement de contenu
     * @param sourcePath - Chemin du fichier source pour le contexte
     */
    setupUniversalPluginSupport(
        container: HTMLElement,
        onContentChange: (newContent: string) => void,
        sourcePath: string
    ): void {
        this.logger.info('🔌 Configuration support universel plugins');
        
        // 1. Surveiller les mutations DOM (plugins qui se chargent après)
        this.setupMutationObserver(container, sourcePath);
        
        // 2. Déléguer tous les événements aux plugins originaux
        this.setupEventDelegation(container, onContentChange, sourcePath);
        
        // 3. Détecter et corriger les problèmes de contexte
        this.setupContextCorrection(container, sourcePath);
        
        // 4. Appliquer les fallbacks pour plugins problématiques
        this.applyPluginFallbacks(container);
    }
    
    /**
     * Surveille les changements DOM pour détecter les nouveaux plugins
     */
    private setupMutationObserver(container: HTMLElement, sourcePath: string): void {
        const observer = new MutationObserver((mutations) => {
            let hasPluginChanges = false;
            
            mutations.forEach((mutation) => {
                // Détecter l'ajout de nouveaux éléments de plugins
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
                
                // Détecter les changements d'attributs des plugins
                if (mutation.type === 'attributes') {
                    const element = mutation.target as HTMLElement;
                    if (this.isPluginElement(element)) {
                        this.logger.debug('🔄 Plugin modifié:', element.className);
                        hasPluginChanges = true;
                    }
                }
            });
            
            // Reconfigurer si nécessaire
            if (hasPluginChanges) {
                setTimeout(() => this.refreshPluginSupport(container, sourcePath), 100);
            }
        });
        
        observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'data-task', 'data-plugin', 'data-dataview']
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
        // Délégation pour tous les événements possibles
        const eventTypes = ['click', 'change', 'input', 'keyup', 'blur', 'focus'];
        
        eventTypes.forEach(eventType => {
            const handler = (event: Event) => {
                this.handleUniversalEvent(event, onContentChange, sourcePath);
            };
            
            container.addEventListener(eventType, handler, true); // useCapture = true
            
            // Stocker pour nettoyage
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
        
        // Ignorer les événements de navigation (ne pas éditer)
        if (this.isNavigationEvent(event, target)) {
            this.logger.debug('🧭 Événement de navigation ignoré:', event.type);
            return;
        }
        
        // Si c'est un événement de modification, capturer le nouveau contenu
        if (this.isContentModificationEvent(event, target)) {
            this.logger.debug('✏️ Modification détectée:', event.type, target.tagName);
            
            // Délai pour laisser le plugin traiter l'événement
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
            }, 150);
        }
    }
    
    /**
     * Détermine si un événement est de navigation (ne doit pas déclencher l'édition)
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
        // Checkboxes (Tasks, etc.)
        if (target.matches('input[type="checkbox"]') && event.type === 'change') {
            return true;
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
        
        // Parcourir tous les éléments de premier niveau
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
        
        // Nettoyer et joindre
        return lines
            .filter(line => line.trim().length > 0)
            .join('\n')
            .replace(/\n\n+/g, '\n\n'); // Normaliser les retours à la ligne
    }
    
    /**
     * Parcourt les nœuds de manière intelligente
     */
    private walkNodes(container: HTMLElement, callback: (node: Node) => void): void {
        // Traiter les enfants directs qui sont des éléments de contenu
        Array.from(container.childNodes).forEach(node => {
            // Ignorer les scripts et styles
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
     * Convertit un élément HTML spécifique en Markdown
     */
    private convertElementToMarkdown(element: HTMLElement): string {
        // Ignorer les éléments cachés ou techniques
        if (element.matches('.sr-only, .screen-reader-text, script, style')) {
            return '';
        }
        
        // Tâches (Tasks plugin et autres)
        if (element.matches('.task-list-item, li:has(input[type="checkbox"])')) {
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
     * Convertit une tâche en Markdown (compatible tous plugins)
     */
    private convertTaskToMarkdown(element: HTMLElement): string {
        const checkbox = element.querySelector('input[type="checkbox"]');
        const isChecked = checkbox ? (checkbox as HTMLInputElement).checked : false;
        const checkState = isChecked ? '[x]' : '[ ]';
        
        // Récupérer le texte en préservant les attributs des plugins
        let taskText = '';
        
        // Méthode 1 : Attributs de données des plugins
        const dataTask = element.getAttribute('data-task');
        if (dataTask) {
            taskText = dataTask;
        } else {
            // Méthode 2 : Texte après la checkbox
            const clonedElement = element.cloneNode(true) as HTMLElement;
            const clonedCheckbox = clonedElement.querySelector('input[type="checkbox"]');
            if (clonedCheckbox) {
                clonedCheckbox.remove();
            }
            taskText = this.getTextContent(clonedElement).trim();
        }
        
        return `- ${checkState} ${taskText}`;
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
        // Rechercher dans les classes
        const classList = Array.from(element.classList);
        for (const className of classList) {
            if (className.startsWith('language-')) {
                return className.substring(9);
            }
            if (className.startsWith('cm-')) {
                return className.substring(3);
            }
        }
        
        // Rechercher dans les attributs
        const lang = element.getAttribute('data-language') || 
                    element.getAttribute('data-lang');
        if (lang) return lang;
        
        return '';
    }
    
    /**
     * Préserve le contenu d'un élément de plugin
     */
    private preservePluginContent(element: HTMLElement): string {
        // Pour les plugins, on essaie de préserver le markdown original
        const originalMarkdown = element.getAttribute('data-original-markdown');
        if (originalMarkdown) {
            return originalMarkdown;
        }
        
        // Fallback : essayer de reconstruire le markdown selon le plugin
        if (element.matches('.dataview, .block-language-dataview')) {
            return this.reconstructDataviewMarkdown(element);
        }
        
        if (element.matches('.tasks-plugin, [data-task], .block-language-tasks')) {
            return this.reconstructTasksMarkdown(element);
        }
        
        if (element.matches('.kanban-plugin')) {
            return this.reconstructKanbanMarkdown(element);
        }
        
        // Autres plugins : contenu textuel avec préservation de structure
        return this.getTextContent(element);
    }
    
    /**
     * Reconstruit le markdown Dataview
     */
    private reconstructDataviewMarkdown(element: HTMLElement): string {
        // Essayer de récupérer la requête originale
        const query = element.getAttribute('data-query') || 
                     element.querySelector('.dataview-query')?.textContent ||
                     element.getAttribute('data-dv-query');
        
        if (query) {
            return '```dataview\n' + query + '\n```';
        }
        
        // Fallback : observer le contenu pour deviner la requête
        const content = this.getTextContent(element);
        if (content.includes('TABLE') || content.includes('LIST') || content.includes('TASK')) {
            return '```dataview\n' + content + '\n```';
        }
        
        return content;
    }
    
    /**
     * Reconstruit le markdown Tasks
     */
    private reconstructTasksMarkdown(element: HTMLElement): string {
        // Essayer de récupérer la requête Tasks originale
        const query = element.getAttribute('data-tasks-query') ||
                     element.querySelector('.tasks-query')?.textContent ||
                     element.getAttribute('data-query');
        
        if (query) {
            return '```tasks\n' + query + '\n```';
        }
        
        // Fallback : regarder le contenu pour des patterns Tasks
        const content = this.getTextContent(element);
        if (content.includes('not done') || content.includes('done') || content.includes('due')) {
            return '```tasks\n' + content + '\n```';
        }
        
        return content;
    }
    
    /**
     * Reconstruit le markdown Kanban
     */
    private reconstructKanbanMarkdown(element: HTMLElement): string {
        // Pour Kanban, c'est généralement une configuration JSON
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
     * Détermine si un élément appartient à un plugin
     */
    isPluginElement(element: HTMLElement): boolean {
        const pluginIndicators = [
            // Classes génériques de plugins
            '.dataview', '.tasks-plugin', '.pomodoro-timer', '.kanban-plugin',
            '.calendar-plugin', '.templater-plugin', '.quickadd-plugin',
            
            // Attributs de données
            '[data-plugin]', '[data-task]', '[data-dataview]', '[data-kanban]',
            
            // Blocs de code de plugins
            '.block-language-dataview', '.block-language-tasks', 
            '.block-language-kanban', '.block-language-mermaid',
            
            // Préfixes de classes
            '.plugin-', '.widget-', '.obsidian-',
            
            // Éléments interactifs de plugins
            '.task-list-item', '.dataview-table', '.dataview-list',
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
        
        // Re-scanner les nouveaux éléments
        const pluginElements = container.querySelectorAll(
            '.dataview, .tasks-plugin, .pomodoro-timer, [data-plugin], .plugin-'
        );
        
        this.logger.debug(`🔌 ${pluginElements.length} éléments de plugins détectés après rafraîchissement`);
        
        // Réappliquer le contexte pour les nouveaux éléments
        this.setupContextCorrection(container, sourcePath);
    }
    
    /**
     * Configure la correction de contexte pour les plugins
     */
    private setupContextCorrection(container: HTMLElement, sourcePath: string): void {
        // Certains plugins ont besoin du contexte de fichier
        setTimeout(() => {
            const pluginElements = container.querySelectorAll('[data-plugin], .plugin-content, .dataview, .tasks-plugin');
            
            pluginElements.forEach(element => {
                try {
                    // Ajouter le contexte de fichier si manquant
                    if (!element.getAttribute('data-source-path')) {
                        element.setAttribute('data-source-path', sourcePath);
                    }
                    
                    // Ajouter le contexte de l'app si nécessaire
                    if (!element.getAttribute('data-app-context')) {
                        element.setAttribute('data-app-context', 'agile-board');
                    }
                } catch (error) {
                    this.logger.warn('⚠️ Erreur ajout contexte plugin', error);
                }
            });
        }, 200);
    }
    
    /**
     * Applique des fallbacks pour plugins problématiques
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
        
        // Fallback 3 : Forcer le rechargement des plugins récalcitrants
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
    }
    
    /**
     * Nettoie les ressources
     */
    dispose(): void {
        this.logger.debug('🧹 Nettoyage PluginIntegrationManager');
        
        // Nettoyer les observers
        this.observers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                this.logger.warn('⚠️ Erreur disconnect observer', error);
            }
        });
        this.observers = [];
        
        // Nettoyer les event listeners
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