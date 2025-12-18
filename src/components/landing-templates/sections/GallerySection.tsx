import React, { useState, useRef } from 'react';
import { SectionConfig, GallerySettings, GlobalStyles, ImageConfig, GalleryVariant } from '@/types/landing-page';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ArrowLeftRight } from 'lucide-react';
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
  const variant = section.variant as GalleryVariant;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [comparePosition, setComparePosition] = useState(50);
  const compareRef = useRef<HTMLDivElement>(null);

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

  // Handle comparison slider
  const handleCompareMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!compareRef.current) return;
    const rect = compareRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setComparePosition(Math.min(100, Math.max(0, x)));
  };

  // Featured Variant - First image larger
  if (variant === 'featured' && images.length > 1) {
    const [featuredImage, ...restImages] = images;
    return (
      <section 
        id="gallery"
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

          <div className="grid md:grid-cols-2 gap-4">
            {/* Featured Large Image */}
            <div
              className="aspect-[4/3] cursor-pointer group overflow-hidden rounded-lg md:row-span-2"
              onClick={() => openLightbox(0)}
            >
              <img
                src={featuredImage.thumbnail_url || featuredImage.url}
                alt={featuredImage.alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>

            {/* Smaller Grid Images */}
            <div className="grid grid-cols-2 gap-4">
              {restImages.slice(0, 4).map((image, index) => (
                <div
                  key={image.id}
                  className="aspect-square cursor-pointer group overflow-hidden rounded-lg"
                  onClick={() => openLightbox(index + 1)}
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
          </div>
        </div>

        {/* Lightbox */}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-5xl p-0 bg-black/95 border-none">
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20" onClick={prevImage}>
                <ChevronLeft className="h-8 w-8" />
              </Button>
              {images[currentIndex] && (
                <img src={images[currentIndex].url} alt={images[currentIndex].alt} className="max-h-[80vh] max-w-full object-contain" />
              )}
              <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20" onClick={nextImage}>
                <ChevronRight className="h-8 w-8" />
              </Button>
              <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={() => setLightboxOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                {currentIndex + 1} / {images.length}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    );
  }

  // Before-After Comparison Variant
  if (variant === 'before-after' && images.length >= 2) {
    return (
      <section 
        id="gallery"
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

          <div className="max-w-4xl mx-auto space-y-8">
            {/* Comparison pairs */}
            {Array.from({ length: Math.floor(images.length / 2) }).map((_, pairIndex) => {
              const beforeImage = images[pairIndex * 2];
              const afterImage = images[pairIndex * 2 + 1];
              return (
                <div
                  key={pairIndex}
                  ref={pairIndex === 0 ? compareRef : undefined}
                  className="relative aspect-[16/9] overflow-hidden rounded-xl cursor-ew-resize select-none"
                  onMouseMove={pairIndex === 0 ? handleCompareMove : undefined}
                >
                  {/* After Image (Full) */}
                  <img
                    src={afterImage.url}
                    alt={afterImage.alt || 'Depois'}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Before Image (Clipped) */}
                  <div 
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${comparePosition}%` }}
                  >
                    <img
                      src={beforeImage.url}
                      alt={beforeImage.alt || 'Antes'}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ width: `${100 / (comparePosition / 100)}%`, maxWidth: 'none' }}
                    />
                  </div>

                  {/* Slider Handle */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
                    style={{ left: `${comparePosition}%`, transform: 'translateX(-50%)' }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                      <ArrowLeftRight className="h-5 w-5 text-gray-700" />
                    </div>
                  </div>

                  {/* Labels */}
                  <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Antes
                  </div>
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Depois
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // Collage Variant
  if (variant === 'collage') {
    return (
      <section 
        id="gallery"
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

          <div className="grid grid-cols-4 grid-rows-3 gap-2 md:gap-4 aspect-[4/3]">
            {images.slice(0, 6).map((image, index) => {
              // Creative collage positions
              const positions = [
                'col-span-2 row-span-2', // Large
                'col-span-2 row-span-1', // Wide
                'col-span-1 row-span-1', // Small
                'col-span-1 row-span-1', // Small
                'col-span-2 row-span-1', // Wide
                'col-span-2 row-span-1', // Wide
              ];
              return (
                <div
                  key={image.id}
                  className={cn(
                    'cursor-pointer group overflow-hidden rounded-lg',
                    positions[index] || 'col-span-1 row-span-1'
                  )}
                  onClick={() => openLightbox(index)}
                >
                  <img
                    src={image.thumbnail_url || image.url}
                    alt={image.alt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-5xl p-0 bg-black/95 border-none">
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20" onClick={prevImage}>
                <ChevronLeft className="h-8 w-8" />
              </Button>
              {images[currentIndex] && (
                <img src={images[currentIndex].url} alt={images[currentIndex].alt} className="max-h-[80vh] max-w-full object-contain" />
              )}
              <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20" onClick={nextImage}>
                <ChevronRight className="h-8 w-8" />
              </Button>
              <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={() => setLightboxOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    );
  }

  // Polaroid Variant
  if (variant === 'polaroid') {
    return (
      <section 
        id="gallery"
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

          <div className={cn('grid gap-8', gridColsClass)}>
            {images.map((image, index) => {
              const rotation = (index % 2 === 0 ? -3 : 3) + Math.random() * 2 - 1;
              return (
                <div
                  key={image.id}
                  className="bg-white p-3 pb-12 shadow-xl cursor-pointer transition-transform duration-300 hover:scale-105 hover:rotate-0"
                  style={{ transform: `rotate(${rotation}deg)` }}
                  onClick={() => openLightbox(index)}
                >
                  <img
                    src={image.thumbnail_url || image.url}
                    alt={image.alt}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  {image.alt && (
                    <p className="text-center mt-3 text-gray-600 font-handwriting text-sm">
                      {image.alt}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-5xl p-0 bg-black/95 border-none">
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20" onClick={prevImage}>
                <ChevronLeft className="h-8 w-8" />
              </Button>
              {images[currentIndex] && (
                <img src={images[currentIndex].url} alt={images[currentIndex].alt} className="max-h-[80vh] max-w-full object-contain" />
              )}
              <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20" onClick={nextImage}>
                <ChevronRight className="h-8 w-8" />
              </Button>
              <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={() => setLightboxOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    );
  }

  // Default variants (masonry, grid, instagram, slider)
  return (
    <section 
      id="gallery"
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
              <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20" onClick={prevImage}>
                <ChevronLeft className="h-8 w-8" />
              </Button>
              {images[currentIndex] && (
                <img src={images[currentIndex].url} alt={images[currentIndex].alt} className="max-h-[80vh] max-w-full object-contain" />
              )}
              <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20" onClick={nextImage}>
                <ChevronRight className="h-8 w-8" />
              </Button>
              <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={() => setLightboxOpen(false)}>
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