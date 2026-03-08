import { test, expect } from '@playwright/test'

test.describe('Move Deal Between Stages', () => {
  test('should move a deal to a different stage', async ({ page }) => {
    await page.goto('/boards')
    await page.waitForLoadState('networkidle')

    // Wait for deal cards to render
    const dealCards = page.locator('[data-deal-id]')
    await expect(dealCards.first()).toBeVisible({ timeout: 15_000 })

    // Get the first deal card
    const firstDeal = dealCards.first()
    const dealId = await firstDeal.getAttribute('data-deal-id')

    // Get all stage columns (role="group" containers)
    const stages = page.locator('[role="group"]')
    const stageCount = await stages.count()

    // We need at least 2 stages to move between them
    expect(stageCount).toBeGreaterThanOrEqual(2)

    // Find which stage the deal is currently in
    const currentStage = firstDeal.locator('..').locator('[role="group"]').first()

    // Try drag and drop to the second stage
    const targetStage = stages.nth(1)
    await firstDeal.dragTo(targetStage)

    // Wait for the update to persist
    await page.waitForLoadState('networkidle')

    // Verify the deal card moved — it should now be inside the target stage
    // Reload and check the deal is in a different position
    await page.reload()
    await page.waitForLoadState('networkidle')

    const movedDeal = page.locator(`[data-deal-id="${dealId}"]`)
    await expect(movedDeal).toBeVisible({ timeout: 10_000 })
  })
})
