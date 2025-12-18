import { useState, useEffect } from "react";
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
  Settings2,
  Share2,
  QrCode,
  Info,
  CheckCircle2,
  Activity
} from "lucide-react";
import { useBarbershopDomain } from "@/hooks/useBarbershopDomain";
import { toast } from "@/components/ui/sonner";
import LandingThemeCustomizer from "./LandingThemeCustomizer";
import DnsVerificationStatus from "./DnsVerificationStatus";

const DomainSettings = () => {
  const [showDnsVerification, setShowDnsVerification] = useState(false);
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
    getPrimaryUrl,
  } = useBarbershopDomain();

  const [subdomain, setSubdomain] = useState(domain?.subdomain || "");
  const [customDomain, setCustomDomain] = useState(domain?.custom_domain || "");
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  // Update local state when domain changes
  useEffect(() => {
    if (domain?.subdomain) setSubdomain(domain.subdomain);
    if (domain?.custom_domain) setCustomDomain(domain.custom_domain);
  }, [domain?.subdomain, domain?.custom_domain]);

  // Get the public URL using configured domain (custom domain > subdomain)
  const publicUrl = getPrimaryUrl();

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
      toast.success("Link público configurado com sucesso!");
      setSubdomainAvailable(null);
    } else {
      toast.error(result.error || "Erro ao configurar link");
    }
  };

  const handleSaveCustomDomain = async () => {
    setSaving(true);
    const result = await saveCustomDomain(customDomain);
    setSaving(false);

    if (result.success) {
      toast.success("Domínio personalizado adicionado! Siga as instruções de configuração.");
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
    toast.success("Link copiado!");
  };

  const shareUrl = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Minha Barbearia',
          text: 'Agende seu horário!',
          url: url,
        });
      } catch (err) {
        // User cancelled share
      }
    } else {
      copyToClipboard(url);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: "Ativo" },
      pending: { variant: "secondary", label: "Pendente" },
      verifying: { variant: "outline", label: "Verificando DNS" },
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

  // Show DNS verification page if requested
  if (showDnsVerification) {
    return <DnsVerificationStatus onBack={() => setShowDnsVerification(false)} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Public Link Section - Always Functional */}
      {publicUrl && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
              <Share2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary" />
              <span className="truncate">Link Público da sua Barbearia</span>
              <Badge variant="default" className="ml-auto">Funcionando</Badge>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Compartilhe este link com seus clientes para agendamento online
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-background rounded-lg border space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                <span className="text-success font-medium">Link ativo e pronto para uso!</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Link className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-mono text-sm break-all flex-1">{publicUrl}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(publicUrl)}
                  className="flex-1 sm:flex-none"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shareUrl(publicUrl)}
                  className="flex-1 sm:flex-none"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(publicUrl, '_blank')}
                  className="flex-1 sm:flex-none"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Dica: Use este link em redes sociais, cartões de visita, WhatsApp e materiais de divulgação.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Domain Configuration Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
            <Globe className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            <span className="truncate">Configuração de Endereço</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm line-clamp-2">
            Configure o identificador único da sua barbearia ou use seu domínio próprio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="subdomain" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="subdomain" className="text-xs sm:text-sm py-2">Link Personalizado</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs sm:text-sm py-2">Domínio Próprio</TabsTrigger>
            </TabsList>

            {/* Subdomain Tab */}
            <TabsContent value="subdomain" className="space-y-4 mt-4">
              <Alert className="bg-muted/50">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Crie um identificador único para sua barbearia. Este nome será usado no link de compartilhamento.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="subdomain">Identificador da Barbearia</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex">
                    <div className="flex items-center px-2 sm:px-3 bg-muted border border-r-0 rounded-l-md text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                      /s/
                    </div>
                    <Input
                      id="subdomain"
                      placeholder="minhabarbearia"
                      value={subdomain}
                      onChange={(e) => {
                        setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                        setSubdomainAvailable(null);
                      }}
                      className="rounded-l-none min-w-0"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCheckSubdomain}
                    disabled={!subdomain.trim() || checkingSubdomain}
                    className="w-full sm:w-auto"
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
                        <span>Nome disponível!</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4" />
                        <span>Nome já está em uso ou é reservado.</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {domain?.subdomain && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="font-medium text-sm">Configurado: <span className="text-primary">{domain.subdomain}</span></span>
                    </div>
                    {getStatusBadge(domain.subdomain_status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Seu link público está funcionando e pronto para compartilhar.
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
                  "Salvar Identificador"
                )}
              </Button>
            </TabsContent>

            {/* Custom Domain Tab */}
            <TabsContent value="custom" className="space-y-4 mt-4">
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-700">Configuração Avançada</AlertTitle>
                <AlertDescription className="text-amber-700/80 text-xs">
                  Usar seu próprio domínio (ex: minhabarbearia.com.br) requer configuração de DNS no seu provedor de domínio e pode levar até 72 horas para propagar.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="customDomain">Seu Domínio</Label>
                <div className="flex flex-col sm:flex-row gap-2">
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
                    className="w-full sm:w-auto"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
                  </Button>
                </div>
              </div>

              {domain?.custom_domain && (
                <>
                  <Separator />
                  
                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium break-all">{domain.custom_domain}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(domain.custom_domain_status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDnsVerification(true)}
                          className="gap-1"
                        >
                          <Activity className="h-3.5 w-3.5" />
                          Ver Status DNS
                        </Button>
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
                      <div className="space-y-4">
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Passos para Configurar</AlertTitle>
                          <AlertDescription className="text-xs">
                            Siga estes passos no painel do seu provedor de domínio (Registro.br, GoDaddy, etc.)
                          </AlertDescription>
                        </Alert>
                        
                        <div className="space-y-3">
                          <div className="text-sm font-medium">1. Adicione os registros DNS:</div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="p-3 bg-background rounded border overflow-x-auto">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-muted-foreground font-medium">Registro A (raiz)</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6"
                                  onClick={() => copyToClipboard("185.158.133.1")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-1">
                                <span>Tipo</span>
                                <span>Nome</span>
                                <span>Valor</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                                <span className="bg-muted px-1 rounded">A</span>
                                <span className="bg-muted px-1 rounded">@</span>
                                <span className="break-all">185.158.133.1</span>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-background rounded border overflow-x-auto">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-muted-foreground font-medium">Registro A (www)</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6"
                                  onClick={() => copyToClipboard("185.158.133.1")}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-1">
                                <span>Tipo</span>
                                <span>Nome</span>
                                <span>Valor</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                                <span className="bg-muted px-1 rounded">A</span>
                                <span className="bg-muted px-1 rounded">www</span>
                                <span className="break-all">185.158.133.1</span>
                              </div>
                            </div>

                            {domain.dns_verification_token && (
                              <div className="p-3 bg-background rounded border overflow-x-auto">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs text-muted-foreground font-medium">Registro TXT (verificação)</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6"
                                    onClick={() => copyToClipboard(domain.dns_verification_token!)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-1">
                                  <span>Tipo</span>
                                  <span>Nome</span>
                                  <span>Valor</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                                  <span className="bg-muted px-1 rounded">TXT</span>
                                  <span className="bg-muted px-1 rounded">_lovable</span>
                                  <span className="break-all text-[10px]">{domain.dns_verification_token}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="text-sm font-medium">2. Aguarde a propagação DNS (até 72 horas)</div>
                          
                          <div className="text-sm font-medium">3. SSL será configurado automaticamente após verificação</div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted/50 rounded">
                          <Shield className="h-4 w-4 shrink-0" />
                          <span>Após a verificação DNS, o certificado SSL será provisionado automaticamente para conexão segura (HTTPS).</span>
                        </div>
                      </div>
                    )}

                    {domain.custom_domain_status === 'active' && (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">Domínio ativo e funcionando!</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {!domain?.custom_domain && (
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Enquanto configura seu domínio próprio, use o <strong>Link Personalizado</strong> acima para compartilhar sua barbearia.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Landing Page Settings */}
      {domain?.subdomain && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
              <Settings2 className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="truncate">Configurações da Landing Page</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Personalize a página inicial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-sm">Landing Page Ativada</Label>
                <p className="text-xs text-muted-foreground line-clamp-1">
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

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-2.5 sm:p-3 border rounded-lg">
                <span className="text-xs sm:text-sm">Mostrar Serviços</span>
                <Switch
                  checked={domain.landing_page_config?.show_services ?? true}
                  onCheckedChange={async (checked) => {
                    const result = await updateLandingPageConfig({ show_services: checked });
                    if (result.success) toast.success("Atualizado");
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 sm:p-3 border rounded-lg">
                <span className="text-xs sm:text-sm">Mostrar Equipe</span>
                <Switch
                  checked={domain.landing_page_config?.show_team ?? true}
                  onCheckedChange={async (checked) => {
                    const result = await updateLandingPageConfig({ show_team: checked });
                    if (result.success) toast.success("Atualizado");
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 sm:p-3 border rounded-lg">
                <span className="text-xs sm:text-sm">Mostrar Avaliações</span>
                <Switch
                  checked={domain.landing_page_config?.show_reviews ?? true}
                  onCheckedChange={async (checked) => {
                    const result = await updateLandingPageConfig({ show_reviews: checked });
                    if (result.success) toast.success("Atualizado");
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 sm:p-3 border rounded-lg">
                <span className="text-xs sm:text-sm">Mostrar Localização</span>
                <Switch
                  checked={domain.landing_page_config?.show_location ?? true}
                  onCheckedChange={async (checked) => {
                    const result = await updateLandingPageConfig({ show_location: checked });
                    if (result.success) toast.success("Atualizado");
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-2.5 sm:p-3 border rounded-lg">
                <span className="text-xs sm:text-sm">Mostrar Galeria</span>
                <Switch
                  checked={domain.landing_page_config?.show_gallery ?? true}
                  onCheckedChange={async (checked) => {
                    const result = await updateLandingPageConfig({ show_gallery: checked });
                    if (result.success) toast.success("Atualizado");
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
