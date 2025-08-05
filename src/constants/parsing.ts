/**
 * Constantes centralisées pour le parsing markdown
 * Utilisées par tous les services pour assurer la cohérence
 */
export class ParsingConstants {
    // ===============================================================
    // CONSTANTES DE PARSING
    // ===============================================================
    
    /** Niveau de titre pour les sections (2 = ##) */
    static readonly SECTION_HEADER_LEVEL = 2;
    
    /** Regex pour détecter les titres de sections (pré-compilée pour performance) */
    static readonly SECTION_HEADER_REGEX = new RegExp(`^#{${ParsingConstants.SECTION_HEADER_LEVEL}} ([^\n#].*?)\\s*$`);
    
    /** Regex pour détecter le frontmatter YAML */
    static readonly FRONTMATTER_DELIMITER = /^---\s*$/;
    
    /** Regex pour nettoyer les noms de fichiers */
    static readonly INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;
    
    /** Extensions de fichiers markdown supportées */
    static readonly MARKDOWN_EXTENSIONS = ['.md', '.markdown'];
    
    // ===============================================================
    // MÉTHODES UTILITAIRES
    // ===============================================================
    
    /**
     * Vérifie si une ligne est un titre de section
     * @param line - Ligne à vérifier
     * @returns true si c'est un titre de section
     */
    static isSectionHeader(line: string): boolean {
        return ParsingConstants.SECTION_HEADER_REGEX.test(line);
    }
    
    /**
     * Extrait le nom d'une section depuis une ligne de titre
     * @param line - Ligne contenant le titre
     * @returns Nom de la section ou null si pas trouvé
     */
    static extractSectionName(line: string): string | null {
        const match = line.match(ParsingConstants.SECTION_HEADER_REGEX);
        return match ? match[1].trim() : null;
    }
    
    /**
     * Génère un titre de section formaté
     * @param sectionName - Nom de la section
     * @returns Titre formaté (ex: "## Ma Section")
     */
    static formatSectionHeader(sectionName: string): string {
        return `${'#'.repeat(ParsingConstants.SECTION_HEADER_LEVEL)} ${sectionName}`;
    }
    
    /**
     * Génère dynamiquement la regex pour le titre principal selon le niveau
     */
    static getMainTitleRegex(): RegExp {
        return new RegExp(`^#{${ParsingConstants.SECTION_HEADER_LEVEL}} ([^\\n#].*?)$`);
    }

    /**
     * Vérifie si une ligne est un titre principal (H2)
     * @param line - Ligne à vérifier
     * @returns true si c'est un titre principal
     */
    //static isMainTitle(line: string): boolean {
    //    return ParsingConstants.getMainTitleRegex().test(line);
    //}
    
    /**
     * Nettoie un nom de fichier des caractères interdits
     * @param fileName - Nom à nettoyer
     * @returns Nom de fichier sécurisé
     */
    static sanitizeFileName(fileName: string): string {
        return fileName
            .replace(ParsingConstants.INVALID_FILENAME_CHARS, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    /**
     * Vérifie si un fichier est un fichier markdown
     * @param filePath - Chemin du fichier
     * @returns true si c'est un fichier markdown
     */
    static isMarkdownFile(filePath: string): boolean {
        return ParsingConstants.MARKDOWN_EXTENSIONS.some(ext => 
            filePath.toLowerCase().endsWith(ext)
        );
    }
}