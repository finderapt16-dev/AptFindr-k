import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { clearPendingGoogleOAuthFlow, describeGoogleAuthUser, exchangeAuthCode, finalizeGoogleSignup, getAuthUser, getExistingProfileForAuthUser, getPendingGoogleOAuthFlow, isGoogleAuthUser, isTenantRole, signOutAuthSession } from "@/services/authService";

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
                if (isGoogleAuthUser(data.user)) {
                    const oauthFlow = getPendingGoogleOAuthFlow();
                    const existingProfile = await getExistingProfileForAuthUser(data.user);
                    // A bare Google login must never invent a tenant or landlord
                    // profile. Send the person back to sign in with an explicit
                    // "create an account" notice instead of a silent redirect to a
                    // blank role picker, and keep the Google session so the notice
                    // can finish the account without a second trip to Google.
                    if (!existingProfile && oauthFlow !== "signup") {
                        clearPendingGoogleOAuthFlow();
                        if (active)
                            navigate("/login", {
                                replace: true,
                                state: { googleSetup: describeGoogleAuthUser(data.user) },
                            });
                        return;
                    }
                    // OAuth cannot carry arbitrary Supabase user metadata in the
                    // signInWithOAuth request. For the explicit signup path, set
                    // the agreed tenant metadata now and create the app profile.
                    let createdProfile = null;
                    if (!existingProfile) {
                        createdProfile = await finalizeGoogleSignup(data.user, { termsAccepted: true });
                    }
                    // A newer auth request can win the hydration race and hand back
                    // null even though the profile exists. Fall back to the profile
                    // this callback just created rather than bouncing a finished
                    // signup back to the sign-in screen.
                    const profile = (await hydrateSession()) ?? createdProfile ?? existingProfile;
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
                const isGoogleAuth = isGoogleAuthUser(data.user);
                if (active)
                    navigate("/login", {
                        replace: true,
                        // A Google account that could not be finished has to read
                        // as a problem, not as the green "account created" banner,
                        // and it has to say what to do next.
                        state: isGoogleAuth
                            ? { error: "Google signed you in, but AptFindr could not finish creating your account. Press Continue with Google to try again, and contact the administrator if this keeps happening." }
                            : { message: "Email verified. Sign in to finish loading your profile." },
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
