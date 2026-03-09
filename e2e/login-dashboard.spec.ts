import { test, expect } from '@playwright/test'

test.describe('Login -> Dashboard', () => {
  test('should load dashboard with real data after login', async ({ page }) => {
    await page.goto('/dashboard')

    // Dashboard should be accessible (auth state from setup)
    await expect(page).toHaveURL(/\/dashboard/)

    // Wait for data to load
    await page.waitForLoadState('networkidle')

    // Dashboard should show stat cards with metrics
    const statCards = page.locator('[class*="stat"], [class*="card"], [class*="Card"]').first()
    await expect(statCards).toBeVisible({ timeout: 15_000 })

    // Should display the dashboard heading or recognizable CRM content
    const dashboardContent = page.locator('main, [role="main"]').first()
    await expect(dashboardContent).toBeVisible()

    // Page should not show error states
    await expect(page.locator('text=Erro')).not.toBeVisible()
    await expect(page.locator('text=error')).not.toBeVisible()
  })
})
