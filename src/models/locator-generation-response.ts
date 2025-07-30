export type LocatorGenerationResponse = {
    locator: string;
    strategy: "CSS" | "XPATH" | "TEXT" | "DATA_TESTID";
    confidence: number;
    reasoning?: string;
};
