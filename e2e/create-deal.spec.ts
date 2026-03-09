import { test, expect } from '@playwright/test'

test.describe('Create Deal -> Appears in Kanban', () => {
  test('should create a new deal and see it on the kanban board', async ({ page }) => {
    await page.goto('/boards')
    await page.waitForLoadState('networkidle')

    // Click the "Novo Negócio" button to open the modal
    const createButton = page.getByRole('button', { name: /novo neg[oó]cio/i })
    await expect(createButton).toBeVisible({ timeout: 15_000 })
    await createButton.click()

    // Wait for the modal to appear
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible({ timeout: 5_000 })

    // Search for an existing contact via the combobox
    const contactSearch = modal.getByRole('combobox').first()
    if (await contactSearch.isVisible()) {
      await contactSearch.fill('teste')
      // Wait for search results and click first option
      const option = modal.getByRole('option').first()
      await expect(option).toBeVisible({ timeout: 10_000 })
      await option.click()
    } else {
      // If no combobox, try the "Buscar" tab first
      const searchTab = modal.getByText(/buscar/i).first()
      if (await searchTab.isVisible()) {
        await searchTab.click()
      }
      const searchInput = modal.locator('input[placeholder*="Buscar"], input[placeholder*="buscar"]').first()
      await searchInput.fill('teste')
      const option = modal.getByRole('option').first()
      await expect(option).toBeVisible({ timeout: 10_000 })
      await option.click()
    }

    // Submit the deal creation form
    const submitButton = modal.getByRole('button', { name: /criar neg[oó]cio/i })
    await expect(submitButton).toBeEnabled({ timeout: 5_000 })
    await submitButton.click()

    // Modal should close after creation
    await expect(modal).not.toBeVisible({ timeout: 10_000 })

    // The deal should now appear somewhere on the board (a deal card exists)
    const dealCards = page.locator('[data-deal-id]')
    await expect(dealCards.first()).toBeVisible({ timeout: 10_000 })
  })
})
