export class AgileBoardError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly context?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'AgileBoardError';
    }

    static layoutNotFound(layoutName: string): AgileBoardError {
        return new AgileBoardError(
            `Layout "${layoutName}" non trouvé`,
            'LAYOUT_NOT_FOUND',
            { layoutName }
        );
    }

    static fileReadError(filePath: string, originalError: Error): AgileBoardError {
        return new AgileBoardError(
            `Impossible de lire le fichier "${filePath}"`,
            'FILE_READ_ERROR',
            { filePath, originalError: originalError.message }
        );
    }

    static validationError(field: string, value: unknown): AgileBoardError {
        return new AgileBoardError(
            `Validation échouée pour le champ "${field}"`,
            'VALIDATION_ERROR',
            { field, value }
        );
    }
}