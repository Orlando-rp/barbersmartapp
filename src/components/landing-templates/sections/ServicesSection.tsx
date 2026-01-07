import React, { useState } from 'react';
import { SectionConfig, ServicesSettings, GlobalStyles, ServicesVariant } from '@/types/landing-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Clock, DollarSign, ChevronRight, Star } from 'lucide-react';

interface ServicesSectionProps {
  section: SectionConfig;
  globalStyles: GlobalStyles;
  services: any[];
  isPreview?: boolean;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  section,
  globalStyles,
  services,
  isPreview,
}) => {
  const settings = section.settings as ServicesSettings;
  const variant = section.variant as ServicesVariant;
  const [hoveredService, setHoveredService] = useState<string | null>(null);
  
  // Filter and limit services
  let displayServices = services;
  if (settings.categories_filter?.length > 0) {
    displayServices = services.filter(s => 
      settings.categories_filter.includes(s.category_id)
    );
  }
  displayServices = displayServices.slice(0, settings.max_items);

  const gridColsClass = 
    settings.columns === 2 ? 'md:grid-cols-2' :
    settings.columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3';

  const cardStyleClass = 
    settings.card_style === 'flat' ? '' :
    settings.card_style === 'bordered' ? 'border-2' : 'shadow-lg hover:shadow-xl transition-shadow';

  // Featured Variant - First service larger
  if (variant === 'featured' && displayServices.length > 1) {
    const [featuredService, ...restServices] = displayServices;
    return (
      <section 
        id="services"
        className="py-16 md:py-24"
        style={{ backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined }}
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

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Featured Service */}
            <Card 
              className={cn('overflow-hidden', cardStyleClass)}
              style={{ borderRadius: 'var(--landing-radius)' }}
            >
              {settings.show_images && featuredService.image_url && (
                <div className="aspect-video overflow-hidden">
                  <img
                    src={featuredService.image_url}
                    alt={featuredService.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span 
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ backgroundColor: 'var(--landing-accent)', color: 'white' }}
                  >
                    Destaque
                  </span>
                </div>
                <CardTitle className="text-2xl flex justify-between items-start">
                  <span>{featuredService.name}</span>
                  {settings.show_prices && (
                    <span className="text-2xl font-bold" style={{ color: 'var(--landing-accent)' }}>
                      R$ {featuredService.price?.toFixed(2)}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {settings.show_description && featuredService.description && (
                  <p className="text-muted-foreground mb-4">{featuredService.description}</p>
                )}
                {settings.show_duration && featuredService.duration && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{featuredService.duration} min</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rest Services Grid */}
            <div className="grid gap-4">
              {restServices.slice(0, 4).map((service) => (
                <Card 
                  key={service.id} 
                  className={cn('flex items-center p-4', cardStyleClass)}
                  style={{ borderRadius: 'var(--landing-radius)' }}
                >
                  {settings.show_images && service.image_url && (
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className="w-20 h-20 object-cover rounded-lg mr-4"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{service.name}</h3>
                    {settings.show_duration && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{service.duration} min
                      </span>
                    )}
                  </div>
                  {settings.show_prices && (
                    <span className="text-lg font-bold" style={{ color: 'var(--landing-accent)' }}>
                      R$ {service.price?.toFixed(2)}
                    </span>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Minimal Variant - Clean text list
  if (variant === 'minimal') {
    return (
      <section 
        id="services"
        className="py-16 md:py-24"
        style={{ backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined }}
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

          <div className="max-w-2xl mx-auto divide-y">
            {displayServices.map((service) => (
              <div 
                key={service.id}
                className="py-6 flex justify-between items-center group"
              >
                <div>
                  <h3 className="text-lg font-medium group-hover:text-primary transition-colors">
                    {service.name}
                  </h3>
                  {settings.show_duration && (
                    <span className="text-sm text-muted-foreground">
                      {service.duration} minutos
                    </span>
                  )}
                </div>
                {settings.show_prices && (
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold">
                      R$ {service.price?.toFixed(2)}
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Hover Cards Variant - Interactive reveal
  if (variant === 'hover-cards') {
    return (
      <section 
        id="services"
        className="py-16 md:py-24"
        style={{ backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined }}
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

          <div className={cn('grid gap-6', gridColsClass)}>
            {displayServices.map((service) => (
              <div 
                key={service.id}
                className="relative aspect-[4/3] overflow-hidden rounded-xl cursor-pointer group"
                onMouseEnter={() => setHoveredService(service.id)}
                onMouseLeave={() => setHoveredService(null)}
              >
                {/* Background Image or Gradient */}
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div 
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, hsl(var(--landing-primary)), hsl(var(--landing-secondary)))' }}
                  />
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <h3 className="text-white text-xl font-bold mb-2">{service.name}</h3>
                  
                  {/* Expanded content on hover */}
                  <div className={cn(
                    'overflow-hidden transition-all duration-300',
                    hoveredService === service.id ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                  )}>
                    {settings.show_description && service.description && (
                      <p className="text-white/80 text-sm mb-3 line-clamp-2">{service.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      {settings.show_duration && (
                        <span className="text-white/70 text-sm flex items-center gap-1">
                          <Clock className="h-4 w-4" />{service.duration} min
                        </span>
                      )}
                      {settings.show_prices && (
                        <span className="text-white text-lg font-bold">
                          R$ {service.price?.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price always visible when not hovered */}
                  {settings.show_prices && hoveredService !== service.id && (
                    <span className="text-white text-lg font-bold">
                      R$ {service.price?.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Pricing Table Variant
  if (variant === 'pricing-table') {
    return (
      <section 
        id="services"
        className="py-16 md:py-24"
        style={{ backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined }}
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

          <div className="max-w-4xl mx-auto overflow-hidden rounded-xl border">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-4 font-semibold">Serviço</th>
                  {settings.show_duration && <th className="text-center p-4 font-semibold">Duração</th>}
                  {settings.show_prices && <th className="text-right p-4 font-semibold">Preço</th>}
                </tr>
              </thead>
              <tbody>
                {displayServices.map((service, index) => (
                  <tr 
                    key={service.id}
                    className={cn(
                      'border-t hover:bg-muted/30 transition-colors',
                      index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                    )}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {settings.show_images && service.image_url && (
                          <img
                            src={service.image_url}
                            alt={service.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium">{service.name}</p>
                          {settings.show_description && service.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{service.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {settings.show_duration && (
                      <td className="text-center p-4 text-muted-foreground">
                        {service.duration} min
                      </td>
                    )}
                    {settings.show_prices && (
                      <td className="text-right p-4">
                        <span className="font-bold text-lg" style={{ color: 'var(--landing-accent)' }}>
                          R$ {service.price?.toFixed(2)}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }

  // Default variants (grid, list, carousel)
  return (
    <section 
      id="services"
      className="py-16 md:py-24"
      style={{ backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined }}
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

        {settings.layout === 'grid' && (
          <div className={cn('grid gap-6', gridColsClass)}>
            {displayServices.map((service) => (
              <Card 
                key={service.id} 
                className={cn(cardStyleClass)}
                style={{ borderRadius: 'var(--landing-radius)' }}
              >
                {settings.show_images && service.image_url && (
                  <div className="aspect-video overflow-hidden" style={{ borderTopLeftRadius: 'var(--landing-radius)', borderTopRightRadius: 'var(--landing-radius)' }}>
                    <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{service.name}</span>
                    {settings.show_prices && (
                      <span className="text-lg font-bold" style={{ color: 'var(--landing-accent)' }}>
                        R$ {service.price?.toFixed(2)}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                {(settings.show_description || settings.show_duration) && (
                  <CardContent>
                    {settings.show_description && service.description && (
                      <p className="text-muted-foreground text-sm mb-2">{service.description}</p>
                    )}
                    {settings.show_duration && service.duration && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" /><span>{service.duration} min</span>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {settings.layout === 'list' && (
          <div className="max-w-3xl mx-auto space-y-4">
            {displayServices.map((service) => (
              <div 
                key={service.id}
                className={cn(
                  'flex justify-between items-center p-4 rounded-lg',
                  settings.card_style === 'bordered' ? 'border-2' : 'bg-background/50'
                )}
                style={{ borderRadius: 'var(--landing-radius)' }}
              >
                <div className="flex items-center gap-4">
                  {settings.show_images && service.image_url && (
                    <img src={service.image_url} alt={service.name} className="w-16 h-16 object-cover rounded" />
                  )}
                  <div>
                    <h3 className="font-semibold">{service.name}</h3>
                    {settings.show_description && service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                    {settings.show_duration && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />{service.duration} min
                      </span>
                    )}
                  </div>
                </div>
                {settings.show_prices && (
                  <span className="text-xl font-bold" style={{ color: 'var(--landing-accent)' }}>
                    R$ {service.price?.toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {settings.layout === 'carousel' && (
          <div className="flex overflow-x-auto gap-4 md:gap-6 pb-4 snap-x snap-mandatory -mx-4 px-4">
            {displayServices.map((service) => (
              <Card 
                key={service.id} 
                className={cn('min-w-[240px] sm:min-w-[280px] max-w-[320px] snap-center flex-shrink-0', cardStyleClass)}
                style={{ borderRadius: 'var(--landing-radius)' }}
              >
                {settings.show_images && service.image_url && (
                  <div className="aspect-video overflow-hidden" style={{ borderTopLeftRadius: 'var(--landing-radius)', borderTopRightRadius: 'var(--landing-radius)' }}>
                    <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardHeader><CardTitle>{service.name}</CardTitle></CardHeader>
                <CardContent>
                  {settings.show_description && service.description && (
                    <p className="text-muted-foreground text-sm mb-2">{service.description}</p>
                  )}
                  <div className="flex justify-between items-center">
                    {settings.show_duration && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />{service.duration} min
                      </span>
                    )}
                    {settings.show_prices && (
                      <span className="text-lg font-bold" style={{ color: 'var(--landing-accent)' }}>
                        R$ {service.price?.toFixed(2)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};