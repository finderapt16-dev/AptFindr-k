import { test, expect } from "@playwright/test";

const SUPABASE_URL = "https://supabase.test.invalid";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const SESSION_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;

/**
 * Backend mock used by the visitor tests: no session, every Supabase call
 * answers with an empty PostgREST-shaped payload.
 */
async function mockBackend(page) {
  await page.routeWebSocket(/supabase\.test\.invalid/, () => {});
  await page.route(`${SUPABASE_URL}/**`, (route) =>
    route.fulfill({ json: [], headers: { "content-range": "0-0/0" } }));
}

/**
 * Backend mock for the signed-in tests: seeds a Supabase session in local
 * storage and answers the profile lookup with a real row, so the protected
 * settings pages render exactly as they do for a signed-in user.
 */
async function mockSignedInBackend(page, role) {
  const appUser = {
    id: USER_ID,
    auth_id: USER_ID,
    name: role === "landlord" ? "Maria Owner" : "Juan Renter",
    email: role === "landlord" ? "owner@example.com" : "renter@example.com",
    username: role === "landlord" ? "mariaowner" : "juanrenter",
    role,
    status: "active",
    mobile: "09170000000",
    created_at: "2026-01-01T00:00:00.000Z",
  };
  await page.routeWebSocket(/supabase\.test\.invalid/, () => {});
  await page.route(`${SUPABASE_URL}/**`, (route) => {
    const url = route.request().url();
    if (url.includes("/rest/v1/app_users") && url.includes("auth_id=eq.")) return route.fulfill({ json: appUser });
    if (url.includes("/rest/v1/app_users")) return route.fulfill({ json: [appUser], headers: { "content-range": "0-0/0" } });
    return route.fulfill({ json: [], headers: { "content-range": "0-0/0" } });
  });
  await page.addInitScript(({ key, id, email, role: seededRole }) => {
    window.localStorage.setItem(key, JSON.stringify({
      access_token: "test-access-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "test-refresh-token",
      user: {
        id,
        aud: "authenticated",
        role: "authenticated",
        email,
        email_confirmed_at: "2026-01-01T00:00:00.000Z",
        app_metadata: {},
        user_metadata: { role: seededRole },
        created_at: "2026-01-01T00:00:00.000Z",
      },
    }));
  }, { key: SESSION_STORAGE_KEY, id: USER_ID, email: appUser.email, role });
  return appUser;
}

test("landing footer opens the terms and privacy popups without leaving the page", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/");
  const footer = page.locator(".landing-footer");

  await footer.getByRole("button", { name: "Terms of Service" }).hover();
  await footer.getByRole("button", { name: "Terms of Service" }).click();
  const terms = page.getByRole("dialog", { name: "Terms of Service" });
  await expect(terms).toBeVisible();
  expect(await terms.evaluate((node) => node.parentElement === document.body)).toBe(true);
  await expect(terms.getByText("In short")).toHaveCount(0);
  await expect(terms.getByText("1. Platform Usage")).toBeVisible();
  await expect(terms.getByText(/Last updated/)).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);

  await page.keyboard.press("Escape");
  await expect(terms).toBeHidden();
  await expect(footer.getByRole("button", { name: "Terms of Service" })).toBeFocused();

  await footer.getByRole("button", { name: "Privacy Policy" }).click();
  const privacy = page.getByRole("dialog", { name: "Privacy Policy" });
  await expect(privacy).toBeVisible();
  await expect(privacy.getByText("1. Information We Collect")).toBeVisible();
  await privacy.getByRole("button", { name: "Close", exact: true }).click();
  await expect(privacy).toBeHidden();
});

test("the legal text is downloaded only when a policy is opened", async ({ page }) => {
  const policyRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("policyContent")) policyRequests.push(request.url());
  });
  await mockBackend(page);
  await page.goto("/");
  await expect(page.locator(".landing-footer")).toBeVisible();
  expect(policyRequests, "policy text must stay out of the initial page load").toHaveLength(0);

  const termsLink = page.locator(".landing-footer").getByRole("button", { name: "Terms of Service" });
  await termsLink.hover();
  await termsLink.click();
  await expect(page.getByRole("dialog", { name: "Terms of Service" })).toBeVisible();
  expect(policyRequests.length, "opening a policy must request the chunk once").toBeGreaterThan(0);
  const firstRequestCount = policyRequests.length;
  await page.keyboard.press("Escape");
  await page.locator(".landing-footer").getByRole("button", { name: "Privacy Policy" }).click();
  await expect(page.getByRole("dialog", { name: "Privacy Policy" })).toBeVisible();
  expect(policyRequests).toHaveLength(firstRequestCount);
});

test("signup consent links open the document for the selected role", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/signup");

  await page.getByRole("button", { name: /^Tenant/ }).click();
  await page.getByRole("button", { name: "Terms of Service" }).click();
  const tenantTerms = page.getByRole("dialog", { name: "Terms of Service" });
  await expect(tenantTerms).toBeVisible();
  await expect(tenantTerms.getByText("5. Prohibited Conduct")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tenantTerms).toBeHidden();
  await expect(page.getByRole("button", { name: "Terms of Service" })).toBeFocused();
  await expect(page.locator(".signup-form-shell")).toBeVisible();
  await expect(page.locator(".signup-checkbox")).not.toBeChecked();

  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: /^Landlord/ }).click();
  await page.getByRole("button", { name: "Privacy Policy" }).click();
  const landlordPrivacy = page.getByRole("dialog", { name: "Privacy Policy" });
  await expect(landlordPrivacy).toBeVisible();
  await expect(landlordPrivacy.getByText("2. How Information is Used")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(landlordPrivacy).toBeHidden();
});

test("policy popups stay inside small screens and keep their own scroll", async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await mockBackend(page);
    await page.goto("/");
    await page.locator(".landing-footer").getByRole("button", { name: "Privacy Policy" }).click();
    const dialog = page.getByRole("dialog", { name: "Privacy Policy" });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    const scrollable = await dialog.locator(".apf-policy-scroll").evaluate((node) => node.scrollHeight > node.clientHeight);
    if (viewport.height < 600) expect(scrollable).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
});

test("tenant Settings exposes both tenant documents as popups", async ({ page }) => {
  await mockSignedInBackend(page, "tenant");
  await page.goto("/settings");
  const legal = page.locator(".tenant-profile-legal");
  await expect(legal).toBeVisible();
  await expect(legal.getByRole("heading", { name: "Legal & Policies" })).toBeVisible();

  await legal.getByRole("button", { name: /Terms of Service/ }).click();
  const terms = page.getByRole("dialog", { name: "Terms of Service" });
  await expect(terms).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(terms).toBeHidden();

  await legal.getByRole("button", { name: /Privacy Policy/ }).click();
  await expect(page.getByRole("dialog", { name: "Privacy Policy" })).toBeVisible();
});

test("landlord Settings exposes both landlord documents as popups", async ({ page }) => {
  await mockSignedInBackend(page, "landlord");
  await page.goto("/dashboard?section=settings");
  const legal = page.locator(".landlord-settings-legal");
  await expect(legal).toBeVisible({ timeout: 15000 });

  await legal.getByRole("button", { name: /Terms of Service/ }).click();
  const terms = page.getByRole("dialog", { name: "Terms of Service" });
  await expect(terms).toBeVisible();
  await expect(terms.getByText(/2\. Account Information/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(terms).toBeHidden();

  await legal.getByRole("button", { name: /Privacy Policy/ }).click();
  await expect(page.getByRole("dialog", { name: "Privacy Policy" })).toBeVisible();
});
