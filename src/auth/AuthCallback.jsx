import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { clearPendingGoogleOAuthFlow, exchangeAuthCode, finalizeGoogleSignup, getAuthUser, getExistingProfileForAuthUser, getPendingGoogleOAuthFlow, isTenantRole, signOutAuthSession } from "@/services/authService";

const dashboardPathForRole = (role) => isTenantRole(role) ? "/dashboard?section=overview" : role === "admin" ? "/admin" : "/dashboard";

function getOAuthErrorMessage(params) {
    const error = `${params.get("error_code") || params.get("error") || ""} ${params.get("error_description") || ""}`.trim();
    if (/access_denied|cancel(?:led|ed)?/i.test(error)) {
        return "Google sign-in was cancelled. You can try again whenever you are ready.";
    }
    if (/database error saving new user|database.*(?:user|profile)|trigger/i.test(error)) {
        return "Supabase could not create this Google account. The AptFindr administrator needs to check the Supabase Auth logs and the auth.users profile trigger.";
    }
    return "Google sign-in could not be completed. Check the Supabase Google provider and callback URL settings, then try again.";
}
export function AuthCallback() {
    const navigate = useNavigate();
    const { hydrateSession } = useAuth();
    const [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        void (async () => {
            const params = new URLSearchParams(window.location.search);
            const callbackError = params.get("error_description") || params.get("error");
            if (callbackError) {
                clearPendingGoogleOAuthFlow();
                console.error("Authentication callback was rejected:", callbackError);
                if (active)
                    navigate("/login", {
                        replace: true,
                        state: { error: getOAuthErrorMessage(params) },
                    });
                return;
            }
            const code = params.get("code");
            if (code) {
                const { error: exchangeError } = await exchangeAuthCode(code);
                if (exchangeError) {
                    console.error("Email verification callback failed:", exchangeError);
                    if (active)
                        setError("This verification link is invalid or has expired. Request a new verification email and try again.");
                    return;
                }
            }
            const { data, error: userError } = await getAuthUser();
            if (userError || !data.user?.email_confirmed_at) {
                if (userError)
                    console.error("Unable to confirm verified user:", userError);
                if (active)
                    setError("Email verification could not be confirmed. Request a new verification email and try again.");
                return;
            }
            try {
                const isGoogleAuth = data.user.app_metadata?.provider === "google";
                if (isGoogleAuth) {
                    const oauthFlow = getPendingGoogleOAuthFlow();
                    const existingProfile = await getExistingProfileForAuthUser(data.user);
                    // A bare Google login must never invent a tenant or landlord
                    // profile. Keep the authenticated Google session and send the
                    // person through the existing role/account setup screen.
                    if (!existingProfile && oauthFlow !== "signup") {
                        clearPendingGoogleOAuthFlow();
                        if (active)
                            navigate("/signup?google=setup", { replace: true });
                        return;
                    }
                    // OAuth cannot carry arbitrary Supabase user metadata in the
                    // signInWithOAuth request. For the explicit signup path, set
                    // the agreed tenant metadata now and create the app profile.
                    if (!existingProfile) {
                        await finalizeGoogleSignup(data.user, { termsAccepted: true });
                    }
                    const profile = await hydrateSession();
                    if (!profile)
                        throw new Error("The Google account profile is not available.");
                    clearPendingGoogleOAuthFlow();
                    if (active)
                            navigate(dashboardPathForRole(profile.role), { replace: true });
                    return;
                }
                const profile = await hydrateSession();
                if (!profile)
                    throw new Error("The verified account profile is not available.");
                if (active)
                    navigate(dashboardPathForRole(profile.role), { replace: true });
            }
            catch (profileError) {
                console.error("Authentication succeeded but profile recovery failed:", profileError);
                clearPendingGoogleOAuthFlow();
                await signOutAuthSession();
                const isGoogleAuth = data.user.app_metadata?.provider === "google";
                if (active)
                    navigate("/login", {
                        replace: true,
                        state: {
                            message: isGoogleAuth
                                ? "Google sign-in succeeded, but AptFindr could not finish creating your profile. Please contact the administrator."
                                : "Email verified. Sign in to finish loading your profile.",
                        },
                    });
            }
        })();
        return () => { active = false; };
    }, [hydrateSession, navigate]);
    return (<main className="auth-status-page">
      <section className="auth-status-card">
        {error ? (<>
            <h1 className="auth-status-title">Verification unsuccessful</h1>
            <p className="auth-status-description">{error}</p>
            <Link to="/login" className="auth-status-login-link">Return to Sign In</Link>
          </>) : (<>
            <h1 className="auth-status-title">Verifying your email</h1>
            <p className="auth-status-description">Please wait while RentIloilo confirms your email address.</p>
          </>)}
      </section>
    </main>);
}
