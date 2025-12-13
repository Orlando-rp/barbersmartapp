import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";

export interface SystemBranding {
  id: string;
  system_name: string;
  tagline: string;
  logo_url: string | null;
  logo_light_url?: string | null;
  logo_dark_url?: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  allow_tenant_customization: boolean;
}

export interface CustomBranding {
  system_name?: string;
  tagline?: string;
  logo_url?: string;
  logo_light_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

interface BrandingContextType {
  branding: SystemBranding | null;
  customBranding: CustomBranding | null;
  effectiveBranding: SystemBranding | null;
  currentLogoUrl: string | null;
  loading: boolean;
  refreshBranding: () => Promise<void>;
  hasWhiteLabel: boolean;
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
  customBranding: null,
  effectiveBranding: defaultBranding,
  currentLogoUrl: null,
  loading: true,
  refreshBranding: async () => {},
  hasWhiteLabel: false,
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
  const { resolvedTheme } = useTheme();
  const [branding, setBranding] = useState<SystemBranding | null>(defaultBranding);
  const [customBranding, setCustomBranding] = useState<CustomBranding | null>(null);
  const [hasWhiteLabel, setHasWhiteLabel] = useState(false);
  const [loading, setLoading] = useState(true);

  // Calculate effective branding (custom overrides system if white-label)
  const effectiveBranding: SystemBranding | null = branding ? {
    ...branding,
    ...(hasWhiteLabel && customBranding ? {
      system_name: customBranding.system_name || branding.system_name,
      tagline: customBranding.tagline || branding.tagline,
      logo_url: customBranding.logo_url || branding.logo_url,
      logo_light_url: customBranding.logo_light_url || branding.logo_light_url,
      logo_dark_url: customBranding.logo_dark_url || branding.logo_dark_url,
      favicon_url: customBranding.favicon_url || branding.favicon_url,
      primary_color: customBranding.primary_color || branding.primary_color,
      secondary_color: customBranding.secondary_color || branding.secondary_color,
      accent_color: customBranding.accent_color || branding.accent_color,
    } : {})
  } : null;

  // Calculate current logo based on theme
  const currentLogoUrl = (() => {
    if (!effectiveBranding) return null;
    
    const isDark = resolvedTheme === 'dark';
    
    // Priority: theme-specific logo > generic logo > null
    if (isDark && effectiveBranding.logo_dark_url) {
      return effectiveBranding.logo_dark_url;
    }
    if (!isDark && effectiveBranding.logo_light_url) {
      return effectiveBranding.logo_light_url;
    }
    // Fallback to generic logo
    return effectiveBranding.logo_url;
  })();

  const fetchSystemBranding = async () => {
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
      } else {
        setBranding(defaultBranding);
      }
    } catch (err) {
      console.log('Error fetching branding:', err);
      setBranding(defaultBranding);
    }
  };

  const fetchBarbershopBranding = async () => {
    try {
      // Get current user's selected barbershop
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's barbershop with subscription and custom branding
      const { data: userBarbershop } = await supabase
        .from('user_barbershops')
        .select('barbershop_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!userBarbershop) return;

      // Fetch barbershop with parent info for hierarchy
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('id, parent_id, custom_branding')
        .eq('id', userBarbershop.barbershop_id)
        .single();

      if (!barbershop) return;

      // Determine root barbershop (matriz) for branding
      const rootId = barbershop.parent_id || barbershop.id;
      
      // Se é uma unidade, buscar branding da matriz
      let effectiveCustomBranding = barbershop.custom_branding;
      
      if (barbershop.parent_id) {
        // Buscar branding da matriz (barbearia principal)
        const { data: matriz } = await supabase
          .from('barbershops')
          .select('custom_branding')
          .eq('id', rootId)
          .single();
        
        if (matriz?.custom_branding) {
          effectiveCustomBranding = matriz.custom_branding;
        }
      }

      if (effectiveCustomBranding) {
        setCustomBranding(effectiveCustomBranding);
      }

      // Check if barbershop (ou matriz) has white_label feature
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select(`
          status,
          subscription_plans(feature_flags)
        `)
        .eq('barbershop_id', rootId) // Verificar na matriz
        .eq('status', 'active')
        .maybeSingle();

      if (subscription?.subscription_plans) {
        const plan = subscription.subscription_plans as any;
        const flags = typeof plan.feature_flags === 'string'
          ? JSON.parse(plan.feature_flags)
          : plan.feature_flags;
        setHasWhiteLabel(flags?.white_label === true);
      }
    } catch (err) {
      console.log('Error fetching barbershop branding:', err);
    }
  };

  const fetchBranding = async () => {
    setLoading(true);
    await Promise.all([
      fetchSystemBranding(),
      fetchBarbershopBranding(),
    ]);
    setLoading(false);
  };

  const refreshBranding = async () => {
    await fetchBranding();
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  // Apply effective branding when it changes
  useEffect(() => {
    if (effectiveBranding) {
      applyBrandingColors(effectiveBranding);
    }
  }, [effectiveBranding?.primary_color, effectiveBranding?.secondary_color, effectiveBranding?.accent_color, effectiveBranding?.favicon_url, effectiveBranding?.system_name]);

  return (
    <BrandingContext.Provider value={{ 
      branding, 
      customBranding,
      effectiveBranding,
      currentLogoUrl,
      loading, 
      refreshBranding,
      hasWhiteLabel,
    }}>
      {children}
    </BrandingContext.Provider>
  );
};
