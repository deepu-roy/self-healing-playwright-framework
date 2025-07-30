import { Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class InventoryPage extends BasePage {
    private readonly inventoryItem = ".inventory_item";
    private readonly inventoryItemNames = ".inventory_item .inventory_item_name";
    private readonly cartButton = ".shopping_cart_link";

    constructor(page: Page) {
        super(page, "/inventory.html");
    }

    async getInventoryItemNames(): Promise<string[]> {
        const itemsLocator = await this.getSelfHealingLocator(this.inventoryItemNames, {
            elementDescription: "Inventory item names collection"
        });
        return await itemsLocator.allTextContents();
    }

    async navigateToCart(): Promise<void> {
        await this.clickWithSelfHealing(this.cartButton, {
            elementDescription: "Shopping cart button to navigate to cart page"
        });
    }

    async addItemToCart(itemName: string): Promise<void> {
        await this.page
            .locator(this.inventoryItem)
            .filter({ has: this.page.locator(".inventory_item_name", { hasText: itemName }) })
            .locator(".btn_inventory")
            .click();
    }

    async removeItemFromCart(itemName: string): Promise<void> {
        await this.page
            .locator(this.inventoryItem)
            .filter({ has: this.page.locator(".inventory_item_name", { hasText: itemName }) })
            .locator(".btn_secondary")
            .click();
    }
}
