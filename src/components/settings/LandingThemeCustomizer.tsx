import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Palette, 
  Type, 
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Eye
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface ThemeConfig {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_image_url?: string;
  button_style?: 'rounded' | 'square' | 'pill';
  font_family?: string;
}

interface LandingThemeCustomizerProps {
  config: ThemeConfig;
  onSave: (config: ThemeConfig) => Promise<{ success: boolean; error?: string }>;
  previewUrl?: string;
}

const presetThemes = [
  {
    name: "Clássico",
    colors: {
      primary_color: "#1a1a1a",
      secondary_color: "#333333",
      accent_color: "#d4af37",
      background_color: "#ffffff",
      text_color: "#1a1a1a",
    }
  },
  {
    name: "Moderno",
    colors: {
      primary_color: "#0f172a",
      secondary_color: "#1e293b",
      accent_color: "#3b82f6",
      background_color: "#f8fafc",
      text_color: "#0f172a",
    }
  },
  {
    name: "Vintage",
    colors: {
      primary_color: "#5c4033",
      secondary_color: "#8b7355",
      accent_color: "#c19a6b",
      background_color: "#f5f0e8",
      text_color: "#3d2914",
    }
  },
  {
    name: "Escuro",
    colors: {
      primary_color: "#0a0a0a",
      secondary_color: "#171717",
      accent_color: "#fbbf24",
      background_color: "#0a0a0a",
      text_color: "#fafafa",
    }
  },
  {
    name: "Elegante",
    colors: {
      primary_color: "#1e1b4b",
      secondary_color: "#312e81",
      accent_color: "#a855f7",
      background_color: "#faf5ff",
      text_color: "#1e1b4b",
    }
  },
  {
    name: "Natural",
    colors: {
      primary_color: "#14532d",
      secondary_color: "#166534",
      accent_color: "#22c55e",
      background_color: "#f0fdf4",
      text_color: "#14532d",
    }
  },
];

const fontOptions = [
  { value: "Inter", label: "Inter (Moderno)" },
  { value: "Playfair Display", label: "Playfair (Elegante)" },
  { value: "Roboto", label: "Roboto (Limpo)" },
  { value: "Montserrat", label: "Montserrat (Sofisticado)" },
  { value: "Poppins", label: "Poppins (Amigável)" },
  { value: "Oswald", label: "Oswald (Impactante)" },
];

const buttonStyles = [
  { value: "rounded", label: "Arredondado" },
  { value: "square", label: "Quadrado" },
  { value: "pill", label: "Pílula" },
];

const LandingThemeCustomizer = ({ config, onSave, previewUrl }: LandingThemeCustomizerProps) => {
  const [localConfig, setLocalConfig] = useState<ThemeConfig>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleChange = (key: keyof ThemeConfig, value: string) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await onSave(localConfig);
    setSaving(false);

    if (result.success) {
      toast.success("Tema salvo com sucesso!");
    } else {
      toast.error(result.error || "Erro ao salvar tema");
    }
  };

  const applyPreset = (preset: typeof presetThemes[0]) => {
    setLocalConfig(prev => ({
      ...prev,
      ...preset.colors
    }));
    toast.success(`Tema "${preset.name}" aplicado! Clique em Salvar para confirmar.`);
  };

  const resetToDefaults = () => {
    setLocalConfig({
      primary_color: "",
      secondary_color: "",
      accent_color: "",
      background_color: "",
      text_color: "",
      hero_title: "",
      hero_subtitle: "",
      hero_image_url: "",
      button_style: "rounded",
      font_family: "",
    });
    toast.info("Configurações resetadas para o padrão");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
          <Palette className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          <span className="truncate">Personalização de Tema</span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Personalize cores e aparência da landing page
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="colors" className="text-xs sm:text-sm py-2">Cores</TabsTrigger>
            <TabsTrigger value="content" className="text-xs sm:text-sm py-2">Conteúdo</TabsTrigger>
            <TabsTrigger value="style" className="text-xs sm:text-sm py-2">Estilo</TabsTrigger>
          </TabsList>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-4 sm:space-y-6 mt-4">
            {/* Preset Themes */}
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm font-medium">Temas Prontos</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {presetThemes.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="p-2 sm:p-3 rounded-lg border hover:border-primary transition-colors text-left"
                  >
                    <div className="flex gap-1 mb-1.5 sm:mb-2">
                      <div
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                        style={{ backgroundColor: preset.colors.primary_color }}
                      />
                      <div
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                        style={{ backgroundColor: preset.colors.accent_color }}
                      />
                      <div
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                        style={{ backgroundColor: preset.colors.background_color }}
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-medium">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="primary_color" className="text-xs sm:text-sm">Cor Principal</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="primary_color"
                    value={localConfig.primary_color || "#1a1a1a"}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className="w-10 h-9 sm:w-12 sm:h-10 p-1 cursor-pointer shrink-0"
                  />
                  <Input
                    type="text"
                    value={localConfig.primary_color || ""}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    placeholder="#1a1a1a"
                    className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accent_color" className="text-xs sm:text-sm">Cor de Destaque</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="accent_color"
                    value={localConfig.accent_color || "#d4af37"}
                    onChange={(e) => handleChange('accent_color', e.target.value)}
                    className="w-10 h-9 sm:w-12 sm:h-10 p-1 cursor-pointer shrink-0"
                  />
                  <Input
                    type="text"
                    value={localConfig.accent_color || ""}
                    onChange={(e) => handleChange('accent_color', e.target.value)}
                    placeholder="#d4af37"
                    className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="background_color" className="text-xs sm:text-sm">Cor de Fundo</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="background_color"
                    value={localConfig.background_color || "#ffffff"}
                    onChange={(e) => handleChange('background_color', e.target.value)}
                    className="w-10 h-9 sm:w-12 sm:h-10 p-1 cursor-pointer shrink-0"
                  />
                  <Input
                    type="text"
                    value={localConfig.background_color || ""}
                    onChange={(e) => handleChange('background_color', e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="text_color" className="text-xs sm:text-sm">Cor do Texto</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="text_color"
                    value={localConfig.text_color || "#1a1a1a"}
                    onChange={(e) => handleChange('text_color', e.target.value)}
                    className="w-10 h-9 sm:w-12 sm:h-10 p-1 cursor-pointer shrink-0"
                  />
                  <Input
                    type="text"
                    value={localConfig.text_color || ""}
                    onChange={(e) => handleChange('text_color', e.target.value)}
                    placeholder="#1a1a1a"
                    className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 sm:p-4 rounded-lg border">
              <Label className="text-xs text-muted-foreground mb-2 sm:mb-3 block">Prévia</Label>
              <div 
                className="p-4 sm:p-6 rounded-lg"
                style={{ backgroundColor: localConfig.background_color || '#ffffff' }}
              >
                <h3 
                  className="text-sm sm:text-lg font-bold mb-2"
                  style={{ color: localConfig.primary_color || '#1a1a1a' }}
                >
                  Título de Exemplo
                </h3>
                <p 
                  className="text-xs sm:text-sm mb-3 sm:mb-4"
                  style={{ color: localConfig.text_color || '#1a1a1a' }}
                >
                  Texto de exemplo para visualizar.
                </p>
                <button
                  className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-white text-xs sm:text-sm font-medium"
                  style={{ backgroundColor: localConfig.accent_color || '#d4af37' }}
                >
                  Botão
                </button>
              </div>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-3 sm:space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="hero_title" className="text-xs sm:text-sm">Título Principal (Hero)</Label>
              <Input
                id="hero_title"
                value={localConfig.hero_title || ""}
                onChange={(e) => handleChange('hero_title', e.target.value)}
                placeholder="Nome da sua barbearia"
                className="h-9 sm:h-10 text-sm"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Deixe vazio para usar o nome da barbearia
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hero_subtitle" className="text-xs sm:text-sm">Subtítulo (Hero)</Label>
              <Textarea
                id="hero_subtitle"
                value={localConfig.hero_subtitle || ""}
                onChange={(e) => handleChange('hero_subtitle', e.target.value)}
                placeholder="Uma descrição atrativa"
                rows={2}
                className="text-sm"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Deixe vazio para usar a descrição padrão
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hero_image_url" className="flex items-center gap-2 text-xs sm:text-sm">
                <ImageIcon className="h-3.5 w-3.5" />
                Imagem de Fundo (Hero)
              </Label>
              <Input
                id="hero_image_url"
                value={localConfig.hero_image_url || ""}
                onChange={(e) => handleChange('hero_image_url', e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                className="h-9 sm:h-10 text-sm"
              />
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                URL de uma imagem para o fundo
              </p>
            </div>
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style" className="space-y-3 sm:space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="font_family" className="flex items-center gap-2 text-xs sm:text-sm">
                <Type className="h-3.5 w-3.5" />
                Fonte
              </Label>
              <select
                id="font_family"
                value={localConfig.font_family || ""}
                onChange={(e) => handleChange('font_family', e.target.value)}
                className="w-full h-9 sm:h-10 px-3 rounded-md border bg-background text-foreground text-xs sm:text-sm"
              >
                <option value="">Padrão do Sistema</option>
                {fontOptions.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Estilo dos Botões</Label>
              <div className="grid grid-cols-3 gap-2">
                {buttonStyles.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => handleChange('button_style', style.value)}
                    className={`p-2 sm:p-3 rounded-lg border text-xs sm:text-sm transition-colors ${
                      localConfig.button_style === style.value
                        ? 'border-primary bg-primary/10'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <div className="flex justify-center mb-1.5 sm:mb-2">
                      <div
                        className={`px-2 sm:px-3 py-1 bg-primary text-primary-foreground text-[10px] sm:text-xs ${
                          style.value === 'rounded' ? 'rounded-md' :
                          style.value === 'square' ? 'rounded-none' : 'rounded-full'
                        }`}
                      >
                        Btn
                      </div>
                    </div>
                    <span>{style.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
          <Button onClick={handleSave} disabled={saving} size="sm" className="flex-1">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Tema"
            )}
          </Button>
          
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Resetar
          </Button>

          {previewUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(previewUrl, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Ver
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LandingThemeCustomizer;
