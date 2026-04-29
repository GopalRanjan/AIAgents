import { test, expect } from '@playwright/test';

test.describe('Login Page Tests', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    // Navigate to the login page
    await page.goto('https://rahulshettyacademy.com/loginpagePractise/');
    
    // Fill in username
    await page.fill('#username', 'rahulshetty');
    
    // Fill in password
    await page.fill('#password', 'learning');
    
    // Click the Sign In button
    await page.click('#signInBtn');
    
    // Wait for navigation and verify successful login
    await page.waitForLoadState('networkidle');
    
    // Verify we're logged in by checking for the logout button or dashboard elements
    await expect(page.locator('body')).not.toContainText('Login Page Practise');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Navigate to the login page
    await page.goto('https://rahulshettyacademy.com/loginpagePractise/');
    
    // Fill in invalid username
    await page.fill('#username', 'invaliduser');
    
    // Fill in invalid password
    await page.fill('#password', 'wrongpassword');
    
    // Click the Sign In button
    await page.click('#signInBtn');
    
    // Verify error message is displayed
    await expect(page.locator('.alert-danger')).toContainText('Incorrect username/password');
  });
});