import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { 
  Palette, 
  Image as ImageIcon, 
  Type, 
  Upload, 
  Check, 
  Trash2,
  Sparkles,
  Sun,
  Moon,
  Crown,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useBranding } from "@/contexts/BrandingContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface CustomBranding {
  system_name?: string;
  tagline?: string;
  logo_url?: string;
  logo_light_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

const defaultBranding: CustomBranding = {
  system_name: "",
  tagline: "",
  logo_url: "",
  logo_light_url: "",
  logo_dark_url: "",
  favicon_url: "",
  primary_color: "#d4a574",
  secondary_color: "#1a1a2e",
  accent_color: "#c9a86c",
};

const presetColors = [
  { name: "Dourado Clássico", primary: "#d4a574", secondary: "#1a1a2e", accent: "#c9a86c" },
  { name: "Azul Profissional", primary: "#3b82f6", secondary: "#1e293b", accent: "#60a5fa" },
  { name: "Verde Moderno", primary: "#10b981", secondary: "#0f172a", accent: "#34d399" },
  { name: "Roxo Elegante", primary: "#8b5cf6", secondary: "#1e1b4b", accent: "#a78bfa" },
  { name: "Vermelho Bold", primary: "#ef4444", secondary: "#1c1917", accent: "#f87171" },
  { name: "Laranja Vibrante", primary: "#f97316", secondary: "#1c1917", accent: "#fb923c" },
];

const BarbershopBrandingConfig = () => {
  const { barbershopId } = useAuth();
  const { refreshBranding } = useBranding();
  const { theme } = useTheme();
  const { planName, hasFeature, loading: featuresLoading } = useFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<CustomBranding>(defaultBranding);
  const [uploadingLogoLight, setUploadingLogoLight] = useState(false);
  const [uploadingLogoDark, setUploadingLogoDark] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  
  const logoLightInputRef = useRef<HTMLInputElement>(null);
  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (barbershopId) {
      fetchBranding();
    }
  }, [barbershopId]);

  const fetchBranding = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('barbershops')
        .select('custom_branding')
        .eq('id', barbershopId)
        .single();

      if (error) throw error;

      if (data?.custom_branding) {
        setBranding({
          ...defaultBranding,
          ...data.custom_branding,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('barbershops')
        .update({ custom_branding: branding })
        .eq('id', barbershopId);

      if (error) throw error;

      await refreshBranding();
      toast.success("Branding salvo com sucesso!");
    } catch (error: any) {
      console.error('Erro ao salvar branding:', error);
      toast.error("Erro ao salvar branding");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (
    file: File, 
    type: 'logo_light' | 'logo_dark' | 'favicon',
    setUploading: (v: boolean) => void
  ) => {
    if (!file || !barbershopId) return;

    const allowedTypes = type === 'favicon'
      ? ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
      : ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(type === 'favicon' ? 'Formato inválido. Use PNG, ICO, WebP ou SVG.' : 'Formato inválido. Use PNG, JPG, WebP ou SVG.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB.');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${barbershopId}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('public-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(fileName);

      const fieldMap: Record<string, string> = {
        logo_light: 'logo_light_url',
        logo_dark: 'logo_dark_url',
        favicon: 'favicon_url',
      };

      setBranding(prev => ({
        ...prev,
        [fieldMap[type]]: publicUrl,
      }));

      // Preview em tempo real do favicon na aba do navegador
      if (type === 'favicon') {
        const existingFavicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
        if (existingFavicon) {
          existingFavicon.href = publicUrl;
        } else {
          const newFavicon = document.createElement('link');
          newFavicon.rel = 'icon';
          newFavicon.href = publicUrl;
          document.head.appendChild(newFavicon);
        }
      }

      const labelMap: Record<string, string> = {
        logo_light: 'Logo (modo claro)',
        logo_dark: 'Logo (modo escuro)',
        favicon: 'Favicon',
      };

      toast.success(`${labelMap[type]} enviado com sucesso!`);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error(`Erro ao enviar imagem`);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (type: 'logo_light' | 'logo_dark' | 'favicon') => {
    const fieldMap: Record<string, string> = {
      logo_light: 'logo_light_url',
      logo_dark: 'logo_dark_url',
      favicon: 'favicon_url',
    };
    
    setBranding(prev => ({
      ...prev,
      [fieldMap[type]]: '',
    }));
  };

  const applyPreset = (preset: typeof presetColors[0]) => {
    setBranding(prev => ({
      ...prev,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent,
    }));
    toast.success(`Preset "${preset.name}" aplicado!`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
          <span className="truncate">Branding White-Label</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Personalize completamente a identidade visual do sistema
        </CardDescription>
        
        {/* Plan and Features Indicator */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Plano Atual:</span>
            <Badge variant="secondary" className="text-xs">
              {featuresLoading ? "Carregando..." : (planName || "Free")}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              {hasFeature('white_label') ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className={hasFeature('white_label') ? 'text-foreground' : 'text-muted-foreground'}>
                White Label
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasFeature('custom_domain') ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className={hasFeature('custom_domain') ? 'text-foreground' : 'text-muted-foreground'}>
                Domínio Próprio
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasFeature('multi_unit') ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className={hasFeature('multi_unit') ? 'text-foreground' : 'text-muted-foreground'}>
                Multi-unidade
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="identity" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto mb-4">
            <TabsTrigger value="identity" className="text-xs sm:text-sm py-2 px-1 sm:px-3 gap-1">
              <Type className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Identidade</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="text-xs sm:text-sm py-2 px-1 sm:px-3 gap-1">
              <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Imagens</span>
            </TabsTrigger>
            <TabsTrigger value="colors" className="text-xs sm:text-sm py-2 px-1 sm:px-3 gap-1">
              <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Cores</span>
            </TabsTrigger>
          </TabsList>

          {/* Identity Tab */}
          <TabsContent value="identity" className="space-y-4 mt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="system_name" className="text-xs sm:text-sm">
                  Nome do Sistema
                </Label>
                <Input
                  id="system_name"
                  placeholder="Minha Barbearia"
                  value={branding.system_name || ''}
                  onChange={(e) => setBranding(prev => ({ ...prev, system_name: e.target.value }))}
                  className="h-10 sm:h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Substitui "BarberSmart" no menu e cabeçalhos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline" className="text-xs sm:text-sm">
                  Tagline / Slogan
                </Label>
                <Input
                  id="tagline"
                  placeholder="A melhor barbearia da cidade"
                  value={branding.tagline || ''}
                  onChange={(e) => setBranding(prev => ({ ...prev, tagline: e.target.value }))}
                  className="h-10 sm:h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Aparece abaixo do nome no sistema
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <div className="flex items-center gap-3">
                {branding.logo_url ? (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={branding.logo_url} />
                    <AvatarFallback>{branding.system_name?.charAt(0) || 'B'}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold">
                      {branding.system_name?.charAt(0) || 'B'}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">
                    {branding.system_name || 'Nome do Sistema'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {branding.tagline || 'Seu slogan aqui'}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-4 mt-0">
            {/* Logo for Light Mode */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4 text-warning" />
                <Label className="text-xs sm:text-sm">Logo para Modo Claro</Label>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div 
                  className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors relative overflow-hidden bg-white"
                  onClick={() => logoLightInputRef.current?.click()}
                >
                  {uploadingLogoLight ? (
                    <LoadingSpinner size="sm" />
                  ) : branding.logo_light_url ? (
                    <img 
                      src={branding.logo_light_url} 
                      alt="Logo Claro" 
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <Upload className="h-6 w-6 text-gray-400" />
                  )}
                  <input
                    ref={logoLightInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]; e.currentTarget.value = '';
                      if (file) handleImageUpload(file, 'logo_light', setUploadingLogoLight);
                    }}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Logo exibido quando o tema claro está ativo. Use cores escuras para melhor contraste.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => logoLightInputRef.current?.click()}
                      disabled={uploadingLogoLight}
                      className="h-9"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    {branding.logo_light_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage('logo_light')}
                        className="h-9 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Logo for Dark Mode */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-primary" />
                <Label className="text-xs sm:text-sm">Logo para Modo Escuro</Label>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div 
                  className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors relative overflow-hidden bg-slate-900"
                  onClick={() => logoDarkInputRef.current?.click()}
                >
                  {uploadingLogoDark ? (
                    <LoadingSpinner size="sm" />
                  ) : branding.logo_dark_url ? (
                    <img 
                      src={branding.logo_dark_url} 
                      alt="Logo Escuro" 
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <Upload className="h-6 w-6 text-gray-500" />
                  )}
                  <input
                    ref={logoDarkInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]; e.currentTarget.value = '';
                      if (file) handleImageUpload(file, 'logo_dark', setUploadingLogoDark);
                    }}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Logo exibido quando o tema escuro está ativo. Use cores claras para melhor contraste.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => logoDarkInputRef.current?.click()}
                      disabled={uploadingLogoDark}
                      className="h-9"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    {branding.logo_dark_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage('logo_dark')}
                        className="h-9 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Favicon Upload */}
            <div className="space-y-3">
              <Label className="text-xs sm:text-sm">Favicon</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div 
                  className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors relative overflow-hidden"
                  onClick={() => faviconInputRef.current?.click()}
                >
                  {uploadingFavicon ? (
                    <LoadingSpinner size="sm" />
                  ) : branding.favicon_url ? (
                    <img 
                      src={branding.favicon_url} 
                      alt="Favicon" 
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]; e.currentTarget.value = '';
                      if (file) handleImageUpload(file, 'favicon', setUploadingFavicon);
                    }}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Ícone na aba do navegador. Recomendado: 32x32px ou 64x64px, PNG ou ICO.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={uploadingFavicon}
                      className="h-9"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    {branding.favicon_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage('favicon')}
                        className="h-9 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-4 mt-0">
            {/* Presets */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Paletas Pré-definidas</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {presetColors.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="p-2 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex gap-1 mb-1.5">
                      <div 
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div 
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border"
                        style={{ backgroundColor: preset.secondary }}
                      />
                      <div 
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                    <p className="text-xs truncate">{preset.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Custom Colors */}
            <div className="space-y-4">
              <Label className="text-xs sm:text-sm">Cores Personalizadas</Label>
              
              <div className="grid gap-4">
                {/* Primary Color */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={branding.primary_color || '#d4a574'}
                      onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg cursor-pointer border-2"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs sm:text-sm">Cor Primária</Label>
                    <Input
                      value={branding.primary_color || ''}
                      onChange={(e) => setBranding(prev => ({ ...prev, primary_color: e.target.value }))}
                      placeholder="#d4a574"
                      className="h-9 font-mono text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={branding.secondary_color || '#1a1a2e'}
                      onChange={(e) => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg cursor-pointer border-2"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs sm:text-sm">Cor Secundária</Label>
                    <Input
                      value={branding.secondary_color || ''}
                      onChange={(e) => setBranding(prev => ({ ...prev, secondary_color: e.target.value }))}
                      placeholder="#1a1a2e"
                      className="h-9 font-mono text-xs sm:text-sm"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={branding.accent_color || '#c9a86c'}
                      onChange={(e) => setBranding(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg cursor-pointer border-2"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs sm:text-sm">Cor de Destaque</Label>
                    <Input
                      value={branding.accent_color || ''}
                      onChange={(e) => setBranding(prev => ({ ...prev, accent_color: e.target.value }))}
                      placeholder="#c9a86c"
                      className="h-9 font-mono text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Color Preview */}
            <div className="p-4 rounded-lg border space-y-3">
              <p className="text-xs text-muted-foreground">Preview das cores:</p>
              <div className="flex gap-2 flex-wrap">
                <div 
                  className="px-4 py-2 rounded-md text-white text-xs sm:text-sm font-medium"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  Primária
                </div>
                <div 
                  className="px-4 py-2 rounded-md text-white text-xs sm:text-sm font-medium"
                  style={{ backgroundColor: branding.secondary_color }}
                >
                  Secundária
                </div>
                <div 
                  className="px-4 py-2 rounded-md text-white text-xs sm:text-sm font-medium"
                  style={{ backgroundColor: branding.accent_color }}
                >
                  Destaque
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button
            variant="outline"
            onClick={fetchBranding}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            Resetar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Salvar Branding
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BarbershopBrandingConfig;
