import { ChevronRight, FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { usePolicyDialog } from "./usePolicyDialog";

/**
 * Drop-in legal section: a short explanation plus the two policy buttons and
 * the popup they open. Used by the tenant Settings page, the landlord Security
 * tab, and both Help & Support pages, so the wording and behaviour stay
 * identical everywhere.
 */
export function PolicyLinks({
  audience = "tenant",
  title = "Legal & Policies",
  description = "Read the rules and the privacy practices that apply to your AptFindr account.",
  className,
}) {
  const { policyLinkProps, policyDialog } = usePolicyDialog(audience);
  const documents = [
    { id: `${audience === "landlord" ? "landlord" : "tenant"}-terms`, label: "Terms of Service", hint: "Rules for using AptFindr", icon: FileText },
    { id: `${audience === "landlord" ? "landlord" : "tenant"}-privacy`, label: "Privacy Policy", hint: "How your information is handled", icon: ShieldCheck },
  ];

  return (
    <section className={cn("apf-legal-section", className)} aria-label={title}>
      <div className="apf-legal-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="apf-legal-actions">
        {documents.map(({ id, label, hint, icon: Icon }) => (
          <button key={id} className="apf-legal-action" {...policyLinkProps(id)}>
            <span className="apf-legal-action-icon"><Icon aria-hidden="true" /></span>
            <span className="apf-legal-action-copy">
              <span className="apf-legal-action-label">{label}</span>
              <span className="apf-legal-action-hint">{hint}</span>
            </span>
            <ChevronRight className="apf-legal-action-chevron" aria-hidden="true" />
          </button>
        ))}
      </div>
      {policyDialog}
    </section>
  );
}
