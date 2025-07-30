import { LocatorGenerationRequest } from "@/models/locator-generation-request";
import { Locator, Page } from "@playwright/test";
import { ConfigManager } from "../config/config-manager";
import { SelfHealingLocatorError } from "../core/self-healing-locator-error";
import { SmartLocatorGenerator } from "../core/smart-locator-generator";
import { SelfHealingOptions } from "../models/self-healing-options";
import { Logger } from "../utils/logger";

export class PlaywrightSelfHealing {
    private static generator = SmartLocatorGenerator.getInstance();
    private static config = ConfigManager.getInstance();
    private static logger = Logger.getInstance();

    private static async validateOriginalLocator(page: Page, originalLocator: string, timeout: number): Promise<boolean> {
        try {
            await page.locator(originalLocator).first().waitFor({ state: "attached", timeout });
            return true;
        } catch (error) {
            this.logger.logLocatorFailure(originalLocator, error instanceof Error ? error.message : "Unknown error");
            return false;
        }
    }

    /**
     * Resolves a smart locator for an element using self-healing capabilities.
     *
     * This method implements a two-phase approach:
     * 1. First attempts to locate the element using the original locator
     * 2. If the original locator fails, generates and validates a smart locator using AI-powered analysis
     *
     * The method respects the configuration settings for smart locator functionality and maintains
     * cache statistics for performance monitoring and optimization.
     *
     * @param page - The Playwright page instance to search within
     * @param originalLocator - The original CSS selector or locator string that failed
     * @param options - Configuration options for self-healing behavior
     * @param options.timeout - Maximum time in milliseconds to wait for element visibility (default: 5000)
     * @param options.elementDescription - Optional human-readable description to assist smart locator generation
     *
     * @returns Promise that resolves to a valid locator string (either original or generated smart locator)
     *
     * @throws {SelfHealingLocatorError} When smart locator is disabled and original locator fails
     * @throws {SelfHealingLocatorError} When smart locator generation or validation fails
     *
     * @example
     * ```typescript
     * // Basic usage with original locator
     * const locator = await PlaywrightSelfHealing.resolveSmartLocator(page, '#submit-btn');
     *
     * // With custom options and element description
     * const locator = await PlaywrightSelfHealing.resolveSmartLocator(
     *   page,
     *   '.old-class-name',
     *   {
     *     timeout: 10000,
     *     elementDescription: 'Submit button on checkout form'
     *   }
     * );
     * ```
     */
    public static async resolveSmartLocator(page: Page, originalLocator: string, options: SelfHealingOptions = {}): Promise<string> {
        const { timeout = 5000, elementDescription } = options;

        // Check if smart locator is enabled
        if (!this.config.isSmartLocatorEnabled()) {
            throw new SelfHealingLocatorError(`Locator failed and smart locator is disabled: ${originalLocator}`, originalLocator);
        }

        // Generate smart locator
        const request: LocatorGenerationRequest = {
            originalLocator,
            page,
            errorMessage: "Element not found with original locator",
            elementDescription
        };

        const smartLocator = await this.generator.generateSmartLocator(request);

        if (!smartLocator) {
            const errorMessage = `Smart locator generation failed for: ${originalLocator}`;
            this.logger.logSelfHealingFailure(originalLocator, errorMessage);
            throw new SelfHealingLocatorError(errorMessage, originalLocator);
        }

        // Validate smart locator
        const isValid = await this.generator.validateLocator(page, smartLocator, timeout);

        if (isValid) {
            this.generator.updateCacheSuccess(originalLocator);
            this.logger.logSelfHealingSuccess(originalLocator, smartLocator);
            return smartLocator;
        }

        // Smart locator validation failed
        this.generator.updateCacheFailure(originalLocator);
        const errorMessage = `Smart locator validation failed for: ${originalLocator}`;
        this.logger.logSelfHealingFailure(originalLocator, errorMessage);
        throw new SelfHealingLocatorError(errorMessage, originalLocator, smartLocator);
    }

    /**
     * Gets a locator with self-healing capabilities and waits for it to be visible.
     *
     * This method first attempts to use the original locator. If it fails, it falls back
     * to smart locator generation. The behavior depends on the configuration mode:
     * - In healing mode: Throws errors when self-healing fails
     * - In discovery mode: Provides suggestions for updated locators
     *
     * @param page - The Playwright page instance to search within
     * @param originalLocator - The original CSS selector or locator string
     * @param options - Configuration options for self-healing behavior
     * @param options.timeout - Maximum time in milliseconds to wait for element visibility (default: 5000)
     * @param options.elementDescription - Optional description to assist smart locator generation
     *
     * @returns Promise that resolves to a Playwright Locator instance
     *
     * @throws {SelfHealingLocatorError} When self-healing fails in healing mode
     * @throws {Error} When providing locator suggestions in discovery mode
     *
     * @example
     * ```typescript
     * const locator = await PlaywrightSelfHealing.getLocatorWithWait(page, '#submit-button');
     * await locator.click();
     * ```
     */
    public static async getLocatorWithWait(page: Page, originalLocator: string, options: SelfHealingOptions = {}): Promise<Locator> {
        const { timeout = 5000 } = options;

        try {
            const locator = page.locator(originalLocator);
            await locator.first().waitFor({ state: "attached", timeout });
            return locator;
        } catch {
            // Continue to smart locator generation
        }

        const smartLocator = await this.resolveSmartLocator(page, originalLocator, options);
        if (this.config.shouldRunWithSmartLocator()) {
            return page.locator(smartLocator);
        } else {
            const suggestionMessage = `
Locator has been changed from:
    Old: ${originalLocator}
    New: ${smartLocator}
Please review and update the locator or create a bug`;

            this.logger.warn(suggestionMessage);
            throw new Error(suggestionMessage);
        }
    }

    /**
     * Gets an element using smart locator resolution with wait functionality.
     *
     * This is an alias method for `getLocatorWithWait` that provides backward compatibility
     * and semantic clarity when the intent is to get an element reference.
     *
     * @param page - The Playwright page instance to search within
     * @param originalLocator - The original CSS selector or locator string
     * @param options - Configuration options for self-healing behavior
     *
     * @returns Promise that resolves to a Playwright Locator instance
     *
     * @throws {SelfHealingLocatorError} When self-healing fails
     *
     * @example
     * ```typescript
     * const element = await PlaywrightSelfHealing.getElementWithWait(page, '.form-input');
     * const value = await element.inputValue();
     * ```
     */
    public static async getElementWithWait(page: Page, originalLocator: string, options: SelfHealingOptions = {}): Promise<Locator> {
        return await this.getLocatorWithWait(page, originalLocator, options);
    }

    /**
     * Performs a click action on an element with self-healing capability.
     *
     * This method automatically resolves the element using self-healing logic and then
     * performs a click action. It handles both original and smart locator scenarios.
     *
     * @param page - The Playwright page instance containing the element
     * @param originalLocator - The original CSS selector or locator string
     * @param options - Configuration options for self-healing behavior
     * @param options.timeout - Maximum time in milliseconds to wait for element (default: 5000)
     * @param options.elementDescription - Optional description for better error messages
     *
     * @returns Promise that resolves when the click action is completed
     *
     * @throws {SelfHealingLocatorError} When element cannot be found or clicked
     *
     * @example
     * ```typescript
     * // Basic click
     * await PlaywrightSelfHealing.click(page, '#submit-btn');
     *
     * // Click with custom timeout and description
     * await PlaywrightSelfHealing.click(page, '.checkout-button', {
     *   timeout: 10000,
     *   elementDescription: 'Checkout button on payment page'
     * });
     * ```
     */
    public static async click(page: Page, originalLocator: string, options: SelfHealingOptions = {}): Promise<void> {
        const locator = await this.getLocatorWithWait(page, originalLocator, options);
        await locator.click();
    }

    /**
     * Fills text into an input element with self-healing capability.
     *
     * This method first clears the existing content of the input field and then
     * fills it with the provided text. It uses self-healing to locate the element
     * if the original locator fails.
     *
     * @param page - The Playwright page instance containing the input element
     * @param originalLocator - The original CSS selector or locator string for the input
     * @param text - The text content to fill into the input field
     * @param options - Configuration options for self-healing behavior
     * @param options.timeout - Maximum time in milliseconds to wait for element (default: 5000)
     * @param options.elementDescription - Optional description for better error messages
     *
     * @returns Promise that resolves when the fill action is completed
     *
     * @throws {SelfHealingLocatorError} When input element cannot be found
     *
     * @example
     * ```typescript
     * // Fill username field
     * await PlaywrightSelfHealing.fill(page, '#username', 'john.doe@example.com');
     *
     * // Fill with custom options
     * await PlaywrightSelfHealing.fill(page, '[data-testid="password"]', 'secretPassword', {
     *   timeout: 8000,
     *   elementDescription: 'Password input on login form'
     * });
     * ```
     */
    public static async fill(page: Page, originalLocator: string, text: string, options: SelfHealingOptions = {}): Promise<void> {
        const locator = await this.getLocatorWithWait(page, originalLocator, options);
        await locator.clear();
        await locator.fill(text);
    }

    /**
     * Checks if an element exists on the page with self-healing capability.
     *
     * This method attempts to locate an element and returns true if found, false otherwise.
     * It uses self-healing logic to try alternative locators if the original fails.
     * Unlike other methods, this one doesn't throw errors for missing elements.
     *
     * @param page - The Playwright page instance to search within
     * @param originalLocator - The original CSS selector or locator string
     * @param options - Configuration options for self-healing behavior
     * @param options.timeout - Maximum time in milliseconds to wait for element (default: 5000)
     * @param options.elementDescription - Optional description for better logging
     *
     * @returns Promise that resolves to true if element exists, false otherwise
     *
     * @example
     * ```typescript
     * // Check if error message exists
     * const hasError = await PlaywrightSelfHealing.exists(page, '.error-message');
     * if (hasError) {
     *   console.log('Error message is displayed');
     * }
     *
     * // Check with custom timeout
     * const hasModal = await PlaywrightSelfHealing.exists(page, '.modal-dialog', {
     *   timeout: 3000,
     *   elementDescription: 'Confirmation modal'
     * });
     * ```
     */
    public static async exists(page: Page, originalLocator: string, options: SelfHealingOptions = {}): Promise<boolean> {
        const { timeout = 5000 } = options;

        try {
            await this.getLocatorWithWait(page, originalLocator, {
                ...options,
                timeout
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Waits for an element to reach a specific state with self-healing capability.
     *
     * This method uses self-healing logic to locate an element and then waits for it to reach
     * the specified state. It automatically falls back to smart locator generation if the
     * original locator fails to find the element.
     *
     * @param page - The Playwright page instance containing the element
     * @param originalLocator - The original CSS selector or locator string
     * @param options - Configuration options for self-healing behavior and wait conditions
     * @param options.state - The state to wait for: "visible", "hidden", "attached", or "detached" (default: "visible")
     * @param options.timeout - Maximum time in milliseconds to wait for the state (default: 30000)
     * @param options.elementDescription - Optional description for better error messages and logging
     *
     * @returns Promise that resolves when the element reaches the specified state
     *
     * @throws {SelfHealingLocatorError} When element cannot be found or doesn't reach the expected state
     *
     * @example
     * ```typescript
     * // Wait for element to be visible (default behavior)
     * await PlaywrightSelfHealing.waitFor(page, '#loading-spinner');
     *
     * // Wait for element to be hidden
     * await PlaywrightSelfHealing.waitFor(page, '.modal-overlay', {
     *   state: 'hidden',
     *   timeout: 10000
     * });
     *
     * // Wait for element to be attached to DOM
     * await PlaywrightSelfHealing.waitFor(page, '[data-testid="dynamic-content"]', {
     *   state: 'attached',
     *   elementDescription: 'Dynamically loaded content section'
     * });
     * ```
     */
    public static async waitFor(
        page: Page,
        originalLocator: string,
        options: SelfHealingOptions & {
            state?: "visible" | "hidden" | "attached" | "detached";
        } = {}
    ): Promise<void> {
        const { state = "visible", timeout = 30000 } = options;

        const locator = await this.getLocatorWithWait(page, originalLocator, options);
        await locator.waitFor({ state, timeout });
    }

    /**
     * Retrieves the text content of an element with self-healing capability.
     *
     * This method locates an element using self-healing logic and returns its text content,
     * including text from child elements. Returns null if the element has no text content.
     * The text content includes text from all descendant nodes but excludes HTML markup.
     *
     * @param page - The Playwright page instance containing the element
     * @param originalLocator - The original CSS selector or locator string
     * @param options - Configuration options for self-healing behavior
     * @param options.timeout - Maximum time in milliseconds to wait for element (default: 5000)
     * @param options.elementDescription - Optional description for better error messages
     *
     * @returns Promise that resolves to the element's text content, or null if no content exists
     *
     * @throws {SelfHealingLocatorError} When element cannot be found
     *
     * @example
     * ```typescript
     * // Get text content from a paragraph
     * const content = await PlaywrightSelfHealing.textContent(page, '.description');
     * console.log(content); // "This is the description text"
     *
     * // Get text content with custom options
     * const alertText = await PlaywrightSelfHealing.textContent(page, '.alert-message', {
     *   timeout: 8000,
     *   elementDescription: 'Alert notification message'
     * });
     *
     * // Handle potential null return
     * const title = await PlaywrightSelfHealing.textContent(page, 'h1');
     * if (title) {
     *   console.log(`Page title: ${title}`);
     * }
     * ```
     */
    public static async textContent(page: Page, originalLocator: string, options: SelfHealingOptions = {}): Promise<string | null> {
        const locator = await this.getLocatorWithWait(page, originalLocator, options);
        return await locator.textContent();
    }

    /**
     * Retrieves the inner text of an element with self-healing capability.
     *
     * This method locates an element using self-healing logic and returns its inner text.
     * Unlike textContent, innerText respects styling and returns text as it would appear
     * to a user, excluding hidden elements and respecting line breaks and spacing.
     *
     * @param page - The Playwright page instance containing the element
     * @param originalLocator - The original CSS selector or locator string
     * @param options - Configuration options for self-healing behavior
     * @param options.timeout - Maximum time in milliseconds to wait for element (default: 5000)
     * @param options.elementDescription - Optional description for better error messages
     *
     * @returns Promise that resolves to the element's inner text
     *
     * @throws {SelfHealingLocatorError} When element cannot be found
     *
     * @example
     * ```typescript
     * // Get visible text from a button
     * const buttonText = await PlaywrightSelfHealing.innerText(page, '#submit-button');
     * console.log(buttonText); // "Submit Form"
     *
     * // Get text from a complex element with styling
     * const menuText = await PlaywrightSelfHealing.innerText(page, '.navigation-menu', {
     *   elementDescription: 'Main navigation menu text'
     * });
     *
     * // Get text that respects CSS visibility
     * const visibleContent = await PlaywrightSelfHealing.innerText(page, '.content-area');
     * // Only returns text from visible elements within .content-area
     * ```
     */
    public static async innerText(page: Page, originalLocator: string, options: SelfHealingOptions = {}): Promise<string> {
        const locator = await this.getLocatorWithWait(page, originalLocator, options);
        return await locator.innerText();
    }

    public static getCacheStatistics() {
        return this.generator.getCacheStatistics();
    }

    public static clearCache(): void {
        this.generator.clearCache();
    }
}
