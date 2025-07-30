import { ConfigManager } from "../src/config/config-manager";
import { expect, test } from "../src/fixtures/test.fixtures";

test.describe("Sauce Demo Tests with Self-Healing", () => {
    test.beforeAll(async () => {
        // Optional: Configure the self-healing settings before running tests
        // This can be adjusted based on your specific configuration needs
        const config = ConfigManager.getInstance();
        config.updateConfig({
            useSmartLocator: true,
            runWithSmartLocator: true,
            enableLogging: true,
            logLevel: "info"
        });
    });

    test.beforeEach(async ({ loginPage }) => {
        await loginPage.open();
    });

    test("should login successfully with valid credentials", async ({ loginPage, inventoryPage }) => {
        await loginPage.login("standard_user", "secret_sauce");
        await inventoryPage.waitForPageLoad();

        const itemNames = await inventoryPage.getInventoryItemNames();
        expect(itemNames.length).toBeGreaterThan(0);
        expect(itemNames).toContain("Sauce Labs Backpack");
        expect(itemNames).toContain("Sauce Labs Bike Light");
    });

    test("should display error message for invalid credentials", async ({ loginPage }) => {
        await loginPage.login("invalid_user", "wrong_password");

        const isErrorVisible = await loginPage.isErrorMessageVisible();
        expect(isErrorVisible).toBe(true);

        const errorMessage = await loginPage.getErrorMessage();
        expect(errorMessage).toContain("Username and password do not match");
    });

    test("should handle locked user scenario", async ({ loginPage }) => {
        await loginPage.login("locked_out_user", "secret_sauce");

        const errorMessage = await loginPage.getErrorMessage();
        expect(errorMessage).toContain("Sorry, this user has been locked out");

        const isErrorVisible = await loginPage.isErrorMessageVisible();
        expect(isErrorVisible).toBe(true);
    });

    test("should add and remove items from cart", async ({ page, loginPage, inventoryPage }) => {
        await loginPage.login("standard_user", "secret_sauce");
        await inventoryPage.waitForPageLoad();

        await inventoryPage.addItemToCart("Sauce Labs Backpack");
        await inventoryPage.addItemToCart("Sauce Labs Bike Light");

        await inventoryPage.navigateToCart();

        const currentUrl = page.url();
        expect(currentUrl).toContain("cart");

        await inventoryPage.open();
        await inventoryPage.waitForPageLoad();

        await inventoryPage.removeItemFromCart("Sauce Labs Backpack");
    });
});
