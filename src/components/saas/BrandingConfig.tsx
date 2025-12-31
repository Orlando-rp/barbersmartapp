import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Palette, 
  Save, 
  Loader2, 
  Info, 
  Upload,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  Type,
  Settings2,
  Sparkles,
  Wand2,
  Sun,
  Moon,
  Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useBranding } from "@/contexts/BrandingContext";
import { optimizeImage, formatFileSize } from "@/lib/imageOptimization";

interface BrandingSettings {
  systemName: string;
  tagline: string;
  logoUrl: string;
  logoLightUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    warning: string;
    success: string;
    destructive: string;
  };
  allowTenantCustomization: boolean;
}

const defaultBranding: BrandingSettings = {
  systemName: 'BarberSmart',
  tagline: 'Gestão inteligente para sua barbearia',
  logoUrl: '',
  logoLightUrl: '',
  logoDarkUrl: '',
  faviconUrl: '',
  colors: {
    primary: '#3b5068',
    primaryForeground: '#f8fafc',
    secondary: '#4b6584',
    warning: '#f59e0b',
    success: '#22c55e',
    destructive: '#ef4444',
  },
  allowTenantCustomization: true,
};

export const BrandingConfig = () => {
  const { refreshBranding } = useBranding();
  const [config, setConfig] = useState<BrandingSettings>(defaultBranding);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLogoLight, setUploadingLogoLight] = useState(false);
  const [uploadingLogoDark, setUploadingLogoDark] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      // Try system_branding table first
      const { data, error } = await supabase
        .from('system_branding')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log('system_branding table not available:', error.message);
      }

      if (data) {
        setExistingId(data.id);
        setConfig({
          systemName: data.system_name || defaultBranding.systemName,
          tagline: data.tagline || defaultBranding.tagline,
          logoUrl: data.logo_url || '',
          logoLightUrl: data.logo_light_url || '',
          logoDarkUrl: data.logo_dark_url || '',
          faviconUrl: data.favicon_url || '',
          colors: {
            primary: data.primary_color || defaultBranding.colors.primary,
            primaryForeground: defaultBranding.colors.primaryForeground,
            secondary: data.secondary_color || defaultBranding.colors.secondary,
            warning: data.accent_color || defaultBranding.colors.warning,
            success: defaultBranding.colors.success,
            destructive: defaultBranding.colors.destructive,
          },
          allowTenantCustomization: data.allow_tenant_customization ?? true,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);

      const brandingData = {
        system_name: config.systemName,
        tagline: config.tagline,
        logo_url: config.logoUrl || null,
        logo_light_url: config.logoLightUrl || null,
        logo_dark_url: config.logoDarkUrl || null,
        favicon_url: config.faviconUrl || null,
        primary_color: config.colors.primary,
        secondary_color: config.colors.secondary,
        accent_color: config.colors.warning,
        allow_tenant_customization: config.allowTenantCustomization,
        updated_at: new Date().toISOString()
      };

      let error;
      
      if (existingId) {
        // Update existing record
        const result = await supabase
          .from('system_branding')
          .update(brandingData)
          .eq('id', existingId);
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from('system_branding')
          .insert(brandingData)
          .select('id')
          .single();
        error = result.error;
        if (result.data) {
          setExistingId(result.data.id);
        }
      }

      if (error) throw error;

      // Refresh branding context to apply changes globally
      await refreshBranding();

      toast.success("Configurações de branding salvas com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error("Erro ao salvar configuração. Verifique se a tabela system_branding existe.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      
      let fileToUpload: Blob = file;
      let finalExt = file.name.split('.').pop() || 'png';
      const skipCompression = file.type === 'image/svg+xml';

      if (!skipCompression) {
        try {
          const optimized = await optimizeImage(file, {
            maxWidth: 512,
            maxHeight: 512,
            quality: 85,
            format: 'webp',
            generateThumbnail: false,
          });
          
          fileToUpload = optimized.optimizedBlob;
          finalExt = optimized.metadata.format;
          
          console.log(`Logo otimizado: ${formatFileSize(optimized.metadata.originalSize)} → ${formatFileSize(optimized.metadata.optimizedSize)} (${optimized.metadata.compressionRatio}% menor)`);
        } catch (compressionError) {
          console.warn('Compressão falhou, enviando arquivo original:', compressionError);
        }
      }

      const fileName = `branding/saas/logo-${Date.now()}.${finalExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('landing-images')
        .upload(fileName, fileToUpload, { 
          upsert: true,
          contentType: file.type === 'image/svg+xml' ? 'image/svg+xml' : `image/${finalExt}`
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('landing-images')
        .getPublicUrl(fileName);

      setConfig(prev => ({ ...prev, logoUrl: publicUrl }));
      toast.success("Logo enviado com sucesso!");
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error("Erro ao enviar logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFavicon(true);
      
      let fileToUpload: Blob = file;
      let finalExt = file.name.split('.').pop() || 'png';
      const isIcoFile = file.name.toLowerCase().endsWith('.ico');
      const skipCompression = file.type === 'image/svg+xml' || isIcoFile;

      if (!skipCompression) {
        try {
          const optimized = await optimizeImage(file, {
            maxWidth: 128,
            maxHeight: 128,
            quality: 90,
            format: 'webp',
            generateThumbnail: false,
          });
          
          fileToUpload = optimized.optimizedBlob;
          finalExt = optimized.metadata.format;
          
          console.log(`Favicon otimizado: ${formatFileSize(optimized.metadata.originalSize)} → ${formatFileSize(optimized.metadata.optimizedSize)} (${optimized.metadata.compressionRatio}% menor)`);
        } catch (compressionError) {
          console.warn('Compressão falhou, enviando arquivo original:', compressionError);
        }
      }

      const fileName = `branding/saas/favicon-${Date.now()}.${finalExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('landing-images')
        .upload(fileName, fileToUpload, { 
          upsert: true,
          contentType: file.type === 'image/svg+xml' ? 'image/svg+xml' : `image/${finalExt}`
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('landing-images')
        .getPublicUrl(fileName);

      setConfig(prev => ({ ...prev, faviconUrl: publicUrl }));
      toast.success("Favicon enviado com sucesso!");
    } catch (error) {
      console.error('Erro ao enviar favicon:', error);
      toast.error("Erro ao enviar favicon");
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleLogoLightUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogoLight(true);
      
      let fileToUpload: Blob = file;
      let finalExt = file.name.split('.').pop() || 'png';
      const skipCompression = file.type === 'image/svg+xml';

      if (!skipCompression) {
        try {
          const optimized = await optimizeImage(file, {
            maxWidth: 512,
            maxHeight: 512,
            quality: 85,
            format: 'webp',
            generateThumbnail: false,
          });
          
          fileToUpload = optimized.optimizedBlob;
          finalExt = optimized.metadata.format;
        } catch (compressionError) {
          console.warn('Compressão falhou, enviando arquivo original:', compressionError);
        }
      }

      const fileName = `branding/saas/logo-light-${Date.now()}.${finalExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('landing-images')
        .upload(fileName, fileToUpload, { 
          upsert: true,
          contentType: file.type === 'image/svg+xml' ? 'image/svg+xml' : `image/${finalExt}`
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('landing-images')
        .getPublicUrl(fileName);

      setConfig(prev => ({ ...prev, logoLightUrl: publicUrl }));
      toast.success("Logo para tema claro enviado com sucesso!");
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error("Erro ao enviar logo");
    } finally {
      setUploadingLogoLight(false);
    }
  };

  const handleLogoDarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogoDark(true);
      
      let fileToUpload: Blob = file;
      let finalExt = file.name.split('.').pop() || 'png';
      const skipCompression = file.type === 'image/svg+xml';

      if (!skipCompression) {
        try {
          const optimized = await optimizeImage(file, {
            maxWidth: 512,
            maxHeight: 512,
            quality: 85,
            format: 'webp',
            generateThumbnail: false,
          });
          
          fileToUpload = optimized.optimizedBlob;
          finalExt = optimized.metadata.format;
        } catch (compressionError) {
          console.warn('Compressão falhou, enviando arquivo original:', compressionError);
        }
      }

      const fileName = `branding/saas/logo-dark-${Date.now()}.${finalExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('landing-images')
        .upload(fileName, fileToUpload, { 
          upsert: true,
          contentType: file.type === 'image/svg+xml' ? 'image/svg+xml' : `image/${finalExt}`
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('landing-images')
        .getPublicUrl(fileName);

      setConfig(prev => ({ ...prev, logoDarkUrl: publicUrl }));
      toast.success("Logo para tema escuro enviado com sucesso!");
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error("Erro ao enviar logo");
    } finally {
      setUploadingLogoDark(false);
    }
  };

  const updateColor = (key: keyof typeof config.colors, value: string) => {
    setConfig(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: value,
      },
    }));
  };

  const generateBrandingWithAI = async () => {
    try {
      setGeneratingAI(true);
      toast.info("Gerando logomarcas com IA... Isso pode levar alguns segundos.");

      const { data, error } = await supabase.functions.invoke('generate-branding-images', {
        body: {
          type: 'all',
          brandName: config.systemName || 'BarberSmart',
          primaryColor: config.colors.primary || '#d4a574'
        }
      });

      if (error) throw error;

      if (data?.success && data?.images) {
        setConfig(prev => ({
          ...prev,
          logoUrl: data.images.logo_url || prev.logoUrl,
          faviconUrl: data.images.favicon_url || prev.faviconUrl,
        }));
        
        // Reload config to get logo_dark_url
        await loadConfig();
        await refreshBranding();
        
        toast.success("Logomarcas geradas com sucesso! Clique em Salvar para aplicar.");
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao gerar branding com IA:', error);
      toast.error(`Erro ao gerar imagens: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setGeneratingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-warning/50 bg-warning/10">
        <Palette className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Configuração de Branding</AlertTitle>
        <AlertDescription className="text-warning/90">
          <p className="mb-2">
            Configure a identidade visual do sistema. Essas configurações serão aplicadas 
            globalmente e podem ser herdadas ou personalizadas pelas barbearias.
          </p>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="identity" className="space-y-4">
        <TabsList className="bg-muted border border-border w-full sm:w-auto flex flex-wrap h-auto p-1 gap-1">
          <TabsTrigger value="identity" className="data-[state=active]:bg-warning data-[state=active]:text-warning-foreground text-xs sm:text-sm flex-1 sm:flex-none">
            <Type className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Identidade
          </TabsTrigger>
          <TabsTrigger value="images" className="data-[state=active]:bg-warning data-[state=active]:text-warning-foreground text-xs sm:text-sm flex-1 sm:flex-none">
            <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Imagens
          </TabsTrigger>
          <TabsTrigger value="colors" className="data-[state=active]:bg-warning data-[state=active]:text-warning-foreground text-xs sm:text-sm flex-1 sm:flex-none">
            <Palette className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Cores
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-warning data-[state=active]:text-warning-foreground text-xs sm:text-sm flex-1 sm:flex-none">
            <Settings2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Opções
          </TabsTrigger>
        </TabsList>

        {/* Identity Tab */}
        <TabsContent value="identity">
          <Card className="bg-card border-border">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-foreground text-sm sm:text-base">
                <Type className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                Identidade do Sistema
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                Nome e descrição do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground text-sm">Nome do Sistema</Label>
                <Input
                  value={config.systemName}
                  onChange={(e) => setConfig({ ...config, systemName: e.target.value })}
                  placeholder="BarberSmart"
                  className="bg-muted border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Nome exibido na interface e comunicações
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground text-sm">Tagline / Slogan</Label>
                <Textarea
                  value={config.tagline}
                  onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
                  placeholder="Gestão inteligente para sua barbearia"
                  rows={2}
                  className="bg-muted border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Frase de efeito exibida junto ao nome
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images">
          <Card className="bg-card border-border">
            <CardHeader className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground text-sm sm:text-base">
                    <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                    Logomarca e Ícones
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                    Imagens da marca
                  </CardDescription>
                </div>
                <Button
                  onClick={generateBrandingWithAI}
                  disabled={generatingAI}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  {generatingAI ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Gerar com IA
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 space-y-6">
              {/* Logo Modo Claro */}
              <div className="space-y-3">
                <Label className="text-foreground text-sm flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" />
                  Logo para Modo Claro
                </Label>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-white overflow-hidden">
                    {config.logoLightUrl ? (
                      <img src={config.logoLightUrl} alt="Logo Light" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoLightUpload}
                        disabled={uploadingLogoLight}
                        className="bg-muted border-border text-foreground"
                      />
                      {config.logoLightUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfig(prev => ({ ...prev, logoLightUrl: '' }))}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {uploadingLogoLight && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Logo exibido quando o tema claro está ativo
                    </p>
                  </div>
                </div>
              </div>

              {/* Logo Modo Escuro */}
              <div className="space-y-3">
                <Label className="text-foreground text-sm flex items-center gap-2">
                  <Moon className="h-4 w-4 text-indigo-400" />
                  Logo para Modo Escuro
                </Label>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-slate-900 overflow-hidden">
                    {config.logoDarkUrl ? (
                      <img src={config.logoDarkUrl} alt="Logo Dark" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoDarkUpload}
                        disabled={uploadingLogoDark}
                        className="bg-muted border-border text-foreground"
                      />
                      {config.logoDarkUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfig(prev => ({ ...prev, logoDarkUrl: '' }))}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {uploadingLogoDark && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Logo exibido quando o tema escuro está ativo
                    </p>
                  </div>
                </div>
              </div>

              {/* Logo Principal (Fallback) */}
              <div className="space-y-3 pt-4 border-t border-border">
                <Label className="text-foreground text-sm flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-warning" />
                  Logomarca Principal (Fallback)
                </Label>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                    {config.logoUrl ? (
                      <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="bg-muted border-border text-foreground"
                      />
                      {config.logoUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfig(prev => ({ ...prev, logoUrl: '' }))}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {uploadingLogo && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Usado quando não há logo específico para o tema. PNG ou SVG, 512x512px
                    </p>
                  </div>
                </div>
              </div>

              {/* Favicon */}
              <div className="space-y-3 pt-4 border-t border-border">
                <Label className="text-foreground text-sm">Favicon</Label>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted overflow-hidden">
                    {config.faviconUrl ? (
                      <img src={config.faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*,.ico"
                        onChange={handleFaviconUpload}
                        disabled={uploadingFavicon}
                        className="bg-muted border-border text-foreground"
                      />
                      {config.faviconUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfig(prev => ({ ...prev, faviconUrl: '' }))}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {uploadingFavicon && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Recomendado: ICO ou PNG, 32x32px ou 64x64px
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors">
          <Card className="bg-card border-border">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-foreground text-sm sm:text-base">
                <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                Paleta de Cores
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                Personalize as cores do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Primary */}
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">Primária</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.colors.primary}
                      onChange={(e) => updateColor('primary', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={config.colors.primary}
                      onChange={(e) => updateColor('primary', e.target.value)}
                      className="bg-muted border-border text-foreground text-xs flex-1"
                    />
                  </div>
                </div>

                {/* Secondary */}
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">Secundária</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.colors.secondary}
                      onChange={(e) => updateColor('secondary', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={config.colors.secondary}
                      onChange={(e) => updateColor('secondary', e.target.value)}
                      className="bg-muted border-border text-foreground text-xs flex-1"
                    />
                  </div>
                </div>

                {/* Warning (Accent) */}
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">Destaque</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.colors.warning}
                      onChange={(e) => updateColor('warning', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={config.colors.warning}
                      onChange={(e) => updateColor('warning', e.target.value)}
                      className="bg-muted border-border text-foreground text-xs flex-1"
                    />
                  </div>
                </div>

                {/* Success */}
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">Sucesso</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.colors.success}
                      onChange={(e) => updateColor('success', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={config.colors.success}
                      onChange={(e) => updateColor('success', e.target.value)}
                      className="bg-muted border-border text-foreground text-xs flex-1"
                    />
                  </div>
                </div>

                {/* Destructive */}
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">Destrutivo</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.colors.destructive}
                      onChange={(e) => updateColor('destructive', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-border"
                    />
                    <Input
                      value={config.colors.destructive}
                      onChange={(e) => updateColor('destructive', e.target.value)}
                      className="bg-muted border-border text-foreground text-xs flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 rounded-lg border border-border bg-muted">
                <p className="text-sm text-muted-foreground mb-3">Pré-visualização:</p>
                <div className="flex flex-wrap gap-2">
                  <div 
                    className="px-4 py-2 rounded text-sm font-medium text-white"
                    style={{ backgroundColor: config.colors.primary }}
                  >
                    Primária
                  </div>
                  <div 
                    className="px-4 py-2 rounded text-sm font-medium text-white"
                    style={{ backgroundColor: config.colors.secondary }}
                  >
                    Secundária
                  </div>
                  <div 
                    className="px-4 py-2 rounded text-sm font-medium text-white"
                    style={{ backgroundColor: config.colors.warning }}
                  >
                    Destaque
                  </div>
                  <div 
                    className="px-4 py-2 rounded text-sm font-medium text-white"
                    style={{ backgroundColor: config.colors.success }}
                  >
                    Sucesso
                  </div>
                  <div 
                    className="px-4 py-2 rounded text-sm font-medium text-white"
                    style={{ backgroundColor: config.colors.destructive }}
                  >
                    Destrutivo
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card className="bg-card border-border">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-foreground text-sm sm:text-base">
                <Settings2 className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                Opções de Personalização
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                Controle como as barbearias podem personalizar
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
              <div className="flex items-center justify-between p-3 sm:p-4 bg-muted rounded-lg gap-3">
                <div className="space-y-0.5 min-w-0">
                  <Label className="text-foreground text-sm">Permitir White-Label</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Barbearias com planos elegíveis podem personalizar cores e logo
                  </p>
                </div>
                <Switch
                  checked={config.allowTenantCustomization}
                  onCheckedChange={(checked) => setConfig({ ...config, allowTenantCustomization: checked })}
                />
              </div>

              <Alert className="border-info/50 bg-info/10">
                <Info className="h-4 w-4 text-info" />
                <AlertDescription className="text-info/90 text-xs sm:text-sm">
                  Quando ativado, as barbearias podem sobrescrever o branding global 
                  conforme permitido pelo seu plano de assinatura.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Button 
        onClick={saveConfig} 
        disabled={saving}
        className="bg-warning hover:bg-warning/90 text-warning-foreground w-full text-sm"
      >
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {saving ? "Salvando..." : "Salvar Configurações de Branding"}
      </Button>
    </div>
  );
};
