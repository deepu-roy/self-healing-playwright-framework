import { SelfHealingConfig } from "../models/self-healing-config";

export const defaultConfig: SelfHealingConfig = {
    useSmartLocator: process.env.USE_SMART_LOCATOR === "true",
    runWithSmartLocator: process.env.RUN_WITH_SMART_LOCATOR === "true",
    cachePath: process.env.CACHE_PATH || "cache/locator_cache.json",
    openApiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    openApiKey: process.env.OPENAI_API_KEY || "",
    cacheExpirationDays: 2,
    maxRetries: 3,
    timeout: 30000,
    enableLogging: true,
    logLevel: "info"
};

export class ConfigManager {
    private static instance: ConfigManager;
    private config: SelfHealingConfig;

    private constructor() {
        this.config = { ...defaultConfig };
        this.loadConfig();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private loadConfig(): void {
        try {
            // Try to load from environment variables
            if (process.env.USE_SMART_LOCATOR) {
                this.config.useSmartLocator = process.env.USE_SMART_LOCATOR === "true";
            }
            if (process.env.RUN_WITH_SMART_LOCATOR) {
                this.config.runWithSmartLocator = process.env.RUN_WITH_SMART_LOCATOR === "true";
            }
            if (process.env.OPENAI_API_KEY) {
                this.config.openApiKey = process.env.OPENAI_API_KEY;
            }
            if (process.env.OPENAI_MODEL) {
                this.config.openApiModel = process.env.OPENAI_MODEL;
            }
            if (process.env.CACHE_PATH) {
                this.config.cachePath = process.env.CACHE_PATH;
            }
        } catch (error) {
            console.warn("Failed to load configuration from environment:", error);
        }
    }

    public getConfig(): SelfHealingConfig {
        return { ...this.config };
    }

    public updateConfig(updates: Partial<SelfHealingConfig>): void {
        this.config = { ...this.config, ...updates };
    }

    public isSmartLocatorEnabled(): boolean {
        return this.config.useSmartLocator && !!this.config.openApiKey;
    }

    public shouldRunWithSmartLocator(): boolean {
        return this.config.runWithSmartLocator && this.isSmartLocatorEnabled();
    }
}
