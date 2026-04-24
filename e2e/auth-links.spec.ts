import { expect, test } from "@playwright/test";

test.describe("Auth public routes", () => {
  test("/acceso/verificar-email renders and handles an invalid token gracefully", async ({ page }) => {
    await page.route("**/api/auth/verify-email", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Token inválido" }),
      });
    });

    await page.goto("/acceso/verificar-email?token=test-token");

    await expect(page.getByRole("heading", { name: /verificando tu correo/i })).toBeVisible();
    await expect(page.getByText(/token inválido/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /volver al inicio/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /reenviar correo/i })).toBeVisible();
  });

  test("/acceso/nueva-contrasena with custom token shows the reset form", async ({ page }) => {
    await page.goto("/acceso/nueva-contrasena?token=test-token");

    await expect(page.getByRole("heading", { name: /nueva contraseña/i })).toBeVisible();
    await expect(page.getByLabel(/nueva contraseña/i)).toBeVisible();
    await expect(page.getByLabel(/confirmar contraseña/i)).toBeVisible();
    await expect(page.getByRole("button")).toContainText(/guardar|actualizar|continuar|cambiar/i);
  });
});