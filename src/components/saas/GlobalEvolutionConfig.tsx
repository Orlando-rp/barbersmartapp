import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  ExternalLink, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Loader2,
  Save,
  Info,
  CheckCircle,
  XCircle,
  Building2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface GlobalConfig {
  apiUrl: string;
  apiKey: string;
}

interface BarbershopStatus {
  id: string;
  name: string;
  instanceName: string;
  connectionStatus: string;
  isActive: boolean;
}

export const GlobalEvolutionConfig = () => {
  const [config, setConfig] = useState<GlobalConfig>({
    apiUrl: '',
    apiKey: ''
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [barbershopStatuses, setBarbershopStatuses] = useState<BarbershopStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  useEffect(() => {
    loadGlobalConfig();
  }, []);

  const loadGlobalConfig = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', 'evolution_api')
        .maybeSingle();

      if (error && !error.message?.includes('system_config')) {
        console.error('Erro ao carregar config global:', error);
      }

      if (data?.value) {
        setConfig({
          apiUrl: data.value.api_url || '',
          apiKey: data.value.api_key || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configuração global:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveGlobalConfig = async () => {
    if (!config.apiUrl || !config.apiKey) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('system_config')
        .upsert({
          key: 'evolution_api',
          value: {
            api_url: config.apiUrl,
            api_key: config.apiKey
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast.success("Configuração global salva com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const testServerConnection = async () => {
    if (!config.apiUrl || !config.apiKey) {
      toast.error("Configure URL e API Key primeiro");
      return;
    }

    try {
      setTesting(true);
      
      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'checkServer',
          apiUrl: config.apiUrl,
          apiKey: config.apiKey
        }
      });

      if (error) throw error;

      if (data?.success) {
        setServerStatus('online');
        toast.success("Servidor Evolution API está online!");
      } else {
        setServerStatus('offline');
        toast.error("Não foi possível conectar ao servidor");
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setServerStatus('offline');
      toast.error("Erro ao testar conexão com servidor");
    } finally {
      setTesting(false);
    }
  };

  const loadBarbershopStatuses = async () => {
    if (!config.apiUrl || !config.apiKey) {
      toast.error("Configure o servidor primeiro");
      return;
    }

    try {
      setLoadingStatuses(true);

      const { data: barbershops, error: shopError } = await supabase
        .from('barbershops')
        .select('id, name');

      if (shopError) throw shopError;

      const { data: configs, error: configError } = await supabase
        .from('whatsapp_config')
        .select('barbershop_id, config, is_active')
        .eq('provider', 'evolution')
        .not('barbershop_id', 'is', null);

      if (configError) throw configError;

      const statuses: BarbershopStatus[] = [];

      for (const shop of barbershops || []) {
        const shopConfig = configs?.find(c => c.barbershop_id === shop.id);
        const instanceName = shopConfig?.config?.instance_name || `bs-${shop.id.split('-')[0]}`;

        try {
          const { data } = await supabase.functions.invoke('send-whatsapp-evolution', {
            body: {
              action: 'connectionState',
              apiUrl: config.apiUrl,
              apiKey: config.apiKey,
              instanceName
            }
          });

          statuses.push({
            id: shop.id,
            name: shop.name,
            instanceName,
            connectionStatus: data?.state === 'open' || data?.instance?.state === 'open' ? 'connected' : 'disconnected',
            isActive: shopConfig?.is_active || false
          });
        } catch {
          statuses.push({
            id: shop.id,
            name: shop.name,
            instanceName,
            connectionStatus: 'unknown',
            isActive: shopConfig?.is_active || false
          });
        }
      }

      setBarbershopStatuses(statuses);
    } catch (error) {
      console.error('Erro ao carregar status das barbearias:', error);
      toast.error("Erro ao carregar status das barbearias");
    } finally {
      setLoadingStatuses(false);
    }
  };

  const getServerStatusBadge = () => {
    switch (serverStatus) {
      case 'online':
        return <Badge className="bg-success text-success-foreground"><Wifi className="h-3 w-3 mr-1" />Online</Badge>;
      case 'offline':
        return <Badge variant="destructive"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>;
      default:
        return <Badge variant="outline">Não verificado</Badge>;
    }
  };

  const getConnectionBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-success text-success-foreground text-xs"><CheckCircle className="h-3 w-3 mr-1" />Conectado</Badge>;
      case 'disconnected':
        return <Badge variant="outline" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Desconectado</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Desconhecido</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-warning" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-warning/50 bg-warning/10">
        <Info className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Configuração Global</AlertTitle>
        <AlertDescription className="text-warning/90">
          <p className="mb-2">
            Configure aqui o servidor Evolution API global. Todas as barbearias herdarão essas configurações 
            de servidor, precisando apenas escanear o QR Code para conectar seu WhatsApp.
          </p>
          <a
            href="https://doc.evolution-api.com/v2/pt/get-started/introduction"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm font-medium hover:underline text-warning"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Documentação Evolution API
          </a>
        </AlertDescription>
      </Alert>

      {/* Server Configuration */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <span className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-warning" />
              Servidor Evolution API
            </span>
            {getServerStatusBadge()}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Configuração global do servidor para todas as barbearias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="global-api-url" className="text-foreground">URL do Servidor</Label>
            <Input
              id="global-api-url"
              type="url"
              value={config.apiUrl}
              onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
              placeholder="https://api.evolution.seudominio.com"
              className="bg-muted border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              URL base do seu servidor Evolution API
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="global-api-key" className="text-foreground">API Key Global</Label>
            <Input
              id="global-api-key"
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="sua-api-key-global"
              className="bg-muted border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Chave de API configurada no servidor Evolution
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={testServerConnection} 
              disabled={testing || !config.apiUrl || !config.apiKey}
              variant="outline"
              className="border-border text-foreground hover:bg-muted"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
              Testar Conexão
            </Button>
            <Button 
              onClick={saveGlobalConfig} 
              disabled={saving}
              className="bg-warning hover:bg-warning/90 text-warning-foreground"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Barbershop Instances */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-warning" />
              Instâncias das Barbearias
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadBarbershopStatuses}
              disabled={loadingStatuses || !config.apiUrl || !config.apiKey}
              className="border-border text-foreground hover:bg-muted"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingStatuses ? 'animate-spin' : ''}`} />
              Atualizar Status
            </Button>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Status de conexão WhatsApp de cada barbearia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {barbershopStatuses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Clique em "Atualizar Status" para ver as instâncias</p>
            </div>
          ) : (
            <div className="space-y-3">
              {barbershopStatuses.map((shop) => (
                <div 
                  key={shop.id} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="text-foreground font-medium">{shop.name}</p>
                    <p className="text-xs text-muted-foreground">Instância: {shop.instanceName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getConnectionBadge(shop.connectionStatus)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};