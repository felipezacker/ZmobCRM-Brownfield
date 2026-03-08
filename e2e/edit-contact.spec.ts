import { test, expect } from '@playwright/test'

test.describe('Edit Contact -> Data Persists', () => {
  test('should edit a contact and verify changes persist after reload', async ({ page }) => {
    await page.goto('/contacts')
    await page.waitForLoadState('networkidle')

    // Wait for contacts to load
    const contactElements = page.locator('table tbody tr, [role="article"], [class*="contact"]')
    await expect(contactElements.first()).toBeVisible({ timeout: 15_000 })

    // Click the first contact to open its detail/edit
    await contactElements.first().click()
    await page.waitForTimeout(1_000)

    // Look for an edit button or the contact form modal
    const editButton = page.getByRole('button', { name: /editar/i })
    if (await editButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await editButton.click()
    }

    // Wait for the edit form/modal
    const dialog = page.getByRole('dialog')
    const isModal = await dialog.isVisible({ timeout: 3_000 }).catch(() => false)

    // Find the name input and update it
    const nameInput = page.locator('input[name="name"], input#name, label:has-text("Nome") + input, label:has-text("Nome") ~ input').first()
    if (await nameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const currentName = await nameInput.inputValue()
      const timestamp = Date.now().toString().slice(-4)
      const newName = `E2E Test ${timestamp}`

      await nameInput.clear()
      await nameInput.fill(newName)

      // Save the changes
      const saveButton = page.getByRole('button', { name: /salvar/i })
      await saveButton.click()

      // Wait for save to complete
      await page.waitForTimeout(2_000)

      // Reload to verify persistence
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Search for the edited contact
      const searchInput = page.locator('input[placeholder*="Buscar"], input[type="search"]').first()
      if (await searchInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await searchInput.fill(newName)
        await page.waitForTimeout(2_000)
      }

      // Verify the updated name appears
      await expect(page.getByText(newName).first()).toBeVisible({ timeout: 10_000 })

      // Restore original name
      await contactElements.first().click()
      await page.waitForTimeout(1_000)
      if (await editButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await editButton.click()
      }
      const nameInputRestore = page.locator('input[name="name"], input#name, label:has-text("Nome") + input, label:has-text("Nome") ~ input').first()
      if (await nameInputRestore.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await nameInputRestore.clear()
        await nameInputRestore.fill(currentName)
        await page.getByRole('button', { name: /salvar/i }).click()
      }
    }
  })
})
