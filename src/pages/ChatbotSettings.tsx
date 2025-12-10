import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FeatureGate } from "@/components/FeatureGate";
import { 
  Bot, 
  MessageSquare, 
  Settings2, 
  Activity, 
  Clock, 
  User, 
  RefreshCw,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  client_phone: string;
  user_message: string;
  bot_response: string;
  created_at: string;
}

interface ChatbotStats {
  totalConversations: number;
  todayConversations: number;
  appointmentsCreated: number;
  avgResponseTime: string;
}

const ChatbotSettings = () => {
  const { barbershopId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [chatbotEnabled, setChatbotEnabled] = useState(false);
  const [stats, setStats] = useState<ChatbotStats>({
    totalConversations: 0,
    todayConversations: 0,
    appointmentsCreated: 0,
    avgResponseTime: "< 2s"
  });
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  useEffect(() => {
    if (barbershopId) {
      fetchData();
      checkWhatsAppStatus();
    }
  }, [barbershopId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch conversations
      const { data: convData, error: convError } = await supabase
        .from('chatbot_conversations')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!convError && convData) {
        setConversations(convData);
        
        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const todayConvs = convData.filter(c => c.created_at.startsWith(today));
        
        setStats({
          totalConversations: convData.length,
          todayConversations: todayConvs.length,
          appointmentsCreated: 0, // Will be calculated from appointments
          avgResponseTime: "< 2s"
        });
      }

      // Fetch chatbot settings
      const { data: configData } = await supabase
        .from('whatsapp_config')
        .select('chatbot_enabled')
        .eq('barbershop_id', barbershopId)
        .maybeSingle();

      if (configData) {
        setChatbotEnabled(configData.chatbot_enabled || false);
      }

      // Count chatbot-created appointments
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('barbershop_id', barbershopId)
        .eq('source', 'chatbot');

      if (count) {
        setStats(prev => ({ ...prev, appointmentsCreated: count }));
      }

    } catch (error) {
      console.error('Error fetching chatbot data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkWhatsAppStatus = async () => {
    try {
      // Verificar se existe configuração Evolution API (não precisa estar ativa para habilitar chatbot)
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution')
        .maybeSingle();

      // Considera conectado se existir uma configuração com instance_name
      setWhatsappConnected(!!config?.config?.instance_name);
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
    }
  };

  const toggleChatbot = async () => {
    try {
      const newValue = !chatbotEnabled;
      
      // First, check if config exists
      const { data: existing } = await supabase
        .from('whatsapp_config')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('whatsapp_config')
          .update({ chatbot_enabled: newValue })
          .eq('barbershop_id', barbershopId);
      } else {
        await supabase
          .from('whatsapp_config')
          .insert({
            barbershop_id: barbershopId,
            chatbot_enabled: newValue,
            provider: 'evolution'
          });
      }

      setChatbotEnabled(newValue);
      
      toast({
        title: newValue ? "Chatbot Ativado" : "Chatbot Desativado",
        description: newValue 
          ? "O chatbot agora responderá mensagens automaticamente."
          : "O chatbot foi desativado. Mensagens não serão respondidas automaticamente.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
              <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Chatbot IA
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Configure o assistente virtual para WhatsApp
            </p>
          </div>
          <Button variant="outline" onClick={fetchData} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        <FeatureGate 
          feature="whatsapp_chatbot"
          upgradeMessage="O Chatbot IA não está disponível no seu plano atual. Faça upgrade para automatizar agendamentos via WhatsApp."
        >

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {chatbotEnabled ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span className="font-semibold text-success">Ativo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold text-muted-foreground">Inativo</span>
                      </>
                    )}
                  </div>
                </div>
                <Bot className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conversas Hoje</p>
                  <p className="text-2xl font-bold text-foreground">{stats.todayConversations}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Conversas</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalConversations}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Agendamentos via IA</p>
                  <p className="text-2xl font-bold text-success">{stats.appointmentsCreated}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="config" className="space-y-4">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="config" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Settings2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Configuração</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
            <TabsTrigger value="conversations" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Conversas</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Atividade</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Enable/Disable Card */}
              <Card className="barbershop-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    Ativar Chatbot
                  </CardTitle>
                  <CardDescription>
                    Quando ativado, o chatbot responderá automaticamente mensagens recebidas via WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="chatbot-toggle">Chatbot Ativo</Label>
                      <p className="text-sm text-muted-foreground">
                        Responder mensagens automaticamente
                      </p>
                    </div>
                    <Switch
                      id="chatbot-toggle"
                      checked={chatbotEnabled}
                      onCheckedChange={toggleChatbot}
                      disabled={!whatsappConnected}
                    />
                  </div>

                  {!whatsappConnected && (
                    <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                      <p className="text-sm text-warning">
                        ⚠️ Configure o WhatsApp antes de ativar o chatbot.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* How it Works Card */}
              <Card className="barbershop-card">
                <CardHeader>
                  <CardTitle>Como Funciona</CardTitle>
                  <CardDescription>
                    O chatbot usa IA para entender e responder mensagens
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
                      <div>
                        <p className="font-medium">Recebe Mensagem</p>
                        <p className="text-sm text-muted-foreground">Cliente envia mensagem via WhatsApp</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
                      <div>
                        <p className="font-medium">Processa com IA</p>
                        <p className="text-sm text-muted-foreground">A IA analisa e entende a intenção</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</div>
                      <div>
                        <p className="font-medium">Guia o Agendamento</p>
                        <p className="text-sm text-muted-foreground">Coleta serviço, profissional, data e horário</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-success/10 flex items-center justify-center text-xs font-bold text-success">✓</div>
                      <div>
                        <p className="font-medium">Cria Agendamento</p>
                        <p className="text-sm text-muted-foreground">Registra automaticamente no sistema</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="barbershop-card md:col-span-2">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <Settings2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Configurações Avançadas</p>
                      <p className="text-sm text-muted-foreground">
                        As configurações do modelo de IA (OpenAI), prompt do sistema e parâmetros avançados 
                        são gerenciadas pelo administrador do sistema no Portal SaaS Admin.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conversations">
            <Card className="barbershop-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Histórico de Conversas
                </CardTitle>
                <CardDescription>
                  Últimas 100 mensagens trocadas com o chatbot
                </CardDescription>
              </CardHeader>
              <CardContent>
                {conversations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Nenhuma conversa registrada ainda.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      As conversas aparecerão aqui quando o chatbot começar a responder mensagens.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {conversations.map((conv) => (
                        <div key={conv.id} className="border border-border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  <User className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{formatPhone(conv.client_phone)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(conv.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {format(new Date(conv.created_at), "HH:mm")}
                            </Badge>
                          </div>

                          {/* User Message */}
                          <div className="flex justify-end">
                            <div className="bg-primary text-primary-foreground rounded-lg rounded-br-sm px-3 py-2 max-w-[80%]">
                              <p className="text-sm">{conv.user_message}</p>
                            </div>
                          </div>

                          {/* Bot Response */}
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-lg rounded-bl-sm px-3 py-2 max-w-[80%]">
                              <div className="flex items-center gap-1 mb-1">
                                <Bot className="h-3 w-3 text-primary" />
                                <span className="text-xs font-medium text-primary">Chatbot</span>
                              </div>
                              <p className="text-sm">{conv.bot_response}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="barbershop-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Métricas de Atividade
                </CardTitle>
                <CardDescription>
                  Estatísticas de uso do chatbot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-accent/50 rounded-lg">
                    <p className="text-3xl font-bold text-foreground">{stats.totalConversations}</p>
                    <p className="text-sm text-muted-foreground">Total de Mensagens</p>
                  </div>
                  <div className="text-center p-4 bg-accent/50 rounded-lg">
                    <p className="text-3xl font-bold text-foreground">{stats.todayConversations}</p>
                    <p className="text-sm text-muted-foreground">Mensagens Hoje</p>
                  </div>
                  <div className="text-center p-4 bg-success/10 rounded-lg">
                    <p className="text-3xl font-bold text-success">{stats.appointmentsCreated}</p>
                    <p className="text-sm text-muted-foreground">Agendamentos Criados</p>
                  </div>
                  <div className="text-center p-4 bg-accent/50 rounded-lg">
                    <p className="text-3xl font-bold text-foreground">{stats.avgResponseTime}</p>
                    <p className="text-sm text-muted-foreground">Tempo de Resposta</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Dicas para melhorar o desempenho:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Mantenha os serviços e profissionais atualizados no sistema</li>
                    <li>• Configure os horários de funcionamento corretamente</li>
                    <li>• Monitore as conversas para identificar padrões de perguntas</li>
                    <li>• Responda manualmente quando o chatbot não conseguir ajudar</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </FeatureGate>
      </div>
    </Layout>
  );
};

export default ChatbotSettings;