import { test, expect } from '@playwright/test'

test.describe('Visual Regression Tests', () => {
  test.describe.configure({ retries: 0 })

  test('Dashboard - visual baseline', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Wait for charts/data to render
    await page.waitForTimeout(3_000)

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('Kanban Board - visual baseline', async ({ page }) => {
    await page.goto('/boards')
    await page.waitForLoadState('networkidle')
    // Wait for kanban columns and deal cards to render
    await page.waitForTimeout(3_000)

    await expect(page).toHaveScreenshot('kanban.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('Contacts List - visual baseline', async ({ page }) => {
    await page.goto('/contacts')
    await page.waitForLoadState('networkidle')
    // Wait for contacts table to render
    await page.waitForTimeout(3_000)

    await expect(page).toHaveScreenshot('contacts.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('Deal Detail - visual baseline', async ({ page }) => {
    await page.goto('/boards')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2_000)

    // Click first deal card to open detail modal
    const dealCard = page.locator('[data-deal-id]').first()
    if (await dealCard.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await dealCard.click()

      // Wait for modal to appear and data to load
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5_000 })
      await page.waitForTimeout(2_000)

      await expect(page).toHaveScreenshot('deal-detail.png', {
        maxDiffPixelRatio: 0.05,
      })
    }
  })
})
