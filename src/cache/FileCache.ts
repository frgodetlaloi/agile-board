interface CachedData<T = unknown> {
    data: T;
    timestamp: number;
    fileModified: number;
}

export class FileCache {
    private static readonly CACHE_TTL = 300000; // 5 minutes
    private cache = new Map<string, CachedData>();
    private cleanupTimer?: number;

    constructor() {
        this.dispose(); // Nettoyer d'abord
        this.startCleanupTimer();
    }

    /**
     * Récupère une valeur du cache ou la génère
     */
    async get<T>(
        key: string, 
        fileModified: number,
        loader: () => Promise<T>
    ): Promise<T> {
        const cached = this.cache.get(key);

        if (cached && 
            !this.isExpired(cached) && 
            cached.fileModified >= fileModified) {
            console.log(`[FileCache] HIT pour la clé "${key}"`);
            return cached.data as T;
        }

        console.log(`[FileCache] MISS pour la clé "${key}", chargement...`);
        const data = await loader();
        this.set(key, data, fileModified);
        return data;
    }

    /**
     * Stocke une valeur dans le cache
     */
    private set<T>(key: string, data: T, fileModified: number): void {
        console.log(`[FileCache] SET clé "${key}"`);
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            fileModified
        });
    }

    /**
     * Vérifie si une entrée du cache est expirée
     */
    private isExpired(cached: CachedData): boolean {
        return Date.now() - cached.timestamp > FileCache.CACHE_TTL;
    }

    /**
     * Démarre le timer de nettoyage automatique
     */
    private startCleanupTimer(): void {
        this.cleanupTimer = window.setInterval(() => {
            this.cleanup();
        }, 60000); // Nettoyer toutes les minutes
    }

    /**
     * Nettoie les entrées expirées
     */
    private cleanup(): void {
        const now = Date.now();
        let removed = 0;
        for (const [key, cached] of this.cache) {
            if (this.isExpired(cached)) {
                this.cache.delete(key);
                removed++;
            }
        }
        if (removed > 0) {
            console.log(`[FileCache] CLEANUP : ${removed} entrées supprimées`);
        }
    }

    /**
     * Invalide le cache pour une clé spécifique
     */
    invalidate(key: string): void {
        console.log(`[FileCache] INVALIDATE clé "${key}"`);
        this.cache.delete(key);
    }

    /**
     * Vide complètement le cache
     */
    clear(): void {
        console.log(`[FileCache] CLEAR`);
        this.cache.clear();
    }

    /**
     * Dispose le cache et nettoie les ressources
     */
    dispose(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.clear();
    }

    /**
     * Statistiques du cache pour debugging
     */
    getStats(): { size: number; hitRate: number } {
        // Implementation basique - peut être étendue
        return {
            size: this.cache.size,
            hitRate: 0 // À implémenter si nécessaire
        };
    }
}