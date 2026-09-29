import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getPolicy, POLICY_IDS, POLICY_UPDATED, SUPPORT_EMAIL } from "../src/legal/policyContent.js";
import { policyIdFor } from "../src/legal/policyIds.js";
import { getCachedPolicy, loadPolicy, prefetchPolicy, resetPolicyCache } from "../src/legal/policyLoader.js";

const root = fileURLToPath(new URL("../", import.meta.url));

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(?:js|jsx)$/.test(entry) ? [full] : [];
  });
}

test("each role publishes exactly one terms and one privacy document", () => {
  assert.deepEqual(POLICY_IDS.sort(), ["landlord-privacy", "landlord-terms", "tenant-privacy", "tenant-terms"]);
  for (const [audience, kinds] of [["tenant", ["terms", "privacy"]], ["landlord", ["terms", "privacy"]]]) {
    for (const kind of kinds) {
      const id = policyIdFor(audience, kind);
      assert.equal(getPolicy(id).id, id);
      assert.equal(getPolicy(id).audience, audience);
      assert.equal(getPolicy(id).kind, kind);
    }
  }
});

test("policy ids fall back safely for unknown roles and links", () => {
  assert.equal(policyIdFor(undefined, undefined), "tenant-terms");
  assert.equal(policyIdFor("admin", "privacy"), "tenant-privacy");
  assert.equal(getPolicy("tenant-cookies"), null);
});

test("every document is complete enough to render the popup", () => {
  const trimmedSupportEmail = SUPPORT_EMAIL.trim();
  assert.ok(trimmedSupportEmail.includes("@"));
  for (const id of POLICY_IDS) {
    const policy = getPolicy(id);
    assert.ok(policy.title.length > 5, `${id} title`);
    assert.ok(policy.summary.length > 20, `${id} summary`);
    assert.equal(policy.updated, POLICY_UPDATED);
    assert.ok(policy.highlights.length >= 3, `${id} highlights`);
    assert.ok(policy.sections.length >= 8, `${id} section count`);
    const headings = policy.sections.map((section) => section.heading);
    assert.equal(new Set(headings).size, headings.length, `${id} duplicate headings`);
    assert.match(headings[0], /^1\.\s/, `${id} first heading numbering`);
    assert.ok(policy.sections.some((section) => (section.paragraphs ?? []).some((paragraph) => paragraph.includes(trimmedSupportEmail))), `${id} contact details`);
    for (const section of policy.sections) {
      assert.ok(/^\d+\.\s\S/.test(section.heading), `${id} heading format: ${section.heading}`);
      assert.ok((section.paragraphs?.length ?? 0) + (section.bullets?.length ?? 0) > 0, `${id} empty section: ${section.heading}`);
      for (const text of [...(section.paragraphs ?? []), ...(section.bullets ?? [])]) {
        assert.ok(text.trim().length > 20, `${id} short copy: ${text}`);
        assert.doesNotMatch(text, /lorem|TODO|TBD/i, `${id} placeholder copy`);
      }
    }
  }
});

test("tenant and landlord documents say different things for the same topic", () => {
  const tenantTerms = getPolicy("tenant-terms");
  const landlordTerms = getPolicy("landlord-terms");
  const tenantText = tenantTerms.sections.flatMap((section) => section.paragraphs ?? []).join(" ");
  const landlordText = landlordTerms.sections.flatMap((section) => section.paragraphs ?? []).join(" ");
  assert.match(tenantText, /deposit|advance payment/i);
  assert.match(landlordText, /permit|BIR|tax/i);
  assert.notEqual(tenantTerms.summary, landlordTerms.summary);
  assert.match(getPolicy("landlord-privacy").sections.map((section) => (section.paragraphs ?? []).join(" ")).join(" "), /verification/i);
});

test("the legal text is only reachable through the lazy loader", () => {
  const loaderSource = read("src/legal/policyLoader.js");
  assert.match(loaderSource, /import\("\.\/policyContent\.js"\)/, "loader must use a dynamic import");
  assert.doesNotMatch(loaderSource, /^import\s.*policyContent/m, "loader must not import the text statically");

  const offender = sourceFiles(path.join(root, "src"))
    .filter((file) => !file.endsWith(path.join("legal", "policyContent.js")))
    .find((file) => /from\s+["'][^"']*policyContent["']/.test(readFileSync(file, "utf8")));
  assert.equal(offender, undefined, `static policyContent import found in ${offender}`);
});

test("policy loader caches documents and survives repeated opens", async () => {
  resetPolicyCache();
  assert.equal(getCachedPolicy("tenant-terms"), null);
  const first = await loadPolicy("tenant-terms");
  assert.equal(first.title, "Tenant Terms of Service");
  assert.equal(getCachedPolicy("tenant-terms"), first);
  const second = await loadPolicy("tenant-terms");
  assert.equal(second, first, "second load must reuse the cached object");
  await prefetchPolicy("landlord-privacy");
  assert.equal(getCachedPolicy("landlord-privacy")?.title, "Landlord Privacy Policy");
  assert.doesNotThrow(() => prefetchPolicy("tenant-cookies"), "prefetch must never throw");
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(getCachedPolicy("tenant-cookies"), null, "unknown ids must not be cached");
  assert.equal(await loadPolicy("tenant-cookies"), null);
  resetPolicyCache();
  assert.equal(getCachedPolicy("tenant-terms"), null);
});

test("every app surface links to the right documents", () => {
  const expectations = [
    ["src/tenant/Settings.jsx", /<PolicyLinks[\s\S]*?audience="tenant"/],
    ["src/tenant/HelpSupport.jsx", /<PolicyLinks[\s\S]*?audience="tenant"/],
    ["src/landlord/LandlordSettings.jsx", /<PolicyLinks[\s\S]*?audience="landlord"/],
    ["src/landlord/LandlordHelpSupport.jsx", /<PolicyLinks[\s\S]*?audience="landlord"/],
    ["src/landing/Landing.jsx", /usePolicyDialog\("tenant"\)/],
    ["src/auth/Signup.jsx", /<SignupPolicyDialog[\s\S]*?role=/],
  ];
  for (const [files, pattern] of expectations) {
    const matched = files.split("|").some((file) => pattern.test(read(file)));
    assert.ok(matched, `missing policy wiring in ${files}`);
  }
  assert.match(read("src/styles/index.css"), /@import '\.\.\/legal\/legal\.css';/);
});
