import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

// Short, in-context explanations of the existing registration agreements.
// Keep signup data in place while the user reads either policy.
const policies = {
  terms: {
    title: "Terms of Service",
    description: "Using AptFindr responsibly.",
    paragraphs: [
      "AptFindr helps tenants discover apartments and landlords manage listings in La Paz, Iloilo City. Provide accurate account and property information, keep your password private, and do not submit misleading listings or reports.",
      "Landlord accounts and property verification information may be reviewed by the administrator. Creating an account does not approve a landlord or publish a property. Listings become visible to tenants only after the required verification and publication approval.",
      "Use the in-app Help & Support section to report an account or listing problem. AptFindr does not guarantee that a property will be available or that an inquiry will result in a rental agreement.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    description: "Information used to create and manage your account.",
    paragraphs: [
      "Registration uses your username, email address, and password. Landlord registration also uses your name, optional middle initial, mobile number, and optional business name. Supabase manages account authentication and email verification.",
      "Your email is used for verification, password recovery, and account notices. Landlord profile and verification details support property management and administrator review. Documents submitted for verification are handled separately from public property photos.",
      "Keep personal or sensitive information out of public listing descriptions. After signing in, use Settings to manage your account information and Help & Support for privacy-related questions.",
    ],
  },
};

export function SignupPolicyDialog({ policy, onClose, returnFocusRef }) {
  const content = policies[policy];
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent onEscapeKeyDown={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }} onKeyDownCapture={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }} className="signup-review-dialog signup-policy-dialog" overlayClassName="signup-review-overlay" onCloseAutoFocus={(event) => {
        event.preventDefault();
        returnFocusRef.current?.focus();
      }}>
        <DialogTitle>{content.title}</DialogTitle>
        <DialogDescription>{content.description}</DialogDescription>
        <div className="signup-policy-copy">{content.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
        <button type="button" className="signup-primary-button" onClick={onClose}>Back to signup</button>
      </DialogContent>
    </Dialog>
  );
}

export function SignupAgreement({ checked, onChange, disabled, onPolicyClick }) {
  return (
    <label className="signup-agreement">
      <input name="termsAccepted" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} className="signup-checkbox" aria-label="I agree to the Terms of Service and Privacy Policy" />
      <span>
        I agree to the {" "}
        <button type="button" className="signup-policy-link" disabled={disabled} onClick={(event) => { event.preventDefault(); onPolicyClick("terms", event.currentTarget); }}>Terms of Service</button>
        {" "}and{" "}
        <button type="button" className="signup-policy-link" disabled={disabled} onClick={(event) => { event.preventDefault(); onPolicyClick("privacy", event.currentTarget); }}>Privacy Policy</button>.
      </span>
    </label>
  );
}
