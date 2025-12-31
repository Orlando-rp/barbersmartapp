import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { ClientDialog } from "@/components/dialogs/ClientDialog";
import { ClientImportDialog } from "@/components/dialogs/ClientImportDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientAvatar } from "@/components/ui/smart-avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Users, Plus, Search, Phone, Mail, Calendar, MoreVertical, 
  Pencil, Trash2, BarChart, Upload, ArrowUpDown, ArrowUp, 
  ArrowDown, Filter, X, UserPlus, TrendingUp, ChevronLeft, ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { ClientsSkeleton } from "@/components/skeletons";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";
import { IllustratedEmptyState } from "@/components/ui/illustrated-empty-state";
import { PullToRefreshContainer } from "@/components/ui/pull-to-refresh";

type SortField = 'name' | 'created_at' | 'phone';
type SortDirection = 'asc' | 'desc';
type PeriodFilter = 'all' | 'this_month' | 'last_month' | 'this_year';

const Clients = () => {
  const { sharedBarbershopId, allRelatedBarbershopIds, loading: loadingBarbershop } = useSharedBarbershopId();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingClient, setEditingClient] = useState<any>(null);
  const [deletingClient, setDeletingClient] = useState<any>(null);
  
  // Filtros e ordenação
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Handle ?new=true URL parameter to open dialog
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setEditingClient({});
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (sharedBarbershopId && allRelatedBarbershopIds.length > 0 && !loadingBarbershop) {
      fetchClients();
    }
  }, [sharedBarbershopId, allRelatedBarbershopIds, loadingBarbershop]);

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

  // Extrair todas as tags únicas
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    clients.forEach(client => {
      if (client.tags && Array.isArray(client.tags)) {
        client.tags.forEach((tag: string) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [clients]);

  // Filtrar e ordenar clientes
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Filtro de busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(client =>
        client.name.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.phone.includes(searchTerm) ||
        client.preferred_name?.toLowerCase().includes(term)
      );
    }

    // Filtro de período
    if (periodFilter !== 'all') {
      const now = new Date();
      result = result.filter(client => {
        const created = new Date(client.created_at);
        switch (periodFilter) {
          case 'this_month':
            return created.getMonth() === now.getMonth() && 
                   created.getFullYear() === now.getFullYear();
          case 'last_month':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return created.getMonth() === lastMonth.getMonth() && 
                   created.getFullYear() === lastMonth.getFullYear();
          case 'this_year':
            return created.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    // Filtro de tag
    if (selectedTag !== 'all') {
      result = result.filter(client =>
        client.tags && client.tags.includes(selectedTag)
      );
    }

    // Ordenação
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'phone':
          comparison = a.phone.localeCompare(b.phone);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [clients, searchTerm, periodFilter, selectedTag, sortField, sortDirection]);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, periodFilter, selectedTag, sortField, sortDirection]);

  // Dados paginados
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredClients.slice(startIndex, endIndex);
  }, [filteredClients, currentPage, itemsPerPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredClients.length);

  // Estatísticas
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = clients.filter(c => {
      const created = new Date(c.created_at);
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    const lastMonth = clients.filter(c => {
      const created = new Date(c.created_at);
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return created.getMonth() === last.getMonth() && created.getFullYear() === last.getFullYear();
    }).length;

    const growth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : thisMonth > 0 ? 100 : 0;

    return { total: clients.length, thisMonth, lastMonth, growth };
  }, [clients]);

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

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setPeriodFilter('all');
    setSelectedTag('all');
    setSortField('created_at');
    setSortDirection('desc');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      if (currentPage > 3) pages.push('ellipsis');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const hasActiveFilters = searchTerm || periodFilter !== 'all' || selectedTag !== 'all';

  // Pull to refresh callback
  const handleRefresh = useCallback(async () => {
    await fetchClients();
    toast({
      title: "Atualizado",
      description: "Lista de clientes atualizada.",
    });
  }, [sharedBarbershopId, allRelatedBarbershopIds]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3 text-primary" /> : 
      <ArrowDown className="h-3 w-3 text-primary" />;
  };

  if (loading) {
    return (
      <Layout>
        <ClientsSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <PullToRefreshContainer onRefresh={handleRefresh} disabled={loading}>
        <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">
              {filteredClients.length} de {clients.length} clientes
            </p>
          </div>
          <div className="flex gap-2">
            <ClientImportDialog onSuccess={fetchClients}>
              <Button id="import-dialog-trigger" variant="outline" size="default" className="w-full sm:w-auto">
                <Upload className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Importar</span>
              </Button>
            </ClientImportDialog>
            <ClientDialog editingClient={null} onSuccess={fetchClients}>
              <Button id="client-dialog-trigger" variant="premium" size="default" className="w-full sm:w-auto">
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
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <div className="text-lg md:text-2xl font-bold text-foreground mt-1">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground">Novos (Mês)</span>
              </div>
              <div className="text-lg md:text-2xl font-bold text-success mt-1">{stats.thisMonth}</div>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Crescimento</span>
              </div>
              <div className={`text-lg md:text-2xl font-bold mt-1 ${stats.growth >= 0 ? 'text-success' : 'text-destructive'}`}>
                {stats.growth >= 0 ? '+' : ''}{stats.growth}%
              </div>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="p-3 md:pt-6 md:p-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground">Mês Anterior</span>
              </div>
              <div className="text-lg md:text-2xl font-bold text-foreground mt-1">{stats.lastMonth}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="barbershop-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              {/* Search and Main Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por nome, email ou telefone..." 
                    className="pl-10 text-sm h-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={periodFilter} onValueChange={(v: PeriodFilter) => setPeriodFilter(v)}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <Calendar className="h-3 w-3 mr-2" />
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="this_month">Este mês</SelectItem>
                      <SelectItem value="last_month">Mês anterior</SelectItem>
                      <SelectItem value="this_year">Este ano</SelectItem>
                    </SelectContent>
                  </Select>

                  {allTags.length > 0 && (
                    <Select value={selectedTag} onValueChange={setSelectedTag}>
                      <SelectTrigger className="w-[140px] h-9 text-sm">
                        <Filter className="h-3 w-3 mr-2" />
                        <SelectValue placeholder="Tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas tags</SelectItem>
                        {allTags.map(tag => (
                          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Sort Buttons */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="hidden sm:inline">Ordenar por:</span>
                <div className="flex gap-1">
                  <Button 
                    variant={sortField === 'name' ? 'secondary' : 'ghost'}
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleSort('name')}
                  >
                    Nome <SortIcon field="name" />
                  </Button>
                  <Button 
                    variant={sortField === 'created_at' ? 'secondary' : 'ghost'}
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleSort('created_at')}
                  >
                    Data <SortIcon field="created_at" />
                  </Button>
                  <Button 
                    variant={sortField === 'phone' ? 'secondary' : 'ghost'}
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleSort('phone')}
                  >
                    Telefone <SortIcon field="phone" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <Card className="barbershop-card" ref={listRef}>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="flex items-center justify-between text-sm md:text-base">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                Lista de Clientes
              </div>
              {filteredClients.length !== clients.length && (
                <Badge variant="secondary" className="text-xs">
                  {filteredClients.length} resultado{filteredClients.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
            <div className="space-y-2 md:space-y-3">
              {filteredClients.length === 0 ? (
                hasActiveFilters ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum cliente encontrado</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">Tente ajustar os filtros ou termo de busca</p>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Limpar Filtros
                    </Button>
                  </div>
                ) : (
                  <IllustratedEmptyState
                    illustration="users"
                    title="Nenhum cliente cadastrado"
                    description="Construa seu banco de clientes para acompanhar histórico de atendimentos, preferências e facilitar agendamentos."
                    actionLabel="Adicionar Cliente"
                    onAction={() => document.getElementById('client-dialog-trigger')?.click()}
                    secondaryActionLabel="Importar Clientes"
                    onSecondaryAction={() => document.getElementById('import-dialog-trigger')?.click()}
                  />
                )
              ) : (
                paginatedClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-2 md:p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors gap-2"
                >
                  <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <ClientAvatar 
                      src={client.avatar_url}
                      alt={client.name}
                      fallbackText={client.name}
                      size="sm"
                      className="shrink-0 md:h-12 md:w-12"
                      fallbackClassName="bg-primary/10 text-primary font-semibold"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-sm md:text-base flex items-center gap-2">
                        <span className="truncate">
                          {client.preferred_name || client.name}
                        </span>
                        {client.preferred_name && client.preferred_name !== client.name && (
                          <span className="text-xs text-muted-foreground truncate hidden lg:inline">
                            ({client.name})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 md:gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-1 shrink-0" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                        {client.email && (
                          <div className="hidden md:flex items-center">
                            <Mail className="h-3 w-3 mr-1 shrink-0" />
                            <span className="truncate max-w-[150px]">{client.email}</span>
                          </div>
                        )}
                        <div className="hidden sm:flex items-center">
                          <Calendar className="h-3 w-3 mr-1 shrink-0" />
                          {new Date(client.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      {client.tags && client.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {client.tags.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {client.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              +{client.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
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

            {/* Paginação */}
            {filteredClients.length > itemsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Mostrando {startIndex + 1}-{endIndex} de {filteredClients.length}
                  </span>
                  <Select 
                    value={itemsPerPage.toString()} 
                    onValueChange={(v) => {
                      setItemsPerPage(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 por página</SelectItem>
                      <SelectItem value="20">20 por página</SelectItem>
                      <SelectItem value="50">50 por página</SelectItem>
                      <SelectItem value="100">100 por página</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 h-8 px-2"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Anterior</span>
                      </Button>
                    </PaginationItem>
                    
                    {getPageNumbers().map((page, idx) => (
                      <PaginationItem key={idx} className="hidden sm:block">
                        {page === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem className="sm:hidden">
                      <span className="px-2 text-sm text-muted-foreground">
                        {currentPage} / {totalPages}
                      </span>
                    </PaginationItem>
                    
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 h-8 px-2"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <span className="hidden sm:inline">Próximo</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
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
      </PullToRefreshContainer>
    </Layout>
  );
};

export default Clients;
