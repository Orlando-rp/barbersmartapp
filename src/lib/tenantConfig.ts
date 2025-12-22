/**
 * Multi-Tenant Configuration
 * 
 * This file centralizes all tenant-related configuration for the SaaS platform.
 * All values are configurable via environment variables for external deployment.
 */

// Main domains that serve the platform dashboard (not tenant domains)
// Comma-separated list of domains
const mainDomainsEnv = import.meta.env.VITE_MAIN_DOMAINS || 'barbersmart.app,barbersmart.com.br';
export const MAIN_DOMAINS: string[] = mainDomainsEnv.split(',').map((d: string) => d.trim());

// Domains to ignore for tenant detection (development/preview)
const ignoredDomainsEnv = import.meta.env.VITE_IGNORED_DOMAINS || 'localhost,lovable.app,lovableproject.com';
export const IGNORED_DOMAINS: string[] = ignoredDomainsEnv.split(',').map((d: string) => d.trim());

// Default system name when no tenant branding is found
export const DEFAULT_SYSTEM_NAME = import.meta.env.VITE_DEFAULT_SYSTEM_NAME || 'BarberSmart';

// Default tagline
export const DEFAULT_TAGLINE = import.meta.env.VITE_DEFAULT_TAGLINE || 'Gestão Inteligente para Barbearias';

// Whether to enable tenant detection at all
export const ENABLE_TENANT_DETECTION = import.meta.env.VITE_ENABLE_TENANT_DETECTION !== 'false';

// Trust reverse proxy headers (X-Forwarded-Host, X-Forwarded-For)
export const TRUST_PROXY_HEADERS = import.meta.env.VITE_TRUST_PROXY_HEADERS === 'true';

/**
 * Check if a hostname should be ignored for tenant detection
 */
export function isIgnoredDomain(hostname: string): boolean {
  if (!hostname) return true;
  
  return IGNORED_DOMAINS.some(domain => 
    hostname === domain || hostname.includes(domain)
  );
}

/**
 * Check if a hostname is the main platform domain
 */
export function isMainDomain(hostname: string): boolean {
  if (!hostname) return true;
  
  // Exact match with main domains
  if (MAIN_DOMAINS.includes(hostname)) return true;
  
  // Check if it's www. prefix of main domains
  for (const mainDomain of MAIN_DOMAINS) {
    if (hostname === `www.${mainDomain}`) return true;
  }
  
  return false;
}

/**
 * Check if a hostname is a subdomain of the main platform
 */
export function isSubdomainOfMainDomain(hostname: string): { isSubdomain: boolean; subdomain: string | null; baseDomain: string | null } {
  if (!hostname) return { isSubdomain: false, subdomain: null, baseDomain: null };
  
  for (const mainDomain of MAIN_DOMAINS) {
    if (hostname.endsWith(`.${mainDomain}`)) {
      const subdomain = hostname.replace(`.${mainDomain}`, '');
      // Ignore www as a subdomain
      if (subdomain === 'www') {
        return { isSubdomain: false, subdomain: null, baseDomain: mainDomain };
      }
      return { isSubdomain: true, subdomain, baseDomain: mainDomain };
    }
  }
  
  return { isSubdomain: false, subdomain: null, baseDomain: null };
}

/**
 * Extract the domain to check against the database
 * Returns the subdomain if it's a subdomain of the main platform,
 * otherwise returns the full hostname (for custom domains)
 */
export function extractDomainToCheck(hostname: string): string | null {
  if (!hostname || isIgnoredDomain(hostname) || isMainDomain(hostname)) {
    return null;
  }
  
  const { isSubdomain, subdomain } = isSubdomainOfMainDomain(hostname);
  
  if (isSubdomain && subdomain) {
    return subdomain;
  }
  
  // Custom domain - return full hostname
  return hostname;
}

/**
 * Get the effective hostname, considering reverse proxy headers
 */
export function getEffectiveHostname(): string {
  // In a browser context, we use window.location.hostname
  // The X-Forwarded-Host header is handled by the reverse proxy
  // and should already be reflected in the hostname
  return window.location.hostname;
}

/**
 * Build a relative URL (no hardcoded domains)
 */
export function buildRelativeUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedPath;
}

/**
 * Build an absolute URL based on current domain
 */
export function buildAbsoluteUrl(path: string): string {
  const protocol = window.location.protocol;
  const hostname = getEffectiveHostname();
  const port = window.location.port ? `:${window.location.port}` : '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${protocol}//${hostname}${port}${normalizedPath}`;
}
