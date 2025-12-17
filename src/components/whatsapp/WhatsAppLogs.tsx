import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { activeBarbershopIds } = useAuth();
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeBarbershopIds.length > 0) {
      loadLogs();
    }
  }, [activeBarbershopIds, provider]);

  const loadLogs = async () => {
    if (activeBarbershopIds.length === 0) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .in('barbershop_id', activeBarbershopIds)
        .eq('provider', provider)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        if (error.code === 'PGRST205' || error.code === 'PGRST204' || error.message?.includes('provider')) {
          console.warn('Tabela whatsapp_logs precisa da coluna provider');
          const { data: allData } = await supabase
            .from('whatsapp_logs')
            .select('*')
            .in('barbershop_id', activeBarbershopIds)
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
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Histórico de Mensagens
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {loading ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
            Carregando logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-6 sm:py-8 space-y-2">
            <p className="text-muted-foreground text-xs sm:text-sm">Nenhuma mensagem enviada ainda</p>
          </div>
        ) : (
          <>
            {/* Mobile view - card layout */}
            <div className="sm:hidden space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-xs truncate">{log.recipient_name || "Não informado"}</p>
                      <p className="text-[10px] text-muted-foreground">{log.recipient_phone}</p>
                    </div>
                    {getStatusBadge(log.status)}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{log.message_content}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-mono">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                    {log.error_message && (
                      <span className="text-destructive truncate max-w-[50%]">{log.error_message}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop view - table layout */}
            <div className="hidden sm:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data/Hora</TableHead>
                    <TableHead className="text-xs">Destinatário</TableHead>
                    <TableHead className="text-xs">Mensagem</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-xs">{log.recipient_name || "Não informado"}</div>
                          <div className="text-[10px] text-muted-foreground">{log.recipient_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate text-xs">{log.message_content}</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="max-w-xs">
                        {log.error_message && (
                          <span className="text-[10px] text-destructive truncate block">
                            {log.error_message}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
