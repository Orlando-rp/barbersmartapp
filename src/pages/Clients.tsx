import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { ClientDialog } from "@/components/dialogs/ClientDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Plus, Search, Filter, Phone, Mail, Calendar, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const Clients = () => {
  const { barbershopId } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      fetchClients();
    }
  }, [barbershopId]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gerencie a base de clientes da sua barbearia</p>
          </div>
          <ClientDialog>
            <Button variant="premium" size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Novo Cliente
            </Button>
          </ClientDialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{clients.length}</div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">
                {clients.filter(c => {
                  const created = new Date(c.created_at);
                  const now = new Date();
                  return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                }).length}
              </div>
              <p className="text-sm text-muted-foreground">Novos este Mês</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">-</div>
              <p className="text-sm text-muted-foreground">Taxa de Retenção</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">-</div>
              <p className="text-sm text-muted-foreground">Avaliação Média</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="barbershop-card">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar clientes..." 
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Lista de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clients.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para começar.
                </p>
              ) : (
                clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`/placeholder-${client.id}.jpg`} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {client.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        {client.name}
                        {client.tags && client.tags.length > 0 && (
                          client.tags.map((tag: string) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        {client.email && (
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {client.email}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {client.phone}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end space-x-4 text-sm">
                      <div className="text-muted-foreground flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(client.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Clients;