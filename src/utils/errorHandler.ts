import { Notice } from 'obsidian';
import { LoggerService } from '../services/LoggerService';

/**
 * Types d'erreurs spécifiques au plugin
 */
export enum ErrorType {
    VALIDATION = 'validation',
    FILE_ACCESS = 'file_access',
    LAYOUT = 'layout',
    PARSING = 'parsing',
    NETWORK = 'network',
    UNKNOWN = 'unknown'
}

/**
 * Erreur enrichie avec contexte
 */
export class EnhancedError extends Error {
    constructor(
        message: string,
        public readonly type: ErrorType,
        public readonly context: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'EnhancedError';
        
        // Préserver la stack trace de l'erreur originale si disponible
        if (originalError?.stack) {
            this.stack = originalError.stack;
        }
    }
}

/**
 * Gestionnaire d'erreurs centralisé pour le plugin
 */
export class ErrorHandler {
    
    // ===============================================================
    // GESTION PRINCIPALE DES ERREURS
    // ===============================================================
    
    /**
     * Gère une erreur avec contexte, logging et notification
     * @param error - Erreur à gérer
     * @param context - Contexte où l'erreur s'est produite
     * @param logger - Service de logging (optionnel)
     * @param showNotice - Afficher une notification à l'utilisateur
     * @returns Erreur enrichie
     */
    static handle(
        error: Error, 
        context: string, 
        logger?: LoggerService,
        showNotice: boolean = true
    ): EnhancedError {
        
        const errorType = ErrorHandler.classifyError(error);
        const enhancedError = new EnhancedError(
            error.message,
            errorType,
            context,
            error
        );
        
        // Logger l'erreur
        if (logger) {
            logger.error(`Erreur dans ${context}`, {
                message: error.message,
                type: errorType,
                stack: error.stack,
                context
            });
        } else {
            console.error(`❌ [Agile-Board] Erreur dans ${context}:`, error);
        }
        
        // Notification utilisateur
        if (showNotice) {
            const userMessage = ErrorHandler.getUserFriendlyMessage(enhancedError);
            new Notice(`❌ ${userMessage}`, 5000);
        }
        
        return enhancedError;
    }
    
    /**
     * Classifie le type d'erreur
     * @param error - Erreur à classifier
     * @returns Type d'erreur identifié
     */
    private static classifyError(error: Error): ErrorType {
        const message = error.message.toLowerCase();
        
        if (message.includes('requis') || message.includes('valide') || message.includes('invalide')) {
            return ErrorType.VALIDATION;
        }
        
        if (message.includes('fichier') || message.includes('accès') || message.includes('lecture')) {
            return ErrorType.FILE_ACCESS;
        }
        
        if (message.includes('layout') || message.includes('bloc') || message.includes('grille')) {
            return ErrorType.LAYOUT;
        }
        
        if (message.includes('parsing') || message.includes('section') || message.includes('markdown')) {
            return ErrorType.PARSING;
        }
        
        if (message.includes('réseau') || message.includes('connexion') || message.includes('timeout')) {
            return ErrorType.NETWORK;
        }
        
        return ErrorType.UNKNOWN;
    }
    
    /**
     * Génère un message convivial pour l'utilisateur
     * @param error - Erreur enrichie
     * @returns Message simplifié pour l'utilisateur
     */
    private static getUserFriendlyMessage(error: EnhancedError): string {
        switch (error.type) {
            case ErrorType.VALIDATION:
                return `Paramètre incorrect: ${error.message}`;
            
            case ErrorType.FILE_ACCESS:
                return `Problème d'accès au fichier: ${error.message}`;
            
            case ErrorType.LAYOUT:
                return `Problème de configuration du board: ${error.message}`;
            
            case ErrorType.PARSING:
                return `Erreur de lecture du contenu: ${error.message}`;
            
            case ErrorType.NETWORK:
                return `Problème de connexion: ${error.message}`;
            
            default:
                return `Erreur inattendue: ${error.message}`;
        }
    }
    
    // ===============================================================
    // WRAPPERS POUR OPÉRATIONS AVEC GESTION D'ERREURS
    // ===============================================================
    
    /**
     * Wrapper asynchrone avec gestion d'erreurs automatique
     * @param operation - Opération à exécuter
     * @param context - Contexte de l'opération
     * @param fallback - Valeur de fallback en cas d'erreur
     * @param logger - Service de logging
     * @returns Résultat de l'opération ou fallback
     */
    static async withErrorHandling<T>(
        operation: () => Promise<T>,
        context: string,
        fallback?: T,
        logger?: LoggerService
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            const handledError = ErrorHandler.handle(error, context, logger, false);
            
            if (fallback !== undefined) {
                logger?.warn(`Utilisation de la valeur de fallback pour ${context}`, { 
                    fallback,
                    originalError: error.message 
                });
                return fallback;
            }
            
            throw handledError;
        }
    }
    
    /**
     * Wrapper synchrone avec gestion d'erreurs automatique
     * @param operation - Opération à exécuter
     * @param context - Contexte de l'opération
     * @param fallback - Valeur de fallback en cas d'erreur
     * @param logger - Service de logging
     * @returns Résultat de l'opération ou fallback
     */
    static withErrorHandlingSync<T>(
        operation: () => T,
        context: string,
        fallback?: T,
        logger?: LoggerService
    ): T {
        try {
            return operation();
        } catch (error) {
            const handledError = ErrorHandler.handle(error, context, logger, false);
            
            if (fallback !== undefined) {
                logger?.warn(`Utilisation de la valeur de fallback pour ${context}`, { 
                    fallback,
                    originalError: error.message 
                });
                return fallback;
            }
            
            throw handledError;
        }
    }
    
    /**
     * Wrapper avec retry automatique
     * @param operation - Opération à exécuter
     * @param context - Contexte de l'opération
     * @param maxRetries - Nombre max de tentatives
     * @param delay - Délai entre tentatives (ms)
     * @param logger - Service de logging
     * @returns Résultat de l'opération
     */
    static async withRetry<T>(
        operation: () => Promise<T>,
        context: string,
        maxRetries: number = 3,
        delay: number = 1000,
        logger?: LoggerService
    ): Promise<T> {
        let lastError: Error;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt === maxRetries) {
                    break; // Dernière tentative échouée
                }
                
                logger?.warn(`Tentative ${attempt}/${maxRetries} échouée pour ${context}`, {
                    error: error.message,
                    nextRetryIn: delay
                });
                
                // Attendre avant la prochaine tentative
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // Toutes les tentatives ont échoué
        throw ErrorHandler.handle(
            lastError!,
            `${context} (après ${maxRetries} tentatives)`,
            logger
        );
    }
    
    // ===============================================================
    // UTILITAIRES DE VALIDATION AVEC GESTION D'ERREURS
    // ===============================================================
    
    /**
     * Valide avec gestion d'erreurs automatique
     * @param validator - Fonction de validation
     * @param value - Valeur à valider
     * @param context - Contexte de la validation
     * @param logger - Service de logging
     * @returns true si valide
     */
    static validate<T>(
        validator: (value: T) => boolean,
        value: T,
        context: string,
        logger?: LoggerService
    ): boolean {
        return ErrorHandler.withErrorHandlingSync(
            () => validator(value),
            `validation-${context}`,
            false,
            logger
        );
    }
}