// ====================================================================
// 📁 src/services/LoggerService.ts - Service de logging centralisé
// ====================================================================

import { Plugin, TFile, Notice } from 'obsidian';
import { LogLevel, DebugSettings, LogStats } from '../types';

/**
 * Service centralisé de logging avec support de niveaux configurables
 * et sauvegarde optionnelle dans un fichier
 */
export class LoggerService {
    private plugin: Plugin;
    private settings: DebugSettings;
    private logBuffer: string[] = [];
    private readonly MAX_BUFFER_SIZE = 1000;
    private readonly LOG_PREFIX = 'Agile-Board';

    constructor(plugin: Plugin, settings: DebugSettings) {
        this.plugin = plugin;
        this.settings = settings;
    }

    /**
     * Met à jour la configuration de debug
     * @param settings Nouveaux paramètres de debug
     */
    updateSettings(settings: DebugSettings): void {
        const wasEnabled = this.settings.enabled;
        this.settings = settings;
        
        // Si le debug vient d'être désactivé, vider le buffer
        if (wasEnabled && !settings.enabled) {
            this.clearBuffer();
        }
        
        this.debug('Configuration de debug mise à jour', settings, 'LoggerService.ts');
    }

    // ====================================================================
    // MÉTHODES DE LOGGING PAR NIVEAU
    // ====================================================================

    /**
     * Log de niveau ERROR - Erreurs critiques uniquement
     * Toujours visibles si le debug est activé
     */
    error(message: string, data?: any, source?: string): void {
        this.log(LogLevel.ERROR, '❌', message, data, source);
    }

    /**
     * Log de niveau WARN - Avertissements importants
     * Situations potentiellement problématiques
     */
    warn(message: string, data?: any, source?: string): void {
        this.log(LogLevel.WARN, '⚠️', message, data, source);
    }

    /**
     * Log de niveau INFO - Informations importantes
     * Événements significatifs du cycle de vie
     */
    info(message: string, data?: any, source?: string): void {
        this.log(LogLevel.INFO, 'ℹ️', message, data, source);
    }

    /**
     * Log de niveau DEBUG - Informations de debug détaillées
     * Utile pour diagnostiquer des problèmes
     */
    debug(message: string, data?: any, source?: string): void {
        this.log(LogLevel.DEBUG, '🔧', message, data, source);
    }

    /**
     * Log de niveau VERBOSE - Traces très détaillées
     * Toutes les opérations internes
     */
    verbose(message: string, data?: any, source?: string): void {
        this.log(LogLevel.VERBOSE, '🔍', message, data, source);
    }

    // ====================================================================
    // MÉTHODES DE LOGGING SPÉCIALISÉES
    // ====================================================================

    /**
     * Log spécialisé pour les événements de démarrage
     */
    startup(message: string, data?: any): void {
        this.log(LogLevel.INFO, '🚀', `[STARTUP] ${message}`, data, 'main.ts');
    }

    /**
     * Log spécialisé pour les opérations réussies
     */
    success(message: string, data?: any, source?: string): void {
        this.log(LogLevel.INFO, '✅', `[SUCCESS] ${message}`, data, source);
    }

    /**
     * Log spécialisé pour la navigation dans l'interface
     */
    navigation(message: string, data?: any, source?: string): void {
        this.log(LogLevel.DEBUG, '🎯', `[NAVIGATION] ${message}`, data, source);
    }

    /**
     * Log spécialisé pour les opérations sur les fichiers
     */
    fileOperation(message: string, data?: any, source?: string): void {
        this.log(LogLevel.DEBUG, '📂', `[FILE] ${message}`, data, source);
    }

    /**
     * Log spécialisé pour les mesures de performance
     */
    performance(message: string, data?: any, source?: string): void {
        this.log(LogLevel.VERBOSE, '⚡', `[PERF] ${message}`, data, source);
    }

    /**
     * Log spécialisé pour les opérations de configuration
     */
    config(message: string, data?: any, source?: string): void {
        this.log(LogLevel.DEBUG, '⚙️', `[CONFIG] ${message}`, data, source);
    }

    // ====================================================================
    // MÉTHODE PRINCIPALE DE LOGGING
    // ====================================================================

    /**
     * Méthode principale de logging avec gestion des niveaux et formatage
     */
    private log(level: LogLevel, icon: string, message: string, data?: any, source?: string): void {
        // Vérifier si le logging est activé et si le niveau est suffisant
        if (!this.settings.enabled || level > this.settings.logLevel) {
            return;
        }

        // Construire les composants du message
        const timestamp = this.settings.showTimestamps ? this.getTimestamp() : '';
        const sourceInfo = this.settings.showSourceLocation && source ? `[${source}]` : '';
        
        // Assembler le message formaté
        let formattedMessage = `${icon} ${this.LOG_PREFIX}${timestamp}${sourceInfo}: ${message}`;
        
        // Afficher dans la console avec la méthode appropriée
        const consoleMethod = this.getConsoleMethod(level);
        if (data !== undefined) {
            consoleMethod(formattedMessage, data);
        } else {
            consoleMethod(formattedMessage);
        }

        // Ajouter au buffer pour sauvegarde fichier si activée
        if (this.settings.logToFile) {
            this.addToBuffer(formattedMessage, data);
        }
    }

    /**
     * Détermine la méthode console appropriée selon le niveau de log
     */
    private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
        switch (level) {
            case LogLevel.ERROR:
                return console.error;
            case LogLevel.WARN:
                return console.warn;
            default:
                return console.log;
        }
    }

    /**
     * Génère un timestamp formaté avec millisecondes
     */
    private getTimestamp(): string {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const ms = now.getMilliseconds().toString().padStart(3, '0');
        
        return ` [${hours}:${minutes}:${seconds}.${ms}]`;
    }

    // ====================================================================
    // GESTION DU BUFFER ET SAUVEGARDE FICHIER
    // ====================================================================

    /**
     * Ajoute une entrée au buffer de logs pour sauvegarde
     */
    private addToBuffer(message: string, data?: any): void {
        const logEntry = data ? `${message} | Data: ${JSON.stringify(data)}` : message;
        this.logBuffer.push(logEntry);

        // Maintenir la taille du buffer sous contrôle
        if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
            this.logBuffer.shift(); // Supprime l'entrée la plus ancienne
        }
    }

    /**
     * Sauvegarde le buffer de logs dans un fichier du vault
     * Gère la rotation automatique des fichiers volumineux
     */
    async saveLogsToFile(): Promise<void> {
        if (!this.settings.logToFile || this.logBuffer.length === 0) {
            return;
        }

        try {
            const logContent = this.logBuffer.join('\n');
            const fileName = this.settings.logFileName || 'agile-board-debug.log';
            
            // Vérifier si le fichier existe déjà
            const existingFile = this.plugin.app.vault.getAbstractFileByPath(fileName);
            
            if (existingFile instanceof TFile) {
                // Vérifier la taille du fichier existant
                const stat = await this.plugin.app.vault.adapter.stat(fileName);
                if (stat && stat.size > this.settings.maxLogFileSize * 1024) {
                    // Fichier trop volumineux : créer un backup et recommencer
                    const backupName = `${fileName}.backup-${Date.now()}`;
                    const content = await this.plugin.app.vault.read(existingFile);
                    await this.plugin.app.vault.create(backupName, content);
                    await this.plugin.app.vault.modify(existingFile, logContent);
                    
                    this.info('Rotation du fichier de log effectuée', { 
                        fileName, 
                        backupName,
                        newSize: logContent.length 
                    }, 'LoggerService.ts');
                } else {
                    // Ajouter au fichier existant
                    const existingContent = await this.plugin.app.vault.read(existingFile);
                    await this.plugin.app.vault.modify(existingFile, existingContent + '\n' + logContent);
                }
            } else {
                // Créer un nouveau fichier
                await this.plugin.app.vault.create(fileName, logContent);
                this.info('Nouveau fichier de log créé', { fileName }, 'LoggerService.ts');
            }

            // Vider le buffer après sauvegarde réussie
            this.clearBuffer();
            
        } catch (error) {
            // Utiliser console.error directement pour éviter une récursion
            console.error('❌ Agile-Board: Erreur lors de la sauvegarde des logs:', error);
        }
    }

    /**
     * Vide complètement le buffer de logs
     */
    clearBuffer(): void {
        this.logBuffer = [];
    }

    /**
     * Retourne les statistiques actuelles du système de logging
     */
    getStats(): LogStats {
        return {
            bufferSize: this.logBuffer.length,
            isEnabled: this.settings.enabled,
            currentLevel: LogLevel[this.settings.logLevel],
            fileLoggingEnabled: this.settings.logToFile
        };
    }

    /**
     * Effectue un test complet du système de debug
     * Utile pour vérifier la configuration
     */
    testSystem(): void {
        this.startup('🧪 Test du système de debug démarré');
        this.error('Test du niveau ERROR', { level: 'error', timestamp: Date.now() });
        this.warn('Test du niveau WARN', { level: 'warning', timestamp: Date.now() });
        this.info('Test du niveau INFO', { level: 'info', timestamp: Date.now() });
        this.debug('Test du niveau DEBUG', { level: 'debug', timestamp: Date.now() });
        this.verbose('Test du niveau VERBOSE', { level: 'verbose', timestamp: Date.now() });
        this.performance('Test des performances', { 
            startTime: performance.now(),
            memoryUsage: (performance as any).memory?.usedJSHeapSize || 'N/A'
        });
        this.success('🧪 Test du système de debug terminé avec succès');
    }
}