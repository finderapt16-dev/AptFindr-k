/**
 * Policy identifiers.
 *
 * Kept in its own tiny module so components can resolve a document id without
 * importing policyContent.js, which is code-split and only downloaded when a
 * popup actually opens.
 */

export const POLICY_AUDIENCES = ["tenant", "landlord"];
export const POLICY_KINDS = ["terms", "privacy"];

/** Maps an audience ("tenant" | "landlord") and kind ("terms" | "privacy") to a policy id. */
export function policyIdFor(audience, kind) {
  const resolvedAudience = audience === "landlord" ? "landlord" : "tenant";
  const resolvedKind = kind === "privacy" ? "privacy" : "terms";
  return `${resolvedAudience}-${resolvedKind}`;
}
