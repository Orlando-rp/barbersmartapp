import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";
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

interface WhatsAppLogsProps {
  provider: 'meta' | 'evolution';
}

export const WhatsAppLogs = ({ provider }: WhatsAppLogsProps) => {
  const { barbershopId } = useAuth();
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      loadLogs();
    }
  }, [barbershopId, provider]);

  const loadLogs = async () => {
    if (!barbershopId) return;

    try {
      setLoading(true);
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
          // Fallback: buscar todos os logs se a coluna provider não existir
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
    } finally {
      setLoading(false);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Histórico de Mensagens
        </CardTitle>
        <CardDescription>
          Últimas 50 mensagens enviadas via {provider === 'meta' ? 'API Oficial' : 'Evolution API'}
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
  );
};
