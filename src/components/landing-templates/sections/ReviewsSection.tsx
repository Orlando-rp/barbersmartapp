import React, { useEffect, useState } from 'react';
import { SectionConfig, ReviewsSettings, GlobalStyles, ReviewsVariant } from '@/types/landing-page';
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
  const variant = section.variant as ReviewsVariant;
  const [marqueePosition, setMarqueePosition] = useState(0);
  
  // Filter by minimum rating and limit
  const displayReviews = reviews
    .filter(r => r.rating >= settings.min_rating)
    .slice(0, settings.max_items);

  // Marquee animation
  useEffect(() => {
    if (variant === 'marquee' && !isPreview) {
      const interval = setInterval(() => {
        setMarqueePosition(prev => prev - 1);
      }, 30);
      return () => clearInterval(interval);
    }
  }, [variant, isPreview]);

  if (displayReviews.length === 0) {
    return null;
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'sm') => {
    const sizeClass = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(sizeClass, star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')}
          />
        ))}
      </div>
    );
  };

  // Featured Variant - Large featured review
  if (variant === 'featured' && displayReviews.length > 1) {
    const [featuredReview, ...restReviews] = displayReviews;
    return (
      <section 
        id="reviews"
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

          <div className="max-w-5xl mx-auto">
            {/* Featured Review */}
            <Card className="mb-8 overflow-hidden">
              <CardContent className="p-8 md:p-12 text-center">
                <Quote className="h-12 w-12 mx-auto text-muted-foreground/20 mb-6" />
                <p className="text-xl md:text-2xl text-foreground mb-6 italic leading-relaxed">
                  "{featuredReview.comment}"
                </p>
                <div className="flex flex-col items-center gap-3">
                  {renderStars(featuredReview.rating, 'lg')}
                  {settings.show_photos && (
                    <Avatar className="h-16 w-16 mt-2">
                      <AvatarFallback className="text-lg">
                        {getInitials(featuredReview.clients?.name || 'Cliente')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div>
                    <p className="font-semibold text-lg">
                      {featuredReview.clients?.preferred_name || featuredReview.clients?.name || 'Cliente'}
                    </p>
                    {settings.show_date && featuredReview.created_at && (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(featuredReview.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Other Reviews */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {restReviews.map((review) => (
                <Card key={review.id} className="h-full">
                  <CardContent className="p-6">
                    {renderStars(review.rating)}
                    <p className="text-muted-foreground my-3 italic text-sm line-clamp-3">
                      "{review.comment}"
                    </p>
                    <p className="font-medium text-sm">
                      {review.clients?.preferred_name || review.clients?.name || 'Cliente'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Marquee Variant - Infinite scrolling
  if (variant === 'marquee') {
    const duplicatedReviews = [...displayReviews, ...displayReviews, ...displayReviews];
    return (
      <section 
        id="reviews"
        className="py-16 md:py-24 overflow-hidden"
        style={{ backgroundColor: settings.background_color ? `hsl(${settings.background_color})` : undefined }}
      >
        <div className="container mx-auto px-4 mb-12">
          {section.title && (
            <h2 
              className="text-3xl md:text-4xl font-bold text-center"
              style={{ fontFamily: 'var(--landing-font-heading)' }}
            >
              {section.title}
            </h2>
          )}
        </div>

        <div className="relative">
          <div 
            className="flex gap-6 transition-transform"
            style={{ 
              transform: `translateX(${marqueePosition}px)`,
              width: `${duplicatedReviews.length * 350}px`
            }}
          >
            {duplicatedReviews.map((review, index) => (
              <Card 
                key={`${review.id}-${index}`} 
                className="w-[320px] flex-shrink-0"
              >
                <CardContent className="p-6">
                  {renderStars(review.rating)}
                  <p className="text-muted-foreground my-4 italic line-clamp-3">
                    "{review.comment}"
                  </p>
                  <div className="flex items-center gap-3">
                    {settings.show_photos && (
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(review.clients?.name || 'Cliente')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="font-medium text-sm">
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

          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
      </section>
    );
  }

  // Testimonial Wall Variant
  if (variant === 'testimonial-wall') {
    return (
      <section 
        id="reviews"
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

          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            {displayReviews.map((review) => (
              <Card 
                key={review.id} 
                className="break-inside-avoid mb-4"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    {settings.show_photos && (
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarFallback>
                          {getInitials(review.clients?.name || 'Cliente')}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="font-semibold">
                        {review.clients?.preferred_name || review.clients?.name || 'Cliente'}
                      </p>
                      {settings.show_date && review.created_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      )}
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <p className="text-muted-foreground italic">
                    "{review.comment}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Quote Highlight Variant
  if (variant === 'quote-highlight') {
    return (
      <section 
        id="reviews"
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

          <div className="max-w-4xl mx-auto space-y-12">
            {displayReviews.map((review, index) => (
              <div 
                key={review.id}
                className={cn(
                  'flex flex-col md:flex-row gap-6 items-center',
                  index % 2 === 1 ? 'md:flex-row-reverse' : ''
                )}
              >
                {/* Large Quote */}
                <div className="flex-1">
                  <Quote 
                    className="h-10 w-10 mb-4"
                    style={{ color: 'var(--landing-accent)' }}
                  />
                  <blockquote className="text-xl md:text-2xl font-medium leading-relaxed mb-4">
                    {review.comment}
                  </blockquote>
                  {renderStars(review.rating, 'md')}
                </div>

                {/* Author */}
                <div className="flex flex-col items-center text-center md:w-48">
                  {settings.show_photos && (
                    <Avatar className="h-20 w-20 mb-3">
                      <AvatarFallback className="text-xl">
                        {getInitials(review.clients?.name || 'Cliente')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <p className="font-semibold">
                    {review.clients?.preferred_name || review.clients?.name || 'Cliente'}
                  </p>
                  {settings.show_date && review.created_at && (
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(review.created_at), "MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Default variants (cards, slider, list)
  return (
    <section 
      id="reviews"
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

        {/* Cards Layout */}
        {settings.layout === 'cards' && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayReviews.map((review) => (
              <Card key={review.id} className="h-full">
                <CardContent className="p-6 flex flex-col h-full">
                  <Quote className="h-8 w-8 text-muted-foreground/30 mb-4" />
                  <p className="flex-1 text-muted-foreground mb-4 italic">"{review.comment}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t">
                    {settings.show_photos && (
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(review.clients?.name || 'Cliente')}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{review.clients?.preferred_name || review.clients?.name || 'Cliente'}</p>
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
              <Card key={review.id} className="min-w-[300px] max-w-[400px] snap-center flex-shrink-0">
                <CardContent className="p-6">
                  {renderStars(review.rating)}
                  <p className="text-muted-foreground my-4 italic">"{review.comment}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t">
                    {settings.show_photos && (
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{getInitials(review.clients?.name || 'Cliente')}</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <p className="font-medium">{review.clients?.preferred_name || review.clients?.name || 'Cliente'}</p>
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
              <div key={review.id} className="flex gap-4 p-6 rounded-lg bg-background/50">
                {settings.show_photos && (
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback>{getInitials(review.clients?.name || 'Cliente')}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium">{review.clients?.preferred_name || review.clients?.name || 'Cliente'}</p>
                    {renderStars(review.rating)}
                    {settings.show_date && review.created_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), "d 'de' MMMM", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground italic">"{review.comment}"</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
