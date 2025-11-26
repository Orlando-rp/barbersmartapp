import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Shield, Search, Filter, Calendar, User, Database } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AuditLog {
  id: string;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  record_id: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_fields: string[] | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  barbershop_id: string | null;
  created_at: string;
  barbershops?: {
    name: string;
  } | null;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [operationFilter, setOperationFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();

    // Real-time updates
    const channel = supabase
      .channel("audit_logs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "audit_logs",
        },
        () => {
          fetchAuditLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          barbershops (
            name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar logs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOperationBadge = (operation: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      INSERT: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
    };
    return variants[operation] || "default";
  };

  const getTableLabel = (tableName: string) => {
    const labels: Record<string, string> = {
      barbershops: "Barbearias",
      profiles: "Perfis",
      user_roles: "Permissões",
      clients: "Clientes",
      services: "Serviços",
      staff: "Equipe",
      appointments: "Agendamentos",
      transactions: "Transações",
      campaigns: "Campanhas",
    };
    return labels[tableName] || tableName;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.barbershops?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTable = tableFilter === "all" || log.table_name === tableFilter;
    const matchesOperation = operationFilter === "all" || log.operation === operationFilter;

    return matchesSearch && matchesTable && matchesOperation;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h1>
              <p className="text-muted-foreground">
                Rastreamento de todas as alterações críticas no sistema
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário ou barbearia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger>
                <Database className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Tabelas</SelectItem>
                <SelectItem value="barbershops">Barbearias</SelectItem>
                <SelectItem value="profiles">Perfis</SelectItem>
                <SelectItem value="user_roles">Permissões</SelectItem>
                <SelectItem value="clients">Clientes</SelectItem>
                <SelectItem value="services">Serviços</SelectItem>
                <SelectItem value="staff">Equipe</SelectItem>
                <SelectItem value="appointments">Agendamentos</SelectItem>
                <SelectItem value="transactions">Transações</SelectItem>
                <SelectItem value="campaigns">Campanhas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={operationFilter} onValueChange={setOperationFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por operação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Operações</SelectItem>
                <SelectItem value="INSERT">Criação</SelectItem>
                <SelectItem value="UPDATE">Atualização</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Logs Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data/Hora
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Tabela
                    </div>
                  </TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Usuário
                    </div>
                  </TableHead>
                  <TableHead>Barbearia</TableHead>
                  <TableHead>Campos Alterados</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum log de auditoria encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTableLabel(log.table_name)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getOperationBadge(log.operation)}>
                          {log.operation === "INSERT" && "Criação"}
                          {log.operation === "UPDATE" && "Atualização"}
                          {log.operation === "DELETE" && "Exclusão"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {log.user_name || "Sistema"}
                          </div>
                          {log.user_email && (
                            <div className="text-sm text-muted-foreground">
                              {log.user_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.barbershops?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {log.changed_fields && log.changed_fields.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {log.changed_fields.slice(0, 3).map((field) => (
                              <Badge key={field} variant="secondary" className="text-xs">
                                {field}
                              </Badge>
                            ))}
                            {log.changed_fields.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{log.changed_fields.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log de Auditoria</DialogTitle>
            <DialogDescription>
              Informações completas sobre a alteração realizada
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Data/Hora</label>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Operação</label>
                    <p className="text-sm text-muted-foreground">
                      <Badge variant={getOperationBadge(selectedLog.operation)}>
                        {selectedLog.operation}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Tabela</label>
                    <p className="text-sm text-muted-foreground">
                      {getTableLabel(selectedLog.table_name)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Usuário</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedLog.user_name || selectedLog.user_email || "Sistema"}
                    </p>
                  </div>
                </div>

                {/* Changed Fields */}
                {selectedLog.changed_fields && selectedLog.changed_fields.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Campos Alterados</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedLog.changed_fields.map((field) => (
                        <Badge key={field} variant="secondary">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Old Data */}
                {selectedLog.old_data && (
                  <div>
                    <label className="text-sm font-medium">Dados Anteriores</label>
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* New Data */}
                {selectedLog.new_data && (
                  <div>
                    <label className="text-sm font-medium">Dados Novos</label>
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
