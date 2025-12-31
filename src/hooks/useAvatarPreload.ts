import { useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getStaffAvatarUrl, getClientAvatarUrl } from "@/hooks/useAvatarUrl";

/**
 * Preloads avatar images by creating Image objects that browser will cache
 */
const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject();
    img.src = url;
  });
};

/**
 * Preloads multiple avatar URLs in parallel
 */
export const preloadAvatars = async (
  avatarPaths: (string | null | undefined)[],
  type: 'staff' | 'client' = 'staff'
): Promise<void> => {
  const getUrl = type === 'staff' ? getStaffAvatarUrl : getClientAvatarUrl;
  
  const validUrls = avatarPaths
    .filter((path): path is string => !!path)
    .map(path => getUrl(path))
    .filter((url): url is string => !!url);

  // Remove duplicates
  const uniqueUrls = [...new Set(validUrls)];

  // Preload all images in parallel (fire and forget, don't block)
  await Promise.allSettled(uniqueUrls.map(preloadImage));
};

interface PreloadOptions {
  /** Preload current user's avatar */
  currentUser?: boolean;
  /** Preload staff avatars for today's appointments */
  todayStaff?: boolean;
  /** Preload top N clients avatars */
  topClients?: number;
  /** Preload all active staff avatars */
  allStaff?: boolean;
  /** Barbershop IDs to fetch data from */
  barbershopIds?: string[];
  /** Current user ID */
  userId?: string;
}

/**
 * Hook to preload critical avatars for better UX
 * Runs once on mount and preloads avatars in the background
 */
export const useAvatarPreload = (options: PreloadOptions = {}) => {
  const {
    currentUser = true,
    todayStaff = true,
    topClients = 0,
    allStaff = false,
    barbershopIds = [],
    userId
  } = options;

  const preloadCurrentUserAvatar = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (data?.avatar_url) {
      await preloadAvatars([data.avatar_url], 'staff');
    }
  }, [userId]);

  const preloadTodayStaffAvatars = useCallback(async () => {
    if (barbershopIds.length === 0) return;

    const today = new Date().toISOString().split('T')[0];

    // Get today's appointments staff IDs
    const { data: appointments } = await supabase
      .from('appointments')
      .select('staff_id')
      .in('barbershop_id', barbershopIds)
      .eq('appointment_date', today)
      .not('staff_id', 'is', null);

    if (!appointments || appointments.length === 0) return;

    const staffIds = [...new Set(appointments.map(a => a.staff_id))];

    // Get staff user IDs
    const { data: staffData } = await supabase
      .from('staff')
      .select('user_id')
      .in('id', staffIds);

    if (!staffData || staffData.length === 0) return;

    const userIds = staffData.map(s => s.user_id);

    // Get avatar URLs
    const { data: profiles } = await supabase
      .from('profiles')
      .select('avatar_url')
      .in('id', userIds);

    if (profiles) {
      const avatarPaths = profiles.map(p => p.avatar_url).filter(Boolean);
      await preloadAvatars(avatarPaths, 'staff');
    }
  }, [barbershopIds]);

  const preloadAllStaffAvatars = useCallback(async () => {
    if (barbershopIds.length === 0) return;

    const { data: staffData } = await supabase
      .from('staff')
      .select('user_id')
      .in('barbershop_id', barbershopIds)
      .eq('active', true);

    if (!staffData || staffData.length === 0) return;

    const userIds = staffData.map(s => s.user_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('avatar_url')
      .in('id', userIds);

    if (profiles) {
      const avatarPaths = profiles.map(p => p.avatar_url).filter(Boolean);
      await preloadAvatars(avatarPaths, 'staff');
    }
  }, [barbershopIds]);

  const preloadTopClientsAvatars = useCallback(async () => {
    if (barbershopIds.length === 0 || topClients <= 0) return;

    // Get most recent clients with avatars
    const { data: clients } = await supabase
      .from('clients')
      .select('avatar_url')
      .in('barbershop_id', barbershopIds)
      .eq('active', true)
      .not('avatar_url', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(topClients);

    if (clients) {
      const avatarPaths = clients.map(c => c.avatar_url).filter(Boolean);
      await preloadAvatars(avatarPaths, 'client');
    }
  }, [barbershopIds, topClients]);

  useEffect(() => {
    const runPreload = async () => {
      // Run preloads in parallel, don't block rendering
      const tasks: Promise<void>[] = [];

      if (currentUser && userId) {
        tasks.push(preloadCurrentUserAvatar());
      }

      if (todayStaff && barbershopIds.length > 0) {
        tasks.push(preloadTodayStaffAvatars());
      }

      if (allStaff && barbershopIds.length > 0) {
        tasks.push(preloadAllStaffAvatars());
      }

      if (topClients > 0 && barbershopIds.length > 0) {
        tasks.push(preloadTopClientsAvatars());
      }

      // Run all in parallel, ignore errors
      await Promise.allSettled(tasks);
    };

    // Delay preload slightly to not interfere with initial render
    const timeoutId = setTimeout(runPreload, 100);

    return () => clearTimeout(timeoutId);
  }, [
    currentUser,
    todayStaff,
    allStaff,
    topClients,
    userId,
    barbershopIds,
    preloadCurrentUserAvatar,
    preloadTodayStaffAvatars,
    preloadAllStaffAvatars,
    preloadTopClientsAvatars
  ]);
};

/**
 * Manually preload a list of avatar URLs
 */
export const useManualAvatarPreload = () => {
  return {
    preloadStaffAvatars: (paths: (string | null | undefined)[]) => 
      preloadAvatars(paths, 'staff'),
    preloadClientAvatars: (paths: (string | null | undefined)[]) => 
      preloadAvatars(paths, 'client'),
  };
};
