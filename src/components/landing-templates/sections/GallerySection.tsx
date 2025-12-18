import React, { useState } from 'react';
import { SectionConfig, GallerySettings, GlobalStyles, ImageConfig } from '@/types/landing-page';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GallerySectionProps {
  section: SectionConfig;
  globalStyles: GlobalStyles;
  isPreview?: boolean;
}

export const GallerySection: React.FC<GallerySectionProps> = ({
  section,
  globalStyles,
  isPreview,
}) => {
  const settings = section.settings as GallerySettings;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = settings.images?.slice(0, settings.max_images) || [];

  if (images.length === 0) {
    return null;
  }

  const gridColsClass = 
    settings.columns === 2 ? 'md:grid-cols-2' :
    settings.columns === 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2 lg:grid-cols-3';

  const openLightbox = (index: number) => {
    if (settings.show_lightbox && !isPreview) {
      setCurrentIndex(index);
      setLightboxOpen(true);
    }
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <section 
      id="gallery"
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

        {/* Masonry Layout */}
        {settings.layout === 'masonry' && (
          <div className={cn('columns-1 gap-4', gridColsClass.replace('grid-cols', 'columns'))}>
            {images.map((image, index) => (
              <div
                key={image.id}
                className="break-inside-avoid mb-4 cursor-pointer group overflow-hidden rounded-lg"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={image.thumbnail_url || image.url}
                  alt={image.alt}
                  className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Grid Layout */}
        {settings.layout === 'grid' && (
          <div className={cn('grid gap-4', gridColsClass)}>
            {images.map((image, index) => (
              <div
                key={image.id}
                className="aspect-square cursor-pointer group overflow-hidden rounded-lg"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={image.thumbnail_url || image.url}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Instagram Layout */}
        {settings.layout === 'instagram' && (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="aspect-square cursor-pointer group overflow-hidden"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={image.thumbnail_url || image.url}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Slider Layout */}
        {settings.layout === 'slider' && (
          <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="min-w-[300px] max-w-[400px] aspect-[4/3] cursor-pointer group overflow-hidden rounded-lg snap-center flex-shrink-0"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={image.thumbnail_url || image.url}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Lightbox */}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-5xl p-0 bg-black/95 border-none">
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={prevImage}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>

              {images[currentIndex] && (
                <img
                  src={images[currentIndex].url}
                  alt={images[currentIndex].alt}
                  className="max-h-[80vh] max-w-full object-contain"
                />
              )}

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                onClick={nextImage}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                {currentIndex + 1} / {images.length}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};
