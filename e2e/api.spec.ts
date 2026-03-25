import { test, expect } from "@playwright/test";

test.describe("API routes", () => {
  test("POST /api/orders con payload vacío retorna 400", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/orders con payload malformado retorna 400", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: { invalid: true },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/orders retorna JSON válido en el error", async ({ request }) => {
    const res = await request.post("/api/orders", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    expect(body).toBeTruthy();
    // Debe tener al menos un campo descriptivo del error
    const hasErrorField =
      "error" in body || "message" in body || "errors" in body;
    expect(hasErrorField).toBe(true);
  });

  test("rutas de admin sin autenticación retornan 401 o 403", async ({ request }) => {
    const adminRoutes = [
      { method: "GET", path: "/api/admin/users" },
      { method: "GET", path: "/api/admin/menu/categories" },
      { method: "GET", path: "/api/admin/menu/items" },
    ];

    for (const { method, path } of adminRoutes) {
      const res =
        method === "GET"
          ? await request.get(path)
          : await request.post(path, { data: {} });

      expect(
        [401, 403],
        `${method} ${path} debe retornar 401 o 403 sin auth, recibió ${res.status()}`
      ).toContain(res.status());
    }
  });
});
