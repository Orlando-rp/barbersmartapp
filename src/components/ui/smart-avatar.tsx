import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getStaffAvatarUrl, getClientAvatarUrl } from "@/hooks/useAvatarUrl";
import { cn } from "@/lib/utils";

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizeClasses: Record<AvatarSize, { container: string; text: string }> = {
  xs: { container: "h-6 w-6", text: "text-[10px]" },
  sm: { container: "h-8 w-8", text: "text-xs" },
  md: { container: "h-10 w-10", text: "text-sm" },
  lg: { container: "h-12 w-12", text: "text-base" },
  xl: { container: "h-16 w-16", text: "text-lg" },
  '2xl': { container: "h-20 w-20", text: "text-xl" },
};

interface SmartAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: React.ReactNode;
  fallbackText?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  /**
   * Size of the avatar (xs, sm, md, lg, xl, 2xl)
   * Default: 'md'
   */
  size?: AvatarSize;
  /**
   * Type of avatar - determines which storage bucket to use
   * 'staff' uses the 'avatars' bucket
   * 'client' uses the 'client-avatars' bucket
   * 'auto' tries to infer from the URL or defaults to staff
   */
  type?: 'staff' | 'client' | 'auto';
  /**
   * Enable lazy loading (default: true)
   */
  lazy?: boolean;
  /**
   * Threshold for intersection observer (0-1)
   */
  threshold?: number;
  /**
   * Root margin for intersection observer
   */
  rootMargin?: string;
  /**
   * Show skeleton while loading (default: true)
   */
  showSkeleton?: boolean;
}

/**
 * Smart Avatar component with:
 * - Multiple size variants (xs, sm, md, lg, xl, 2xl)
 * - Automatic URL resolution for Supabase storage paths
 * - Lazy loading with Intersection Observer
 * - Animated skeleton loading state
 * - Fallback support with text or custom content
 */
export const SmartAvatar = ({
  src,
  alt = "",
  fallback,
  fallbackText,
  className,
  imageClassName,
  fallbackClassName,
  size = 'md',
  type = 'auto',
  lazy = true,
  threshold = 0.1,
  rootMargin = "50px",
  showSkeleton = true,
}: SmartAvatarProps) => {
  const [isVisible, setIsVisible] = useState(!lazy);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLSpanElement>(null);

  const sizeClass = sizeClasses[size];

  // Resolve the avatar URL based on type
  const resolvedUrl = (() => {
    if (!src) return null;
    if (src.startsWith('http')) return src;
    
    if (type === 'client') {
      return getClientAvatarUrl(src);
    } else if (type === 'staff') {
      return getStaffAvatarUrl(src);
    } else {
      // Auto-detect: default to staff
      return getStaffAvatarUrl(src);
    }
  })();

  // Generate fallback text from alt or fallbackText
  const getFallbackContent = () => {
    if (fallback) return fallback;
    
    const text = fallbackText || alt || '';
    if (!text) return '??';
    
    return text
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isVisible, threshold, rootMargin]);

  // Reset states when src changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setIsLoading(!!src);
  }, [src]);

  // Determine if we should show skeleton
  const shouldShowSkeleton = showSkeleton && isVisible && resolvedUrl && isLoading && !imageError;
  const shouldShowFallback = !resolvedUrl || imageError || (!isLoading && !imageLoaded);

  return (
    <Avatar ref={containerRef} className={cn("relative", sizeClass.container, className)}>
      {/* Skeleton loading state */}
      {shouldShowSkeleton && (
        <Skeleton 
          className={cn(
            "absolute inset-0 rounded-full",
            "animate-pulse"
          )} 
        />
      )}
      
      {/* Image */}
      {isVisible && resolvedUrl && !imageError && (
        <AvatarImage
          src={resolvedUrl}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0",
            imageClassName
          )}
          onLoad={() => {
            setImageLoaded(true);
            setIsLoading(false);
          }}
          onError={() => {
            setImageError(true);
            setIsLoading(false);
          }}
        />
      )}
      
      {/* Fallback */}
      <AvatarFallback 
        className={cn(
          "transition-opacity duration-300",
          sizeClass.text,
          imageLoaded && !imageError ? "opacity-0" : shouldShowSkeleton ? "opacity-0" : "opacity-100",
          fallbackClassName
        )}
      >
        {getFallbackContent()}
      </AvatarFallback>
    </Avatar>
  );
};

/**
 * Pre-configured Smart Avatar for staff members
 */
export const StaffAvatar = (props: Omit<SmartAvatarProps, 'type'>) => (
  <SmartAvatar {...props} type="staff" />
);

/**
 * Pre-configured Smart Avatar for clients
 */
export const ClientAvatar = (props: Omit<SmartAvatarProps, 'type'>) => (
  <SmartAvatar {...props} type="client" />
);
