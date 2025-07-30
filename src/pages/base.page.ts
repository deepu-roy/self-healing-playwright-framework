import { SelfHealingOptions } from "@/models/self-healing-options";
import { Locator, Page } from "@playwright/test";
import { ConfigManager } from "../config/config-manager";
import { PlaywrightSelfHealing } from "../extensions/playwright-extensions";
import { Logger } from "../utils/logger";

export abstract class BasePage {
    protected page: Page;
    protected url: string;
    protected config = ConfigManager.getInstance();
    protected logger = Logger.getInstance();

    constructor(page: Page, url: string = "") {
        this.page = page;
        this.url = url;
    }

    async open(): Promise<void> {
        await this.page.goto(this.url);
    }

    async waitForPageLoad(): Promise<void> {
        await this.page.waitForLoadState("networkidle");
    }

    async getTitle(): Promise<string> {
        return await this.page.title();
    }

    async waitForElement(selector: string, options: SelfHealingOptions = {}): Promise<void> {
        await PlaywrightSelfHealing.waitFor(this.page, selector, options);
    }

    protected async getSelfHealingLocator(originalSelector: string, options: SelfHealingOptions = {}): Promise<Locator> {
        return await PlaywrightSelfHealing.getLocatorWithWait(this.page, originalSelector, options);
    }

    async clickWithSelfHealing(selector: string, options: SelfHealingOptions = {}): Promise<void> {
        await PlaywrightSelfHealing.click(this.page, selector, options);
    }

    async typeWithSelfHealing(selector: string, text: string, options: SelfHealingOptions = {}): Promise<void> {
        await PlaywrightSelfHealing.fill(this.page, selector, text, options);
    }

    async elementExists(selector: string, options: SelfHealingOptions = {}): Promise<boolean> {
        return await PlaywrightSelfHealing.exists(this.page, selector, options);
    }

    async getTextContent(selector: string, options: SelfHealingOptions = {}): Promise<string | null> {
        return await PlaywrightSelfHealing.textContent(this.page, selector, options);
    }

    async getInnerText(selector: string, options: SelfHealingOptions = {}): Promise<string> {
        return await PlaywrightSelfHealing.innerText(this.page, selector, options);
    }

    async takeScreenshot(name: string): Promise<void> {
        await this.page.screenshot({
            path: `screenshots/${name}.png`,
            fullPage: true
        });
    }

    getCacheStatistics() {
        return PlaywrightSelfHealing.getCacheStatistics();
    }

    clearCache(): void {
        PlaywrightSelfHealing.clearCache();
    }
}
