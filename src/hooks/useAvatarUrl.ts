import { supabase } from "@/lib/supabase";

/**
 * Converts a storage path to a public URL for avatars
 * @param path - The avatar path (can be a full URL or just the file path)
 * @param bucket - The storage bucket name ('avatars' for staff/users, 'client-avatars' for clients)
 * @returns The public URL or null if no path provided
 */
export const getAvatarUrl = (path: string | null | undefined, bucket: 'avatars' | 'client-avatars' = 'avatars'): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
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
