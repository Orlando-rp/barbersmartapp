import { useEffect } from 'react';

interface SEOData {
  title: string;
  description: string;
  image?: string | null;
  url?: string;
  type?: 'website' | 'business.business' | 'article';
  siteName?: string;
  locale?: string;
  // Business specific
  businessName?: string;
  address?: string;
  phone?: string;
  priceRange?: string;
  // Schema.org structured data
  structuredData?: object;
}

/**
 * Hook para gerenciar SEO dinâmico de páginas
 * Atualiza meta tags, Open Graph, Twitter Cards e JSON-LD
 */
export function useDynamicSEO(seo: SEOData | null) {
  useEffect(() => {
    if (!seo) return;

    const {
      title,
      description,
      image,
      url = window.location.href,
      type = 'website',
      siteName,
      locale = 'pt_BR',
      businessName,
      address,
      phone,
      priceRange,
      structuredData,
    } = seo;

    // Update document title
    document.title = title;

    // Basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('robots', 'index, follow');

    // Open Graph tags
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:url', url, 'property');
    updateMetaTag('og:type', type, 'property');
    updateMetaTag('og:locale', locale, 'property');
    
    if (siteName) {
      updateMetaTag('og:site_name', siteName, 'property');
    }
    
    if (image) {
      updateMetaTag('og:image', image, 'property');
      updateMetaTag('og:image:width', '1200', 'property');
      updateMetaTag('og:image:height', '630', 'property');
    }

    // Twitter Card tags
    updateMetaTag('twitter:card', image ? 'summary_large_image' : 'summary');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    
    if (image) {
      updateMetaTag('twitter:image', image);
    }

    // Business specific meta tags
    if (businessName) {
      updateMetaTag('business:contact_data:street_address', address || '', 'property');
      updateMetaTag('business:contact_data:phone_number', phone || '', 'property');
    }

    // Canonical URL
    updateCanonicalUrl(url);

    // JSON-LD Structured Data
    if (structuredData) {
      updateJsonLd(structuredData);
    } else if (businessName) {
      // Generate default LocalBusiness schema
      const localBusinessSchema = {
        '@context': 'https://schema.org',
        '@type': 'BarberShop',
        name: businessName,
        description: description,
        url: url,
        ...(image && { image: image }),
        ...(address && { 
          address: {
            '@type': 'PostalAddress',
            streetAddress: address,
          }
        }),
        ...(phone && { telephone: phone }),
        ...(priceRange && { priceRange: priceRange }),
      };
      updateJsonLd(localBusinessSchema);
    }

    // Cleanup on unmount
    return () => {
      // Remove custom JSON-LD when leaving the page
      const existingScript = document.querySelector('script[data-seo-jsonld]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [seo]);
}

/**
 * Helper to update or create a meta tag
 */
function updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  if (!content) return;
  
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
 * Helper to update canonical URL
 */
function updateCanonicalUrl(url: string) {
  let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
  
  if (link) {
    link.href = url;
  } else {
    link = document.createElement('link');
    link.rel = 'canonical';
    link.href = url;
    document.head.appendChild(link);
  }
}

/**
 * Helper to update JSON-LD structured data
 */
function updateJsonLd(data: object) {
  // Remove existing SEO JSON-LD
  const existingScript = document.querySelector('script[data-seo-jsonld]');
  if (existingScript) {
    existingScript.remove();
  }

  // Create new script
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-seo-jsonld', 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}
