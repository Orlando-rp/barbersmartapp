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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Personalização de Tema
        </CardTitle>
        <CardDescription>
          Personalize as cores e aparência da sua landing page
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="colors" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors">Cores</TabsTrigger>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="style">Estilo</TabsTrigger>
          </TabsList>

          {/* Colors Tab */}
          <TabsContent value="colors" className="space-y-6 mt-4">
            {/* Preset Themes */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Temas Prontos</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {presetThemes.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="p-3 rounded-lg border hover:border-primary transition-colors text-left"
                  >
                    <div className="flex gap-1 mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.colors.primary_color }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.colors.accent_color }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: preset.colors.background_color }}
                      />
                    </div>
                    <span className="text-sm font-medium">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Cor Principal</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="primary_color"
                    value={localConfig.primary_color || "#1a1a1a"}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={localConfig.primary_color || ""}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    placeholder="#1a1a1a"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_color">Cor Secundária</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="secondary_color"
                    value={localConfig.secondary_color || "#333333"}
                    onChange={(e) => handleChange('secondary_color', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={localConfig.secondary_color || ""}
                    onChange={(e) => handleChange('secondary_color', e.target.value)}
                    placeholder="#333333"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent_color">Cor de Destaque</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="accent_color"
                    value={localConfig.accent_color || "#d4af37"}
                    onChange={(e) => handleChange('accent_color', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={localConfig.accent_color || ""}
                    onChange={(e) => handleChange('accent_color', e.target.value)}
                    placeholder="#d4af37"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="background_color">Cor de Fundo</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="background_color"
                    value={localConfig.background_color || "#ffffff"}
                    onChange={(e) => handleChange('background_color', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={localConfig.background_color || ""}
                    onChange={(e) => handleChange('background_color', e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text_color">Cor do Texto</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    id="text_color"
                    value={localConfig.text_color || "#1a1a1a"}
                    onChange={(e) => handleChange('text_color', e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={localConfig.text_color || ""}
                    onChange={(e) => handleChange('text_color', e.target.value)}
                    placeholder="#1a1a1a"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-lg border">
              <Label className="text-sm text-muted-foreground mb-3 block">Prévia das Cores</Label>
              <div 
                className="p-6 rounded-lg"
                style={{ backgroundColor: localConfig.background_color || '#ffffff' }}
              >
                <h3 
                  className="text-lg font-bold mb-2"
                  style={{ color: localConfig.primary_color || '#1a1a1a' }}
                >
                  Título de Exemplo
                </h3>
                <p 
                  className="text-sm mb-4"
                  style={{ color: localConfig.text_color || '#1a1a1a' }}
                >
                  Este é um texto de exemplo para visualizar as cores.
                </p>
                <button
                  className="px-4 py-2 rounded-md text-white text-sm font-medium"
                  style={{ backgroundColor: localConfig.accent_color || '#d4af37' }}
                >
                  Botão de Destaque
                </button>
              </div>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="hero_title">Título Principal (Hero)</Label>
              <Input
                id="hero_title"
                value={localConfig.hero_title || ""}
                onChange={(e) => handleChange('hero_title', e.target.value)}
                placeholder="Nome da sua barbearia"
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para usar o nome da barbearia
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero_subtitle">Subtítulo (Hero)</Label>
              <Textarea
                id="hero_subtitle"
                value={localConfig.hero_subtitle || ""}
                onChange={(e) => handleChange('hero_subtitle', e.target.value)}
                placeholder="Uma descrição atrativa da sua barbearia"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para usar a descrição padrão
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero_image_url" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Imagem de Fundo (Hero)
              </Label>
              <Input
                id="hero_image_url"
                value={localConfig.hero_image_url || ""}
                onChange={(e) => handleChange('hero_image_url', e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              <p className="text-xs text-muted-foreground">
                URL de uma imagem para o fundo da seção hero
              </p>
            </div>
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="font_family" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Fonte
              </Label>
              <select
                id="font_family"
                value={localConfig.font_family || ""}
                onChange={(e) => handleChange('font_family', e.target.value)}
                className="w-full h-10 px-3 rounded-md border bg-background text-foreground"
              >
                <option value="">Padrão do Sistema</option>
                {fontOptions.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Estilo dos Botões</Label>
              <div className="grid grid-cols-3 gap-2">
                {buttonStyles.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => handleChange('button_style', style.value)}
                    className={`p-3 rounded-lg border text-sm transition-colors ${
                      localConfig.button_style === style.value
                        ? 'border-primary bg-primary/10'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <div className="flex justify-center mb-2">
                      <div
                        className={`px-3 py-1 bg-primary text-primary-foreground text-xs ${
                          style.value === 'rounded' ? 'rounded-md' :
                          style.value === 'square' ? 'rounded-none' : 'rounded-full'
                        }`}
                      >
                        Botão
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
        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Tema"
            )}
          </Button>
          
          <Button variant="outline" onClick={resetToDefaults}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Resetar
          </Button>

          {previewUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(previewUrl, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Visualizar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LandingThemeCustomizer;
