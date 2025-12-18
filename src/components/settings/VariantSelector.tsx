import React from 'react';
import { Label } from '@/components/ui/label';
import { Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export interface VariantOption {
  value: string;
  label: string;
  description: string;
  preview: React.ReactNode;
}

interface VariantSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: VariantOption[];
  label?: string;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  value,
  onChange,
  options,
  label = 'Estilo Visual'
}) => {
  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Sparkles className="h-4 w-4" />
        {label}
      </Label>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-3">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'flex-shrink-0 w-[140px] rounded-lg border-2 p-2 transition-all text-left hover:border-primary/50',
                value === option.value 
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                  : 'border-border bg-card'
              )}
            >
              {/* Preview Thumbnail */}
              <div className="relative h-20 mb-2 rounded-md bg-muted overflow-hidden">
                {option.preview}
                {value === option.value && (
                  <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              {/* Label & Description */}
              <p className="text-sm font-medium text-foreground truncate">{option.label}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 whitespace-normal mt-0.5">
                {option.description}
              </p>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

// Miniature Preview Components
const PreviewBox: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('absolute inset-2', className)}>{children}</div>
);

// Hero Variants Previews
export const heroVariantOptions: VariantOption[] = [
  {
    value: 'default',
    label: 'Padrão',
    description: 'Layout centralizado clássico com imagem de fundo',
    preview: (
      <PreviewBox>
        <div className="h-full bg-gradient-to-b from-primary/30 to-primary/10 rounded flex flex-col items-center justify-center">
          <div className="w-10 h-1.5 bg-foreground/40 rounded mb-1" />
          <div className="w-14 h-1 bg-foreground/20 rounded" />
          <div className="w-6 h-2 bg-primary/60 rounded mt-2" />
        </div>
      </PreviewBox>
    ),
  },
  {
    value: 'split-screen',
    label: 'Tela Dividida',
    description: 'Conteúdo de um lado, imagem do outro',
    preview: (
      <PreviewBox className="flex gap-1">
        <div className="flex-1 bg-background rounded flex flex-col justify-center p-1.5">
          <div className="w-full h-1.5 bg-foreground/40 rounded mb-1" />
          <div className="w-3/4 h-1 bg-foreground/20 rounded mb-2" />
          <div className="w-8 h-2 bg-primary/60 rounded" />
        </div>
        <div className="flex-1 bg-gradient-to-br from-primary/40 to-accent/40 rounded" />
      </PreviewBox>
    ),
  },
  {
    value: 'video-parallax',
    label: 'Vídeo Parallax',
    description: 'Fundo de vídeo com efeito parallax',
    preview: (
      <PreviewBox>
        <div className="h-full bg-gradient-to-b from-primary/20 to-muted rounded relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-foreground/40 rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-l-[6px] border-l-foreground/40 border-y-[4px] border-y-transparent ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-8 h-1 bg-foreground/40 rounded" />
          </div>
        </div>
      </PreviewBox>
    ),
  },
  {
    value: 'slideshow',
    label: 'Slideshow',
    description: 'Várias imagens em rotação automática',
    preview: (
      <PreviewBox>
        <div className="h-full bg-gradient-to-r from-primary/30 via-accent/30 to-secondary/30 rounded relative">
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
            <div className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-1">
            <div className="w-3 h-3 bg-foreground/20 rounded-full flex items-center justify-center text-[8px]">‹</div>
            <div className="w-3 h-3 bg-foreground/20 rounded-full flex items-center justify-center text-[8px]">›</div>
          </div>
        </div>
      </PreviewBox>
    ),
  },
  {
    value: 'minimal',
    label: 'Minimalista',
    description: 'Design limpo com foco no texto',
    preview: (
      <PreviewBox>
        <div className="h-full bg-background rounded flex flex-col items-center justify-center">
          <div className="w-14 h-2.5 bg-foreground/60 rounded mb-1" />
          <div className="w-10 h-1 bg-foreground/20 rounded" />
        </div>
      </PreviewBox>
    ),
  },
  {
    value: 'animated-text',
    label: 'Texto Animado',
    description: 'Texto com animações de entrada',
    preview: (
      <PreviewBox>
        <div className="h-full bg-gradient-to-b from-muted to-background rounded flex flex-col items-center justify-center">
          <div className="flex gap-0.5 mb-1">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className="w-3 h-1.5 bg-primary/60 rounded"
                style={{ opacity: 0.4 + i * 0.3 }}
              />
            ))}
          </div>
          <div className="w-10 h-1 bg-foreground/20 rounded" />
        </div>
      </PreviewBox>
    ),
  },
];

// Services Variants Previews
export const servicesVariantOptions: VariantOption[] = [
  {
    value: 'default',
    label: 'Padrão',
    description: 'Cards em grade organizados',
    preview: (
      <PreviewBox className="grid grid-cols-3 gap-1 p-0.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card border border-border rounded-sm p-1">
            <div className="h-3 bg-muted rounded-sm mb-0.5" />
            <div className="h-0.5 bg-foreground/30 rounded w-full" />
          </div>
        ))}
      </PreviewBox>
    ),
  },
  {
    value: 'featured',
    label: 'Com Destaque',
    description: 'Serviço principal em destaque',
    preview: (
      <PreviewBox className="flex gap-1">
        <div className="flex-[2] bg-primary/20 rounded p-1">
          <div className="h-full flex flex-col justify-end">
            <div className="h-1 bg-foreground/40 rounded w-3/4" />
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-1 bg-card border border-border rounded-sm" />
          ))}
        </div>
      </PreviewBox>
    ),
  },
  {
    value: 'minimal',
    label: 'Minimalista',
    description: 'Lista simples e elegante',
    preview: (
      <PreviewBox className="flex flex-col gap-1 p-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-1 bg-foreground/40 rounded w-12" />
            <div className="h-1 bg-primary/40 rounded w-4" />
          </div>
        ))}
      </PreviewBox>
    ),
  },
  {
    value: 'hover-cards',
    label: 'Cards Interativos',
    description: 'Cards com animação ao passar o mouse',
    preview: (
      <PreviewBox className="grid grid-cols-2 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className={cn(
              'bg-card rounded-sm transition-all border',
              i === 1 ? 'border-primary shadow-sm scale-105 z-10' : 'border-border'
            )}
          >
            <div className="h-4 bg-muted rounded-t-sm" />
            <div className="p-0.5">
              <div className="h-0.5 bg-foreground/30 rounded" />
            </div>
          </div>
        ))}
      </PreviewBox>
    ),
  },
  {
    value: 'pricing-table',
    label: 'Tabela de Preços',
    description: 'Layout em formato de tabela',
    preview: (
      <PreviewBox className="flex flex-col gap-0.5 p-1">
        <div className="flex gap-1 text-[6px] text-foreground/40">
          <div className="flex-1">Serviço</div>
          <div className="w-6 text-right">Preço</div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-1 border-b border-border pb-0.5">
            <div className="flex-1 h-1 bg-foreground/30 rounded" />
            <div className="w-6 h-1 bg-primary/40 rounded" />
          </div>
        ))}
      </PreviewBox>
    ),
  },
];

// Team Variants Previews
export const teamVariantOptions: VariantOption[] = [
  {
    value: 'default',
    label: 'Padrão',
    description: 'Fotos em grade com informações',
    preview: (
      <PreviewBox className="grid grid-cols-3 gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-muted mb-0.5" />
            <div className="w-full h-0.5 bg-foreground/30 rounded" />
          </div>
        ))}
      </PreviewBox>
    ),
  },
  {
    value: 'featured',
    label: 'Com Destaque',
    description: 'Membro principal em evidência',
    preview: (
      <PreviewBox className="flex gap-1">
        <div className="flex-[2] flex flex-col items-center justify-center bg-card border border-border rounded p-1">
          <div className="w-6 h-6 rounded-full bg-primary/30 mb-1" />
          <div className="w-10 h-1 bg-foreground/40 rounded" />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {[1, 2].map((i) => (
            <div key={i} className="flex-1 flex items-center justify-center bg-muted rounded">
              <div className="w-3 h-3 rounded-full bg-card" />
            </div>
          ))}
        </div>
      </PreviewBox>
    ),
  },
  {
    value: 'minimal-cards',
    label: 'Cards Mínimos',
    description: 'Design compacto e limpo',
    preview: (
      <PreviewBox className="grid grid-cols-2 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-sm p-1 flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1">
              <div className="h-0.5 bg-foreground/30 rounded w-full" />
            </div>
          </div>
        ))}
      </PreviewBox>
    ),
  },
  {
    value: 'overlay',
    label: 'Overlay na Foto',
    description: 'Informações sobre a foto com hover',
    preview: (
      <PreviewBox className="grid grid-cols-3 gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative h-full bg-muted rounded overflow-hidden">
            {i === 2 && (
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent flex items-end p-0.5">
                <div className="w-full h-1 bg-white/60 rounded" />
              </div>
            )}
          </div>
        ))}
      </PreviewBox>
    ),
  },
  {
    value: 'cards-horizontal',
    label: 'Cards Horizontais',
    description: 'Layout horizontal com bio expandida',
    preview: (
      <PreviewBox className="flex flex-col gap-1">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-1 bg-card border border-border rounded-sm p-1">
            <div className="w-5 h-5 rounded bg-muted flex-shrink-0" />
            <div className="flex-1">
              <div className="h-1 bg-foreground/40 rounded w-3/4 mb-0.5" />
              <div className="h-0.5 bg-foreground/20 rounded w-full" />
            </div>
          </div>
        ))}
      </PreviewBox>
    ),
  },
];

// Gallery Variants Previews
export const galleryVariantOptions: VariantOption[] = [
  {
    value: 'default',
    label: 'Padrão',
    description: 'Grade uniforme de imagens',
    preview: (
      <PreviewBox className="grid grid-cols-3 gap-0.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square bg-gradient-to-br from-muted to-muted/50 rounded-sm" />
        ))}
      </PreviewBox>
    ),
  },
  {
    value: 'featured',
    label: 'Com Destaque',
    description: 'Imagem principal maior',
    preview: (
      <PreviewBox className="grid grid-cols-3 grid-rows-2 gap-0.5">
        <div className="col-span-2 row-span-2 bg-gradient-to-br from-primary/30 to-primary/10 rounded-sm" />
        <div className="bg-muted rounded-sm" />
        <div className="bg-muted rounded-sm" />
      </PreviewBox>
    ),
  },
  {
    value: 'before-after',
    label: 'Antes/Depois',
    description: 'Comparação lado a lado interativa',
    preview: (
      <PreviewBox className="flex">
        <div className="flex-1 bg-muted rounded-l-sm relative">
          <span className="absolute bottom-0.5 left-0.5 text-[6px] text-foreground/40">Antes</span>
        </div>
        <div className="w-0.5 bg-primary" />
        <div className="flex-1 bg-gradient-to-r from-primary/30 to-primary/10 rounded-r-sm relative">
          <span className="absolute bottom-0.5 right-0.5 text-[6px] text-foreground/40">Depois</span>
        </div>
      </PreviewBox>
    ),
  },
  {
    value: 'collage',
    label: 'Colagem Criativa',
    description: 'Layout artístico assimétrico',
    preview: (
      <PreviewBox className="relative">
        <div className="absolute top-0 left-0 w-8 h-8 bg-muted rounded-sm transform rotate-2" />
        <div className="absolute top-2 right-0 w-6 h-10 bg-primary/20 rounded-sm transform -rotate-3" />
        <div className="absolute bottom-0 left-4 w-10 h-6 bg-accent/20 rounded-sm transform rotate-1" />
      </PreviewBox>
    ),
  },
  {
    value: 'polaroid',
    label: 'Estilo Polaroid',
    description: 'Fotos com borda estilo polaroid',
    preview: (
      <PreviewBox className="flex justify-center items-center gap-1">
        {[0, 1, 2].map((i) => (
          <div 
            key={i} 
            className="bg-white p-0.5 pb-2 rounded-sm shadow-sm transform"
            style={{ rotate: `${(i - 1) * 5}deg` }}
          >
            <div className="w-4 h-3 bg-muted rounded-sm" />
          </div>
        ))}
      </PreviewBox>
    ),
  },
];

// Reviews Variants Previews
export const reviewsVariantOptions: VariantOption[] = [
  {
    value: 'default',
    label: 'Padrão',
    description: 'Cards de avaliação em grade',
    preview: (
      <PreviewBox className="grid grid-cols-2 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-sm p-1">
            <div className="flex gap-0.5 mb-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className={cn('w-1 h-1 rounded-full', s <= 4 ? 'bg-yellow-400' : 'bg-muted')} />
              ))}
            </div>
            <div className="h-1 bg-foreground/20 rounded w-full" />
          </div>
        ))}
      </PreviewBox>
    ),
  },
  {
    value: 'featured',
    label: 'Com Destaque',
    description: 'Avaliação principal em evidência',
    preview: (
      <PreviewBox className="flex gap-1">
        <div className="flex-[2] bg-card border border-primary rounded p-1">
          <div className="flex gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            ))}
          </div>
          <div className="h-1 bg-foreground/30 rounded mb-0.5" />
          <div className="h-1 bg-foreground/20 rounded w-3/4" />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {[1, 2].map((i) => (
            <div key={i} className="flex-1 bg-muted rounded-sm" />
          ))}
        </div>
      </PreviewBox>
    ),
  },
  {
    value: 'marquee',
    label: 'Marquee Infinito',
    description: 'Avaliações em scroll contínuo',
    preview: (
      <PreviewBox className="flex items-center overflow-hidden">
        <div className="flex gap-1 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-10 h-8 bg-card border border-border rounded-sm flex-shrink-0 p-0.5">
              <div className="flex gap-0.5 mb-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className="w-0.5 h-0.5 rounded-full bg-yellow-400" />
                ))}
              </div>
              <div className="h-0.5 bg-foreground/20 rounded" />
            </div>
          ))}
        </div>
      </PreviewBox>
    ),
  },
  {
    value: 'testimonial-wall',
    label: 'Mural de Depoimentos',
    description: 'Layout estilo masonry com quotes',
    preview: (
      <PreviewBox className="grid grid-cols-2 gap-0.5">
        <div className="bg-card border border-border rounded-sm p-0.5 h-8" />
        <div className="bg-card border border-border rounded-sm p-0.5 h-6" />
        <div className="bg-card border border-border rounded-sm p-0.5 h-5" />
        <div className="bg-card border border-border rounded-sm p-0.5 h-10" />
      </PreviewBox>
    ),
  },
  {
    value: 'quote-highlight',
    label: 'Citações em Destaque',
    description: 'Foco nas frases dos clientes',
    preview: (
      <PreviewBox className="flex flex-col gap-1 items-center justify-center">
        <div className="text-[16px] text-primary/60 leading-none">"</div>
        <div className="w-12 h-1 bg-foreground/40 rounded" />
        <div className="w-8 h-1 bg-foreground/20 rounded" />
        <div className="flex gap-0.5 mt-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="w-1 h-1 rounded-full bg-yellow-400" />
          ))}
        </div>
      </PreviewBox>
    ),
  },
];
