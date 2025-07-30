import * as fs from "fs";
import * as path from "path";

export interface CacheEntry {
    originalLocator: string;
    generatedLocator: string;
    strategy: "CSS" | "XPATH" | "TEXT" | "DATA_TESTID";
    timestamp: string;
    successCount: number;
    failureCount: number;
}

export interface CacheStatistics {
    totalEntries: number;
    oldestEntry: string | null;
    newestEntry: string | null;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
}

export class LocalCache {
    private static instance: LocalCache;
    private cache: Map<string, CacheEntry> = new Map();
    private cachePath: string;
    private hits: number = 0;
    private misses: number = 0;

    private constructor(cachePath: string) {
        this.cachePath = cachePath;
        this.ensureCacheDirectory();
        this.loadCache();
    }

    public static getInstance(cachePath: string = "cache/locator_cache.json"): LocalCache {
        if (!LocalCache.instance) {
            LocalCache.instance = new LocalCache(cachePath);
        } else if (LocalCache.instance.cachePath !== cachePath) {
            // If cache path changed, create new instance
            LocalCache.instance = new LocalCache(cachePath);
        }
        return LocalCache.instance;
    }

    private ensureCacheDirectory(): void {
        const dir = path.dirname(this.cachePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private loadCache(): void {
        try {
            if (fs.existsSync(this.cachePath)) {
                const data = fs.readFileSync(this.cachePath, "utf8");
                const cacheData = JSON.parse(data);

                // Convert to Map and validate entries
                for (const [key, entry] of Object.entries(cacheData)) {
                    if (this.isValidCacheEntry(entry as CacheEntry)) {
                        this.cache.set(key, entry as CacheEntry);
                    }
                }

                this.cleanupExpiredEntries();
            }
        } catch (error) {
            console.warn("Failed to load cache:", error);
            this.cache.clear();
        }
    }

    private isValidCacheEntry(entry: any): entry is CacheEntry {
        return (
            entry &&
            typeof entry.originalLocator === "string" &&
            typeof entry.generatedLocator === "string" &&
            typeof entry.strategy === "string" &&
            typeof entry.timestamp === "string" &&
            typeof entry.successCount === "number" &&
            typeof entry.failureCount === "number"
        );
    }

    private cleanupExpiredEntries(maxAgeInDays: number = 2): void {
        const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
        const now = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            const entryAge = now - new Date(entry.timestamp).getTime();
            if (entryAge > maxAge) {
                this.cache.delete(key);
            }
        }
    }

    public saveCache(): void {
        try {
            const cacheObject = Object.fromEntries(this.cache);
            fs.writeFileSync(this.cachePath, JSON.stringify(cacheObject, null, 2));
        } catch (error) {
            console.warn("Failed to save cache:", error);
        }
    }

    public get(originalLocator: string): CacheEntry | null {
        const entry = this.cache.get(originalLocator);
        if (entry) {
            this.hits++;
            return entry;
        } else {
            this.misses++;
            return null;
        }
    }

    public set(originalLocator: string, entry: Omit<CacheEntry, "timestamp" | "successCount" | "failureCount">): void {
        const cacheEntry: CacheEntry = {
            ...entry,
            timestamp: new Date().toISOString(),
            successCount: 0,
            failureCount: 0
        };

        this.cache.set(originalLocator, cacheEntry);
        this.saveCache();
    }

    public updateSuccess(originalLocator: string): void {
        const entry = this.cache.get(originalLocator);
        if (entry) {
            entry.successCount++;
            this.saveCache();
        }
    }

    public updateFailure(originalLocator: string): void {
        const entry = this.cache.get(originalLocator);
        if (entry) {
            entry.failureCount++;
            this.saveCache();
        }
    }

    public delete(originalLocator: string): boolean {
        const deleted = this.cache.delete(originalLocator);
        if (deleted) {
            this.saveCache();
        }
        return deleted;
    }

    public clear(): void {
        this.cache.clear();
        this.saveCache();
    }

    public getStatistics(): CacheStatistics {
        const entries = Array.from(this.cache.values());
        const totalEntries = entries.length;

        let oldestEntry: string | null = null;
        let newestEntry: string | null = null;

        if (totalEntries > 0) {
            const sortedByDate = entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            oldestEntry = sortedByDate[0].timestamp;
            newestEntry = sortedByDate[sortedByDate.length - 1].timestamp;
        }

        const totalRequests = this.hits + this.misses;
        const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

        return {
            totalEntries,
            oldestEntry,
            newestEntry,
            hitRate: Math.round(hitRate * 100) / 100,
            totalHits: this.hits,
            totalMisses: this.misses
        };
    }

    public getAllEntries(): Map<string, CacheEntry> {
        return new Map(this.cache);
    }
}
