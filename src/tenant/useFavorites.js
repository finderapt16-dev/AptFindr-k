import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { isTenantRole } from '../services/authService';
import { getFavoriteApartmentIds, isApartmentFavorite, toggleFavorite as toggleFavoriteInDb, } from '../data/apartments';
export function useFavorites() {
    const { user, isAuthenticated } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [updatingFavoriteIds, setUpdatingFavoriteIds] = useState([]);
    const favoritesRef = useRef([]);
    const favoritesOwnerRef = useRef(user?.id ?? null);
    const loadRequestRef = useRef(0);
    useEffect(() => {
        favoritesRef.current = favorites;
    }, [favorites]);
    const loadFavorites = useCallback(async () => {
        const requestedUserId = user?.id;
        if (!requestedUserId) {
            loadRequestRef.current += 1;
            favoritesOwnerRef.current = null;
            favoritesRef.current = [];
            setFavorites([]);
            setError(null);
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }
        if (favoritesOwnerRef.current !== requestedUserId) {
            // Never briefly show one account's saved apartments to another account.
            favoritesOwnerRef.current = requestedUserId;
            favoritesRef.current = [];
            setFavorites([]);
            setError(null);
        }
        const requestId = ++loadRequestRef.current;
        const hasExistingFavorites = favoritesRef.current.length > 0;
        if (hasExistingFavorites) {
            setIsRefreshing(true);
        }
        else {
            setIsLoading(true);
        }
        try {
            const ids = await getFavoriteApartmentIds(requestedUserId);
            if (requestId !== loadRequestRef.current || favoritesOwnerRef.current !== requestedUserId) return;
            favoritesRef.current = ids;
            setFavorites(ids);
            setError(null);
        }
        catch (error) {
            if (requestId !== loadRequestRef.current || favoritesOwnerRef.current !== requestedUserId) return;
            console.error('Failed to load favorites:', error);
            setError('Unable to load favorites. Please try again.');
            if (!hasExistingFavorites) {
                favoritesRef.current = [];
                setFavorites([]);
            }
        }
        finally {
            if (requestId === loadRequestRef.current) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [user?.id]);
    useEffect(() => {
        const refreshWhenOnline = () => void loadFavorites();
        void loadFavorites();
        window.addEventListener('online', refreshWhenOnline);
        return () => window.removeEventListener('online', refreshWhenOnline);
    }, [loadFavorites]);
    const toggleFavorite = useCallback(async (apartmentId) => {
        if (!isAuthenticated || !user?.id) {
            toast.error('Please sign in to save favorites.');
            return;
        }
        if (!isTenantRole(user.role)) {
            toast.error('Favorites are only available for tenant accounts.');
            return;
        }
        if (updatingFavoriteIds.includes(apartmentId)) {
            return;
        }
        const requestedUserId = user.id;
        const wasFavorite = favoritesOwnerRef.current === requestedUserId && favorites.includes(apartmentId);
        setUpdatingFavoriteIds((previous) => [...previous, apartmentId]);
        try {
            const isNowFavorite = await toggleFavoriteInDb(apartmentId, requestedUserId);
            if (favoritesOwnerRef.current !== requestedUserId) return;
            setFavorites((previous) => {
                const next = isNowFavorite
                    ? (previous.includes(apartmentId) ? previous : [...previous, apartmentId])
                    : previous.filter((id) => id !== apartmentId);
                favoritesRef.current = next;
                return next;
            });
            if (isNowFavorite) {
                toast.success('Added to favorites');
            }
            else {
                toast.info('Removed from favorites');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to update favorites.';
            toast.error(message);
            const stillFavorite = await isApartmentFavorite(requestedUserId, apartmentId).catch(() => wasFavorite);
            if (favoritesOwnerRef.current !== requestedUserId) return;
            setFavorites((previous) => {
                const next = stillFavorite
                    ? (previous.includes(apartmentId) ? previous : [...previous, apartmentId])
                    : previous.filter((id) => id !== apartmentId);
                favoritesRef.current = next;
                return next;
            });
        }
        finally {
            setUpdatingFavoriteIds((previous) => previous.filter((id) => id !== apartmentId));
        }
    }, [favorites, isAuthenticated, updatingFavoriteIds, user?.id, user?.role]);
    const isFavorite = useCallback((apartmentId) => favoritesOwnerRef.current === user?.id && favorites.includes(apartmentId), [favorites, user?.id]);
    return {
        favorites: favoritesOwnerRef.current === user?.id ? favorites : [],
        isLoading,
        isRefreshing,
        error,
        updatingFavoriteIds,
        toggleFavorite,
        isFavorite,
        refreshFavorites: loadFavorites,
    };
}
