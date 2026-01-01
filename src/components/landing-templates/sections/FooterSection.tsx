import React from 'react';
import { GlobalStyles, FooterSettings } from '@/types/landing-page';
import { Instagram, Phone, MapPin, Facebook, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

// Helper to get the appropriate logo based on background brightness
// logo_dark_url = logo for dark backgrounds (light-colored logo)
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
  const isDarkBackground = true; // Footer typically uses dark background
  const logoUrl = settings.show_logo ? getLogoForBackground(barbershopData, isDarkBackground) : null;

  const currentYear = new Date().getFullYear();

  const handleBookingClick = () => {
    if (isPreview) return;
    window.location.href = bookingUrl;
  };

  const backgroundColor = settings.background_color 
    ? `hsl(${settings.background_color})`
    : `hsl(${globalStyles.secondary_color})`;

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
                className="text-xl font-bold text-white mb-4"
                style={{ fontFamily: 'var(--landing-font-heading)' }}
              >
                {barbershopData.name}
              </h3>
            ) : null}
            {settings.tagline && (
              <p className="text-white/70 text-sm text-center md:text-left">
                {settings.tagline}
              </p>
            )}
          </div>

          {/* Contact Info */}
          {settings.show_contact && (
            <div className="flex flex-col items-center md:items-start">
              <h4 className="text-white font-semibold mb-4">Contato</h4>
              <div className="space-y-2">
                {barbershopData.phone && (
                  <a 
                    href={`tel:${barbershopData.phone}`}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
                  >
                    <Phone className="h-4 w-4" />
                    {barbershopData.phone}
                  </a>
                )}
                {barbershopData.email && (
                  <a 
                    href={`mailto:${barbershopData.email}`}
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
                  >
                    <Mail className="h-4 w-4" />
                    {barbershopData.email}
                  </a>
                )}
                {barbershopData.address && (
                  <div className="flex items-center gap-2 text-white/70 text-sm">
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
                    className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm"
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
            <h4 className="text-white font-semibold mb-4">Links</h4>
            <div className="space-y-2">
              {settings.show_booking_button && (
                <button
                  onClick={handleBookingClick}
                  className="text-white/70 hover:text-white transition-colors text-sm block"
                >
                  Agendar Horário
                </button>
              )}
              {settings.custom_links.map((link, index) => (
                <a 
                  key={index}
                  href={link.url}
                  className="block text-white/70 hover:text-white transition-colors text-sm"
                  target={link.url.startsWith('http') ? '_blank' : undefined}
                  rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {link.label}
                </a>
              ))}
              {settings.show_privacy_link && (
                <a 
                  href="/privacy" 
                  className="block text-white/70 hover:text-white transition-colors text-sm"
                >
                  Política de Privacidade
                </a>
              )}
              {settings.show_terms_link && (
                <a 
                  href="/terms" 
                  className="block text-white/70 hover:text-white transition-colors text-sm"
                >
                  Termos de Serviço
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/50 text-sm">
              © {currentYear} {barbershopData.name}. Todos os direitos reservados.
            </p>
            {settings.show_powered_by && settings.powered_by_text && (
              <p className="text-white/50 text-sm">
                Powered by <span className="font-semibold text-white/70">{settings.powered_by_text}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
