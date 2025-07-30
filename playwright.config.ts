import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [["html", { outputFolder: "playwright-report" }]],
    use: {
        baseURL: "https://www.saucedemo.com/",
        trace: "off",
        screenshot: "only-on-failure",
        video: "off",
        actionTimeout: 30000,
        navigationTimeout: 30000
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }
        }
    ]
});
