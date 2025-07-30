# Self-Healing Playwright TypeScript Framework

A robust Playwright automation framework for TypeScript that leverages AI-powered self-healing locators to automatically recover from web element identification failures. This framework uses OpenAI's GPT models to intelligently generate alternative locators when original ones fail, making your tests more resilient to UI changes.

## 🚀 Key Features

- **AI-Powered Self-Healing Locators**: Automatically recovers from locator failures using GPT-generated alternatives
- **Intelligent Caching**: Reduces API costs by caching successful locator mappings
- **Flexible Execution Modes**: Control whether tests fail with suggestions or continue running
- **Page Object Model**: Clean separation of test logic and page interactions
- **Custom Fixtures**: Dependency injection for page objects and test utilities
- **Comprehensive Logging**: Detailed logging for debugging and monitoring

## 🏗️ Architecture

The framework consists of several key components:

- **SmartLocatorGenerator**: Core AI-powered locator generation engine
- **PlaywrightSelfHealing**: Extension methods for Playwright with self-healing capabilities
- **LocalCache**: Intelligent caching system for generated locators
- **ConfigManager**: Configuration management for self-healing behavior

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- Playwright 1.40+
- OpenAI API key

### 1. Run All Setup at Once

```bash
npm run install-deps
```

### 2. Configure Self-Healing

Set your OpenAI API key and configure settings:

```bash
# Set environment variable
$env:OPENAI_API_KEY="your_openai_api_key_here"

# Or create a .env file
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
```

## 🧪 Running Tests

### Basic Test Execution

```bash
# Run all tests
npm test

# Run tests in headed mode (visible browser)
npm run test:headed
```

### Development and Maintenance

```bash
# Install all dependencies and Playwright browsers
npm run install-deps

# Clear the locator cache
npm run clear-cache

# Format code
npm run format

# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Type check without emitting files
npm run type-check

# Run full validation (type-check + lint + format)
npm run validate

# Pre-commit validation and tests
npm run pre-commit
```

## ⚙️ Configuration

### Core Settings

Create a `self-healing-config.json` file or configure via environment variables:

```json
{
    "useSmartLocator": true,
    "runWithSmartLocator": false,
    "cachePath": "cache/locator_cache.json",
    "openApiModel": "gpt-4o-mini",
    "openApiKey": "",
    "cacheExpirationDays": 2,
    "maxRetries": 3,
    "timeout": 30000,
    "enableLogging": true,
    "logLevel": "info"
}
```

### Environment Variables

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional
USE_SMART_LOCATOR=true
RUN_WITH_SMART_LOCATOR=false
OPENAI_MODEL=gpt-4o-mini
CACHE_PATH=cache/locator_cache.json

```

### Execution Modes

#### 1. Discovery Mode (`runWithSmartLocator: false`)

- **Behavior**: When a locator fails, generates an alternative but fails the test with a detailed message
- **Use Case**: During test development and maintenance to identify broken locators
- **Output**: Shows both old and new locators for manual review and test updates

```text
Locator has been changed from
Old: #old-button-id
New: //button[contains(text(), 'Submit')]
Please review the same and update the test or create bug
```

#### 2. Self-Healing Mode (`runWithSmartLocator: true`)

- **Behavior**: Automatically uses the generated locator and continues test execution
- **Use Case**: Production test runs where continuity is prioritized
- **Output**: Logs the successful locator replacement and continues testing

## 🧠 How Self-Healing Locators Work

### Core Implementation

The self-healing mechanism works through these steps:

1. **Locator Failure Detection**: When a locator fails to find an element, the framework captures the current page state
2. **Context Analysis**: Extracts the accessibility tree and relevant HTML snippets from the page
3. **AI-Powered Generation**: Sends the context to OpenAI's GPT model with a specialized prompt to generate a new locator
4. **Validation & Caching**: Validates the generated locator and caches successful mappings for future use

### AI Prompt Strategy

The framework uses a sophisticated prompt that instructs the AI to:

- Analyze the accessibility tree to identify the target element
- Cross-reference with HTML source code
- Prioritize stable attributes over dynamic ones
- Generate robust XPath or CSS selectors
- Return structured responses with locator and strategy

### Performance Optimization

#### Intelligent Caching System

- **API Cost Reduction**: Avoids repeated AI inference calls for the same locator failures
- **Faster Execution**: Cached locators are retrieved instantly without API delays
- **Consistent Results**: Ensures the same alternative locator is used across test runs
- **Automatic Cleanup**: Removes outdated cache entries (default: 2 days)

#### HTML Context Optimization

- **Targeted Extraction**: Identifies and extracts HTML sections most likely to contain the target element
- **Size Reduction**: Significantly reduces the payload sent to the AI model
- **Improved Accuracy**: Provides focused context that helps the AI generate better locators

## 🛡️ Self-Healing Features

Advanced self-healing using OpenAI GPT models:

1. **Context Analysis**: Captures page accessibility tree and HTML
2. **Intelligent Generation**: AI generates new locators based on page context
3. **Smart Caching**: Caches successful AI-generated locators
4. **Cost Optimization**: Reduces API calls through intelligent caching

### Example Self-Healing Usage

#### AI-Powered Approach

```typescript
import { BasePage, SelfHealingOptions } from "../src";

export class LoginPage extends BasePage {
    async login(username: string, password: string) {
        await this.clickWithSelfHealing("#login-button", {
            elementDescription: "Login submit button"
        });
    }

    async fillUsername(username: string) {
        await this.typeWithSelfHealing("#username", username, {
            elementDescription: "Username input field for authentication"
        });
    }
}
```

## 📈 Cost Optimization

The framework includes several optimization techniques:

1. **HTML Context Optimization**: 60-80% reduction in API payload size
2. **Intelligent Caching**: Up to 90% reduction in API calls for recurring failures
3. **Efficient Models**: Uses `gpt-4o-mini` for cost-effective generation
4. **Strategic Usage**: Enable self-healing only for critical test paths initially

## � Technical Stack

- **Playwright**: Browser automation framework
- **TypeScript**: Type-safe development and IntelliSense support
- **OpenAI GPT**: AI-powered locator generation
- **Node.js**: Runtime environment
- **Intelligent Caching**: Local JSON-based cache system

## �📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Self-Healing Test Automation](https://blog.testproject.io/2019/08/14/self-healing-tests/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with comprehensive tests
4. Add tests for both traditional and AI-powered self-healing functionality
5. Ensure all tests pass and cache functionality works
6. Update documentation if needed
7. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

---

This framework transforms brittle Playwright tests into resilient, self-maintaining automation suites that adapt to UI changes automatically using both traditional fallback strategies and cutting-edge AI-powered locator generation.
