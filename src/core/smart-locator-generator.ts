import { LocatorGenerationResponse } from "@/models/locator-generation-response";
import { PageContext } from "@/models/page-context";
import { Page } from "@playwright/test";
import OpenAI from "openai";
import { ConfigManager } from "../config/config-manager";
import { LocatorGenerationRequest } from "../models/locator-generation-request";
import { LocalCache } from "../utils/cache";
import { Logger, LogLevel } from "../utils/logger";

export class SmartLocatorGenerator {
    private static instance: SmartLocatorGenerator;
    private openai: OpenAI | null = null;
    private config = ConfigManager.getInstance().getConfig();
    private cache: LocalCache;
    private logger: Logger;

    private constructor() {
        this.cache = LocalCache.getInstance(this.config.cachePath);
        this.logger = Logger.getInstance(this.getLogLevel(this.config.logLevel), this.config.enableLogging);
        this.initializeOpenAI();
    }

    public static getInstance(): SmartLocatorGenerator {
        if (!SmartLocatorGenerator.instance) {
            SmartLocatorGenerator.instance = new SmartLocatorGenerator();
        }
        return SmartLocatorGenerator.instance;
    }

    private getLogLevel(level: string): LogLevel {
        switch (level) {
            case "error":
                return LogLevel.ERROR;
            case "warn":
                return LogLevel.WARN;
            case "info":
                return LogLevel.INFO;
            case "debug":
                return LogLevel.DEBUG;
            default:
                return LogLevel.INFO;
        }
    }

    private initializeOpenAI(): void {
        if (this.config.openApiKey) {
            this.openai = new OpenAI({
                apiKey: this.config.openApiKey
            });
        } else {
            this.logger.warn("OpenAI API key not provided. Smart locator generation will be disabled.");
        }
    }

    public async generateSmartLocator(request: LocatorGenerationRequest): Promise<string | null> {
        try {
            // Check cache first
            const cachedEntry = this.cache.get(request.originalLocator);
            if (cachedEntry) {
                this.logger.logCacheHit(request.originalLocator, cachedEntry.generatedLocator);
                return cachedEntry.generatedLocator;
            }

            this.logger.logCacheMiss(request.originalLocator);

            if (!this.openai) {
                this.logger.error("OpenAI client not initialized. Cannot generate smart locator.");
                return null;
            }

            // Extract page context
            const pageContext = await this.extractPageContext(request.page);

            // Generate locator using AI
            const response = await this.callOpenAI(request, pageContext);

            if (response) {
                // Cache the successful generation
                this.cache.set(request.originalLocator, {
                    originalLocator: request.originalLocator,
                    generatedLocator: response.locator,
                    strategy: response.strategy
                });

                this.logger.logSmartLocatorGeneration(request.originalLocator, response.locator, response.strategy);

                return response.locator;
            }

            return null;
        } catch (error) {
            this.logger.logSelfHealingFailure(request.originalLocator, error instanceof Error ? error.message : "Unknown error");
            return null;
        }
    }

    private async extractPageContext(page: Page): Promise<PageContext> {
        try {
            // Get accessibility tree
            const accessibilityTree = await this.getAccessibilityTree(page);

            // Get relevant HTML snippets
            const relevantHtml = await this.getRelevantHtmlSnippets(page);

            // Get page metadata
            const pageTitle = await page.title();
            const url = page.url();

            return {
                accessibilityTree,
                relevantHtml,
                pageTitle,
                url
            };
        } catch (error) {
            this.logger.warn("Failed to extract page context", error);
            return {
                accessibilityTree: "",
                relevantHtml: [],
                pageTitle: "",
                url: ""
            };
        }
    }

    private async getAccessibilityTree(page: Page): Promise<string> {
        try {
            const snapshot = await page.accessibility.snapshot();
            return JSON.stringify(snapshot, null, 2);
        } catch (error) {
            this.logger.warn("Failed to get accessibility tree", error);
            return "";
        }
    }

    private async getRelevantHtmlSnippets(page: Page): Promise<string[]> {
        // Run _all_ of your logic inside the browser in one go
        const snippets = await page.evaluate((): string[] => {
            const MAX_INTERACTIVE = 50;
            const MAX_FORM = 5;

            // Utility: clean & truncate
            const clean = (s: string, max: number) => s.slice(0, max).replace(/\s+/g, " ").trim();

            const out: Array<{
                type: "interactive" | "form" | "nav" | "main";
                html: string;
            }> = [];
            // 1️⃣ Interactive elements
            const interactiveSel = [
                "button",
                "input",
                "select",
                "textarea",
                "a[href]",
                '[role="button"]',
                '[role="link"]',
                '[tabindex]:not([tabindex="-1"])',
                "[onclick]",
                ".btn",
                ".button",
                '[type="submit"]'
            ].join(",");

            const interactiveEls = Array.from(document.querySelectorAll(interactiveSel)).slice(0, MAX_INTERACTIVE);
            for (const el of interactiveEls) {
                const parent = el.parentElement;
                const html = parent && parent.children.length <= 5 ? parent.outerHTML : el.outerHTML;
                out.push({ type: "interactive", html: clean(html, 800) });
            }

            // 2️⃣ Forms
            const forms = Array.from(document.querySelectorAll("form")).slice(0, MAX_FORM);
            for (const form of forms) {
                const clone = form.cloneNode(false) as HTMLElement;
                form.querySelectorAll("input,select,textarea,button").forEach(i => {
                    clone.appendChild(i.cloneNode(true));
                });
                out.push({ type: "form", html: clean(clone.outerHTML, 1200) });
            }

            // 3️⃣ First navigation block
            const nav = document.querySelector('nav, [role="navigation"], .navbar, .menu, header nav');
            if (nav) {
                const clone = nav.cloneNode(false) as HTMLElement;
                nav.querySelectorAll('a,button,[role="button"]').forEach(i => {
                    clone.appendChild(i.cloneNode(true));
                });
                out.push({ type: "nav", html: clean(clone.outerHTML, 1000) });
            }

            // 4️⃣ Main content interactive bits
            const main = document.querySelector('main, [role="main"], .main-content, #main');
            if (main) {
                const container = document.createElement("div");
                main.querySelectorAll("button,input,select,textarea,a[href]").forEach(el => {
                    const parent = el.parentElement;
                    container.appendChild((parent && parent.children.length <= 3 ? parent : el).cloneNode(true));
                });
                if (container.innerHTML.length > 50) {
                    out.push({ type: "main", html: clean(container.innerHTML, 2000) });
                }
            }

            // Return only HTML strings
            return out.map(s => s.html);
        });

        return snippets;
    }

    private async callOpenAI(request: LocatorGenerationRequest, context: PageContext): Promise<LocatorGenerationResponse | null> {
        try {
            const prompt = this.buildPrompt(request, context);

            this.logger.logApiCall(this.config.openApiModel);

            const completion = await this.openai!.chat.completions.create({
                model: this.config.openApiModel,
                messages: [
                    {
                        role: "system",
                        content: this.getSystemPrompt()
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 500,
                response_format: { type: "json_object" }
            });

            const responseText = completion.choices[0]?.message?.content;
            if (!responseText) {
                throw new Error("Empty response from OpenAI");
            }

            const parsed = JSON.parse(responseText) as LocatorGenerationResponse;

            // Validate response
            if (!parsed.locator || !parsed.strategy) {
                throw new Error("Invalid response format from OpenAI");
            }

            return parsed;
        } catch (error) {
            this.logger.error("OpenAI API call failed", error);
            return null;
        }
    }

    private getSystemPrompt(): string {
        return `You are a senior web automation engineer specializing in building robust and maintainable locators for Selenium WebDriver.
                Your task is to generate a *more reliable* locator when the original fails — prioritizing *stability and precision* over brevity.

                Response format (JSON):
                {
                "locator": "string - the new locator expression",
                "strategy": "CSS|XPATH|TEXT|DATA_TESTID - the locator strategy",
                "confidence": "number - confidence level 0-100",
                "reasoning": "string - brief explanation of the approach"
                }`;
    }

    private buildPrompt(request: LocatorGenerationRequest, context: PageContext): string {
        return `FAILED LOCATOR ANALYSIS:

                Original Locator: ${request.originalLocator}
                Error: ${request.errorMessage || "Element not found"}
                Element Description: ${request.elementDescription || "Not provided"}

                PAGE CONTEXT:
                Title: ${context.pageTitle}
                URL: ${context.url}

                ACCESSIBILITY TREE:
                ${context.accessibilityTree.substring(0, 4000)}

                RELEVANT HTML SNIPPETS:
                ${context.relevantHtml
                    .map((html, index) => `--- Snippet ${index + 1} ---\n${html}`)
                    .join("\n\n")
                    .substring(0, 6000)}

                OBJECTIVE:
                Generate a robust alternative locator that uniquely identifies the same element, using only the given HTML and accessibility tree.

                ---

                THINKING PROCESS:
                1. **Locate the Intended Element**:
                - Use the accessibility tree to understand what the original locator was supposed to target.
                - Identify its role, label, text, and position.

                2. **Diagnose Failure**:
                - Hypothesize why the original locator failed: attribute changes, tag change, dynamic values, or layout shifts.

                3. **Analyze the HTML**:
                - Match potential candidate nodes from the accessibility tree to the HTML.
                - Remember: roles in the accessibility tree may map to different HTML tags (e.g., role='button' might be an <input> or <div>).

                4. **Generate a New Locator**:
                - Prefer stable, semantically meaningful attributes.
                - Only use tags, classes, and attributes that exist in the provided HTML.
                - Ensure that the locator uniquely and consistently matches only the intended element.

                5. **Validate**:
                - Double-check that the locator doesn’t match multiple or wrong elements.

                ---

                LOCATOR PRIORITY (in order):
                1. **Stable semantic attributes**: id, name, data-testid, aria-label, role
                2. **Stable text-based identifiers**: visible text, aria-labelledby, title
                3. **Parent-child relationships** with stable surrounding elements
                4. **Static CSS classes** (avoid hashed, dynamic, or BEM variants unless consistent)
                5. **Tag + attribute combos** like input[type='submit'] with stable attributes

                AVOID:
                - Absolute XPath (e.g., //div[2]/span[3])
                - Index-based selectors (nth-child, [2]) unless necessary
                - Volatile attributes (id=""123_abcd"", timestamp=...)
                - Over-specific CSS/XPath that breaks with layout shifts

                ---

                STRATEGY RULES:
                - Use ""XPATH"" when:
                - The original was XPath
                - You need complex DOM relationships or text matching
                - Use ""CSS"" when:
                - A single or few attribute selectors are sufficient and stable

                Generate the most reliable locator now:`;
    }

    public async validateLocator(page: Page, locator: string, timeout: number = 5000): Promise<boolean> {
        try {
            await page.locator(locator).waitFor({ state: "attached", timeout });
            return true;
        } catch {
            return false;
        }
    }

    public updateCacheSuccess(originalLocator: string): void {
        this.cache.updateSuccess(originalLocator);
    }

    public updateCacheFailure(originalLocator: string): void {
        this.cache.updateFailure(originalLocator);
    }

    public getCacheStatistics() {
        return this.cache.getStatistics();
    }

    public clearCache(): void {
        this.cache.clear();
    }
}
