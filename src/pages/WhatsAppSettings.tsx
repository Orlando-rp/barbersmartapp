import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, Send, CheckCircle, XCircle, Clock, Activity, TrendingUp, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppLog {
  id: string;
  recipient_phone: string;
  recipient_name: string | null;
  message_content: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface WhatsAppStats {
  total_sent: number;
  total_success: number;
  total_failed: number;
  success_rate: number;
}

const WhatsAppSettings = () => {
  const { user, barbershopId } = useAuth();
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Olá! Esta é uma mensagem de teste do BarberSmart.");
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      loadLogs();
      loadStats();
    }
  }, [barbershopId]);

  const loadLogs = async () => {
    if (!barbershopId) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        // Tabela ainda não existe - ignorar erro silenciosamente
        if (error.code === 'PGRST205' || error.code === 'PGRST204') {
          console.warn('Tabela whatsapp_logs ainda não criada. Execute o script SQL.');
          setLogs([]);
        } else {
          throw error;
        }
      } else {
        setLogs(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!barbershopId) return;

    try {
      const { data, error } = await supabase
        .rpc('get_whatsapp_stats', { 
          barbershop_uuid: barbershopId,
          days_ago: 30 
        });

      if (error) {
        // Função ainda não existe - ignorar erro silenciosamente
        if (error.code === 'PGRST202' || error.code === 'PGRST204') {
          console.warn('Função get_whatsapp_stats ainda não criada. Execute o script SQL.');
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
          createdBy: user?.id
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Mensagem enviada com sucesso!");
        loadLogs();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 mr-1" />Enviado</Badge>;
      case 'failed':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case 'pending':
        return <Badge className="bg-warning/10 text-warning border-warning/20"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie a integração com WhatsApp Business API e visualize logs de envio
          </p>
        </div>

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

        {/* Setup Required Alert */}
        <Card className="border-orange-500/50 bg-orange-500/10">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  ⚠️ Configuração Necessária
                </p>
                <div className="text-sm text-orange-800 dark:text-orange-200 space-y-2">
                  <p className="font-semibold">Para ativar o WhatsApp, execute estes passos:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>
                      <strong>Execute o script SQL</strong>: Abra o{' '}
                      <a 
                        href="https://supabase.com/dashboard/project/nmsblmmhigwsevnqmhwn/sql/new" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline font-semibold"
                      >
                        SQL Editor do Supabase
                      </a>
                      {' '}e execute o conteúdo do arquivo{' '}
                      <code className="bg-orange-900/20 px-1.5 py-0.5 rounded font-mono">
                        docs/WHATSAPP-LOGS-SETUP.sql
                      </code>
                    </li>
                    <li>
                      <strong>Configure os Secrets</strong>: Adicione{' '}
                      <code className="bg-orange-900/20 px-1.5 py-0.5 rounded font-mono">WHATSAPP_API_TOKEN</code>
                      {' '}e{' '}
                      <code className="bg-orange-900/20 px-1.5 py-0.5 rounded font-mono">WHATSAPP_PHONE_NUMBER_ID</code>
                      {' '}no Lovable Cloud
                    </li>
                    <li>
                      <strong>Aguarde o deploy</strong>: A edge function{' '}
                      <code className="bg-orange-900/20 px-1.5 py-0.5 rounded font-mono">send-whatsapp</code>
                      {' '}está sendo deployada (pode levar 2-5 minutos)
                    </li>
                  </ol>
                  <p className="mt-2 pt-2 border-t border-orange-500/30">
                    📚 Consulte{' '}
                    <code className="bg-orange-900/20 px-1.5 py-0.5 rounded font-mono">
                      docs/WHATSAPP-SETUP-INSTRUCTIONS.md
                    </code>
                    {' '}para instruções detalhadas
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Enviar Mensagem de Teste
            </CardTitle>
            <CardDescription>
              Teste a integração enviando uma mensagem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Número de Telefone (com DDI)</Label>
              <Input
                id="phone"
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
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Digite sua mensagem de teste..."
                rows={4}
                disabled={sending}
              />
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

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Histórico de Mensagens
            </CardTitle>
            <CardDescription>
              Últimas 50 mensagens enviadas via WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-muted-foreground">Nenhuma mensagem enviada ainda</p>
                <p className="text-xs text-muted-foreground">
                  Execute o script SQL para criar a tabela de logs
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Destinatário</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.recipient_name || "Não informado"}</div>
                            <div className="text-xs text-muted-foreground">{log.recipient_phone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate text-sm">{log.message_content}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="max-w-xs">
                          {log.error_message && (
                            <span className="text-xs text-destructive truncate block">
                              {log.error_message}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Como Configurar
            </CardTitle>
            <CardDescription>
              Passos para configurar a integração WhatsApp Business API
            </CardDescription>
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
                    Acesse{" "}
                    <a
                      href="https://developers.facebook.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Meta for Developers
                    </a>{" "}
                    e crie um app
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
                    Copie o <strong>Phone Number ID</strong> e o <strong>Access Token</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Configurar secrets no Lovable Cloud</p>
                  <p className="text-sm text-muted-foreground">
                    Adicione as seguintes variáveis de ambiente:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside mt-1 space-y-1">
                    <li>
                      <code className="bg-muted px-1.5 py-0.5 rounded">WHATSAPP_API_TOKEN</code>
                    </li>
                    <li>
                      <code className="bg-muted px-1.5 py-0.5 rounded">WHATSAPP_PHONE_NUMBER_ID</code>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                📚{" "}
                <a
                  href="https://developers.facebook.com/docs/whatsapp/business-management-api/get-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Documentação oficial do WhatsApp Business API
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default WhatsAppSettings;