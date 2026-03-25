import { test, expect } from "@playwright/test";

test.describe("Página de acceso (/acceso)", () => {
  test("carga y muestra el formulario de login y registro", async ({ page }) => {
    await page.goto("/acceso");

    await expect(page).toHaveTitle(/Cordero Coffee/i);

    // Título de la página
    await expect(page.getByRole("heading", { name: /Acceso a Cordero/i })).toBeVisible();

    // Formulario de login
    await expect(page.getByRole("heading", { name: /Iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel(/correo electrónico/i).first()).toBeVisible();
    await expect(page.getByLabel(/contraseña/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Iniciar sesión/i })).toBeVisible();

    // Formulario de registro
    await expect(page.getByRole("heading", { name: /Crear cuenta/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Crear cuenta/i })).toBeVisible();
  });

  test("muestra links de navegación", async ({ page }) => {
    await page.goto("/acceso");

    await expect(page.getByRole("link", { name: /continuar como invitado/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /volver al inicio/i })).toBeVisible();
  });

  test("login con credenciales vacías no navega", async ({ page }) => {
    await page.goto("/acceso");

    // El botón submit con campos vacíos no debería navegar (HTML5 required)
    const emailInput = page.getByLabel(/correo electrónico/i).first();
    await expect(emailInput).toHaveAttribute("required");

    const passwordInput = page.getByLabel(/contraseña/i).first();
    await expect(passwordInput).toHaveAttribute("required");
  });

  test("link 'Continuar como invitado' lleva a /pedido", async ({ page }) => {
    await page.goto("/acceso");
    await page.getByRole("link", { name: /continuar como invitado/i }).click();
    await expect(page).toHaveURL(/\/pedido/);
  });

  test("link 'Volver al inicio' lleva a /", async ({ page }) => {
    await page.goto("/acceso");
    await page.getByRole("link", { name: /volver al inicio/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
