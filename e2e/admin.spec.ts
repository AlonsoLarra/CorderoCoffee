import { test, expect } from "@playwright/test";

test.describe("Ruta de administración (/admin)", () => {
  test("redirige a /acceso cuando no hay sesión activa", async ({ page }) => {
    const response = await page.goto("/admin");

    // El middleware debe redirigir (307 → /acceso)
    await expect(page).toHaveURL(/\/acceso/);
    expect(response?.status()).toBeLessThan(400);
  });

  test("la redirección no genera un error de servidor", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
    await expect(page.getByText(/Internal Server Error/i)).not.toBeVisible();
  });
});
