import React from 'react';
import { SectionConfig, ReviewsSettings, GlobalStyles } from '@/types/landing-page';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReviewsSectionProps {
  section: SectionConfig;
  globalStyles: GlobalStyles;
  reviews: any[];
  isPreview?: boolean;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  section,
  globalStyles,
  reviews,
  isPreview,
}) => {
  const settings = section.settings as ReviewsSettings;
  
  // Filter by minimum rating and limit
  const displayReviews = reviews
    .filter(r => r.rating >= settings.min_rating)
    .slice(0, settings.max_items);

  if (displayReviews.length === 0) {
    return null;
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'h-4 w-4',
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <section 
      id="reviews"
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

        {/* Cards Layout */}
        {settings.layout === 'cards' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayReviews.map((review) => (
              <Card key={review.id} className="h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <Quote className="h-8 w-8 text-muted-foreground/30 mb-4" />
                  
                  <p className="flex-1 text-muted-foreground mb-4 italic">
                    "{review.comment}"
                  </p>

                  <div className="flex items-center gap-3 pt-4 border-t">
                    {settings.show_photos && (
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(review.clients?.name || 'Cliente')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className="flex-1">
                      <p className="font-medium">
                        {review.clients?.preferred_name || review.clients?.name || 'Cliente'}
                      </p>
                      {settings.show_date && review.created_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), "d 'de' MMMM", { locale: ptBR })}
                        </p>
                      )}
                    </div>

                    {renderStars(review.rating)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Slider Layout */}
        {settings.layout === 'slider' && (
          <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory">
            {displayReviews.map((review) => (
              <Card 
                key={review.id} 
                className="min-w-[300px] max-w-[400px] snap-center flex-shrink-0"
              >
                <CardContent className="p-6">
                  {renderStars(review.rating)}
                  
                  <p className="text-muted-foreground my-4 italic">
                    "{review.comment}"
                  </p>

                  <div className="flex items-center gap-3 pt-4 border-t">
                    {settings.show_photos && (
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(review.clients?.name || 'Cliente')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div>
                      <p className="font-medium">
                        {review.clients?.preferred_name || review.clients?.name || 'Cliente'}
                      </p>
                      {settings.show_date && review.created_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), "d 'de' MMMM", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* List Layout */}
        {settings.layout === 'list' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {displayReviews.map((review) => (
              <div 
                key={review.id}
                className="flex gap-4 p-6 rounded-lg bg-background/50"
              >
                {settings.show_photos && (
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback>
                      {getInitials(review.clients?.name || 'Cliente')}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium">
                      {review.clients?.preferred_name || review.clients?.name || 'Cliente'}
                    </p>
                    {renderStars(review.rating)}
                    {settings.show_date && review.created_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), "d 'de' MMMM", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-muted-foreground italic">
                    "{review.comment}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
