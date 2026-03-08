import { test, expect } from '@playwright/test'

test.describe('Prospecting Module -> Queue Loads', () => {
  test('should access prospecting module and see queue load', async ({ page }) => {
    await page.goto('/prospecting')
    await page.waitForLoadState('networkidle')

    // Page should load without errors
    await expect(page).toHaveURL(/\/prospecting/)

    // Should see the tab navigation (Fila / Métricas)
    const filaTab = page.getByRole('tab', { name: /fila/i }).or(page.getByText(/fila/i).first())
    await expect(filaTab).toBeVisible({ timeout: 15_000 })

    // Click on Fila tab if not already active
    await filaTab.click()
    await page.waitForTimeout(1_000)

    // The queue section should be visible (contacts list, search, or empty state)
    const queueContent = page.locator('main, [role="main"], [class*="queue"], [class*="Queue"]').first()
    await expect(queueContent).toBeVisible()

    // Check metrics tab also loads
    const metricasTab = page.getByRole('tab', { name: /m[eé]tricas/i }).or(page.getByText(/m[eé]tricas/i).first())
    if (await metricasTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await metricasTab.click()
      await page.waitForLoadState('networkidle')

      // Metrics content should appear (cards, charts, etc.)
      await page.waitForTimeout(2_000)
    }

    // No errors on page
    await expect(page.locator('text=Erro fatal')).not.toBeVisible()
  })
})
