import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BarbershopWhatsAppStatus {
  id: string;
  name: string;
  active: boolean;
  whatsappConfig?: {
    provider: string;
    is_active: boolean;
    instance_name: string;
    connection_status: string;
    updated_at: string;
  };
  messageStats?: {
    total: number;
    success: number;
    failed: number;
  };
}

interface WhatsAppStatusPanelProps {
  onRefresh?: () => void;
}

export const WhatsAppStatusPanel = ({ onRefresh }: WhatsAppStatusPanelProps) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [barbershops, setBarbershops] = useState<BarbershopWhatsAppStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [globalConfig, setGlobalConfig] = useState<{ api_url: string; api_key: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar config global da tabela system_config
      const { data: globalConfigData } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', 'evolution_api')
        .maybeSingle();

      if (globalConfigData?.value) {
        setGlobalConfig({
          api_url: globalConfigData.value.api_url,
          api_key: globalConfigData.value.api_key,
        });
      }

      // Buscar todas as barbearias
      const { data: shops, error } = await supabase
        .from('barbershops')
        .select('id, name, active')
        .order('name');

      if (error) throw error;

      // Buscar configs de WhatsApp
      const { data: configs } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('provider', 'evolution')
        .not('barbershop_id', 'is', null);

      // Buscar estatísticas de mensagens dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: logs } = await supabase
        .from('whatsapp_logs')
        .select('barbershop_id, status')
        .eq('provider', 'evolution')
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Agregar dados
      const shopsWithStatus = (shops || []).map(shop => {
        const config = configs?.find(c => c.barbershop_id === shop.id);
        const shopLogs = logs?.filter(l => l.barbershop_id === shop.id) || [];
        
        return {
          ...shop,
          whatsappConfig: config ? {
            provider: config.provider,
            is_active: config.is_active,
            instance_name: config.config?.instance_name || '',
            connection_status: config.config?.connection_status || 'disconnected',
            updated_at: config.updated_at,
          } : undefined,
          messageStats: {
            total: shopLogs.length,
            success: shopLogs.filter(l => l.status === 'sent').length,
            failed: shopLogs.filter(l => l.status === 'failed').length,
          },
        };
      });

      setBarbershops(shopsWithStatus);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar status do WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const checkInstanceStatus = async (shop: BarbershopWhatsAppStatus) => {
    if (!globalConfig || !shop.whatsappConfig?.instance_name) {
      return;
    }

    try {
      setRefreshing(true);

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'connectionState',
          apiUrl: globalConfig.api_url,
          apiKey: globalConfig.api_key,
          instanceName: shop.whatsappConfig.instance_name,
        }
      });

      // Handle 404 - instance doesn't exist
      if (data?.state === 'close' && data?.message === 'Instância não existe') {
        toast.info(`${shop.name}: Instância não criada ainda`);
        return;
      }

      if (error) throw error;

      const isConnected = data?.state === 'open' || data?.instance?.state === 'open';
      
      // Atualizar status no banco
      await supabase
        .from('whatsapp_config')
        .update({
          config: {
            ...shop.whatsappConfig,
            connection_status: isConnected ? 'connected' : 'disconnected',
          },
          is_active: isConnected,
          updated_at: new Date().toISOString(),
        })
        .eq('barbershop_id', shop.id)
        .eq('provider', 'evolution');

      toast.success(`${shop.name}: ${isConnected ? 'Conectado' : 'Desconectado'}`);
      fetchData();
      onRefresh?.();
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      toast.error(`Erro ao verificar ${shop.name}`);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status?: string, isActive?: boolean) => {
    if (!status || status === 'disconnected') {
      return (
        <Badge variant="outline" className="text-muted-foreground border-border text-xs">
          <WifiOff className="h-3 w-3 mr-1" />
          Desconectado
        </Badge>
      );
    }
    if (status === 'connected' && isActive) {
      return (
        <Badge className="bg-success/20 text-success border-success/50 text-xs">
          <Wifi className="h-3 w-3 mr-1" />
          Conectado
        </Badge>
      );
    }
    if (status === 'connecting') {
      return (
        <Badge className="bg-warning/20 text-warning border-warning/50 text-xs">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Conectando
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-destructive border-destructive/50 text-xs">
        <XCircle className="h-3 w-3 mr-1" />
        Erro
      </Badge>
    );
  };

  const filteredShops = barbershops.filter(shop =>
    shop.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: barbershops.length,
    connected: barbershops.filter(s => s.whatsappConfig?.connection_status === 'connected').length,
    configured: barbershops.filter(s => s.whatsappConfig).length,
    notConfigured: barbershops.filter(s => !s.whatsappConfig).length,
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-warning" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Global Config Status */}
      {!globalConfig && (
        <Card className="bg-warning/10 border-warning/50">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-start sm:items-center gap-3">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-warning shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-medium text-warning text-sm sm:text-base">Configuração Global Pendente</p>
                <p className="text-xs sm:text-sm text-warning/80">
                  Configure o servidor Evolution API acima para habilitar o WhatsApp nas barbearias.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Barbearias</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Conectados</p>
                <p className="text-lg sm:text-2xl font-bold text-success">{stats.connected}</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Configurados</p>
                <p className="text-lg sm:text-2xl font-bold text-warning">{stats.configured}</p>
              </div>
              <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Não Configurados</p>
                <p className="text-lg sm:text-2xl font-bold text-muted-foreground">{stats.notConfigured}</p>
              </div>
              <WifiOff className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table / Mobile Cards */}
      <Card className="bg-card border-border">
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2 text-sm sm:text-base">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                Status de Conexão WhatsApp
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs sm:text-sm">
                Status de conexão de todas as barbearias
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={refreshing}
              className="border-border text-foreground hover:bg-muted w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar barbearia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredShops.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma barbearia encontrada
              </div>
            ) : (
              filteredShops.map((shop) => (
                <div key={shop.id} className="p-3 rounded-lg border border-border bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-warning shrink-0" />
                      <span className="font-medium text-foreground text-sm truncate">{shop.name}</span>
                      {!shop.active && (
                        <Badge variant="outline" className="text-[10px] shrink-0">Inativo</Badge>
                      )}
                    </div>
                    {getStatusBadge(shop.whatsappConfig?.connection_status, shop.whatsappConfig?.is_active)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Instância:</span>
                      <p className="text-foreground truncate">{shop.whatsappConfig?.instance_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mensagens (30d):</span>
                      <p className="text-foreground">
                        {shop.messageStats && shop.messageStats.total > 0 ? (
                          <>
                            {shop.messageStats.total} (
                            <span className="text-success">{shop.messageStats.success}</span>/
                            <span className="text-destructive">{shop.messageStats.failed}</span>)
                          </>
                        ) : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {shop.whatsappConfig?.updated_at
                        ? format(new Date(shop.whatsappConfig.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })
                        : '-'}
                    </span>
                    {shop.whatsappConfig && globalConfig && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => checkInstanceStatus(shop)}
                        disabled={refreshing}
                        className="h-7 text-xs"
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                        Verificar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-muted/50">
                  <TableHead className="text-muted-foreground">Barbearia</TableHead>
                  <TableHead className="text-muted-foreground">Instância</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-center">Mensagens (30d)</TableHead>
                  <TableHead className="text-muted-foreground">Última Atualização</TableHead>
                  <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma barbearia encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShops.map((shop) => (
                    <TableRow key={shop.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-warning" />
                          <div>
                            <span className="font-medium text-foreground">{shop.name}</span>
                            {!shop.active && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Inativo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {shop.whatsappConfig?.instance_name || '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(
                          shop.whatsappConfig?.connection_status,
                          shop.whatsappConfig?.is_active
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {shop.messageStats && shop.messageStats.total > 0 ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-foreground">{shop.messageStats.total}</span>
                            <span className="text-xs text-muted-foreground">
                              (<span className="text-success">{shop.messageStats.success}</span>
                              /
                              <span className="text-destructive">{shop.messageStats.failed}</span>)
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {shop.whatsappConfig?.updated_at
                          ? format(new Date(shop.whatsappConfig.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {shop.whatsappConfig && globalConfig && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => checkInstanceStatus(shop)}
                            disabled={refreshing}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
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
