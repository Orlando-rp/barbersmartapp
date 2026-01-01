// Landing Page Template System Types

export type TemplateCategory = 'modern' | 'vintage' | 'urban' | 'premium' | 'bold';

export type SectionType = 'hero' | 'services' | 'team' | 'gallery' | 'reviews' | 'location' | 'cta';

// Section Variants
export type HeroVariant = 'default' | 'split-screen' | 'video-parallax' | 'animated-text' | 'slideshow' | 'minimal';
export type ServicesVariant = 'default' | 'featured' | 'minimal' | 'hover-cards' | 'pricing-table';
export type TeamVariant = 'default' | 'featured' | 'minimal-cards' | 'overlay' | 'cards-horizontal';
export type GalleryVariant = 'default' | 'featured' | 'before-after' | 'collage' | 'polaroid';
export type ReviewsVariant = 'default' | 'featured' | 'marquee' | 'testimonial-wall' | 'quote-highlight';

export interface ImageConfig {
  id: string;
  url: string;
  optimized_url?: string;
  thumbnail_url?: string;
  alt: string;
  focal_point?: { x: number; y: number };
  width?: number;
  height?: number;
}

export interface GlobalStyles {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_heading: string;
  font_body: string;
  border_radius: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string[];
  og_image?: string;
}

// Section-specific settings
export interface HeroSettings {
  title: string;
  subtitle: string;
  background_type: 'image' | 'color' | 'gradient' | 'video';
  background_value: string;
  background_image?: ImageConfig;
  background_images?: ImageConfig[]; // For slideshow variant
  text_position: 'left' | 'center' | 'right';
  text_color: 'light' | 'dark';
  height: 'fullscreen' | '75vh' | '50vh';
  overlay_opacity: number;
  cta_primary_text: string;
  cta_primary_action: string;
  cta_secondary_text?: string;
  cta_secondary_action?: string;
  show_logo: boolean;
  show_scroll_indicator: boolean;
  // Split screen settings
  split_image?: ImageConfig;
  split_position?: 'left' | 'right';
  // Slideshow settings
  slideshow_interval?: number; // seconds
  slideshow_transition?: 'fade' | 'slide' | 'zoom';
}

export interface ServicesSettings {
  layout: 'grid' | 'list' | 'carousel';
  columns: 2 | 3 | 4;
  show_prices: boolean;
  show_duration: boolean;
  show_description: boolean;
  show_images: boolean;
  categories_filter: string[];
  max_items: number;
  background_color: string;
  card_style: 'flat' | 'elevated' | 'bordered';
}

export interface TeamSettings {
  layout: 'grid' | 'carousel' | 'list';
  columns: 2 | 3 | 4;
  photo_shape: 'circle' | 'square' | 'rounded';
  show_specialties: boolean;
  show_bio: boolean;
  show_social: boolean;
  show_rating: boolean;
  background_color: string;
}

export interface GallerySettings {
  layout: 'masonry' | 'grid' | 'slider' | 'instagram';
  columns: 2 | 3 | 4;
  show_categories: boolean;
  show_lightbox: boolean;
  max_images: number;
  images: ImageConfig[];
  background_color: string;
}

export interface ReviewsSettings {
  layout: 'cards' | 'slider' | 'list';
  show_photos: boolean;
  show_date: boolean;
  min_rating: number;
  max_items: number;
  background_color: string;
}

export interface LocationSettings {
  show_map: boolean;
  show_hours: boolean;
  show_contact: boolean;
  show_social: boolean;
  map_style: 'standard' | 'dark' | 'light';
  background_color: string;
}

export interface CTASettings {
  title: string;
  subtitle: string;
  button_text: string;
  button_action: string;
  background_type: 'color' | 'gradient' | 'image';
  background_value: string;
  background_image?: ImageConfig;
}

export interface FooterSettings {
  show_logo: boolean;
  tagline: string;
  show_contact: boolean;
  show_social: boolean;
  show_booking_button: boolean;
  show_privacy_link: boolean;
  show_terms_link: boolean;
  powered_by_text: string;
  show_powered_by: boolean;
  custom_links: {
    label: string;
    url: string;
  }[];
  background_color?: string;
}

export type SectionSettings = 
  | HeroSettings 
  | ServicesSettings 
  | TeamSettings 
  | GallerySettings 
  | ReviewsSettings 
  | LocationSettings 
  | CTASettings;

export interface SectionConfig {
  id: string;
  type: SectionType;
  enabled: boolean;
  order: number;
  variant: string;
  title?: string;
  settings: SectionSettings;
}

export interface LandingPageConfig {
  template_id: string;
  sections: SectionConfig[];
  global_styles: GlobalStyles;
  seo: SEOConfig;
  footer?: FooterSettings;
  updated_at?: string;
}

export interface LandingTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: TemplateCategory;
  preview_url?: string;
  defaultConfig: LandingPageConfig;
}

// Image optimization types
export interface OptimizeOptions {
  maxWidth: number;
  maxHeight?: number;
  quality: number;
  format: 'webp' | 'jpeg' | 'png';
  generateThumbnail?: boolean;
  thumbnailWidth?: number;
}

export interface OptimizedImageResult {
  optimizedBlob: Blob;
  thumbnailBlob?: Blob;
  metadata: {
    originalSize: number;
    optimizedSize: number;
    width: number;
    height: number;
    format: string;
    compressionRatio: number;
  };
}

// Default configurations per context
export const IMAGE_OPTIMIZATION_PRESETS: Record<string, OptimizeOptions> = {
  hero: {
    maxWidth: 1920,
    quality: 85,
    format: 'webp',
    generateThumbnail: true,
    thumbnailWidth: 400,
  },
  team: {
    maxWidth: 800,
    quality: 90,
    format: 'webp',
    generateThumbnail: true,
    thumbnailWidth: 200,
  },
  gallery: {
    maxWidth: 1200,
    quality: 85,
    format: 'webp',
    generateThumbnail: true,
    thumbnailWidth: 300,
  },
  logo: {
    maxWidth: 500,
    quality: 95,
    format: 'png',
    generateThumbnail: false,
  },
  thumbnail: {
    maxWidth: 400,
    quality: 80,
    format: 'webp',
    generateThumbnail: false,
  },
};
