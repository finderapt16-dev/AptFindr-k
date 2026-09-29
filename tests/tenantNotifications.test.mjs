import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { apartmentIdOf, notificationKind, relativeTime, reportIdOf, resolveActionLabel, resolveActionUrl, } from "../src/tenant/notificationPresentation.js";

const NOW = Date.parse("2026-09-29T12:00:00.000Z");

test("relativeTime buckets notifications without crashing on bad timestamps", () => {
  assert.equal(relativeTime("", NOW), "Recently");
  assert.equal(relativeTime(null, NOW), "Recently");
  assert.equal(relativeTime("not-a-date", NOW), "Recently");
  assert.equal(relativeTime("0000-00-00 00:00:00", NOW), "Recently");
  assert.equal(relativeTime(new Date(NOW - 30_000).toISOString(), NOW), "Just now");
  assert.equal(relativeTime(new Date(NOW - 60_000).toISOString(), NOW), "1 minute ago");
  assert.equal(relativeTime(new Date(NOW - 5 * 60_000).toISOString(), NOW), "5 minutes ago");
  assert.equal(relativeTime(new Date(NOW - 3_600_000).toISOString(), NOW), "1 hour ago");
  assert.equal(relativeTime(new Date(NOW - 6 * 3_600_000).toISOString(), NOW), "6 hours ago");
  assert.equal(relativeTime(new Date(NOW - 3 * 86_400_000).toISOString(), NOW), "3 days ago");
  // A future timestamp must not produce a negative age.
  assert.equal(relativeTime(new Date(NOW + 600_000).toISOString(), NOW), "Just now");
  // Old notifications fall back to an absolute, locale-formatted date.
  assert.match(relativeTime(new Date(NOW - 30 * 86_400_000).toISOString(), NOW), /2026/);
});

test("notificationKind groups report, apartment and system notifications", () => {
  assert.equal(notificationKind({ type: "report_dismissed" }), "report");
  assert.equal(notificationKind({ type: "report_status_updated" }), "report");
  assert.equal(notificationKind({ action_target_type: "report", type: "info" }), "report");
  assert.equal(notificationKind({ type: "apartment_published" }), "apartment");
  assert.equal(notificationKind({ type: "availability_changed" }), "apartment");
  assert.equal(notificationKind({ action_target_type: "apartment", type: "info" }), "apartment");
  assert.equal(notificationKind({ type: "admin_message" }), "system");
  assert.equal(notificationKind({}), "system");
  assert.equal(notificationKind(null), "system");
});

test("report and apartment ids resolve from action targets or payload", () => {
  assert.equal(reportIdOf({ action_target_type: "report", action_target_id: "rpt-1" }), "rpt-1");
  // Notifications written before action_target_* was populated keep working.
  assert.equal(reportIdOf({ type: "report_dismissed", payload: { report_id: "rpt-2" } }), "rpt-2");
  assert.equal(reportIdOf({ type: "report_dismissed", payload: { related_report_id: "rpt-3" } }), "rpt-3");
  assert.equal(reportIdOf({ type: "report_dismissed" }), "");
  assert.equal(apartmentIdOf({ action_target_type: "apartment", action_target_id: "apt-1" }), "apt-1");
  assert.equal(apartmentIdOf({ type: "apartment_published", payload: { apartment_id: "apt-2" } }), "apt-2");
  // A report notification must not leak its report id as an apartment id.
  assert.equal(apartmentIdOf({ action_target_type: "report", action_target_id: "rpt-1" }), "");
});

test("notification actions only render when there is somewhere to go", () => {
  // The bug this guards: "View Apartment" used to render with no action_url,
  // producing a button that did nothing on click.
  assert.equal(resolveActionUrl({ type: "apartment_published" }), "");
  assert.equal(resolveActionLabel({ type: "apartment_published" }), null);
  assert.equal(resolveActionUrl({ type: "apartment_published", payload: { apartment_id: "apt-2" } }), "/apartment/apt-2");
  assert.equal(resolveActionLabel({ type: "apartment_published", payload: { apartment_id: "apt-2" } }), "View Apartment");
  assert.equal(resolveActionUrl({ action_url: "/favorites" }), "/favorites");
  assert.equal(resolveActionLabel({ action_url: "/favorites", type: "admin_message" }), "View Update");
  assert.equal(resolveActionUrl({ payload: { action_url: "/dashboard?section=help" } }), "/dashboard?section=help");
  // Absolute urls are not routable inside the tenant shell.
  assert.equal(resolveActionUrl({ type: "admin_message", action_url: "https://example.com" }), "");
  assert.equal(resolveActionLabel({ type: "admin_message", action_url: "https://example.com" }), null);
  assert.equal(resolveActionLabel({ type: "report_dismissed" }), "View Report");
});

test("report notifications notify tenants with a routable report target", () => {
  const service = readFileSync(new URL("../src/services/dashboardSupabaseService.js", import.meta.url), "utf8");
  for (const fn of ["notifyReportResolved", "notifyReportDismissed"]) {
    const start = service.indexOf(`export async function ${fn}(`);
    assert.notEqual(start, -1, `${fn} should exist`);
    const body = service.slice(start, service.indexOf("\nexport ", start + 1));
    assert.match(body, /action_target_type: "report"/, `${fn} should tag the report target`);
    assert.match(body, /action_target_id: reportId/, `${fn} should carry the report id`);
  }
});
