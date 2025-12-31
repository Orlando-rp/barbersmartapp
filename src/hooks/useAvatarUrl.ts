import { supabase } from "@/lib/supabase";

// In-memory cache for avatar URLs to avoid repeated Supabase calls
const avatarUrlCache = new Map<string, string>();

/**
 * Clears the avatar URL cache (useful after avatar updates)
 */
export const clearAvatarCache = (): void => {
  avatarUrlCache.clear();
};

/**
 * Removes a specific path from cache (useful after single avatar update)
 */
export const invalidateAvatarCache = (path: string, bucket: 'avatars' | 'client-avatars' = 'avatars'): void => {
  const cacheKey = `${bucket}:${path}`;
  avatarUrlCache.delete(cacheKey);
};

/**
 * Converts a storage path to a public URL for avatars with caching
 * @param path - The avatar path (can be a full URL or just the file path)
 * @param bucket - The storage bucket name ('avatars' for staff/users, 'client-avatars' for clients)
 * @returns The public URL or null if no path provided
 */
export const getAvatarUrl = (path: string | null | undefined, bucket: 'avatars' | 'client-avatars' = 'avatars'): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  const cacheKey = `${bucket}:${path}`;
  
  // Return cached URL if available
  if (avatarUrlCache.has(cacheKey)) {
    return avatarUrlCache.get(cacheKey)!;
  }
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  // Cache the result
  avatarUrlCache.set(cacheKey, data.publicUrl);
  
  return data.publicUrl;
};

/**
 * Gets client avatar URL (uses 'client-avatars' bucket)
 */
export const getClientAvatarUrl = (path: string | null | undefined): string | null => {
  return getAvatarUrl(path, 'client-avatars');
};

/**
 * Gets staff/user avatar URL (uses 'avatars' bucket)
 */
export const getStaffAvatarUrl = (path: string | null | undefined): string | null => {
  return getAvatarUrl(path, 'avatars');
};
