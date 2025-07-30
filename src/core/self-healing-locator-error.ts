export class SelfHealingLocatorError extends Error {
    constructor(
        message: string,
        public originalLocator: string,
        public suggestedLocator?: string
    ) {
        super(message);
        this.name = "SelfHealingLocatorError";
    }
}
