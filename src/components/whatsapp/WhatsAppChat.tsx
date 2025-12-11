import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Send, 
  Search,
  Phone,
  MessageSquare,
  User,
  Clock,
  CheckCheck,
  Check,
  Loader2,
  Plus,
  ArrowLeft,
  Settings
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Message {
  id: string;
  phone_number: string;
  contact_name: string | null;
  message: string;
  direction: 'incoming' | 'outgoing';
  status: string;
  created_at: string;
  sent_by_name: string | null;
  sent_by_user_id: string | null;
}

interface Conversation {
  phone_number: string;
  contact_name: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export const WhatsAppChat = () => {
  const { barbershopId, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [evolutionConfig, setEvolutionConfig] = useState<any>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [tableExists, setTableExists] = useState(true);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  
  // Ref para acessar o phone selecionado dentro do callback de realtime
  const selectedPhoneRef = useRef<string | null>(null);
  
  // Manter ref sincronizada com state
  useEffect(() => {
    selectedPhoneRef.current = selectedPhone;
  }, [selectedPhone]);

  useEffect(() => {
    if (barbershopId) {
      loadEvolutionConfig();
      loadConversations();
      loadCurrentUserName();
    }
  }, [barbershopId]);

  // Setup realtime separadamente para poder usar a ref
  useEffect(() => {
    if (!barbershopId || !tableExists) return;
    
    const channel = supabase
      .channel('whatsapp-messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `barbershop_id=eq.${barbershopId}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          console.log('[WhatsApp Chat] Nova mensagem recebida:', newMsg);
          
          // Usar ref para pegar o valor atual
          if (selectedPhoneRef.current === newMsg.phone_number) {
            setMessages(prev => [...prev, newMsg]);
          }
          
          // Atualizar lista de conversas
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId, tableExists]);

  useEffect(() => {
    if (selectedPhone) {
      loadMessages(selectedPhone);
    }
  }, [selectedPhone]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadCurrentUserName = async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data?.full_name) {
        setCurrentUserName(data.full_name);
      }
    } catch (error) {
      console.error('Erro ao carregar nome do usuário:', error);
    }
  };

  const loadEvolutionConfig = async () => {
    if (!barbershopId) return;

    try {
      console.log('[WhatsAppChat] Loading Evolution config for:', barbershopId);
      
      // Get global config
      const { data: globalData, error: globalError } = await supabase.functions.invoke('get-evolution-config');
      console.log('[WhatsAppChat] Global config:', { globalData, globalError });
      
      // Get barbershop config
      const { data: localConfig, error: localError } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution')
        .maybeSingle();

      console.log('[WhatsAppChat] Local config:', { localConfig, localError });

      // Generate instanceName if not in local config
      const generatedInstanceName = `bs-${barbershopId.split('-')[0]}`;
      
      const finalConfig = {
        apiUrl: localConfig?.config?.api_url || globalData?.config?.api_url || '',
        apiKey: localConfig?.config?.api_key || globalData?.config?.api_key || '',
        instanceName: localConfig?.config?.instance_name || generatedInstanceName
      };
      
      console.log('[WhatsAppChat] Final config:', { 
        hasUrl: !!finalConfig.apiUrl, 
        hasKey: !!finalConfig.apiKey, 
        instanceName: finalConfig.instanceName 
      });

      if (finalConfig.apiUrl && finalConfig.instanceName) {
        setEvolutionConfig(finalConfig);
      } else {
        console.log('[WhatsAppChat] Config incomplete:', finalConfig);
      }
    } catch (error) {
      console.error('Erro ao carregar config Evolution:', error);
    }
  };

  const loadConversations = async () => {
    if (!barbershopId) return;

    try {
      setLoading(true);
      
      // Get unique conversations with last message
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) {
        // Check if table doesn't exist
        if (error.message?.includes('whatsapp_messages') || error.code === '42P01') {
          console.log('Table whatsapp_messages does not exist yet');
          setTableExists(false);
          return;
        }
        throw error;
      }

      setTableExists(true);

      // Group by phone number
      const conversationMap = new Map<string, Conversation>();
      
      data?.forEach(msg => {
        if (!conversationMap.has(msg.phone_number)) {
          conversationMap.set(msg.phone_number, {
            phone_number: msg.phone_number,
            contact_name: msg.contact_name,
            last_message: msg.message,
            last_message_time: msg.created_at,
            unread_count: 0
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (phoneNumber: string) => {
    if (!barbershopId || !tableExists) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('phone_number', phoneNumber)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  // setupRealtimeSubscription movido para o useEffect acima

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedPhone || !barbershopId || !evolutionConfig) {
      if (!evolutionConfig) {
        toast.error('Configure a Evolution API primeiro');
      }
      return;
    }

    try {
      setSending(true);

      // Format message with staff name for client visibility
      const formattedMessage = currentUserName 
        ? `*${currentUserName}:*\n${newMessage}`
        : newMessage;

      // Send via Evolution API - the edge function will store the message
      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'sendText',
          apiUrl: evolutionConfig.apiUrl,
          apiKey: evolutionConfig.apiKey,
          instanceName: evolutionConfig.instanceName,
          to: selectedPhone,
          message: formattedMessage,
          originalMessage: newMessage, // Store original without staff name prefix
          barbershopId: barbershopId,
          sentByUserId: user?.id,
          sentByName: currentUserName
        }
      });

      if (error) throw error;

      // Reload messages to get the stored message from the database
      await loadMessages(selectedPhone);
      
      setNewMessage("");
      toast.success('Mensagem enviada');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Ontem ' + format(date, 'HH:mm');
    }
    return format(date, 'dd/MM HH:mm');
  };

  const formatConversationTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Ontem';
    }
    return format(date, 'dd/MM/yy');
  };

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return phone.slice(-2);
  };

  const startNewChat = () => {
    if (!newChatPhone.trim()) {
      toast.error('Digite um número de telefone');
      return;
    }
    
    const phone = newChatPhone.replace(/\D/g, '');
    
    // Add to conversations if not exists
    if (!conversations.find(c => c.phone_number === phone)) {
      setConversations(prev => [{
        phone_number: phone,
        contact_name: newChatName || null,
        last_message: '',
        last_message_time: new Date().toISOString(),
        unread_count: 0
      }, ...prev]);
    }
    
    setSelectedPhone(phone);
    setNewChatOpen(false);
    setNewChatPhone('');
    setNewChatName('');
  };

  const filteredConversations = conversations.filter(conv => 
    conv.phone_number.includes(searchTerm) || 
    conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConversation = conversations.find(c => c.phone_number === selectedPhone);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tableExists) {
    return (
      <div className="flex items-center justify-center h-[600px] border rounded-lg bg-background">
        <div className="text-center max-w-md p-6">
          <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">Configuração necessária</h3>
          <p className="text-sm text-muted-foreground mb-4">
            A tabela de mensagens ainda não foi criada. Execute o script SQL disponível em 
            <code className="bg-muted px-1 rounded mx-1">docs/CREATE-WHATSAPP-MESSAGES-TABLE.sql</code>
            no Supabase para habilitar o chat.
          </p>
          <Link to="/whatsapp">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Ir para Configurações WhatsApp
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!evolutionConfig?.instanceName) {
    return (
      <div className="flex items-center justify-center h-[600px] border rounded-lg bg-background">
        <div className="text-center max-w-md p-6">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">WhatsApp não conectado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure e conecte sua conta WhatsApp para começar a conversar com seus clientes.
          </p>
          <Link to="/whatsapp">
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Configurar WhatsApp
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] border rounded-lg overflow-hidden bg-background">
      {/* Conversations List */}
      <div className={cn(
        "w-full md:w-80 border-r flex flex-col",
        selectedPhone && "hidden md:flex"
      )}>
        <div className="p-3 border-b flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Conversa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Número de telefone</Label>
                  <Input
                    placeholder="5511999999999"
                    value={newChatPhone}
                    onChange={(e) => setNewChatPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Digite o número com código do país (ex: 55 para Brasil)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Nome do contato (opcional)</Label>
                  <Input
                    placeholder="João Silva"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                  />
                </div>
                <Button onClick={startNewChat} className="w-full">
                  Iniciar Conversa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma conversa ainda</p>
              <p className="text-xs mt-1">As mensagens recebidas aparecerão aqui</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.phone_number}
                onClick={() => setSelectedPhone(conv.phone_number)}
                className={cn(
                  "flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b transition-colors",
                  selectedPhone === conv.phone_number && "bg-muted"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(conv.contact_name, conv.phone_number)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm truncate">
                      {conv.contact_name || `+${conv.phone_number}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatConversationTime(conv.last_message_time)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conv.last_message}
                  </p>
                </div>
                {conv.unread_count > 0 && (
                  <Badge variant="default" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col",
        !selectedPhone && "hidden md:flex"
      )}>
        {selectedPhone ? (
          <>
            {/* Chat Header */}
            <div className="p-3 border-b flex items-center gap-3 bg-muted/30">
              <Button 
                variant="ghost" 
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedPhone(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(selectedConversation?.contact_name || null, selectedPhone)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-medium">
                  {selectedConversation?.contact_name || `+${selectedPhone}`}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  +{selectedPhone}
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.direction === 'outgoing' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                        msg.direction === 'outgoing' 
                          ? "bg-primary text-primary-foreground rounded-br-none" 
                          : "bg-muted rounded-bl-none"
                      )}
                    >
                      {/* Show staff name for outgoing messages */}
                      {msg.direction === 'outgoing' && msg.sent_by_name && (
                        <p className="text-[10px] font-semibold mb-1 opacity-80">
                          {msg.sent_by_name}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <div className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        msg.direction === 'outgoing' ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        <span className="text-[10px]">
                          {formatMessageTime(msg.created_at)}
                        </span>
                        {msg.direction === 'outgoing' && (
                          msg.status === 'read' ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t bg-muted/30">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                  className="flex-1"
                />
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium">Selecione uma conversa</h3>
              <p className="text-sm">Escolha uma conversa à esquerda para ver as mensagens</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
