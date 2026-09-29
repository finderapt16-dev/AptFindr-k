import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { getSignupFullName, normalizeSignupValues, validateAccountDetails, validatePersonalInformation, validateSignupPassword } from "../src/auth/signupValidation.js";
import { seedLandlordSignupBusinessName } from "../src/services/landlordSignupProfile.js";

const account = { username: "jamesreid", email: "james@example.com", password: "SecurePass1!", confirmPassword: "SecurePass1!" };
const personal = { firstName: "James", lastName: "Reid", middleInitial: "M", mobileNumber: "+63 917 123 4567", businessName: "James Apartment" };

test("valid account and personal information advance the wizard", () => {
  assert.deepEqual(validateAccountDetails(account), {});
  assert.deepEqual(validatePersonalInformation(personal), {});
});
test("password policy matches the screenshot and confirmation must match", () => {
  for (const password of ["Short1!", "lowercase1!", "UPPERCASE1!", "NoNumbers!", "NoSymbols123"]) assert.ok(validateSignupPassword(password));
  assert.equal(validateSignupPassword(account.password), "");
  assert.ok(validateAccountDetails({ ...account, confirmPassword: "other" }).confirmPassword);
});
test("review editor validates username/email without asking for a password", () => {
  assert.deepEqual(validateAccountDetails({ username: account.username, email: account.email }, { includePassword: false }), {});
  assert.ok(validateAccountDetails({ username: "bad name", email: "a@@b.com" }, { includePassword: false }).username);
  assert.ok(validateAccountDetails({ username: "valid_user", email: "a@@b.com" }, { includePassword: false }).email);
});
test("personal fields are validated; business name and initial are optional", () => {
  assert.deepEqual(validatePersonalInformation({ ...personal, middleInitial: "", businessName: "" }), {});
  assert.ok(validatePersonalInformation({ ...personal, firstName: " ", mobileNumber: "123" }).firstName);
  assert.ok(validatePersonalInformation({ ...personal, mobileNumber: "123" }).mobileNumber);
  assert.ok(validatePersonalInformation({ ...personal, middleInitial: "Name" }).middleInitial);
});
test("normalization trims names but preserves password characters", () => {
  const values = normalizeSignupValues({ ...personal, firstName: " James ", middleInitial: "m.", password: " password " });
  assert.equal(values.password, " password ");
  assert.equal(getSignupFullName(values), "James M. Reid");
  assert.equal(getSignupFullName({ ...personal, middleInitial: "" }), "James Reid");
});
test("PWA icon paths exist, including 192/512 PNGs and the Apple icon", () => {
  const manifest = JSON.parse(readFileSync(new URL("../public/manifest.webmanifest", import.meta.url)));
  for (const icon of manifest.icons) assert.ok(existsSync(new URL(`../public${icon.src.split("?")[0]}`, import.meta.url)), icon.src);
  for (const size of [192, 512]) assert.ok(manifest.icons.some((icon) => icon.sizes === `${size}x${size}` && icon.type === "image/png"));
  assert.ok(existsSync(new URL("../public/icons/apple-touch-icon.png", import.meta.url)));
  assert.equal(manifest.display, "standalone");
});

function profileClient(existingName) {
  const updates = [];
  const chain = { select() { return this; }, eq() { return this; }, is() { return this; }, maybeSingle: async () => ({ data: { business_name: existingName }, error: null }), update(payload) { updates.push(payload); return this; }, then(resolve) { return Promise.resolve({ error: null }).then(resolve); } };
  return { client: { from: () => chain }, updates };
}
test("signup business name seeds an empty profile", async () => {
  const { client, updates } = profileClient(null);
  await seedLandlordSignupBusinessName(client, "id", " James Apartment ");
  assert.deepEqual(updates, [{ business_name: "James Apartment" }]);
});
test("signup metadata never overwrites a business name saved in Settings", async () => {
  const { client, updates } = profileClient("Updated Business");
  await seedLandlordSignupBusinessName(client, "id", "Old Signup Business");
  assert.deepEqual(updates, []);
});
