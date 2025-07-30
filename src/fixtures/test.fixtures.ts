import { test as base, BrowserContext, Page } from "@playwright/test";
import { InventoryPage } from "../pages/inventory.page";
import { LoginPage } from "../pages/login.page";

// Define the fixtures interface
export type TestFixtures = {
    loginPage: LoginPage;
    inventoryPage: InventoryPage;
    context: BrowserContext;
    page: Page;
};

export const test = base.extend<TestFixtures>({
    loginPage: async ({ page }, use) => {
        const loginPage = new LoginPage(page);
        await use(loginPage);
    },

    inventoryPage: async ({ page }, use) => {
        const inventoryPage = new InventoryPage(page);
        await use(inventoryPage);
    }
});

export { expect } from "@playwright/test";
