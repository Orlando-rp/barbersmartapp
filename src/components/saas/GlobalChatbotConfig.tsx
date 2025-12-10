import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  ExternalLink, 
  RefreshCw,
  Loader2,
  Save,
  Info,
  CheckCircle,
  XCircle,
  Building2,
  Settings,
  Sparkles,
  Brain
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface GlobalChatbotConfig {
  enabled: boolean;
  model: string;
  maxTokens: number;
  temperature: number;
  systemPromptTemplate: string;
}

interface BarbershopChatbotStatus {
  id: string;
  name: string;
  chatbotEnabled: boolean;
  conversationsCount: number;
  appointmentsCreated: number;
}

export const GlobalChatbotConfig = () => {
  const [config, setConfig] = useState<GlobalChatbotConfig>({
    enabled: true,
    model: 'gpt-4o-mini',
    maxTokens: 500,
    temperature: 0.7,
    systemPromptTemplate: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [barbershopStatuses, setBarbershopStatuses] = useState<BarbershopChatbotStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [savingApiKey, setSavingApiKey] = useState(false);

  const defaultSystemPrompt = `Você é um assistente virtual da barbearia "{barbershop_name}".
Seu objetivo é ajudar clientes a agendar, reagendar ou cancelar compromissos de forma amigável e eficiente.

REGRAS:
1. Seja sempre educado e profissional
2. Use português brasileiro informal mas respeitoso
3. Responda de forma concisa (máximo 3 frases quando possível)
4. Guie o cliente pelo processo de agendamento passo a passo
5. Confirme cada informação antes de prosseguir

FLUXO DE AGENDAMENTO:
1. Cumprimentar e perguntar qual serviço deseja
2. Perguntar preferência de profissional
3. Sugerir datas/horários disponíveis
4. Confirmar nome do cliente
5. Confirmar todos os dados e finalizar agendamento`;

  useEffect(() => {
    loadGlobalConfig();
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'openai_api_key')
        .maybeSingle();
      
      if (data?.value?.api_key) {
        setApiKeyConfigured(true);
        const key = data.value.api_key;
        setApiKey(key.substring(0, 7) + '...' + key.substring(key.length - 4));
      }
    } catch (error) {
      console.error('Erro ao verificar API key:', error);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey || apiKey.includes('...')) {
      toast.error("Digite a API Key completa");
      return;
    }
    
    try {
      setSavingApiKey(true);
      
      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'openai_api_key',
          value: { api_key: apiKey },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;
      
      setApiKeyConfigured(true);
      setApiKey(apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4));
      toast.success("API Key salva com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar API key:', error);
      toast.error("Erro ao salvar API Key");
    } finally {
      setSavingApiKey(false);
    }
  };

  const loadGlobalConfig = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('chatbot_config')
        .select('*')
        .is('barbershop_id', null)
        .maybeSingle();

      if (error && !error.message?.includes('does not exist')) {
        console.error('Erro ao carregar config global:', error);
      }

      if (data?.config) {
        setConfig({
          enabled: data.config.enabled ?? true,
          model: data.config.model || 'gpt-4o-mini',
          maxTokens: data.config.max_tokens || 500,
          temperature: data.config.temperature || 0.7,
          systemPromptTemplate: data.config.system_prompt_template || defaultSystemPrompt
        });
      } else {
        setConfig(prev => ({
          ...prev,
          systemPromptTemplate: defaultSystemPrompt
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar configuração global:', error);
      setConfig(prev => ({
        ...prev,
        systemPromptTemplate: defaultSystemPrompt
      }));
    } finally {
      setLoading(false);
    }
  };

  const saveGlobalConfig = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('whatsapp_config')
        .upsert({
          barbershop_id: null,
          provider: 'chatbot',
          config: {
            enabled: config.enabled,
            model: config.model,
            max_tokens: config.maxTokens,
            temperature: config.temperature,
            system_prompt_template: config.systemPromptTemplate
          },
          is_active: config.enabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'barbershop_id,provider'
        });

      if (error) throw error;

      toast.success("Configuração do Chatbot salva com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const loadBarbershopStatuses = async () => {
    try {
      setLoadingStatuses(true);

      const { data: barbershops, error: shopError } = await supabase
        .from('barbershops')
        .select('id, name');

      if (shopError) throw shopError;

      const statuses: BarbershopChatbotStatus[] = [];

      for (const shop of barbershops || []) {
        const { data: whatsappConfig } = await supabase
          .from('whatsapp_config')
          .select('chatbot_enabled')
          .eq('barbershop_id', shop.id)
          .maybeSingle();

        const { count: conversationsCount } = await supabase
          .from('chatbot_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', shop.id);

        const appointmentsCreated = 0;

        statuses.push({
          id: shop.id,
          name: shop.name,
          chatbotEnabled: whatsappConfig?.chatbot_enabled || false,
          conversationsCount: conversationsCount || 0,
          appointmentsCreated
        });
      }

      setBarbershopStatuses(statuses);
    } catch (error) {
      console.error('Erro ao carregar status das barbearias:', error);
      toast.error("Erro ao carregar status das barbearias");
    } finally {
      setLoadingStatuses(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-primary/50 bg-primary/10">
        <Bot className="h-4 w-4 text-primary" />
        <AlertTitle className="text-primary">Chatbot IA - Configuração Global</AlertTitle>
        <AlertDescription className="text-primary/90">
          <p className="mb-2">
            Configure aqui o chatbot de IA para agendamento automático via WhatsApp. 
            Todas as barbearias herdarão essas configurações de modelo e prompt.
          </p>
          <p className="text-sm">
            O chatbot usa OpenAI GPT para entender mensagens e agendar compromissos automaticamente.
          </p>
        </AlertDescription>
      </Alert>

      {/* API Key Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Settings className="h-5 w-5 text-warning" />
            Configuração da API OpenAI
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Configure sua chave de API da OpenAI para habilitar o chatbot IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {apiKeyConfigured ? (
              <Badge className="bg-success text-success-foreground">
                <CheckCircle className="h-3 w-3 mr-1" />
                API Key Configurada
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                API Key Não Configurada
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className="text-foreground">OpenAI API Key</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="bg-muted border-border text-foreground flex-1"
              />
              <Button 
                onClick={saveApiKey}
                disabled={savingApiKey || !apiKey}
                className="bg-warning hover:bg-warning/90 text-warning-foreground"
              >
                {savingApiKey ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Obtenha sua API Key em{" "}
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-warning hover:underline inline-flex items-center gap-1"
              >
                platform.openai.com
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="bg-muted border border-border w-full sm:w-auto flex flex-wrap h-auto p-1 gap-1">
          <TabsTrigger value="config" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm flex-1 sm:flex-none">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Configuração</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
          <TabsTrigger value="prompt" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm flex-1 sm:flex-none">
            <Brain className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Prompt
          </TabsTrigger>
          <TabsTrigger value="status" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm flex-1 sm:flex-none">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Configurações do Modelo IA
                </span>
                <Badge className={config.enabled ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}>
                  {config.enabled ? "Ativo" : "Inativo"}
                </Badge>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Configurações globais do modelo de linguagem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-foreground">Chatbot Habilitado Globalmente</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando desativado, nenhuma barbearia poderá usar o chatbot
                  </p>
                </div>
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                />
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label className="text-foreground">Modelo OpenAI</Label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full bg-muted border-border text-foreground rounded-md p-2"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Recomendado - Rápido e econômico)</option>
                  <option value="gpt-4o">GPT-4o (Mais preciso, maior custo)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Mais econômico)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Modelo usado para processar e responder mensagens
                </p>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <Label className="text-foreground">Máximo de Tokens na Resposta</Label>
                <Input
                  type="number"
                  value={config.maxTokens}
                  onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 500 })}
                  min={100}
                  max={2000}
                  className="bg-muted border-border text-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Limite de tokens para cada resposta (100-2000)
                </p>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <Label className="text-foreground">Temperatura: {config.temperature}</Label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Baixo = respostas mais consistentes | Alto = respostas mais criativas
                </p>
              </div>

              <Button 
                onClick={saveGlobalConfig} 
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Brain className="h-5 w-5 text-primary" />
                Prompt do Sistema
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Template de instruções para o chatbot. Use {"{barbershop_name}"} para inserir o nome da barbearia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={config.systemPromptTemplate}
                onChange={(e) => setConfig({ ...config, systemPromptTemplate: e.target.value })}
                rows={15}
                className="bg-muted border-border text-foreground font-mono text-sm"
                placeholder="Digite o prompt do sistema..."
              />

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setConfig({ ...config, systemPromptTemplate: defaultSystemPrompt })}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Restaurar Padrão
                </Button>
                <Button 
                  onClick={saveGlobalConfig} 
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Prompt"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card className="bg-card border-border">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-foreground">
                <span className="flex items-center gap-2 text-sm sm:text-base">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Status do Chatbot por Barbearia
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={loadBarbershopStatuses}
                  disabled={loadingStatuses}
                  className="border-border text-foreground hover:bg-muted w-full sm:w-auto"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingStatuses ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                Visualize quais barbearias estão usando o chatbot
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {barbershopStatuses.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Building2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Clique em "Atualizar" para ver o status</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {barbershopStatuses.map((shop) => (
                    <div 
                      key={shop.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-muted rounded-lg gap-2 sm:gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-foreground font-medium text-sm truncate">{shop.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {shop.conversationsCount} conversas registradas
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] sm:text-sm text-muted-foreground">Agendamentos</p>
                          <p className="text-sm sm:text-lg font-bold text-primary">{shop.appointmentsCreated}</p>
                        </div>
                        <Badge className={`shrink-0 text-xs ${shop.chatbotEnabled ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                          {shop.chatbotEnabled ? (
                            <><CheckCircle className="h-3 w-3 mr-1" />Ativo</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" />Inativo</>
                          )}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};