import { useEffect, useState } from "react";

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

      // Fetch chatbot settings - chatbot_enabled é uma coluna própria
      const { data: configData } = await supabase
        .from('whatsapp_config')
        .select('chatbot_enabled, config, is_active')
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution')
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
      // Buscar configuração Evolution API
      const { data: config } = await supabase
        .from('whatsapp_config')
        .select('config, is_active')
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution')
        .maybeSingle();

      if (!config?.config?.instance_name) {
        setWhatsappConnected(false);
        return;
      }

      const savedStatus = config.config.connection_status;
      
      // SEMPRE verificar status real se existe instance_name
      try {
        // Buscar config global para obter api_url e api_key
        const { data: globalData } = await supabase.functions.invoke('get-evolution-config');
        
        if (globalData?.success && globalData?.config?.api_url && globalData?.config?.api_key) {
          const { data: statusData } = await supabase.functions.invoke('send-whatsapp-evolution', {
            body: {
              action: 'connectionState',
              apiUrl: globalData.config.api_url,
              apiKey: globalData.config.api_key,
              instanceName: config.config.instance_name
            }
          });

          // Handle 404 (instance not found) as disconnected
          if (statusData?.success === false && statusData?.details?.status === 404) {
            setWhatsappConnected(false);
            return;
          }

          const isReallyConnected = statusData?.state === 'open' || 
                                    statusData?.instance?.state === 'open' ||
                                    statusData?.connectionStatus === 'open';
          setWhatsappConnected(isReallyConnected);
          
          // Atualizar banco se status mudou
          if (isReallyConnected && savedStatus !== 'connected') {
            await supabase
              .from('whatsapp_config')
              .update({
                config: { ...config.config, connection_status: 'connected' },
                is_active: true,
                updated_at: new Date().toISOString()
              })
              .eq('barbershop_id', barbershopId)
              .eq('provider', 'evolution');
          } else if (!isReallyConnected && savedStatus === 'connected') {
            await supabase
              .from('whatsapp_config')
              .update({
                config: { ...config.config, connection_status: 'disconnected' },
                is_active: false,
                updated_at: new Date().toISOString()
              })
              .eq('barbershop_id', barbershopId)
              .eq('provider', 'evolution');
          }
        } else {
          // Sem config global, usar status salvo
          setWhatsappConnected(savedStatus === 'connected' || config.is_active === true);
        }
      } catch (apiError) {
        console.error('Error checking real status:', apiError);
        // Fallback para status salvo
        setWhatsappConnected(savedStatus === 'connected' || config.is_active === true);
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      setWhatsappConnected(false);
    }
  };

  const toggleChatbot = async () => {
    try {
      const newValue = !chatbotEnabled;
      
      // Atualizar coluna chatbot_enabled diretamente
      const { data: existing, error: fetchError } = await supabase
        .from('whatsapp_config')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution')
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching config:', fetchError);
        throw fetchError;
      }

      if (existing) {
        // Atualiza a coluna chatbot_enabled
        const { error: updateError } = await supabase
          .from('whatsapp_config')
          .update({ 
            chatbot_enabled: newValue,
            updated_at: new Date().toISOString()
          })
          .eq('barbershop_id', barbershopId)
          .eq('provider', 'evolution');

        if (updateError) {
          console.error('Error updating chatbot_enabled:', updateError);
          throw updateError;
        }
      } else {
        // Cria nova entrada com chatbot_enabled
        const { error: insertError } = await supabase
          .from('whatsapp_config')
          .insert({
            barbershop_id: barbershopId,
            provider: 'evolution',
            chatbot_enabled: newValue,
            config: {}
          });

        if (insertError) {
          console.error('Error inserting config:', insertError);
          throw insertError;
        }
      }

      setChatbotEnabled(newValue);
      
      toast({
        title: newValue ? "Chatbot Ativado" : "Chatbot Desativado",
        description: newValue 
          ? "O chatbot agora responderá mensagens automaticamente."
          : "O chatbot foi desativado. Mensagens não serão respondidas automaticamente.",
      });
    } catch (error: any) {
      console.error('toggleChatbot error:', error);
      toast({
        title: "Erro ao alterar chatbot",
        description: error.message || "Verifique se você tem permissão de admin para esta barbearia.",
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
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <Card className="barbershop-card">
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1">
                    {chatbotEnabled ? (
                      <>
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-success flex-shrink-0" />
                        <span className="text-sm sm:text-base font-semibold text-success">Ativo</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm sm:text-base font-semibold text-muted-foreground">Inativo</span>
                      </>
                    )}
                  </div>
                </div>
                <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-primary/20 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Conversas Hoje</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.todayConversations}</p>
                </div>
                <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-primary/20 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Conversas</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.totalConversations}</p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary/20 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Agend. via IA</p>
                  <p className="text-lg sm:text-2xl font-bold text-success">{stats.appointmentsCreated}</p>
                </div>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary/20 flex-shrink-0" />
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
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    Ativar Chatbot
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Quando ativado, responderá mensagens via WhatsApp automaticamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <Label htmlFor="chatbot-toggle" className="text-xs sm:text-sm">Chatbot Ativo</Label>
                      <p className="text-[10px] sm:text-sm text-muted-foreground">
                        Responder automaticamente
                      </p>
                    </div>
                    <Switch
                      id="chatbot-toggle"
                      checked={chatbotEnabled}
                      onCheckedChange={toggleChatbot}
                    />
                  </div>

                  {!whatsappConnected && chatbotEnabled && (
                    <div className="p-2.5 sm:p-3 bg-warning/10 border border-warning/20 rounded-lg space-y-1.5 sm:space-y-2">
                      <p className="text-xs sm:text-sm font-medium text-warning">
                        ⚠️ WhatsApp desconectado
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        O chatbot está ativado, mas só funcionará quando o WhatsApp estiver conectado.
                        Vá em <strong>WhatsApp → Evolution API</strong> para conectar.
                      </p>
                    </div>
                  )}

                  {!whatsappConnected && !chatbotEnabled && (
                    <div className="p-2.5 sm:p-3 bg-muted/50 border border-border rounded-lg space-y-1.5 sm:space-y-2">
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        💡 Dica
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Você pode ativar o chatbot agora. Ele começará a responder assim que o WhatsApp for conectado.
                      </p>
                    </div>
                  )}

                  {whatsappConnected && chatbotEnabled && (
                    <div className="p-2.5 sm:p-3 bg-success/10 border border-success/20 rounded-lg">
                      <p className="text-xs sm:text-sm text-success">
                        ✅ Chatbot ativo! Mensagens serão respondidas automaticamente.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* How it Works Card */}
              <Card className="barbershop-card">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-sm sm:text-base">Como Funciona</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    O chatbot usa IA para entender e responder
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary flex-shrink-0">1</div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium">Recebe Mensagem</p>
                        <p className="text-[10px] sm:text-sm text-muted-foreground">Cliente envia via WhatsApp</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary flex-shrink-0">2</div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium">Processa com IA</p>
                        <p className="text-[10px] sm:text-sm text-muted-foreground">Analisa e entende a intenção</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary flex-shrink-0">3</div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium">Guia o Agendamento</p>
                        <p className="text-[10px] sm:text-sm text-muted-foreground">Coleta dados necessários</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-success/10 flex items-center justify-center text-[10px] sm:text-xs font-bold text-success flex-shrink-0">✓</div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium">Cria Agendamento</p>
                        <p className="text-[10px] sm:text-sm text-muted-foreground">Registra no sistema</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card className="barbershop-card md:col-span-2">
                <CardContent className="p-4 sm:pt-6 sm:px-6">
                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg">
                    <Settings2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium">Configurações Avançadas</p>
                      <p className="text-[10px] sm:text-sm text-muted-foreground">
                        Configurações do modelo de IA e parâmetros são gerenciadas pelo administrador no Portal SaaS Admin.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="conversations">
            <Card className="barbershop-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Histórico de Conversas
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Últimas 100 mensagens trocadas
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
                        <div key={conv.id} className="border border-border rounded-lg p-2.5 sm:p-4 space-y-2 sm:space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-xs sm:text-sm truncate">{formatPhone(conv.client_phone)}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  {format(new Date(conv.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] sm:text-xs w-fit">
                              <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
                              {format(new Date(conv.created_at), "HH:mm")}
                            </Badge>
                          </div>

                          {/* User Message */}
                          <div className="flex justify-end">
                            <div className="bg-primary text-primary-foreground rounded-lg rounded-br-sm px-2.5 sm:px-3 py-1.5 sm:py-2 max-w-[85%] sm:max-w-[80%]">
                              <p className="text-xs sm:text-sm break-words">{conv.user_message}</p>
                            </div>
                          </div>

                          {/* Bot Response */}
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-lg rounded-bl-sm px-2.5 sm:px-3 py-1.5 sm:py-2 max-w-[85%] sm:max-w-[80%]">
                              <div className="flex items-center gap-1 mb-1">
                                <Bot className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                                <span className="text-[10px] sm:text-xs font-medium text-primary">Chatbot</span>
                              </div>
                              <p className="text-xs sm:text-sm break-words">{conv.bot_response}</p>
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
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Métricas de Atividade
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Estatísticas de uso do chatbot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                  <div className="text-center p-2.5 sm:p-4 bg-accent/50 rounded-lg">
                    <p className="text-xl sm:text-3xl font-bold text-foreground">{stats.totalConversations}</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Total Mensagens</p>
                  </div>
                  <div className="text-center p-2.5 sm:p-4 bg-accent/50 rounded-lg">
                    <p className="text-xl sm:text-3xl font-bold text-foreground">{stats.todayConversations}</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Mensagens Hoje</p>
                  </div>
                  <div className="text-center p-2.5 sm:p-4 bg-success/10 rounded-lg">
                    <p className="text-xl sm:text-3xl font-bold text-success">{stats.appointmentsCreated}</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Agendamentos</p>
                  </div>
                  <div className="text-center p-2.5 sm:p-4 bg-accent/50 rounded-lg">
                    <p className="text-xl sm:text-3xl font-bold text-foreground">{stats.avgResponseTime}</p>
                    <p className="text-[10px] sm:text-sm text-muted-foreground">Tempo Resposta</p>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm sm:text-base font-medium mb-2">Dicas para melhorar:</h4>
                  <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                    <li>• Mantenha serviços e profissionais atualizados</li>
                    <li>• Configure os horários corretamente</li>
                    <li>• Monitore conversas para identificar padrões</li>
                    <li>• Responda manualmente quando necessário</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </FeatureGate>
      </div>
    </>
  );
};

export default ChatbotSettings;