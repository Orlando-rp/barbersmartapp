import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Globe, 
  Link, 
  Check, 
  X, 
  Loader2, 
  Copy, 
  ExternalLink,
  AlertCircle,
  Shield,
  Settings2
} from "lucide-react";
import { useBarbershopDomain } from "@/hooks/useBarbershopDomain";
import { toast } from "@/components/ui/sonner";
import LandingThemeCustomizer from "./LandingThemeCustomizer";

const DomainSettings = () => {
  const {
    domain,
    loading,
    baseDomain,
    checkSubdomainAvailability,
    saveSubdomain,
    saveCustomDomain,
    removeCustomDomain,
    updateLandingPageConfig,
    getFullSubdomainUrl,
    getFullCustomDomainUrl,
  } = useBarbershopDomain();

  const [subdomain, setSubdomain] = useState(domain?.subdomain || "");
  const [customDomain, setCustomDomain] = useState(domain?.custom_domain || "");
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  // Update local state when domain changes
  useState(() => {
    if (domain?.subdomain) setSubdomain(domain.subdomain);
    if (domain?.custom_domain) setCustomDomain(domain.custom_domain);
  });

  const handleCheckSubdomain = async () => {
    if (!subdomain.trim()) return;
    
    setCheckingSubdomain(true);
    const available = await checkSubdomainAvailability(subdomain);
    setSubdomainAvailable(available);
    setCheckingSubdomain(false);
  };

  const handleSaveSubdomain = async () => {
    setSaving(true);
    const result = await saveSubdomain(subdomain);
    setSaving(false);

    if (result.success) {
      toast.success("Subdomínio configurado com sucesso!");
      setSubdomainAvailable(null);
    } else {
      toast.error(result.error || "Erro ao configurar subdomínio");
    }
  };

  const handleSaveCustomDomain = async () => {
    setSaving(true);
    const result = await saveCustomDomain(customDomain);
    setSaving(false);

    if (result.success) {
      toast.success("Domínio personalizado adicionado! Configure o DNS para ativar.");
    } else {
      toast.error(result.error || "Erro ao configurar domínio");
    }
  };

  const handleRemoveCustomDomain = async () => {
    setSaving(true);
    const result = await removeCustomDomain();
    setSaving(false);

    if (result.success) {
      toast.success("Domínio personalizado removido");
      setCustomDomain("");
    } else {
      toast.error(result.error || "Erro ao remover domínio");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: "Ativo" },
      pending: { variant: "secondary", label: "Pendente" },
      verifying: { variant: "outline", label: "Verificando" },
      failed: { variant: "destructive", label: "Falhou" },
      disabled: { variant: "secondary", label: "Desativado" },
    };
    
    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Configuração de Domínio
          </CardTitle>
          <CardDescription>
            Configure o subdomínio gratuito ou seu próprio domínio personalizado para a página da sua barbearia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="subdomain" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="subdomain">Subdomínio Gratuito</TabsTrigger>
              <TabsTrigger value="custom">Domínio Personalizado</TabsTrigger>
            </TabsList>

            {/* Subdomain Tab */}
            <TabsContent value="subdomain" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="subdomain">Seu Subdomínio</Label>
                <div className="flex gap-2">
                  <div className="flex-1 flex">
                    <Input
                      id="subdomain"
                      placeholder="minhabarbearia"
                      value={subdomain}
                      onChange={(e) => {
                        setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                        setSubdomainAvailable(null);
                      }}
                      className="rounded-r-none"
                    />
                    <div className="flex items-center px-3 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                      .{baseDomain}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCheckSubdomain}
                    disabled={!subdomain.trim() || checkingSubdomain}
                  >
                    {checkingSubdomain ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Verificar"
                    )}
                  </Button>
                </div>
                
                {subdomainAvailable !== null && (
                  <div className={`flex items-center gap-2 text-sm ${subdomainAvailable ? 'text-success' : 'text-destructive'}`}>
                    {subdomainAvailable ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Subdomínio disponível!</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4" />
                        <span>Subdomínio já está em uso ou é reservado.</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {domain?.subdomain && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm break-all">{`${window.location.origin}/s/${domain.subdomain}`}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(domain.subdomain_status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(`${window.location.origin}/s/${domain.subdomain}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(`${window.location.origin}/s/${domain.subdomain}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Esta URL leva para a landing page da sua barbearia com informações, serviços, equipe e botão de agendamento.
                  </p>
                </div>
              )}

              <Button
                onClick={handleSaveSubdomain}
                disabled={saving || !subdomain.trim() || subdomain === domain?.subdomain}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Subdomínio"
                )}
              </Button>
            </TabsContent>

            {/* Custom Domain Tab */}
            <TabsContent value="custom" className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Domínio Personalizado</AlertTitle>
                <AlertDescription>
                  Para usar seu próprio domínio, você precisará configurar os registros DNS apontando para nossos servidores.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="customDomain">Seu Domínio</Label>
                <div className="flex gap-2">
                  <Input
                    id="customDomain"
                    placeholder="minhabarbearia.com.br"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSaveCustomDomain}
                    disabled={saving || !customDomain.trim()}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
                  </Button>
                </div>
              </div>

              {domain?.custom_domain && (
                <>
                  <Separator />
                  
                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{domain.custom_domain}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(domain.custom_domain_status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveCustomDomain}
                          className="text-destructive hover:text-destructive"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>

                    {domain.custom_domain_status !== 'active' && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Configure os seguintes registros DNS no seu provedor de domínio:
                        </p>
                        
                        <div className="space-y-2 font-mono text-sm">
                          <div className="p-3 bg-background rounded border">
                            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-1">
                              <span>Tipo</span>
                              <span>Nome</span>
                              <span>Valor</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <span>A</span>
                              <span>@</span>
                              <span>185.158.133.1</span>
                            </div>
                          </div>
                          
                          <div className="p-3 bg-background rounded border">
                            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-1">
                              <span>Tipo</span>
                              <span>Nome</span>
                              <span>Valor</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <span>A</span>
                              <span>www</span>
                              <span>185.158.133.1</span>
                            </div>
                          </div>

                          {domain.dns_verification_token && (
                            <div className="p-3 bg-background rounded border">
                              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-1">
                                <span>Tipo</span>
                                <span>Nome</span>
                                <span>Valor</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <span>TXT</span>
                                <span>_lovable</span>
                                <span className="break-all">{domain.dns_verification_token}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Shield className="h-4 w-4" />
                          <span>SSL será provisionado automaticamente após a verificação DNS.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Landing Page Settings */}
      {domain?.subdomain && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurações da Landing Page
            </CardTitle>
            <CardDescription>
              Personalize a página inicial da sua barbearia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Landing Page Ativada</Label>
                <p className="text-sm text-muted-foreground">
                  Exibir página inicial antes do agendamento
                </p>
              </div>
              <Switch
                checked={domain.landing_page_enabled}
                onCheckedChange={async (checked) => {
                  const result = await updateLandingPageConfig({});
                  if (!result.success) {
                    toast.error(result.error);
                  }
                }}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Mostrar Serviços</span>
                <Switch
                  checked={domain.landing_page_config?.show_services ?? true}
                  onCheckedChange={async (checked) => {
                    const result = await updateLandingPageConfig({ show_services: checked });
                    if (result.success) toast.success("Configuração atualizada");
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Mostrar Equipe</span>
                <Switch
                  checked={domain.landing_page_config?.show_team ?? true}
                  onCheckedChange={async (checked) => {
                    const result = await updateLandingPageConfig({ show_team: checked });
                    if (result.success) toast.success("Configuração atualizada");
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Mostrar Avaliações</span>
                <Switch
                  checked={domain.landing_page_config?.show_reviews ?? true}
                  onCheckedChange={async (checked) => {
                    const result = await updateLandingPageConfig({ show_reviews: checked });
                    if (result.success) toast.success("Configuração atualizada");
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Mostrar Localização</span>
                <Switch
                  checked={domain.landing_page_config?.show_location ?? true}
                  onCheckedChange={async (checked) => {
                    const result = await updateLandingPageConfig({ show_location: checked });
                    if (result.success) toast.success("Configuração atualizada");
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Mostrar Galeria/Portfolio</span>
                <Switch
                  checked={domain.landing_page_config?.show_gallery ?? true}
                  onCheckedChange={async (checked) => {
                    const result = await updateLandingPageConfig({ show_gallery: checked });
                    if (result.success) toast.success("Configuração atualizada");
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Theme Customizer */}
      {domain?.subdomain && (
        <LandingThemeCustomizer
          config={{
            primary_color: domain.landing_page_config?.primary_color,
            secondary_color: domain.landing_page_config?.secondary_color,
            accent_color: domain.landing_page_config?.accent_color,
            background_color: domain.landing_page_config?.background_color,
            text_color: domain.landing_page_config?.text_color,
            hero_title: domain.landing_page_config?.hero_title,
            hero_subtitle: domain.landing_page_config?.hero_subtitle,
            hero_image_url: domain.landing_page_config?.hero_image_url,
            button_style: domain.landing_page_config?.button_style,
            font_family: domain.landing_page_config?.font_family,
          }}
          onSave={async (themeConfig) => {
            return await updateLandingPageConfig(themeConfig);
          }}
          previewUrl={`${window.location.origin}/s/${domain.subdomain}`}
        />
      )}
    </div>
  );
};

export default DomainSettings;
