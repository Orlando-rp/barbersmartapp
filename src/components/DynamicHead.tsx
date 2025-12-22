import { useEffect } from 'react';
import { useBranding } from '@/contexts/BrandingContext';
import { DEFAULT_SYSTEM_NAME, DEFAULT_TAGLINE } from '@/lib/tenantConfig';

/**
 * DynamicHead - Updates document head based on tenant branding
 * 
 * Updates:
 * - Document title
 * - Favicon
 * - Meta description
 * - Open Graph tags
 * - Theme color
 */
export default function DynamicHead() {
  const { effectiveBranding, hasWhiteLabel, tenantBarbershopName } = useBranding();

  useEffect(() => {
    // Get effective values
    const systemName = effectiveBranding?.system_name || tenantBarbershopName || DEFAULT_SYSTEM_NAME;
    const tagline = effectiveBranding?.tagline || DEFAULT_TAGLINE;
    const faviconUrl = effectiveBranding?.favicon_url;
    const logoUrl = effectiveBranding?.logo_url;
    const primaryColor = effectiveBranding?.primary_color || '#d4a574';

    // Update document title
    document.title = systemName;

    // Update meta description
    updateMetaTag('description', `${systemName} - ${tagline}`);

    // Update Open Graph tags
    updateMetaTag('og:title', systemName, 'property');
    updateMetaTag('og:description', tagline, 'property');
    updateMetaTag('og:site_name', systemName, 'property');
    
    if (logoUrl) {
      updateMetaTag('og:image', logoUrl, 'property');
    }

    // Update Twitter Card tags
    updateMetaTag('twitter:title', systemName);
    updateMetaTag('twitter:description', tagline);
    
    if (logoUrl) {
      updateMetaTag('twitter:image', logoUrl);
    }

    // Update theme color
    updateMetaTag('theme-color', primaryColor);

    // Update favicon
    if (faviconUrl) {
      updateFavicon(faviconUrl);
    }

    // Update apple-touch-icon
    if (logoUrl) {
      updateAppleTouchIcon(logoUrl);
    }

  }, [effectiveBranding, hasWhiteLabel, tenantBarbershopName]);

  return null; // This component doesn't render anything
}

/**
 * Helper to update or create a meta tag
 */
function updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
  
  if (meta) {
    meta.content = content;
  } else {
    meta = document.createElement('meta');
    meta.setAttribute(attribute, name);
    meta.content = content;
    document.head.appendChild(meta);
  }
}

/**
 * Helper to update favicon
 */
function updateFavicon(url: string) {
  // Update main favicon
  let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
  if (favicon) {
    favicon.href = url;
  } else {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = url;
    document.head.appendChild(favicon);
  }

  // Update shortcut icon
  const shortcut = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement;
  if (shortcut) {
    shortcut.href = url;
  }
}

/**
 * Helper to update apple-touch-icon
 */
function updateAppleTouchIcon(url: string) {
  let icon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
  if (icon) {
    icon.href = url;
  } else {
    icon = document.createElement('link');
    icon.rel = 'apple-touch-icon';
    icon.href = url;
    document.head.appendChild(icon);
  }
}
