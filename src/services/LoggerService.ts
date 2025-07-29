/**
 * =============================================================================
 * SERVICE DE LOGGING CENTRALISÉ POUR AGILE BOARD
 * =============================================================================
 * 
 * Version adaptée pour buffer de strings (Solution 1)
 */

import { LogLevel, DebugSettings, LogStats } from '../types';
import type AgileBoardPlugin from '../main';

export class LoggerService {
    private plugin: AgileBoardPlugin;
    private settings: DebugSettings;
    private logBuffer: string[] = [];  // Buffer de strings

    constructor(plugin: AgileBoardPlugin, settings: DebugSettings) {
        this.plugin = plugin;
        this.settings = settings;
    }

    /**
     * Met à jour les paramètres de debug
     */
    updateSettings(settings: DebugSettings): void {
        this.settings = settings;
    }

    /**
     * Ajoute un message au buffer
     */
    private addToBuffer(level: LogLevel, message: string, data?: any, source?: string): void {
        const timestamp = new Date().toISOString();
        const levelStr = LogLevel[level];
        const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
        const sourceStr = source ? ` | Source: ${source}` : '';
        
        const logEntry = `[${timestamp}] ${levelStr}: ${message}${dataStr}${sourceStr}`;
        
        this.logBuffer.push(logEntry);
        
        // Limiter la taille du buffer
        if (this.logBuffer.length > 1000) {
            this.logBuffer = this.logBuffer.slice(-500); // Garder les 500 plus récents
        }
    }

    /**
     * Log d'erreur
     */
    error(message: string, error?: any, source?: string): void {
        if (!this.settings.enabled || this.settings.logLevel < LogLevel.ERROR) return;
        
        this.addToBuffer(LogLevel.ERROR, message, error, source);
        
        if (this.settings.logToConsole) {
            console.error(`❌ [Agile-Board] ${message}`, error);
        }
    }

    /**
     * Log d'avertissement
     */
    warn(message: string, data?: any, source?: string): void {
        if (!this.settings.enabled || this.settings.logLevel < LogLevel.WARN) return;
        
        this.addToBuffer(LogLevel.WARN, message, data, source);
        
        if (this.settings.logToConsole) {
            console.warn(`⚠️ [Agile-Board] ${message}`, data);
        }
    }

    /**
     * Log d'information
     */
    info(message: string, data?: any, source?: string): void {
        if (!this.settings.enabled || this.settings.logLevel < LogLevel.INFO) return;
        
        this.addToBuffer(LogLevel.INFO, message, data, source);
        
        if (this.settings.logToConsole) {
            console.info(`ℹ️ [Agile-Board] ${message}`, data);
        }
    }

    /**
     * Log de debug
     */
    debug(message: string, data?: any, source?: string): void {
        if (!this.settings.enabled || this.settings.logLevel < LogLevel.DEBUG) return;
        
        this.addToBuffer(LogLevel.DEBUG, message, data, source);
        
        if (this.settings.logToConsole) {
            console.debug(`🔧 [Agile-Board] ${message}`, data);
        }
    }

    /**
     * Log verbose
     */
    verbose(message: string, data?: any, source?: string): void {
        if (!this.settings.enabled || this.settings.logLevel < LogLevel.VERBOSE) return;
        
        this.addToBuffer(LogLevel.VERBOSE, message, data, source);
        
        if (this.settings.logToConsole) {
            console.debug(`🔍 [Agile-Board] ${message}`, data);
        }
    }

    /**
     * Log de démarrage (toujours affiché)
     */
    startup(message: string, data?: any): void {
        this.addToBuffer(LogLevel.INFO, `STARTUP: ${message}`, data, 'startup');
        console.log(`🚀 [Agile-Board] ${message}`, data);
    }

    /**
     * Log de succès
     */
    success(message: string, data?: any, source?: string): void {
        if (!this.settings.enabled || this.settings.logLevel < LogLevel.INFO) return;
        
        this.addToBuffer(LogLevel.INFO, `SUCCESS: ${message}`, data, source);
        
        if (this.settings.logToConsole) {
            console.log(`✅ [Agile-Board] ${message}`, data);
        }
    }

    /**
     * Log de configuration
     */
    config(message: string, data?: any): void {
        if (!this.settings.enabled || this.settings.logLevel < LogLevel.DEBUG) return;
        
        this.addToBuffer(LogLevel.DEBUG, `CONFIG: ${message}`, data, 'config');
        
        if (this.settings.logToConsole) {
            console.debug(`⚙️ [Agile-Board] ${message}`, data);
        }
    }

    /**
     * Log de navigation
     */
    navigation(message: string, data?: any): void {
        if (!this.settings.enabled || this.settings.logLevel < LogLevel.VERBOSE) return;
        
        this.addToBuffer(LogLevel.VERBOSE, `NAV: ${message}`, data, 'navigation');
        
        if (this.settings.logToConsole) {
            console.debug(`🧭 [Agile-Board] ${message}`, data);
        }
    }

    /**
     * Log d'opération sur fichier
     */
    fileOperation(message: string, data?: any): void {
        if (!this.settings.enabled || this.settings.logLevel < LogLevel.DEBUG) return;
        
        this.addToBuffer(LogLevel.DEBUG, `FILE: ${message}`, data, 'file');
        
        if (this.settings.logToConsole) {
            console.debug(`📁 [Agile-Board] ${message}`, data);
        }
    }

    /**
     * Test du système de logging
     */
    testSystem(): void {
        this.info('Test du système de logging lancé');
        this.debug('Message de debug test');
        this.verbose('Message verbeux test');
        this.warn('Message d\'avertissement test');
        this.error('Message d\'erreur test (test uniquement)');
        this.success('Test du système de logging terminé');
    }

    /**
     * Retourne les statistiques du logger
     */
    getStats(): LogStats {
        return {
            totalLogs: this.logBuffer.length,
            // Pour un buffer de strings, on analyse le contenu pour compter par type
            errorCount: this.logBuffer.filter(log => 
                log.includes('ERROR:') || log.includes('❌') || log.includes('Message d\'erreur')
            ).length,
            warningCount: this.logBuffer.filter(log => 
                log.includes('WARN:') || log.includes('⚠️') || log.includes('Message d\'avertissement')
            ).length,
            debugCount: this.logBuffer.filter(log => 
                log.includes('DEBUG:') || log.includes('🔧') || log.includes('VERBOSE:') || log.includes('🔍')
            ).length,
            lastLogTime: new Date().toISOString(), // Timestamp actuel
            bufferSize: this.logBuffer.length,
            isEnabled: this.settings.enabled,
            currentLevel: LogLevel[this.settings.logLevel],
            fileLoggingEnabled: this.settings.logToFile
        };
    }

    /**
     * Vide le buffer de logs
     */
    clearBuffer(): void {
        this.logBuffer.length = 0;
        this.debug('Buffer de logs vidé');
    }

    /**
     * Retourne tout le contenu du buffer
     */
    getBuffer(): string[] {
        return [...this.logBuffer];
    }

    /**
     * Sauvegarde les logs dans un fichier
     */
    async saveLogsToFile(): Promise<void> {
        if (!this.settings.logToFile || this.logBuffer.length === 0) {
            return;
        }

        try {
            const fileName = this.settings.logFileName || 'agile-board-debug.log';
            const content = this.logBuffer.join('\n');
            
            // Créer le fichier de log dans le vault
            const adapter = this.plugin.app.vault.adapter;
            
            // Vérifier si le fichier existe déjà
            const exists = await adapter.exists(fileName);
            
            if (exists) {
                // Ajouter au fichier existant
                const existingContent = await adapter.read(fileName);
                const newContent = existingContent + '\n' + content;
                
                // Vérifier la taille du fichier
                if (newContent.length > (this.settings.maxLogFileSize || 5 * 1024 * 1024)) {
                    // Garder seulement la moitié du contenu le plus récent
                    const lines = newContent.split('\n');
                    const halfLines = lines.slice(Math.floor(lines.length / 2));
                    await adapter.write(fileName, halfLines.join('\n'));
                } else {
                    await adapter.write(fileName, newContent);
                }
            } else {
                // Créer un nouveau fichier
                await adapter.write(fileName, content);
            }
            
            this.debug(`Logs sauvegardés dans ${fileName} (${this.logBuffer.length} entrées)`);
            
        } catch (error) {
            console.error('[Agile-Board] Erreur lors de la sauvegarde des logs:', error);
        }
    }

    /**
     * Formate un message de log avec horodatage et source
     */
    private formatLogMessage(level: LogLevel, message: string, source?: string): string {
        const timestamp = this.settings.showTimestamps ? 
            `[${new Date().toISOString()}] ` : '';
        const sourceStr = this.settings.showSourceLocation && source ? 
            ` (${source})` : '';
        const levelStr = LogLevel[level];
        
        return `${timestamp}${levelStr}: ${message}${sourceStr}`;
    }

    /**
     * Retourne la configuration actuelle
     */
    getSettings(): DebugSettings {
        return { ...this.settings };
    }

    /**
     * Active ou désactive le logging
     */
    setEnabled(enabled: boolean): void {
        this.settings.enabled = enabled;
        this.config(`Logging ${enabled ? 'activé' : 'désactivé'}`);
    }

    /**
     * Change le niveau de log
     */
    setLogLevel(level: LogLevel): void {
        this.settings.logLevel = level;
        this.config(`Niveau de log changé vers: ${LogLevel[level]}`);
    }
}