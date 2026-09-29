import { AuthField } from "./AuthField";
import "./signup.css";

import { AppLogo } from "@/components/AppLogo";

import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";

import { Button } from "@/components/ui/button";

import { useAuth } from "@/contexts/AuthContext";
import { clearPendingGoogleOAuthFlow, isTenantRole, signupWithGoogle } from "@/services/authService";

import {
    AlertCircle,
    BadgeCheck,
    Building2,
    Check,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    Eye,
    EyeOff,
    Home,
    Key,
    Lock,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
    Upload,
    User,
    Users,
} from "lucide-react";

import {
    useRef,
    useState,
} from "react";

import {
    Link,
    useLocation,
    useNavigate,
} from "react-router-dom";


/* =========================================================
   PASSWORD STRENGTH
========================================================= */

function getStrength(password) {
    let strength = 0;

    if (password.length >= 6) {
        strength++;
    }

    if (password.length >= 10) {
        strength++;
    }

    if (/[A-Z]/.test(password)) {
        strength++;
    }

    if (/[0-9]/.test(password)) {
        strength++;
    }

    if (/[^A-Za-z0-9]/.test(password)) {
        strength++;
    }

    return strength;
}


const strengthLabel = [
    "",
    "Weak",
    "Fair",
    "Good",
    "Strong",
    "Very strong",
];


const strengthColor = [
    "",
    "signup-strength-fill-weak",
    "signup-strength-fill-fair",
    "signup-strength-fill-good",
    "signup-strength-fill-strong",
    "signup-strength-fill-very-strong",
];


const strengthText = [
    "",
    "signup-strength-text-weak",
    "signup-strength-text-fair",
    "signup-strength-text-good",
    "signup-strength-text-strong",
    "signup-strength-text-very-strong",
];


/* =========================================================
   SIGNUP
========================================================= */

export function Signup({ embedded = false, redirect = null }) {
    const navigate =
        useNavigate();

    const location =
        useLocation();

    const {
        signup,
        hydrateSession,
    } = useAuth();


    /* =====================================================
       REDIRECT
    ===================================================== */

    const requestedRedirect =
        (typeof redirect === "string" ? redirect : null) ?? new URLSearchParams(
            location.search
        ).get("redirect");


    const redirectTo =
        requestedRedirect?.startsWith("/") &&
        !requestedRedirect.startsWith("//")
            ? requestedRedirect
            : null;


    const loginPath =
        redirectTo
            ? `/login?redirect=${encodeURIComponent(
                  redirectTo
              )}`
            : "/login";


    /* =====================================================
       GENERAL STATE
    ===================================================== */

    const [
        error,
        setError,
    ] = useState("");


    const [
        loading,
        setLoading,
    ] = useState(false);


    const submissionInFlightRef =
        useRef(false);


    /* =====================================================
       PASSWORD VISIBILITY
    ===================================================== */

    const [
        showPass,
        setShowPass,
    ] = useState(false);


    const [
        showConfirm,
        setShowConfirm,
    ] = useState(false);


    /* =====================================================
       LANDLORD
    ===================================================== */

    const [
        landlordStep,
        setLandlordStep,
    ] = useState(1);

    const [reviewEditor, setReviewEditor] = useState(null);
    const [reviewDraft, setReviewDraft] = useState(null);
    const [reviewUpdateSuccess, setReviewUpdateSuccess] = useState(null);


    const permitRef =
        useRef(null);


    const idRef =
        useRef(null);


    const [
        permitFile,
        setPermitFile,
    ] = useState(null);


    const [
        idFile,
        setIdFile,
    ] = useState(null);


    /* =====================================================
       AGREEMENTS
    ===================================================== */

    const [
        tenantTermsAccepted,
        setTenantTermsAccepted,
    ] = useState(false);


    const [
        landlordAgreementAccepted,
        setLandlordAgreementAccepted,
    ] = useState(false);


    /* =====================================================
       FORM DATA
    ===================================================== */

    const [
        formData,
        setFormData,
    ] = useState({
        firstName: "",
        lastName: "",
        middleInitial: "",

        username: "",
        email: "",
        mobileNumber: "",
        address: "",

        password: "",
        confirmPassword: "",

        role: "",

        permitNumber: "",
    });


    const set = (
        key,
        value
    ) => {
        setFormData(
            (
                previous
            ) => ({
                ...previous,
                [key]: value,
            })
        );
    };


    const strength =
        getStrength(
            formData.password
        );


    /* =====================================================
       ACCOUNT TYPE
    ===================================================== */

    const selectAccountType =
        (
            role
        ) => {
            setError("");

            setFormData(
                (
                    previous
                ) => ({
                    ...previous,
                    role,
                })
            );


            if (
                role ===
                "landlord"
            ) {
                setLandlordStep(
                    1
                );
            }
        };


    const changeAccountType =
        () => {
            setError("");

            setFormData(
                (
                    previous
                ) => ({
                    ...previous,
                    role: "",
                })
            );

            setLandlordStep(
                1
            );
        };

    const openLandlordReviewEditor = (section) => {
        setReviewDraft({ ...formData });
        setReviewEditor(section);
    };

    const saveLandlordReviewEditor = () => {
        if (!reviewEditor || !reviewDraft) return;

        const fields = reviewEditor === "account"
            ? ["username", "email"]
            : ["firstName", "lastName", "middleInitial", "mobileNumber"];

        setFormData((current) => Object.fromEntries([
            ...Object.entries(current),
            ...fields.map((field) => [field, reviewDraft[field] ?? ""]),
        ]));
        setReviewUpdateSuccess(reviewEditor);
        setReviewEditor(null);
    };


    /* =====================================================
       SUBMIT
    ===================================================== */

    const handleSubmit =
        async (
            event
        ) => {
            event.preventDefault();


            if (
                submissionInFlightRef.current
            ) {
                return;
            }


            setError("");


            /* ROLE */

            if (
                !formData.role
            ) {
                setError(
                    "Please select an account type."
                );

                return;
            }


            /* AGREEMENTS */

            if (
                formData.role ===
                    "tenant" &&
                !tenantTermsAccepted
            ) {
                setError(
                    "You must agree to the Terms of Use and Privacy Policy to continue."
                );

                return;
            }


            if (
                formData.role ===
                    "landlord" &&
                !landlordAgreementAccepted
            ) {
                setError(
                    "You must agree to the Terms of Service and Privacy Policy to continue."
                );

                return;
            }


            /* LANDLORD PERSONAL INFORMATION */

            if (
                formData.role ===
                "landlord"
            ) {
                if (
                    !formData.firstName.trim() ||
                    !formData.lastName.trim()
                ) {
                    setError(
                        "Personal information is required."
                    );

                    return;
                }


                if (
                    !formData.mobileNumber.trim()
                ) {
                    setError(
                        "Mobile number is required."
                    );

                    return;
                }
            }


            /* USERNAME */

            if (
                !/^[A-Za-z0-9_]{4,30}$/.test(
                    formData.username.trim()
                ) ||
                formData.username.includes(
                    "@"
                )
            ) {
                setError(
                    "Username must be 4–30 characters using only letters, numbers, or underscores."
                );

                return;
            }


            /* EMAIL */

            if (
                !formData.email.trim()
            ) {
                setError(
                    "Recovery email is required."
                );

                return;
            }


            if (
                !/^\S+@\S+\.\S+$/.test(
                    formData.email.trim()
                )
            ) {
                setError(
                    "Enter a valid recovery email address."
                );

                return;
            }


            /* PASSWORD */

            if (
                formData.password.length <
                6
            ) {
                setError(
                    "Password must be at least 6 characters."
                );

                return;
            }


            if (
                formData.password !==
                formData.confirmPassword
            ) {
                setError(
                    "Passwords do not match."
                );

                return;
            }


            submissionInFlightRef.current =
                true;

            setLoading(
                true
            );


            /* FULL NAME */

            const fullName =
                formData.role ===
                "tenant"
                    ? formData.username.trim()
                    : `${
                          formData.firstName
                      } ${
                          formData.middleInitial
                              ? `${formData.middleInitial}. `
                              : ""
                      }${
                          formData.lastName
                      }`.trim();


            try {
                const result =
                    await signup({
                        name:
                            fullName,

                        username:
                            formData.username.trim(),

                        email:
                            formData.email.trim(),

                        password:
                            formData.password,

                        role:
                            formData.role,

                        middleInitial:
                            formData.role ===
                            "landlord"
                                ? formData.middleInitial
                                : "",

                        address:
                            formData.role ===
                            "landlord"
                                ? formData.address
                                : "",

                        mobileNumber:
                            formData.role ===
                            "landlord"
                                ? formData.mobileNumber
                                : "",

                        permitNumber:
                            formData.role ===
                            "landlord"
                                ? formData.permitNumber
                                : undefined,

                        permitDocument:
                            permitFile ??
                            undefined,

                        idDocument:
                            idFile ??
                            undefined,

                        termsAccepted:
                            formData.role ===
                            "tenant"
                                ? tenantTermsAccepted
                                : landlordAgreementAccepted,

                        landlordVerificationAccepted:
                            formData.role ===
                            "landlord"
                                ? landlordAgreementAccepted
                                : undefined,
                    });


                /* EXISTING ACCOUNT */

                if (
                    result.success &&
                    result.signup
                        ?.existingAccount
                ) {
                    setError(
                        "An account may already exist for this email. Sign in, resend verification, or reset your password instead of registering again."
                    );
                }

                /* PROFILE SETUP ERROR */

                else if (
                    result.success &&
                    result.signup
                        ?.profileSetupError
                ) {
                    navigate(
                        loginPath,
                        {
                            state: {
                                message:
                                    result
                                        .signup
                                        .profileSetupError,

                                verificationEmail:
                                    formData.email.trim(),
                            },
                        }
                    );
                }

                /* EMAIL VERIFICATION */

                else if (
                    result.success &&
                    result.signup
                        ?.requiresEmailVerification
                ) {
                    navigate(
                        loginPath,
                        {
                            state: {
                                message:
                                    `Account created. A verification link was requested for ${formData.email.trim()}. Check your inbox and spam folder before signing in.`,

                                verificationEmail:
                                    formData.email.trim(),
                            },
                        }
                    );
                }

                /* SUCCESS */

                else if (
                    result.success
                ) {
                    navigate(
                        loginPath,
                        {
                            state: {
                                message:
                                    "Account created successfully. You can now sign in.",
                            },
                        }
                    );
                }

                /* FAILED */

                else {
                    setError(
                        result.error ||
                            "Signup failed."
                    );
                }
            }
            catch (
                submitError
            ) {
                console.error(
                    "[AUTH] Unexpected signup UI failure",
                    submitError
                );


                setError(
                    "We could not confirm that registration completed. Try signing in, resending verification, or resetting your password before registering again."
                );
            }
            finally {
                submissionInFlightRef.current =
                    false;

                setLoading(
                    false
                );
            }
        };


    const handleGoogleSignup =
        async () => {
            if (!tenantTermsAccepted) {
                setError(
                    "You must agree to the Terms of Use and Privacy Policy to continue."
                );
                return;
            }

            setError("");
            setLoading(true);

            try {
                const googleSignup = await signupWithGoogle({
                    termsAccepted: tenantTermsAccepted,
                });
                if (googleSignup?.profile) {
                    // Profile creation can finish before the AuthProvider's
                    // auth-state subscription runs. Hydrate it explicitly so
                    // the protected destination never sees an anonymous user.
                    const profile = await hydrateSession();
                    if (!profile) {
                        throw new Error("Your Google account was created, but its profile is not available yet.");
                    }
                    clearPendingGoogleOAuthFlow();
                    navigate(
                        isTenantRole(profile.role)
                            ? "/browse"
                            : profile.role === "admin"
                            ? "/admin"
                            : "/dashboard",
                        { replace: true }
                    );
                }
            } catch (googleError) {
                clearPendingGoogleOAuthFlow();
                console.error("[AUTH] Google signup failed", googleError);
                setError(
                    googleError instanceof Error
                        ? googleError.message
                        : "We could not continue with Google. Please try again."
                );
                setLoading(false);
            }
        };


    /* =====================================================
       LANDLORD NEXT STEP
    ===================================================== */

    const nextLandlordStep =
        () => {
            setError("");


            /* STEP 1 */

            if (
                landlordStep ===
                2
            ) {
                if (
                    !formData.firstName.trim() ||
                    !formData.lastName.trim()
                ) {
                    setError(
                        "Full name is required!."
                    );

                    return;
                }


            }


            /* STEP 2 */

            if (
                landlordStep ===
                    2 &&
                !formData.mobileNumber.trim()
            ) {
                setError(
                    "Mobile number is required!."
                );

                return;
            }


            /* ACCOUNT DETAILS */

            if (
                landlordStep ===
                1
            ) {
                if (
                    !/^[A-Za-z0-9_]{4,30}$/.test(
                        formData.username.trim()
                    ) ||
                    formData.username.includes(
                        "@"
                    )
                ) {
                    setError(
                        "Username must be 4–30 characters using only letters, numbers, or underscores!."
                    );

                    return;
                }


                if (
                    !formData.email.trim() ||
                    !/^\S+@\S+\.\S+$/.test(
                        formData.email.trim()
                    )
                ) {
                    setError(
                        "Enter a valid recovery email address!."
                    );

                    return;
                }


                if (
                    formData.password.length <
                    6
                ) {
                    setError(
                        "Password must be at least 6 characters!."
                    );

                    return;
                }


                if (
                    formData.password !==
                    formData.confirmPassword
                ) {
                    setError(
                        "Passwords do not match!."
                    );

                    return;
                }
            }


            setLandlordStep(
                (
                    step
                ) =>
                    Math.min(
                        step + 1,
                        3
                    )
            );
        };


    /* =====================================================
       LANDLORD PREVIOUS STEP
    ===================================================== */

    const previousLandlordStep =
        () => {
            setError("");

            setLandlordStep(
                (
                    step
                ) =>
                    Math.max(
                        step - 1,
                        1
                    )
            );
        };


    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className={`auth-palette signup-page${embedded ? " signup-page--floater" : ""}${formData.role ? ` signup-page--${formData.role}` : ""}`}>

            {/* =================================================
                LEFT VISUAL
            ================================================= */}

            {!embedded && <div className="auth-visual-panel signup-visual-panel">

                <div className="signup-background">

                    <div className="auth-background-overlay signup-background-overlay" />

                </div>


                <div className="signup-visual-content">

                    <Link
                        to="/"
                        className="signup-brand"
                    >

                        <AppLogo className="signup-brand-logo" />


                        <div>

                            <span className="signup-brand-name">
                                AptFindr
                            </span>


                            <p className="signup-brand-location">
                                La Paz, Iloilo City
                            </p>

                        </div>

                    </Link>


                    <div className="signup-introduction">

                        <div>

                            <h2 className="signup-visual-title">

                                Create your
                                <br />

                                <span className="signup-visual-accent">
                                    AptFindr account
                                </span>

                            </h2>


                            <p className="signup-visual-description">
                                Choose an account type and
                                provide the information
                                required for your role.
                            </p>

                        </div>

                    </div>


                    <div className="auth-benefits signup-benefits">

                        {[
                            {
                                icon: BadgeCheck,
                                text: "Review landlord verification status",
                            },
                            {
                                icon: ShieldCheck,
                                text: "Submit listing reports for admin review",
                            },
                            {
                                icon: MapPin,
                                text: "Compare apartment locations on the map",
                            },
                        ].map(
                            ({
                                icon: Icon,
                                text,
                            }) => (

                                <div
                                    key={
                                        text
                                    }
                                    className="signup-benefit"
                                >

                                    <div className="signup-benefit-symbol">

                                        <Icon className="signup-benefit-icon" />

                                    </div>


                                    <span className="signup-benefit-text">
                                        {text}
                                    </span>

                                </div>

                            )
                        )}

                    </div>

                </div>

            </div>}


            {/* =================================================
                MAIN CONTENT
            ================================================= */}

            <div className="signup-content">

                {/* MOBILE HEADER */}

                {!embedded && <div className="signup-mobile-header">

                    <Link
                        to="/"
                        className="signup-mobile-brand"
                    >

                        <AppLogo className="signup-mobile-logo" />

                        <span className="signup-mobile-brand-name">
                            AptFindr
                        </span>

                    </Link>


                    <Link
                        to={
                            loginPath
                        }
                        className="signup-login-link"
                    >
                        Sign in
                    </Link>

                </div>}


                <div className="signup-form-container">

                    <div className="signup-form-shell">

                        {/* =================================================
                            FORM HEADER
                        ================================================= */}

                        <div className="signup-form-heading">

                            <h1 className="signup-title">

                                Create Your Account

                            </h1>


                            {!formData.role ? (

                                <p className="signup-description">
                                    Choose your role to
                                    continue.
                                </p>

                            ) : (

                                <div className="signup-selected-role-row">

                                    <p className="signup-description signup-tenant-description">

                                        {formData.role ===
                                        "tenant"
                                            ? "Create your tenant account to browse apartments."
                                            : "Create your landlord account to manage apartment listings."}

                                    </p>


                                    <button
                                        type="button"
                                        className="signup-change-role signup-tenant-change-role"
                                        onClick={
                                            changeAccountType
                                        }
                                    >
                                        Change account type
                                    </button>

                                </div>

                            )}

                        </div>


                        {/* =================================================
                            ERROR
                        ================================================= */}

                        <div
                            className="signup-message signup-message--reserved"
                            aria-live="polite"
                        >

                            {error && (

                                <>

                                <Alert
                                    variant="destructive"
                                    className="signup-error-alert"
                                >

                                    <AlertCircle className="signup-error-icon" />


                                    <AlertDescription className="signup-error-text">
                                        {error}
                                    </AlertDescription>

                                </Alert>


                                {(error.includes(
                                    "may already exist"
                                ) ||
                                    error.includes(
                                        "couldn't send the confirmation email"
                                    )) && (

                                    <div className="signup-error-actions">

                                        <Link
                                            to={
                                                loginPath
                                            }
                                            className="signup-error-link"
                                        >
                                            Sign in
                                        </Link>


                                        <Link
                                            to="/forgot-password"
                                            className="signup-error-link"
                                        >
                                            Forgot password
                                        </Link>


                                        <Link
                                            to={
                                                loginPath
                                            }
                                            state={{
                                                message:
                                                    "Use Resend Verification Email for this account.",

                                                verificationEmail:
                                                    formData.email.trim(),
                                            }}
                                            className="signup-error-link"
                                        >
                                            Resend verification
                                        </Link>

                                    </div>

                                )}

                                </>

                            )}

                        </div>


                        {/* =================================================
                            FORM
                        ================================================= */}

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="signup-form"
                        >

                            {/* =================================================
                                ACCOUNT TYPE

                                Only visible before a role is selected.
                            ================================================= */}

                            {!formData.role && (

                                <div className="signup-account-type">

                                    <div className="signup-account-type-options">

                                        {/* TENANT */}

                                        <button
                                            type="button"
                                            className="signup-account-type-option"
                                            onClick={() =>
                                                selectAccountType(
                                                    "tenant"
                                                )
                                            }
                                        >

                                            <div className="signup-account-type-icon">

                                                <Users className="signup-icon" />

                                            </div>


                                            <div className="signup-account-type-content">

                                                <strong>
                                                    Tenant
                                                </strong>


                                                <span>
                                                    Find and explore
                                                    verified apartments
                                                    in La Paz.
                                                </span>

                                            </div>


                                            <ChevronRight className="signup-account-type-chevron" />

                                        </button>


                                        {/* LANDLORD */}

                                        <button
                                            type="button"
                                            className="signup-account-type-option"
                                            onClick={() =>
                                                selectAccountType(
                                                    "landlord"
                                                )
                                            }
                                        >

                                            <div className="signup-account-type-icon">

                                                <Building2 className="signup-icon" />

                                            </div>


                                            <div className="signup-account-type-content">

                                                <strong>
                                                    Landlord
                                                </strong>


                                                <span>
                                                    List and manage
                                                    your apartment
                                                    properties.
                                                </span>

                                            </div>


                                            <ChevronRight className="signup-account-type-chevron" />

                                        </button>

                                    </div>

                                </div>

                            )}


                            {/* =================================================
                                TENANT
                            ================================================= */}

                            {formData.role ===
                                "tenant" && (

                                <>

                                    <div className="signup-tenant-simple-form">

                                        {/* USERNAME */}

                                        <div className="signup-account-field">

                                            <AuthField
                                                id="tenant-username"
                                                label="Username"
                                                value={
                                                    formData.username
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    set(
                                                        "username",
                                                        value
                                                    )
                                                }
                                                required
                                                placeholder="Enter your username"
                                            />

                                        </div>


                                        {/* EMAIL */}

                                        <div className="signup-account-field">

                                            <AuthField
                                                id="tenant-email"
                                                label="Email Address"
                                                type="email"
                                                value={
                                                    formData.email
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    set(
                                                        "email",
                                                        value
                                                    )
                                                }
                                                required
                                                placeholder="Enter your email address"
                                            />

                                        </div>


                                        {/* PASSWORD */}

                                        <div className="signup-account-field">

                                            <AuthField
                                                id="tenant-password"
                                                label="Password"
                                                type={
                                                    showPass
                                                        ? "text"
                                                        : "password"
                                                }
                                                value={
                                                    formData.password
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    set(
                                                        "password",
                                                        value
                                                    )
                                                }
                                                required
                                                placeholder="Enter your password"
                                                suffix={

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowPass(
                                                                (
                                                                    previous
                                                                ) =>
                                                                    !previous
                                                            )
                                                        }
                                                        className="auth-password-toggle signup-password-toggle"
                                                        aria-label={
                                                            showPass
                                                                ? "Hide password"
                                                                : "Show password"
                                                        }
                                                    >

                                                        {showPass ? (

                                                            <EyeOff className="signup-icon-small" />

                                                        ) : (

                                                            <Eye className="signup-icon-small" />

                                                        )}

                                                    </button>

                                                }
                                            />

                                        </div>


                                        {/* CONFIRM PASSWORD */}

                                        <div className="signup-account-field">

                                            <AuthField
                                                id="tenant-confirm-password"
                                                label="Confirm Password"
                                                type={
                                                    showConfirm
                                                        ? "text"
                                                        : "password"
                                                }
                                                value={
                                                    formData.confirmPassword
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    set(
                                                        "confirmPassword",
                                                        value
                                                    )
                                                }
                                                required
                                                placeholder="Confirm your password"
                                                suffix={

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowConfirm(
                                                                (
                                                                    previous
                                                                ) =>
                                                                    !previous
                                                            )
                                                        }
                                                        className="auth-password-toggle signup-password-toggle"
                                                        aria-label={
                                                            showConfirm
                                                                ? "Hide confirm password"
                                                                : "Show confirm password"
                                                        }
                                                    >

                                                        {showConfirm ? (

                                                            <EyeOff className="signup-icon-small" />

                                                        ) : (

                                                            <Eye className="signup-icon-small" />

                                                        )}

                                                    </button>

                                                }
                                            />


                                            {formData.confirmPassword &&
                                                formData.password !==
                                                    formData.confirmPassword && (

                                                    <p className="signup-mismatch-message">

                                                        <AlertCircle className="signup-validation-icon" />

                                                        Passwords do
                                                        not match

                                                    </p>

                                                )}

                                        </div>


                                        {/* PASSWORD HELP */}

                                        <div className="signup-tenant-password-help">

                                            <strong>
                                                Password must
                                                contain:
                                            </strong>


                                            <span>
                                                At least 6
                                                characters. An
                                                uppercase letter,
                                                number, and special
                                                character are
                                                recommended for a
                                                stronger password.
                                            </span>

                                        </div>

                                    </div>


                                    {/* TENANT AGREEMENT */}

                                    <label className="signup-agreement">

                                        <input
                                            type="checkbox"
                                            checked={
                                                tenantTermsAccepted
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setTenantTermsAccepted(
                                                    event
                                                        .target
                                                        .checked
                                                )
                                            }
                                            className="signup-checkbox"
                                        />


                                        <span>

                                            I agree to the Terms of Use and Privacy Policy.

                                        </span>

                                    </label>


                                    {/* TENANT SUBMIT */}

                                    <Button
                                        type="submit"
                                        disabled={
                                            loading
                                        }
                                        className="signup-submit-button"
                                    >

                                        {loading ? (
                                            <>

                                                <div className="signup-spinner" />

                                                Creating your
                                                account...

                                            </>
                                        ) : (
                                            "Create Account"
                                        )}

                                    </Button>

                                    <div className="signup-social-divider" aria-hidden="true">
                                        <span />
                                        <b>or</b>
                                        <span />
                                    </div>

                                    <button
                                        type="button"
                                        className="signup-google-button"
                                        onClick={handleGoogleSignup}
                                        disabled={loading}
                                    >
                                        <svg className="signup-google-icon" viewBox="0 0 24 24" aria-hidden="true">
                                            <path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.23-.19-1.77H12v3.35h5.38a4.6 4.6 0 0 1-1.99 3.02l2.81 2.18c1.64-1.51 2.57-3.74 2.57-6.78Z" />
                                            <path fill="#34A853" d="M12 21.76c2.62 0 4.82-.86 6.43-2.34l-2.81-2.18c-.78.52-1.78.83-2.98.83-2.52 0-4.66-1.7-5.42-3.99l-2.9 2.24A9.72 9.72 0 0 0 12 21.76Z" />
                                            <path fill="#FBBC05" d="M7.22 14.08A5.84 5.84 0 0 1 6.9 12c0-.72.12-1.42.32-2.08l-2.9-2.24A9.75 9.75 0 0 0 2.24 12c0 1.57.38 3.06 1.08 4.32l2.9-2.24Z" />
                                            <path fill="#EA4335" d="M12 5.93c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.82 3 14.62 2.24 12 2.24a9.72 9.72 0 0 0-7.68 5.44l2.9 2.24c.76-2.29 2.9-3.99 5.42-3.99Z" />
                                        </svg>
                                        {loading ? "Connecting to Google..." : "Continue with Google"}
                                    </button>

                                    <p className="signup-tenant-login-prompt">
                                        Already have an account? <Link to={loginPath}>Sign In</Link>
                                    </p>

                                </>

                            )}


                            {/* =================================================
                                LANDLORD
                            ================================================= */}

                            {false && formData.role ===
                                "landlord" && (

                                <div className="signup-landlord-wizard">

                                    {/* =============================================
                                        STEPPER
                                    ============================================= */}

                                    <div className="signup-landlord-stepper">

                                        {[
                                            "Account Details",
                                            "Personal Information",
                                            "Review",
                                        ].map(
                                            (
                                                label,
                                                index
                                            ) => {
                                                const stepNumber =
                                                    index +
                                                    1;


                                                const active =
                                                    landlordStep ===
                                                    stepNumber;


                                                const complete =
                                                    landlordStep >
                                                    stepNumber;


                                                return (

                                                    <div
                                                        className="signup-landlord-step-item"
                                                        key={
                                                            label
                                                        }
                                                    >

                                                        <div
                                                            className={`signup-landlord-step-circle ${
                                                                active
                                                                    ? "signup-landlord-step-circle-active"
                                                                    : complete
                                                                    ? "signup-landlord-step-circle-complete"
                                                                    : ""
                                                            }`}
                                                        >

                                                            {complete ? (
                                                                <Check className="signup-icon-small" />
                                                            ) : (
                                                                stepNumber
                                                            )}

                                                        </div>


                                                        <span
                                                            className={`signup-landlord-step-text ${
                                                                active
                                                                    ? "signup-landlord-step-text-active"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {
                                                                label
                                                            }
                                                        </span>


                                                        {stepNumber <
                                                            3 && (

                                                            <div
                                                                className={`signup-landlord-step-connector ${
                                                                    complete
                                                                        ? "signup-landlord-step-connector-complete"
                                                                        : ""
                                                                }`}
                                                            />

                                                        )}

                                                    </div>

                                                );
                                            }
                                        )}

                                    </div>


                                    {/* =============================================
                                        STEP 1
                                        PERSONAL INFORMATION
                                    ============================================= */}

                                    {landlordStep ===
                                        2 && (

                                        <div className="signup-landlord-panel">

                                            <h2 className="signup-landlord-panel-title">
                                                Personal
                                                Information
                                            </h2>


                                            <div className="signup-name-grid">

                                                <AuthField
                                                    id="landlord-first-name"
                                                    label="First Name"
                                                    value={
                                                        formData.firstName
                                                    }
                                                    onChange={(
                                                        value
                                                    ) =>
                                                        set(
                                                            "firstName",
                                                            value
                                                        )
                                                    }
                                                    required
                                                    icon={
                                                        <User className="signup-icon-small" />
                                                    }
                                                />


                                                <AuthField
                                                    id="landlord-last-name"
                                                    label="Last Name"
                                                    value={
                                                        formData.lastName
                                                    }
                                                    onChange={(
                                                        value
                                                    ) =>
                                                        set(
                                                            "lastName",
                                                            value
                                                        )
                                                    }
                                                    required
                                                />

                                            </div>


                                            <AuthField
                                                id="landlord-middle-initial"
                                                label="Middle Initial (optional)"
                                                value={
                                                    formData.middleInitial
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    set(
                                                        "middleInitial",
                                                        value
                                                    )
                                                }
                                            />


                                            <AuthField
                                                id="landlord-address"
                                                label="Home Address"
                                                value={
                                                    formData.address
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    set(
                                                        "address",
                                                        value
                                                    )
                                                }
                                                required
                                                icon={
                                                    <MapPin className="signup-icon-small" />
                                                }
                                            />

                                            <AuthField
                                                id="landlord-mobile"
                                                label="Mobile Number"
                                                type="tel"
                                                value={formData.mobileNumber}
                                                onChange={(value) => set("mobileNumber", value)}
                                                required
                                                icon={<Phone className="signup-icon-small" />}
                                            />

                                            <AuthField
                                                id="landlord-permit-number"
                                                label="Business Permit Number"
                                                value={formData.permitNumber}
                                                onChange={(value) => set("permitNumber", value)}
                                                required
                                                icon={<ClipboardList className="signup-icon-small" />}
                                            />


                                            <div className="signup-landlord-actions signup-landlord-actions-end">

                                                <button
                                                    type="button"
                                                    onClick={
                                                        nextLandlordStep
                                                    }
                                                    className="signup-landlord-continue"
                                                >

                                                    Continue

                                                    <ChevronRight className="signup-next-icon" />

                                                </button>

                                            </div>

                                        </div>

                                    )}


                                    {/* =============================================
                                        STEP 2
                                        CONTACT INFORMATION
                                    ============================================= */}

                                    {false && (

                                        <div className="signup-landlord-panel">

                                            <h2 className="signup-landlord-panel-title">
                                                Contact
                                                Information
                                            </h2>


                                            <AuthField
                                                id="landlord-mobile"
                                                label="Mobile Number"
                                                type="tel"
                                                value={
                                                    formData.mobileNumber
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    set(
                                                        "mobileNumber",
                                                        value
                                                    )
                                                }
                                                required
                                                icon={
                                                    <Phone className="signup-icon-small" />
                                                }
                                            />


                                            <div className="signup-landlord-actions">

                                                <button
                                                    type="button"
                                                    onClick={
                                                        previousLandlordStep
                                                    }
                                                    className="signup-landlord-back"
                                                >
                                                    Back
                                                </button>


                                                <button
                                                    type="button"
                                                    onClick={
                                                        nextLandlordStep
                                                    }
                                                    className="signup-landlord-continue"
                                                >

                                                    Continue

                                                    <ChevronRight className="signup-next-icon" />

                                                </button>

                                            </div>

                                        </div>

                                    )}


                                    {/* =============================================
                                        STEP 3
                                        LANDLORD VERIFICATION
                                    ============================================= */}

                                    {false && (

                                        <div className="signup-landlord-panel">

                                            <h2 className="signup-landlord-panel-title">
                                                Landlord
                                                Verification
                                            </h2>


                                            <div className="signup-verification-fields">

                                                <AuthField
                                                    id="landlord-permit-number"
                                                    label="Business Permit Number"
                                                    value={
                                                        formData.permitNumber
                                                    }
                                                    onChange={(
                                                        value
                                                    ) =>
                                                        set(
                                                            "permitNumber",
                                                            value
                                                        )
                                                    }
                                                    required
                                                    icon={
                                                        <ClipboardList className="signup-icon-small" />
                                                    }
                                                />


                                                <div className="signup-documents-grid">

                                                    {[
                                                        {
                                                            label:
                                                                "Business Permit",
                                                            ref: permitRef,
                                                            file: permitFile,
                                                            setFile:
                                                                setPermitFile,
                                                        },
                                                        {
                                                            label:
                                                                "Valid ID",
                                                            ref: idRef,
                                                            file: idFile,
                                                            setFile:
                                                                setIdFile,
                                                        },
                                                    ].map(
                                                        ({
                                                            label,
                                                            ref,
                                                            file,
                                                            setFile,
                                                        }) => (

                                                            <div
                                                                key={
                                                                    label
                                                                }
                                                            >

                                                                <p className="signup-document-label">
                                                                    {
                                                                        label
                                                                    }
                                                                </p>


                                                                <p className="signup-document-description">
                                                                    Optional
                                                                    during
                                                                    signup —
                                                                    required
                                                                    for
                                                                    verification
                                                                </p>


                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        ref.current?.click()
                                                                    }
                                                                    className={`signup-document-upload ${
                                                                        file
                                                                            ? "signup-document-upload-active"
                                                                            : "signup-document-upload-idle"
                                                                    }`}
                                                                >

                                                                    {file ? (
                                                                        <>

                                                                            <CheckCircle2 className="signup-document-icon" />

                                                                            <span className="signup-document-name">
                                                                                {
                                                                                    file.name
                                                                                }
                                                                            </span>

                                                                        </>
                                                                    ) : (
                                                                        <>

                                                                            <Upload className="signup-upload-icon" />

                                                                            <span className="signup-upload-hint">
                                                                                Upload
                                                                                file
                                                                            </span>

                                                                        </>
                                                                    )}

                                                                </button>


                                                                <input
                                                                    ref={
                                                                        ref
                                                                    }
                                                                    type="file"
                                                                    accept="image/*,.pdf"
                                                                    className="signup-file-input"
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setFile(
                                                                            event
                                                                                .target
                                                                                .files?.[0] ||
                                                                                null
                                                                        )
                                                                    }
                                                                />

                                                            </div>

                                                        )
                                                    )}

                                                </div>


                                                <div className="signup-verification-notice">

                                                    <ShieldCheck className="signup-notice-icon" />


                                                    <p className="signup-notice-text">
                                                        You may
                                                        upload your
                                                        verification
                                                        documents now
                                                        or complete
                                                        them later.
                                                        Your apartment
                                                        listings
                                                        cannot be
                                                        published
                                                        until your
                                                        landlord
                                                        verification
                                                        is approved.
                                                    </p>

                                                </div>

                                            </div>


                                            <div className="signup-landlord-actions">

                                                <button
                                                    type="button"
                                                    onClick={
                                                        previousLandlordStep
                                                    }
                                                    className="signup-landlord-back"
                                                >
                                                    Back
                                                </button>


                                                <button
                                                    type="button"
                                                    onClick={
                                                        nextLandlordStep
                                                    }
                                                    className="signup-landlord-continue"
                                                >

                                                    Continue

                                                    <ChevronRight className="signup-next-icon" />

                                                </button>

                                            </div>

                                        </div>

                                    )}


                                    {/* =============================================
                                        STEP 4
                                        ACCOUNT SECURITY
                                    ============================================= */}

                                    {landlordStep ===
                                        1 && (

                                        <div className="signup-landlord-panel signup-landlord-panel--account">

                                            <h2 className="signup-landlord-panel-title">
                                                Account Details
                                            </h2>


                                            {/* USERNAME */}

                                            <div className="signup-account-field">

                                                <AuthField
                                                    id="landlord-username"
                                                    label="Username"
                                                    value={
                                                        formData.username
                                                    }
                                                    onChange={(
                                                        value
                                                    ) =>
                                                        set(
                                                            "username",
                                                            value
                                                        )
                                                    }
                                                    required
                                                    placeholder="Choose a unique username"
                                                    icon={
                                                        <User className="signup-icon-small" />
                                                    }
                                                />


                                                <p className="signup-account-hint">
                                                    You will use
                                                    this username
                                                    when signing
                                                    in. Use 4–30
                                                    letters,
                                                    numbers, or
                                                    underscores
                                                    with no
                                                    spaces.
                                                </p>

                                            </div>


                                            {/* EMAIL */}

                                            <div className="signup-account-field">

                                                <AuthField
                                                    id="landlord-email"
                                                    label="Recovery Email"
                                                    type="email"
                                                    value={
                                                        formData.email
                                                    }
                                                    onChange={(
                                                        value
                                                    ) =>
                                                        set(
                                                            "email",
                                                            value
                                                        )
                                                    }
                                                    required
                                                    placeholder="you@example.com"
                                                    icon={
                                                        <Mail className="signup-icon-small" />
                                                    }
                                                />


                                                <p className="signup-account-hint">
                                                    Used for
                                                    account
                                                    verification,
                                                    password
                                                    recovery, and
                                                    important
                                                    account
                                                    notices.
                                                </p>

                                            </div>


                                            {/* PASSWORD */}

                                            <div>

                                                <AuthField
                                                    id="landlord-password"
                                                    label="Password"
                                                    type={
                                                        showPass
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    value={
                                                        formData.password
                                                    }
                                                    onChange={(
                                                        value
                                                    ) =>
                                                        set(
                                                            "password",
                                                            value
                                                        )
                                                    }
                                                    required
                                                    icon={
                                                        <Key className="signup-icon-small" />
                                                    }
                                                    suffix={

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setShowPass(
                                                                    (
                                                                        previous
                                                                    ) =>
                                                                        !previous
                                                                )
                                                            }
                                                            className="auth-password-toggle signup-password-toggle"
                                                            aria-label={
                                                                showPass
                                                                    ? "Hide password"
                                                                    : "Show password"
                                                            }
                                                        >

                                                            {showPass ? (

                                                                <EyeOff className="signup-icon-small" />

                                                            ) : (

                                                                <Eye className="signup-icon-small" />

                                                            )}

                                                        </button>

                                                    }
                                                />


                                                {formData.password && (

                                                    <div className="signup-strength">

                                                        <div className="signup-strength-bars">

                                                            {[
                                                                1,
                                                                2,
                                                                3,
                                                                4,
                                                                5,
                                                            ].map(
                                                                (
                                                                    number
                                                                ) => (

                                                                    <div
                                                                        key={
                                                                            number
                                                                        }
                                                                        className={`signup-strength-segment ${
                                                                            number <=
                                                                            strength
                                                                                ? strengthColor[
                                                                                      strength
                                                                                  ]
                                                                                : "signup-strength-segment-idle"
                                                                        }`}
                                                                    />

                                                                )
                                                            )}

                                                        </div>


                                                        <p
                                                            className={`signup-strength-label ${
                                                                strengthText[
                                                                    strength
                                                                ]
                                                            }`}
                                                        >
                                                            {
                                                                strengthLabel[
                                                                    strength
                                                                ]
                                                            }
                                                        </p>

                                                    </div>

                                                )}

                                            </div>


                                            {/* CONFIRM PASSWORD */}

                                            <AuthField
                                                id="landlord-confirm-password"
                                                label="Confirm Password"
                                                type={
                                                    showConfirm
                                                        ? "text"
                                                        : "password"
                                                }
                                                value={
                                                    formData.confirmPassword
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    set(
                                                        "confirmPassword",
                                                        value
                                                    )
                                                }
                                                required
                                                icon={
                                                    <Lock className="signup-icon-small" />
                                                }
                                                suffix={

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowConfirm(
                                                                (
                                                                    previous
                                                                ) =>
                                                                    !previous
                                                            )
                                                        }
                                                        className="auth-password-toggle signup-password-toggle"
                                                        aria-label={
                                                            showConfirm
                                                                ? "Hide confirm password"
                                                                : "Show confirm password"
                                                        }
                                                    >

                                                        {showConfirm ? (

                                                            <EyeOff className="signup-icon-small" />

                                                        ) : (

                                                            <Eye className="signup-icon-small" />

                                                        )}

                                                    </button>

                                                }
                                            />


                                            {/* PASSWORD MISMATCH */}

                                            {formData.confirmPassword &&
                                                formData.password !==
                                                    formData.confirmPassword && (

                                                    <p className="signup-mismatch-message">

                                                        <AlertCircle className="signup-validation-icon" />

                                                        Passwords do
                                                        not match

                                                    </p>

                                                )}


                                            {/* PASSWORD MATCH */}

                                            {formData.confirmPassword &&
                                                formData.password ===
                                                    formData.confirmPassword &&
                                                formData.password
                                                    .length >=
                                                    6 && (

                                                    <p className="signup-match-message">

                                                        <CheckCircle2 className="signup-validation-icon" />

                                                        Passwords
                                                        match

                                                    </p>

                                                )}


                                            {/* REQUIREMENTS */}

                                            <div className="signup-requirements">

                                                {[
                                                    {
                                                        label:
                                                            "At least 6 characters",
                                                        met:
                                                            formData
                                                                .password
                                                                .length >=
                                                            6,
                                                    },
                                                    {
                                                        label:
                                                            "Uppercase strengthens it",
                                                        met: /[A-Z]/.test(
                                                            formData.password
                                                        ),
                                                    },
                                                    {
                                                        label:
                                                            "Number strengthens it",
                                                        met: /[0-9]/.test(
                                                            formData.password
                                                        ),
                                                    },
                                                    {
                                                        label:
                                                            "Passwords match",
                                                        met:
                                                            !!formData.password &&
                                                            formData.password ===
                                                                formData.confirmPassword,
                                                    },
                                                ].map(
                                                    ({
                                                        label,
                                                        met,
                                                    }) => (

                                                        <div
                                                            key={
                                                                label
                                                            }
                                                            className={`signup-requirement ${
                                                                met
                                                                    ? "signup-requirement-active"
                                                                    : "signup-requirement-idle"
                                                            }`}
                                                        >

                                                            <div
                                                                className={`signup-requirement-marker ${
                                                                    met
                                                                        ? "signup-requirement-marker-active"
                                                                        : "signup-requirement-marker-idle"
                                                                }`}
                                                            >

                                                                {met && (

                                                                    <Check className="signup-requirement-check" />

                                                                )}

                                                            </div>


                                                            {
                                                                label
                                                            }

                                                        </div>

                                                    )
                                                )}

                                            </div>


                                            <div className="signup-landlord-actions">

                                                <button
                                                    type="button"
                                                    onClick={
                                                        previousLandlordStep
                                                    }
                                                    className="signup-landlord-back"
                                                >
                                                    Back
                                                </button>


                                                <button
                                                    type="button"
                                                    onClick={
                                                        nextLandlordStep
                                                    }
                                                    className="signup-landlord-continue"
                                                >

                                                    Continue

                                                    <ChevronRight className="signup-next-icon" />

                                                </button>

                                            </div>

                                        </div>

                                    )}


                                    {/* =============================================
                                        STEP 5
                                        REVIEW
                                    ============================================= */}

                                    {landlordStep ===
                                        3 && (

                                        <div className="signup-landlord-panel">

                                            <h2 className="signup-landlord-panel-title">
                                                Review
                                            </h2>


                                            {/* PERSONAL */}

                                            <div className="signup-landlord-review-card">

                                                <div className="signup-landlord-review-heading">

                                                    <strong>
                                                        Personal
                                                        Information
                                                    </strong>


                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setLandlordStep(
                                                                2
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                </div>


                                                <div className="signup-landlord-review-row">

                                                    <span>
                                                        Name
                                                    </span>


                                                    <b>

                                                        {`${formData.firstName} ${
                                                            formData.middleInitial
                                                                ? `${formData.middleInitial}. `
                                                                : ""
                                                        }${formData.lastName}`.trim()}

                                                    </b>

                                                </div>


                                                <div className="signup-landlord-review-row">

                                                    <span>
                                                        Home
                                                        Address
                                                    </span>

                                                    <b>
                                                        {
                                                            formData.address
                                                        }
                                                    </b>

                                                </div>

                                                <div className="signup-landlord-review-row">

                                                    <span>
                                                        Mobile Number
                                                    </span>

                                                    <b>
                                                        {formData.mobileNumber}
                                                    </b>

                                                </div>

                                                <div className="signup-landlord-review-row">

                                                    <span>
                                                        Business Permit Number
                                                    </span>

                                                    <b>
                                                        {formData.permitNumber}
                                                    </b>

                                                </div>

                                            </div>


                                            {/* CONTACT */}

                                            <div className="signup-landlord-review-card signup-landlord-review-card--redundant">

                                                <div className="signup-landlord-review-heading">

                                                    <strong>
                                                        Contact
                                                        Information
                                                    </strong>


                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setLandlordStep(
                                                                2
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                </div>


                                                <div className="signup-landlord-review-row">

                                                    <span>
                                                        Mobile
                                                        Number
                                                    </span>

                                                    <b>
                                                        {
                                                            formData.mobileNumber
                                                        }
                                                    </b>

                                                </div>

                                            </div>


                                            {/* VERIFICATION */}

                                            <div className="signup-landlord-review-card signup-landlord-review-card--redundant">

                                                <div className="signup-landlord-review-heading">

                                                    <strong>
                                                        Landlord
                                                        Verification
                                                    </strong>


                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setLandlordStep(
                                                                3
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                </div>


                                                <div className="signup-landlord-review-row">

                                                    <span>
                                                        Business
                                                        Permit
                                                        Number
                                                    </span>

                                                    <b>
                                                        {
                                                            formData.permitNumber
                                                        }
                                                    </b>

                                                </div>


                                                <div className="signup-landlord-review-row">

                                                    <span>
                                                        Business
                                                        Permit
                                                    </span>

                                                    <b>
                                                        {permitFile?.name ||
                                                            "Not uploaded yet"}
                                                    </b>

                                                </div>


                                                <div className="signup-landlord-review-row">

                                                    <span>
                                                        Valid ID
                                                    </span>

                                                    <b>
                                                        {idFile?.name ||
                                                            "Not uploaded yet"}
                                                    </b>

                                                </div>

                                            </div>


                                            {/* SECURITY */}

                                            <div className="signup-landlord-review-card">

                                                <div className="signup-landlord-review-heading">

                                                    <strong>
                                                        Account
                                                        Details
                                                    </strong>


                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setLandlordStep(
                                                                1
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                </div>


                                                <div className="signup-landlord-review-row">

                                                    <span>
                                                        Username
                                                    </span>

                                                    <b>
                                                        {
                                                            formData.username
                                                        }
                                                    </b>

                                                </div>


                                                <div className="signup-landlord-review-row">

                                                    <span>
                                                        Recovery
                                                        Email
                                                    </span>

                                                    <b>
                                                        {
                                                            formData.email
                                                        }
                                                    </b>

                                                </div>

                                            </div>


                                            {/* LANDLORD AGREEMENT */}

                                            <label className="signup-agreement">

                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        landlordAgreementAccepted
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setLandlordAgreementAccepted(
                                                            event
                                                                .target
                                                                .checked
                                                        )
                                                    }
                                                    className="signup-checkbox"
                                                />


                                                <span>

                                                    <strong>
                                                        I agree
                                                        to
                                                        AptFindr&apos;s
                                                        Terms of
                                                        Use,
                                                        Privacy
                                                        Policy,
                                                        and
                                                        Landlord
                                                        Verification
                                                        Policy.
                                                    </strong>{" "}

                                                    I understand
                                                    that my
                                                    Business
                                                    Permit Number
                                                    and submitted
                                                    verification
                                                    information
                                                    may be
                                                    reviewed by
                                                    the
                                                    administrator,
                                                    and that my
                                                    apartment
                                                    listings
                                                    cannot be
                                                    published
                                                    until my
                                                    landlord
                                                    account is
                                                    verified.

                                                </span>

                                            </label>


                                            {/* FINAL ACTIONS */}

                                            <div className="signup-landlord-actions">

                                                <button
                                                    type="button"
                                                    onClick={
                                                        previousLandlordStep
                                                    }
                                                    className="signup-landlord-back"
                                                >
                                                    Back
                                                </button>


                                                <Button
                                                    type="submit"
                                                    disabled={
                                                        loading
                                                    }
                                                    className="signup-submit-button signup-landlord-final-submit"
                                                >

                                                    {loading ? (
                                                        <>

                                                            <div className="signup-spinner" />

                                                            Creating
                                                            your
                                                            account...

                                                        </>
                                                    ) : (
                                                        "Create Account"
                                                    )}

                                                </Button>

                                            </div>

                                        </div>

                                    )}

                                </div>

                            )}


                            {formData.role === "landlord" && (
                                <>
                                <div className="signup-landlord-wizard signup-landlord-wizard--compact">
                                    <div className="signup-landlord-stepper" aria-label={`Step ${landlordStep} of 3`}>
                                        {["Account Details", "Personal Information", "Review"].map((label, index) => {
                                            const stepNumber = index + 1;
                                            const active = landlordStep === stepNumber;
                                            const complete = landlordStep > stepNumber;

                                            return (
                                                <div className="signup-landlord-step-item" key={label}>
                                                    <div className={`signup-landlord-step-circle ${active || complete ? "signup-landlord-step-circle-active" : ""}`}>
                                                        {stepNumber}
                                                    </div>
                                                    <span className={`signup-landlord-step-text ${active ? "signup-landlord-step-text-active" : ""}`}>{label}</span>
                                                    {stepNumber < 3 && <span className={`signup-landlord-step-connector ${complete ? "signup-landlord-step-connector-complete" : ""}`} />}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {landlordStep === 1 && (
                                        <section className="signup-landlord-panel signup-landlord-panel--account">
                                            <h2 className="signup-landlord-panel-title">Account Details</h2>
                                            <AuthField id="landlord-username" label="Username" value={formData.username} onChange={(value) => set("username", value)} required placeholder="Enter your username" />
                                            <AuthField id="landlord-email" label="Email Address" type="email" value={formData.email} onChange={(value) => set("email", value)} required placeholder="Enter your email address" />
                                            <AuthField id="landlord-password" label="Password" type={showPass ? "text" : "password"} value={formData.password} onChange={(value) => set("password", value)} required placeholder="Enter your password" suffix={<button type="button" onClick={() => setShowPass((previous) => !previous)} className="auth-password-toggle signup-password-toggle" aria-label={showPass ? "Hide password" : "Show password"}>{showPass ? <EyeOff className="signup-icon-small" /> : <Eye className="signup-icon-small" />}</button>} />
                                            <AuthField id="landlord-confirm-password" label="Confirm Password" type={showConfirm ? "text" : "password"} value={formData.confirmPassword} onChange={(value) => set("confirmPassword", value)} required placeholder="Confirm your password" suffix={<button type="button" onClick={() => setShowConfirm((previous) => !previous)} className="auth-password-toggle signup-password-toggle" aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}>{showConfirm ? <EyeOff className="signup-icon-small" /> : <Eye className="signup-icon-small" />}</button>} />
                                            <div className="signup-tenant-password-help"><strong>Password must contain:</strong><span>At least 6 characters. An uppercase letter, number, and special character are recommended for a stronger password.</span></div>
                                            <div className="signup-landlord-actions signup-landlord-actions-end">
                                                <button type="button" onClick={nextLandlordStep} className="signup-landlord-continue">Continue <ChevronRight className="signup-next-icon" /></button>
                                            </div>
                                        </section>
                                    )}

                                    {landlordStep === 2 && (
                                        <section className="signup-landlord-panel">
                                            <h2 className="signup-landlord-panel-title">Personal Information</h2>
                                            <AuthField id="landlord-first-name-compact" label="First Name" value={formData.firstName} onChange={(value) => set("firstName", value)} required placeholder="Enter your first name" />
                                            <AuthField id="landlord-last-name-compact" label="Last Name" value={formData.lastName} onChange={(value) => set("lastName", value)} required placeholder="Enter your last name" />
                                            <AuthField id="landlord-middle-initial-compact" label="Middle Initial (Optional)" value={formData.middleInitial} onChange={(value) => set("middleInitial", value)} placeholder="M" />
                                            <AuthField id="landlord-mobile-compact" label="Mobile Number" type="tel" value={formData.mobileNumber} onChange={(value) => set("mobileNumber", value)} required placeholder="Enter your mobile number" />
                                            <div className="signup-landlord-actions">
                                                <button type="button" onClick={previousLandlordStep} className="signup-landlord-back">Back</button>
                                                <button type="button" onClick={nextLandlordStep} className="signup-landlord-continue">Continue <ChevronRight className="signup-next-icon" /></button>
                                            </div>
                                        </section>
                                    )}

                                    {landlordStep === 3 && (
                                        <section className="signup-landlord-panel">
                                            <h2 className="signup-landlord-panel-title">Review</h2>
                                            <div className="signup-landlord-review-card">
                                                <div className="signup-landlord-review-heading"><strong>Account Details</strong><button type="button" onClick={() => openLandlordReviewEditor("account")}>Edit</button></div>
                                                <div className="signup-landlord-review-row"><span>Username</span><b>{formData.username}</b></div>
                                                <div className="signup-landlord-review-row"><span>Recovery Email</span><b>{formData.email}</b></div>
                                            </div>
                                            <div className="signup-landlord-review-card">
                                                <div className="signup-landlord-review-heading"><strong>Personal Information</strong><button type="button" onClick={() => openLandlordReviewEditor("personal")}>Edit</button></div>
                                                <div className="signup-landlord-review-row"><span>Name</span><b>{`${formData.firstName} ${formData.middleInitial ? `${formData.middleInitial}. ` : ""}${formData.lastName}`.trim()}</b></div>
                                                <div className="signup-landlord-review-row"><span>Mobile Number</span><b>{formData.mobileNumber}</b></div>
                                            </div>
                                            <label className="signup-agreement">
                                                <input type="checkbox" checked={landlordAgreementAccepted} onChange={(event) => setLandlordAgreementAccepted(event.target.checked)} className="signup-checkbox" />
                                                <span>I agree to the Terms of Service and Privacy Policy.</span>
                                            </label>
                                            <Button type="submit" disabled={loading} className="signup-submit-button signup-landlord-final-submit">{loading ? <><span className="signup-spinner" /> Creating your account...</> : "Create Account"}</Button>
                                        </section>
                                    )}
                                </div>

                                {reviewEditor && reviewDraft && (
                                    <div className="signup-review-dialog-backdrop" role="presentation">
                                        <section className="signup-review-dialog" role="dialog" aria-modal="true" aria-labelledby="signup-review-dialog-title">
                                            <button type="button" className="signup-review-dialog-close" onClick={() => setReviewEditor(null)} aria-label="Close">&times;</button>
                                            <h2 id="signup-review-dialog-title">{reviewEditor === "account" ? "Edit Account Details" : "Edit Personal Information"}</h2>
                                            <p>{reviewEditor === "account" ? "Update your account details below." : "Update your personal information below."}</p>
                                            {reviewEditor === "account" ? (
                                                <>
                                                    <label>Username <span>*</span><input value={reviewDraft.username} onChange={(event) => setReviewDraft((draft) => ({ ...draft, username: event.target.value }))} /></label>
                                                    <label>Recovery Email <span>*</span><input type="email" value={reviewDraft.email} onChange={(event) => setReviewDraft((draft) => ({ ...draft, email: event.target.value }))} /></label>
                                                </>
                                            ) : (
                                                <>
                                                    <label>First Name <span>*</span><input value={reviewDraft.firstName} onChange={(event) => setReviewDraft((draft) => ({ ...draft, firstName: event.target.value }))} /></label>
                                                    <label>Last Name <span>*</span><input value={reviewDraft.lastName} onChange={(event) => setReviewDraft((draft) => ({ ...draft, lastName: event.target.value }))} /></label>
                                                    <label>Middle Initial<input value={reviewDraft.middleInitial} onChange={(event) => setReviewDraft((draft) => ({ ...draft, middleInitial: event.target.value }))} /></label>
                                                    <label>Mobile Number <span>*</span><input type="tel" value={reviewDraft.mobileNumber} onChange={(event) => setReviewDraft((draft) => ({ ...draft, mobileNumber: event.target.value }))} /></label>
                                                </>
                                            )}
                                            <div className="signup-review-dialog-actions">
                                                <button type="button" onClick={() => setReviewEditor(null)}>Cancel</button>
                                                <button type="button" onClick={saveLandlordReviewEditor}>Save Changes</button>
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {reviewUpdateSuccess && (
                                    <div className="signup-review-dialog-backdrop" role="presentation">
                                        <section className="signup-review-success" role="dialog" aria-modal="true" aria-live="polite">
                                            <span aria-hidden="true"><Check /></span>
                                            <h2>{reviewUpdateSuccess === "account" ? "Account Details Updated" : "Personal Information Updated"}</h2>
                                            <p>Your {reviewUpdateSuccess === "account" ? "account details" : "personal information"} have been updated successfully.</p>
                                            <button type="button" onClick={() => setReviewUpdateSuccess(null)}>OK</button>
                                        </section>
                                    </div>
                                )}
                                </>
                            )}


                            {/* =================================================
                                BACK HOME

                                Only show while choosing account type.
                            ================================================= */}

                            {!formData.role && (

                                <Link
                                    to="/"
                                    className="signup-home-link"
                                >

                                    <Home className="signup-icon-small" />

                                    Back to Home

                                </Link>

                            )}

                        </form>

                    </div>

                </div>

            </div>

        </div>
    );
}
