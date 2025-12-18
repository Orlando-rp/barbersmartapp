import React from 'react';
import { SectionConfig, LocationSettings, GlobalStyles } from '@/types/landing-page';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Phone, Clock, Instagram, Facebook, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationSectionProps {
  section: SectionConfig;
  globalStyles: GlobalStyles;
  barbershopData: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    email?: string;
    instagram?: string;
    facebook?: string;
    latitude?: number;
    longitude?: number;
  };
  businessHours: any[];
  isPreview?: boolean;
}

const dayNames: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

export const LocationSection: React.FC<LocationSectionProps> = ({
  section,
  globalStyles,
  barbershopData,
  businessHours,
  isPreview,
}) => {
  const settings = section.settings as LocationSettings;

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const getMapUrl = () => {
    if (barbershopData.latitude && barbershopData.longitude) {
      const style = settings.map_style === 'dark' 
        ? '&style=feature:all|element:labels|visibility:on&style=feature:all|element:geometry|color:0x242f3e' 
        : '';
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${barbershopData.latitude},${barbershopData.longitude}&zoom=15${style}`;
    }
    if (barbershopData.address && barbershopData.city) {
      const address = encodeURIComponent(`${barbershopData.address}, ${barbershopData.city}, ${barbershopData.state || ''}`);
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${address}&zoom=15`;
    }
    return null;
  };

  // Sort business hours by day
  const sortedHours = [...businessHours].sort((a, b) => a.day_of_week - b.day_of_week);

  return (
    <section 
      id="location"
      className="py-16 md:py-24"
      style={{ 
        backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined 
      }}
    >
      <div className="container mx-auto px-4">
        {section.title && (
          <h2 
            className="text-3xl md:text-4xl font-bold text-center mb-12"
            style={{ fontFamily: 'var(--landing-font-heading)' }}
          >
            {section.title}
          </h2>
        )}

        <div className={cn(
          'grid gap-8',
          settings.show_map ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto'
        )}>
          {/* Map */}
          {settings.show_map && getMapUrl() && (
            <div className="aspect-video lg:aspect-auto lg:h-full min-h-[300px] rounded-lg overflow-hidden">
              <iframe
                src={getMapUrl()!}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}

          {/* Info */}
          <div className="space-y-6">
            {/* Contact Info */}
            {settings.show_contact && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-lg mb-4">Contato</h3>
                  
                  {(barbershopData.address || barbershopData.city) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        {barbershopData.address && <p>{barbershopData.address}</p>}
                        {barbershopData.city && (
                          <p className="text-muted-foreground">
                            {barbershopData.city}{barbershopData.state ? `, ${barbershopData.state}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {barbershopData.phone && (
                    <a 
                      href={`tel:${barbershopData.phone}`}
                      className="flex items-center gap-3 hover:text-primary transition-colors"
                    >
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span>{formatPhone(barbershopData.phone)}</span>
                    </a>
                  )}

                  {barbershopData.email && (
                    <a 
                      href={`mailto:${barbershopData.email}`}
                      className="flex items-center gap-3 hover:text-primary transition-colors"
                    >
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <span>{barbershopData.email}</span>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Business Hours */}
            {settings.show_hours && sortedHours.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Horário de Funcionamento
                  </h3>
                  
                  <div className="space-y-2">
                    {sortedHours.map((hours) => (
                      <div 
                        key={hours.day_of_week}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {dayNames[hours.day_of_week]}
                        </span>
                        <span className="font-medium">
                          {hours.is_closed 
                            ? 'Fechado' 
                            : `${hours.open_time?.slice(0, 5)} - ${hours.close_time?.slice(0, 5)}`
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Social Links */}
            {settings.show_social && (barbershopData.instagram || barbershopData.facebook) && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">Redes Sociais</h3>
                  
                  <div className="flex gap-4">
                    {barbershopData.instagram && (
                      <a
                        href={`https://instagram.com/${barbershopData.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Instagram className="h-6 w-6" />
                        <span>@{barbershopData.instagram.replace('@', '')}</span>
                      </a>
                    )}

                    {barbershopData.facebook && (
                      <a
                        href={`https://facebook.com/${barbershopData.facebook}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Facebook className="h-6 w-6" />
                        <span>Facebook</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
