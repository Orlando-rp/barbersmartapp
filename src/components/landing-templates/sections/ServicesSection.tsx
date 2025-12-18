import React from 'react';
import { SectionConfig, ServicesSettings, GlobalStyles } from '@/types/landing-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Clock, DollarSign } from 'lucide-react';

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

  return (
    <section 
      id="services"
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
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
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
                      <p className="text-muted-foreground text-sm mb-2">
                        {service.description}
                      </p>
                    )}
                    {settings.show_duration && service.duration && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{service.duration} min</span>
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
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{service.name}</h3>
                    {settings.show_description && service.description && (
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                    )}
                    {settings.show_duration && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {service.duration} min
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
          <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory">
            {displayServices.map((service) => (
              <Card 
                key={service.id} 
                className={cn('min-w-[280px] max-w-[320px] snap-center flex-shrink-0', cardStyleClass)}
                style={{ borderRadius: 'var(--landing-radius)' }}
              >
                {settings.show_images && service.image_url && (
                  <div className="aspect-video overflow-hidden" style={{ borderTopLeftRadius: 'var(--landing-radius)', borderTopRightRadius: 'var(--landing-radius)' }}>
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{service.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {settings.show_description && service.description && (
                    <p className="text-muted-foreground text-sm mb-2">
                      {service.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    {settings.show_duration && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {service.duration} min
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
