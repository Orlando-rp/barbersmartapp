import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export interface SystemBranding {
  id: string;
  system_name: string;
  tagline: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  allow_tenant_customization: boolean;
}

interface BrandingContextType {
  branding: SystemBranding | null;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const defaultBranding: SystemBranding = {
  id: '',
  system_name: 'BarberSmart',
  tagline: 'Gestão Inteligente para Barbearias',
  logo_url: null,
  favicon_url: null,
  primary_color: '#d4a574',
  secondary_color: '#1a1a2e',
  accent_color: '#c9a86c',
  allow_tenant_customization: true,
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  loading: true,
  refreshBranding: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

// Helper to convert hex to HSL
const hexToHsl = (hex: string): string => {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Apply branding colors as CSS variables
const applyBrandingColors = (branding: SystemBranding) => {
  const root = document.documentElement;
  
  if (branding.primary_color) {
    const primaryHsl = hexToHsl(branding.primary_color);
    root.style.setProperty('--primary', primaryHsl);
    root.style.setProperty('--brand', primaryHsl);
  }
  
  if (branding.secondary_color) {
    const secondaryHsl = hexToHsl(branding.secondary_color);
    root.style.setProperty('--secondary', secondaryHsl);
  }
  
  if (branding.accent_color) {
    const accentHsl = hexToHsl(branding.accent_color);
    root.style.setProperty('--accent', accentHsl);
  }
  
  // Update favicon if provided
  if (branding.favicon_url) {
    const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (favicon) {
      favicon.href = branding.favicon_url;
    } else {
      const newFavicon = document.createElement('link');
      newFavicon.rel = 'icon';
      newFavicon.href = branding.favicon_url;
      document.head.appendChild(newFavicon);
    }
  }
  
  // Update page title
  if (branding.system_name) {
    document.title = branding.system_name;
  }
};

interface BrandingProviderProps {
  children: ReactNode;
}

export const BrandingProvider = ({ children }: BrandingProviderProps) => {
  const [branding, setBranding] = useState<SystemBranding | null>(defaultBranding);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from('system_branding')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log('Branding table not found, using defaults');
        setBranding(defaultBranding);
      } else if (data) {
        setBranding(data);
        applyBrandingColors(data);
      } else {
        setBranding(defaultBranding);
      }
    } catch (err) {
      console.log('Error fetching branding:', err);
      setBranding(defaultBranding);
    } finally {
      setLoading(false);
    }
  };

  const refreshBranding = async () => {
    await fetchBranding();
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  // Apply branding when it changes
  useEffect(() => {
    if (branding) {
      applyBrandingColors(branding);
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, loading, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};
