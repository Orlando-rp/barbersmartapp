import { 
  LandingTemplate, 
  LandingPageConfig, 
  GlobalStyles,
  HeroSettings,
  ServicesSettings,
  TeamSettings,
  GallerySettings,
  ReviewsSettings,
  LocationSettings,
  CTASettings
} from '@/types/landing-page';

// Default global styles
const defaultGlobalStyles: GlobalStyles = {
  primary_color: '222.2 47.4% 11.2%',
  secondary_color: '210 40% 96.1%',
  accent_color: '210 40% 96.1%',
  background_color: '0 0% 100%',
  text_color: '222.2 84% 4.9%',
  font_heading: 'Posey Textured',
  font_body: 'Outfit',
  border_radius: 'md',
};

// Default section settings
const defaultHeroSettings: HeroSettings = {
  title: 'Sua Barbearia',
  subtitle: 'Estilo e tradição em cada corte',
  background_type: 'color',
  background_value: '222.2 47.4% 11.2%',
  text_position: 'center',
  text_color: 'light',
  height: '75vh',
  overlay_opacity: 0.5,
  cta_primary_text: 'Agendar Horário',
  cta_primary_action: 'booking',
  show_logo: true,
  show_scroll_indicator: true,
};

const defaultServicesSettings: ServicesSettings = {
  layout: 'grid',
  columns: 3,
  show_prices: true,
  show_duration: true,
  show_description: true,
  show_images: false,
  categories_filter: [],
  max_items: 9,
  background_color: '0 0% 100%',
  card_style: 'elevated',
};

const defaultTeamSettings: TeamSettings = {
  layout: 'grid',
  columns: 3,
  photo_shape: 'circle',
  show_specialties: true,
  show_bio: false,
  show_social: false,
  show_rating: true,
  background_color: '210 40% 96.1%',
};

const defaultGallerySettings: GallerySettings = {
  layout: 'masonry',
  columns: 3,
  show_categories: true,
  show_lightbox: true,
  max_images: 12,
  images: [],
  background_color: '0 0% 100%',
};

const defaultReviewsSettings: ReviewsSettings = {
  layout: 'cards',
  show_photos: true,
  show_date: true,
  min_rating: 4,
  max_items: 6,
  background_color: '210 40% 96.1%',
};

const defaultLocationSettings: LocationSettings = {
  show_map: true,
  show_hours: true,
  show_contact: true,
  show_social: true,
  map_style: 'standard',
  background_color: '0 0% 100%',
};

const defaultCTASettings: CTASettings = {
  title: 'Pronto para um novo visual?',
  subtitle: 'Agende seu horário agora e experimente o melhor da barbearia',
  button_text: 'Agendar Agora',
  button_action: 'booking',
  background_type: 'gradient',
  background_value: 'linear-gradient(135deg, hsl(222.2 47.4% 11.2%), hsl(222.2 47.4% 20%))',
};

// ============================================
// TEMPLATE 1: Modern Minimalist
// ============================================
const modernMinimalistConfig: LandingPageConfig = {
  template_id: 'modern-minimalist',
  global_styles: {
    ...defaultGlobalStyles,
    primary_color: '0 0% 9%',
    secondary_color: '0 0% 96%',
    accent_color: '142.1 76.2% 36.3%',
    font_heading: 'Inter',
    font_body: 'Inter',
    border_radius: 'lg',
  },
  sections: [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      order: 0,
      variant: 'split',
      settings: {
        ...defaultHeroSettings,
        text_position: 'left',
        background_type: 'color',
        background_value: '0 0% 96%',
        text_color: 'dark',
        height: '75vh',
        show_scroll_indicator: true,
      } as HeroSettings,
    },
    {
      id: 'services',
      type: 'services',
      enabled: true,
      order: 1,
      variant: 'minimal-grid',
      title: 'Nossos Serviços',
      settings: {
        ...defaultServicesSettings,
        layout: 'grid',
        columns: 3,
        card_style: 'flat',
        show_images: false,
      } as ServicesSettings,
    },
    {
      id: 'team',
      type: 'team',
      enabled: true,
      order: 2,
      variant: 'minimal',
      title: 'Nossa Equipe',
      settings: {
        ...defaultTeamSettings,
        photo_shape: 'rounded',
        show_bio: false,
        background_color: '0 0% 96%',
      } as TeamSettings,
    },
    {
      id: 'gallery',
      type: 'gallery',
      enabled: true,
      order: 3,
      variant: 'masonry',
      title: 'Nossos Trabalhos',
      settings: {
        ...defaultGallerySettings,
        layout: 'masonry',
        columns: 3,
      } as GallerySettings,
    },
    {
      id: 'reviews',
      type: 'reviews',
      enabled: true,
      order: 4,
      variant: 'minimal',
      title: 'O Que Dizem',
      settings: {
        ...defaultReviewsSettings,
        layout: 'slider',
        background_color: '0 0% 96%',
      } as ReviewsSettings,
    },
    {
      id: 'location',
      type: 'location',
      enabled: true,
      order: 5,
      variant: 'minimal',
      title: 'Onde Estamos',
      settings: {
        ...defaultLocationSettings,
        map_style: 'light',
      } as LocationSettings,
    },
    {
      id: 'cta',
      type: 'cta',
      enabled: true,
      order: 6,
      variant: 'minimal',
      settings: {
        ...defaultCTASettings,
        background_type: 'color',
        background_value: '0 0% 9%',
      } as CTASettings,
    },
  ],
  seo: {},
};

// ============================================
// TEMPLATE 2: Vintage Classic
// ============================================
const vintageClassicConfig: LandingPageConfig = {
  template_id: 'vintage-classic',
  global_styles: {
    ...defaultGlobalStyles,
    primary_color: '30 41% 14%',
    secondary_color: '39 77% 83%',
    accent_color: '36 100% 50%',
    background_color: '40 23% 97%',
    font_heading: 'Playfair Display',
    font_body: 'Lora',
    border_radius: 'none',
  },
  sections: [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      order: 0,
      variant: 'fullscreen-image',
      settings: {
        ...defaultHeroSettings,
        text_position: 'center',
        background_type: 'image',
        background_value: '',
        text_color: 'light',
        height: 'fullscreen',
        overlay_opacity: 0.6,
      } as HeroSettings,
    },
    {
      id: 'services',
      type: 'services',
      enabled: true,
      order: 1,
      variant: 'vintage-list',
      title: 'Serviços',
      settings: {
        ...defaultServicesSettings,
        layout: 'list',
        card_style: 'bordered',
        background_color: '40 23% 97%',
      } as ServicesSettings,
    },
    {
      id: 'team',
      type: 'team',
      enabled: true,
      order: 2,
      variant: 'polaroid',
      title: 'Mestres Barbeiros',
      settings: {
        ...defaultTeamSettings,
        photo_shape: 'square',
        show_bio: true,
        layout: 'grid',
        columns: 3,
        background_color: '39 77% 83%',
      } as TeamSettings,
    },
    {
      id: 'gallery',
      type: 'gallery',
      enabled: true,
      order: 3,
      variant: 'album',
      title: 'Galeria de Trabalhos',
      settings: {
        ...defaultGallerySettings,
        layout: 'grid',
        columns: 4,
      } as GallerySettings,
    },
    {
      id: 'reviews',
      type: 'reviews',
      enabled: true,
      order: 4,
      variant: 'classic',
      title: 'Depoimentos',
      settings: {
        ...defaultReviewsSettings,
        layout: 'cards',
        show_photos: true,
      } as ReviewsSettings,
    },
    {
      id: 'location',
      type: 'location',
      enabled: true,
      order: 5,
      variant: 'classic',
      title: 'Visite-nos',
      settings: {
        ...defaultLocationSettings,
        map_style: 'standard',
        background_color: '39 77% 83%',
      } as LocationSettings,
    },
    {
      id: 'cta',
      type: 'cta',
      enabled: true,
      order: 6,
      variant: 'vintage',
      settings: {
        ...defaultCTASettings,
        title: 'Tradição em Cada Corte',
        background_type: 'color',
        background_value: '30 41% 14%',
      } as CTASettings,
    },
  ],
  seo: {},
};

// ============================================
// TEMPLATE 3: Lifestyle Urban
// ============================================
const lifestyleUrbanConfig: LandingPageConfig = {
  template_id: 'lifestyle-urban',
  global_styles: {
    ...defaultGlobalStyles,
    primary_color: '0 0% 0%',
    secondary_color: '0 0% 98%',
    accent_color: '47 100% 50%',
    background_color: '0 0% 100%',
    font_heading: 'Bebas Neue',
    font_body: 'Roboto',
    border_radius: 'none',
  },
  sections: [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      order: 0,
      variant: 'video-background',
      settings: {
        ...defaultHeroSettings,
        title: 'ESTILO URBANO',
        subtitle: 'Mais que um corte, uma atitude',
        text_position: 'left',
        background_type: 'video',
        background_value: '',
        text_color: 'light',
        height: 'fullscreen',
        overlay_opacity: 0.4,
      } as HeroSettings,
    },
    {
      id: 'services',
      type: 'services',
      enabled: true,
      order: 1,
      variant: 'horizontal-cards',
      title: 'O QUE FAZEMOS',
      settings: {
        ...defaultServicesSettings,
        layout: 'list',
        show_images: true,
        card_style: 'flat',
      } as ServicesSettings,
    },
    {
      id: 'team',
      type: 'team',
      enabled: true,
      order: 2,
      variant: 'asymmetric',
      title: 'TIME',
      settings: {
        ...defaultTeamSettings,
        photo_shape: 'square',
        layout: 'grid',
        columns: 2,
        show_social: true,
        background_color: '0 0% 0%',
      } as TeamSettings,
    },
    {
      id: 'gallery',
      type: 'gallery',
      enabled: true,
      order: 3,
      variant: 'instagram',
      title: 'FEED',
      settings: {
        ...defaultGallerySettings,
        layout: 'instagram',
        columns: 4,
      } as GallerySettings,
    },
    {
      id: 'reviews',
      type: 'reviews',
      enabled: true,
      order: 4,
      variant: 'bold',
      title: 'CLIENTES',
      settings: {
        ...defaultReviewsSettings,
        layout: 'slider',
        show_photos: true,
      } as ReviewsSettings,
    },
    {
      id: 'location',
      type: 'location',
      enabled: true,
      order: 5,
      variant: 'urban',
      title: 'LOCALIZAÇÃO',
      settings: {
        ...defaultLocationSettings,
        map_style: 'dark',
      } as LocationSettings,
    },
    {
      id: 'cta',
      type: 'cta',
      enabled: true,
      order: 6,
      variant: 'bold',
      settings: {
        ...defaultCTASettings,
        title: 'BORA CORTAR?',
        subtitle: '',
        background_type: 'color',
        background_value: '47 100% 50%',
      } as CTASettings,
    },
  ],
  seo: {},
};

// ============================================
// TEMPLATE 4: Premium Luxury
// ============================================
const premiumLuxuryConfig: LandingPageConfig = {
  template_id: 'premium-luxury',
  global_styles: {
    ...defaultGlobalStyles,
    primary_color: '0 0% 7%',
    secondary_color: '43 74% 49%',
    accent_color: '43 74% 49%',
    background_color: '0 0% 4%',
    text_color: '0 0% 95%',
    font_heading: 'Cormorant Garamond',
    font_body: 'Montserrat',
    border_radius: 'sm',
  },
  sections: [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      order: 0,
      variant: 'split-parallax',
      settings: {
        ...defaultHeroSettings,
        title: 'Excelência em Barbearia',
        subtitle: 'Uma experiência exclusiva para o homem moderno',
        text_position: 'left',
        background_type: 'image',
        background_value: '',
        text_color: 'light',
        height: 'fullscreen',
        overlay_opacity: 0.3,
      } as HeroSettings,
    },
    {
      id: 'services',
      type: 'services',
      enabled: true,
      order: 1,
      variant: 'luxury-cards',
      title: 'Experiências',
      settings: {
        ...defaultServicesSettings,
        layout: 'grid',
        columns: 3,
        card_style: 'elevated',
        show_images: true,
        background_color: '0 0% 4%',
      } as ServicesSettings,
    },
    {
      id: 'team',
      type: 'team',
      enabled: true,
      order: 2,
      variant: 'luxury',
      title: 'Especialistas',
      settings: {
        ...defaultTeamSettings,
        photo_shape: 'square',
        layout: 'carousel',
        show_bio: true,
        show_rating: true,
        background_color: '0 0% 7%',
      } as TeamSettings,
    },
    {
      id: 'gallery',
      type: 'gallery',
      enabled: true,
      order: 3,
      variant: 'luxury-lightbox',
      title: 'Portfolio',
      settings: {
        ...defaultGallerySettings,
        layout: 'grid',
        columns: 3,
        show_lightbox: true,
        background_color: '0 0% 4%',
      } as GallerySettings,
    },
    {
      id: 'reviews',
      type: 'reviews',
      enabled: true,
      order: 4,
      variant: 'luxury',
      title: 'Testemunhos',
      settings: {
        ...defaultReviewsSettings,
        layout: 'slider',
        show_photos: false,
        background_color: '0 0% 7%',
      } as ReviewsSettings,
    },
    {
      id: 'location',
      type: 'location',
      enabled: true,
      order: 5,
      variant: 'luxury',
      title: 'Localização',
      settings: {
        ...defaultLocationSettings,
        map_style: 'dark',
        background_color: '0 0% 4%',
      } as LocationSettings,
    },
    {
      id: 'cta',
      type: 'cta',
      enabled: true,
      order: 6,
      variant: 'luxury',
      settings: {
        ...defaultCTASettings,
        title: 'Reserve Sua Experiência',
        subtitle: 'Agende agora e descubra o padrão de excelência',
        background_type: 'gradient',
        background_value: 'linear-gradient(135deg, hsl(43 74% 49% / 0.2), hsl(0 0% 7%))',
      } as CTASettings,
    },
  ],
  seo: {},
};

// ============================================
// TEMPLATE 5: Bold Impact
// ============================================
const boldImpactConfig: LandingPageConfig = {
  template_id: 'bold-impact',
  global_styles: {
    ...defaultGlobalStyles,
    primary_color: '0 0% 100%',
    secondary_color: '263 70% 50%',
    accent_color: '142 71% 45%',
    background_color: '0 0% 5%',
    text_color: '0 0% 100%',
    font_heading: 'Oswald',
    font_body: 'Open Sans',
    border_radius: 'full',
  },
  sections: [
    {
      id: 'hero',
      type: 'hero',
      enabled: true,
      order: 0,
      variant: 'animated-text',
      settings: {
        ...defaultHeroSettings,
        title: 'CORTE PERFEITO',
        subtitle: 'Transforme seu visual',
        text_position: 'center',
        background_type: 'gradient',
        background_value: 'linear-gradient(135deg, hsl(263 70% 30%), hsl(0 0% 5%))',
        text_color: 'light',
        height: 'fullscreen',
      } as HeroSettings,
    },
    {
      id: 'services',
      type: 'services',
      enabled: true,
      order: 1,
      variant: 'carousel',
      title: 'SERVIÇOS',
      settings: {
        ...defaultServicesSettings,
        layout: 'carousel',
        card_style: 'elevated',
        show_images: true,
        background_color: '0 0% 5%',
      } as ServicesSettings,
    },
    {
      id: 'team',
      type: 'team',
      enabled: true,
      order: 2,
      variant: 'stats',
      title: 'NOSSO TIME',
      settings: {
        ...defaultTeamSettings,
        photo_shape: 'circle',
        layout: 'grid',
        columns: 4,
        show_rating: true,
        background_color: '263 70% 20%',
      } as TeamSettings,
    },
    {
      id: 'gallery',
      type: 'gallery',
      enabled: true,
      order: 3,
      variant: 'hover-zoom',
      title: 'TRABALHOS',
      settings: {
        ...defaultGallerySettings,
        layout: 'grid',
        columns: 4,
        background_color: '0 0% 5%',
      } as GallerySettings,
    },
    {
      id: 'reviews',
      type: 'reviews',
      enabled: true,
      order: 4,
      variant: 'impact',
      title: 'AVALIAÇÕES',
      settings: {
        ...defaultReviewsSettings,
        layout: 'cards',
        show_photos: true,
        background_color: '0 0% 8%',
      } as ReviewsSettings,
    },
    {
      id: 'location',
      type: 'location',
      enabled: true,
      order: 5,
      variant: 'bold',
      title: 'ENCONTRE-NOS',
      settings: {
        ...defaultLocationSettings,
        map_style: 'dark',
        background_color: '0 0% 5%',
      } as LocationSettings,
    },
    {
      id: 'cta',
      type: 'cta',
      enabled: true,
      order: 6,
      variant: 'impact',
      settings: {
        ...defaultCTASettings,
        title: 'AGENDE AGORA',
        subtitle: 'Não perca mais tempo',
        background_type: 'gradient',
        background_value: 'linear-gradient(90deg, hsl(263 70% 50%), hsl(142 71% 45%))',
      } as CTASettings,
    },
  ],
  seo: {},
};

// ============================================
// EXPORT ALL TEMPLATES
// ============================================
export const landingTemplates: LandingTemplate[] = [
  {
    id: 'modern-minimalist',
    name: 'Moderno Minimalista',
    description: 'Design limpo e elegante com foco na simplicidade. Ideal para barbearias contemporâneas.',
    thumbnail: '/templates/modern-minimalist.jpg',
    category: 'modern',
    defaultConfig: modernMinimalistConfig,
  },
  {
    id: 'vintage-classic',
    name: 'Vintage Clássico',
    description: 'Estilo retrô com toques de elegância clássica. Perfeito para barbearias tradicionais.',
    thumbnail: '/templates/vintage-classic.jpg',
    category: 'vintage',
    defaultConfig: vintageClassicConfig,
  },
  {
    id: 'lifestyle-urban',
    name: 'Lifestyle Urbano',
    description: 'Visual arrojado e moderno com energia urbana. Ideal para barbearias jovens e descoladas.',
    thumbnail: '/templates/lifestyle-urban.jpg',
    category: 'urban',
    defaultConfig: lifestyleUrbanConfig,
  },
  {
    id: 'premium-luxury',
    name: 'Premium Luxo',
    description: 'Sofisticação e elegância em cada detalhe. Para barbearias de alto padrão.',
    thumbnail: '/templates/premium-luxury.jpg',
    category: 'premium',
    defaultConfig: premiumLuxuryConfig,
  },
  {
    id: 'bold-impact',
    name: 'Bold Impactante',
    description: 'Design ousado com cores vibrantes e animações. Para quem quer se destacar.',
    thumbnail: '/templates/bold-impact.jpg',
    category: 'bold',
    defaultConfig: boldImpactConfig,
  },
];

export const getTemplateById = (id: string): LandingTemplate | undefined => {
  return landingTemplates.find(t => t.id === id);
};

export const getDefaultConfig = (templateId: string): LandingPageConfig => {
  const template = getTemplateById(templateId);
  return template?.defaultConfig || modernMinimalistConfig;
};
