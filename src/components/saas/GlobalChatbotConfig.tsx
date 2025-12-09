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
  MessageSquare,
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
        // Show masked key
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
      // Mask the key after saving
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

      // Save to a chatbot_config table or use whatsapp_config
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
        // Get chatbot config for this barbershop
        const { data: whatsappConfig } = await supabase
          .from('whatsapp_config')
          .select('chatbot_enabled')
          .eq('barbershop_id', shop.id)
          .maybeSingle();

        // Count conversations
        const { count: conversationsCount } = await supabase
          .from('chatbot_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', shop.id);

        // Count appointments from chatbot (would need a source field)
        const appointmentsCreated = 0; // Placeholder

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
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-purple-500/50 bg-purple-500/10">
        <Bot className="h-4 w-4 text-purple-500" />
        <AlertTitle className="text-purple-400">Chatbot IA - Configuração Global</AlertTitle>
        <AlertDescription className="text-purple-300/90">
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
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5 text-amber-500" />
            Configuração da API OpenAI
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configure sua chave de API da OpenAI para habilitar o chatbot IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {apiKeyConfigured ? (
              <Badge className="bg-emerald-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                API Key Configurada
              </Badge>
            ) : (
              <Badge className="bg-red-500">
                <XCircle className="h-3 w-3 mr-1" />
                API Key Não Configurada
              </Badge>
            )}
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-300">OpenAI API Key</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="bg-slate-800 border-slate-700 text-white flex-1"
              />
              <Button 
                onClick={saveApiKey}
                disabled={savingApiKey || !apiKey}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {savingApiKey ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Obtenha sua API Key em{" "}
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-400 hover:underline inline-flex items-center gap-1"
              >
                platform.openai.com
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="config" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <Settings className="h-4 w-4 mr-2" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="prompt" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <Brain className="h-4 w-4 mr-2" />
            Prompt do Sistema
          </TabsTrigger>
          <TabsTrigger value="status" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <Building2 className="h-4 w-4 mr-2" />
            Status por Barbearia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Configurações do Modelo IA
                </span>
                <Badge className={config.enabled ? "bg-emerald-500" : "bg-slate-600"}>
                  {config.enabled ? "Ativo" : "Inativo"}
                </Badge>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Configurações globais do modelo de linguagem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-white">Chatbot Habilitado Globalmente</Label>
                  <p className="text-sm text-slate-400">
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
                <Label className="text-slate-300">Modelo OpenAI</Label>
                <select
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  className="w-full bg-slate-800 border-slate-700 text-white rounded-md p-2"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Recomendado - Rápido e econômico)</option>
                  <option value="gpt-4o">GPT-4o (Mais preciso, maior custo)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Mais econômico)</option>
                </select>
                <p className="text-xs text-slate-500">
                  Modelo usado para processar e responder mensagens
                </p>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <Label className="text-slate-300">Máximo de Tokens na Resposta</Label>
                <Input
                  type="number"
                  value={config.maxTokens}
                  onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 500 })}
                  min={100}
                  max={2000}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500">
                  Limite de tokens para cada resposta (100-2000)
                </p>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <Label className="text-slate-300">Temperatura: {config.temperature}</Label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-slate-500">
                  Baixo = respostas mais consistentes | Alto = respostas mais criativas
                </p>
              </div>

              <Button 
                onClick={saveGlobalConfig} 
                disabled={saving}
                className="bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Brain className="h-5 w-5 text-purple-500" />
                Prompt do Sistema
              </CardTitle>
              <CardDescription className="text-slate-400">
                Template de instruções para o chatbot. Use {"{barbershop_name}"} para inserir o nome da barbearia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={config.systemPromptTemplate}
                onChange={(e) => setConfig({ ...config, systemPromptTemplate: e.target.value })}
                rows={15}
                className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                placeholder="Digite o prompt do sistema..."
              />

              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setConfig({ ...config, systemPromptTemplate: defaultSystemPrompt })}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Restaurar Padrão
                </Button>
                <Button 
                  onClick={saveGlobalConfig} 
                  disabled={saving}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar Prompt"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-500" />
                  Status do Chatbot por Barbearia
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={loadBarbershopStatuses}
                  disabled={loadingStatuses}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingStatuses ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Visualize quais barbearias estão usando o chatbot
              </CardDescription>
            </CardHeader>
            <CardContent>
              {barbershopStatuses.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Clique em "Atualizar" para ver o status</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {barbershopStatuses.map((shop) => (
                    <div 
                      key={shop.id} 
                      className="flex items-center justify-between p-4 bg-slate-800 rounded-lg"
                    >
                      <div>
                        <p className="text-white font-medium">{shop.name}</p>
                        <p className="text-xs text-slate-500">
                          {shop.conversationsCount} conversas registradas
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-slate-400">Agendamentos</p>
                          <p className="text-lg font-bold text-purple-400">{shop.appointmentsCreated}</p>
                        </div>
                        <Badge className={shop.chatbotEnabled ? "bg-emerald-500" : "bg-slate-600"}>
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