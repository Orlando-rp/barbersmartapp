import { useState, useEffect } from "react";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  Check,
  X,
  Clock,
  Phone,
  Calendar,
  User,
  Scissors,
  Filter,
  RefreshCw,
  MessageSquare,
  CalendarPlus,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/ui/empty-state";

interface WaitlistEntry {
  id: string;
  client_name: string;
  client_phone: string;
  preferred_date: string;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  status: "waiting" | "notified" | "converted" | "expired" | "cancelled";
  notified_at: string | null;
  notes: string | null;
  created_at: string;
  service_id: string | null;
  staff_id: string | null;
  service?: { name: string } | null;
  staff?: { 
    profiles: { full_name: string } | null 
  } | null;
  client?: { name: string; phone: string } | null;
}

const statusConfig = {
  waiting: { label: "Aguardando", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  notified: { label: "Notificado", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  converted: { label: "Convertido", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  expired: { label: "Expirado", color: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelado", color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const Waitlist = () => {
  const { barbershopId } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    entry: WaitlistEntry | null;
    action: "notify" | "convert" | "cancel" | "expire" | null;
  }>({ open: false, entry: null, action: null });
  const [appointmentDialog, setAppointmentDialog] = useState<{
    open: boolean;
    entry: WaitlistEntry | null;
  }>({ open: false, entry: null });

  const fetchEntries = async () => {
    if (!barbershopId) return;

    setLoading(true);
    try {
      let query = supabase
        .from("waitlist")
        .select(`
          *,
          service:services(name),
          staff:staff(profiles:profiles!staff_user_id_fkey(full_name)),
          client:clients(name, phone)
        `)
        .eq("barbershop_id", barbershopId)
        .order("preferred_date", { ascending: true })
        .order("created_at", { ascending: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching waitlist:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de espera.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [barbershopId, statusFilter]);

  // Real-time subscription
  useEffect(() => {
    if (!barbershopId) return;

    const channel = supabase
      .channel("waitlist-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "waitlist",
          filter: `barbershop_id=eq.${barbershopId}`,
        },
        () => {
          fetchEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  const updateStatus = async (
    entry: WaitlistEntry,
    newStatus: WaitlistEntry["status"]
  ) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "notified") {
        updateData.notified_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("waitlist")
        .update(updateData)
        .eq("id", entry.id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Entrada marcada como ${statusConfig[newStatus].label.toLowerCase()}.`,
      });

      fetchEntries();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const handleAction = () => {
    if (!actionDialog.entry || !actionDialog.action) return;

    const statusMap = {
      notify: "notified" as const,
      convert: "converted" as const,
      cancel: "cancelled" as const,
      expire: "expired" as const,
    };

    updateStatus(actionDialog.entry, statusMap[actionDialog.action]);
    setActionDialog({ open: false, entry: null, action: null });
  };

  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const formatTimeRange = (start: string | null, end: string | null) => {
    if (!start && !end) return "Qualquer horário";
    if (start && end) return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
    if (start) return `A partir de ${start.slice(0, 5)}`;
    return `Até ${end?.slice(0, 5)}`;
  };

  const getActionDialogContent = () => {
    const { action, entry } = actionDialog;
    if (!entry) return { title: "", description: "" };

    switch (action) {
      case "notify":
        return {
          title: "Notificar Cliente",
          description: `Deseja marcar ${entry.client_name} como notificado? Isso indica que você entrou em contato sobre uma vaga disponível.`,
        };
      case "convert":
        return {
          title: "Converter para Agendamento",
          description: `Deseja marcar ${entry.client_name} como convertido? Isso indica que o cliente conseguiu agendar.`,
        };
      case "cancel":
        return {
          title: "Cancelar Entrada",
          description: `Deseja cancelar a entrada de ${entry.client_name} na lista de espera?`,
        };
      case "expire":
        return {
          title: "Marcar como Expirado",
          description: `Deseja marcar a entrada de ${entry.client_name} como expirada? Use isso quando a data preferida já passou.`,
        };
      default:
        return { title: "", description: "" };
    }
  };

  const stats = {
    waiting: entries.filter((e) => e.status === "waiting").length,
    notified: entries.filter((e) => e.status === "notified").length,
    converted: entries.filter((e) => e.status === "converted").length,
    total: entries.length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lista de Espera</h1>
            <p className="text-muted-foreground">
              Gerencie clientes aguardando vagas em dias lotados
            </p>
          </div>
          <Button variant="outline" onClick={fetchEntries} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.waiting}</p>
                  <p className="text-xs text-muted-foreground">Aguardando</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.notified}</p>
                  <p className="text-xs text-muted-foreground">Notificados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.converted}</p>
                  <p className="text-xs text-muted-foreground">Convertidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="waiting">Aguardando</SelectItem>
                  <SelectItem value="notified">Notificado</SelectItem>
                  <SelectItem value="converted">Convertido</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Entradas na Lista de Espera</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : entries.length === 0 ? (
              <EmptyState
                icon={<Clock className="h-12 w-12" />}
                title="Nenhuma entrada na lista de espera"
                description="Quando clientes se inscreverem para dias lotados, eles aparecerão aqui."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data Preferida</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => {
                      const dateIsPast = isPast(parseISO(entry.preferred_date + "T23:59:59"));
                      const canNotify = entry.status === "waiting";
                      const canConvert = entry.status === "waiting" || entry.status === "notified";
                      const canCancel = entry.status === "waiting" || entry.status === "notified";
                      const canExpire = entry.status === "waiting" && dateIsPast;

                      return (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{entry.client_name}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {entry.client_phone}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className={dateIsPast && entry.status === "waiting" ? "text-red-500" : ""}>
                                {formatDate(entry.preferred_date)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatTimeRange(entry.preferred_time_start, entry.preferred_time_end)}
                          </TableCell>
                          <TableCell>
                            {entry.service?.name || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {entry.staff?.profiles?.full_name || (
                              <span className="text-muted-foreground">Qualquer</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusConfig[entry.status].color}
                            >
                              {statusConfig[entry.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {canNotify && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Notificar cliente"
                                  onClick={() =>
                                    setActionDialog({
                                      open: true,
                                      entry,
                                      action: "notify",
                                    })
                                  }
                                >
                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                              {canConvert && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Criar agendamento"
                                  onClick={() =>
                                    setAppointmentDialog({
                                      open: true,
                                      entry,
                                    })
                                  }
                                >
                                  <CalendarPlus className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                              {canConvert && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Marcar como convertido"
                                  onClick={() =>
                                    setActionDialog({
                                      open: true,
                                      entry,
                                      action: "convert",
                                    })
                                  }
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              {canExpire && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Marcar como expirado"
                                  onClick={() =>
                                    setActionDialog({
                                      open: true,
                                      entry,
                                      action: "expire",
                                    })
                                  }
                                >
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                              {canCancel && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Cancelar entrada"
                                  onClick={() =>
                                    setActionDialog({
                                      open: true,
                                      entry,
                                      action: "cancel",
                                    })
                                  }
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Dialog */}
        <AlertDialog
          open={actionDialog.open}
          onOpenChange={(open) =>
            setActionDialog({ open, entry: null, action: null })
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{getActionDialogContent().title}</AlertDialogTitle>
              <AlertDialogDescription>
                {getActionDialogContent().description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleAction}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Appointment Dialog for Converting */}
        <AppointmentDialog
          open={appointmentDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setAppointmentDialog({ open: false, entry: null });
            }
          }}
          onSuccess={() => {
            // Mark the waitlist entry as converted
            if (appointmentDialog.entry) {
              updateStatus(appointmentDialog.entry, "converted");
            }
            setAppointmentDialog({ open: false, entry: null });
            fetchEntries();
          }}
          waitlistPrefill={appointmentDialog.entry ? {
            clientName: appointmentDialog.entry.client_name,
            clientPhone: appointmentDialog.entry.client_phone,
            serviceId: appointmentDialog.entry.service_id || undefined,
            staffId: appointmentDialog.entry.staff_id || undefined,
            preferredDate: appointmentDialog.entry.preferred_date,
            preferredTimeStart: appointmentDialog.entry.preferred_time_start || undefined,
          } : undefined}
        />
      </div>
    </Layout>
  );
};

export default Waitlist;
