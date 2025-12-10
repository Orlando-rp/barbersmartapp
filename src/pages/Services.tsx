import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { ServiceDialog } from "@/components/dialogs/ServiceDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Scissors, Plus, Search, Filter, Clock, DollarSign, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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

const Services = () => {
  const { barbershopId } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [editingService, setEditingService] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (barbershopId) {
      fetchServices();
    }
  }, [barbershopId]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar serviços',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setServiceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceToDelete);

      if (error) throw error;

      toast({
        title: 'Serviço removido',
        description: 'Serviço removido com sucesso.',
      });

      fetchServices();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover serviço',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  const categories = ["Todos", ...Array.from(new Set(services.map(s => s.category)))];
  const filteredServices = selectedCategory === "Todos" 
    ? services 
    : services.filter(s => s.category === selectedCategory);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Serviços</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gerencie o catálogo de serviços da sua barbearia</p>
          </div>
          <ServiceDialog>
            <Button variant="premium" size="default" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Novo Serviço
            </Button>
          </ServiceDialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <Card className="barbershop-card">
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{services.length}</div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Total de Serviços</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold text-primary truncate">
                R$ {services.length > 0 ? Math.round(services.reduce((sum, s) => sum + s.price, 0) / services.length) : 0}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Preço Médio</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold text-success">
                {services.filter(s => s.active).length}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Serviços Ativos</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="p-3 sm:pt-6 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold text-warning">
                {services.length > 0 ? Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length) : 0}min
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Duração Média</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="barbershop-card">
          <CardContent className="p-3 sm:pt-6 sm:px-6">
            <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar serviços..." 
                  className="pl-10"
                />
              </div>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                {categories.map((category) => (
                  <Button 
                    key={category}
                    variant={category === selectedCategory ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="text-xs sm:text-sm px-2 sm:px-3 h-8"
                  >
                    <span className="truncate max-w-[80px] sm:max-w-none">{category}</span>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {filteredServices.length === 0 ? (
            <div className="col-span-full text-center py-6 sm:py-8 px-4">
              <Scissors className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {services.length === 0 
                  ? 'Nenhum serviço cadastrado ainda. Clique em "Novo Serviço" para começar.'
                  : 'Nenhum serviço encontrado para esta categoria.'}
              </p>
            </div>
          ) : (
            filteredServices.map((service) => (
            <Card key={service.id} className="barbershop-card hover:shadow-medium">
              <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg truncate">{service.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
                      <Badge variant="outline" className="text-xs truncate max-w-[120px]">{service.category}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-0.5 sm:gap-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 sm:h-8 sm:w-8 text-destructive"
                      onClick={() => handleDeleteClick(service.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">{service.description}</p>
                
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <div className="flex items-center text-xs sm:text-sm">
                      <span className="font-semibold text-success">R$ {service.price}</span>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                      <span>{service.duration}min</span>
                    </div>
                  </div>
                  
                  <Badge 
                    variant={service.active ? "default" : "secondary"}
                    className={`text-xs shrink-0 ${service.active ? "bg-success text-success-foreground" : ""}`}
                  >
                    {service.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </div>

        {/* Edit Dialog */}
        <ServiceDialog 
          open={editDialogOpen} 
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setEditingService(null);
              fetchServices();
            }
          }}
          editingService={editingService}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este serviço? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Services;