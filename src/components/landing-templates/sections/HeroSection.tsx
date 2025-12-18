import React from 'react';
import { SectionConfig, HeroSettings, GlobalStyles } from '@/types/landing-page';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  section: SectionConfig;
  globalStyles: GlobalStyles;
  barbershopData: {
    name: string;
    logo_url?: string;
  };
  bookingUrl: string;
  isPreview?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  section,
  globalStyles,
  barbershopData,
  bookingUrl,
  isPreview,
}) => {
  const settings = section.settings as HeroSettings;
  const variant = section.variant;

  const heightClass = 
    settings.height === 'fullscreen' ? 'min-h-screen' :
    settings.height === '75vh' ? 'min-h-[75vh]' : 'min-h-[50vh]';

  const textPositionClass = 
    settings.text_position === 'left' ? 'items-start text-left' :
    settings.text_position === 'right' ? 'items-end text-right' : 'items-center text-center';

  const textColorClass = settings.text_color === 'light' ? 'text-white' : 'text-gray-900';

  const getBackgroundStyle = (): React.CSSProperties => {
    switch (settings.background_type) {
      case 'image':
        return {
          backgroundImage: settings.background_image?.url 
            ? `url(${settings.background_image.url})` 
            : 'linear-gradient(135deg, hsl(var(--landing-primary)), hsl(var(--landing-secondary)))',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      case 'gradient':
        return {
          background: settings.background_value || 'linear-gradient(135deg, var(--landing-primary), var(--landing-secondary))',
        };
      case 'video':
        return {};
      default:
        return {
          backgroundColor: settings.background_value ? `hsl(${settings.background_value})` : 'var(--landing-primary)',
        };
    }
  };

  const handleCTAClick = () => {
    if (isPreview) return;
    if (settings.cta_primary_action === 'booking') {
      window.location.href = bookingUrl;
    } else if (settings.cta_primary_action.startsWith('http')) {
      window.open(settings.cta_primary_action, '_blank');
    } else if (settings.cta_primary_action.startsWith('#')) {
      document.querySelector(settings.cta_primary_action)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  };

  return (
    <section 
      className={cn('relative flex flex-col justify-center', heightClass)}
      style={getBackgroundStyle()}
    >
      {/* Overlay */}
      {(settings.background_type === 'image' || settings.background_type === 'video') && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: settings.overlay_opacity }}
        />
      )}

      {/* Video background */}
      {settings.background_type === 'video' && settings.background_value && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={settings.background_value} type="video/mp4" />
        </video>
      )}

      {/* Content */}
      <div className={cn(
        'relative z-10 container mx-auto px-4 py-20 flex flex-col',
        textPositionClass
      )}>
        {/* Logo */}
        {settings.show_logo && barbershopData.logo_url && (
          <img
            src={barbershopData.logo_url}
            alt={barbershopData.name}
            className="h-16 md:h-20 w-auto mb-8 object-contain"
          />
        )}

        {/* Title */}
        <h1 
          className={cn(
            'font-bold mb-4 leading-tight',
            textColorClass,
            variant === 'animated-text' ? 'text-5xl md:text-7xl lg:text-8xl' : 'text-4xl md:text-5xl lg:text-6xl'
          )}
          style={{ fontFamily: 'var(--landing-font-heading)' }}
        >
          {settings.title || barbershopData.name}
        </h1>

        {/* Subtitle */}
        {settings.subtitle && (
          <p 
            className={cn(
              'text-lg md:text-xl lg:text-2xl mb-8 max-w-2xl opacity-90',
              textColorClass
            )}
          >
            {settings.subtitle}
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-wrap gap-4">
          <Button
            size="lg"
            onClick={handleCTAClick}
            className="text-lg px-8 py-6"
            style={{
              backgroundColor: 'var(--landing-accent)',
              borderRadius: 'var(--landing-radius)',
            }}
          >
            {settings.cta_primary_text}
          </Button>

          {settings.cta_secondary_text && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                if (settings.cta_secondary_action?.startsWith('#')) {
                  document.querySelector(settings.cta_secondary_action)?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className={cn('text-lg px-8 py-6', textColorClass)}
              style={{ borderRadius: 'var(--landing-radius)' }}
            >
              {settings.cta_secondary_text}
            </Button>
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      {settings.show_scroll_indicator && (
        <button
          onClick={scrollToContent}
          className={cn(
            'absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce',
            textColorClass
          )}
        >
          <ChevronDown className="h-8 w-8" />
        </button>
      )}
    </section>
  );
};
