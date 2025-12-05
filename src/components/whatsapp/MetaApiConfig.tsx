import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Send, CheckCircle, XCircle, Clock, Activity, TrendingUp, AlertCircle, Settings, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { WhatsAppLogs } from "./WhatsAppLogs";
import { MessageTemplates, MessageTemplate } from "./MessageTemplates";

interface WhatsAppStats {
  total_sent: number;
  total_success: number;
  total_failed: number;
  success_rate: number;
}

export const MetaApiConfig = () => {
  const { user, barbershopId } = useAuth();
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste do BarberSmart.");
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();

  const handleSelectTemplate = (template: MessageTemplate) => {
    setTestMessage(template.message);
    setSelectedTemplateId(template.id);
    toast.success(`Template "${template.name}" selecionado`);
  };

  useEffect(() => {
    if (barbershopId) {
      loadStats();
    }
  }, [barbershopId]);

  const loadStats = async () => {
    if (!barbershopId) return;

    try {
      const { data, error } = await supabase
        .rpc('get_whatsapp_stats', { 
          barbershop_uuid: barbershopId,
          days_ago: 30 
        });

      if (error) {
        if (error.code === 'PGRST202' || error.code === 'PGRST204') {
          console.warn('Função get_whatsapp_stats ainda não criada');
          setStats(null);
        } else {
          throw error;
        }
      } else if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setStats(null);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast.error("Preencha o telefone e a mensagem");
      return;
    }

    if (!barbershopId) {
      toast.error("ID da barbearia não encontrado");
      return;
    }

    try {
      setSending(true);

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: testPhone,
          message: testMessage,
          type: 'text',
          barbershopId,
          recipientName: 'Teste',
          createdBy: user?.id,
          provider: 'meta'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Mensagem enviada com sucesso!");
        loadStats();
        setTestPhone("");
      } else {
        throw new Error(data?.error || "Falha ao enviar mensagem");
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      
      if (error instanceof Error && error.message.includes("Failed to send a request")) {
        toast.error(
          "A função WhatsApp não está disponível. Verifique se ela foi deployada corretamente.",
          { duration: 5000 }
        );
      } else {
        toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enviado</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_sent}</div>
              <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sucesso</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.total_success}</div>
              <p className="text-xs text-muted-foreground">Mensagens entregues</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Falhas</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.total_failed}</div>
              <p className="text-xs text-muted-foreground">Erros de envio</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.success_rate}%</div>
              <p className="text-xs text-muted-foreground">Média geral</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Setup Instructions Alert */}
      <Alert className="border-warning/50 bg-warning/10">
        <AlertCircle className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Configuração Necessária</AlertTitle>
        <AlertDescription className="text-warning/90">
          <p className="mb-2">Para usar a API Oficial do WhatsApp, configure os seguintes secrets no Lovable Cloud:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><code className="bg-warning/20 px-1 rounded">WHATSAPP_API_TOKEN</code> - Access Token da Meta</li>
            <li><code className="bg-warning/20 px-1 rounded">WHATSAPP_PHONE_NUMBER_ID</code> - ID do número de telefone</li>
          </ul>
          <div className="mt-3 flex gap-2">
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Meta for Developers
            </a>
          </div>
        </AlertDescription>
      </Alert>

      {/* How to Configure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Como Configurar a API Oficial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Criar conta WhatsApp Business API</p>
                <p className="text-sm text-muted-foreground">
                  Acesse <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">Meta for Developers</a> e crie um app com produto WhatsApp
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">Obter credenciais</p>
                <p className="text-sm text-muted-foreground">
                  No dashboard do app, copie o <strong>Phone Number ID</strong> e o <strong>Access Token</strong> permanente
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Configurar secrets</p>
                <p className="text-sm text-muted-foreground">
                  Adicione <code className="bg-muted px-1 rounded">WHATSAPP_API_TOKEN</code> e <code className="bg-muted px-1 rounded">WHATSAPP_PHONE_NUMBER_ID</code> no Lovable Cloud
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                4
              </div>
              <div>
                <p className="font-medium">Testar envio</p>
                <p className="text-sm text-muted-foreground">
                  Use o formulário abaixo para enviar uma mensagem de teste
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <MessageTemplates 
        onSelectTemplate={handleSelectTemplate}
        selectedTemplateId={selectedTemplateId}
      />

      {/* Test Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Enviar Mensagem de Teste
          </CardTitle>
          <CardDescription>
            Teste a integração com a API Oficial do WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta-phone">Número de Telefone (com DDI)</Label>
            <Input
              id="meta-phone"
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="5511999999999"
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              Formato: código do país + DDD + número (ex: 5511999999999)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-message">Mensagem</Label>
            <Textarea
              id="meta-message"
              value={testMessage}
              onChange={(e) => {
                setTestMessage(e.target.value);
                setSelectedTemplateId(undefined);
              }}
              placeholder="Digite sua mensagem de teste..."
              rows={8}
              disabled={sending}
            />
            <p className="text-xs text-muted-foreground">
              Use variáveis como {'{nome}'}, {'{data}'}, {'{hora}'} para personalizar
            </p>
          </div>

          <Button 
            onClick={handleSendTest} 
            disabled={sending || !testPhone.trim() || !testMessage.trim()}
            className="w-full"
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Enviando..." : "Enviar Mensagem de Teste"}
          </Button>
        </CardContent>
      </Card>

      {/* Logs */}
      <WhatsAppLogs provider="meta" />
    </div>
  );
};
