// Shared cache utilities for subscription plans

export const PLANS_CACHE_KEY = 'landing_plans_cache';
export const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface PlansCacheData {
  plans: any[];
  timestamp: number;
}

/**
 * Invalidates the plans cache in localStorage
 * Call this when plans are created, updated, or deleted
 */
export const invalidatePlansCache = () => {
  try {
    localStorage.removeItem(PLANS_CACHE_KEY);
    console.log('[PlansCache] Cache invalidated');
  } catch (error) {
    console.error('[PlansCache] Error invalidating cache:', error);
  }
};

/**
 * Gets cached plans if available and not expired
 */
export const getCachedPlans = (): any[] | null => {
  try {
    const cachedData = localStorage.getItem(PLANS_CACHE_KEY);
    if (!cachedData) return null;

    const { plans, timestamp }: PlansCacheData = JSON.parse(cachedData);
    const isExpired = Date.now() - timestamp > CACHE_DURATION_MS;

    if (isExpired || !plans?.length) {
      return null;
    }

    return plans;
  } catch (error) {
    console.error('[PlansCache] Error reading cache:', error);
    return null;
  }
};

/**
 * Saves plans to cache
 */
export const setCachedPlans = (plans: any[]) => {
  try {
    localStorage.setItem(PLANS_CACHE_KEY, JSON.stringify({
      plans,
      timestamp: Date.now()
    } as PlansCacheData));
    console.log('[PlansCache] Cache updated');
  } catch (error) {
    console.error('[PlansCache] Error saving cache:', error);
  }
};
