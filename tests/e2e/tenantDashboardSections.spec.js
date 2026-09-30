import { test, expect } from "@playwright/test";

const SUPABASE_URL = "https://supabase.test.invalid";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const SESSION_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;

/**
 * Backend mock for a signed-in tenant: seeds a Supabase session and answers
 * every request with an empty PostgREST-shaped payload, so the tenant
 * dashboard renders exactly as it does for a real tenant with no data yet.
 */
async function mockSignedInTenantBackend(page) {
  const appUser = {
    id: USER_ID,
    auth_id: USER_ID,
    name: "Juan Renter",
    email: "renter@example.com",
    username: "juanrenter",
    role: "tenant",
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
  await page.addInitScript(({ key, id, email }) => {
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
        user_metadata: { role: "tenant" },
        created_at: "2026-01-01T00:00:00.000Z",
      },
    }));
  }, { key: SESSION_STORAGE_KEY, id: USER_ID, email: appUser.email });
  return appUser;
}

/** Sidebar entry -> dashboard section container that must render for it. */
const TENANT_SECTIONS = [
  ["Notifications", ".tenant-notifications-container"],
  ["Settings", ".tenant-profile-settings"],
  ["Report a Problem", ".report-page"],
  ["Help", ".tenant-help-page"],
];

test("tenant dashboard sections open from the browse sidebar without an application error", async ({ page }) => {
  await mockSignedInTenantBackend(page);
  await page.goto("/browse");
  // Wait until the listings finished loading: the crash below only happens when
  // the dashboard renders content instead of its loading skeleton.
  await expect(page.getByRole("heading", { name: "Available Apartments" })).toBeVisible();

  for (const [label, sectionSelector] of TENANT_SECTIONS) {
    await page.locator(".app-sidebar").getByRole("button", { name: label }).click();

    await expect(page).toHaveURL(new RegExp(`/dashboard\\?section=`));
    await expect(page.locator(sectionSelector)).toBeVisible();
    await expect(page.getByText("Unexpected Application Error!")).toHaveCount(0);
  }
});

test("tenant dashboard keeps the requested section when the page is reloaded", async ({ page }) => {
  await mockSignedInTenantBackend(page);
  await page.goto("/dashboard?section=help");
  await expect(page.locator(".tenant-help-page")).toBeVisible();

  await page.reload();

  await expect(page.locator(".tenant-help-page")).toBeVisible();
  await expect(page.locator(".overview-section-container")).toHaveCount(0);
  await expect(page.getByText("Unexpected Application Error!")).toHaveCount(0);
});

test("tenant dashboard switches sections without falling back to the overview", async ({ page }) => {
  await mockSignedInTenantBackend(page);
  await page.goto("/dashboard?section=notifications");
  await expect(page.locator(".tenant-notifications-container")).toBeVisible();

  for (const [label, sectionSelector] of TENANT_SECTIONS.slice(1)) {
    await page.locator(".app-sidebar").getByRole("button", { name: label }).click();
    await expect(page.locator(sectionSelector)).toBeVisible();
    await expect(page.locator(".overview-section-container")).toHaveCount(0);
  }
});
