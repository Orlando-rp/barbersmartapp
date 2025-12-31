import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getStaffAvatarUrl, getClientAvatarUrl } from "@/hooks/useAvatarUrl";
import { cn } from "@/lib/utils";

interface SmartAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: React.ReactNode;
  fallbackText?: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
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
}

/**
 * Smart Avatar component with:
 * - Automatic URL resolution for Supabase storage paths
 * - Lazy loading with Intersection Observer
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
  type = 'auto',
  lazy = true,
  threshold = 0.1,
  rootMargin = "50px",
}: SmartAvatarProps) => {
  const [isVisible, setIsVisible] = useState(!lazy);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

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
  }, [src]);

  return (
    <Avatar ref={containerRef} className={className}>
      {isVisible && resolvedUrl && !imageError && (
        <AvatarImage
          src={resolvedUrl}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0",
            imageClassName
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      <AvatarFallback 
        className={cn(
          "transition-opacity duration-300",
          imageLoaded && !imageError ? "opacity-0" : "opacity-100",
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
