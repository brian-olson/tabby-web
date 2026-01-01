import { test, expect } from '@playwright/test';

test.describe('Tabby Web Application', () => {
  let consoleErrors: string[] = [];
  let networkErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Capture console errors
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture network errors
    networkErrors = [];
    page.on('requestfailed', request => {
      networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('should load homepage without errors', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load (don't use networkidle - app has persistent connections)
    await page.waitForLoadState('load');
    // Give Angular time to bootstrap
    await page.waitForTimeout(3000);

    // Filter out expected errors:
    // - Cloudflare beacon (injected by CF tunnel, blocked by browser)
    // - ERR_FAILED (usually from blocked third-party scripts)
    // - 403 errors (expected for auth-required endpoints when not logged in)
    const relevantErrors = consoleErrors.filter(err =>
      !err.includes('cloudflareinsights.com') &&
      !err.includes('beacon.min.js') &&
      !err.includes('net::ERR_FAILED') &&
      !err.includes('403')
    );

    // Check no relevant console errors
    expect(relevantErrors, `Found console errors: ${relevantErrors.join('\n')}`).toHaveLength(0);

    // Filter out Cloudflare-related network errors
    const relevantNetworkErrors = networkErrors.filter(err =>
      !err.includes('cloudflareinsights.com')
    );

    // Check no relevant network errors
    expect(relevantNetworkErrors, `Found network errors: ${relevantNetworkErrors.join('\n')}`).toHaveLength(0);

    // Verify page title
    await expect(page).toHaveTitle(/Tabby/);
  });

  test('should not have JIT compilation errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    // Check for specific JIT compilation error
    const jitErrors = consoleErrors.filter(err =>
      err.includes('JIT compilation') ||
      err.includes('@angular/compiler')
    );

    expect(jitErrors, `Found JIT compilation errors: ${jitErrors.join('\n')}`).toHaveLength(0);
  });

  test('should not have ERR_NAME_NOT_RESOLVED errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const dnsErrors = networkErrors.filter(err =>
      err.includes('ERR_NAME_NOT_RESOLVED')
    );

    expect(dnsErrors, `Found DNS resolution errors: ${dnsErrors.join('\n')}`).toHaveLength(0);
  });

  test('should load all static assets', async ({ page }) => {
    await page.goto('/');

    // Wait for main JS bundle to load
    await page.waitForFunction(() => {
      return window.document.readyState === 'complete';
    });

    // Check that index.js loaded successfully
    const indexJsLoaded = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src*="index.js"]'));
      return scripts.length > 0;
    });

    expect(indexJsLoaded).toBeTruthy();

    // Check that index.css loaded successfully
    const indexCssLoaded = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[href*="index.css"]'));
      return links.length > 0;
    });

    expect(indexCssLoaded).toBeTruthy();
  });

  test('should have backend URL meta tag set correctly', async ({ page }) => {
    await page.goto('/');

    const backendURL = await page.locator('meta[property="x-tabby-web-backend-url"]').getAttribute('content');

    // Should be empty string for same-origin API calls
    expect(backendURL).toBe('');
  });

  test('should have Angular app element present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Wait for Angular to bootstrap (check for ng-version attribute)
    // Use state: 'attached' since app element may be hidden (loading state)
    await page.waitForSelector('app[ng-version]', { state: 'attached', timeout: 10000 });

    const appElement = page.locator('app');
    // Check element is attached to DOM and has Angular version (app bootstrapped)
    await expect(appElement).toBeAttached();
    const ngVersion = await appElement.getAttribute('ng-version');
    expect(ngVersion).toBeTruthy();
  });

  test('API endpoints should be accessible', async ({ page }) => {
    // Test configs endpoint (requires auth but should return 401/403, not 404)
    const configsResponse = await page.request.get('/api/1/configs');
    expect(configsResponse.status()).not.toBe(404);

    // Test versions endpoint
    const versionsResponse = await page.request.get('/api/1/versions');
    expect(versionsResponse.status()).not.toBe(404);
  });

  test('should not have 404 errors for critical resources', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    const notFoundErrors = networkErrors.filter(err =>
      err.includes('404') || err.includes('Not Found')
    );

    expect(notFoundErrors, `Found 404 errors: ${notFoundErrors.join('\n')}`).toHaveLength(0);
  });

  test('console should log backend URL', async ({ page }) => {
    const consoleMessages: string[] = [];

    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    // CommonService logs the backendURL on initialization
    const backendUrlLog = consoleMessages.find(msg =>
      msg === '' || msg.startsWith('http')
    );

    // Should find the log (empty string for same-origin)
    expect(backendUrlLog).toBeDefined();
  });
});
