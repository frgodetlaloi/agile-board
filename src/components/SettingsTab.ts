// ====================================================================
// 📁 src/components/SettingsTab.ts - Interface de configuration
// ====================================================================

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import AgileBoardPlugin from '../main';
import { LogLevel } from '../types';

/**
 * Onglet de configuration du plugin dans les paramètres d'Obsidian
 */
export class AgileBoardSettingsTab extends PluginSettingTab {
    plugin: AgileBoardPlugin;

    constructor(app: App, plugin: AgileBoardPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Titre principal
        containerEl.createEl('h1', { text: 'Agile Board - Configuration' });

        // ====================================================================
        // SECTION DEBUG
        // ====================================================================
        this.createDebugSection(containerEl);

        // ====================================================================
        // SECTION GÉNÉRAL
        // ====================================================================
        this.createGeneralSection(containerEl);
    }

    /**
     * Crée la section de configuration du debug
     */
    private createDebugSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '🔧 Configuration du Debug' });
        
        const debugDesc = containerEl.createEl('div', { cls: 'setting-item-description' });
        debugDesc.innerHTML = `
            <p>Configurez le niveau de verbosité et les options de debug du plugin.</p>
            <p><strong>Conseil :</strong> Gardez le debug <em>désactivé</em> en usage normal pour optimiser les performances.</p>
        `;

        // Activation/désactivation générale
        new Setting(containerEl)
            .setName('Activer le debug')
            .setDesc('Active ou désactive complètement le système de debug')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debug.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.debug.enabled = value;
                    await this.plugin.saveSettings();
                    
                    // Afficher une notification
                    new Notice(`Debug ${value ? 'activé' : 'désactivé'}`);
                    
                    // Mettre à jour l'affichage pour montrer/cacher les options
                    this.display();
                }));

        // Si le debug est activé, afficher les options avancées
        if (this.plugin.settings.debug.enabled) {
            this.createDebugAdvancedOptions(containerEl);
        }
    }

    /**
     * Crée les options avancées de debug (quand activé)
     */
    private createDebugAdvancedOptions(containerEl: HTMLElement): void {
        // Niveau de verbosité
        new Setting(containerEl)
            .setName('Niveau de verbosité')
            .setDesc('Contrôle la quantité d\'informations affichées dans les logs')
            .addDropdown(dropdown => dropdown
                .addOption(LogLevel.ERROR.toString(), '❌ Erreurs uniquement')
                .addOption(LogLevel.WARN.toString(), '⚠️ Erreurs + Avertissements')
                .addOption(LogLevel.INFO.toString(), 'ℹ️ Informations importantes (recommandé)')
                .addOption(LogLevel.DEBUG.toString(), '🔧 Debug détaillé')
                .addOption(LogLevel.VERBOSE.toString(), '🔍 Tout afficher (très verbeux)')
                .setValue(this.plugin.settings.debug.logLevel.toString())
                .onChange(async (value) => {
                    this.plugin.settings.debug.logLevel = parseInt(value) as LogLevel;
                    await this.plugin.saveSettings();
                    new Notice(`Niveau de debug: ${LogLevel[parseInt(value)]}`);
                }));

        // Options d'affichage
        new Setting(containerEl)
            .setName('Afficher les timestamps')
            .setDesc('Ajoute l\'heure précise à chaque message de log')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debug.showTimestamps)
                .onChange(async (value) => {
                    this.plugin.settings.debug.showTimestamps = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Afficher la source')
            .setDesc('Indique le fichier source de chaque message de log')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debug.showSourceLocation)
                .onChange(async (value) => {
                    this.plugin.settings.debug.showSourceLocation = value;
                    await this.plugin.saveSettings();
                }));

        // Sauvegarde dans fichier
        new Setting(containerEl)
            .setName('Sauvegarder dans un fichier')
            .setDesc('Enregistre automatiquement les logs dans un fichier de votre vault')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debug.logToFile)
                .onChange(async (value) => {
                    this.plugin.settings.debug.logToFile = value;
                    await this.plugin.saveSettings();
                    
                    // Rafraîchir pour montrer/cacher les options de fichier
                    this.display();
                }));

        // Options de fichier (si sauvegarde activée)
        if (this.plugin.settings.debug.logToFile) {
            this.createFileLoggingOptions(containerEl);
        }

        // Boutons d'action
        this.createDebugActions(containerEl);
    }

    /**
     * Crée les options de sauvegarde fichier
     */
    private createFileLoggingOptions(containerEl: HTMLElement): void {
        // Nom du fichier
        new Setting(containerEl)
            .setName('Nom du fichier de log')
            .setDesc('Nom du fichier où sauvegarder les logs (dans la racine du vault)')
            .addText(text => text
                .setPlaceholder('agile-board-debug.log')
                .setValue(this.plugin.settings.debug.logFileName)
                .onChange(async (value) => {
                    this.plugin.settings.debug.logFileName = value || 'agile-board-debug.log';
                    await this.plugin.saveSettings();
                }));

        // Taille maximale
        new Setting(containerEl)
            .setName('Taille maximale du fichier')
            .setDesc('Taille maximale en KB avant rotation automatique')
            .addSlider(slider => slider
                .setLimits(100, 10000, 100)
                .setValue(this.plugin.settings.debug.maxLogFileSize)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.debug.maxLogFileSize = value;
                    await this.plugin.saveSettings();
                }));
    }

    /**
     * Crée les boutons d'action pour le debug
     */
    private createDebugActions(containerEl: HTMLElement): void {
        const actionsContainer = containerEl.createDiv('debug-actions');
        actionsContainer.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background-color: var(--background-secondary);
            border-radius: 6px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        `;

        // Bouton test
        const testButton = actionsContainer.createEl('button', {
            text: '🧪 Tester le système',
            cls: 'mod-cta'
        });
        testButton.onclick = () => {
            this.plugin.logger.testSystem();
            new Notice('Test de debug exécuté - vérifiez la console (F12)', 3000);
        };

        // Bouton sauvegarde manuelle
        if (this.plugin.settings.debug.logToFile) {
            const saveButton = actionsContainer.createEl('button', {
                text: '💾 Sauvegarder maintenant'
            });
            saveButton.onclick = async () => {
                await this.plugin.logger.saveLogsToFile();
                new Notice('Logs sauvegardés', 2000);
            };
        }

        // Bouton statistiques
        const statsButton = actionsContainer.createEl('button', {
            text: '📊 Statistiques'
        });
        statsButton.onclick = () => this.showDebugStats();

        // Bouton vider buffer
        const clearButton = actionsContainer.createEl('button', {
            text: '🗑️ Vider le buffer'
        });
        clearButton.onclick = () => {
            this.plugin.logger.clearBuffer();
            new Notice('Buffer de logs vidé', 2000);
        };
    }

    /**
     * Affiche les statistiques de debug dans une notification
     */
    private showDebugStats(): void {
        const stats = this.plugin.logger.getStats();
        const message = `📊 Statistiques de Debug:\n\n` +
                       `• Statut: ${stats.isEnabled ? '✅ Activé' : '❌ Désactivé'}\n` +
                       `• Niveau: ${stats.currentLevel}\n` +
                       `• Buffer: ${stats.bufferSize} entrées\n` +
                       `• Fichier: ${stats.fileLoggingEnabled ? '✅ Activé' : '❌ Désactivé'}`;
        
        new Notice(message, 6000);
    }

    /**
     * Crée la section de configuration générale
     */
    private createGeneralSection(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: '⚙️ Paramètres Généraux' });

        // Auto-création des sections
        new Setting(containerEl)
            .setName('Création automatique des sections')
            .setDesc('Crée automatiquement les sections manquantes lors de l\'ouverture d\'un board')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoCreateSections)
                .onChange(async (value) => {
                    this.plugin.settings.autoCreateSections = value;
                    await this.plugin.saveSettings();
                    this.plugin.logger.config('Auto-création sections modifiée', { enabled: value });
                }));

        // Layouts par défaut (exemple simple)
        const layoutDesc = containerEl.createEl('div', { cls: 'setting-item-description' });
        layoutDesc.innerHTML = `
            <p><strong>Layouts disponibles:</strong> Eisenhower, Kanban, GTD, Weekly Planner, Daily Planner, Project Board, Cornell Notes, Tasks Dashboard</p>
        `;
    }
}