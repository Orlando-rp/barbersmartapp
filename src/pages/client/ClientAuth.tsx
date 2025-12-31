import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useBranding } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Phone, ArrowLeft, MessageCircle, CheckCircle2, Scissors } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'phone' | 'otp' | 'success';

export default function ClientAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { effectiveBranding, currentLogoUrl, hasWhiteLabel, tenantBarbershopName } = useBranding();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Check if already logged in as client
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Verificar se é cliente
        const { data: clientUser } = await supabase
          .from('client_users')
          .select('client_id')
          .eq('user_id', session.user.id)
          .single();

        if (clientUser) {
          navigate('/cliente', { replace: true });
        }
      }
    };
    checkSession();
  }, [navigate]);

  // Handle error from redirect
  useEffect(() => {
    if (location.state?.error === 'not_client') {
      setError('Esta conta não está vinculada a um cliente. Por favor, faça login com o número de telefone cadastrado na barbearia.');
    }
  }, [location.state]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const getCleanPhone = () => {
    return phone.replace(/\D/g, '');
  };

  const sendOtp = async () => {
    const cleanPhone = getCleanPhone();
    if (cleanPhone.length < 10) {
      setError('Por favor, insira um número de telefone válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://nmsblmmhigwsevnqmhwn.supabase.co'}/functions/v1/send-otp-whatsapp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar código');
      }

      setStep('otp');
      setCountdown(60);
      toast.success('Código enviado!', {
        description: 'Verifique seu WhatsApp'
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Por favor, insira o código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanPhone = getCleanPhone();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://nmsblmmhigwsevnqmhwn.supabase.co'}/functions/v1/verify-otp-client`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone, code: otp }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Código inválido ou expirado');
      }

      // Login with the returned session token
      if (data.sessionToken) {
        const loginResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL || 'https://nmsblmmhigwsevnqmhwn.supabase.co'}/functions/v1/login-with-token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: data.sessionToken, userId: data.userId }),
          }
        );

        const loginData = await loginResponse.json();
        
        if (loginData.session) {
          await supabase.auth.setSession(loginData.session);
        }
      }

      setStep('success');
      toast.success('Login realizado com sucesso!');
      
      // Redirect after brief delay
      setTimeout(() => {
        navigate('/cliente', { replace: true });
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar código');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = () => {
    if (countdown === 0) {
      setOtp('');
      sendOtp();
    }
  };

  // Get display name - prioritize tenant branding
  const displayName = hasWhiteLabel && tenantBarbershopName 
    ? tenantBarbershopName 
    : effectiveBranding?.system_name || 'Barber Smart';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {step === 'success' ? (
              <CheckCircle2 className="h-6 w-6 text-primary" />
            ) : currentLogoUrl ? (
              <img 
                src={currentLogoUrl} 
                alt={displayName} 
                className="h-12 w-12 object-contain"
              />
            ) : (
              <Scissors className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle>
            {step === 'phone' && (currentLogoUrl ? 'Área do Cliente' : `Área do Cliente${hasWhiteLabel && tenantBarbershopName ? ` - ${tenantBarbershopName}` : ''}`)}
            {step === 'otp' && 'Digite o código'}
            {step === 'success' && 'Bem-vindo!'}
          </CardTitle>
          <CardDescription>
            {step === 'phone' && 'Entre com o número de telefone cadastrado na barbearia'}
            {step === 'otp' && `Enviamos um código de 6 dígitos para o WhatsApp ${phone}`}
            {step === 'success' && 'Login realizado com sucesso. Redirecionando...'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'phone' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Número do WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="pl-10"
                    maxLength={15}
                  />
                </div>
              </div>

              <Button 
                onClick={sendOtp} 
                className="w-full" 
                disabled={loading || getCleanPhone().length < 10}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Receber código via WhatsApp
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Você receberá um código de 6 dígitos no WhatsApp para fazer login
              </p>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <InputOTP
                  value={otp}
                  onChange={setOtp}
                  maxLength={6}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                onClick={verifyOtp} 
                className="w-full" 
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Confirmar código'
                )}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setError(null);
                  }}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Voltar
                </Button>

                <Button
                  variant="link"
                  size="sm"
                  onClick={resendOtp}
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar código'}
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
