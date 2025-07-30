import { TFile } from 'obsidian';
import { BoardLayout } from '../types';
import { ParsingConstants } from '../constants/parsing';

/**
 * Utilitaires de validation centralisée
 * Toutes les validations du plugin passent par cette classe
 */
export class ValidationUtils {
    
    // ===============================================================
    // VALIDATION DES FICHIERS
    // ===============================================================
    
    /**
     * Valide qu'un fichier est un fichier markdown valide
     * @param file - Fichier à valider
     * @returns true si valide, throw Error si invalide
     */
    static validateMarkdownFile(file: any): file is TFile {
        if (!file) {
            throw new Error('Fichier requis');
        }
        
        if (!(file instanceof TFile)) {
            throw new Error('Doit être une instance de TFile');
        }
        
        if (!file.path || typeof file.path !== 'string') {
            throw new Error('Fichier invalide: chemin manquant ou invalide');
        }
        
        if (!ParsingConstants.isMarkdownFile(file.path)) {
            throw new Error(`Fichier doit être un fichier markdown (${ParsingConstants.MARKDOWN_EXTENSIONS.join(', ')})`);
        }
        
        return true;
    }
    
    /**
     * Valide qu'un fichier existe et est accessible
     * @param file - Fichier à vérifier
     * @param app - Instance Obsidian pour vérification
     * @returns true si accessible, throw Error si non accessible
     */
    static async validateFileAccess(file: TFile, app: any): Promise<boolean> {
        ValidationUtils.validateMarkdownFile(file);
        
        try {
            // Tentative de lecture pour vérifier l'accès
            await app.vault.read(file);
            return true;
        } catch (error) {
            throw new Error(`Impossible d'accéder au fichier ${file.basename}: ${error.message}`);
        }
    }
    
    // ===============================================================
    // VALIDATION DES LAYOUTS
    // ===============================================================
    
    /**
     * Valide qu'un nom de layout est valide
     * @param layoutName - Nom à valider
     * @returns true si valide, throw Error si invalide
     */
    static validateLayoutName(layoutName: any): layoutName is string {
        if (!layoutName) {
            throw new Error('Nom de layout requis');
        }
        
        if (typeof layoutName !== 'string') {
            throw new Error('Nom de layout doit être une chaîne de caractères');
        }
        
        if (layoutName.trim().length === 0) {
            throw new Error('Nom de layout ne peut pas être vide');
        }
        
        // Vérifier le format (doit commencer par layout_)
        if (!layoutName.startsWith('layout_')) {
            throw new Error('Nom de layout doit commencer par "layout_"');
        }
        
        // Vérifier les caractères autorisés
        if (!/^layout_[a-z0-9_]+$/i.test(layoutName)) {
            throw new Error('Nom de layout ne peut contenir que des lettres, chiffres et underscores');
        }
        
        return true;
    }
    
    /**
     * Valide un layout complet (structure et cohérence)
     * @param layout - Layout à valider
     * @returns true si valide, throw Error si invalide
     */
    static validateBoardLayout(layout: any): layout is BoardLayout[] {
        if (!Array.isArray(layout)) {
            throw new Error('Layout doit être un tableau de blocs');
        }
        
        if (layout.length === 0) {
            throw new Error('Layout ne peut pas être vide');
        }
        
        const usedPositions = new Set<string>();
        
        for (let i = 0; i < layout.length; i++) {
            const block = layout[i];
            
            if (!block || typeof block !== 'object') {
                throw new Error(`Bloc ${i} invalide: doit être un objet`);
            }
            
            // Validation du titre
            if (typeof block.title !== 'string' || block.title.trim().length === 0) {
                throw new Error(`Bloc ${i} invalide: titre requis et non vide`);
            }
            
            // Validation des propriétés numériques
            const requiredNumbers = ['x', 'y', 'w', 'h'];
            for (const prop of requiredNumbers) {
                if (typeof block[prop] !== 'number' || !Number.isInteger(block[prop]) || block[prop] < 0) {
                    throw new Error(`Bloc ${i} invalide: ${prop} doit être un nombre entier positif`);
                }
            }
            
            // Validation des limites de grille
            if (block.x + block.w > 24) {
                throw new Error(`Bloc ${i} "${block.title}" dépasse la limite droite (x:${block.x} + w:${block.w} > 24)`);
            }
            
            if (block.y + block.h > 100) {
                throw new Error(`Bloc ${i} "${block.title}" dépasse la limite basse (y:${block.y} + h:${block.h} > 100)`);
            }
            
            // Validation des chevauchements
            for (let x = block.x; x < block.x + block.w; x++) {
                for (let y = block.y; y < block.y + block.h; y++) {
                    const position = `${x},${y}`;
                    if (usedPositions.has(position)) {
                        throw new Error(`Bloc ${i} "${block.title}" chevauche avec un autre bloc à la position (${x}, ${y})`);
                    }
                    usedPositions.add(position);
                }
            }
        }
        
        return true;
    }
    
    // ===============================================================
    // VALIDATION DES SECTIONS
    // ===============================================================
    
    /**
     * Valide qu'un nom de section est valide
     * @param sectionName - Nom à valider
     * @returns true si valide, throw Error si invalide
     */
    static validateSectionName(sectionName: any): sectionName is string {
        if (!sectionName) {
            throw new Error('Nom de section requis');
        }
        
        if (typeof sectionName !== 'string') {
            throw new Error('Nom de section doit être une chaîne de caractères');
        }
        
        if (sectionName.trim().length === 0) {
            throw new Error('Nom de section ne peut pas être vide');
        }
        
        // Vérifier les caractères interdits
        if (sectionName.includes('#')) {
            throw new Error('Nom de section ne peut pas contenir le caractère #');
        }
        
        if (sectionName.includes('\n') || sectionName.includes('\r')) {
            throw new Error('Nom de section ne peut pas contenir de retour à la ligne');
        }
        
        // Vérifier la longueur raisonnable
        if (sectionName.length > 100) {
            throw new Error('Nom de section trop long (maximum 100 caractères)');
        }
        
        return true;
    }
    
    /**
     * Valide le contenu d'une section
     * @param content - Contenu à valider
     * @returns true si valide, throw Error si invalide
     */
    static validateSectionContent(content: any): content is string {
        if (content === null || content === undefined) {
            return true; // Contenu vide autorisé
        }
        
        if (typeof content !== 'string') {
            throw new Error('Contenu de section doit être une chaîne de caractères');
        }
        
        // Vérifier la taille raisonnable (10MB max)
        if (content.length > 10 * 1024 * 1024) {
            throw new Error('Contenu de section trop volumineux (maximum 10MB)');
        }
        
        return true;
    }
    
    // ===============================================================
    // VALIDATION DES OPTIONS
    // ===============================================================
    
    /**
     * Valide les options génériques d'un objet
     * @param options - Options à valider
     * @param requiredFields - Champs requis
     * @param optionalFields - Champs optionnels avec leurs types
     * @returns true si valide, throw Error si invalide
     */
    static validateOptions(
        options: any,
        requiredFields: string[] = [],
        optionalFields: Record<string, string> = {}
    ): boolean {
        if (!options || typeof options !== 'object') {
            throw new Error('Options doivent être un objet');
        }
        
        // Vérifier les champs requis
        for (const field of requiredFields) {
            if (!(field in options) || options[field] === undefined || options[field] === null) {
                throw new Error(`Champ requis manquant: ${field}`);
            }
        }
        
        // Vérifier les types des champs optionnels
        for (const [field, expectedType] of Object.entries(optionalFields)) {
            if (field in options && options[field] !== undefined) {
                const actualType = typeof options[field];
                if (actualType !== expectedType) {
                    throw new Error(`Type incorrect pour ${field}: attendu ${expectedType}, reçu ${actualType}`);
                }
            }
        }
        
        return true;
    }
}