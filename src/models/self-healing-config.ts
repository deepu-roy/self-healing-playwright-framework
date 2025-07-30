export type SelfHealingConfig = {
    useSmartLocator: boolean;
    runWithSmartLocator: boolean;
    cachePath: string;
    openApiModel: string;
    openApiKey: string;
    cacheExpirationDays: number;
    maxRetries: number;
    timeout: number;
    enableLogging: boolean;
    logLevel: "error" | "warn" | "info" | "debug";
};
