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

export const WhatsAppStatusPanel = () => {
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
        <Badge variant="outline" className="text-slate-400 border-slate-600">
          <WifiOff className="h-3 w-3 mr-1" />
          Desconectado
        </Badge>
      );
    }
    if (status === 'connected' && isActive) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
          <Wifi className="h-3 w-3 mr-1" />
          Conectado
        </Badge>
      );
    }
    if (status === 'connecting') {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Conectando
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-red-400 border-red-500/50">
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
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Config Status */}
      {!globalConfig && (
        <Card className="bg-amber-500/10 border-amber-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-400">Configuração Global Pendente</p>
                <p className="text-sm text-amber-400/80">
                  Configure o servidor Evolution API na aba Integrações para habilitar o WhatsApp nas barbearias.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Barbearias</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Conectados</p>
                <p className="text-2xl font-bold text-emerald-500">{stats.connected}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Configurados</p>
                <p className="text-2xl font-bold text-amber-500">{stats.configured}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Não Configurados</p>
                <p className="text-2xl font-bold text-slate-400">{stats.notConfigured}</p>
              </div>
              <WifiOff className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-amber-500" />
                Status de Conexão WhatsApp
              </CardTitle>
              <CardDescription className="text-slate-400">
                Visualize o status de conexão de todas as barbearias
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={refreshing}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar barbearia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="rounded-md border border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-300">Barbearia</TableHead>
                  <TableHead className="text-slate-300">Instância</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300 text-center">Mensagens (30d)</TableHead>
                  <TableHead className="text-slate-300">Última Atualização</TableHead>
                  <TableHead className="text-right text-slate-300">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Nenhuma barbearia encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredShops.map((shop) => (
                    <TableRow key={shop.id} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-amber-500" />
                          <div>
                            <span className="font-medium text-white">{shop.name}</span>
                            {!shop.active && (
                              <Badge variant="outline" className="ml-2 text-xs text-slate-500">
                                Inativo
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
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
                            <span className="text-white">{shop.messageStats.total}</span>
                            <span className="text-xs text-slate-500">
                              (<span className="text-emerald-500">{shop.messageStats.success}</span>
                              /
                              <span className="text-red-500">{shop.messageStats.failed}</span>)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400">
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
                            className="text-slate-400 hover:text-white hover:bg-slate-700"
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
