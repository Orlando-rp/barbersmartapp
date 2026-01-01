import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  TemplateSelector, 
  TemplateRenderer, 
  landingTemplates,
} from '@/components/landing-templates';
import { OptimizedImageUpload } from '@/components/ui/optimized-image-upload';
import { 
  LandingPageConfig, 
  SectionConfig, 
  LandingTemplate,
  HeroSettings,
  ServicesSettings,
  TeamSettings,
  GallerySettings,
  ReviewsSettings,
  LocationSettings,
  CTASettings,
  FooterSettings,
  GlobalStyles,
  SEOConfig,
  ImageConfig
} from '@/types/landing-page';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  VariantSelector,
  heroVariantOptions,
  servicesVariantOptions,
  teamVariantOptions,
  galleryVariantOptions,
  reviewsVariantOptions 
} from './VariantSelector';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Palette,
  Layout,
  Eye,
  Save,
  GripVertical,
  Settings2,
  Image as ImageIcon,
  Type,
  Monitor,
  Tablet,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  RefreshCw,
  Sparkles,
  LayoutGrid,
  Users,
  Star,
  MapPin,
  MousePointerClick,
  Layers,
  Plus,
  Trash2
} from 'lucide-react';

interface SortableSectionItemProps {
  section: SectionConfig;
  isActive: boolean;
  onClick: () => void;
  onToggle: (enabled: boolean) => void;
}

const sectionIcons: Record<string, React.ReactNode> = {
  hero: <Sparkles className="h-4 w-4" />,
  services: <LayoutGrid className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  gallery: <ImageIcon className="h-4 w-4" />,
  reviews: <Star className="h-4 w-4" />,
  location: <MapPin className="h-4 w-4" />,
  cta: <MousePointerClick className="h-4 w-4" />,
};

const sectionLabels: Record<string, string> = {
  hero: 'Hero / Banner',
  services: 'Serviços',
  team: 'Equipe',
  gallery: 'Galeria',
  reviews: 'Avaliações',
  location: 'Localização',
  cta: 'Call to Action',
};

const SortableSectionItem: React.FC<SortableSectionItemProps> = ({
  section,
  isActive,
  onClick,
  onToggle,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg border transition-all cursor-pointer',
        isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        isDragging && 'opacity-50 shadow-lg',
        !section.enabled && 'opacity-50'
      )}
      onClick={onClick}
    >
      <button
        className="touch-none text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      
      <div className="flex-1 flex items-center gap-2">
        {sectionIcons[section.type]}
        <span className="text-sm font-medium">{sectionLabels[section.type]}</span>
      </div>
      
      <Switch
        checked={section.enabled}
        onCheckedChange={(checked) => {
          onToggle(checked);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

const LandingPageBuilder: React.FC = () => {
  const { barbershopId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('template');
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showPreview, setShowPreview] = useState(false);
  
  const [config, setConfig] = useState<LandingPageConfig>(() => {
    const defaultTemplate = landingTemplates[0];
    return defaultTemplate.defaultConfig;
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (barbershopId) {
      loadConfig();
    }
  }, [barbershopId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('barbershop_domains')
        .select('landing_page_config')
        .eq('barbershop_id', barbershopId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.landing_page_config) {
        const loadedConfig = data.landing_page_config as Partial<LandingPageConfig>;
        const defaultTemplate = landingTemplates[0];
        
        // Merge loaded config with defaults to ensure all properties exist
        setConfig({
          ...defaultTemplate.defaultConfig,
          ...loadedConfig,
          sections: loadedConfig.sections || defaultTemplate.defaultConfig.sections || [],
          global_styles: {
            ...defaultTemplate.defaultConfig.global_styles,
            ...(loadedConfig.global_styles || {}),
          },
          seo: {
            ...defaultTemplate.defaultConfig.seo,
            ...(loadedConfig.seo || {}),
          },
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!barbershopId) return;
    
    try {
      setSaving(true);
      
      const updatedConfig = {
        ...config,
        updated_at: new Date().toISOString(),
      };

      // Check if domain record exists
      const { data: existingDomain } = await supabase
        .from('barbershop_domains')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .maybeSingle();

      if (existingDomain) {
        const { error } = await supabase
          .from('barbershop_domains')
          .update({ landing_page_config: updatedConfig })
          .eq('barbershop_id', barbershopId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('barbershop_domains')
          .insert({ 
            barbershop_id: barbershopId, 
            landing_page_config: updatedConfig 
          });

        if (error) throw error;
      }

      toast.success('Landing page salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateSelect = (template: LandingTemplate) => {
    setConfig(template.defaultConfig);
    toast.success(`Template "${template.name}" aplicado!`);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setConfig((prev) => {
        const oldIndex = prev.sections.findIndex((s) => s.id === active.id);
        const newIndex = prev.sections.findIndex((s) => s.id === over.id);
        
        const newSections = arrayMove(prev.sections, oldIndex, newIndex).map(
          (section, index) => ({ ...section, order: index })
        );
        
        return { ...prev, sections: newSections };
      });
    }
  };

  const handleSectionToggle = (sectionId: string, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, enabled } : s
      ),
    }));
  };

  const updateSectionSettings = (sectionId: string, settings: Partial<any>) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, settings: { ...s.settings, ...settings } } : s
      ),
    }));
  };

  const updateSectionVariant = (sectionId: string, variant: string) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, variant } : s
      ),
    }));
  };

  const updateGlobalStyles = (styles: Partial<GlobalStyles>) => {
    setConfig((prev) => ({
      ...prev,
      global_styles: { ...prev.global_styles, ...styles },
    }));
  };

  const updateSEO = (seo: Partial<SEOConfig>) => {
    setConfig((prev) => ({
      ...prev,
      seo: { ...prev.seo, ...seo },
    }));
  };

  const updateFooter = (footer: Partial<FooterSettings>) => {
    setConfig((prev) => ({
      ...prev,
      footer: { ...getDefaultFooterSettings(), ...prev.footer, ...footer },
    }));
  };

  const getDefaultFooterSettings = (): FooterSettings => ({
    variant: 'complete',
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
  });

  const activeSection = config.sections.find((s) => s.id === activeSectionId);

  const renderSectionEditor = () => {
    if (!activeSection) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium text-foreground">Selecione uma seção</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Clique em uma seção para editar suas configurações
          </p>
        </div>
      );
    }

    switch (activeSection.type) {
      case 'hero':
        return <HeroEditor section={activeSection} onUpdate={(s) => updateSectionSettings(activeSection.id, s)} onVariantChange={(v) => updateSectionVariant(activeSection.id, v)} barbershopId={barbershopId || ''} />;
      case 'services':
        return <ServicesEditor section={activeSection} onUpdate={(s) => updateSectionSettings(activeSection.id, s)} onVariantChange={(v) => updateSectionVariant(activeSection.id, v)} barbershopId={barbershopId || ''} />;
      case 'team':
        return <TeamEditor section={activeSection} onUpdate={(s) => updateSectionSettings(activeSection.id, s)} onVariantChange={(v) => updateSectionVariant(activeSection.id, v)} barbershopId={barbershopId || ''} />;
      case 'gallery':
        return <GalleryEditor section={activeSection} onUpdate={(s) => updateSectionSettings(activeSection.id, s)} onVariantChange={(v) => updateSectionVariant(activeSection.id, v)} barbershopId={barbershopId || ''} />;
      case 'reviews':
        return <ReviewsEditor section={activeSection} onUpdate={(s) => updateSectionSettings(activeSection.id, s)} onVariantChange={(v) => updateSectionVariant(activeSection.id, v)} barbershopId={barbershopId || ''} />;
      case 'location':
        return <LocationEditor section={activeSection} onUpdate={(s) => updateSectionSettings(activeSection.id, s)} barbershopId={barbershopId || ''} />;
      case 'cta':
        return <CTAEditor section={activeSection} onUpdate={(s) => updateSectionSettings(activeSection.id, s)} barbershopId={barbershopId || ''} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Landing Page Builder</h2>
          <p className="text-sm text-muted-foreground">
            Personalize sua página pública com templates e configurações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? 'Editor' : 'Preview'}
          </Button>
          <Button
            variant="premium"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Publicar</>
            )}
          </Button>
        </div>
      </div>

      {showPreview ? (
        /* Preview Mode */
        <Card className="overflow-hidden">
          <CardHeader className="py-3 px-4 border-b">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Preview</span>
              <div className="flex items-center gap-1">
                <Button
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewMode('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === 'tablet' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewMode('tablet')}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewMode('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 bg-muted/50">
            <div
              className={cn(
                'mx-auto bg-background rounded-lg shadow-lg overflow-hidden transition-all',
                previewMode === 'desktop' && 'w-full',
                previewMode === 'tablet' && 'max-w-[768px]',
                previewMode === 'mobile' && 'max-w-[375px]'
              )}
            >
              <div className="h-[600px] overflow-y-auto">
                <TemplateRenderer 
                  config={config} 
                  barbershopId={barbershopId || ''} 
                  barbershopData={{
                    name: 'Preview da Barbearia',
                    address: 'Rua Exemplo, 123',
                    city: 'São Paulo',
                    state: 'SP',
                    phone: '(11) 99999-9999',
                  }}
                  services={[]}
                  staff={[]}
                  reviews={[]}
                  businessHours={[]}
                  bookingUrl={`/agendar/${barbershopId}`}
                  isPreview={true}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Editor Mode */
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="template">
              <Layout className="mr-2 h-4 w-4" />
              Template
            </TabsTrigger>
            <TabsTrigger value="sections">
              <Layers className="mr-2 h-4 w-4" />
              Seções
            </TabsTrigger>
            <TabsTrigger value="footer">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Footer
            </TabsTrigger>
            <TabsTrigger value="styles">
              <Palette className="mr-2 h-4 w-4" />
              Estilos
            </TabsTrigger>
            <TabsTrigger value="seo">
              <Search className="mr-2 h-4 w-4" />
              SEO
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-6">
            <TemplateSelector
              selectedTemplateId={config.template_id}
              onSelect={handleTemplateSelect}
            />
          </TabsContent>

          <TabsContent value="sections" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Section List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Seções</CardTitle>
                  <CardDescription>
                    Arraste para reordenar, clique para editar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={config.sections.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {config.sections
                          .sort((a, b) => a.order - b.order)
                          .map((section) => (
                            <SortableSectionItem
                              key={section.id}
                              section={section}
                              isActive={activeSectionId === section.id}
                              onClick={() => setActiveSectionId(section.id)}
                              onToggle={(enabled) => handleSectionToggle(section.id, enabled)}
                            />
                          ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </CardContent>
              </Card>

              {/* Section Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    {activeSection ? sectionLabels[activeSection.type] : 'Configurações'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    {renderSectionEditor()}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="styles" className="mt-6">
            <GlobalStylesEditor
              styles={config.global_styles}
              onUpdate={updateGlobalStyles}
            />
          </TabsContent>

          <TabsContent value="footer" className="mt-6">
            <FooterEditor
              footer={config.footer || getDefaultFooterSettings()}
              onUpdate={updateFooter}
            />
          </TabsContent>

          <TabsContent value="seo" className="mt-6">
            <SEOEditor seo={config.seo} onUpdate={updateSEO} barbershopId={barbershopId || ''} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

// Section Editors
interface SectionEditorProps<T> {
  section: SectionConfig;
  onUpdate: (settings: Partial<T>) => void;
  onVariantChange?: (variant: string) => void;
  barbershopId: string;
}

const HeroEditor: React.FC<SectionEditorProps<HeroSettings>> = ({ section, onUpdate, onVariantChange, barbershopId }) => {
  const settings = section.settings as HeroSettings;
  
  return (
    <div className="space-y-4">
      {/* Variant Selector with Preview */}
      <VariantSelector
        value={section.variant || 'default'}
        onChange={(value) => onVariantChange?.(value)}
        options={heroVariantOptions}
      />

      <Separator />

      <div className="space-y-2">
        <Label>Título</Label>
        <Input
          value={settings.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título principal"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Subtítulo</Label>
        <Textarea
          value={settings.subtitle}
          onChange={(e) => onUpdate({ subtitle: e.target.value })}
          placeholder="Descrição ou slogan"
          rows={2}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Tipo de Fundo</Label>
        <Select
          value={settings.background_type}
          onValueChange={(value: 'image' | 'color' | 'gradient') => 
            onUpdate({ background_type: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="color">Cor Sólida</SelectItem>
            <SelectItem value="gradient">Gradiente</SelectItem>
            <SelectItem value="image">Imagem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {settings.background_type === 'image' && (
        <div className="space-y-2">
          <Label>Imagem de Fundo</Label>
          <OptimizedImageUpload
            context="hero"
            barbershopId={barbershopId || ''}
            currentImage={settings.background_image}
            onUpload={(imageConfig) => onUpdate({ background_image: imageConfig })}
            onRemove={() => onUpdate({ background_image: undefined })}
            aspectRatio="16/9"
          />
        </div>
      )}

      {settings.background_type !== 'image' && (
        <div className="space-y-2">
          <Label>Valor do Fundo</Label>
          <Input
            value={settings.background_value}
            onChange={(e) => onUpdate({ background_value: e.target.value })}
            placeholder={settings.background_type === 'gradient' ? 'linear-gradient(...)' : '#000000'}
          />
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <Label>Posição do Texto</Label>
        <Select
          value={settings.text_position}
          onValueChange={(value: 'left' | 'center' | 'right') => 
            onUpdate({ text_position: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Esquerda</SelectItem>
            <SelectItem value="center">Centro</SelectItem>
            <SelectItem value="right">Direita</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Altura</Label>
        <Select
          value={settings.height}
          onValueChange={(value: 'fullscreen' | '75vh' | '50vh') => 
            onUpdate({ height: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fullscreen">Tela Cheia</SelectItem>
            <SelectItem value="75vh">75% da Tela</SelectItem>
            <SelectItem value="50vh">50% da Tela</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Texto do Botão Principal</Label>
        <Input
          value={settings.cta_primary_text}
          onChange={(e) => onUpdate({ cta_primary_text: e.target.value })}
          placeholder="Agendar Agora"
        />
      </div>

      <div className="space-y-2">
        <Label>Texto do Botão Secundário (opcional)</Label>
        <Input
          value={settings.cta_secondary_text || ''}
          onChange={(e) => onUpdate({ cta_secondary_text: e.target.value })}
          placeholder="Conhecer Serviços"
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Mostrar Logo</Label>
        <Switch
          checked={settings.show_logo}
          onCheckedChange={(checked) => onUpdate({ show_logo: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Indicador de Scroll</Label>
        <Switch
          checked={settings.show_scroll_indicator}
          onCheckedChange={(checked) => onUpdate({ show_scroll_indicator: checked })}
        />
      </div>
    </div>
  );
};

const ServicesEditor: React.FC<SectionEditorProps<ServicesSettings>> = ({ section, onUpdate, onVariantChange }) => {
  const settings = section.settings as ServicesSettings;
  
  return (
    <div className="space-y-4">
      {/* Variant Selector with Preview */}
      <VariantSelector
        value={section.variant || 'default'}
        onChange={(value) => onVariantChange?.(value)}
        options={servicesVariantOptions}
      />

      <Separator />

      <div className="space-y-2">
        <Label>Layout</Label>
        <Select
          value={settings.layout}
          onValueChange={(value: 'grid' | 'list' | 'carousel') => 
            onUpdate({ layout: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grade</SelectItem>
            <SelectItem value="list">Lista</SelectItem>
            <SelectItem value="carousel">Carrossel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {settings.layout === 'grid' && (
        <div className="space-y-2">
          <Label>Colunas</Label>
          <Select
            value={String(settings.columns)}
            onValueChange={(value) => onUpdate({ columns: Number(value) as 2 | 3 | 4 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Colunas</SelectItem>
              <SelectItem value="3">3 Colunas</SelectItem>
              <SelectItem value="4">4 Colunas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Estilo dos Cards</Label>
        <Select
          value={settings.card_style}
          onValueChange={(value: 'flat' | 'elevated' | 'bordered') => 
            onUpdate({ card_style: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flat">Flat</SelectItem>
            <SelectItem value="elevated">Elevado</SelectItem>
            <SelectItem value="bordered">Com Borda</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Máximo de Serviços</Label>
        <Input
          type="number"
          min={1}
          max={20}
          value={settings.max_items}
          onChange={(e) => onUpdate({ max_items: Number(e.target.value) })}
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Label>Mostrar Preços</Label>
        <Switch
          checked={settings.show_prices}
          onCheckedChange={(checked) => onUpdate({ show_prices: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Mostrar Duração</Label>
        <Switch
          checked={settings.show_duration}
          onCheckedChange={(checked) => onUpdate({ show_duration: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Mostrar Descrição</Label>
        <Switch
          checked={settings.show_description}
          onCheckedChange={(checked) => onUpdate({ show_description: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Mostrar Imagens</Label>
        <Switch
          checked={settings.show_images}
          onCheckedChange={(checked) => onUpdate({ show_images: checked })}
        />
      </div>
    </div>
  );
};

const TeamEditor: React.FC<SectionEditorProps<TeamSettings>> = ({ section, onUpdate, onVariantChange }) => {
  const settings = section.settings as TeamSettings;
  
  return (
    <div className="space-y-4">
      {/* Variant Selector with Preview */}
      <VariantSelector
        value={section.variant || 'default'}
        onChange={(value) => onVariantChange?.(value)}
        options={teamVariantOptions}
      />

      <Separator />

      <div className="space-y-2">
        <Label>Layout</Label>
        <Select
          value={settings.layout}
          onValueChange={(value: 'grid' | 'carousel' | 'list') => 
            onUpdate({ layout: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grade</SelectItem>
            <SelectItem value="carousel">Carrossel</SelectItem>
            <SelectItem value="list">Lista</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {settings.layout === 'grid' && (
        <div className="space-y-2">
          <Label>Colunas</Label>
          <Select
            value={String(settings.columns)}
            onValueChange={(value) => onUpdate({ columns: Number(value) as 2 | 3 | 4 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Colunas</SelectItem>
              <SelectItem value="3">3 Colunas</SelectItem>
              <SelectItem value="4">4 Colunas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Formato da Foto</Label>
        <Select
          value={settings.photo_shape}
          onValueChange={(value: 'circle' | 'square' | 'rounded') => 
            onUpdate({ photo_shape: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="circle">Círculo</SelectItem>
            <SelectItem value="square">Quadrado</SelectItem>
            <SelectItem value="rounded">Arredondado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Label>Mostrar Especialidades</Label>
        <Switch
          checked={settings.show_specialties}
          onCheckedChange={(checked) => onUpdate({ show_specialties: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Mostrar Bio</Label>
        <Switch
          checked={settings.show_bio}
          onCheckedChange={(checked) => onUpdate({ show_bio: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Mostrar Redes Sociais</Label>
        <Switch
          checked={settings.show_social}
          onCheckedChange={(checked) => onUpdate({ show_social: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Mostrar Avaliação</Label>
        <Switch
          checked={settings.show_rating}
          onCheckedChange={(checked) => onUpdate({ show_rating: checked })}
        />
      </div>
    </div>
  );
};

const GalleryEditor: React.FC<SectionEditorProps<GallerySettings>> = ({ section, onUpdate, onVariantChange }) => {
  const settings = section.settings as GallerySettings;
  
  return (
    <div className="space-y-4">
      {/* Variant Selector with Preview */}
      <VariantSelector
        value={section.variant || 'default'}
        onChange={(value) => onVariantChange?.(value)}
        options={galleryVariantOptions}
      />

      <Separator />

      <div className="space-y-2">
        <Label>Layout</Label>
        <Select
          value={settings.layout}
          onValueChange={(value: 'masonry' | 'grid' | 'slider' | 'instagram') => 
            onUpdate({ layout: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grade</SelectItem>
            <SelectItem value="masonry">Masonry</SelectItem>
            <SelectItem value="slider">Slider</SelectItem>
            <SelectItem value="instagram">Estilo Instagram</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(settings.layout === 'grid' || settings.layout === 'instagram') && (
        <div className="space-y-2">
          <Label>Colunas</Label>
          <Select
            value={String(settings.columns)}
            onValueChange={(value) => onUpdate({ columns: Number(value) as 2 | 3 | 4 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Colunas</SelectItem>
              <SelectItem value="3">3 Colunas</SelectItem>
              <SelectItem value="4">4 Colunas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Máximo de Imagens</Label>
        <Input
          type="number"
          min={1}
          max={24}
          value={settings.max_images}
          onChange={(e) => onUpdate({ max_images: Number(e.target.value) })}
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Label>Filtro por Categorias</Label>
        <Switch
          checked={settings.show_categories}
          onCheckedChange={(checked) => onUpdate({ show_categories: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Lightbox ao Clicar</Label>
        <Switch
          checked={settings.show_lightbox}
          onCheckedChange={(checked) => onUpdate({ show_lightbox: checked })}
        />
      </div>
    </div>
  );
};

const ReviewsEditor: React.FC<SectionEditorProps<ReviewsSettings>> = ({ section, onUpdate, onVariantChange }) => {
  const settings = section.settings as ReviewsSettings;
  
  return (
    <div className="space-y-4">
      {/* Variant Selector with Preview */}
      <VariantSelector
        value={section.variant || 'default'}
        onChange={(value) => onVariantChange?.(value)}
        options={reviewsVariantOptions}
      />

      <Separator />

      <div className="space-y-2">
        <Label>Layout</Label>
        <Select
          value={settings.layout}
          onValueChange={(value: 'cards' | 'slider' | 'list') => 
            onUpdate({ layout: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cards">Cards</SelectItem>
            <SelectItem value="slider">Slider</SelectItem>
            <SelectItem value="list">Lista</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Rating Mínimo</Label>
        <Select
          value={String(settings.min_rating)}
          onValueChange={(value) => onUpdate({ min_rating: Number(value) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 Estrela ou mais</SelectItem>
            <SelectItem value="2">2 Estrelas ou mais</SelectItem>
            <SelectItem value="3">3 Estrelas ou mais</SelectItem>
            <SelectItem value="4">4 Estrelas ou mais</SelectItem>
            <SelectItem value="5">Apenas 5 Estrelas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Máximo de Avaliações</Label>
        <Input
          type="number"
          min={1}
          max={20}
          value={settings.max_items}
          onChange={(e) => onUpdate({ max_items: Number(e.target.value) })}
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Label>Mostrar Fotos</Label>
        <Switch
          checked={settings.show_photos}
          onCheckedChange={(checked) => onUpdate({ show_photos: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Mostrar Data</Label>
        <Switch
          checked={settings.show_date}
          onCheckedChange={(checked) => onUpdate({ show_date: checked })}
        />
      </div>
    </div>
  );
};

const LocationEditor: React.FC<SectionEditorProps<LocationSettings>> = ({ section, onUpdate }) => {
  const settings = section.settings as LocationSettings;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Mostrar Mapa</Label>
        <Switch
          checked={settings.show_map}
          onCheckedChange={(checked) => onUpdate({ show_map: checked })}
        />
      </div>

      {settings.show_map && (
        <div className="space-y-2">
          <Label>Estilo do Mapa</Label>
          <Select
            value={settings.map_style}
            onValueChange={(value: 'standard' | 'dark' | 'light') => 
              onUpdate({ map_style: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Padrão</SelectItem>
              <SelectItem value="dark">Escuro</SelectItem>
              <SelectItem value="light">Claro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <Label>Mostrar Horários</Label>
        <Switch
          checked={settings.show_hours}
          onCheckedChange={(checked) => onUpdate({ show_hours: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Mostrar Contato</Label>
        <Switch
          checked={settings.show_contact}
          onCheckedChange={(checked) => onUpdate({ show_contact: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label>Mostrar Redes Sociais</Label>
        <Switch
          checked={settings.show_social}
          onCheckedChange={(checked) => onUpdate({ show_social: checked })}
        />
      </div>
    </div>
  );
};

const CTAEditor: React.FC<SectionEditorProps<CTASettings>> = ({ section, onUpdate, barbershopId }) => {
  const settings = section.settings as CTASettings;
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Título</Label>
        <Input
          value={settings.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Pronto para agendar?"
        />
      </div>

      <div className="space-y-2">
        <Label>Subtítulo</Label>
        <Textarea
          value={settings.subtitle}
          onChange={(e) => onUpdate({ subtitle: e.target.value })}
          placeholder="Agende agora e ganhe 10% de desconto"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Texto do Botão</Label>
        <Input
          value={settings.button_text}
          onChange={(e) => onUpdate({ button_text: e.target.value })}
          placeholder="Agendar Agora"
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Tipo de Fundo</Label>
        <Select
          value={settings.background_type}
          onValueChange={(value: 'color' | 'gradient' | 'image') => 
            onUpdate({ background_type: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="color">Cor Sólida</SelectItem>
            <SelectItem value="gradient">Gradiente</SelectItem>
            <SelectItem value="image">Imagem</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {settings.background_type === 'image' && (
        <div className="space-y-2">
          <Label>Imagem de Fundo</Label>
          <OptimizedImageUpload
            context="hero"
            barbershopId={barbershopId || ''}
            currentImage={settings.background_image}
            onUpload={(imageConfig) => onUpdate({ background_image: imageConfig })}
            onRemove={() => onUpdate({ background_image: undefined })}
            aspectRatio="16/9"
          />
        </div>
      )}

      {settings.background_type !== 'image' && (
        <div className="space-y-2">
          <Label>Valor do Fundo</Label>
          <Input
            value={settings.background_value}
            onChange={(e) => onUpdate({ background_value: e.target.value })}
            placeholder={settings.background_type === 'gradient' ? 'linear-gradient(...)' : '#000000'}
          />
        </div>
      )}
    </div>
  );
};

// Global Styles Editor
interface GlobalStylesEditorProps {
  styles: GlobalStyles;
  onUpdate: (styles: Partial<GlobalStyles>) => void;
}

const GlobalStylesEditor: React.FC<GlobalStylesEditorProps> = ({ styles, onUpdate }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Estilos Globais</CardTitle>
        <CardDescription>
          Personalize cores e tipografia do seu site
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cor Primária (HSL)</Label>
            <Input
              value={styles.primary_color}
              onChange={(e) => onUpdate({ primary_color: e.target.value })}
              placeholder="220 80% 50%"
            />
            <div 
              className="h-8 rounded-md border"
              style={{ backgroundColor: `hsl(${styles.primary_color})` }}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor Secundária (HSL)</Label>
            <Input
              value={styles.secondary_color}
              onChange={(e) => onUpdate({ secondary_color: e.target.value })}
              placeholder="180 60% 40%"
            />
            <div 
              className="h-8 rounded-md border"
              style={{ backgroundColor: `hsl(${styles.secondary_color})` }}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor de Destaque (HSL)</Label>
            <Input
              value={styles.accent_color}
              onChange={(e) => onUpdate({ accent_color: e.target.value })}
              placeholder="45 100% 50%"
            />
            <div 
              className="h-8 rounded-md border"
              style={{ backgroundColor: `hsl(${styles.accent_color})` }}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor de Fundo (HSL)</Label>
            <Input
              value={styles.background_color}
              onChange={(e) => onUpdate({ background_color: e.target.value })}
              placeholder="0 0% 100%"
            />
            <div 
              className="h-8 rounded-md border"
              style={{ backgroundColor: `hsl(${styles.background_color})` }}
            />
          </div>
        </div>

        <Separator />

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fonte de Títulos</Label>
            <Select
              value={styles.font_heading}
              onValueChange={(value) => onUpdate({ font_heading: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                <SelectItem value="Bebas Neue">Bebas Neue</SelectItem>
                <SelectItem value="Oswald">Oswald</SelectItem>
                <SelectItem value="Montserrat">Montserrat</SelectItem>
                <SelectItem value="Raleway">Raleway</SelectItem>
                <SelectItem value="Poppins">Poppins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fonte do Corpo</Label>
            <Select
              value={styles.font_body}
              onValueChange={(value) => onUpdate({ font_body: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Open Sans">Open Sans</SelectItem>
                <SelectItem value="Lato">Lato</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Arredondamento de Bordas</Label>
          <Select
            value={styles.border_radius}
            onValueChange={(value: 'none' | 'sm' | 'md' | 'lg' | 'full') => 
              onUpdate({ border_radius: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem Arredondamento</SelectItem>
              <SelectItem value="sm">Pequeno</SelectItem>
              <SelectItem value="md">Médio</SelectItem>
              <SelectItem value="lg">Grande</SelectItem>
              <SelectItem value="full">Completo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

// Footer Editor
interface FooterEditorProps {
  footer: FooterSettings;
  onUpdate: (footer: Partial<FooterSettings>) => void;
}

const FooterEditor: React.FC<FooterEditorProps> = ({ footer, onUpdate }) => {
  const addCustomLink = () => {
    onUpdate({
      custom_links: [...(footer.custom_links || []), { label: '', url: '' }],
    });
  };

  const updateCustomLink = (index: number, field: 'label' | 'url', value: string) => {
    const newLinks = [...(footer.custom_links || [])];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onUpdate({ custom_links: newLinks });
  };

  const removeCustomLink = (index: number) => {
    const newLinks = (footer.custom_links || []).filter((_, i) => i !== index);
    onUpdate({ custom_links: newLinks });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configurações do Footer</CardTitle>
        <CardDescription>
          Personalize o rodapé da sua landing page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Variant Selector */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Estilo do Footer</h4>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ variant: 'complete' })}
              className={cn(
                'p-3 rounded-lg border-2 text-center transition-all',
                footer.variant === 'complete' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="w-full h-8 bg-muted rounded flex">
                  <div className="w-1/3 border-r border-background/50" />
                  <div className="w-1/3 border-r border-background/50" />
                  <div className="w-1/3" />
                </div>
                <span className="text-xs font-medium">Completo</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ variant: 'centered' })}
              className={cn(
                'p-3 rounded-lg border-2 text-center transition-all',
                footer.variant === 'centered' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="w-full h-8 bg-muted rounded flex items-center justify-center">
                  <div className="w-1/2 h-4 bg-background/50 rounded" />
                </div>
                <span className="text-xs font-medium">Centrado</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ variant: 'minimal' })}
              className={cn(
                'p-3 rounded-lg border-2 text-center transition-all',
                footer.variant === 'minimal' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="w-full h-8 bg-muted rounded flex items-center px-2">
                  <div className="w-1/4 h-2 bg-background/50 rounded" />
                  <div className="flex-1" />
                  <div className="w-1/4 h-2 bg-background/50 rounded" />
                </div>
                <span className="text-xs font-medium">Minimalista</span>
              </div>
            </button>
          </div>
        </div>

        <Separator />

        {/* Visibility Options */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Visibilidade</h4>
          
          <div className="flex items-center justify-between">
            <Label>Mostrar Logo</Label>
            <Switch
              checked={footer.show_logo}
              onCheckedChange={(checked) => onUpdate({ show_logo: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Mostrar Contato</Label>
            <Switch
              checked={footer.show_contact}
              onCheckedChange={(checked) => onUpdate({ show_contact: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Mostrar Redes Sociais</Label>
            <Switch
              checked={footer.show_social}
              onCheckedChange={(checked) => onUpdate({ show_social: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Botão de Agendamento</Label>
            <Switch
              checked={footer.show_booking_button}
              onCheckedChange={(checked) => onUpdate({ show_booking_button: checked })}
            />
          </div>
        </div>

        <Separator />

        {/* Content */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Conteúdo</h4>
          
          <div className="space-y-2">
            <Label>Tagline / Slogan</Label>
            <Input
              value={footer.tagline}
              onChange={(e) => onUpdate({ tagline: e.target.value })}
              placeholder="Qualidade e estilo em cada corte."
            />
          </div>
        </div>

        <Separator />

        {/* Links */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Links Padrão</h4>
          
          <div className="flex items-center justify-between">
            <Label>Link de Privacidade</Label>
            <Switch
              checked={footer.show_privacy_link}
              onCheckedChange={(checked) => onUpdate({ show_privacy_link: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Link de Termos</Label>
            <Switch
              checked={footer.show_terms_link}
              onCheckedChange={(checked) => onUpdate({ show_terms_link: checked })}
            />
          </div>
        </div>

        <Separator />

        {/* Custom Links */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Links Personalizados</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomLink}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
          
          {(footer.custom_links || []).map((link, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={link.label}
                onChange={(e) => updateCustomLink(index, 'label', e.target.value)}
                placeholder="Texto do link"
                className="flex-1"
              />
              <Input
                value={link.url}
                onChange={(e) => updateCustomLink(index, 'url', e.target.value)}
                placeholder="URL"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCustomLink(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <Separator />

        {/* Powered By */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Créditos</h4>
          
          <div className="flex items-center justify-between">
            <Label>Mostrar "Powered by"</Label>
            <Switch
              checked={footer.show_powered_by}
              onCheckedChange={(checked) => onUpdate({ show_powered_by: checked })}
            />
          </div>

          {footer.show_powered_by && (
            <div className="space-y-2">
              <Label>Texto "Powered by"</Label>
              <Input
                value={footer.powered_by_text}
                onChange={(e) => onUpdate({ powered_by_text: e.target.value })}
                placeholder="Barber Smart"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Background Color */}
        <div className="space-y-2">
          <Label>Cor de Fundo (HSL) - deixe vazio para usar cor secundária</Label>
          <Input
            value={footer.background_color || ''}
            onChange={(e) => onUpdate({ background_color: e.target.value || undefined })}
            placeholder="Usar cor secundária"
          />
          <div 
            className="h-8 rounded-md border"
            style={{ backgroundColor: footer.background_color ? `hsl(${footer.background_color})` : '#1a1a2e' }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// SEO Editor
interface SEOEditorProps {
  seo: SEOConfig;
  onUpdate: (seo: Partial<SEOConfig>) => void;
  barbershopId: string;
}

const SEOEditor: React.FC<SEOEditorProps> = ({ seo, onUpdate, barbershopId }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Otimização para Buscadores (SEO)</CardTitle>
        <CardDescription>
          Configure como sua página aparece no Google
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Título da Página</Label>
          <Input
            value={seo.title || ''}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Nome da Barbearia | Serviços Profissionais"
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground">
            {(seo.title || '').length}/60 caracteres
          </p>
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea
            value={seo.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Descrição da sua barbearia para os resultados de busca..."
            maxLength={160}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            {(seo.description || '').length}/160 caracteres
          </p>
        </div>

        <div className="space-y-2">
          <Label>Palavras-chave</Label>
          <Input
            value={(seo.keywords || []).join(', ')}
            onChange={(e) => onUpdate({ 
              keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean) 
            })}
            placeholder="barbearia, corte de cabelo, barba, cidade"
          />
          <p className="text-xs text-muted-foreground">
            Separe as palavras-chave por vírgula
          </p>
        </div>

        <div className="space-y-2">
          <Label>Imagem de Compartilhamento (Open Graph)</Label>
          <OptimizedImageUpload
            context="hero"
            barbershopId={barbershopId || ''}
            currentImage={seo.og_image ? { id: 'og-image', url: seo.og_image, alt: 'Open Graph' } : undefined}
            onUpload={(imageConfig) => onUpdate({ og_image: imageConfig.url })}
            onRemove={() => onUpdate({ og_image: undefined })}
            aspectRatio="1.91/1"
            description="Recomendado: 1200x630 pixels"
          />
        </div>

        {/* Preview */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">Preview no Google:</p>
          <div className="space-y-1">
            <p className="text-blue-600 text-lg hover:underline cursor-pointer">
              {seo.title || 'Título da Página'}
            </p>
            <p className="text-green-700 text-sm">
              www.suabarbearia.com.br
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {seo.description || 'Descrição da sua página aparecerá aqui...'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LandingPageBuilder;
