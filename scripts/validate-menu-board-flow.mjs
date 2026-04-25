import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3001";
const adminEmail = process.env.TEST_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables for validation.");
}

if (!adminEmail || !adminPassword) {
  throw new Error("Missing test admin credentials for validation.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const timestamp = Date.now();
const tempNames = [
  `ZZ Validacion board A ${timestamp}`,
  `ZZ Validacion board B ${timestamp}`,
];

const cleanupIds = [];
let browser;

async function createTempItems() {
  const { data, error } = await supabase
    .from("menu_items")
    .insert(
      tempNames.map((name, index) => ({
        category_id: null,
        name,
        description: "Temporal para validar Sin categorizar.",
        price: 99 + index,
        is_active: false,
        sort_order: 9000 + index * 10,
      })),
    )
    .select("id,name,category_id,sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`DB validation failed while creating uncategorized items: ${error.message}`);
  }

  cleanupIds.push(...(data ?? []).map((item) => item.id));
  return data ?? [];
}

async function deleteTempItems() {
  if (cleanupIds.length === 0) {
    return;
  }

  await supabase.from("menu_items").delete().in("id", cleanupIds);
}

async function waitForItemCategory(itemId, expectedCategoryId) {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("menu_items")
      .select("category_id")
      .eq("id", itemId)
      .maybeSingle();

    if (error) {
      throw new Error(`DB validation failed while reading moved item: ${error.message}`);
    }

    if ((data?.category_id ?? null) === expectedCategoryId) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(`Timed out waiting for item ${itemId} to move to category ${expectedCategoryId ?? "null"}.`);
}

async function waitForItemToMoveAbove(itemId, otherItemId) {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id,sort_order")
      .in("id", [itemId, otherItemId]);

    if (error) {
      throw new Error(`DB validation failed while reading sort order: ${error.message}`);
    }

    const moved = (data ?? []).find((row) => row.id === itemId);
    const other = (data ?? []).find((row) => row.id === otherItemId);

    if (moved && other && moved.sort_order < other.sort_order) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(`Timed out waiting for ${itemId} to move above ${otherItemId}.`);
}

function itemCard(page, name) {
  return page.locator("li").filter({ hasText: name }).first();
}

function lane(page, title) {
  return page
    .locator("article")
    .filter({
      has: page.locator("p.font-heading", { hasText: new RegExp(`^${title}$`) }),
    })
    .first();
}

async function login(page) {
  await page.goto(`${baseUrl}/acceso`, { waitUntil: "networkidle" });
  await page.locator("#email").fill(adminEmail);
  await page.locator("#password").fill(adminPassword);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL("**/admin", { timeout: 30000 });
}

async function openMenuTab(page) {
  await page.getByRole("button", { name: "Menú" }).click();
  await lane(page, "Sin categorizar").waitFor({ timeout: 30000 });
}

async function moveCardToCategory(page, itemName, categoryId) {
  const card = itemCard(page, itemName);
  await card.locator("select").first().selectOption(categoryId);
  const moveButton = card.getByRole("button", { name: "Mover" });
  await moveButton.waitFor({ state: "visible", timeout: 30000 });
  await moveButton.click();
}

async function pickTargetCategoryFromCard(page, itemName) {
  const card = itemCard(page, itemName);
  const options = await card
    .locator("select option")
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        value: node.value,
        label: (node.textContent ?? "").trim(),
      })),
    );

  const picked = options.find((option) => option.value && option.value !== "__uncategorized__");
  if (!picked) {
    throw new Error("No destination category available in UI selector.");
  }

  return {
    id: picked.value,
    laneTitle: picked.label.replace(/ \(pausada\)$/, ""),
  };
}

async function assertLaneContains(page, laneTitle, itemName) {
  const deadline = Date.now() + 30000;
  let lastNames = [];

  while (Date.now() < deadline) {
    const names = await getLaneItemNames(page, laneTitle);
    lastNames = names;
    if (names.includes(itemName)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  const actualLane = await findLaneForItem(page, itemName);
  throw new Error(
    `Expected ${itemName} in lane ${laneTitle}. Found in expected lane: ${lastNames.join(" | ")}. Actual lane: ${actualLane ?? "none"}`,
  );
}

async function assertLaneNotContains(page, laneTitle, itemName) {
  const deadline = Date.now() + 30000;
  let lastNames = [];

  while (Date.now() < deadline) {
    const names = await getLaneItemNames(page, laneTitle);
    lastNames = names;
    if (!names.includes(itemName)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error(`Did not expect ${itemName} in lane ${laneTitle}. Found: ${lastNames.join(" | ")}`);
}

async function getLaneItemNames(page, laneTitle) {
  const targetLane = lane(page, laneTitle);
  const cards = targetLane.locator("li");
  const count = await cards.count();
  const names = [];

  for (let index = 0; index < count; index += 1) {
    const text = await cards.nth(index).locator("p.text-sm.font-semibold.leading-tight.text-cordero-espresso").first().textContent();
    if (text) {
      names.push(text.trim());
    }
  }

  return names;
}

async function findLaneForItem(page, itemName) {
  const laneTitles = await page.locator("article p.font-heading.text-2xl.text-cordero-espresso").allTextContents();

  for (const laneTitle of laneTitles.map((title) => title.trim()).filter(Boolean)) {
    const names = await getLaneItemNames(page, laneTitle);
    if (names.includes(itemName)) {
      return laneTitle;
    }
  }

  return null;
}

try {
  const [createdA, createdB] = await createTempItems();
  if (!createdA || !createdB) {
    throw new Error("Failed to create enough temp items for validation.");
  }

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await login(page);
  await openMenuTab(page);

  const targetCategory = await pickTargetCategoryFromCard(page, createdA.name);

  await assertLaneContains(page, "Sin categorizar", createdA.name);
  await assertLaneContains(page, "Sin categorizar", createdB.name);

  await moveCardToCategory(page, createdA.name, targetCategory.id);
  await waitForItemCategory(createdA.id, targetCategory.id);
  await page.reload({ waitUntil: "networkidle" });
  await openMenuTab(page);
  await assertLaneNotContains(page, "Sin categorizar", createdA.name);
  await assertLaneContains(page, targetCategory.laneTitle, createdA.name);

  await moveCardToCategory(page, createdB.name, targetCategory.id);
  await waitForItemCategory(createdB.id, targetCategory.id);
  await page.reload({ waitUntil: "networkidle" });
  await openMenuTab(page);
  await assertLaneNotContains(page, "Sin categorizar", createdB.name);
  await assertLaneContains(page, targetCategory.laneTitle, createdB.name);

  const secondCard = itemCard(page, createdB.name);
  await secondCard.getByRole("button", { name: new RegExp(`Subir ${createdB.name}`) }).click();

  await waitForItemToMoveAbove(createdB.id, createdA.id);
  await page.reload({ waitUntil: "networkidle" });
  await openMenuTab(page);

  const orderedNames = await getLaneItemNames(page, targetCategory.laneTitle);
  const firstIndex = orderedNames.indexOf(createdA.name);
  const secondIndex = orderedNames.indexOf(createdB.name);

  if (firstIndex === -1 || secondIndex === -1 || secondIndex > firstIndex) {
    throw new Error(`Expected ${createdB.name} to move above ${createdA.name}, got order: ${orderedNames.join(" | ")}`);
  }

  console.log(JSON.stringify({
    ok: true,
    category: targetCategory.laneTitle,
    created: [createdA.name, createdB.name],
    orderAfterMove: orderedNames,
  }));
} finally {
  if (browser) {
    await browser.close();
  }
  await deleteTempItems();
}
