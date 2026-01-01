import React from 'react';
import { GlobalStyles, FooterSettings, FooterVariant, FooterTheme } from '@/types/landing-page';
import { Instagram, Phone, MapPin, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FooterSectionProps {
  globalStyles: GlobalStyles;
  footerSettings?: FooterSettings;
  barbershopData: {
    name: string;
    logo_url?: string;
    logo_light_url?: string;
    logo_dark_url?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    instagram?: string;
    email?: string;
  };
  bookingUrl: string;
  isPreview?: boolean;
}

// Default footer settings
const defaultFooterSettings: FooterSettings = {
  variant: 'complete',
  theme: 'dark',
  show_logo: true,
  tagline: 'Qualidade e estilo em cada corte.',
  show_contact: true,
  show_social: true,
  show_booking_button: true,
  show_privacy_link: true,
  show_terms_link: true,
  powered_by_text: 'Barber Smart',
  show_powered_by: true,
  custom_links: [],
};

// Helper to convert HSL string to luminance for contrast detection
const getHslLuminance = (hslString: string): number => {
  try {
    const parts = hslString.trim().split(/\s+/);
    if (parts.length >= 3) {
      const l = parseFloat(parts[2].replace('%', ''));
      return l / 100;
    }
    return 0.5;
  } catch {
    return 0.5;
  }
};

// Helper to determine if background is dark based on HSL luminance
const isBackgroundDark = (hslString: string): boolean => {
  const luminance = getHslLuminance(hslString);
  return luminance < 0.5;
};

// Helper to get the appropriate logo based on background brightness
const getLogoForBackground = (
  barbershopData: FooterSectionProps['barbershopData'],
  isDarkBackground: boolean
): string | undefined => {
  if (isDarkBackground) {
    return barbershopData.logo_dark_url || barbershopData.logo_url;
  }
  return barbershopData.logo_light_url || barbershopData.logo_url;
};

export const FooterSection: React.FC<FooterSectionProps> = ({
  globalStyles,
  footerSettings,
  barbershopData,
  bookingUrl,
  isPreview,
}) => {
  const settings = { ...defaultFooterSettings, ...footerSettings };
  const variant = settings.variant || 'complete';
  const theme = settings.theme || 'dark';

  // Determine background color based on theme
  const getBackgroundColor = (): string => {
    if (settings.background_color) {
      return `hsl(${settings.background_color})`;
    }
    if (theme === 'light') {
      return `hsl(${globalStyles.background_color})`;
    }
    return `hsl(${globalStyles.secondary_color})`;
  };

  const backgroundColor = getBackgroundColor();

  // Auto-detect if background is dark based on theme or custom color
  const isDarkBackground = (() => {
    if (theme === 'auto') {
      const colorToCheck = settings.background_color || globalStyles.secondary_color;
      return isBackgroundDark(colorToCheck);
    }
    return theme === 'dark';
  })();

  const logoUrl = settings.show_logo ? getLogoForBackground(barbershopData, isDarkBackground) : null;
  const currentYear = new Date().getFullYear();

  const handleBookingClick = () => {
    if (isPreview) return;
    window.location.href = bookingUrl;
  };

  // Text color classes based on theme
  const textPrimary = isDarkBackground ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkBackground ? 'text-white/70' : 'text-gray-600';
  const textMuted = isDarkBackground ? 'text-white/50' : 'text-gray-400';
  const textHighlight = isDarkBackground ? 'text-white/70' : 'text-gray-700';
  const borderColor = isDarkBackground ? 'border-white/10' : 'border-gray-200';
  const hoverText = isDarkBackground ? 'hover:text-white' : 'hover:text-gray-900';

  // Minimal variant - single line footer
  if (variant === 'minimal') {
    return (
      <footer 
        className="py-6 px-4"
        style={{ backgroundColor }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {logoUrl && (
                <img 
                  src={logoUrl} 
                  alt={barbershopData.name}
                  className="h-8 w-auto object-contain"
                />
              )}
              <span className={cn(textSecondary, 'text-sm')}>
                © {currentYear} {barbershopData.name}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-sm">
              {settings.show_privacy_link && (
                <a href="/privacy" className={cn(textMuted, hoverText, 'transition-colors')}>
                  Privacidade
                </a>
              )}
              {settings.show_terms_link && (
                <a href="/terms" className={cn(textMuted, hoverText, 'transition-colors')}>
                  Termos
                </a>
              )}
              {settings.show_social && barbershopData.instagram && (
                <a 
                  href={`https://instagram.com/${barbershopData.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(textMuted, hoverText, 'transition-colors')}
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Centered variant - all content centered
  if (variant === 'centered') {
    return (
      <footer 
        className="py-12 px-4"
        style={{ backgroundColor }}
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo and Brand */}
          <div className="mb-6">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={barbershopData.name}
                className="h-14 w-auto object-contain mx-auto mb-4"
              />
            ) : settings.show_logo && (
              <h3 
                className={cn('text-2xl font-bold mb-4', textPrimary)}
                style={{ fontFamily: 'var(--landing-font-heading)' }}
              >
                {barbershopData.name}
              </h3>
            )}
            {settings.tagline && (
              <p className={cn(textSecondary, 'text-sm max-w-md mx-auto')}>
                {settings.tagline}
              </p>
            )}
          </div>

          {/* Contact and Social Icons */}
          {(settings.show_contact || settings.show_social) && (
            <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
              {settings.show_contact && barbershopData.phone && (
                <a 
                  href={`tel:${barbershopData.phone}`}
                  className={cn('flex items-center gap-2 text-sm', textSecondary, hoverText, 'transition-colors')}
                >
                  <Phone className="h-4 w-4" />
                  {barbershopData.phone}
                </a>
              )}
              {settings.show_contact && barbershopData.email && (
                <a 
                  href={`mailto:${barbershopData.email}`}
                  className={cn('flex items-center gap-2 text-sm', textSecondary, hoverText, 'transition-colors')}
                >
                  <Mail className="h-4 w-4" />
                  {barbershopData.email}
                </a>
              )}
              {settings.show_social && barbershopData.instagram && (
                <a 
                  href={`https://instagram.com/${barbershopData.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn('flex items-center gap-2 text-sm', textSecondary, hoverText, 'transition-colors')}
                >
                  <Instagram className="h-4 w-4" />
                  {barbershopData.instagram}
                </a>
              )}
            </div>
          )}

          {/* Booking Button */}
          {settings.show_booking_button && (
            <button
              onClick={handleBookingClick}
              className="inline-block px-6 py-2 mb-6 rounded-full text-sm font-medium transition-colors text-white"
              style={{ backgroundColor: `hsl(${globalStyles.accent_color})` }}
            >
              Agendar Horário
            </button>
          )}

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6 text-sm">
            {settings.custom_links.map((link, index) => (
              <a 
                key={index}
                href={link.url}
                className={cn(textMuted, hoverText, 'transition-colors')}
                target={link.url.startsWith('http') ? '_blank' : undefined}
                rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {link.label}
              </a>
            ))}
            {settings.show_privacy_link && (
              <a href="/privacy" className={cn(textMuted, hoverText, 'transition-colors')}>
                Política de Privacidade
              </a>
            )}
            {settings.show_terms_link && (
              <a href="/terms" className={cn(textMuted, hoverText, 'transition-colors')}>
                Termos de Serviço
              </a>
            )}
          </div>

          {/* Bottom Bar */}
          <div className={cn('pt-6 border-t', borderColor)}>
            <p className={cn(textMuted, 'text-sm')}>
              © {currentYear} {barbershopData.name}. Todos os direitos reservados.
            </p>
            {settings.show_powered_by && settings.powered_by_text && (
              <p className={cn(textMuted, 'text-xs mt-2')}>
                Powered by <span className={cn('font-semibold', textHighlight)}>{settings.powered_by_text}</span>
              </p>
            )}
          </div>
        </div>
      </footer>
    );
  }

  // Complete variant (default) - full 3-column layout
  return (
    <footer 
      className="py-12 px-4"
      style={{ backgroundColor }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Logo and Brand */}
          <div className="flex flex-col items-center md:items-start">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={barbershopData.name}
                className="h-12 w-auto object-contain mb-4"
              />
            ) : settings.show_logo ? (
              <h3 
                className={cn('text-xl font-bold mb-4', textPrimary)}
                style={{ fontFamily: 'var(--landing-font-heading)' }}
              >
                {barbershopData.name}
              </h3>
            ) : null}
            {settings.tagline && (
              <p className={cn(textSecondary, 'text-sm text-center md:text-left')}>
                {settings.tagline}
              </p>
            )}
          </div>

          {/* Contact Info */}
          {settings.show_contact && (
            <div className="flex flex-col items-center md:items-start">
              <h4 className={cn(textPrimary, 'font-semibold mb-4')}>Contato</h4>
              <div className="space-y-2">
                {barbershopData.phone && (
                  <a 
                    href={`tel:${barbershopData.phone}`}
                    className={cn('flex items-center gap-2 text-sm', textSecondary, hoverText, 'transition-colors')}
                  >
                    <Phone className="h-4 w-4" />
                    {barbershopData.phone}
                  </a>
                )}
                {barbershopData.email && (
                  <a 
                    href={`mailto:${barbershopData.email}`}
                    className={cn('flex items-center gap-2 text-sm', textSecondary, hoverText, 'transition-colors')}
                  >
                    <Mail className="h-4 w-4" />
                    {barbershopData.email}
                  </a>
                )}
                {barbershopData.address && (
                  <div className={cn('flex items-center gap-2 text-sm', textSecondary)}>
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {barbershopData.address}
                      {barbershopData.city && `, ${barbershopData.city}`}
                      {barbershopData.state && ` - ${barbershopData.state}`}
                    </span>
                  </div>
                )}
                {settings.show_social && barbershopData.instagram && (
                  <a 
                    href={`https://instagram.com/${barbershopData.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn('flex items-center gap-2 text-sm', textSecondary, hoverText, 'transition-colors')}
                  >
                    <Instagram className="h-4 w-4" />
                    {barbershopData.instagram}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className={cn(textPrimary, 'font-semibold mb-4')}>Links</h4>
            <div className="space-y-2">
              {settings.show_booking_button && (
                <button
                  onClick={handleBookingClick}
                  className={cn(textSecondary, hoverText, 'transition-colors text-sm block')}
                >
                  Agendar Horário
                </button>
              )}
              {settings.custom_links.map((link, index) => (
                <a 
                  key={index}
                  href={link.url}
                  className={cn('block text-sm', textSecondary, hoverText, 'transition-colors')}
                  target={link.url.startsWith('http') ? '_blank' : undefined}
                  rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {link.label}
                </a>
              ))}
              {settings.show_privacy_link && (
                <a 
                  href="/privacy" 
                  className={cn('block text-sm', textSecondary, hoverText, 'transition-colors')}
                >
                  Política de Privacidade
                </a>
              )}
              {settings.show_terms_link && (
                <a 
                  href="/terms" 
                  className={cn('block text-sm', textSecondary, hoverText, 'transition-colors')}
                >
                  Termos de Serviço
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={cn('pt-8 border-t', borderColor)}>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className={cn(textMuted, 'text-sm')}>
              © {currentYear} {barbershopData.name}. Todos os direitos reservados.
            </p>
            {settings.show_powered_by && settings.powered_by_text && (
              <p className={cn(textMuted, 'text-sm')}>
                Powered by <span className={cn('font-semibold', textHighlight)}>{settings.powered_by_text}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
