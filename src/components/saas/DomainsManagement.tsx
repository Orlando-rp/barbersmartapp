import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Globe, 
  Search, 
  Loader2, 
  ExternalLink, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";

interface DomainWithBarbershop {
  id: string;
  barbershop_id: string;
  subdomain: string | null;
  custom_domain: string | null;
  subdomain_status: string;
  custom_domain_status: string;
  ssl_status: string;
  dns_verified_at: string | null;
  created_at: string;
  barbershop?: {
    name: string;
  };
}

const DomainsManagement = () => {
  const [domains, setDomains] = useState<DomainWithBarbershop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('barbershop_domains')
        .select(`
          *,
          barbershop:barbershops (name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        if (!error.message?.includes('does not exist')) {
          console.error('Erro ao buscar domínios:', error);
          toast.error('Erro ao carregar domínios');
        }
        setDomains([]);
        return;
      }

      setDomains(data || []);
    } catch (err) {
      console.error('Erro:', err);
      setDomains([]);
    } finally {
      setLoading(false);
    }
  };

  const updateDomainStatus = async (domainId: string, field: string, status: string) => {
    try {
      const updateData: Record<string, any> = { [field]: status };
      
      if (field === 'custom_domain_status' && status === 'active') {
        updateData.dns_verified_at = new Date().toISOString();
        updateData.ssl_status = 'active';
      }

      const { error } = await supabase
        .from('barbershop_domains')
        .update(updateData)
        .eq('id', domainId);

      if (error) throw error;

      toast.success('Status atualizado');
      fetchDomains();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending':
      case 'verifying':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      pending: "secondary",
      verifying: "outline",
      failed: "destructive",
      disabled: "secondary",
    };
    
    return (
      <Badge variant={variants[status] || "secondary"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const filteredDomains = domains.filter(domain => {
    const matchesSearch = 
      domain.subdomain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      domain.custom_domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      domain.barbershop?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      domain.subdomain_status === statusFilter || 
      domain.custom_domain_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: domains.length,
    withSubdomain: domains.filter(d => d.subdomain).length,
    withCustomDomain: domains.filter(d => d.custom_domain).length,
    activeCustomDomains: domains.filter(d => d.custom_domain_status === 'active').length,
    pendingVerification: domains.filter(d => d.custom_domain && d.custom_domain_status !== 'active').length,
  };

  if (loading) {
    return (
      <Card className="bg-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.withSubdomain}</div>
            <div className="text-sm text-muted-foreground">Com Subdomínio</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{stats.withCustomDomain}</div>
            <div className="text-sm text-muted-foreground">Domínios Próprios</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats.activeCustomDomains}</div>
            <div className="text-sm text-muted-foreground">Ativos</div>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">{stats.pendingVerification}</div>
            <div className="text-sm text-muted-foreground">Pendentes</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="bg-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Gestão de Domínios
              </CardTitle>
              <CardDescription>
                Gerenciar subdomínios e domínios personalizados das barbearias
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDomains}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por domínio ou barbearia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="verifying">Verificando</SelectItem>
                <SelectItem value="failed">Falha</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barbearia</TableHead>
                  <TableHead>Subdomínio</TableHead>
                  <TableHead>Domínio Personalizado</TableHead>
                  <TableHead>SSL</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDomains.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum domínio encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDomains.map((domain) => (
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">
                        {domain.barbershop?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {domain.subdomain ? (
                          <div className="flex items-center gap-2">
                            {getStatusIcon(domain.subdomain_status)}
                            <span className="text-sm">{domain.subdomain}.barbersmart.app</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {domain.custom_domain ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(domain.custom_domain_status)}
                              <span className="text-sm">{domain.custom_domain}</span>
                            </div>
                            <Select
                              value={domain.custom_domain_status}
                              onValueChange={(value) => updateDomainStatus(domain.id, 'custom_domain_status', value)}
                            >
                              <SelectTrigger className="h-7 text-xs w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="verifying">Verificando</SelectItem>
                                <SelectItem value="active">Ativo</SelectItem>
                                <SelectItem value="failed">Falha</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {domain.custom_domain ? getStatusBadge(domain.ssl_status) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {(domain.subdomain || (domain.custom_domain && domain.custom_domain_status === 'active')) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const url = domain.custom_domain && domain.custom_domain_status === 'active'
                                ? `https://${domain.custom_domain}`
                                : `https://${domain.subdomain}.barbersmart.app`;
                              window.open(url, '_blank');
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DomainsManagement;
