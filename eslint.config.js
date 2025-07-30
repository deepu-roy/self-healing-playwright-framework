const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const playwright = require("eslint-plugin-playwright");

module.exports = [
    // Apply to all files
    {
        files: ["**/*.{js,ts}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module"
        }
    },

    // ESLint recommended rules
    eslint.configs.recommended,

    // TypeScript ESLint recommended rules
    ...tseslint.configs.recommended,

    // Playwright recommended rules for test files
    {
        files: ["src/**/*.ts", "tests/**/*.ts"],
        ...playwright.configs["flat/recommended"]
    },

    // Global ignores
    {
        ignores: ["node_modules/", "dist/", "build/", "coverage/", "playwright-report/", "test-results/", "cache/", "*.js"]
    }
];
