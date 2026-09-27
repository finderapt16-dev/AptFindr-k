import { AppLogo } from "@/components/AppLogo";
import { LandingListingsSection } from "./LandingApartmentPreview";
import { Login } from "@/auth/Signin";
import { Signup } from "@/auth/Signup";

import { Button } from "@/components/ui/button";

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

import { useAuth } from "@/contexts/AuthContext";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";

import { isTenantVisibleApartment } from "@/utils/listingVisibility";
import { isTenantRole } from "@/services/authService";

import {
    Mail,
    MapPin,
    Menu,
    Search,
    X,
} from "lucide-react";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Link,
    useLocation,
    useNavigate,
} from "react-router-dom";

import "./landing.css";


/* =========================================================
   LOCATION HELPERS
========================================================= */

const normalizeLocationKey = (value) =>
    value
        .toLocaleLowerCase("en-PH")
        .replace(
            /\b(?:barangay|brgy)\.?\s*/g,
            ""
        )
        .replace(
            /\b(?:sto|santo)\.?\s+/g,
            "sto "
        )
        .replace(
            /[^a-z0-9]+/g,
            " "
        )
        .trim();


const formatLocationName = (value) =>
    value
        .replace(
            /\b(?:barangay|brgy)\.?\s*/gi,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .toLocaleLowerCase("en-PH")
        .replace(
            /(^|\s)\p{L}/gu,
            (letter) =>
                letter.toLocaleUpperCase(
                    "en-PH"
                )
        )
        .replace(
            /^Sto\s+/i,
            "Sto. "
        );


const genericLocationKey =
    /^(?:la paz|lapaz|iloilo|iloilo city|iloilo province|western visayas|philippines|5000)$/;


const streetAddressPattern =
    /^\d|\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|block|blk\.?|lot|house|unit)\b/i;


const getInventoryLocation = (
    apartment
) => {
    const scopeText = [
        apartment.city,
        apartment.state,
        apartment.address,
        apartment.location,
    ]
        .filter(Boolean)
        .join(" ");

    if (
        !/\bla\s*paz\b/i.test(
            scopeText
        ) ||
        !/\biloilo\b/i.test(
            scopeText
        )
    ) {
        return null;
    }


    const candidates = [
        apartment.location,
        apartment.city,
    ]
        .filter(
            (value) =>
                Boolean(
                    value?.trim()
                )
        )
        .flatMap(
            (value) =>
                value.split(",")
        )
        .concat(
            (
                apartment.address ||
                ""
            )
                .split(",")
                .reverse()
        );


    for (
        const candidate
        of candidates
    ) {
        const displayName =
            formatLocationName(
                candidate
            );

        const key =
            normalizeLocationKey(
                displayName
            );

        if (
            !key ||
            genericLocationKey.test(
                key
            ) ||
            streetAddressPattern.test(
                displayName
            )
        ) {
            continue;
        }

        return displayName;
    }


    return null;
};


/* =========================================================
   LANDING
========================================================= */

export function Landing() {
    const {
        user,
    } = useAuth();


    const {
        apartments,
    } =
        useApartmentsContext();


    const navigate =
        useNavigate();

    const location =
        useLocation();


    /* =====================================================
       LANDING STATE
    ===================================================== */

    const [
        landingSearch,
        setLandingSearch,
    ] = useState("");


    const [
        scrolled,
        setScrolled,
    ] = useState(false);


    /* =====================================================
       LOGIN MODAL
    ===================================================== */

    const [
        loginOpen,
        setLoginOpen,
    ] = useState(false);

    const [
        signupOpen,
        setSignupOpen,
    ] = useState(false);

    const [
        signupRedirect,
        setSignupRedirect,
    ] = useState(null);


    /*
     * Destination to continue to
     * after successful login.
     */
    const [
        loginRedirect,
        setLoginRedirect,
    ] = useState(null);


    // /login is a public deep link. Open the existing landing login modal so
    // direct navigation has the same presentation as clicking Sign In.
    useEffect(() => {
        if (location.pathname === "/login") {
            setLoginOpen(true);
        }
    }, [location.pathname]);


    /* =====================================================
       INVENTORY LOCATIONS
    ===================================================== */

    const inventoryLocations =
        useMemo(() => {
            const grouped =
                new Map();


            apartments
                .filter(
                    isTenantVisibleApartment
                )
                .forEach(
                    (apartment) => {
                        const name =
                            getInventoryLocation(
                                apartment
                            );


                        if (!name) {
                            return;
                        }


                        const key =
                            normalizeLocationKey(
                                name
                            );


                        const existing =
                            grouped.get(
                                key
                            );


                        grouped.set(
                            key,
                            existing
                                ? {
                                      ...existing,
                                      count:
                                          existing.count +
                                          1,
                                  }
                                : {
                                      name,
                                      count: 1,
                                  }
                        );
                    }
                );


            return [
                ...grouped.values(),
            ]
                .sort(
                    (
                        left,
                        right
                    ) =>
                        right.count -
                            left.count ||
                        left.name.localeCompare(
                            right.name,
                            "en-PH"
                        )
                )
                .slice(
                    0,
                    6
                );
        }, [apartments]);


    /* =====================================================
       HEADER SCROLL
    ===================================================== */

    useEffect(() => {
        const onScroll =
            () => {
                setScrolled(
                    window.scrollY >
                        20
                );
            };


        window.addEventListener(
            "scroll",
            onScroll
        );


        return () => {
            window.removeEventListener(
                "scroll",
                onScroll
            );
        };
    }, []);


    /* =====================================================
       LOGIN MODAL
       ESC + PREVENT BODY SCROLL
    ===================================================== */

    useEffect(() => {
        if (!loginOpen && !signupOpen) {
            return;
        }


        const previousOverflow =
            document.body.style
                .overflow;


        document.body.style.overflow =
            "hidden";


        const handleKeyDown =
            (event) => {
                if (
                    event.key ===
                    "Escape"
                ) {
                    setLoginOpen(
                        false
                    );

                    setSignupOpen(
                        false
                    );

                    setSignupRedirect(
                        null
                    );

                    setLoginRedirect(
                        null
                    );

                    if (location.pathname === "/login") {
                        navigate("/", { replace: true });
                    }
                }
            };


        window.addEventListener(
            "keydown",
            handleKeyDown
        );


        return () => {
            document.body.style.overflow =
                previousOverflow;


            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [loginOpen, signupOpen, location.pathname, navigate]);


    /* =====================================================
       DASHBOARD
    ===================================================== */

    const dashboardPath =
        user?.role === "admin"
            ? "/admin"
            : "/dashboard";


    /* =====================================================
       OPEN / CLOSE LOGIN
    ===================================================== */

    const openLogin = (
        destination = null
    ) => {
        setLoginRedirect(
            destination
        );

        setLoginOpen(
            true
        );
    };

    const openSignup = (destination = null) => {
        setLoginOpen(false);
        setSignupRedirect(destination);
        setSignupOpen(true);
    };


    const closeLogin = () => {
        setLoginOpen(
            false
        );

        setLoginRedirect(
            null
        );

        if (location.pathname === "/login") {
            navigate("/", { replace: true });
        }
    };

    const closeSignup = () => {
        setSignupOpen(false);
        setSignupRedirect(null);
    };


    /* =====================================================
       LOGIN SUCCESS

       Authentication itself is handled
       inside reusable Signin.jsx.
    ===================================================== */

    const handleLoginSuccess =
        (
            loggedInUser
        ) => {
            /*
             * Save this before clearing state.
             */
            const destination =
                loginRedirect;


            setLoginOpen(
                false
            );

            setLoginRedirect(
                null
            );


            /*
             * User clicked something protected
             * before signing in.
             */
            if (
                destination
            ) {
                navigate(
                    destination
                );

                return;
            }


            /*
             * Normal login button.
             */
            if (
                loggedInUser?.role ===
                "admin"
            ) {
                navigate(
                    "/admin",
                    {
                        replace: true,
                    }
                );

                return;
            }


            if (
                isTenantRole(
                    loggedInUser?.role
                )
            ) {
                navigate(
                    "/browse",
                    {
                        replace: true,
                    }
                );

                return;
            }


            navigate(
                "/dashboard",
                {
                    replace: true,
                }
            );
        };


    /* =====================================================
       CREATE ACCOUNT FROM LOGIN
    ===================================================== */

    const handleCreateAccount =
        () => {
            const destination =
                loginRedirect;


            setLoginOpen(
                false
            );

            setLoginRedirect(
                null
            );


            openSignup(destination);
        };


    /* =====================================================
       FORGOT PASSWORD
    ===================================================== */

    const handleForgotPassword =
        () => {
            setLoginOpen(
                false
            );

            setLoginRedirect(
                null
            );


            navigate(
                "/forgot-password"
            );
        };


    /* =====================================================
       PROTECTED ACTION
    ===================================================== */

    const handleProtectedAction =
        (event) => {
            if (user) {
                return;
            }


            event?.preventDefault?.();


            const destination =
                event?.currentTarget
                    ?.getAttribute?.(
                        "href"
                    ) ||
                "/browse";


            openLogin(
                destination
            );
        };


    /* =====================================================
       SEARCH
    ===================================================== */

    const handleLandingSearch =
        (event) => {
            event.preventDefault();


            const params =
                new URLSearchParams();


            if (
                landingSearch.trim()
            ) {
                params.set(
                    "search",
                    landingSearch.trim()
                );
            }


            const destination =
                params.toString()
                    ? `/browse?${params.toString()}`
                    : "/browse";


            if (!user) {
                openLogin(
                    destination
                );

                return;
            }


            navigate(
                destination
            );
        };


    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="landing-palette landing-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <header
                className={`landing-header ${
                    scrolled
                        ? "landing-header-scrolled"
                        : "landing-header-top"
                }`}
            >

                <div className="landing-container">

                    <div className="landing-header-row">

                        {/* BRAND */}

                        <Link
                            to="/"
                            className="landing-brand"
                        >

                            <AppLogo
                                className="landing-brand-logo"
                            />


                            <div>

                                <span className="landing-brand-name">
                                    AptFindr
                                </span>


                                <p className="landing-brand-location">
                                    La Paz, Iloilo City
                                </p>

                            </div>

                        </Link>


                        {/* =============================
                            DESKTOP NAV
                        ============================= */}

                        <nav className="landing-header-nav">



                            <div className="landing-account-nav">

                                {!user ? (
                                    <>

                                        {/* LOGIN */}

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="landing-login-button"
                                            onClick={() =>
                                                openLogin()
                                            }
                                        >
                                            Login
                                        </Button>


                                        {/* SIGN UP */}

                                        <Button
                                            type="button"
                                            size="sm"
                                            className="landing-account-button"
                                            onClick={() => openSignup()}
                                        >
                                            Sign Up
                                        </Button>

                                    </>
                                ) : (

                                    <Link
                                        to={
                                            dashboardPath
                                        }
                                    >
                                        <Button
                                            size="sm"
                                            className="landing-account-button"
                                        >
                                            Dashboard
                                        </Button>
                                    </Link>

                                )}

                            </div>

                        </nav>


                        {/* =============================
                            MOBILE MENU
                        ============================= */}

                        <Sheet>

                            <SheetTrigger className="landing-menu-trigger">

                                <Menu className="landing-menu-icon" />

                            </SheetTrigger>


                            <SheetContent className="landing-menu-panel">

                                <SheetTitle className="landing-menu-title">
                                    Menu
                                </SheetTitle>


                                <SheetDescription className="landing-menu-description">
                                    AptFindr — La Paz,
                                    Iloilo City
                                </SheetDescription>


                                <nav className="landing-mobile-nav">


                                    {!user ? (
                                        <>

                                            <button
                                                type="button"
                                                className="landing-mobile-link landing-mobile-login-button"
                                                onClick={() =>
                                                    openLogin()
                                                }
                                            >
                                                Login
                                            </button>


                                            <button
                                                type="button"
                                                className="landing-mobile-link"
                                                onClick={() => openSignup()}
                                            >
                                                Sign Up
                                            </button>

                                        </>
                                    ) : (

                                        <Link
                                            to={
                                                dashboardPath
                                            }
                                            className="landing-mobile-link"
                                        >
                                            Dashboard
                                        </Link>

                                    )}

                                </nav>

                            </SheetContent>

                        </Sheet>

                    </div>

                </div>

            </header>


            {/* =================================================
                HERO
            ================================================= */}

            <section className="landing-hero-section">

                <div className="landing-container">

                    <div className="landing-hero-grid">

                        <div className="landing-hero-content">

                            <h1 className="landing-hero-title">

                                <span className="landing-title-line">
                                    Find Apartments
                                </span>


                                <span className="landing-title-line">

                                    in{" "}

                                    <span className="location-highlight">
                                        La Paz
                                    </span>

                                </span>


                                <span className="landing-title-line">
                                    That Fit Your Needs
                                </span>

                            </h1>


                            <p className="landing-hero-description">
                                Browse verified apartment
                                listings, compare rental
                                options, explore locations,
                                and review room details and
                                amenities all in one place.
                            </p>


                            {/* SEARCH */}

                            <div className="landing-search-box">

                                <form
                                    className="landing-search-form"
                                    onSubmit={
                                        handleLandingSearch
                                    }
                                >

                                    <div className="landing-search-row">

                                        <div className="landing-search-field">

                                            <Search className="landing-search-icon" />


                                            <input
                                                value={
                                                    landingSearch
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    setLandingSearch(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="Search by barangay or apartment name within La Paz..."
                                                className="landing-search-input"
                                            />

                                        </div>


                                        <Button
                                            type="submit"
                                            className="landing-search-button"
                                        >
                                            Search
                                        </Button>

                                    </div>

                                </form>

                            </div>

                        </div>

                    </div>

                </div>

            </section>


            {/* =================================================
                LISTINGS
            ================================================= */}

            <div className="landing-listings-wrapper">

                <LandingListingsSection
                    onBrowseClick={
                        handleProtectedAction
                    }
                />

            </div>


            {/* =================================================
                LOAD MORE
            ================================================= */}

            <section className="landing-final-cta">

                <div className="landing-cta-decoration">

                    <div className="landing-cta-glow-top" />

                    <div className="landing-cta-glow-bottom" />

                </div>


                <div className="landing-cta-container">

                    <div className="landing-cta-actions">

                        <Button
                            type="button"
                            size="lg"
                            className="landing-create-button"
                            onClick={() => {

                                if (
                                    user
                                ) {
                                    navigate(
                                        "/browse"
                                    );

                                    return;
                                }


                                openLogin(
                                    "/browse"
                                );

                            }}
                        >
                            Load More
                        </Button>

                    </div>

                </div>

            </section>


            {/* =================================================
                FOOTER
            ================================================= */}

            <footer className="landing-footer">

                <div className="landing-section-container">

                    <div className="landing-footer-grid">

                        <div className="landing-footer-about">

                            <div className="landing-footer-brand">

                                <span className="landing-brand-name">
                                    AptFindr
                                </span>

                            </div>


                            <p className="landing-footer-description">
                                La Paz, Iloilo City
                            </p>


                            <div className="landing-footer-contact">

                                <a
                                    href="mailto:rentiloilo@example.com"
                                    className="landing-footer-email"
                                >

                                    <Mail className="landing-small-icon" />

                                    rentiloilo@example.com

                                </a>

                            </div>

                        </div>


                        <div>

                            <h4 className="landing-footer-heading">
                                Support
                            </h4>


                            <ul className="landing-footer-links">

                                <li>
                                    <span className="landing-footer-link">
                                        Help Desk
                                    </span>
                                </li>


                                <li>
                                    <span className="landing-footer-link">
                                        Contact Us
                                    </span>
                                </li>


                                <li>
                                    <span className="landing-footer-link">
                                        Terms of Service
                                    </span>
                                </li>

                            </ul>


                            <div className="landing-footer-coverage">

                                <p className="landing-coverage-heading">
                                    Coverage Area
                                </p>


                                <div className="landing-coverage-row">

                                    <MapPin className="landing-coverage-icon" />


                                    <span className="landing-coverage-text">
                                        La Paz, Iloilo City,
                                        Philippines
                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </footer>


            {/* =================================================
                FLOATING LOGIN
            ================================================= */}

            {loginOpen && (

                <div
                    className="landing-login-overlay"
                    onMouseDown={(
                        event
                    ) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeLogin();
                        }

                    }}
                >

                    <div
                        className="landing-login-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Sign in to AptFindr"
                    >

                        {/* CLOSE */}

                        <button
                            type="button"
                            className="landing-login-close"
                            onClick={
                                closeLogin
                            }
                            aria-label="Close login"
                        >
                            <X size={18} />
                        </button>


                        {/* REUSABLE SIGNIN */}

                        <Login
                            onSuccess={
                                handleLoginSuccess
                            }

                            onCreateAccount={
                                handleCreateAccount
                            }

                            onForgotPassword={
                                handleForgotPassword
                            }
                        />

                    </div>

                </div>

            )}

            {signupOpen && (
                <div
                    className="landing-login-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeSignup();
                        }
                    }}
                >
                    <div
                        className="landing-login-modal landing-signup-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Create an AptFindr account"
                    >
                        <button
                            type="button"
                            className="landing-login-close"
                            onClick={closeSignup}
                            aria-label="Close sign up"
                        >
                            <X size={18} />
                        </button>
                        <Signup embedded redirect={signupRedirect} />
                    </div>
                </div>
            )}

        </div>
    );
}
