import { test, expect } from "@playwright/test";

test.describe("Página de pedido (/pedido)", () => {
  test("carga correctamente", async ({ page }) => {
    await page.goto("/pedido");

    await expect(page).toHaveTitle(/Cordero Coffee/i);

    // Título principal
    await expect(page.getByRole("heading", { name: /Tu pedido/i })).toBeVisible();
  });

  test("muestra modo invitado cuando no hay sesión", async ({ page }) => {
    await page.goto("/pedido");

    await expect(
      page.getByText(/MODO INVITADO/i)
    ).toBeVisible();
  });

  test("muestra contenido del menú o mensaje de estado", async ({ page }) => {
    await page.goto("/pedido");

    // Debe mostrar el menú, o un mensaje de error de carga, o que no hay items activos
    // En cualquier caso, no debe mostrar un error 500
    const status = page.getByRole("main");
    await expect(status).toBeVisible();

    // No debe haber error de Next.js (página de error)
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
    await expect(page.getByText(/Internal Server Error/i)).not.toBeVisible();
  });

  test("links de navegación presentes", async ({ page }) => {
    await page.goto("/pedido");

    await expect(page.getByRole("link", { name: /volver al inicio/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /ver mis pedidos/i })).toBeVisible();
  });

  test("link 'Volver al inicio' navega a /", async ({ page }) => {
    await page.goto("/pedido");
    await page.getByRole("link", { name: /volver al inicio/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("página de confirmación carga sin crash", async ({ page }) => {
    await page.goto("/pedido/confirmacion");
    await expect(page).toHaveTitle(/Cordero Coffee/i);
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });
});
