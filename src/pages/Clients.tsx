import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { ClientDialog } from "@/components/dialogs/ClientDialog";
import { ClientImportDialog } from "@/components/dialogs/ClientImportDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Users, Plus, Search, Phone, Mail, Calendar, MoreVertical, Pencil, Trash2, BarChart, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";

const Clients = () => {
  const { sharedBarbershopId, allRelatedBarbershopIds, loading: loadingBarbershop } = useSharedBarbershopId();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingClient, setEditingClient] = useState<any>(null);
  const [deletingClient, setDeletingClient] = useState<any>(null);

  useEffect(() => {
    if (sharedBarbershopId && allRelatedBarbershopIds.length > 0 && !loadingBarbershop) {
      fetchClients();
    }
  }, [sharedBarbershopId, allRelatedBarbershopIds, loadingBarbershop]);

  useEffect(() => {
    // Filter clients based on search term
    if (searchTerm.trim() === "") {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm)
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const fetchClients = async () => {
    if (!sharedBarbershopId || allRelatedBarbershopIds.length === 0) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .in('barbershop_id', allRelatedBarbershopIds)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar clientes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ active: false })
        .eq('id', deletingClient.id);

      if (error) throw error;

      toast({
        title: "Cliente removido",
        description: `${deletingClient.name} foi removido com sucesso.`,
      });

      fetchClients();
      setDeletingClient(null);
    } catch (error: any) {
      toast({
        title: 'Erro ao remover cliente',
        description: error.message,
        variant: 'destructive',
      });
    }
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
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">Gerencie a base de clientes</p>
          </div>
          <div className="flex gap-2">
            <ClientImportDialog onSuccess={fetchClients}>
              <Button variant="outline" size="default" className="w-full sm:w-auto">
                <Upload className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Importar</span>
              </Button>
            </ClientImportDialog>
            <ClientDialog editingClient={null} onSuccess={fetchClients}>
              <Button variant="premium" size="default" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo Cliente</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </ClientDialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="text-lg md:text-2xl font-bold text-foreground">{clients.length}</div>
              <p className="text-xs md:text-sm text-muted-foreground">Total Clientes</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="text-lg md:text-2xl font-bold text-success">
                {clients.filter(c => {
                  const created = new Date(c.created_at);
                  const now = new Date();
                  return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                }).length}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">Novos (Mês)</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="text-lg md:text-2xl font-bold text-primary">-</div>
              <p className="text-xs md:text-sm text-muted-foreground">Retenção</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="text-lg md:text-2xl font-bold text-warning">-</div>
              <p className="text-xs md:text-sm text-muted-foreground">Avaliação</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="barbershop-card">
          <CardContent className="p-3 sm:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar cliente..." 
                className="pl-10 text-sm h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <Card className="barbershop-card">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Lista de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="space-y-2 md:space-y-4">
              {filteredClients.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {searchTerm ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado. Clique em 'Novo' para começar."}
                </p>
              ) : (
                filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-2 md:p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors gap-2"
                >
                  <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <Avatar className="h-8 w-8 md:h-12 md:w-12 shrink-0">
                      <AvatarImage 
                        src={client.avatar_url ? (
                          client.avatar_url.startsWith('http') 
                            ? client.avatar_url 
                            : supabase.storage.from('client-avatars').getPublicUrl(client.avatar_url).data.publicUrl
                        ) : undefined} 
                        alt={client.name} 
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs md:text-sm">
                        {client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-sm md:text-base flex items-center gap-2">
                        <span className="truncate">{client.name}</span>
                        {client.tags && client.tags.length > 0 && (
                          <div className="hidden md:flex gap-1">
                            {client.tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 md:gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-1 shrink-0" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                        <div className="hidden sm:flex items-center">
                          <Calendar className="h-3 w-3 mr-1 shrink-0" />
                          {new Date(client.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/client-history/${client.id}`)}>
                        <BarChart className="h-4 w-4 mr-2" />
                        Ver Histórico
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingClient(client)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeletingClient(client)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        {editingClient && (
          <ClientDialog 
            editingClient={editingClient} 
            onSuccess={() => {
              fetchClients();
              setEditingClient(null);
            }}
          >
            <div />
          </ClientDialog>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingClient} onOpenChange={() => setDeletingClient(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover <strong>{deletingClient?.name}</strong>?
                Esta ação pode ser desfeita posteriormente reativando o cliente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Clients;