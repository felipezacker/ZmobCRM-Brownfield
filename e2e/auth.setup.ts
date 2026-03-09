import { test as setup, expect } from '@playwright/test'

const E2E_EMAIL = process.env.E2E_USER_EMAIL
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD

if (!E2E_EMAIL || !E2E_PASSWORD) {
  throw new Error(
    'E2E_USER_EMAIL and E2E_USER_PASSWORD environment variables are required. ' +
    'Set them in .env.local or export before running E2E tests.'
  )
}

setup('authenticate', async ({ page }) => {
  await page.goto('/login')

  await page.locator('#email-address').fill(E2E_EMAIL)
  await page.locator('#password').fill(E2E_PASSWORD)
  await page.getByRole('button', { name: /entrar/i }).click()

  // Wait for redirect to dashboard (authenticated)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })

  // Save authenticated state
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
})
