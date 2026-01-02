import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DiagnosticData {
  otpInstanceConfigured: boolean;
  otpInstanceName: string | null;
  otpStatus: string | null;
  evolutionApiConfigured: boolean;
  activeWhatsappConfigs: number;
  totalWhatsappConfigs: number;
}

export const WhatsAppDiagnostic = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      return role?.role === 'super_admin' || role?.role === 'admin';
    } catch {
      return false;
    }
  };

  const fetchDiagnostic = async () => {
    setLoading(true);
    try {
      // Check Evolution API config
      const { data: evolutionConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'evolution_api')
        .maybeSingle();

      // Check OTP WhatsApp config
      const { data: otpConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'otp_whatsapp')
        .maybeSingle();

      // Count whatsapp_config records
      const { data: allConfigs } = await supabase
        .from('whatsapp_config')
        .select('id, is_active, provider')
        .eq('provider', 'evolution');

      const { data: activeConfigs } = await supabase
        .from('whatsapp_config')
        .select('id')
        .eq('provider', 'evolution')
        .eq('is_active', true);

      setData({
        otpInstanceConfigured: !!otpConfig?.value?.instance_name,
        otpInstanceName: otpConfig?.value?.instance_name || null,
        otpStatus: otpConfig?.value?.status || null,
        evolutionApiConfigured: !!(evolutionConfig?.value?.api_url && evolutionConfig?.value?.api_key),
        activeWhatsappConfigs: activeConfigs?.length || 0,
        totalWhatsappConfigs: allConfigs?.length || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar diagnóstico:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const admin = await checkAdminStatus();
      setIsAdmin(admin);
      if (admin) {
        await fetchDiagnostic();
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Only show for admins
  if (!isAdmin) return null;

  const getStatusIcon = (ok: boolean) => {
    return ok ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive" />
    );
  };

  const canSendOtp = data && (data.otpInstanceConfigured || data.activeWhatsappConfigs > 0) && data.evolutionApiConfigured;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full mt-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Diagnóstico WhatsApp OTP
          {isOpen ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2 border-dashed">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Status do WhatsApp OTP</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchDiagnostic} disabled={loading}>
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-4 space-y-2">
            {loading ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : data ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span>Evolution API configurada</span>
                  {getStatusIcon(data.evolutionApiConfigured)}
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span>Instância OTP global</span>
                  <div className="flex items-center gap-2">
                    {data.otpInstanceConfigured ? (
                      <>
                        <Badge variant="outline" className="text-xs py-0">
                          {data.otpInstanceName}
                        </Badge>
                        <Badge 
                          variant={data.otpStatus === 'connected' ? 'default' : 'secondary'}
                          className="text-xs py-0"
                        >
                          {data.otpStatus || 'unknown'}
                        </Badge>
                      </>
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span>Configs WhatsApp ativas</span>
                  <Badge variant={data.activeWhatsappConfigs > 0 ? 'default' : 'secondary'} className="text-xs py-0">
                    {data.activeWhatsappConfigs} / {data.totalWhatsappConfigs}
                  </Badge>
                </div>

                <div className="border-t pt-2 mt-2">
                  <div className="flex items-center gap-2 text-xs">
                    {canSendOtp ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">OTP via WhatsApp está operacional</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-amber-600">
                          {!data.evolutionApiConfigured
                            ? 'Configure a Evolution API no painel SaaS Admin'
                            : 'Configure a instância OTP global ou conecte o WhatsApp de uma barbearia'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Erro ao carregar dados</p>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};
