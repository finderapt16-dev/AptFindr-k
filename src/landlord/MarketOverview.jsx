import "./MarketOverview.css";

import {
  CalendarDays,
  Eye,
  Heart,
  MapPin,
  Menu,
  Star,
  X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ImageWithFallback } from "@/components/ImageWithFallback";
import { LandlordSidebar } from "@/landlord/LandlordSidebar";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";

import {
  fetchFavorites,
  fetchNotifications,
  fetchViewActivityForApartments,
} from "@/services/dashboardSupabaseService";

import { fetchRatingsForApartments } from "@/services/apartmentRatingsService";

import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getApartmentImageUrl } from "@/utils/images";
import { isTenantVisibleApartment } from "@/utils/listingVisibility";


/* =========================================================
   TREND TABS
========================================================= */

const TRENDS = [
  {
    id: "views",
    label: "Most Viewed",
    icon: Eye,
  },
  {
    id: "favorites",
    label: "Most Favorited",
    icon: Heart,
  },
  {
    id: "ratings",
    label: "Highest Rated",
    icon: Star,
  },
];


/* =========================================================
   HELPERS
========================================================= */

const apartmentIdFrom = (row) =>
  row.apartment_id ?? row.apartmentId;

const propertyImage = (apartment) =>
  getApartmentImageUrl(apartment);


/* =========================================================
   START OF WEEK
========================================================= */

const startOfWeek = (date = new Date()) => {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  const day = result.getDay();

  result.setDate(
    result.getDate() -
      (day === 0 ? 6 : day - 1)
  );

  return result;
};


/* =========================================================
   PERIOD CHECK
========================================================= */

const isInPeriod = (value, period) => {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const thisWeek = startOfWeek();

  if (period === "thisWeek") {
    return date >= thisWeek;
  }

  const lastWeek = new Date(thisWeek);

  lastWeek.setDate(
    lastWeek.getDate() - 7
  );

  return (
    date >= lastWeek &&
    date < thisWeek
  );
};


/* =========================================================
   MARKET OVERVIEW
========================================================= */

export function MarketOverview() {
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const {
    apartments = [],
    isLoading,
  } = useApartmentsContext();


  /* =======================================================
     STATE
  ======================================================= */

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [period, setPeriod] =
    useState("thisWeek");

  const [trendType, setTrendType] =
    useState("views");

  const [views, setViews] =
    useState([]);

  const [favorites, setFavorites] =
    useState([]);

  const [ratings, setRatings] =
    useState([]);

  const [unreadNotifications, setUnreadNotifications] =
    useState(0);


  /* =======================================================
     LANDLORD PROPERTIES
  ======================================================= */

  const properties = useMemo(
    () =>
      apartments.filter(
        (apartment) =>
          isTenantVisibleApartment(apartment) &&
          (apartment.landlordId ??
            apartment.landlord_id) === user?.id
      ),
    [apartments, user?.id]
  );


  /* =======================================================
     PROPERTY IDS
  ======================================================= */

  const propertyIds = useMemo(
    () =>
      properties
        .map((property) => property.id)
        .filter(Boolean),
    [properties]
  );


  /* =======================================================
     LOAD ACTIVITY
  ======================================================= */

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [
          viewRows,
          favoriteRows,
          ratingRows,
          notifications,
        ] = await Promise.all([
          propertyIds.length
            ? fetchViewActivityForApartments(propertyIds)
            : [],

          fetchFavorites(),

          propertyIds.length
            ? fetchRatingsForApartments(propertyIds)
            : [],

          user?.id
            ? fetchNotifications(user.id)
            : [],
        ]);

        if (!active) return;

        setViews(viewRows ?? []);

        setFavorites(
          favoriteRows ?? []
        );

        setRatings(
          ratingRows ?? []
        );

        setUnreadNotifications(
          (notifications ?? []).filter(
            (item) =>
              !(item.read ?? item.is_read)
          ).length
        );
      } catch (error) {
        console.error(
          "Unable to load market trends:",
          error
        );
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [
    propertyIds.join(","),
    user?.id,
  ]);


  /* =======================================================
     VIEW HISTORY CHECK
  ======================================================= */

  const viewHistoryAvailable = useMemo(
    () =>
      views.every(
        (row) =>
          row.view_date &&
          Number(row.view_count ?? 1) === 1
      ),
    [views]
  );


  /* =======================================================
     BUILD PROPERTY ENTRIES
  ======================================================= */

  const entries = useMemo(
    () =>
      properties.map((apartment) => {
        const matches = (
          rows,
          timestamp
        ) =>
          rows.filter(
            (row) =>
              apartmentIdFrom(row) ===
                apartment.id &&
              isInPeriod(
                timestamp(row),
                period
              )
          );

        const propertyViews = matches(
          views,
          (row) =>
            row.view_date ??
            row.viewed_at
        );

        const propertyFavorites =
          matches(
            favorites,
            (row) =>
              row.created_at ??
              row.createdAt
          );

        const propertyRatings =
          matches(
            ratings,
            (row) =>
              row.created_at ??
              row.createdAt
          );


        const ratingCount =
          propertyRatings.length;


        const ratingAverage =
          ratingCount
            ? propertyRatings.reduce(
                (total, row) =>
                  total +
                  Number(
                    row.rating || 0
                  ),
                0
              ) / ratingCount
            : null;


        return {
          apartment,

          views: viewHistoryAvailable
            ? propertyViews.length
            : 0,

          favorites:
            propertyFavorites.length,

          ratingCount,

          ratingAverage,
        };
      }),
    [
      favorites,
      period,
      properties,
      ratings,
      viewHistoryAvailable,
      views,
    ]
  );


  /* =======================================================
     RANKING
  ======================================================= */

  const rankedEntries = useMemo(() => {
    const list = [...entries];

    list.sort((a, b) => {
      let difference = 0;

      if (trendType === "views") {
        difference =
          b.views - a.views;
      }

      if (trendType === "favorites") {
        difference =
          b.favorites -
          a.favorites;
      }

      if (trendType === "ratings") {
        difference =
          (b.ratingAverage ?? -1) -
          (a.ratingAverage ?? -1);
      }

      if (difference !== 0) {
        return difference;
      }

      return String(
        a.apartment.title ?? ""
      ).localeCompare(
        String(
          b.apartment.title ?? ""
        )
      );
    });

    return list;
  }, [entries, trendType]);


  /* =======================================================
     SELECTED TAB INFORMATION
  ======================================================= */

  const selectedTrend = useMemo(() => {
    if (trendType === "favorites") {
      return {
        heading: "Top Performing Properties",
        description:
          "These properties are ranked by tenant engagement, with favorites as the primary ranking.",
      };
    }

    if (trendType === "ratings") {
      return {
        heading: "Top Performing Properties",
        description:
          "These properties are ranked by tenant engagement, with average rating as the primary ranking.",
      };
    }

    return {
      heading: "Top Performing Properties",
      description:
        "These properties are ranked by tenant engagement, with views as the primary ranking.",
    };
  }, [trendType]);


  /* =======================================================
     EMPTY CHECK
  ======================================================= */

  const hasSelectedEngagement =
    rankedEntries.some((item) => {
      if (trendType === "views") {
        return item.views > 0;
      }

      if (trendType === "favorites") {
        return item.favorites > 0;
      }

      return (
        item.ratingAverage !== null &&
        item.ratingAverage > 0
      );
    });


  /* =======================================================
     SIDEBAR
  ======================================================= */

  const SidebarContent = () => (
    <LandlordSidebar
      user={user}
      verified={user?.isVerified}
      activeSection="market"
      unreadNotifications={
        unreadNotifications
      }
      onSectionChange={(section) =>
        navigate(
          `/dashboard?section=${section}`
        )
      }
      onClose={() =>
        setSidebarOpen(false)
      }
      onLogout={() => {
        logout?.();
        navigate("/", { replace: true });
      }}
    />
  );


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="app-shell landlord-shell landlord-market-trends">

      <div className="app-shell-frame">

        {/* =================================================
            DESKTOP SIDEBAR
        ================================================= */}

        <aside className="app-shell-sidebar">
          <SidebarContent />
        </aside>


        {/* =================================================
            MOBILE OVERLAY
        ================================================= */}

        {sidebarOpen && (
          <div
            className="app-sidebar-overlay"
            onClick={() =>
              setSidebarOpen(false)
            }
          />
        )}


        {/* =================================================
            MOBILE SIDEBAR
        ================================================= */}

        <aside
          className={`app-sidebar-drawer ${
            sidebarOpen
              ? "is-open"
              : ""
          }`}
        >
          <button
            title="Close navigation"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="app-sidebar-close"
          >
            <X />
          </button>

          <SidebarContent />
        </aside>


        {/* =================================================
            MOBILE MENU BUTTON
        ================================================= */}

        <button
          title="Open navigation"
          onClick={() =>
            setSidebarOpen(true)
          }
          className="app-sidebar-trigger"
        >
          <Menu />
        </button>


        {/* =================================================
            MAIN
        ================================================= */}

        <main className="app-shell-main">

          <div className="market-trends-page">


            {/* =============================================
                PAGE HEADER CARD
            ============================================= */}

            <header className="market-trends-header">

              <div>
                <h1>
                  Market Trends
                </h1>

                <p>
                  Discover the most popular
                  apartment listings based on
                  tenant engagement.
                </p>
              </div>

            </header>


            {/* =============================================
                TREND TABS
            ============================================= */}

            {!isLoading &&
            properties.length === 0 ? (

              <div className="market-trends-empty">
                No properties available for
                Market Trends yet.
              </div>

            ) : (
              <>

                <div
                  className="market-trend-tabs"
                  role="tablist"
                  aria-label="Market trend type"
                >

                  {TRENDS.map(
                    ({
                      id,
                      label,
                      icon: Icon,
                    }) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={
                          trendType === id
                        }
                        className={`market-trend-tab ${
                          trendType === id
                            ? "is-active"
                            : ""
                        }`}
                        onClick={() =>
                          setTrendType(id)
                        }
                      >
                        <Icon size={18} />

                        <span>
                          {label}
                        </span>
                      </button>
                    )
                  )}

                </div>


                {/* =========================================
                    TOP PERFORMING PROPERTIES
                ========================================= */}

                <section className="market-details">

                  <header>

                    <div>

                      <h2>
                        {
                          selectedTrend.heading
                        }
                      </h2>

                      <p>
                        {
                          selectedTrend.description
                        }
                      </p>

                    </div>


                    {/* PERIOD SELECTOR */}

                    <label className="market-period-select">

                      <CalendarDays size={17} />

                      <select
                        value={period}
                        onChange={(event) =>
                          setPeriod(
                            event.target.value
                          )
                        }
                      >
                        <option value="thisWeek">
                          This Week
                        </option>

                        <option value="lastWeek">
                          Last Week
                        </option>
                      </select>

                    </label>

                  </header>


                  {/* =======================================
                      EMPTY PERIOD
                  ======================================= */}

                  {!hasSelectedEngagement && (
                    <p className="market-period-empty">
                      No tenant engagement has
                      been recorded for this
                      period.
                    </p>
                  )}


                  {/* =======================================
                      PROPERTY LIST
                  ======================================= */}

                  <div className="market-property-list">

                    {rankedEntries.map(
                      (item, index) => {

                        const apartment =
                          item.apartment;

                        const image =
                          propertyImage(
                            apartment
                          );

                        const location =
                          formatApartmentLocation(
                            apartment,
                            "Location unavailable"
                          );


                        return (
                          <article
                            key={
                              apartment.id
                            }
                            className="market-property-card"
                          >

                            {/* =========================
                                IMAGE
                            ========================= */}

                            <div className="market-property-image">

                              {image ? (
                                <ImageWithFallback
                                  src={image}
                                  alt={
                                    apartment.title ||
                                    "Apartment"
                                  }
                                />
                              ) : (
                                <div className="market-property-image-placeholder">
                                  <BuildingPlaceholder />
                                </div>
                              )}

                            </div>


                            {/* =========================
                                PROPERTY INFORMATION
                            ========================= */}

                            <div className="market-property-info">

                              <div className="market-property-title-row">

                                <h3>
                                  {apartment.title ||
                                    "Untitled property"}
                                </h3>

                                <span className="market-verified">
                                  Verified
                                </span>

                              </div>


                              <div className="market-property-location">

                                <MapPin size={14} />

                                <span>
                                  {location}
                                </span>

                              </div>


                              <div className="market-property-price">

                                ₱
                                {Number(
                                  apartment.price ??
                                  apartment.rent ??
                                  0
                                ).toLocaleString()}
                                {" "}
                                / month

                              </div>

                            </div>


                            {/* =========================
                                VIEWS
                            ========================= */}

                            <div className="market-property-metric market-metric-views">

                              <Eye size={17} />

                              <strong>
                                {
                                  viewHistoryAvailable
                                    ? item.views
                                    : "—"
                                }
                              </strong>

                              <span>
                                Views
                              </span>

                            </div>


                            {/* =========================
                                FAVORITES
                            ========================= */}

                            <div className="market-property-metric market-metric-favorites">

                              <Heart size={17} />

                              <strong>
                                {item.favorites}
                              </strong>

                              <span>
                                Favorites
                              </span>

                            </div>


                            {/* =========================
                                RATING
                            ========================= */}

                            <div className="market-property-metric market-metric-rating">

                              <Star size={17} />

                              <strong>
                                {item.ratingAverage !==
                                null
                                  ? item.ratingAverage.toFixed(
                                      1
                                    )
                                  : "—"}
                              </strong>

                              <span>
                                Average Rating
                              </span>

                            </div>


                            {/* =========================
                                VIEW DETAILS
                            ========================= */}

                            <button
                              type="button"
                              className="market-view-details"
                              onClick={() =>
                                navigate(
                                  `/landlord/market/${apartment.id}`
                                )
                              }
                            >
                              View Details
                            </button>

                          </article>
                        );
                      }
                    )}

                  </div>

                </section>

              </>
            )}

          </div>

        </main>

      </div>

    </div>
  );
}


/* =========================================================
   SIMPLE IMAGE PLACEHOLDER
========================================================= */

function BuildingPlaceholder() {
  return (
    <div className="market-building-placeholder">
      <span>Property</span>
    </div>
  );
}
