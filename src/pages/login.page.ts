import { Page } from "@playwright/test";
import { EnhancedLocator } from "../models/enhanced-locator";
import { BasePage } from "./base.page";

export class LoginPage extends BasePage {
    private readonly userNameInput: EnhancedLocator = {
        locator: "#user-name",
        //locator: "#user-name-not-working", // Example of a locator that might not work
        description: "Username input field"
    };
    private readonly passwordInput: EnhancedLocator = {
        locator: "#password",
        description: "Password input field"
    };
    private readonly loginButton: EnhancedLocator = {
        locator: "#login-button",
        description: "Login button"
    };
    private readonly errorMessage: EnhancedLocator = {
        locator: ".error-message-container h3",
        // locator: ".error-message-container h4", // Example of a locator that might not work
        description: "Login error message"
    };

    constructor(page: Page) {
        super(page, "/");
    }

    async login(username: string, password: string): Promise<void> {
        await this.typeWithSelfHealing(this.userNameInput.locator, username, {
            elementDescription: this.userNameInput.description
        });
        await this.typeWithSelfHealing(this.passwordInput.locator, password, {
            elementDescription: this.passwordInput.description
        });
        await this.clickWithSelfHealing(this.loginButton.locator, {
            elementDescription: this.loginButton.description
        });
    }

    async getErrorMessage(): Promise<string | null> {
        return await this.getTextContent(this.errorMessage.locator, {
            elementDescription: this.errorMessage.description
        });
    }
    async isErrorMessageVisible(): Promise<boolean> {
        const locator = await this.getSelfHealingLocator(this.errorMessage.locator, {
            elementDescription: this.errorMessage.description
        });
        return await locator.isVisible();
    }
}
