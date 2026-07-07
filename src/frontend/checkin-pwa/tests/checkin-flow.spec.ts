import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

test.describe('Checkin PWA E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

    // Mock the Login API
    await page.route(`${BASE_URL}/auth/login`, async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        const body = JSON.parse(request.postData() || '{}');
        if (body.email === 'staff@ticketbox.vn' && body.password === '123456') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              access_token: 'fake-jwt-token',
              user: {
                id: 'user-1',
                email: 'staff@ticketbox.vn',
                name: 'Test Staff',
                role: 'STAFF'
              }
            })
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Invalid credentials' })
          });
        }
      } else {
        await route.continue();
      }
    });

    // Mock the Verify API (Online scan)
    await page.route(`${BASE_URL}/checkin/verify`, async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        const body = JSON.parse(request.postData() || '{}');
        if (body.token === 'valid-token') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              ticketId: body.ticketId,
              concertId: 'c1',
              ticketTypeName: 'VIP',
              status: 'CHECKED_IN',
              message: 'Check-in thành công'
            })
          });
        } else {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              message: 'Mã QR không hợp lệ'
            })
          });
        }
      } else {
        await route.continue();
      }
    });
    
    // Mock Sync API
    await page.route(`${BASE_URL}/checkin/sync`, async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postData();
        const body = postData ? JSON.parse(postData) : { records: [] };
        const results = (body.records || []).map((r: any) => ({
          offlineEventId: r.offlineEventId,
          success: true,
          status: 'SUCCESS',
          message: 'Đồng bộ thành công'
        }));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ results })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('Login Flow and Check-in Tab', async ({ page }) => {
    await page.goto('/login');
    
    // Check initial state
    await expect(page.locator('h1')).toHaveText('Đăng nhập');

    // Fill form
    await page.fill('#staff-id-input', 'staff@ticketbox.vn');
    await page.fill('#password-input', '123456');
    await page.selectOption('#gate-select', 'Cổng VIP (Tầng 1)');
    
    // Submit
    await page.click('#login-submit-btn');

    // Verify redirect to checkin page
    await expect(page).toHaveURL('/checkin');
    await expect(page.locator('text=CỔNG HIỆN TẠI')).toBeVisible();
    await expect(page.locator('text=Cổng VIP (Tầng 1)')).toBeVisible();
  });

  test('Online QR Code Scanning Flow', async ({ page }) => {
    // Navigate and login
    await page.goto('/login');
    await page.fill('#staff-id-input', 'staff@ticketbox.vn');
    await page.fill('#password-input', '123456');
    await page.click('#login-submit-btn');
    await expect(page).toHaveURL('/checkin');
    
    // Wait for the page to be ready for scanning
    await expect(page.locator('text=TICKETSCAN')).toBeVisible();

    // Trigger the mock scan function with a valid QR payload
    // Payload format: {ticketId}:{rawToken}:{gateId}
    const mockPayload = 'ticket-123:valid-token:Cổng VIP (Tầng 1)';
    await page.evaluate((payload) => {
      if (typeof (window as any).mockScan === 'function') {
        (window as any).mockScan(payload);
      }
    }, mockPayload);

    // Verify success view
    await expect(page.locator('text=HỢP LỆ')).toBeVisible();
    await expect(page.locator('text=ticket-123')).toBeVisible();
    
    // Click "Tiếp tục"
    await page.click('button:has-text("Tiếp tục")');
    await expect(page.locator('text=HỢP LỆ')).toBeHidden();
  });

  test('Offline Storage and Sync Flow', async ({ page, context }) => {
    // Navigate and login
    await page.goto('/login');
    await page.fill('#staff-id-input', 'staff@ticketbox.vn');
    await page.fill('#password-input', '123456');
    await page.click('#login-submit-btn');
    await expect(page).toHaveURL('/checkin');
    
    // Simulate offline mode
    await context.setOffline(true);

    // Trigger the mock scan function
    const mockPayload = 'ticket-offline:valid-token:Cổng VIP (Tầng 1)';
    await page.evaluate((payload) => {
      if (typeof (window as any).mockScan === 'function') {
        (window as any).mockScan(payload);
      }
    }, mockPayload);

    // Because we are offline, it should show success but with an offline tag
    await expect(page.locator('text=LƯU OFFLINE')).toBeVisible();
    await page.click('button:has-text("Tiếp tục")');

    // Go to settings tab to check pending sync count
    await page.click('#tab-settings');
    await expect(page.locator('text=1 bản ghi')).toBeVisible();

    // Simulate online mode
    await context.setOffline(false);
    
    // Wait for auto-sync to complete (pending sync count becomes 0)
    await expect(page.locator('text=0 bản ghi')).toBeVisible();
  });
});
