import { test, expect } from '@playwright/test';

test.describe('Tabby Web Application - Authentication', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/');

    // Wait for Angular to bootstrap and check auth
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // Verify we're on the login page
    expect(page.url()).toContain('/login');
  });

  test('should require authentication for gateway API', async ({ page }) => {
    const response = await page.request.post('/api/1/gateways/choose');
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.detail).toContain('Authentication credentials were not provided');
  });

  test('should require authentication for configs API', async ({ page }) => {
    const response = await page.request.get('/api/1/configs');
    expect(response.status()).toBe(403);
  });
});

test.describe('Tabby Web Application - Public Endpoints', () => {
  test('should allow public access to versions API', async ({ page }) => {
    const response = await page.request.get('/api/1/versions');
    expect(response.status()).toBe(200);

    const versions = await response.json();
    expect(Array.isArray(versions)).toBeTruthy();
    expect(versions.length).toBeGreaterThan(0);
    expect(versions[0]).toHaveProperty('version');
    expect(versions[0]).toHaveProperty('plugins');
  });

  test('should serve login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('load');

    // Login page should load without redirect
    expect(page.url()).toContain('/login');
  });
});

test.describe('Tabby Web Application - Static Assets', () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('should load static assets without JIT compilation errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Check for specific JIT compilation error
    const jitErrors = consoleErrors.filter(err =>
      err.includes('JIT compilation') ||
      err.includes('@angular/compiler')
    );

    expect(jitErrors, `Found JIT compilation errors: ${jitErrors.join('\n')}`).toHaveLength(0);
  });

  test('should load index.js bundle', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => {
      return window.document.readyState === 'complete';
    });

    const indexJsLoaded = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src*="index.js"]'));
      return scripts.length > 0;
    });

    expect(indexJsLoaded).toBeTruthy();
  });

  test('should load index.css stylesheet', async ({ page }) => {
    await page.goto('/');

    await page.waitForFunction(() => {
      return window.document.readyState === 'complete';
    });

    const indexCssLoaded = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[href*="index.css"]'));
      return links.length > 0;
    });

    expect(indexCssLoaded).toBeTruthy();
  });

  test('should have backend URL meta tag', async ({ page }) => {
    await page.goto('/');

    const backendURL = await page.locator('meta[property="x-tabby-web-backend-url"]').getAttribute('content');

    // Should be empty string for same-origin API calls
    expect(backendURL).toBe('');
  });

  test('should bootstrap Angular app', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Wait for Angular to bootstrap (check for ng-version attribute)
    await page.waitForSelector('app[ng-version]', { state: 'attached', timeout: 10000 });

    const appElement = page.locator('app');
    await expect(appElement).toBeAttached();
    const ngVersion = await appElement.getAttribute('ng-version');
    expect(ngVersion).toBeTruthy();
  });
});

test.describe('Tabby Web Application - App Distribution', () => {
  test('should serve app-dist files', async ({ page }) => {
    // First get the version
    const versionsResponse = await page.request.get('/api/1/versions');
    const versions = await versionsResponse.json();
    const version = versions[0].version;

    // Try to access a plugin file
    const pluginResponse = await page.request.get(`/app-dist/${version}/tabby-core/package.json`);
    expect(pluginResponse.status()).toBe(200);
  });
});
