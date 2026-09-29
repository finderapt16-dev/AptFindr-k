import { test, expect } from "@playwright/test";

async function mockBackend(page) {
  const signups = [];
  await page.routeWebSocket(/supabase\.test\.invalid/, () => {});
  await page.route("https://supabase.test.invalid/**", async (route) => {
    const request = route.request();
    if (request.url().includes("/auth/v1/signup")) {
      const payload = request.postDataJSON();
      signups.push(payload);
      await route.fulfill({ json: { user: { id: "11111111-1111-1111-1111-111111111111", email: payload.email, user_metadata: payload.data, app_metadata: { provider: "email" }, identities: [{ id: "identity" }], created_at: new Date().toISOString() }, session: null } });
    } else {
      await route.fulfill({ json: [], headers: { "content-range": "0-0/0" } });
    }
  });
  return signups;
}
async function openSignup(page, role = "Landlord") {
  await page.goto("/signup");
  await page.getByRole("button", { name: new RegExp(`^${role}`) }).click();
}
async function fillAccount(page) {
  await page.getByLabel(/^Username/).fill("jamesreid");
  await page.getByLabel(/^Email Address/).fill("james@example.com");
  await page.getByLabel(/^Password/).fill("SecurePass1!");
  await page.getByLabel(/^Confirm Password/).fill("SecurePass1!");
}
async function reachReview(page) {
  await fillAccount(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel(/^First Name/).fill("James");
  await page.getByLabel(/^Last Name/).fill("Reid");
  await page.getByLabel(/^Mobile Number/).fill("+63 917 123 4567");
  await page.getByLabel("Business Name (Optional)").fill("James Apartment");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review", exact: true })).toBeVisible();
}

test("tenant form has Google signup and creates only with valid data / consent", async ({ page }) => {
  const signups = await mockBackend(page);
  await openSignup(page, "Tenant");
  await expect(page.getByRole("button", { name: "Sign Up with Google" })).toBeVisible();
  await fillAccount(page);
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("must agree");
  expect(signups).toHaveLength(0);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(signups).toHaveLength(1);
  expect(signups[0].data.role).toBe("tenant");
});

test("landlord wizard validates and Enter advances instead of registering", async ({ page }) => {
  const signups = await mockBackend(page);
  await openSignup(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator('[name="username"]')).toHaveAttribute("aria-invalid", "true");
  await fillAccount(page);
  await page.getByLabel(/^Confirm Password/).press("Enter");
  await expect(page.getByRole("heading", { name: "Personal Information", exact: true })).toBeVisible();
  expect(signups).toHaveLength(0);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel(/^Username/)).toHaveValue("jamesreid");
});

test("floating Review edit validates, cancels, saves and confirms without leaving Review", async ({ page }) => {
  const signups = await mockBackend(page);
  await openSignup(page);
  await reachReview(page);
  await page.getByRole("button", { name: "Edit account details" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((node) => node.parentElement === document.body)).toBe(true);
  await dialog.getByLabel(/^Username/).fill("invalid name");
  await dialog.getByRole("button", { name: "Save Changes" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("jamesreid", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit account details" }).click();
  await page.getByRole("dialog").getByLabel(/^Username/).fill("updated_james");
  await page.getByRole("dialog").getByLabel(/^Recovery Email/).press("Enter");
  await expect(page.getByRole("heading", { name: "Account Details Updated" })).toBeVisible();
  expect(signups).toHaveLength(0);
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByText("updated_james", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit personal information" }).click();
  await page.getByRole("dialog").getByLabel("Business Name (Optional)").fill("New Apartment");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(signups[0].data.businessName).toBe("New Apartment");
  expect(signups[0].data.username).toBe("updated_james");
});

test("nested editor Escape closes only the editor and restores focus", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  await page.getByRole("button", { name: /^Landlord/ }).click();
  await reachReview(page);
  await page.getByRole("button", { name: "Edit account details" }).click();
  await expect(page.locator(".signup-review-dialog input").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Create an AptFindr account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit account details" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Review", exact: true })).toBeVisible();
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`mobile floating signup and editor stay inside ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockBackend(page);
    await page.goto("/login");
    await page.getByRole("button", { name: /^Create account$/i }).click();
    await page.getByRole("button", { name: /^Landlord/ }).click();
    await reachReview(page);
    await page.getByRole("button", { name: "Edit personal information" }).click();
    const editor = page.locator(".signup-review-dialog");
    const box = await editor.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.getByRole("button", { name: "OK", exact: true }).click();
    await expect(page.locator(".landing-signup-modal")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
