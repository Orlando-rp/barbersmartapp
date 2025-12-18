import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Globe,
  Shield,
  Check,
  X,
  Loader2,
  RefreshCw,
  Copy,
  AlertCircle,
  CheckCircle2,
  Clock,
  Server,
  Lock,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";
import { useBarbershopDomain, BarbershopDomain } from "@/hooks/useBarbershopDomain";

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  status: 'checking' | 'valid' | 'invalid' | 'pending';
}

interface DnsVerificationStatusProps {
  onBack?: () => void;
}

const DnsVerificationStatus = ({ onBack }: DnsVerificationStatusProps) => {
  const { domain, loading, refresh } = useBarbershopDomain();
  const [checking, setChecking] = useState(false);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);

  // Initialize DNS records based on domain data
  useEffect(() => {
    if (domain?.custom_domain) {
      setDnsRecords([
        {
          type: 'A',
          name: '@',
          value: '185.158.133.1',
          status: domain.dns_verified_at ? 'valid' : 'pending'
        },
        {
          type: 'A',
          name: 'www',
          value: '185.158.133.1',
          status: domain.dns_verified_at ? 'valid' : 'pending'
        },
        {
          type: 'TXT',
          name: '_lovable',
          value: domain.dns_verification_token || 'Gerando...',
          status: domain.dns_verified_at ? 'valid' : 'pending'
        }
      ]);
    }
  }, [domain]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!domain?.id) return;

    const channel = supabase
      .channel('dns-verification-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'barbershop_domains',
          filter: `id=eq.${domain.id}`
        },
        (payload) => {
          console.log('Domain updated:', payload);
          refresh();
          
          const newData = payload.new as BarbershopDomain;
          if (newData.dns_verified_at && !domain.dns_verified_at) {
            toast.success("DNS verificado com sucesso!");
          }
          if (newData.ssl_status === 'active' && domain.ssl_status !== 'active') {
            toast.success("SSL ativado com sucesso!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [domain?.id, refresh]);

  // Auto-check DNS status periodically
  useEffect(() => {
    if (!autoCheckEnabled || !domain?.custom_domain || domain.custom_domain_status === 'active') return;

    const interval = setInterval(() => {
      handleCheckDns();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [autoCheckEnabled, domain?.custom_domain, domain?.custom_domain_status]);

  const handleCheckDns = async () => {
    if (!domain?.custom_domain) return;
    
    setChecking(true);
    setDnsRecords(records => records.map(r => ({ ...r, status: 'checking' as const })));

    try {
      // Call real DNS verification Edge Function
      const { data, error } = await supabase.functions.invoke('verify-dns', {
        body: {
          domain: domain.custom_domain,
          verificationToken: domain.dns_verification_token,
          barbershopId: domain.barbershop_id
        }
      });

      if (error) throw error;

      console.log('DNS verification result:', data);

      // Update records based on real DNS check results
      setDnsRecords(records => records.map(r => {
        if (r.type === 'A' && r.name === '@') {
          return { ...r, status: data.aRecord?.configured ? 'valid' : 'pending' };
        }
        if (r.type === 'A' && r.name === 'www') {
          return { ...r, status: data.wwwRecord?.configured ? 'valid' : 'pending' };
        }
        if (r.type === 'TXT') {
          return { ...r, status: data.txtRecord?.configured ? 'valid' : 'pending' };
        }
        return r;
      }));

      setLastChecked(new Date());
      
      // Show appropriate toast based on overall status
      if (data.overallStatus === 'verified') {
        toast.success("DNS verificado com sucesso! Todos os registros estão corretos.");
        refresh(); // Refresh domain data to get updated status
      } else if (data.overallStatus === 'partial') {
        const configured = [];
        const pending = [];
        if (data.aRecord?.configured) configured.push('A');
        else pending.push('A');
        if (data.txtRecord?.configured) configured.push('TXT');
        else pending.push('TXT');
        
        toast.info(`Parcialmente configurado. Faltam: ${pending.join(', ')}`);
      } else {
        toast.info("Aguardando propagação do DNS... Registros ainda não detectados.");
      }
    } catch (error) {
      console.error('Error checking DNS:', error);
      toast.error("Erro ao verificar DNS. Tente novamente.");
      setDnsRecords(records => records.map(r => ({ ...r, status: 'pending' })));
    } finally {
      setChecking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const getStatusIcon = (status: DnsRecord['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'valid':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'invalid':
        return <X className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getOverallProgress = () => {
    if (!domain?.custom_domain) return 0;
    
    let progress = 25; // Domain configured
    
    if (domain.dns_verified_at) progress += 25;
    if (domain.ssl_status === 'provisioning') progress += 12;
    if (domain.ssl_status === 'active') progress += 25;
    if (domain.custom_domain_status === 'active') progress += 25;
    
    return Math.min(progress, 100);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: React.ReactNode }> = {
      active: { variant: "default", label: "Ativo", icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
      pending: { variant: "secondary", label: "Pendente", icon: <Clock className="h-3 w-3 mr-1" /> },
      verifying: { variant: "outline", label: "Verificando", icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
      provisioning: { variant: "outline", label: "Provisionando", icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" /> },
      failed: { variant: "destructive", label: "Falhou", icon: <X className="h-3 w-3 mr-1" /> },
    };
    
    const c = config[status] || config.pending;
    return (
      <Badge variant={c.variant} className="flex items-center">
        {c.icon}
        {c.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!domain?.custom_domain) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Nenhum domínio personalizado configurado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure um domínio personalizado para ver o status de verificação
          </p>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Voltar para Configurações
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Verificação de DNS
          </h2>
          <p className="text-sm text-muted-foreground">
            Status em tempo real da configuração do seu domínio
          </p>
        </div>
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            Voltar
          </Button>
        )}
      </div>

      {/* Domain Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{domain.custom_domain}</CardTitle>
            </div>
            {getStatusBadge(domain.custom_domain_status)}
          </div>
          <CardDescription>
            Progresso da configuração do domínio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso geral</span>
              <span className="font-medium">{getOverallProgress()}%</span>
            </div>
            <Progress value={getOverallProgress()} className="h-2" />
          </div>

          {/* Status Steps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3 rounded-lg border ${domain.custom_domain ? 'bg-success/10 border-success/30' : 'bg-muted'}`}>
              <div className="flex items-center gap-2 mb-1">
                {domain.custom_domain ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-xs font-medium">Domínio</span>
              </div>
              <p className="text-xs text-muted-foreground">Configurado</p>
            </div>

            <div className={`p-3 rounded-lg border ${domain.dns_verified_at ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'}`}>
              <div className="flex items-center gap-2 mb-1">
                {domain.dns_verified_at ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Clock className="h-4 w-4 text-warning" />
                )}
                <span className="text-xs font-medium">DNS</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {domain.dns_verified_at ? 'Verificado' : 'Pendente'}
              </p>
            </div>

            <div className={`p-3 rounded-lg border ${domain.ssl_status === 'active' ? 'bg-success/10 border-success/30' : 'bg-muted'}`}>
              <div className="flex items-center gap-2 mb-1">
                {domain.ssl_status === 'active' ? (
                  <Lock className="h-4 w-4 text-success" />
                ) : domain.ssl_status === 'provisioning' ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-xs font-medium">SSL</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {domain.ssl_status === 'active' ? 'Ativo' : 
                 domain.ssl_status === 'provisioning' ? 'Provisionando' : 'Pendente'}
              </p>
            </div>

            <div className={`p-3 rounded-lg border ${domain.custom_domain_status === 'active' ? 'bg-success/10 border-success/30' : 'bg-muted'}`}>
              <div className="flex items-center gap-2 mb-1">
                {domain.custom_domain_status === 'active' ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-xs font-medium">Status</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {domain.custom_domain_status === 'active' ? 'Ativo' : 'Pendente'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DNS Records Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Registros DNS Necessários
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Configure estes registros no painel do seu provedor de domínio
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckDns}
              disabled={checking}
              className="gap-2"
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Verificar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {dnsRecords.map((record, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border bg-muted/30 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(record.status)}
                  <Badge variant="outline" className="font-mono text-xs">
                    {record.type}
                  </Badge>
                  <span className="text-sm font-medium">{record.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => copyToClipboard(record.value)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 p-2 bg-background rounded border">
                <code className="text-xs font-mono break-all flex-1">
                  {record.value}
                </code>
              </div>
            </div>
          ))}

          {lastChecked && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              Última verificação: {lastChecked.toLocaleTimeString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instructions Alert */}
      {domain.custom_domain_status !== 'active' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Próximos passos</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse o painel de controle do seu provedor de domínio</li>
              <li>Adicione os registros DNS listados acima</li>
              <li>Aguarde a propagação (pode levar até 72 horas)</li>
              <li>O status será atualizado automaticamente quando a verificação for concluída</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {domain.custom_domain_status === 'active' && (
        <Alert className="bg-success/10 border-success/30">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertTitle className="text-success">Domínio Ativo!</AlertTitle>
          <AlertDescription className="text-xs">
            Seu domínio está configurado e funcionando corretamente.
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 ml-1"
              onClick={() => window.open(`https://${domain.custom_domain}`, '_blank')}
            >
              Visitar site <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default DnsVerificationStatus;
