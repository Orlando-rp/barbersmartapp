import React, { useState, useEffect } from 'react';
import { SectionConfig, HeroSettings, GlobalStyles, HeroVariant } from '@/types/landing-page';
import { Button } from '@/components/ui/button';
import { ChevronDown, Play } from 'lucide-react';
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
  const variant = section.variant as HeroVariant;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  // Slideshow effect
  useEffect(() => {
    if (variant === 'slideshow' && settings.background_images?.length) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % settings.background_images!.length);
      }, (settings.slideshow_interval || 5) * 1000);
      return () => clearInterval(interval);
    }
  }, [variant, settings.background_images, settings.slideshow_interval]);

  // Parallax effect
  useEffect(() => {
    if (variant === 'video-parallax' && !isPreview) {
      const handleScroll = () => {
        setParallaxOffset(window.scrollY * 0.5);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [variant, isPreview]);

  const heightClass = 
    settings.height === 'fullscreen' ? 'min-h-screen' :
    settings.height === '75vh' ? 'min-h-[75vh]' : 'min-h-[50vh]';

  const textPositionClass = 
    settings.text_position === 'left' ? 'items-start text-left' :
    settings.text_position === 'right' ? 'items-end text-right' : 'items-center text-center';

  const textColorClass = settings.text_color === 'light' ? 'text-white' : 'text-gray-900';

  const getBackgroundStyle = (): React.CSSProperties => {
    if (variant === 'slideshow') return {};
    
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

  // Split Screen Variant
  if (variant === 'split-screen') {
    const imagePosition = settings.split_position || 'right';
    return (
      <section className={cn('relative flex', heightClass)}>
        <div className={cn(
          'flex flex-col md:flex-row w-full',
          imagePosition === 'left' ? 'md:flex-row-reverse' : ''
        )}>
          {/* Content Side */}
          <div 
            className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16"
            style={{ 
              backgroundColor: settings.background_value ? `hsl(${settings.background_value})` : 'hsl(var(--landing-primary))'
            }}
          >
            {settings.show_logo && barbershopData.logo_url && (
              <img
                src={barbershopData.logo_url}
                alt={barbershopData.name}
                className="h-12 md:h-16 w-auto mb-6 object-contain"
              />
            )}
            <h1 
              className={cn('text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight', textColorClass)}
              style={{ fontFamily: 'var(--landing-font-heading)' }}
            >
              {settings.title || barbershopData.name}
            </h1>
            {settings.subtitle && (
              <p className={cn('text-lg md:text-xl mb-8 opacity-90', textColorClass)}>
                {settings.subtitle}
              </p>
            )}
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={handleCTAClick}
                className="text-lg px-8 py-6"
                style={{ backgroundColor: 'var(--landing-accent)', borderRadius: 'var(--landing-radius)' }}
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

          {/* Image Side */}
          <div 
            className="w-full md:w-1/2 min-h-[50vh] md:min-h-full bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${settings.split_image?.url || settings.background_image?.url || ''})` 
            }}
          />
        </div>
      </section>
    );
  }

  // Slideshow Variant
  if (variant === 'slideshow' && settings.background_images?.length) {
    return (
      <section className={cn('relative flex flex-col justify-center overflow-hidden', heightClass)}>
        {/* Slideshow Background */}
        {settings.background_images.map((img, index) => (
          <div
            key={img.id}
            className={cn(
              'absolute inset-0 bg-cover bg-center transition-opacity duration-1000',
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            )}
            style={{ backgroundImage: `url(${img.url})` }}
          />
        ))}

        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: settings.overlay_opacity }}
        />

        {/* Content */}
        <div className={cn(
          'relative z-10 container mx-auto px-4 py-20 flex flex-col',
          textPositionClass
        )}>
          {settings.show_logo && barbershopData.logo_url && (
            <img
              src={barbershopData.logo_url}
              alt={barbershopData.name}
              className="h-16 md:h-20 w-auto mb-8 object-contain"
            />
          )}
          <h1 
            className={cn('text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight', textColorClass)}
            style={{ fontFamily: 'var(--landing-font-heading)' }}
          >
            {settings.title || barbershopData.name}
          </h1>
          {settings.subtitle && (
            <p className={cn('text-lg md:text-xl lg:text-2xl mb-8 max-w-2xl opacity-90', textColorClass)}>
              {settings.subtitle}
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              onClick={handleCTAClick}
              className="text-lg px-8 py-6"
              style={{ backgroundColor: 'var(--landing-accent)', borderRadius: 'var(--landing-radius)' }}
            >
              {settings.cta_primary_text}
            </Button>
          </div>
        </div>

        {/* Slideshow Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {settings.background_images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                index === currentSlide ? 'bg-white w-6' : 'bg-white/50'
              )}
            />
          ))}
        </div>
      </section>
    );
  }

  // Minimal Variant
  if (variant === 'minimal') {
    return (
      <section 
        className={cn('relative flex flex-col justify-center', heightClass)}
        style={getBackgroundStyle()}
      >
        {(settings.background_type === 'image' || settings.background_type === 'video') && (
          <div className="absolute inset-0 bg-black" style={{ opacity: settings.overlay_opacity }} />
        )}
        <div className="relative z-10 container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 
              className={cn('text-6xl md:text-8xl lg:text-9xl font-bold mb-8 tracking-tighter', textColorClass)}
              style={{ fontFamily: 'var(--landing-font-heading)' }}
            >
              {settings.title || barbershopData.name}
            </h1>
            {settings.subtitle && (
              <p className={cn('text-xl md:text-2xl mb-12 opacity-70 max-w-xl mx-auto', textColorClass)}>
                {settings.subtitle}
              </p>
            )}
            <Button
              size="lg"
              onClick={handleCTAClick}
              className="text-lg px-12 py-6"
              style={{ backgroundColor: 'var(--landing-accent)', borderRadius: 'var(--landing-radius)' }}
            >
              {settings.cta_primary_text}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Video Parallax Variant
  if (variant === 'video-parallax' && settings.background_type === 'video') {
    return (
      <section className={cn('relative flex flex-col justify-center overflow-hidden', heightClass)}>
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: `translateY(${parallaxOffset}px)` }}
        >
          <source src={settings.background_value} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black" style={{ opacity: settings.overlay_opacity }} />
        <div className={cn(
          'relative z-10 container mx-auto px-4 py-20 flex flex-col',
          textPositionClass
        )}>
          {settings.show_logo && barbershopData.logo_url && (
            <img
              src={barbershopData.logo_url}
              alt={barbershopData.name}
              className="h-16 md:h-20 w-auto mb-8 object-contain"
            />
          )}
          <h1 
            className={cn('text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight', textColorClass)}
            style={{ fontFamily: 'var(--landing-font-heading)' }}
          >
            {settings.title || barbershopData.name}
          </h1>
          {settings.subtitle && (
            <p className={cn('text-lg md:text-xl lg:text-2xl mb-8 max-w-2xl opacity-90', textColorClass)}>
              {settings.subtitle}
            </p>
          )}
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              onClick={handleCTAClick}
              className="text-lg px-8 py-6"
              style={{ backgroundColor: 'var(--landing-accent)', borderRadius: 'var(--landing-radius)' }}
            >
              {settings.cta_primary_text}
            </Button>
          </div>
        </div>
        {settings.show_scroll_indicator && (
          <button
            onClick={scrollToContent}
            className={cn('absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10', textColorClass)}
          >
            <ChevronDown className="h-8 w-8" />
          </button>
        )}
      </section>
    );
  }

  // Default Variant
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
        {settings.show_logo && barbershopData.logo_url && (
          <img
            src={barbershopData.logo_url}
            alt={barbershopData.name}
            className="h-16 md:h-20 w-auto mb-8 object-contain"
          />
        )}
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
        {settings.subtitle && (
          <p className={cn('text-lg md:text-xl lg:text-2xl mb-8 max-w-2xl opacity-90', textColorClass)}>
            {settings.subtitle}
          </p>
        )}
        <div className="flex flex-wrap gap-4">
          <Button
            size="lg"
            onClick={handleCTAClick}
            className="text-lg px-8 py-6"
            style={{ backgroundColor: 'var(--landing-accent)', borderRadius: 'var(--landing-radius)' }}
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

      {settings.show_scroll_indicator && (
        <button
          onClick={scrollToContent}
          className={cn('absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce', textColorClass)}
        >
          <ChevronDown className="h-8 w-8" />
        </button>
      )}
    </section>
  );
};