/* eslint-disable @typescript-eslint/no-explicit-any */
export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}

export class Logger {
    private static instance: Logger;
    private logLevel: LogLevel;
    private enableLogging: boolean;

    private constructor(logLevel: LogLevel = LogLevel.INFO, enableLogging: boolean = true) {
        this.logLevel = logLevel;
        this.enableLogging = enableLogging;
    }

    public static getInstance(logLevel: LogLevel = LogLevel.INFO, enableLogging: boolean = true): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(logLevel, enableLogging);
        }
        return Logger.instance;
    }

    public setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    public setLogging(enabled: boolean): void {
        this.enableLogging = enabled;
    }

    private shouldLog(level: LogLevel): boolean {
        return this.enableLogging && level <= this.logLevel;
    }

    private formatMessage(level: string, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        let formattedMessage = `[${timestamp}] [${level}] [SELF-HEALING] ${message}`;

        if (data) {
            formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
        }

        return formattedMessage;
    }

    public error(message: string, data?: any): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(this.formatMessage("ERROR", message, data));
        }
    }

    public warn(message: string, data?: any): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.formatMessage("WARN", message, data));
        }
    }

    public info(message: string, data?: any): void {
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(this.formatMessage("INFO", message, data));
        }
    }

    public debug(message: string, data?: any): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(this.formatMessage("DEBUG", message, data));
        }
    }

    public logSmartLocatorGeneration(originalLocator: string, generatedLocator: string, strategy: string): void {
        this.info(`Smart locator generated`, {
            original: originalLocator,
            generated: generatedLocator,
            strategy: strategy
        });
    }

    public logCacheHit(originalLocator: string, cachedLocator: string): void {
        this.debug(`Cache hit for locator`, {
            original: originalLocator,
            cached: cachedLocator
        });
    }

    public logCacheMiss(originalLocator: string): void {
        this.debug(`Cache miss for locator: ${originalLocator}`);
    }

    public logApiCall(model: string, tokenCount?: number): void {
        this.info(`OpenAI API call made`, {
            model: model,
            tokenCount: tokenCount
        });
    }

    public logLocatorFailure(locator: string, error: string): void {
        this.warn(`Locator failed: ${locator}`, { error });
    }

    public logSelfHealingSuccess(originalLocator: string, healedLocator: string): void {
        this.info(`Self-healing successful`, {
            original: originalLocator,
            healed: healedLocator
        });
    }

    public logSelfHealingFailure(originalLocator: string, error: string): void {
        this.error(`Self-healing failed for locator: ${originalLocator}`, {
            error
        });
    }
}
