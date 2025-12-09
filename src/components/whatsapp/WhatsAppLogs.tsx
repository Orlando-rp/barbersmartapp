import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, MessageSquare, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
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
  provider: string;
}

interface WhatsAppStats {
  total_sent: number;
  total_success: number;
  total_failed: number;
  success_rate: number;
}

interface WhatsAppLogsProps {
  provider: 'meta' | 'evolution';
}

export const WhatsAppLogs = ({ provider }: WhatsAppLogsProps) => {
  const { barbershopId } = useAuth();
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [stats, setStats] = useState<WhatsAppStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      loadData();
    }
  }, [barbershopId, provider]);

  const loadData = async () => {
    if (!barbershopId) return;

    try {
      setLoading(true);
      await Promise.all([loadLogs(), loadStats()]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    if (!barbershopId) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('provider', provider)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        if (error.code === 'PGRST205' || error.code === 'PGRST204' || error.message?.includes('provider')) {
          console.warn('Tabela whatsapp_logs precisa da coluna provider');
          const { data: allData } = await supabase
            .from('whatsapp_logs')
            .select('*')
            .eq('barbershop_id', barbershopId)
            .order('created_at', { ascending: false })
            .limit(50);
          setLogs(allData || []);
        } else {
          throw error;
        }
      } else {
        setLogs(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      setLogs([]);
    }
  };

  const loadStats = async () => {
    if (!barbershopId) return;

    try {
      // Try to get stats from RPC function
      const { data, error } = await supabase
        .rpc('get_whatsapp_stats', { 
          barbershop_uuid: barbershopId,
          days_ago: 30 
        });

      if (error) {
        if (error.code === 'PGRST202' || error.code === 'PGRST204') {
          // Function doesn't exist, calculate manually
          await calculateStats();
        } else {
          throw error;
        }
      } else if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      await calculateStats();
    }
  };

  const calculateStats = async () => {
    if (!barbershopId) return;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data } = await supabase
        .from('whatsapp_logs')
        .select('status')
        .eq('barbershop_id', barbershopId)
        .eq('provider', provider)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (data) {
        const total = data.length;
        const success = data.filter(l => l.status === 'sent').length;
        const failed = data.filter(l => l.status === 'failed').length;
        const rate = total > 0 ? Math.round((success / total) * 100) : 0;

        setStats({
          total_sent: total,
          total_success: success,
          total_failed: failed,
          success_rate: rate,
        });
      }
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
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
    <div className="space-y-6">
      {/* Statistics Dashboard */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enviado</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_sent || 0}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucesso</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats?.total_success || 0}</div>
            <p className="text-xs text-muted-foreground">Mensagens entregues</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.total_failed || 0}</div>
            <p className="text-xs text-muted-foreground">Erros de envio</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.success_rate || 0}%</div>
            <p className="text-xs text-muted-foreground">Média geral</p>
          </CardContent>
        </Card>
      </div>

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Histórico de Mensagens
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">Nenhuma mensagem enviada ainda</p>
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
    </div>
  );
};
