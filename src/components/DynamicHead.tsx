import { useEffect } from 'react';
import { useBranding } from '@/contexts/BrandingContext';
import { DEFAULT_SYSTEM_NAME, DEFAULT_TAGLINE } from '@/lib/tenantConfig';

/**
 * DynamicHead - Updates document head based on tenant branding
 * 
 * Updates:
 * - Document title
 * - Favicon
 * - Apple Touch Icons (PWA)
 * - Meta description
 * - Open Graph tags
 * - Theme color
 * - PWA app name
 */
export default function DynamicHead() {
  const { effectiveBranding, hasWhiteLabel, tenantBarbershopName } = useBranding();

  useEffect(() => {
    // Get effective values
    const systemName = effectiveBranding?.system_name || tenantBarbershopName || DEFAULT_SYSTEM_NAME;
    const tagline = effectiveBranding?.tagline || DEFAULT_TAGLINE;
    const logoIconUrl = effectiveBranding?.logo_icon_url;
    const faviconUrl = effectiveBranding?.favicon_url;
    const logoUrl = effectiveBranding?.logo_url;
    const primaryColor = effectiveBranding?.primary_color || '#d4a574';

    // Prioridade para ícones do PWA: logo_icon_url > favicon_url > logo_url
    const pwaIconUrl = logoIconUrl || faviconUrl || logoUrl;

    // Update document title
    document.title = systemName;

    // Update meta description
    updateMetaTag('description', `${systemName} - ${tagline}`);

    // Update Open Graph tags
    updateMetaTag('og:title', systemName, 'property');
    updateMetaTag('og:description', tagline, 'property');
    updateMetaTag('og:site_name', systemName, 'property');
    
    if (pwaIconUrl) {
      updateMetaTag('og:image', pwaIconUrl, 'property');
    }

    // Update Twitter Card tags
    updateMetaTag('twitter:title', systemName);
    updateMetaTag('twitter:description', tagline);
    
    if (pwaIconUrl) {
      updateMetaTag('twitter:image', pwaIconUrl);
    }

    // Update theme color
    updateMetaTag('theme-color', primaryColor);

    // Update PWA app names
    updateMetaTag('apple-mobile-web-app-title', systemName);
    updateMetaTag('application-name', systemName);

    // Update favicon - priorizar logo_icon_url para melhor aparência
    if (pwaIconUrl) {
      updateFavicon(pwaIconUrl);
    }

    // Update Apple Touch Icons (PWA icons) - priorizar logo_icon_url
    if (pwaIconUrl) {
      updateAppleTouchIcons(pwaIconUrl);
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
  // Update all favicon variants
  const faviconSelectors = [
    "link[rel='icon']",
    "link[rel='shortcut icon']",
    "link[rel='icon'][type='image/png']"
  ];

  faviconSelectors.forEach(selector => {
    const link = document.querySelector(selector) as HTMLLinkElement;
    if (link) {
      link.href = url;
    }
  });

  // Ensure at least one main favicon exists
  let mainFavicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
  if (!mainFavicon) {
    mainFavicon = document.createElement('link');
    mainFavicon.rel = 'icon';
    mainFavicon.href = url;
    document.head.appendChild(mainFavicon);
  }
}

/**
 * Helper to update all Apple Touch Icons for PWA
 */
function updateAppleTouchIcons(url: string) {
  // Update existing Apple Touch Icons with sizes
  const appleTouchIconSizes = ['152x152', '180x180', '167x167'];
  
  appleTouchIconSizes.forEach(size => {
    let icon = document.querySelector(`link[rel='apple-touch-icon'][sizes='${size}']`) as HTMLLinkElement;
    if (icon) {
      icon.href = url;
    } else {
      icon = document.createElement('link');
      icon.rel = 'apple-touch-icon';
      icon.setAttribute('sizes', size);
      icon.href = url;
      document.head.appendChild(icon);
    }
  });

  // Update generic Apple Touch Icon (without size)
  let genericIcon = document.querySelector("link[rel='apple-touch-icon']:not([sizes])") as HTMLLinkElement;
  if (genericIcon) {
    genericIcon.href = url;
  } else {
    genericIcon = document.createElement('link');
    genericIcon.rel = 'apple-touch-icon';
    genericIcon.href = url;
    document.head.appendChild(genericIcon);
  }

  // Update Apple Touch Startup Image (splash screen)
  const splashScreen = document.querySelector("link[rel='apple-touch-startup-image']") as HTMLLinkElement;
  if (splashScreen) {
    splashScreen.href = url;
  }
}
