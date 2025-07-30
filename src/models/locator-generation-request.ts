import { Page } from "@playwright/test";

export type LocatorGenerationRequest = {
    originalLocator: string;
    page: Page;
    errorMessage?: string;
    elementDescription?: string;
};
