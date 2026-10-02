import { Bath, Bed, Bookmark, Building2, ChevronRight, Eye, Grid2X2, Heart, List, MapPin, Search, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApartmentsContext } from "@/contexts/ApartmentsContext";
import { useAuth } from "@/contexts/AuthContext";
import { listFavoriteApartments } from "@/data/apartments";
import { useFavorites } from "@/tenant/useFavorites";
import { formatApartmentLocation } from "@/utils/apartmentLocation";
import { getImageUrl } from "@/utils/images";
import { MobileNavigation } from "@/tenant/MobileNavigation";
import { Sidebar } from "@/tenant/Sidebar";
import { useTenantNotifications } from "@/tenant/useTenantNotifications";
import { getAvailableRoomCount, getLowestAvailableRoomPrice, isTenantVisibleApartment, getAvailableRoomCount as getAvailableRooms } from "@/utils/listingVisibility";
import { ApartmentRatingSummary } from "@/components/ApartmentRatingSummary";
import { EmptyState } from "@/tenant/EmptyState";
import { ApartmentCard } from "@/tenant/ApartmentDiscovery";
const STATUS_LABEL = {
    available: "Available",
    occupied: "Occupied",
    maintenance: "Under Maintenance",
};
const BROWSE_STATUS_CLASS = {
    available: "apartment-browse-badge-3",
    occupied: "apartment-browse-badge-4",
    maintenance: "apartment-browse-badge-5",
};

const getBrowsePriceLabel = (apartment) => {
    const prices = (apartment.rooms ?? [])
        .map((room) => Number(room.price))
        .filter((price) => Number.isFinite(price) && price > 0);
    if (prices.length === 0) {
        return "Price unavailable";
    }
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const formatPrice = (price) => `₱${price.toLocaleString("en-PH")}`;
    return lowest === highest
        ? `${formatPrice(lowest)}/month`
        : `${formatPrice(lowest)} - ${formatPrice(highest)}/month`;
};

const favoriteViewLabel = (count) =>
    `${count.toLocaleString()} ${count === 1 ? "view" : "views"}`;
export function Favorites() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { refreshFavorites, toggleFavorite } = useFavorites();
    const { unreadCount } = useTenantNotifications();
    const { apartments } = useApartmentsContext();
    const [favoriteApartments, setFavoriteApartments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [sort, setSort] = useState("newest");
    const [viewMode, setViewMode] = useState("grid");
    const [removingId, setRemovingId] = useState(null);
    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!user?.id) {
                setFavoriteApartments([]);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const apartments = await listFavoriteApartments(user.id);
                if (active) {
                    setFavoriteApartments(apartments.filter((apt) => (isTenantVisibleApartment(apt) &&
                        !(user.role === "landlord" && apt.landlordId === user.id))));
                }
            }
            catch (error) {
                console.error("Failed to load favorite apartments:", error);
                if (active)
                    setFavoriteApartments([]);
            }
            finally {
                if (active)
                    setIsLoading(false);
            }
        };
        void load();
        void refreshFavorites();
        return () => {
            active = false;
        };
    }, [apartments, user?.id, user?.role, refreshFavorites]);
    const isApartmentAvailable = isTenantVisibleApartment;
    const getAvailableRooms = getAvailableRoomCount;
    const visibleFavorites = useMemo(() => {
        return [...favoriteApartments]
            .filter((apartment) => {
            if (filter === "available")
                return isApartmentAvailable(apartment);
            return true;
        })
            .sort((a, b) => {
    if (sort === "price-low") {
        return (
            (getLowestAvailableRoomPrice(a) ?? Number.MAX_SAFE_INTEGER) -
            (getLowestAvailableRoomPrice(b) ?? Number.MAX_SAFE_INTEGER)
        );
    }

    if (sort === "price-high") {
        return (
            (getLowestAvailableRoomPrice(b) ?? -1) -
            (getLowestAvailableRoomPrice(a) ?? -1)
        );
    }

    if (sort === "name") {
        return a.title.localeCompare(b.title);
    }

    if (sort === "newest") {
        const aDate = new Date(a.favoritedAt || 0).getTime();
        const bDate = new Date(b.favoritedAt || 0).getTime();

        return bDate - aDate;
    }

    return 0;
});
    }, [favoriteApartments, filter, sort]);
    const favoriteCount = favoriteApartments.length;
    const removeFavorite = async (apartmentId) => {
        if (!user?.id)
            return;
        setRemovingId(apartmentId);
        try {
            await toggleFavorite(apartmentId);
            await refreshFavorites();
            const apartments = await listFavoriteApartments(user.id);
            setFavoriteApartments(apartments.filter((apt) => (isTenantVisibleApartment(apt) &&
                !(user.role === "landlord" && apt.landlordId === user.id))));
        }
        finally {
            setRemovingId(null);
        }
    };
    if (user?.role === "admin") {
        return <Navigate to="/admin" replace/>;
    }
    const FavoriteCard = ({ apartment }) => {
        const status = apartment.status ?? "available";
        const availableRooms = getAvailableRooms(apartment);
        const images = [apartment.image, ...(apartment.images ?? [])].filter(Boolean);
        const location = formatApartmentLocation(apartment);
        const isVerified = apartment.landlordVerified === true || apartment.isVerified === true;
        const viewCount = Number(apartment.views ?? apartment.viewCount ?? 0);

        return (<article className="apartment-browse-article">
          <div className="apartment-browse-panel-5">
            {images[0] ? (<ImageWithFallback src={getImageUrl(images[0])} alt={apartment.title} className="apartment-browse-image-with-fallback"/>) : (<div className="apartment-browse-row-6">
                <Building2 className="apartment-browse-building2-icon"/>
              </div>)}

            <div className="apartment-browse-content-2">
              <Badge className={`apartment-browse-badge-2 ${BROWSE_STATUS_CLASS[status] ?? BROWSE_STATUS_CLASS.available}`}>{STATUS_LABEL[status] ?? "Available"}</Badge>
              {isVerified && <VerifiedBadge label="Verified Listing" className="apartment-browse-verified-badge"/>}
              {apartment.petFriendly && <Badge className="apartment-browse-pet-friendly">Pet Friendly</Badge>}
            </div>

            <button type="button" title="Remove from favorites" onClick={() => void removeFavorite(apartment.id)} disabled={removingId === apartment.id} className="apartment-browse-button-6 apartment-browse-button-7" aria-label="Remove from favorites">
              <Heart className="apartment-browse-heart-icon" fill="currentColor"/>
            </button>
          </div>

          <div className="apartment-browse-panel-6">
            <div className="apartment-browse-row-7">
              <div className="apartment-browse-panel-7">
                <h2 className="apartment-browse-heading">{apartment.title}</h2>
                <ApartmentRatingSummary stats={(apartment.rating ?? apartment.averageRating ?? apartment.average_rating) ? { average: Number(apartment.rating ?? apartment.averageRating ?? apartment.average_rating), count: Number(apartment.ratingCount ?? apartment.rating_count ?? 1) } : undefined} className="apartment-browse-apartment-rating-summary"/>
                <p className="apartment-browse-text-3"><MapPin className="apartment-browse-map-pin-icon"/>{location}</p>
              </div>
              <div className="apartment-browse-panel-8">
                <p className="apartment-browse-view-room-prices">{getBrowsePriceLabel(apartment)}</p>
                <p className="apartment-browse-text-4"><Eye className="apartment-browse-eye-icon"/>{favoriteViewLabel(viewCount)}</p>
              </div>
            </div>

            <div className="apartment-browse-grid-5">
              <BrowseMetric icon={Building2} value={availableRooms.toLocaleString()} label="rooms"/>
              <BrowseMetric icon={Bed} value={Number(apartment.bedrooms ?? apartment.rooms?.length ?? 0).toLocaleString()} label="bed"/>
              <BrowseMetric icon={Bath} value={Number(apartment.bathrooms ?? 0).toLocaleString()} label="bath"/>
              <BrowseMetric icon={Square} value={Number(apartment.sqft ?? 0).toLocaleString()} label="sqft"/>
            </div>

            <Button asChild variant="outline" className="apartment-browse-button-9">
              <Link to={`/apartment/${apartment.id}`} state={{ returnTo: "/favorites", backLabel: "Back to Favorites" }}><Eye className="apartment-browse-eye-icon-2"/>View Details</Link>
            </Button>
          </div>
        </article>);
    };
    return (<div className="tenant-browse app-shell">
      <MobileNavigation active="favorites" unreadCount={unreadCount}/>
      <div className="app-shell-frame">
        <aside className="app-shell-sidebar">
          <Sidebar active="favorites" unreadCount={unreadCount}/>
        </aside>

        <main className="app-shell-main">
          <div className="app-shell-content app-shell-content-mobile-nav">
            <section className="tenant-favorites-hero">
              <div className="favorites-panel-9">
               
                <h1 className="favorites-your-favorites">Your Favorites</h1>
                <p className="favorites-text-4">
                  {favoriteCount > 0 ? `${favoriteCount.toLocaleString()} ${favoriteCount === 1 ? "apartment" : "apartments"} saved for later` : "Save apartments you like and return to them anytime."}
                </p>
              </div>
            </section>

            <section className="favorites-section">
              <select value={filter} onChange={(event) => setFilter(event.target.value)} className="favorites-select">
                <option value="all">All Favorites ({favoriteCount})</option>
                <option value="available">Available Only</option>
              </select>
              <div className="favorites-content-5">
                <select value={sort} onChange={(event) => setSort(event.target.value)} className="favorites-select">
                  <option value="newest">Newest Added</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name</option>
                </select>
                <div className="favorites-grid-2">
                  <button type="button" onClick={() => setViewMode("grid")} className={`favorites-grid-view ${viewMode === "grid" ? "favorites-grid-view-2" : "favorites-grid-view-3"}`} aria-label="Grid view" aria-pressed={viewMode === "grid"}>
                    <Grid2X2 className="favorites-grid2-x2-icon"/>
                  </button>
                  <button type="button" onClick={() => setViewMode("list")} className={`favorites-list-view ${viewMode === "list" ? "favorites-list-view-2" : "favorites-list-view-3"}`} aria-label="List view" aria-pressed={viewMode === "list"}>
                    <List className="favorites-list-icon"/>
                  </button>
                </div>
              </div>
            </section>

            <section className="favorites-section-2">
              {isLoading ? (<div className="favorites-loading-favorites">
                  Loading favorites...
                </div>) : favoriteCount === 0 ? (<div className="favorites-card-2">
                  <div className="favorites-card-3">
                    <Heart className="favorites-heart-icon-3"/>
                  </div>
                  <h2 className="favorites-no-favorites-yet">No favorites yet</h2>
                  <p className="favorites-text-5">Save apartments you like and they'll appear here.</p>
                  <Button onClick={() => navigate("/browse")} className="favorites-browse-apartments">
                    Browse Apartments
                    <ChevronRight className="favorites-chevron-right-icon-2"/>
                  </Button>
                </div>) : visibleFavorites.length === 0 ? (<div className="favorites-card-4">
                  <Search className="favorites-search-icon"/>
                  <h2 className="favorites-no-favorites-match-this-filter">No favorites match this filter</h2>
                  <Button variant="outline" onClick={() => setFilter("all")} className="favorites-show-all-favorites">Show All Favorites</Button>
                </div>) : (<div className={viewMode === "grid" ? "apartment-browse-grid-11" : "favorites-route-results-list"}>
                  {visibleFavorites.map((apartment) => (<FavoriteCard key={apartment.id} apartment={apartment}/>))}
                </div>)}
            </section>

            {favoriteCount > 0 && <section className="favorites-section-3">
              <span className="favorites-card-5">
                <Building2 className="favorites-building2-icon-2"/>
              </span>
              <div className="favorites-panel-7">
                <h2 className="favorites-explore-more-apartments">Explore more apartments</h2>
                <p className="favorites-text-6">Find more places you'll love and add to your favorites.</p>
              </div>
              <Button onClick={() => navigate("/browse")} className="favorites-browse-apartments-2">
                Browse Apartments
                <ChevronRight className="favorites-chevron-right-icon-2"/>
              </Button>
            </section>}
          </div>
        </main>
      </div>
    </div>);
}
function InfoPill({ icon: Icon, value, label, tone, }) {
    return (<div className="favorites-row-5">
      <span className={`favorites-row-6 ${tone}`}>
        <Icon className="favorites-icon-icon-2"/>
      </span>
      <div>
        <p className="favorites-text-7">{value}</p>
        <p className="favorites-text-8">{label}</p>
      </div>
    </div>);
}

function BrowseMetric({ icon: Icon, value, label, }) {
    return (<div className="apartment-browse-row-10">
      <Icon className="apartment-browse-icon-icon"/>
      <span className="apartment-browse-span-3">{value}</span>
      <span className="apartment-browse-span-4">{label}</span>
    </div>);
}

export const FavoritesOverview = ({ favoriteApartments, visibleFavoriteApartments, favoriteFilter, setFavoriteFilter, favoriteSort, setFavoriteSort, favoriteView, setFavoriteView, removingFavoriteId, removeFavorite, ratingSummary, ratingsLoading, navigate, }) => (<div className="favorites-section-container">
    <section className="favorites-section-section">
      <div className="favorites-section-content">
        <div>
          <h1 className="favorites-section-your-favorites">Your Favorites</h1>
          <p className="favorites-section-apartments-you-ve-saved-for-later">Apartments you've saved for later</p>
        </div>
      </div>
      <div className="favorites-section-panel"/>
      <div className="favorites-section-panel-2"/>
    </section>

    <section className="favorites-section-section-2">
      <div className="favorites-section-row">
        <span className="favorites-section-row-2">
          <Heart className="favorites-section-heart-icon"/>
        </span>
        <div>
          <p className="favorites-section-total-favorites">Total Favorites</p>
          <p className="favorites-section-text">{favoriteApartments.length.toLocaleString()}</p>
          <p className="favorites-section-text-2">{favoriteApartments.length === 1 ? "apartment saved" : "apartments saved"}</p>
        </div>
      </div>
      <div className="favorites-section-row-3">
        <span className="favorites-section-row-4">
          <Bookmark className="favorites-section-bookmark-icon"/>
        </span>
        <div>
          <p className="favorites-section-save-for-later">Save for later</p>
          <p className="favorites-section-text-3">Compare and revisit real listings you saved from Browse and Apartment Details.</p>
        </div>
      </div>
    </section>

    <section className="favorites-section-section-3">
      <select value={favoriteFilter} onChange={(event) => setFavoriteFilter(event.target.value)} className="favorites-section-select">
        <option value="all">All Favorites ({favoriteApartments.length})</option>
        <option value="available">Available Only</option>
      </select>
      <div className="favorites-section-content-2">
        <select value={favoriteSort} onChange={(event) => setFavoriteSort(event.target.value)} className="favorites-section-select">
          <option value="newest">Newest Added</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="name">Name</option>
        </select>
        <div className="favorites-section-grid">
          <button onClick={() => setFavoriteView("grid")} className={`favorites-section-grid-view ${favoriteView === "grid" ? "favorites-section-grid-view-2" : "favorites-section-grid-view-3"}`} aria-label="Grid view">
            <Grid2X2 className="favorites-section-grid2-x2-icon"/>
          </button>
          <button onClick={() => setFavoriteView("list")} className={`favorites-section-list-view ${favoriteView === "list" ? "favorites-section-list-view-2" : "favorites-section-list-view-3"}`} aria-label="List view">
            <List className="favorites-section-list-icon"/>
          </button>
        </div>
      </div>
    </section>

    {favoriteApartments.length === 0 ? (<EmptyState icon={Heart} message="No favorites yet. Browse apartments to save listings." actionLabel="Browse Apartments" action={() => navigate("/browse")}/>) : visibleFavoriteApartments.length === 0 ? (<div className="favorites-section-card-2">
        <Search className="favorites-section-search-icon"/>
        <h2 className="favorites-section-no-favorites-match-this-filter">No favorites match this filter</h2>
        <Button variant="outline" onClick={() => setFavoriteFilter("all")} className="favorites-section-show-all-favorites">Show All Favorites</Button>
      </div>) : (<div className={favoriteView === "grid" ? "favorites-section-grid-2" : "favorites-section-panel-3"}>
        {visibleFavoriteApartments.map((apartment) => (<FavoriteApartmentCard key={apartment.id} apartment={apartment} favoriteView={favoriteView} removingFavoriteId={removingFavoriteId} removeFavorite={removeFavorite} ratingSummary={ratingSummary} ratingsLoading={ratingsLoading}/>))}
      </div>)}

    <section className="favorites-section-section-4">
      <span className="favorites-section-row-5">
        <Building2 className="favorites-section-building2-icon"/>
      </span>
      <div className="favorites-section-panel-4">
        <h2 className="favorites-section-explore-more-apartments">Explore more apartments</h2>
        <p className="favorites-section-text-4">Find more places you'll love and add to your favorites.</p>
      </div>
      <Button onClick={() => navigate("/browse")} className="favorites-section-browse-apartments">
        Browse Apartments
        <ChevronRight className="favorites-section-chevron-right-icon"/>
      </Button>
    </section>
  </div>);
const FavoriteApartmentCard = ({ apartment, ratingSummary, ratingsLoading, }) => (<ApartmentCard apartment={apartment} ratingStats={ratingSummary.byApartment.get(apartment.id)} ratingsLoading={ratingsLoading} detailState={{ returnTo: "/tenant/dashboard?section=favorites", backLabel: "Back to Favorites" }}/>);
const SavedInfoPill = ({ icon: Icon, value, label, tone, }) => (<div className="info-pill-row">
    <span className={`info-pill-row-2 ${tone}`}>
      <Icon className="info-pill-icon-icon"/>
    </span>
    <div>
      <p className="info-pill-text">{value}</p>
      <p className="info-pill-text-2">{label}</p>
    </div>
  </div>);
