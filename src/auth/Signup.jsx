import "./signup.css";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, ChevronRight, Home, Info, Pencil, Users } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { useAuth } from "@/contexts/AuthContext";
import { clearPendingGoogleOAuthFlow, isTenantRole, signupWithGoogle } from "@/services/authService";
import { SignupAccountFields, SignupPersonalFields } from "./SignupFields";
import { SignupReviewDialog } from "./SignupReviewDialog";
import { SignupAgreement, SignupPolicyDialog } from "./SignupPolicyDialog";
import { getSignupFullName, normalizeSignupValues, validateAccountDetails, validatePersonalInformation } from "./signupValidation";
import { useSignupViewport } from "./useSignupViewport";

const INITIAL_VALUES = {
  role: "", username: "", email: "", password: "", confirmPassword: "",
  firstName: "", lastName: "", middleInitial: "", mobileNumber: "", businessName: "",
};
const LANDLORD_STEPS = ["Account Details", "Personal Information", "Review"];

const dashboardPathForRole = (role) =>
  isTenantRole(role) ? "/dashboard?section=overview" : "/dashboard";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="signup-google-icon" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.23-.19-1.77H12v3.35h5.38a4.6 4.6 0 0 1-1.99 3.02l2.81 2.18c1.64-1.51 2.57-3.74 2.57-6.78Z" />
      <path fill="#34A853" d="M12 21.76c2.62 0 4.82-.86 6.43-2.34l-2.81-2.18c-.78.52-1.78.83-2.98.83-2.52 0-4.66-1.7-5.42-3.99l-2.9 2.24A9.72 9.72 0 0 0 12 21.76Z" />
      <path fill="#FBBC05" d="M7.22 14.08A5.84 5.84 0 0 1 6.9 12c0-.72.12-1.42.32-2.08l-2.9-2.24A9.75 9.75 0 0 0 2.24 12c0 1.57.38 3.06 1.08 4.32l2.9-2.24Z" />
      <path fill="#EA4335" d="M12 5.93c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.82 3 14.62 2.24 12 2.24a9.72 9.72 0 0 0-7.68 5.44l2.9 2.24c.76-2.29 2.9-3.99 5.42-3.99Z" />
    </svg>
  );
}

function ReviewCard({ title, rows, onEdit, disabled }) {
  return (
    <section className="signup-landlord-review-card">
      <div className="signup-landlord-review-heading">
        <h3>{title}</h3>
        <button type="button" onClick={onEdit} disabled={disabled} aria-label={`Edit ${title.toLowerCase()}`}><Pencil aria-hidden="true" /> Edit</button>
      </div>
      <dl>{rows.map(([label, value]) => (
        <div className="signup-landlord-review-row" key={label}><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>
      ))}</dl>
    </section>
  );
}

export function Signup({ embedded = false, redirect = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, hydrateSession } = useAuth();
  useSignupViewport();

  const query = new URLSearchParams(location.search);
  const requestedRedirect = (typeof redirect === "string" ? redirect : null) ?? query.get("redirect");
  const redirectTo = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//") ? requestedRedirect : null;
  const loginPath = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
  // Reachable from /signup?google=setup: Google already signed the visitor in,
  // but no AptFindr account exists for that Google user yet. Land them on the
  // tenant card, which is the only card Google can create, and say why.
  const googleSetup = !embedded && query.get("google") === "setup";

  const [values, setValues] = useState(INITIAL_VALUES);
  const [landlordStep, setLandlordStep] = useState(1);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(null);
  const [tenantTermsAccepted, setTenantTermsAccepted] = useState(false);
  const [landlordTermsAccepted, setLandlordTermsAccepted] = useState(false);
  const [reviewEditor, setReviewEditor] = useState(null);
  const [policy, setPolicy] = useState(null);
  const formRef = useRef(null);
  const stepHeadingRef = useRef(null);
  const submissionInFlightRef = useRef(false);
  const reviewTriggerRef = useRef(null);
  const policyTriggerRef = useRef(null);
  const loading = busy !== null;
  const isLandlord = values.role === "landlord";
  const termsAccepted = isLandlord ? landlordTermsAccepted : tenantTermsAccepted;

  useEffect(() => {
    stepHeadingRef.current?.focus({ preventScroll: true });
    stepHeadingRef.current?.scrollIntoView({ block: "nearest" });
  }, [landlordStep, values.role]);

  useEffect(() => {
    // Google accounts can only become tenants, and the Google button lives on
    // that card, so do not leave the visitor on a role chooser they cannot use.
    if (!googleSetup) return;
    setValues((current) => (current.role ? current : { ...current, role: "tenant" }));
  }, [googleSetup]);

  const changeField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
  };
  const selectRole = (role) => {
    setValues((current) => ({ ...current, role }));
    setLandlordStep(1);
    setFieldErrors({});
    setError("");
  };
  const focusField = (field) => requestAnimationFrame(() => formRef.current?.elements.namedItem(field)?.focus());
  const showValidation = (errors, step) => {
    setFieldErrors(errors);
    setError("Please check the highlighted fields.");
    if (step) setLandlordStep(step);
    focusField(Object.keys(errors)[0]);
  };
  const nextStep = () => {
    if (loading) return;
    const normalized = normalizeSignupValues(values);
    const errors = landlordStep === 1 ? validateAccountDetails(normalized) : validatePersonalInformation(normalized);
    if (Object.keys(errors).length) {
      showValidation(errors);
      return;
    }
    setValues(normalized);
    setError("");
    setFieldErrors({});
    setLandlordStep((step) => Math.min(step + 1, 3));
  };
  const goBack = (step = landlordStep - 1) => {
    if (loading) return;
    setError("");
    setFieldErrors({});
    setLandlordStep(Math.max(1, step));
  };
  const openReviewEditor = (section, trigger) => {
    reviewTriggerRef.current = trigger;
    setReviewEditor(section);
  };
  const openPolicy = (nextPolicy, trigger) => {
    policyTriggerRef.current = trigger;
    setPolicy(nextPolicy);
  };
  const changeAgreement = (accepted) => {
    if (isLandlord) setLandlordTermsAccepted(accepted);
    else setTenantTermsAccepted(accepted);
    setError("");
  };

  const createAccount = async () => {
    if (submissionInFlightRef.current || (isLandlord && landlordStep !== 3)) return;
    const normalized = normalizeSignupValues(values);
    const accountErrors = validateAccountDetails(normalized);
    if (Object.keys(accountErrors).length) {
      showValidation(accountErrors, isLandlord ? 1 : undefined);
      return;
    }
    if (isLandlord) {
      const personalErrors = validatePersonalInformation(normalized);
      if (Object.keys(personalErrors).length) {
        showValidation(personalErrors, 2);
        return;
      }
    }
    if (!termsAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy to continue.");
      focusField("termsAccepted");
      return;
    }
    setValues(normalized);
    setError("");
    setFieldErrors({});
    submissionInFlightRef.current = true;
    setBusy("account");
    try {
      const result = await signup({
        name: isLandlord ? getSignupFullName(normalized) : normalized.username,
        username: normalized.username,
        email: normalized.email,
        password: normalized.password,
        role: normalized.role,
        middleInitial: isLandlord ? normalized.middleInitial : "",
        address: "",
        mobileNumber: isLandlord ? normalized.mobileNumber : "",
        businessName: isLandlord ? normalized.businessName : undefined,
        termsAccepted,
        landlordVerificationAccepted: isLandlord ? termsAccepted : undefined,
      });
      if (!result.success) {
        setError(result.error || "Signup failed.");
      } else if (result.signup?.existingAccount) {
        setError("An account may already exist for this email. Sign in, resend verification, or reset your password instead of registering again.");
      } else {
        if (!result.signup?.profileSetupError && !result.signup?.requiresEmailVerification) {
          const profile = await hydrateSession();
          if (!profile) {
            throw new Error("The account was created, but its session is not available.");
          }

          navigate(dashboardPathForRole(profile.role), { replace: true });
          return;
        }

        const message = result.signup?.profileSetupError || `Account created. A verification link was requested for ${normalized.email}. Check your inbox and spam folder before signing in.`;
        navigate(loginPath, { state: {
          message,
          verificationEmail: normalized.email,
        } });
      }
    } catch (submitError) {
      console.error("[AUTH] Unexpected signup UI failure", submitError);
      setError("We could not confirm that registration completed. Try signing in, resending verification, or resetting your password before registering again.");
    } finally {
      submissionInFlightRef.current = false;
      setBusy(null);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading) return;
    if (!values.role) {
      setError("Please select an account type.");
    } else if (isLandlord && landlordStep < 3) {
      // Enter advances the wizard; only the Review step can create an account.
      nextStep();
    } else {
      void createAccount();
    }
  };

  const handleGoogleSignup = async () => {
    if (submissionInFlightRef.current) return;
    if (!tenantTermsAccepted) {
      setError("You must agree to the Terms of Service and Privacy Policy to continue.");
      focusField("termsAccepted");
      return;
    }
    setError("");
    submissionInFlightRef.current = true;
    setBusy("google");
    try {
      const googleSignup = await signupWithGoogle({ termsAccepted: tenantTermsAccepted });
      if (googleSignup?.profile) {
        // The account and its profile already exist at this point. Hydrating the
        // shared context can lose a race with another auth request, and that must
        // never throw a finished Google signup back to the sign-in screen.
        const profile = (await hydrateSession()) ?? googleSignup.profile;
        clearPendingGoogleOAuthFlow();
        navigate(isTenantRole(profile.role) ? redirectTo || dashboardPathForRole(profile.role) : profile.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      }
      // Otherwise Supabase is redirecting the browser to Google; keep actions locked.
    } catch (googleError) {
      clearPendingGoogleOAuthFlow();
      console.error("[AUTH] Google signup failed", googleError);
      setError(googleError instanceof Error ? googleError.message : "We could not continue with Google. Please try again.");
      submissionInFlightRef.current = false;
      setBusy(null);
    }
  };

  const loginPrompt = <p className="signup-login-prompt">Already have an account? <Link to={loginPath}>Sign In</Link></p>;
  const agreement = <SignupAgreement checked={termsAccepted} onChange={changeAgreement} disabled={loading} onPolicyClick={openPolicy} role={isLandlord ? "landlord" : "tenant"} />;
  const createButton = <button type="submit" disabled={loading} className="signup-primary-button signup-submit-button">{busy === "account" ? <><span className="signup-spinner" aria-hidden="true" /> Creating your account...</> : "Create Account"}</button>;

  return (
    <div className={`auth-palette signup-page${embedded ? " signup-page--floater" : " signup-page--standalone"}${values.role ? ` signup-page--${values.role}` : ""}`}>
      {!embedded && (
        <header className="signup-mobile-header">
          <Link to="/" className="signup-mobile-brand"><AppLogo className="signup-mobile-logo" /><span>AptFindr</span></Link>
          <Link to={loginPath} className="signup-login-link">Sign in</Link>
        </header>
      )}
      <div className="signup-content">
        <div className="signup-form-container">
          <section className="signup-form-shell" aria-labelledby="signup-title">
            <div className="signup-form-heading">
              <h1 id="signup-title" className="signup-title">Create Your Account</h1>
              {!values.role && <p className="signup-description">Choose your role to continue.</p>}
            </div>
            {googleSetup && (
              <div className="signup-google-setup-notice" role="status">
                <Info aria-hidden="true" />
                <p>
                  Google signed you in, but that Google account does not have an AptFindr account yet.
                  Tick the terms and press <strong>Sign Up with Google</strong> to finish creating your account.
                </p>
              </div>
            )}
            {error && (
              <div className="signup-message" role="alert">
                <div className="signup-error-alert"><AlertCircle aria-hidden="true" /><p>{error}</p></div>
                {(error.includes("may already exist") || error.includes("couldn't send the confirmation email")) && (
                  <div className="signup-error-actions">
                    <Link to={loginPath}>Sign in</Link>
                    <Link to="/forgot-password">Forgot password</Link>
                    <Link to={loginPath} state={{ message: "Use Resend Verification Email for this account.", verificationEmail: values.email.trim() }}>Resend verification</Link>
                  </div>
                )}
              </div>
            )}
            <form ref={formRef} className="signup-form" noValidate onSubmit={handleSubmit} aria-busy={loading}>
              {!values.role && (
                <div className="signup-account-type-options">
                  {[{ role: "tenant", label: "Tenant", description: "Find and explore verified apartments in La Paz.", Icon: Users }, { role: "landlord", label: "Landlord", description: "List and manage your apartment properties.", Icon: Building2 }].map(({ role, label, description, Icon }) => (
                    <button type="button" className="signup-account-type-option" key={role} onClick={() => selectRole(role)}>
                      <span className="signup-account-type-icon"><Icon aria-hidden="true" /></span>
                      <span className="signup-account-type-content"><strong>{label}</strong><span>{description}</span></span>
                      <ChevronRight className="signup-account-type-chevron" aria-hidden="true" />
                    </button>
                  ))}
                  <Link to="/" className="signup-home-link"><Home aria-hidden="true" /> Back to Home</Link>
                </div>
              )}
              {values.role === "tenant" && (
                <>
                  <div className="signup-tenant-simple-form"><SignupAccountFields values={values} onChange={changeField} errors={fieldErrors} disabled={loading} idPrefix="tenant" /></div>
                  {agreement}
                  {createButton}
                  <div className="signup-social-divider" aria-hidden="true"><span /><b>or</b><span /></div>
                  <button type="button" className="signup-google-button" onClick={handleGoogleSignup} disabled={loading}><GoogleIcon />{busy === "google" ? "Connecting to Google..." : googleSetup ? "Finish Creating Your Account with Google" : "Sign Up with Google"}</button>
                  {loginPrompt}
                </>
              )}
              {isLandlord && (
                <div className="signup-landlord-wizard">
                  <nav aria-label="Landlord registration progress">
                    <ol className="signup-landlord-stepper">
                      {LANDLORD_STEPS.map((label, index) => {
                        const step = index + 1;
                        return <li className="signup-landlord-step-item" key={label}>
                          <button type="button" className={`signup-landlord-step-button${landlordStep === step ? " is-active" : ""}`} onClick={() => goBack(step)} disabled={loading || step > landlordStep} aria-current={landlordStep === step ? "step" : undefined} aria-label={`Step ${step}: ${label}`}>
                            <span className="signup-landlord-step-circle">{step}</span><span className="signup-landlord-step-text">{label}</span>
                          </button>
                        </li>;
                      })}
                    </ol>
                  </nav>
                  <section className="signup-landlord-panel" aria-labelledby="signup-step-title">
                    <h2 ref={stepHeadingRef} id="signup-step-title" tabIndex={-1} className="signup-landlord-panel-title">{LANDLORD_STEPS[landlordStep - 1]}</h2>
                    {landlordStep === 1 && (
                      <>
                        <SignupAccountFields values={values} onChange={changeField} errors={fieldErrors} disabled={loading} idPrefix="landlord" />
                        <button type="submit" className="signup-primary-button signup-landlord-continue" disabled={loading}>Continue <ArrowRight aria-hidden="true" /></button>
                        {loginPrompt}
                      </>
                    )}
                    {landlordStep === 2 && (
                      <>
                        <SignupPersonalFields values={values} onChange={changeField} errors={fieldErrors} disabled={loading} />
                        <div className="signup-landlord-actions">
                          <button type="button" className="signup-secondary-button" onClick={() => goBack()} disabled={loading}><ArrowLeft aria-hidden="true" /> Back</button>
                          <button type="submit" className="signup-primary-button" disabled={loading}>Continue <ArrowRight aria-hidden="true" /></button>
                        </div>
                      </>
                    )}
                    {landlordStep === 3 && (
                      <>
                        <ReviewCard title="Account Details" rows={[["Username", values.username], ["Recovery Email", values.email]]} onEdit={(event) => openReviewEditor("account", event.currentTarget)} disabled={loading} />
                        <ReviewCard title="Personal Information" rows={[["Name", getSignupFullName(values)], ["Mobile Number", values.mobileNumber], ["Business Name", values.businessName]]} onEdit={(event) => openReviewEditor("personal", event.currentTarget)} disabled={loading} />
                        {agreement}
                        {createButton}
                      </>
                    )}
                  </section>
                </div>
              )}
            </form>
            {values.role && <button type="button" className="signup-change-role" disabled={loading} onClick={() => selectRole("")}>Change account type</button>}
          </section>
        </div>
      </div>
      {reviewEditor && <SignupReviewDialog key={reviewEditor} section={reviewEditor} values={values} onSave={(draft) => setValues((current) => ({ ...current, ...draft }))} onClose={() => setReviewEditor(null)} returnFocusRef={reviewTriggerRef} />}
      {policy && <SignupPolicyDialog policy={policy} role={isLandlord ? "landlord" : "tenant"} onClose={() => setPolicy(null)} returnFocusRef={policyTriggerRef} />}
    </div>
  );
}
