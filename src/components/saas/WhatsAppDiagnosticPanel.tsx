import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Clock,
  Send,
  AlertTriangle,
  Phone,
  Server,
  Activity,
  Eye,
  TestTube,
  GitCompare,
  Check,
  X,
  Plus,
  QrCode,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface SystemHealth {
  evolutionApi: {
    configured: boolean;
    apiUrl: string | null;
    reachable: boolean | null;
    lastChecked: Date | null;
  };
  otpInstance: {
    configured: boolean;
    instanceName: string | null;
    status: string | null;
    phoneNumber: string | null;
    existsInEvolution: boolean | null;
    evolutionState: string | null;
    lastChecked: Date | null;
  };
  barbershopConfigs: {
    total: number;
    active: number;
    connected: number;
  };
}

interface WhatsAppLog {
  id: string;
  barbershop_id: string | null;
  barbershop_name?: string;
  phone: string;
  message_type: string;
  status: string;
  error_message: string | null;
  created_at: string;
  provider: string;
}

interface BarbershopConfig {
  id: string;
  barbershop_id: string;
  barbershop_name: string;
  provider: string;
  is_active: boolean;
  instance_name: string | null;
  connection_status: string | null;
  updated_at: string;
}

interface EvolutionInstance {
  instanceName: string;
  status: string;
  owner?: string;
  connectionStatus?: string;
}

interface SyncResult {
  evolutionInstances: EvolutionInstance[];
  otpConfigured: string | null;
  otpMatch: boolean;
  barbershopMatches: { name: string; instanceName: string; found: boolean }[];
}

export const WhatsAppDiagnosticPanel = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [configs, setConfigs] = useState<BarbershopConfig[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedBarbershopLogs, setSelectedBarbershopLogs] = useState<WhatsAppLog[]>([]);
  const [selectedBarbershopName, setSelectedBarbershopName] = useState("");
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [creatingOtpInstance, setCreatingOtpInstance] = useState(false);
  const [otpQrCode, setOtpQrCode] = useState<string | null>(null);
  const [diagnoseDialogOpen, setDiagnoseDialogOpen] = useState(false);
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<any>(null);
  const [selectInstanceDialogOpen, setSelectInstanceDialogOpen] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchHealth(),
        fetchLogs(),
        fetchConfigs(),
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de diagnóstico');
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async (verifyRealTime = false) => {
    // Evolution API config
    const { data: evolutionData } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'evolution_api')
      .maybeSingle();

    // OTP config
    const { data: otpData } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'otp_whatsapp')
      .maybeSingle();

    // WhatsApp configs count
    const { data: allConfigs } = await supabase
      .from('whatsapp_config')
      .select('id, is_active, config')
      .eq('provider', 'evolution');

    const activeConfigs = allConfigs?.filter(c => c.is_active) || [];
    const connectedConfigs = allConfigs?.filter(c => 
      c.is_active && c.config?.connection_status === 'connected'
    ) || [];

    let apiReachable: boolean | null = null;
    let otpExists: boolean | null = null;
    let otpEvolutionState: string | null = null;
    let otpStatus = otpData?.value?.status || null;

    // Verificar em tempo real se solicitado
    if (verifyRealTime && evolutionData?.value?.api_url && evolutionData?.value?.api_key) {
      try {
        // Verificar se API está acessível
        const { data: instancesData, error: instancesError } = await supabase.functions.invoke('send-whatsapp-evolution', {
          body: {
            action: 'fetchInstances',
            apiUrl: evolutionData.value.api_url,
            apiKey: evolutionData.value.api_key,
          }
        });

        if (!instancesError) {
          apiReachable = true;

          // Verificar se instância OTP existe
          if (otpData?.value?.instance_name) {
            let instances: any[] = [];
            if (Array.isArray(instancesData)) {
              instances = instancesData;
            } else if (instancesData?.instances && Array.isArray(instancesData.instances)) {
              instances = instancesData.instances;
            }

            const otpInstanceName = otpData.value.instance_name.toLowerCase();
            const foundInstance = instances.find((inst: any) => {
              const name = (inst.instanceName || inst.instance?.instanceName || inst.name || '').toLowerCase();
              return name === otpInstanceName;
            });

            otpExists = !!foundInstance;
            
            if (foundInstance) {
              // Verificar estado da conexão
              const { data: stateData } = await supabase.functions.invoke('send-whatsapp-evolution', {
                body: {
                  action: 'connectionState',
                  apiUrl: evolutionData.value.api_url,
                  apiKey: evolutionData.value.api_key,
                  instanceName: otpData.value.instance_name,
                }
              });
              
              otpEvolutionState = stateData?.state || stateData?.instance?.state || null;
              const isConnected = otpEvolutionState === 'open';
              otpStatus = isConnected ? 'connected' : 'disconnected';
              
              // Atualizar no banco se mudou
              if (otpData.value.status !== otpStatus) {
                await supabase
                  .from('system_config')
                  .update({
                    value: { ...otpData.value, status: otpStatus }
                  })
                  .eq('key', 'otp_whatsapp');
              }
            } else {
              // Instância não existe
              otpStatus = 'missing';
              if (otpData.value.status !== 'missing') {
                await supabase
                  .from('system_config')
                  .update({
                    value: { ...otpData.value, status: 'missing' }
                  })
                  .eq('key', 'otp_whatsapp');
              }
            }
          }
        } else {
          apiReachable = false;
        }
      } catch (e) {
        console.error('Erro na verificação em tempo real:', e);
        apiReachable = false;
      }
    }

    setHealth({
      evolutionApi: {
        configured: !!(evolutionData?.value?.api_url && evolutionData?.value?.api_key),
        apiUrl: evolutionData?.value?.api_url || null,
        reachable: apiReachable,
        lastChecked: verifyRealTime ? new Date() : null,
      },
      otpInstance: {
        configured: !!otpData?.value?.instance_name,
        instanceName: otpData?.value?.instance_name || null,
        status: otpStatus,
        phoneNumber: otpData?.value?.phone_number || null,
        existsInEvolution: otpExists,
        evolutionState: otpEvolutionState,
        lastChecked: verifyRealTime ? new Date() : null,
      },
      barbershopConfigs: {
        total: allConfigs?.length || 0,
        active: activeConfigs.length,
        connected: connectedConfigs.length,
      },
    });
  };

  const fetchLogs = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: logsData, error } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Erro ao buscar logs:', error);
      return;
    }

    // Get barbershop names
    const barbershopIds = [...new Set(logsData?.filter(l => l.barbershop_id).map(l => l.barbershop_id) || [])];
    const { data: barbershops } = await supabase
      .from('barbershops')
      .select('id, name')
      .in('id', barbershopIds);

    const barbershopMap = new Map(barbershops?.map(b => [b.id, b.name]) || []);

    setLogs((logsData || []).map(log => ({
      ...log,
      barbershop_name: log.barbershop_id ? barbershopMap.get(log.barbershop_id) || 'Desconhecida' : 'Global (OTP)',
    })));
  };

  const fetchConfigs = async () => {
    const { data: configsData, error } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('provider', 'evolution')
      .not('barbershop_id', 'is', null);

    if (error) {
      console.error('Erro ao buscar configs:', error);
      return;
    }

    // Get barbershop names
    const barbershopIds = configsData?.map(c => c.barbershop_id) || [];
    const { data: barbershops } = await supabase
      .from('barbershops')
      .select('id, name')
      .in('id', barbershopIds);

    const barbershopMap = new Map(barbershops?.map(b => [b.id, b.name]) || []);

    setConfigs((configsData || []).map(config => ({
      id: config.id,
      barbershop_id: config.barbershop_id,
      barbershop_name: barbershopMap.get(config.barbershop_id) || 'Desconhecida',
      provider: config.provider,
      is_active: config.is_active,
      instance_name: config.config?.instance_name || null,
      connection_status: config.config?.connection_status || null,
      updated_at: config.updated_at,
    })));
  };

  const checkApiReachability = async () => {
    if (!health?.evolutionApi.apiUrl) return;

    setRefreshing(true);
    try {
      const { data: evolutionData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'fetchInstances',
          apiUrl: evolutionData?.value?.api_url,
          apiKey: evolutionData?.value?.api_key,
        }
      });

      if (error) throw error;

      setHealth(prev => prev ? {
        ...prev,
        evolutionApi: {
          ...prev.evolutionApi,
          reachable: true,
        }
      } : null);

      toast.success('Evolution API está acessível');
    } catch (error) {
      console.error('Erro ao verificar API:', error);
      setHealth(prev => prev ? {
        ...prev,
        evolutionApi: {
          ...prev.evolutionApi,
          reachable: false,
        }
      } : null);
      toast.error('Evolution API não está acessível');
    } finally {
      setRefreshing(false);
    }
  };

  const reconnectInstance = async (instanceName: string, barbershopId: string) => {
    setRefreshing(true);
    try {
      const { data: evolutionData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();

      if (!evolutionData?.value?.api_url) {
        toast.error('Evolution API não configurada');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'connectionState',
          apiUrl: evolutionData.value.api_url,
          apiKey: evolutionData.value.api_key,
          instanceName,
        }
      });

      if (error) throw error;

      const isConnected = data?.state === 'open' || data?.instance?.state === 'open';
      
      // Update config in database
      await supabase
        .from('whatsapp_config')
        .update({
          is_active: isConnected,
          config: {
            instance_name: instanceName,
            connection_status: isConnected ? 'connected' : 'disconnected',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('barbershop_id', barbershopId)
        .eq('provider', 'evolution');

      toast.success(isConnected ? 'Instância conectada!' : 'Instância desconectada');
      await fetchConfigs();
    } catch (error) {
      console.error('Erro ao reconectar:', error);
      toast.error('Erro ao verificar instância');
    } finally {
      setRefreshing(false);
    }
  };

  const checkOtpInstanceConnection = async () => {
    if (!health?.otpInstance.instanceName) {
      toast.error('Instância OTP não configurada');
      return;
    }

    setRefreshing(true);
    try {
      const { data: evolutionData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();

      if (!evolutionData?.value?.api_url) {
        toast.error('Evolution API não configurada');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'connectionState',
          apiUrl: evolutionData.value.api_url,
          apiKey: evolutionData.value.api_key,
          instanceName: health.otpInstance.instanceName,
        }
      });

      // Verificar se a instância existe
      const instanceNotFound = error?.message?.includes('404') || 
                               error?.message?.includes('not found') ||
                               data?.error?.includes('not found') ||
                               data?.error?.includes('Nenhuma instância');

      if (instanceNotFound) {
        // Atualizar status para 'missing'
        const { data: otpData } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'otp_whatsapp')
          .maybeSingle();

        await supabase
          .from('system_config')
          .update({
            value: { ...otpData?.value, status: 'missing' }
          })
          .eq('key', 'otp_whatsapp');

        setHealth(prev => prev ? {
          ...prev,
          otpInstance: {
            ...prev.otpInstance,
            status: 'missing',
            existsInEvolution: false,
            evolutionState: null
          }
        } : null);

        toast.error('Instância OTP não existe no Evolution', {
          description: `A instância "${health.otpInstance.instanceName}" não foi encontrada. Crie ou reconecte.`
        });
        return;
      }

      if (error) throw error;

      const state = data?.state || data?.instance?.state;
      const isConnected = state === 'open';

      // Atualizar status no system_config
      const { data: otpData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'otp_whatsapp')
        .maybeSingle();

      await supabase
        .from('system_config')
        .update({
          value: {
            ...otpData?.value,
            status: isConnected ? 'connected' : 'disconnected'
          }
        })
        .eq('key', 'otp_whatsapp');

      // Atualizar state local
      setHealth(prev => prev ? {
        ...prev,
        otpInstance: {
          ...prev.otpInstance,
          status: isConnected ? 'connected' : 'disconnected',
          existsInEvolution: true,
          evolutionState: state
        }
      } : null);

      if (isConnected) {
        toast.success('Instância OTP conectada!', {
          description: `Estado: ${state} | Instância: ${health.otpInstance.instanceName}`
        });
      } else {
        toast.warning('Instância OTP desconectada', {
          description: `Estado: ${state || 'unknown'} | Reconecte no SaaS Admin → OTP WhatsApp`
        });
      }
    } catch (error: any) {
      console.error('Erro ao verificar instância OTP:', error);
      toast.error('Erro ao verificar instância OTP', {
        description: error.message
      });
    } finally {
      setRefreshing(false);
    }
  };

  const sendTestOtp = async () => {
    if (!testPhone || testPhone.length < 10) {
      toast.error('Digite um número de telefone válido');
      return;
    }

    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp-whatsapp', {
        body: { phone: testPhone }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('OTP enviado com sucesso!', {
        description: `Código enviado para ${testPhone}`
      });
      setTestDialogOpen(false);
      setTestPhone("");
      await fetchLogs();
    } catch (error: any) {
      console.error('Erro ao enviar OTP:', error);
      toast.error('Erro ao enviar OTP', {
        description: error.message || 'Verifique os logs para mais detalhes'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const syncEvolutionInstances = async () => {
    setSyncLoading(true);
    setSyncDialogOpen(true);
    setSyncResult(null);

    try {
      // Buscar config da Evolution API
      const { data: evolutionData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();

      if (!evolutionData?.value?.api_url || !evolutionData?.value?.api_key) {
        toast.error('Evolution API não configurada');
        setSyncLoading(false);
        return;
      }

      // Buscar OTP config
      const { data: otpData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'otp_whatsapp')
        .maybeSingle();

      const otpInstanceName = otpData?.value?.instance_name || null;

      // Buscar todas as instâncias do Evolution
      const { data: evolutionResponse, error: evolutionError } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'fetchInstances',
          apiUrl: evolutionData.value.api_url,
          apiKey: evolutionData.value.api_key,
        }
      });

      if (evolutionError) {
        console.error('Erro ao buscar instâncias:', evolutionError);
        toast.error('Erro ao buscar instâncias do Evolution');
        setSyncLoading(false);
        return;
      }

      // Normalizar resposta (pode vir como array ou objeto com array)
      let instances: EvolutionInstance[] = [];
      if (Array.isArray(evolutionResponse)) {
        instances = evolutionResponse.map((inst: any) => ({
          instanceName: inst.instanceName || inst.instance?.instanceName || inst.name,
          status: inst.status || inst.instance?.status || inst.connectionStatus || 'unknown',
          owner: inst.owner || inst.instance?.owner,
          connectionStatus: inst.connectionStatus || inst.instance?.connectionStatus,
        }));
      } else if (evolutionResponse?.instances && Array.isArray(evolutionResponse.instances)) {
        instances = evolutionResponse.instances.map((inst: any) => ({
          instanceName: inst.instanceName || inst.instance?.instanceName || inst.name,
          status: inst.status || inst.instance?.status || inst.connectionStatus || 'unknown',
          owner: inst.owner || inst.instance?.owner,
          connectionStatus: inst.connectionStatus || inst.instance?.connectionStatus,
        }));
      }

      console.log('Instâncias encontradas no Evolution:', instances);

      // Verificar se OTP está nas instâncias
      const otpMatch = otpInstanceName 
        ? instances.some(inst => inst.instanceName?.toLowerCase() === otpInstanceName.toLowerCase())
        : false;

      // Buscar configs de barbearias
      const { data: barbershopConfigs } = await supabase
        .from('whatsapp_config')
        .select('barbershop_id, config')
        .eq('provider', 'evolution')
        .not('barbershop_id', 'is', null);

      // Buscar nomes das barbearias
      const barbershopIds = barbershopConfigs?.map(c => c.barbershop_id) || [];
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select('id, name')
        .in('id', barbershopIds);

      const barbershopMap = new Map(barbershops?.map(b => [b.id, b.name]) || []);

      // Verificar matches de barbearias
      const barbershopMatches = (barbershopConfigs || []).map(config => {
        const instanceName = config.config?.instance_name;
        const found = instanceName 
          ? instances.some(inst => inst.instanceName?.toLowerCase() === instanceName.toLowerCase())
          : false;
        return {
          name: barbershopMap.get(config.barbershop_id) || 'Desconhecida',
          instanceName: instanceName || 'Não configurado',
          found,
        };
      });

      setSyncResult({
        evolutionInstances: instances,
        otpConfigured: otpInstanceName,
        otpMatch,
        barbershopMatches,
      });

      // Atualizar status no banco se OTP não existe
      if (!otpMatch && otpInstanceName) {
        const { data: currentOtpData } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'otp_whatsapp')
          .maybeSingle();
          
        if (currentOtpData?.value?.status !== 'missing') {
          await supabase
            .from('system_config')
            .update({
              value: { ...currentOtpData?.value, status: 'missing' }
            })
            .eq('key', 'otp_whatsapp');
        }
        
        // Atualizar health local
        setHealth(prev => prev ? {
          ...prev,
          otpInstance: {
            ...prev.otpInstance,
            status: 'missing',
            existsInEvolution: false
          }
        } : null);
        
        toast.warning('Instância OTP não encontrada no Evolution', {
          description: `A instância "${otpInstanceName}" não existe no servidor Evolution.`
        });
      } else if (otpMatch) {
        toast.success('Sincronização concluída', {
          description: `${instances.length} instâncias encontradas no Evolution.`
        });
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar instâncias', {
        description: error.message
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const createOtpInstance = async () => {
    if (!health?.otpInstance.instanceName) {
      toast.error('Nome da instância OTP não configurado');
      return;
    }

    setCreatingOtpInstance(true);
    setOtpQrCode(null);

    try {
      const { data: evolutionData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();

      if (!evolutionData?.value?.api_url || !evolutionData?.value?.api_key) {
        toast.error('Evolution API não configurada');
        return;
      }

      // Criar instância
      const { data, error } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'createInstance',
          apiUrl: evolutionData.value.api_url,
          apiKey: evolutionData.value.api_key,
          instanceName: health.otpInstance.instanceName,
        }
      });

      if (error) throw error;

      // Buscar QR Code
      const { data: qrData, error: qrError } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'connect',
          apiUrl: evolutionData.value.api_url,
          apiKey: evolutionData.value.api_key,
          instanceName: health.otpInstance.instanceName,
        }
      });

      if (qrError) throw qrError;

      const qrCode = qrData?.base64 || qrData?.qrcode?.base64 || qrData?.code;
      if (qrCode) {
        setOtpQrCode(qrCode);
        toast.success('Instância criada! Escaneie o QR Code');
      } else {
        toast.success('Instância criada', {
          description: 'Configure a conexão na aba OTP WhatsApp'
        });
      }

      // Atualizar status
      const { data: otpData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'otp_whatsapp')
        .maybeSingle();

      await supabase
        .from('system_config')
        .update({
          value: { ...otpData?.value, status: 'connecting' }
        })
        .eq('key', 'otp_whatsapp');

      setHealth(prev => prev ? {
        ...prev,
        otpInstance: {
          ...prev.otpInstance,
          status: 'connecting',
          existsInEvolution: true
        }
      } : null);

    } catch (error: any) {
      console.error('Erro ao criar instância:', error);
      toast.error('Erro ao criar instância', {
        description: error.message
      });
    } finally {
      setCreatingOtpInstance(false);
    }
  };

  const selectExistingInstance = async (instanceName: string) => {
    try {
      const { data: otpData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'otp_whatsapp')
        .maybeSingle();

      // Verificar estado da instância
      const { data: evolutionData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();

      const { data: stateData } = await supabase.functions.invoke('send-whatsapp-evolution', {
        body: {
          action: 'connectionState',
          apiUrl: evolutionData?.value?.api_url,
          apiKey: evolutionData?.value?.api_key,
          instanceName,
        }
      });

      const state = stateData?.state || stateData?.instance?.state;
      const isConnected = state === 'open';

      await supabase
        .from('system_config')
        .update({
          value: {
            ...otpData?.value,
            instance_name: instanceName,
            status: isConnected ? 'connected' : 'disconnected'
          }
        })
        .eq('key', 'otp_whatsapp');

      toast.success('Instância OTP atualizada', {
        description: `Agora usando: ${instanceName}`
      });

      setSelectInstanceDialogOpen(false);
      setSyncDialogOpen(false);
      await fetchHealth(true);
    } catch (error: any) {
      console.error('Erro ao selecionar instância:', error);
      toast.error('Erro ao selecionar instância', {
        description: error.message
      });
    }
  };

  const verifyHealthRealTime = async () => {
    setRefreshing(true);
    try {
      await fetchHealth(true);
      toast.success('Verificação em tempo real concluída');
    } catch (error) {
      console.error('Erro na verificação:', error);
      toast.error('Erro na verificação');
    } finally {
      setRefreshing(false);
    }
  };

  const diagnoseSendOtpFunction = async () => {
    setDiagnoseLoading(true);
    setDiagnoseDialogOpen(true);
    setDiagnoseResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-otp-whatsapp', {
        body: { action: 'diagnose' }
      });

      if (error) throw error;

      setDiagnoseResult(data);
      
      if (data.suggestedFix) {
        toast.warning('Problema detectado', {
          description: data.suggestedFix.substring(0, 100)
        });
      } else if (data.realTimeCheck?.otpInstance?.connected) {
        toast.success('Função OTP operacional', {
          description: `Versão: ${data.functionVersion}`
        });
      }
    } catch (error: any) {
      console.error('Erro no diagnóstico:', error);
      setDiagnoseResult({
        error: true,
        message: error.message || 'Erro ao executar diagnóstico'
      });
      toast.error('Erro ao diagnosticar função', {
        description: error.message
      });
    } finally {
      setDiagnoseLoading(false);
    }
  };

  const viewBarbershopLogs = async (barbershopId: string, barbershopName: string) => {
    const shopLogs = logs.filter(l => l.barbershop_id === barbershopId);
    setSelectedBarbershopLogs(shopLogs);
    setSelectedBarbershopName(barbershopName);
    setLogsDialogOpen(true);
  };

  const getStatusBadge = (status: string | null, isActive: boolean) => {
    if (!status || status === 'disconnected' || !isActive) {
      return (
        <Badge variant="outline" className="text-muted-foreground border-border text-xs">
          <WifiOff className="h-3 w-3 mr-1" />
          Desconectado
        </Badge>
      );
    }
    if (status === 'connected') {
      return (
        <Badge className="bg-success/20 text-success border-success/50 text-xs">
          <Wifi className="h-3 w-3 mr-1" />
          Conectado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-warning border-warning/50 text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.phone.includes(searchTerm) || 
                         log.barbershop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.message_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = logFilter === 'all' || 
                         (logFilter === 'success' && log.status === 'sent') ||
                         (logFilter === 'failed' && log.status === 'failed');
    return matchesSearch && matchesFilter;
  });

  const logStats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
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
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-warning" />
            Saúde do Sistema WhatsApp
          </CardTitle>
          <CardDescription>
            Visão geral do status de todas as integrações WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Evolution API */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Evolution API</p>
                <p className="text-sm text-muted-foreground">
                  {health?.evolutionApi.apiUrl || 'Não configurado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {health?.evolutionApi.configured ? (
                <>
                  {health.evolutionApi.reachable === null ? (
                    <Badge variant="outline">Não verificado</Badge>
                  ) : health.evolutionApi.reachable ? (
                    <Badge className="bg-success/20 text-success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Acessível
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Inacessível
                    </Badge>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={checkApiReachability}
                    disabled={refreshing}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Não configurado
                </Badge>
              )}
            </div>
          </div>

          {/* OTP Instance */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Instância OTP Global</p>
                <p className="text-sm text-muted-foreground">
                  {health?.otpInstance.instanceName || 'Não configurado'}
                  {health?.otpInstance.phoneNumber && ` (+${health.otpInstance.phoneNumber})`}
                </p>
                {health?.otpInstance.evolutionState && (
                  <p className="text-xs text-muted-foreground">
                    Evolution state: {health.otpInstance.evolutionState}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {health?.otpInstance.configured ? (
                health.otpInstance.status === 'connected' ? (
                  <Badge className="bg-success/20 text-success">
                    <Wifi className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : health.otpInstance.status === 'missing' ? (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Não Existe
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-warning border-warning">
                    <WifiOff className="h-3 w-3 mr-1" />
                    {health.otpInstance.status || 'Desconectado'}
                  </Badge>
                )
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Não configurado
                </Badge>
              )}
            </div>
          </div>

          {/* Barbershop Configs Summary */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Barbearias com WhatsApp</p>
                <p className="text-sm text-muted-foreground">
                  {health?.barbershopConfigs.connected} conectadas de {health?.barbershopConfigs.total} configuradas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {health?.barbershopConfigs.active} ativas
              </Badge>
              <Badge className="bg-success/20 text-success">
                {health?.barbershopConfigs.connected} conectadas
              </Badge>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button 
              variant="default" 
              size="sm"
              onClick={verifyHealthRealTime}
              disabled={refreshing || !health?.evolutionApi.configured}
            >
              <Activity className={`h-4 w-4 mr-2 ${refreshing ? 'animate-pulse' : ''}`} />
              Verificar em Tempo Real
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setTestDialogOpen(true)}
              disabled={!health?.evolutionApi.configured}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Testar Envio OTP
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={syncEvolutionInstances}
              disabled={!health?.evolutionApi.configured || syncLoading}
            >
              <GitCompare className={`h-4 w-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
              Sincronizar Instâncias
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={diagnoseSendOtpFunction}
              disabled={diagnoseLoading}
            >
              <Server className={`h-4 w-4 mr-2 ${diagnoseLoading ? 'animate-spin' : ''}`} />
              Diagnosticar Função OTP
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchAllData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar Dados
            </Button>
          </div>
          
          {/* Last verified indicator */}
          {health?.evolutionApi.lastChecked && (
            <p className="text-xs text-muted-foreground pt-2">
              Última verificação em tempo real: {format(health.evolutionApi.lastChecked, "dd/MM HH:mm:ss", { locale: ptBR })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Configs and Logs */}
      <Tabs defaultValue="configs" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="configs">
            <Building2 className="h-4 w-4 mr-2" />
            Configurações ({configs.length})
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Clock className="h-4 w-4 mr-2" />
            Logs ({logs.length})
          </TabsTrigger>
        </TabsList>

        {/* Configs Tab */}
        <TabsContent value="configs">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Configurações WhatsApp por Barbearia</CardTitle>
              <CardDescription>
                Gerencie as instâncias WhatsApp de cada barbearia
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma barbearia com WhatsApp configurado
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Barbearia</TableHead>
                        <TableHead>Instância</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Última Atualização</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((config) => (
                        <TableRow key={config.id} className="border-border">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-warning" />
                              <span className="font-medium text-foreground">{config.barbershop_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {config.instance_name || '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(config.connection_status, config.is_active)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(config.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewBarbershopLogs(config.barbershop_id, config.barbershop_name)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {config.instance_name && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => reconnectInstance(config.instance_name!, config.barbershop_id)}
                                  disabled={refreshing}
                                >
                                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-foreground">Logs de Envio (Últimos 7 dias)</CardTitle>
                  <CardDescription>
                    Histórico de mensagens enviadas via WhatsApp
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{logStats.total} total</Badge>
                  <Badge className="bg-success/20 text-success">{logStats.success} enviadas</Badge>
                  <Badge variant="destructive">{logStats.failed} falhas</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por telefone, barbearia ou tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-muted border-border"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={logFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogFilter('all')}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={logFilter === 'success' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogFilter('success')}
                  >
                    Sucesso
                  </Button>
                  <Button
                    variant={logFilter === 'failed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLogFilter('failed')}
                  >
                    Falhas
                  </Button>
                </div>
              </div>

              {/* Logs Table */}
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum log encontrado
                </div>
              ) : (
                <div className="rounded-md border border-border overflow-x-auto max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card">
                      <TableRow className="border-border">
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Barbearia</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.slice(0, 100).map((log) => (
                        <TableRow key={log.id} className="border-border">
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-foreground text-sm">
                            {log.barbershop_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {log.phone}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {log.message_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.status === 'sent' ? (
                              <Badge className="bg-success/20 text-success text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Enviado
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                <XCircle className="h-3 w-3 mr-1" />
                                Falha
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-destructive text-xs max-w-[200px] truncate">
                            {log.error_message || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test OTP Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-warning" />
              Testar Envio de OTP
            </DialogTitle>
            <DialogDescription>
              Envie um código OTP de teste para verificar se o sistema está funcionando corretamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-phone">Número de Telefone</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="test-phone"
                  placeholder="11999999999"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Digite apenas os números (DDD + número)
              </p>
            </div>

            {!health?.otpInstance.configured || health?.otpInstance.status !== 'connected' ? (
              <Alert className="border-warning/50 bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">Atenção</AlertTitle>
                <AlertDescription className="text-warning/90">
                  A instância OTP global não está conectada. O sistema tentará usar uma instância de barbearia como fallback.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={sendTestOtp} disabled={testLoading}>
              {testLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar OTP de Teste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barbershop Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-warning" />
              Logs de {selectedBarbershopName}
            </DialogTitle>
            <DialogDescription>
              Histórico de mensagens enviadas por esta barbearia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedBarbershopLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log encontrado para esta barbearia
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-x-auto max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow className="border-border">
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBarbershopLogs.map((log) => (
                      <TableRow key={log.id} className="border-border">
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {log.phone}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.message_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.status === 'sent' ? (
                            <Badge className="bg-success/20 text-success text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Enviado
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Falha
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-destructive text-xs max-w-[150px] truncate">
                          {log.error_message || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync Evolution Instances Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-warning" />
              Sincronização de Instâncias Evolution
            </DialogTitle>
            <DialogDescription>
              Comparação entre instâncias no Evolution API e configurações do sistema
            </DialogDescription>
          </DialogHeader>
          
          {syncLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-warning" />
              <span className="ml-3 text-muted-foreground">Buscando instâncias...</span>
            </div>
          ) : syncResult ? (
            <div className="space-y-6">
              {/* Evolution Instances */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Instâncias no Evolution ({syncResult.evolutionInstances.length})
                </h4>
                {syncResult.evolutionInstances.length === 0 ? (
                  <Alert className="border-warning/50 bg-warning/10">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning/90">
                      Nenhuma instância encontrada no servidor Evolution. Verifique a URL e chave de API.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="rounded-md border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead>Nome da Instância</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Owner</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncResult.evolutionInstances.map((inst, idx) => (
                          <TableRow key={idx} className="border-border">
                            <TableCell className="font-mono text-sm">
                              {inst.instanceName || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={inst.status === 'open' ? 'default' : 'outline'}
                                className={inst.status === 'open' ? 'bg-success/20 text-success' : ''}
                              >
                                {inst.status || 'unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {inst.owner || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* OTP Match Check */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Instância OTP Global
                </h4>
                <div className="p-4 rounded-lg border border-border bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Configurada como:</p>
                      <p className="font-mono font-medium">
                        {syncResult.otpConfigured || 'Não configurado'}
                      </p>
                    </div>
                    <div>
                      {syncResult.otpConfigured ? (
                        syncResult.otpMatch ? (
                          <Badge className="bg-success/20 text-success">
                            <Check className="h-3 w-3 mr-1" />
                            Encontrada no Evolution
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" />
                            NÃO existe no Evolution
                          </Badge>
                        )
                      ) : (
                        <Badge variant="outline">Não configurado</Badge>
                      )}
                    </div>
                  </div>
                  {syncResult.otpConfigured && !syncResult.otpMatch && (
                    <div className="mt-4 space-y-3">
                      <Alert className="border-destructive/50 bg-destructive/10">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <AlertDescription className="text-destructive/90">
                          A instância "{syncResult.otpConfigured}" configurada para OTP não foi encontrada no servidor Evolution.
                        </AlertDescription>
                      </Alert>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={createOtpInstance}
                          disabled={creatingOtpInstance}
                        >
                          {creatingOtpInstance ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Criar Instância "{syncResult.otpConfigured}"
                        </Button>
                        {syncResult.evolutionInstances.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectInstanceDialogOpen(true)}
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            Usar Instância Existente
                          </Button>
                        )}
                      </div>
                      {otpQrCode && (
                        <div className="mt-4 p-4 bg-white rounded-lg flex flex-col items-center">
                          <p className="text-sm text-muted-foreground mb-2">Escaneie o QR Code para conectar:</p>
                          <img 
                            src={otpQrCode.startsWith('data:') ? otpQrCode : `data:image/png;base64,${otpQrCode}`} 
                            alt="QR Code" 
                            className="w-64 h-64"
                          />
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => {
                              setOtpQrCode(null);
                              syncEvolutionInstances();
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Verificar Conexão
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Barbershop Matches */}
              {syncResult.barbershopMatches.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Instâncias das Barbearias
                  </h4>
                  <div className="rounded-md border border-border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead>Barbearia</TableHead>
                          <TableHead>Instância Configurada</TableHead>
                          <TableHead>Existe no Evolution?</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncResult.barbershopMatches.map((match, idx) => (
                          <TableRow key={idx} className="border-border">
                            <TableCell>{match.name}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {match.instanceName}
                            </TableCell>
                            <TableCell>
                              {match.instanceName === 'Não configurado' ? (
                                <Badge variant="outline">-</Badge>
                              ) : match.found ? (
                                <Badge className="bg-success/20 text-success">
                                  <Check className="h-3 w-3 mr-1" />
                                  Sim
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <X className="h-3 w-3 mr-1" />
                                  Não
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Clique em "Sincronizar" para buscar instâncias
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={syncEvolutionInstances} disabled={syncLoading}>
              {syncLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar Novamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Select Existing Instance Dialog */}
      <Dialog open={selectInstanceDialogOpen} onOpenChange={setSelectInstanceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-warning" />
              Selecionar Instância Existente
            </DialogTitle>
            <DialogDescription>
              Escolha uma instância do Evolution para usar como OTP Global
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            {syncResult?.evolutionInstances.map((inst, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="w-full justify-between"
                onClick={() => selectExistingInstance(inst.instanceName)}
              >
                <span className="font-mono">{inst.instanceName}</span>
                <Badge 
                  variant={inst.status === 'open' ? 'default' : 'outline'}
                  className={inst.status === 'open' ? 'bg-success/20 text-success' : ''}
                >
                  {inst.status || 'unknown'}
                </Badge>
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectInstanceDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diagnose OTP Function Dialog */}
      <Dialog open={diagnoseDialogOpen} onOpenChange={setDiagnoseDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-warning" />
              Diagnóstico da Função send-otp-whatsapp
            </DialogTitle>
            <DialogDescription>
              Verificação em tempo real da função Edge que envia códigos OTP
            </DialogDescription>
          </DialogHeader>
          
          {diagnoseLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-warning" />
              <span className="ml-3 text-muted-foreground">Executando diagnóstico...</span>
            </div>
          ) : diagnoseResult?.error ? (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertTitle>Erro no diagnóstico</AlertTitle>
              <AlertDescription className="text-destructive/90">
                {diagnoseResult.message}
              </AlertDescription>
            </Alert>
          ) : diagnoseResult ? (
            <div className="space-y-4">
              {/* Function Version */}
              <div className="p-4 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Versão da Função:</span>
                  <Badge variant="outline" className="font-mono">
                    {diagnoseResult.functionVersion || 'Desconhecida'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">Timestamp:</span>
                  <span className="text-sm font-mono">{diagnoseResult.timestamp}</span>
                </div>
              </div>

              {/* Config */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Configuração no Banco</h4>
                <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Evolution API:</span>
                    {diagnoseResult.config?.evolutionApiConfigured ? (
                      <Badge className="bg-success/20 text-success">Configurada</Badge>
                    ) : (
                      <Badge variant="destructive">Não configurada</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">API URL:</span>
                    <span className="text-sm font-mono truncate max-w-[300px]">
                      {diagnoseResult.config?.apiUrl || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Instância OTP (DB):</span>
                    <span className="text-sm font-mono">
                      {diagnoseResult.config?.otpInstanceFromDb || 'Não configurada'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status (DB):</span>
                    <Badge variant="outline">
                      {diagnoseResult.config?.otpDbStatus || 'null'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Real Time Check */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Verificação em Tempo Real</h4>
                <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">API Acessível:</span>
                    {diagnoseResult.realTimeCheck?.apiReachable ? (
                      <Badge className="bg-success/20 text-success">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sim
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Não
                      </Badge>
                    )}
                  </div>
                  {diagnoseResult.realTimeCheck?.otpInstance && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Instância Existe:</span>
                        {diagnoseResult.realTimeCheck.otpInstance.exists ? (
                          <Badge className="bg-success/20 text-success">Sim</Badge>
                        ) : (
                          <Badge variant="destructive">Não</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Conectada:</span>
                        {diagnoseResult.realTimeCheck.otpInstance.connected ? (
                          <Badge className="bg-success/20 text-success">
                            <Wifi className="h-3 w-3 mr-1" />
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-warning border-warning">
                            <WifiOff className="h-3 w-3 mr-1" />
                            Não
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Estado:</span>
                        <span className="text-sm font-mono">
                          {diagnoseResult.realTimeCheck.otpInstance.state || 'N/A'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* All Instances */}
              {diagnoseResult.allInstances && diagnoseResult.allInstances.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">
                    Todas as Instâncias no Evolution ({diagnoseResult.allInstances.length})
                  </h4>
                  <div className="rounded-md border border-border overflow-x-auto max-h-[200px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead>Nome</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diagnoseResult.allInstances.map((inst: any, idx: number) => (
                          <TableRow key={idx} className="border-border">
                            <TableCell className="font-mono text-sm">{inst.name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={inst.state === 'open' ? 'default' : 'outline'}
                                className={inst.state === 'open' ? 'bg-success/20 text-success' : ''}
                              >
                                {inst.state || 'unknown'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Suggested Fix */}
              {diagnoseResult.suggestedFix && (
                <Alert className="border-warning/50 bg-warning/10">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <AlertTitle>Ação Sugerida</AlertTitle>
                  <AlertDescription className="text-warning/90">
                    {diagnoseResult.suggestedFix}
                  </AlertDescription>
                </Alert>
              )}

              {/* Success indicator */}
              {!diagnoseResult.suggestedFix && diagnoseResult.realTimeCheck?.otpInstance?.connected && (
                <Alert className="border-success/50 bg-success/10">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertTitle>Tudo OK!</AlertTitle>
                  <AlertDescription className="text-success/90">
                    A função OTP está configurada corretamente e a instância está conectada.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Clique em "Diagnosticar" para verificar a função
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDiagnoseDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={diagnoseSendOtpFunction} disabled={diagnoseLoading}>
              {diagnoseLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Diagnosticar Novamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
