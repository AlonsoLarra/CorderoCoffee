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

  test("/acceso/nueva-contrasena without token shows invalid link state", async ({ page }) => {
    await page.goto("/acceso/nueva-contrasena");

    await expect(page.getByRole("heading", { name: /nueva contraseña/i })).toBeVisible();
    await expect(page.getByText(/no es válido o ya expiró/i)).toBeVisible();
  });

  test("/acceso/nueva-contrasena with custom token submits against the custom reset endpoint", async ({ page }) => {
    await page.route("**/api/auth/reset-password", async (route) => {
      const request = route.request();
      const body = request.postDataJSON() as { token?: string; password?: string };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: body.token === "test-token" && body.password === "password123",
          message: "Password reset successfully",
        }),
      });
    });

    await page.goto("/acceso/nueva-contrasena?token=test-token");

    await expect(page.getByRole("heading", { name: /nueva contraseña/i })).toBeVisible();
    await expect(page.getByLabel(/nueva contraseña/i)).toBeVisible();
    await expect(page.getByLabel(/confirmar contraseña/i)).toBeVisible();

    await page.getByLabel(/nueva contraseña/i).fill("password123");
    await page.getByLabel(/confirmar contraseña/i).fill("password123");
    await page.getByRole("button").click();

    await expect(page.getByText(/contraseña fue actualizada|contraseña actualizada|éxito/i)).toBeVisible();
  });
});