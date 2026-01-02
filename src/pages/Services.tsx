import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ServiceDialog } from "@/components/dialogs/ServiceDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Scissors, Plus, Search, Clock, Edit, Trash2, FolderOpen, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CategoryManager } from "@/components/services/CategoryManager";
import { useServiceCategories } from "@/hooks/useServiceCategories";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";
import { formatDuration } from "@/lib/utils";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortField = "name" | "price" | "duration" | "category";
type SortDirection = "asc" | "desc";

const Services = () => {
  const { sharedBarbershopId, allRelatedBarbershopIds, loading: loadingBarbershop } = useSharedBarbershopId();
  const { toast } = useToast();
  const { categories: dbCategories } = useServiceCategories();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [editingService, setEditingService] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Handle ?new=true URL parameter to open dialog
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setEditingService(null);
      setEditDialogOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (sharedBarbershopId && allRelatedBarbershopIds.length > 0 && !loadingBarbershop) {
      fetchServices();
    }
  }, [sharedBarbershopId, allRelatedBarbershopIds, loadingBarbershop]);

  const fetchServices = async () => {
    if (!sharedBarbershopId || allRelatedBarbershopIds.length === 0) return;
    
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .in('barbershop_id', allRelatedBarbershopIds)
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Combine DB categories with existing service categories (fallback)
  const categoryNames = ["Todos", ...dbCategories.map(c => c.name)];
  const serviceCategoryNames = Array.from(new Set(services.map(s => s.category).filter(Boolean)));
  const allCategories = [...new Set([...categoryNames, ...serviceCategoryNames])];
  
  const filteredServices = services
    .filter(s => {
      const matchesCategory = selectedCategory === "Todos" || s.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "price":
          comparison = a.price - b.price;
          break;
        case "duration":
          comparison = a.duration - b.duration;
          break;
        case "category":
          comparison = (a.category || "").localeCompare(b.category || "");
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Serviços</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gerencie o catálogo de serviços da sua barbearia</p>
          </div>
          <div className="flex gap-2">
            <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="default" className="w-full sm:w-auto">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Categorias
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Gerenciar Categorias</SheetTitle>
                </SheetHeader>
                <CategoryManager />
              </SheetContent>
            </Sheet>
            <ServiceDialog>
              <Button id="service-dialog-trigger" variant="premium" size="default" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Novo Serviço
              </Button>
            </ServiceDialog>
          </div>
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
                {formatDuration(services.length > 0 ? Math.round(services.reduce((sum, s) => sum + s.duration, 0) / services.length) : 0)}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Duração Média</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="barbershop-card">
          <CardContent className="p-3 sm:pt-6 sm:px-6">
            <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar serviços..." 
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="price">Preço</SelectItem>
                    <SelectItem value="duration">Duração</SelectItem>
                    <SelectItem value="category">Categoria</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                  title={sortDirection === "asc" ? "Crescente" : "Decrescente"}
                >
                  {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                {allCategories.map((category) => (
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

        {/* Services List */}
        <Card className="barbershop-card">
          <CardContent className="p-0">
            {filteredServices.length === 0 ? (
              services.length === 0 ? (
                <IllustratedEmptyState
                  illustration="services"
                  title="Nenhum serviço cadastrado"
                  description="Adicione os serviços oferecidos pela sua barbearia com preços e durações para facilitar os agendamentos."
                  actionLabel="Adicionar Serviço"
                  onAction={() => document.getElementById('service-dialog-trigger')?.click()}
                />
              ) : (
                <div className="text-center py-8 px-4">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum serviço encontrado para esta categoria.
                  </p>
                </div>
              )
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center">
                            Serviço
                            {getSortIcon("name")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("category")}
                        >
                          <div className="flex items-center">
                            Categoria
                            {getSortIcon("category")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 text-right"
                          onClick={() => handleSort("price")}
                        >
                          <div className="flex items-center justify-end">
                            Preço
                            {getSortIcon("price")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 text-right"
                          onClick={() => handleSort("duration")}
                        >
                          <div className="flex items-center justify-end">
                            Duração
                            {getSortIcon("duration")}
                          </div>
                        </TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredServices.map((service) => (
                        <TableRow key={service.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-border">
                                <AvatarImage src={service.image_url || undefined} alt={service.name} className="object-cover" />
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                  <Scissors className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{service.name}</p>
                                {service.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-1">{service.description}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{service.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-success">
                            R$ {service.price}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end text-muted-foreground">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatDuration(service.duration)}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={service.active ? "default" : "secondary"}
                              className={service.active ? "bg-success text-success-foreground" : ""}
                            >
                              {service.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(service)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDeleteClick(service.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile List */}
                <div className="md:hidden divide-y divide-border">
                  {filteredServices.map((service) => (
                    <div key={service.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="h-12 w-12 shrink-0 border border-border">
                            <AvatarImage src={service.image_url || undefined} alt={service.name} className="object-cover" />
                            <AvatarFallback className="bg-muted text-muted-foreground">
                              <Scissors className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{service.name}</p>
                            {service.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{service.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(service)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteClick(service.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{service.category}</Badge>
                          <Badge 
                            variant={service.active ? "default" : "secondary"}
                            className={`text-xs ${service.active ? "bg-success text-success-foreground" : ""}`}
                          >
                            {service.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-semibold text-success">R$ {service.price}</span>
                          <span className="flex items-center text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            {formatDuration(service.duration)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

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
    </div>
  );
};

export default Services;