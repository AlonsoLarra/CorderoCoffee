import { test, expect } from "@playwright/test";

test.describe("Página principal (pública)", () => {
  test("carga correctamente y muestra el logo y tagline", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Cordero Coffee/i);

    // Logo visible
    const logo = page.getByRole("img", { name: /Cordero Coffee Club/i });
    await expect(logo).toBeVisible();

    // Tagline de marca
    await expect(
      page.getByText("Café de especialidad. Sin esperar.")
    ).toBeVisible();

    // Intro copy
    await expect(
      page.getByText(/Ordena en línea/)
    ).toBeVisible();
  });

  test("muestra los CTAs principales", async ({ page }) => {
    await page.goto("/");

    // Botón principal de pedido
    const hacerPedidoLinks = page.getByRole("link", { name: /hacer pedido/i });
    await expect(hacerPedidoLinks.first()).toBeVisible();

    // Link de login en nav
    const loginLink = page.getByRole("link", { name: /iniciar sesión/i }).first();
    await expect(loginLink).toBeVisible();
  });

  test("sección Cómo funciona tiene los 3 pasos", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Elige en línea")).toBeVisible();
    await expect(page.getByText("Elige tu momento")).toBeVisible();
    await expect(page.getByText("Llega y recoge")).toBeVisible();
  });

  test("navegación al pedido desde el CTA", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /hacer pedido/i }).first().click();
    await expect(page).toHaveURL(/\/pedido/);
  });

  test("navegación a acceso desde el nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /iniciar sesión/i }).first().click();
    await expect(page).toHaveURL(/\/acceso/);
  });
});
