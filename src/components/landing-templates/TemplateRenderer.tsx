import React from 'react';
import { LandingPageConfig, SectionConfig } from '@/types/landing-page';
import { HeroSection } from './sections/HeroSection';
import { ServicesSection } from './sections/ServicesSection';
import { TeamSection } from './sections/TeamSection';
import { GallerySection } from './sections/GallerySection';
import { ReviewsSection } from './sections/ReviewsSection';
import { LocationSection } from './sections/LocationSection';
import { CTASection } from './sections/CTASection';

interface TemplateRendererProps {
  config: LandingPageConfig;
  barbershopId: string;
  barbershopData: {
    name: string;
    logo_url?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    instagram?: string;
    latitude?: number;
    longitude?: number;
  };
  services: any[];
  staff: any[];
  reviews: any[];
  businessHours: any[];
  bookingUrl: string;
  isPreview?: boolean;
}

const sectionComponents: Record<string, React.FC<any>> = {
  hero: HeroSection,
  services: ServicesSection,
  team: TeamSection,
  gallery: GallerySection,
  reviews: ReviewsSection,
  location: LocationSection,
  cta: CTASection,
};

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  config,
  barbershopId,
  barbershopData,
  services,
  staff,
  reviews,
  businessHours,
  bookingUrl,
  isPreview = false,
}) => {
  const { sections, global_styles } = config;

  // Sort sections by order
  const sortedSections = [...sections]
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);

  // Generate CSS variables from global styles
  const cssVariables = {
    '--landing-primary': `hsl(${global_styles.primary_color})`,
    '--landing-secondary': `hsl(${global_styles.secondary_color})`,
    '--landing-accent': `hsl(${global_styles.accent_color})`,
    '--landing-background': `hsl(${global_styles.background_color})`,
    '--landing-text': `hsl(${global_styles.text_color})`,
    '--landing-font-heading': global_styles.font_heading,
    '--landing-font-body': global_styles.font_body,
    '--landing-radius': 
      global_styles.border_radius === 'none' ? '0' :
      global_styles.border_radius === 'sm' ? '0.25rem' :
      global_styles.border_radius === 'md' ? '0.5rem' :
      global_styles.border_radius === 'lg' ? '1rem' : '9999px',
  } as React.CSSProperties;

  // Load Google Fonts (exclude Posey Textured as it's locally hosted)
  const fonts = [global_styles.font_heading, global_styles.font_body].filter(
    (f) => f && f !== 'Posey Textured'
  );
  const uniqueFonts = [...new Set(fonts)];
  const fontUrl = uniqueFonts.length > 0 
    ? `https://fonts.googleapis.com/css2?${uniqueFonts.map(f => `family=${f.replace(' ', '+')}:wght@400;500;600;700`).join('&')}&display=swap`
    : null;

  return (
    <>
      {/* Load fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {fontUrl && <link href={fontUrl} rel="stylesheet" />}

      <div 
        className="landing-template min-h-screen"
        style={{
          ...cssVariables,
          backgroundColor: 'var(--landing-background)',
          color: 'var(--landing-text)',
          fontFamily: 'var(--landing-font-body)',
        }}
      >
        {sortedSections.map((section) => {
          const SectionComponent = sectionComponents[section.type];
          
          if (!SectionComponent) {
            console.warn(`Unknown section type: ${section.type}`);
            return null;
          }

          return (
            <SectionComponent
              key={section.id}
              section={section}
              globalStyles={global_styles}
              barbershopData={barbershopData}
              services={services}
              staff={staff}
              reviews={reviews}
              businessHours={businessHours}
              bookingUrl={bookingUrl}
              isPreview={isPreview}
            />
          );
        })}
      </div>
    </>
  );
};
