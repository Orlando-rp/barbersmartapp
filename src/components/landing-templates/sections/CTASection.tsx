import React from 'react';
import { SectionConfig, CTASettings, GlobalStyles } from '@/types/landing-page';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CTASectionProps {
  section: SectionConfig;
  globalStyles: GlobalStyles;
  bookingUrl: string;
  isPreview?: boolean;
}

export const CTASection: React.FC<CTASectionProps> = ({
  section,
  globalStyles,
  bookingUrl,
  isPreview,
}) => {
  const settings = section.settings as CTASettings;

  const getBackgroundStyle = (): React.CSSProperties => {
    switch (settings.background_type) {
      case 'image':
        return {
          backgroundImage: settings.background_image?.url 
            ? `url(${settings.background_image.url})` 
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      case 'gradient':
        return {
          background: settings.background_value || 'linear-gradient(135deg, var(--landing-primary), var(--landing-secondary))',
        };
      default:
        return {
          backgroundColor: settings.background_value ? `hsl(${settings.background_value})` : 'var(--landing-primary)',
        };
    }
  };

  const handleClick = () => {
    if (isPreview) return;
    
    if (settings.button_action === 'booking') {
      window.location.href = bookingUrl;
    } else if (settings.button_action.startsWith('http')) {
      window.open(settings.button_action, '_blank');
    } else if (settings.button_action.startsWith('#')) {
      document.querySelector(settings.button_action)?.scrollIntoView({ behavior: 'smooth' });
    } else if (settings.button_action.startsWith('tel:')) {
      window.location.href = settings.button_action;
    } else if (settings.button_action.startsWith('https://wa.me')) {
      window.open(settings.button_action, '_blank');
    }
  };

  return (
    <section 
      id="cta"
      className="py-16 md:py-24 relative"
      style={getBackgroundStyle()}
    >
      {/* Overlay for image background */}
      {settings.background_type === 'image' && settings.background_image?.url && (
        <div className="absolute inset-0 bg-black/60" />
      )}

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white"
            style={{ fontFamily: 'var(--landing-font-heading)' }}
          >
            {settings.title}
          </h2>

          {settings.subtitle && (
            <p className="text-lg md:text-xl text-white/90 mb-8">
              {settings.subtitle}
            </p>
          )}

          <Button
            size="lg"
            onClick={handleClick}
            className="text-lg px-10 py-6 font-semibold"
            style={{
              backgroundColor: 'var(--landing-accent)',
              color: 'white',
              borderRadius: 'var(--landing-radius)',
            }}
          >
            {settings.button_text}
          </Button>
        </div>
      </div>
    </section>
  );
};
