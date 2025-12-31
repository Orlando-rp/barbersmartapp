/**
 * Global avatar cache system
 * Stores loaded avatar URLs to prevent reloading when navigating between pages
 * Persists to sessionStorage for cross-reload persistence
 */

const STORAGE_KEY = 'avatar-cache';

type CacheEntry = {
  status: 'loading' | 'loaded' | 'error';
};

// Global cache - persists across component mounts/unmounts
const avatarCache = new Map<string, CacheEntry>();

// Set of URLs currently being preloaded
const preloadingUrls = new Set<string>();

/**
 * Load cache from sessionStorage on initialization
 */
const loadCacheFromStorage = (): void => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, CacheEntry>;
      Object.entries(parsed).forEach(([url, entry]) => {
        // Only restore loaded/error states, not loading
        if (entry.status === 'loaded' || entry.status === 'error') {
          avatarCache.set(url, entry);
        }
      });
    }
  } catch (e) {
    // Ignore storage errors
  }
};

/**
 * Save cache to sessionStorage
 */
const saveCacheToStorage = (): void => {
  try {
    const toStore: Record<string, CacheEntry> = {};
    avatarCache.forEach((entry, url) => {
      // Only persist loaded/error states
      if (entry.status === 'loaded' || entry.status === 'error') {
        toStore[url] = entry;
      }
    });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (e) {
    // Ignore storage errors (quota exceeded, etc.)
  }
};

// Initialize cache from storage
loadCacheFromStorage();

/**
 * Check if an avatar URL is already cached and loaded
 */
export const isAvatarCached = (url: string | null | undefined): boolean => {
  if (!url) return false;
  const cached = avatarCache.get(url);
  return cached?.status === 'loaded';
};

/**
 * Get the cache status for an avatar URL
 */
export const getAvatarCacheStatus = (url: string | null | undefined): 'loading' | 'loaded' | 'error' | 'uncached' => {
  if (!url) return 'uncached';
  const cached = avatarCache.get(url);
  return cached?.status || 'uncached';
};

/**
 * Mark an avatar as loaded in the cache
 */
export const markAvatarLoaded = (url: string): void => {
  avatarCache.set(url, { status: 'loaded' });
  preloadingUrls.delete(url);
  saveCacheToStorage();
};

/**
 * Mark an avatar as failed in the cache
 */
export const markAvatarError = (url: string): void => {
  avatarCache.set(url, { status: 'error' });
  preloadingUrls.delete(url);
  saveCacheToStorage();
};

/**
 * Mark an avatar as currently loading
 */
export const markAvatarLoading = (url: string): void => {
  if (!avatarCache.has(url)) {
    avatarCache.set(url, { status: 'loading' });
  }
};

/**
 * Preload an avatar image in the background
 */
export const preloadAvatar = (url: string | null | undefined): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }

    // Already cached
    const cached = avatarCache.get(url);
    if (cached?.status === 'loaded') {
      resolve(true);
      return;
    }
    if (cached?.status === 'error') {
      resolve(false);
      return;
    }

    // Already preloading
    if (preloadingUrls.has(url)) {
      // Wait for existing preload to complete
      const checkInterval = setInterval(() => {
        const status = avatarCache.get(url)?.status;
        if (status === 'loaded' || status === 'error') {
          clearInterval(checkInterval);
          resolve(status === 'loaded');
        }
      }, 50);
      return;
    }

    // Start preloading
    preloadingUrls.add(url);
    markAvatarLoading(url);

    const img = new Image();
    img.onload = () => {
      markAvatarLoaded(url);
      resolve(true);
    };
    img.onerror = () => {
      markAvatarError(url);
      resolve(false);
    };
    img.src = url;
  });
};

/**
 * Preload multiple avatar images in parallel
 */
export const preloadAvatars = async (urls: (string | null | undefined)[]): Promise<void> => {
  const validUrls = urls.filter((url): url is string => !!url);
  await Promise.all(validUrls.map(preloadAvatar));
};

/**
 * Clear the avatar cache (useful for logout or cache invalidation)
 */
export const clearAvatarCache = (): void => {
  avatarCache.clear();
  preloadingUrls.clear();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Ignore storage errors
  }
};

/**
 * Get cache statistics for debugging
 */
export const getAvatarCacheStats = (): { total: number; loaded: number; errors: number; loading: number } => {
  let loaded = 0;
  let errors = 0;
  let loading = 0;

  avatarCache.forEach((value) => {
    if (value.status === 'loaded') loaded++;
    else if (value.status === 'error') errors++;
    else if (value.status === 'loading') loading++;
  });

  return { total: avatarCache.size, loaded, errors, loading };
};

/**
 * Hook to use avatar cache in components
 */
export const useAvatarCache = () => {
  return {
    isAvatarCached,
    getAvatarCacheStatus,
    markAvatarLoaded,
    markAvatarError,
    preloadAvatar,
    preloadAvatars,
    clearAvatarCache,
    getAvatarCacheStats,
  };
};
