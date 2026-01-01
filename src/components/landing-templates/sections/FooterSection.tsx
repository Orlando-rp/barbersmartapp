import React from 'react';
import { GlobalStyles } from '@/types/landing-page';
import { cn } from '@/lib/utils';
import { Instagram, Phone, MapPin } from 'lucide-react';

interface FooterSectionProps {
  globalStyles: GlobalStyles;
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
  };
  bookingUrl: string;
  isPreview?: boolean;
}

// Helper to get the appropriate logo based on background brightness
// logo_light_url = logo for light backgrounds (dark-colored logo)
// logo_dark_url = logo for dark backgrounds (light-colored logo)
const getLogoForBackground = (
  barbershopData: FooterSectionProps['barbershopData'],
  isDarkBackground: boolean
): string | undefined => {
  if (isDarkBackground) {
    // Dark background needs light-colored logo
    return barbershopData.logo_dark_url || barbershopData.logo_url;
  }
  // Light background needs dark-colored logo
  return barbershopData.logo_light_url || barbershopData.logo_url;
};

export const FooterSection: React.FC<FooterSectionProps> = ({
  globalStyles,
  barbershopData,
  bookingUrl,
  isPreview,
}) => {
  // Footer uses secondary color as background, which is typically dark
  const isDarkBackground = true; // Footer typically uses dark background
  const logoUrl = getLogoForBackground(barbershopData, isDarkBackground);

  const currentYear = new Date().getFullYear();

  const handleBookingClick = () => {
    if (isPreview) return;
    window.location.href = bookingUrl;
  };

  return (
    <footer 
      className="py-12 px-4"
      style={{ 
        backgroundColor: `hsl(${globalStyles.secondary_color})`,
      }}
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
            ) : (
              <h3 
                className="text-xl font-bold text-white mb-4"
                style={{ fontFamily: 'var(--landing-font-heading)' }}
              >
                {barbershopData.name}
              </h3>
            )}
            <p className="text-white/70 text-sm text-center md:text-left">
              Qualidade e estilo em cada corte.
            </p>
          </div>

          {/* Contact Info */}
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
              {barbershopData.instagram && (
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

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className="text-white font-semibold mb-4">Links</h4>
            <div className="space-y-2">
              <button
                onClick={handleBookingClick}
                className="text-white/70 hover:text-white transition-colors text-sm"
              >
                Agendar Horário
              </button>
              <a 
                href="/privacy" 
                className="block text-white/70 hover:text-white transition-colors text-sm"
              >
                Política de Privacidade
              </a>
              <a 
                href="/terms" 
                className="block text-white/70 hover:text-white transition-colors text-sm"
              >
                Termos de Serviço
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/50 text-sm">
              © {currentYear} {barbershopData.name}. Todos os direitos reservados.
            </p>
            <p className="text-white/50 text-sm">
              Powered by <span className="font-semibold text-white/70">Barber Smart</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
