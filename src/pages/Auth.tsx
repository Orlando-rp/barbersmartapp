import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Scissors, Building2, Check, ArrowRight, ArrowLeft, Plus, Trash2, Star, Loader2, MessageCircle, Phone, RefreshCw } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { PlanSelectionStep } from '@/components/auth/PlanSelectionStep';
import { WhatsAppDiagnostic } from '@/components/auth/WhatsAppDiagnostic';

interface SocialProviders {
  google: { enabled: boolean };
  facebook: { enabled: boolean };
}

const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
});

const step1Schema = z.object({
  fullName: z.string().min(3, { message: 'Nome deve ter no mínimo 3 caracteres' }),
  email: z.string().email({ message: 'Email inválido' }),
  phone: z.string().min(10, { message: 'Telefone inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

const phoneSchema = z.string().min(10, { message: 'Telefone inválido' }).max(15);

interface BarbershopUnit {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

const getRedirectPath = (role: string | null): string => {
  switch (role) {
    case 'super_admin':
      return '/saas-admin';
    case 'admin':
    case 'barbeiro':
    case 'recepcionista':
    default:
      return '/dashboard';
  }
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, refreshBarbershops, userRole, loading: authLoading } = useAuth();
  const { effectiveBranding, currentLogoUrl, hasWhiteLabel, tenantBarbershopName } = useBranding();
  
  // Get plan parameter from URL (from landing page)
  const preSelectedPlan = searchParams.get('plan');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [errors, setErrors] = useState<any>({});
  const [socialProviders, setSocialProviders] = useState<SocialProviders>({
    google: { enabled: false },
    facebook: { enabled: false }
  });

  // Login method tabs
  const [loginMethod, setLoginMethod] = useState<'email' | 'whatsapp'>('email');

  // WhatsApp OTP state
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpStep, setOtpStep] = useState<'phone' | 'code' | 'processing'>('phone');
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // Signup wizard step
  const [signupStep, setSignupStep] = useState(1);

  // Signup method (email or whatsapp)
  const [signupMethod, setSignupMethod] = useState<'email' | 'whatsapp'>('email');
  
  // WhatsApp signup OTP state (separate from login)
  const [signupWhatsappPhone, setSignupWhatsappPhone] = useState('');
  const [signupOtpCode, setSignupOtpCode] = useState('');
  const [signupOtpStep, setSignupOtpStep] = useState<'phone' | 'code' | 'details' | 'processing'>('phone');
  const [signupOtpExpiresAt, setSignupOtpExpiresAt] = useState<Date | null>(null);
  const [signupResendCooldown, setSignupResendCooldown] = useState(0);
  const [signupVerifiedPhone, setSignupVerifiedPhone] = useState<string | null>(null);

  // Password recovery state
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryOtpCode, setRecoveryOtpCode] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'phone' | 'code' | 'newPassword' | 'processing'>('phone');
  const [recoveryOtpExpiresAt, setRecoveryOtpExpiresAt] = useState<Date | null>(null);
  const [recoveryResendCooldown, setRecoveryResendCooldown] = useState(0);
  const [recoverySessionToken, setRecoverySessionToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Step 1: User data
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupIsAlsoBarber, setSignupIsAlsoBarber] = useState(false);

  // Step 2: Multiple barbershops
  const [barbershopUnits, setBarbershopUnits] = useState<BarbershopUnit[]>([
    { id: '1', name: '', address: '', phone: '', email: '', isPrimary: true }
  ]);

  // Step 3: Plan selection
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>('');

  // Current unit being edited
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);

  useEffect(() => {
    if (user && !authLoading && userRole !== undefined) {
      const redirectPath = getRedirectPath(userRole);
      navigate(redirectPath);
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    loadSocialProviders();
  }, []);

  // Resend cooldown timer (login)
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Resend cooldown timer (signup)
  useEffect(() => {
    if (signupResendCooldown > 0) {
      const timer = setTimeout(() => setSignupResendCooldown(signupResendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [signupResendCooldown]);

  // Signup OTP expiration timer
  useEffect(() => {
    if (signupOtpExpiresAt) {
      const interval = setInterval(() => {
        if (new Date() > signupOtpExpiresAt) {
          setSignupOtpStep('phone');
          setSignupOtpCode('');
          setSignupOtpExpiresAt(null);
          toast.error('Código expirado', { description: 'Solicite um novo código' });
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [signupOtpExpiresAt]);

  // Recovery OTP cooldown timer
  useEffect(() => {
    if (recoveryResendCooldown > 0) {
      const timer = setTimeout(() => setRecoveryResendCooldown(recoveryResendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [recoveryResendCooldown]);

  // Recovery OTP expiration timer
  useEffect(() => {
    if (recoveryOtpExpiresAt) {
      const interval = setInterval(() => {
        if (new Date() > recoveryOtpExpiresAt) {
          setRecoveryStep('phone');
          setRecoveryOtpCode('');
          setRecoveryOtpExpiresAt(null);
          toast.error('Código expirado', { description: 'Solicite um novo código' });
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [recoveryOtpExpiresAt]);

  // OTP expiration timer
  useEffect(() => {
    if (otpExpiresAt) {
      const interval = setInterval(() => {
        if (new Date() > otpExpiresAt) {
          setOtpStep('phone');
          setOtpCode('');
          setOtpExpiresAt(null);
          toast.error('Código expirado', { description: 'Solicite um novo código' });
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpExpiresAt]);

  const loadSocialProviders = async () => {
    try {
      const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'social_auth_providers')
        .maybeSingle();

      if (data?.value) {
        setSocialProviders({
          google: { enabled: data.value.google?.enabled || false },
          facebook: { enabled: data.value.facebook?.enabled || false }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar provedores sociais:', error);
    }
  };

  const formatPhoneForDisplay = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const getTimeRemaining = () => {
    if (!otpExpiresAt) return '';
    const diff = Math.max(0, Math.floor((otpExpiresAt.getTime() - Date.now()) / 1000));
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = async () => {
    setErrors({});
    
    try {
      phoneSchema.parse(whatsappPhone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ phone: error.errors[0].message });
        return;
      }
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-otp-whatsapp', {
        body: { phone: whatsappPhone }
      });

      if (error) {
        // Extract error message from FunctionsHttpError
        const errorBody = error.context?.body;
        let errorMessage = 'Erro ao enviar código';
        if (errorBody) {
          try {
            const parsed = typeof errorBody === 'string' ? JSON.parse(errorBody) : errorBody;
            errorMessage = parsed.error || errorMessage;
          } catch {
            errorMessage = error.message || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }
      
      if (!data?.success) throw new Error(data?.error || 'Erro ao enviar código');

      setOtpStep('code');
      setOtpExpiresAt(new Date(data.expiresAt));
      setResendCooldown(60);
      
      toast.success('Código enviado!', {
        description: 'Verifique seu WhatsApp para o código de verificação'
      });
    } catch (error: any) {
      console.error('Erro ao enviar OTP:', error);
      toast.error('Erro ao enviar código', {
        description: error.message || 'Tente novamente em alguns instantes'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      setErrors({ otp: 'Digite o código completo de 6 dígitos' });
      return;
    }

    setLoading(true);
    setOtpStep('processing');

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp-whatsapp', {
        body: { phone: whatsappPhone, code: otpCode }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setSessionToken(data.sessionToken);
      setIsNewUser(data.isNewUser);

      // Finalizar login
      const { data: loginData, error: loginError } = await supabase.functions.invoke('login-with-token', {
        body: { phone: whatsappPhone, sessionToken: data.sessionToken }
      });

      if (loginError) throw loginError;
      if (!loginData.success) throw new Error(loginData.error);

      if (loginData.loginUrl) {
        // Redirecionar para o magic link
        window.location.href = loginData.loginUrl;
      } else if (data.isNewUser) {
        // Novo usuário - redirecionar para completar perfil
        toast.success('Conta criada!', {
          description: 'Complete seu cadastro para continuar'
        });
        navigate('/complete-profile');
      } else {
        // Usuário existente - redirecionamento será feito pelo useEffect
        toast.success('Login realizado!');
        await refreshBarbershops();
        // useEffect fará o redirecionamento baseado no userRole
      }
    } catch (error: any) {
      console.error('Erro ao verificar OTP:', error);
      setOtpStep('code');
      toast.error('Código inválido', {
        description: error.message || 'Verifique o código e tente novamente'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    await handleSendOTP();
  };

  // WhatsApp Signup OTP functions
  const getSignupTimeRemaining = () => {
    if (!signupOtpExpiresAt) return '';
    const diff = Math.max(0, Math.floor((signupOtpExpiresAt.getTime() - Date.now()) / 1000));
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSignupSendOTP = async () => {
    setErrors({});
    
    try {
      phoneSchema.parse(signupWhatsappPhone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ signupPhone: error.errors[0].message });
        return;
      }
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-otp-whatsapp', {
        body: { phone: signupWhatsappPhone }
      });

      if (error) {
        const errorBody = error.context?.body;
        let errorMessage = 'Erro ao enviar código';
        if (errorBody) {
          try {
            const parsed = typeof errorBody === 'string' ? JSON.parse(errorBody) : errorBody;
            errorMessage = parsed.error || errorMessage;
          } catch {
            errorMessage = error.message || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }
      
      if (!data?.success) throw new Error(data?.error || 'Erro ao enviar código');

      setSignupOtpStep('code');
      setSignupOtpExpiresAt(new Date(data.expiresAt));
      setSignupResendCooldown(60);
      
      toast.success('Código enviado!', {
        description: 'Verifique seu WhatsApp para o código de verificação'
      });
    } catch (error: any) {
      console.error('Erro ao enviar OTP:', error);
      toast.error('Erro ao enviar código', {
        description: error.message || 'Tente novamente em alguns instantes'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignupVerifyOTP = async () => {
    if (signupOtpCode.length !== 6) {
      setErrors({ signupOtp: 'Digite o código completo de 6 dígitos' });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp-whatsapp', {
        body: { phone: signupWhatsappPhone, code: signupOtpCode }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Phone verified - proceed to details form
      setSignupVerifiedPhone(signupWhatsappPhone);
      setSignupPhone(signupWhatsappPhone); // Pre-fill the phone field
      setSignupOtpStep('details');
      
      toast.success('Telefone verificado!', {
        description: 'Complete seus dados para continuar'
      });
    } catch (error: any) {
      console.error('Erro ao verificar OTP:', error);
      toast.error('Código inválido', {
        description: error.message || 'Verifique o código e tente novamente'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignupResendOTP = async () => {
    if (signupResendCooldown > 0) return;
    await handleSignupSendOTP();
  };

  // Password Recovery OTP functions
  const getRecoveryTimeRemaining = () => {
    if (!recoveryOtpExpiresAt) return '';
    const diff = Math.max(0, Math.floor((recoveryOtpExpiresAt.getTime() - Date.now()) / 1000));
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRecoverySendOTP = async () => {
    setErrors({});
    
    try {
      phoneSchema.parse(recoveryPhone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ recoveryPhone: error.errors[0].message });
        return;
      }
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-otp-whatsapp', {
        body: { phone: recoveryPhone }
      });

      if (error) {
        const errorBody = error.context?.body;
        let errorMessage = 'Erro ao enviar código';
        if (errorBody) {
          try {
            const parsed = typeof errorBody === 'string' ? JSON.parse(errorBody) : errorBody;
            errorMessage = parsed.error || errorMessage;
          } catch {
            errorMessage = error.message || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }
      
      if (!data?.success) throw new Error(data?.error || 'Erro ao enviar código');

      setRecoveryStep('code');
      setRecoveryOtpExpiresAt(new Date(data.expiresAt));
      setRecoveryResendCooldown(60);
      
      toast.success('Código enviado!', {
        description: 'Verifique seu WhatsApp para o código de verificação'
      });
    } catch (error: any) {
      console.error('Erro ao enviar OTP de recuperação:', error);
      toast.error('Erro ao enviar código', {
        description: error.message || 'Tente novamente em alguns instantes'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryVerifyOTP = async () => {
    if (recoveryOtpCode.length !== 6) {
      setErrors({ recoveryOtp: 'Digite o código completo de 6 dígitos' });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-otp-whatsapp', {
        body: { phone: recoveryPhone, code: recoveryOtpCode }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Save session token for password reset
      setRecoverySessionToken(data.sessionToken);
      setRecoveryStep('newPassword');
      
      toast.success('Telefone verificado!', {
        description: 'Defina sua nova senha'
      });
    } catch (error: any) {
      console.error('Erro ao verificar OTP de recuperação:', error);
      toast.error('Código inválido', {
        description: error.message || 'Verifique o código e tente novamente'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrors({});

    if (newPassword.length < 6) {
      setErrors({ newPassword: 'Senha deve ter no mínimo 6 caracteres' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrors({ confirmNewPassword: 'As senhas não coincidem' });
      return;
    }

    setLoading(true);
    setRecoveryStep('processing');

    try {
      const { data, error } = await supabase.functions.invoke('reset-password-whatsapp', {
        body: { 
          phone: recoveryPhone, 
          sessionToken: recoverySessionToken,
          newPassword 
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Senha alterada com sucesso!', {
        description: 'Faça login com sua nova senha'
      });

      // Reset recovery state and go back to login
      setShowPasswordRecovery(false);
      setRecoveryStep('phone');
      setRecoveryPhone('');
      setRecoveryOtpCode('');
      setRecoverySessionToken(null);
      setNewPassword('');
      setConfirmNewPassword('');
      setLoginMethod('email');

      // Pre-fill email if available
      if (data.email) {
        setLoginEmail(data.email);
      }
    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      setRecoveryStep('newPassword');
      toast.error('Erro ao alterar senha', {
        description: error.message || 'Tente novamente'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryResendOTP = async () => {
    if (recoveryResendCooldown > 0) return;
    await handleRecoverySendOTP();
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      setSocialLoading(provider);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error(`Erro no login com ${provider}:`, error);
      toast.error(`Erro ao fazer login com ${provider}`, {
        description: error.message
      });
      setSocialLoading(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const validatedData = loginSchema.parse({
        email: loginEmail,
        password: loginPassword,
      });

      const { error } = await signIn(validatedData.email, validatedData.password);
      
      // Redirecionamento será feito pelo useEffect quando userRole estiver disponível
      if (error) {
        throw error;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: any = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            formattedErrors[err.path[0]] = err.message;
          }
        });
        setErrors(formattedErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Next = () => {
    setErrors({});
    
    try {
      step1Schema.parse({
        fullName: signupFullName,
        email: signupEmail,
        phone: signupPhone,
        password: signupPassword,
        confirmPassword: signupConfirmPassword,
      });
      
      setSignupStep(2);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: any = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            formattedErrors[err.path[0]] = err.message;
          }
        });
        setErrors(formattedErrors);
      }
    }
  };

  const handleStep2Next = () => {
    if (!validateUnits()) return;
    setSignupStep(3);
  };

  const handlePlanSelect = (planId: string, planSlug: string) => {
    setSelectedPlanId(planId);
    setSelectedPlanSlug(planSlug);
  };

  const updateCurrentUnit = (field: keyof BarbershopUnit, value: string | boolean) => {
    setBarbershopUnits(prev => prev.map((unit, idx) => 
      idx === currentUnitIndex ? { ...unit, [field]: value } : unit
    ));
  };

  const addNewUnit = () => {
    const newUnit: BarbershopUnit = {
      id: Date.now().toString(),
      name: '',
      address: '',
      phone: '',
      email: '',
      isPrimary: false,
    };
    setBarbershopUnits(prev => [...prev, newUnit]);
    setCurrentUnitIndex(barbershopUnits.length);
  };

  const removeUnit = (index: number) => {
    if (barbershopUnits.length === 1) {
      toast.error('Você precisa ter pelo menos uma unidade');
      return;
    }
    
    const unitToRemove = barbershopUnits[index];
    const newUnits = barbershopUnits.filter((_, idx) => idx !== index);
    
    // If removing the primary unit, set the first one as primary
    if (unitToRemove.isPrimary && newUnits.length > 0) {
      newUnits[0].isPrimary = true;
    }
    
    setBarbershopUnits(newUnits);
    setCurrentUnitIndex(Math.min(currentUnitIndex, newUnits.length - 1));
  };

  const setPrimaryUnit = (index: number) => {
    setBarbershopUnits(prev => prev.map((unit, idx) => ({
      ...unit,
      isPrimary: idx === index
    })));
  };

  const validateUnits = (): boolean => {
    for (let i = 0; i < barbershopUnits.length; i++) {
      if (!barbershopUnits[i].name || barbershopUnits[i].name.length < 3) {
        setCurrentUnitIndex(i);
        setErrors({ barbershopName: 'Nome da barbearia deve ter no mínimo 3 caracteres' });
        return false;
      }
    }
    return true;
  };

  const handleSignupComplete = async () => {
    setErrors({});
    
    if (!selectedPlanId) {
      toast.error('Selecione um plano para continuar');
      return;
    }
    
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;

      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signupFullName,
            phone: signupPhone,
            is_also_barber: signupIsAlsoBarber,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      const userId = authData.user.id;
      let primaryBarbershopId: string | null = null;

      // 2. First determine the primary barbershop
      const primaryUnit = barbershopUnits.find(u => u.isPrimary) || barbershopUnits[0];

      // 3. Create all barbershops and collect their IDs
      const createdBarbershops: { id: string; isPrimary: boolean }[] = [];
      
      for (const unit of barbershopUnits) {
        const { data: barbershopData, error: barbershopError } = await supabase
          .from('barbershops')
          .insert({
            name: unit.name,
            address: unit.address || null,
            phone: unit.phone || signupPhone,
            email: unit.email || signupEmail,
            active: true,
          })
          .select()
          .single();

        if (barbershopError) throw barbershopError;

        const barbershopId = barbershopData.id;
        createdBarbershops.push({ id: barbershopId, isPrimary: unit.isPrimary });

        if (unit.isPrimary) {
          primaryBarbershopId = barbershopId;
        }
      }

      // 4. Create profile FIRST (required for staff foreign key)
      if (primaryBarbershopId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            barbershop_id: primaryBarbershopId,
            full_name: signupFullName,
            phone: signupPhone,
          });

        if (profileError) {
          console.error('Erro ao criar profile:', profileError);
          throw profileError;
        }
      }

      // 5. Now create user_barbershops, roles, and staff for each barbershop
      for (const barbershop of createdBarbershops) {
        // Create user_barbershops entry
        const { error: ubError } = await supabase
          .from('user_barbershops')
          .insert({
            user_id: userId,
            barbershop_id: barbershop.id,
            is_primary: barbershop.isPrimary,
          });

        if (ubError) console.error('Erro ao criar user_barbershops:', ubError);

        // Create admin role for each barbershop
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'admin',
            barbershop_id: barbershop.id,
          });

        if (roleError) console.error('Erro ao criar user_role:', roleError);

        // If also barber, create staff entry for each barbershop
        if (signupIsAlsoBarber) {
          const { error: staffError } = await supabase
            .from('staff')
            .insert({
              user_id: userId,
              barbershop_id: barbershop.id,
              is_also_barber: true,
              specialties: ['Corte', 'Barba'],
              commission_rate: 50,
              active: true,
            });

          if (staffError) {
            console.error('Erro ao criar staff:', staffError);
            // Continue anyway - we can add staff later
          }
        }
      }

      // 6. Create subscription with 14-day trial for the primary barbershop
      if (primaryBarbershopId && selectedPlanId) {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        const { error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            barbershop_id: primaryBarbershopId,
            plan_id: selectedPlanId,
            status: 'trialing',
            trial_ends_at: trialEndDate.toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: trialEndDate.toISOString(),
          });

        if (subscriptionError) {
          console.error('Erro ao criar subscription:', subscriptionError);
          // Continue anyway - subscription can be added later
        }
      }

      toast.success('Conta criada com sucesso!', {
        description: `${barbershopUnits.length} unidade(s) cadastrada(s). Trial de 14 dias ativado!`,
      });

      // Refresh barbershops in context
      await refreshBarbershops();
      
      navigate('/');
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      toast.error('Erro ao criar conta', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const currentUnit = barbershopUnits[currentUnitIndex];

  const renderWhatsAppLogin = () => (
    <div className="space-y-4">
      {otpStep === 'phone' && (
        <>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <MessageCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-medium">Login via WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              Receba um código de verificação no seu WhatsApp
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-phone">Número do WhatsApp</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="whatsapp-phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="pl-10"
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </div>

          <Button 
            type="button" 
            className="w-full bg-green-600 hover:bg-green-700" 
            onClick={handleSendOTP}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <MessageCircle className="mr-2 h-4 w-4" />
                Enviar código via WhatsApp
              </>
            )}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                ou use outro método
              </span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full"
            onClick={() => setLoginMethod('email')}
          >
            Entrar com Email e Senha
          </Button>
        </>
      )}

      {otpStep === 'code' && (
        <>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <MessageCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-medium">Digite o código</h3>
            <p className="text-sm text-muted-foreground">
              Enviamos um código de 6 dígitos para
            </p>
            <p className="font-medium text-green-600">
              {formatPhoneForDisplay(whatsappPhone)}
            </p>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <InputOTP
              value={otpCode}
              onChange={setOtpCode}
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

            {errors.otp && (
              <p className="text-sm text-destructive">{errors.otp}</p>
            )}

            {otpExpiresAt && (
              <p className="text-sm text-muted-foreground">
                Código expira em: <span className="font-mono font-medium">{getTimeRemaining()}</span>
              </p>
            )}
          </div>

          <Button 
            type="button" 
            className="w-full bg-green-600 hover:bg-green-700" 
            onClick={handleVerifyOTP}
            disabled={loading || otpCode.length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar e Entrar'
            )}
          </Button>

          <div className="flex items-center justify-between">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setOtpStep('phone');
                setOtpCode('');
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>

            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={handleResendOTP}
              disabled={resendCooldown > 0 || loading}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : 'Reenviar código'}
            </Button>
          </div>
        </>
      )}

      {otpStep === 'processing' && (
        <div className="text-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h3 className="font-medium">Autenticando...</h3>
          <p className="text-sm text-muted-foreground">
            Aguarde enquanto verificamos seu código
          </p>
        </div>
      )}
    </div>
  );

  const renderPasswordRecovery = () => (
    <div className="space-y-4">
      {recoveryStep === 'phone' && (
        <>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-3">
              <Phone className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="font-medium">Recuperar Senha</h3>
            <p className="text-sm text-muted-foreground">
              Digite seu número de WhatsApp cadastrado
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recovery-phone">Número do WhatsApp</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="recovery-phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={recoveryPhone}
                onChange={(e) => setRecoveryPhone(e.target.value)}
                className="pl-10"
              />
            </div>
            {errors.recoveryPhone && (
              <p className="text-sm text-destructive">{errors.recoveryPhone}</p>
            )}
          </div>

          <Button 
            type="button" 
            className="w-full" 
            onClick={handleRecoverySendOTP}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <MessageCircle className="mr-2 h-4 w-4" />
                Enviar código de verificação
              </>
            )}
          </Button>

          <Button 
            type="button" 
            variant="ghost" 
            className="w-full"
            onClick={() => {
              setShowPasswordRecovery(false);
              setRecoveryStep('phone');
              setRecoveryPhone('');
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Login
          </Button>
        </>
      )}

      {recoveryStep === 'code' && (
        <>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-3">
              <MessageCircle className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="font-medium">Digite o código</h3>
            <p className="text-sm text-muted-foreground">
              Enviamos um código de 6 dígitos para
            </p>
            <p className="font-medium text-amber-600">
              {formatPhoneForDisplay(recoveryPhone)}
            </p>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <InputOTP
              value={recoveryOtpCode}
              onChange={setRecoveryOtpCode}
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

            {errors.recoveryOtp && (
              <p className="text-sm text-destructive">{errors.recoveryOtp}</p>
            )}

            {recoveryOtpExpiresAt && (
              <p className="text-sm text-muted-foreground">
                Código expira em: <span className="font-mono font-medium">{getRecoveryTimeRemaining()}</span>
              </p>
            )}
          </div>

          <Button 
            type="button" 
            className="w-full" 
            onClick={handleRecoveryVerifyOTP}
            disabled={loading || recoveryOtpCode.length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar Código'
            )}
          </Button>

          <div className="flex items-center justify-between">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setRecoveryStep('phone');
                setRecoveryOtpCode('');
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>

            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={handleRecoveryResendOTP}
              disabled={recoveryResendCooldown > 0 || loading}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {recoveryResendCooldown > 0 ? `Reenviar (${recoveryResendCooldown}s)` : 'Reenviar código'}
            </Button>
          </div>
        </>
      )}

      {recoveryStep === 'newPassword' && (
        <>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-medium">Defina sua nova senha</h3>
            <p className="text-sm text-muted-foreground">
              Telefone verificado! Crie uma nova senha
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
              {errors.confirmNewPassword && (
                <p className="text-sm text-destructive">{errors.confirmNewPassword}</p>
              )}
            </div>
          </div>

          <Button 
            type="button" 
            className="w-full" 
            onClick={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Nova Senha'
            )}
          </Button>

          <Button 
            type="button" 
            variant="ghost" 
            className="w-full"
            onClick={() => setRecoveryStep('code')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </>
      )}

      {recoveryStep === 'processing' && (
        <div className="text-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h3 className="font-medium">Alterando senha...</h3>
          <p className="text-sm text-muted-foreground">
            Aguarde enquanto salvamos sua nova senha
          </p>
        </div>
      )}
    </div>
  );

  const renderWhatsAppSignup = () => (
    <div className="space-y-4">
      {signupOtpStep === 'phone' && (
        <>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <MessageCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-medium">Cadastro via WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              Verifique seu número para criar sua conta
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-whatsapp-phone">Número do WhatsApp</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-whatsapp-phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={signupWhatsappPhone}
                onChange={(e) => setSignupWhatsappPhone(e.target.value)}
                className="pl-10"
              />
            </div>
            {errors.signupPhone && (
              <p className="text-sm text-destructive">{errors.signupPhone}</p>
            )}
          </div>

          <Button 
            type="button" 
            className="w-full bg-green-600 hover:bg-green-700" 
            onClick={handleSignupSendOTP}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <MessageCircle className="mr-2 h-4 w-4" />
                Enviar código via WhatsApp
              </>
            )}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                ou use outro método
              </span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full"
            onClick={() => setSignupMethod('email')}
          >
            Cadastrar com Email e Senha
          </Button>
        </>
      )}

      {signupOtpStep === 'code' && (
        <>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <MessageCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-medium">Digite o código</h3>
            <p className="text-sm text-muted-foreground">
              Enviamos um código de 6 dígitos para
            </p>
            <p className="font-medium text-green-600">
              {formatPhoneForDisplay(signupWhatsappPhone)}
            </p>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <InputOTP
              value={signupOtpCode}
              onChange={setSignupOtpCode}
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

            {errors.signupOtp && (
              <p className="text-sm text-destructive">{errors.signupOtp}</p>
            )}

            {signupOtpExpiresAt && (
              <p className="text-sm text-muted-foreground">
                Código expira em: <span className="font-mono font-medium">{getSignupTimeRemaining()}</span>
              </p>
            )}
          </div>

          <Button 
            type="button" 
            className="w-full bg-green-600 hover:bg-green-700" 
            onClick={handleSignupVerifyOTP}
            disabled={loading || signupOtpCode.length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar Código'
            )}
          </Button>

          <div className="flex items-center justify-between">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setSignupOtpStep('phone');
                setSignupOtpCode('');
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>

            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={handleSignupResendOTP}
              disabled={signupResendCooldown > 0 || loading}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {signupResendCooldown > 0 ? `Reenviar (${signupResendCooldown}s)` : 'Reenviar código'}
            </Button>
          </div>
        </>
      )}

      {signupOtpStep === 'details' && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-medium">Telefone verificado!</h3>
            <p className="text-sm text-muted-foreground">
              Complete seus dados para finalizar o cadastro
            </p>
            <Badge variant="outline" className="mt-2 text-green-600 border-green-600">
              <Phone className="h-3 w-3 mr-1" />
              {formatPhoneForDisplay(signupVerifiedPhone || '')}
            </Badge>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
              1
            </div>
            <span className="font-medium">Seus dados</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm font-medium">
              2
            </div>
            <span className="text-muted-foreground">Barbearias</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-name-wp">Nome Completo *</Label>
            <Input
              id="signup-name-wp"
              type="text"
              placeholder="Seu nome completo"
              value={signupFullName}
              onChange={(e) => setSignupFullName(e.target.value)}
              required
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email-wp">Email *</Label>
            <Input
              id="signup-email-wp"
              type="email"
              placeholder="seu@email.com"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              required
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="signup-password-wp">Senha *</Label>
              <Input
                id="signup-password-wp"
                type="password"
                placeholder="••••••••"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
              />
              {errors.password && (
                <p className="text-xs sm:text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-confirm-wp">Confirmar *</Label>
              <Input
                id="signup-confirm-wp"
                type="password"
                placeholder="••••••••"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                required
              />
              {errors.confirmPassword && (
                <p className="text-xs sm:text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
            <Checkbox
              id="signup-is-barber-wp"
              checked={signupIsAlsoBarber}
              onCheckedChange={(checked) => setSignupIsAlsoBarber(checked === true)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="signup-is-barber-wp" className="cursor-pointer font-medium">
                Também atendo clientes como barbeiro
              </Label>
              <p className="text-sm text-muted-foreground">
                Marque se você realiza atendimentos
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setSignupOtpStep('phone');
                setSignupVerifiedPhone(null);
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button type="button" className="flex-1" onClick={handleStep1Next}>
              Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderSignupStep1 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 text-xs sm:text-sm overflow-x-auto">
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-medium shrink-0">
          1
        </div>
        <span className="font-medium shrink-0">Dados</span>
        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted text-muted-foreground text-xs sm:text-sm font-medium shrink-0">
          2
        </div>
        <span className="text-muted-foreground shrink-0">Barbearias</span>
        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted text-muted-foreground text-xs sm:text-sm font-medium shrink-0">
          3
        </div>
        <span className="text-muted-foreground shrink-0">Plano</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-name">Nome Completo *</Label>
        <Input
          id="signup-name"
          type="text"
          placeholder="Seu nome completo"
          value={signupFullName}
          onChange={(e) => setSignupFullName(e.target.value)}
          required
        />
        {errors.fullName && (
          <p className="text-sm text-destructive">{errors.fullName}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-email">Email *</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="seu@email.com"
          value={signupEmail}
          onChange={(e) => setSignupEmail(e.target.value)}
          required
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-phone">Telefone *</Label>
        <Input
          id="signup-phone"
          type="tel"
          placeholder="(00) 00000-0000"
          value={signupPhone}
          onChange={(e) => setSignupPhone(e.target.value)}
          required
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="signup-password">Senha *</Label>
          <Input
            id="signup-password"
            type="password"
            placeholder="••••••••"
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            required
          />
          {errors.password && (
            <p className="text-xs sm:text-sm text-destructive">{errors.password}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-confirm">Confirmar *</Label>
          <Input
            id="signup-confirm"
            type="password"
            placeholder="••••••••"
            value={signupConfirmPassword}
            onChange={(e) => setSignupConfirmPassword(e.target.value)}
            required
          />
          {errors.confirmPassword && (
            <p className="text-xs sm:text-sm text-destructive">{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
        <Checkbox
          id="signup-is-barber"
          checked={signupIsAlsoBarber}
          onCheckedChange={(checked) => setSignupIsAlsoBarber(checked === true)}
        />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="signup-is-barber" className="cursor-pointer font-medium">
            Também atendo clientes como barbeiro
          </Label>
          <p className="text-sm text-muted-foreground">
            Marque se você realiza atendimentos
          </p>
        </div>
      </div>

      <Button type="button" className="w-full" onClick={handleStep1Next}>
        Próximo <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      {/* WhatsApp Signup Option */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            ou cadastre-se com
          </span>
        </div>
      </div>

      <Button 
        type="button" 
        variant="outline" 
        className="w-full border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
        onClick={() => setSignupMethod('whatsapp')}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Cadastrar com WhatsApp
      </Button>

      {/* Social Login Options */}
      {(socialProviders.google.enabled || socialProviders.facebook.enabled) && (
        <div className="grid gap-2">
          {socialProviders.google.enabled && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialLogin('google')}
              disabled={socialLoading !== null}
              className="w-full"
            >
              {socialLoading === 'google' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continuar com Google
            </Button>
          )}

          {socialProviders.facebook.enabled && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialLogin('facebook')}
              disabled={socialLoading !== null}
              className="w-full"
            >
              {socialLoading === 'facebook' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              )}
              Continuar com Facebook
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const renderSignupStep2 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 text-xs sm:text-sm overflow-x-auto">
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 text-primary text-xs sm:text-sm font-medium shrink-0">
          <Check className="h-3 w-3 sm:h-4 sm:w-4" />
        </div>
        <span className="text-muted-foreground shrink-0">Dados</span>
        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-medium shrink-0">
          2
        </div>
        <span className="font-medium shrink-0">Barbearias</span>
        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted text-muted-foreground text-xs sm:text-sm font-medium shrink-0">
          3
        </div>
        <span className="text-muted-foreground shrink-0">Plano</span>
      </div>

      {/* Unit tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {barbershopUnits.map((unit, idx) => (
          <Button
            key={unit.id}
            type="button"
            variant={idx === currentUnitIndex ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentUnitIndex(idx)}
            className="relative"
          >
            {unit.isPrimary && <Star className="h-3 w-3 mr-1 fill-current" />}
            {unit.name || `Unidade ${idx + 1}`}
            {barbershopUnits.length > 1 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  removeUnit(idx);
                }}
                className="ml-2 hover:text-destructive cursor-pointer"
              >
                <Trash2 className="h-3 w-3" />
              </span>
            )}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addNewUnit}
          className="text-primary"
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar Unidade
        </Button>
      </div>

      {/* Current unit form */}
      <div className="p-4 border rounded-lg space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {currentUnit?.name || `Unidade ${currentUnitIndex + 1}`}
          </h4>
          {!currentUnit?.isPrimary && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPrimaryUnit(currentUnitIndex)}
            >
              <Star className="h-4 w-4 mr-1" /> Definir como Principal
            </Button>
          )}
          {currentUnit?.isPrimary && (
            <Badge variant="secondary">
              <Star className="h-3 w-3 mr-1 fill-current" /> Principal
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <Label>Nome da Barbearia *</Label>
          <Input
            type="text"
            placeholder="Ex: Barbearia do João - Centro"
            value={currentUnit?.name || ''}
            onChange={(e) => updateCurrentUnit('name', e.target.value)}
            required
          />
          {errors.barbershopName && (
            <p className="text-sm text-destructive">{errors.barbershopName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Endereço</Label>
          <Input
            type="text"
            placeholder="Rua, número, bairro"
            value={currentUnit?.address || ''}
            onChange={(e) => updateCurrentUnit('address', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              type="tel"
              placeholder="(00) 0000-0000"
              value={currentUnit?.phone || ''}
              onChange={(e) => updateCurrentUnit('phone', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="contato@barbearia.com"
              value={currentUnit?.email || ''}
              onChange={(e) => updateCurrentUnit('email', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-muted/50 rounded-lg border">
        <h4 className="font-medium mb-2">Resumo do Cadastro</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Administrador:</strong> {signupFullName}</p>
          <p><strong>Email:</strong> {signupEmail}</p>
          <p><strong>Unidades:</strong> {barbershopUnits.length}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {barbershopUnits.map((unit, idx) => (
              <Badge key={unit.id} variant={unit.isPrimary ? "default" : "secondary"}>
                {unit.isPrimary && <Star className="h-3 w-3 mr-1 fill-current" />}
                {unit.name || `Unidade ${idx + 1}`}
              </Badge>
            ))}
          </div>
          {signupIsAlsoBarber && (
            <p className="text-primary mt-2">✓ Você será cadastrado como barbeiro em todas as unidades</p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => setSignupStep(1)}
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button type="button" className="flex-1" onClick={handleStep2Next} disabled={loading}>
          Próximo <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderSignupStep3 = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4 text-xs sm:text-sm overflow-x-auto">
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 text-primary text-xs sm:text-sm font-medium shrink-0">
          <Check className="h-3 w-3 sm:h-4 sm:w-4" />
        </div>
        <span className="text-muted-foreground shrink-0">Dados</span>
        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 text-primary text-xs sm:text-sm font-medium shrink-0">
          <Check className="h-3 w-3 sm:h-4 sm:w-4" />
        </div>
        <span className="text-muted-foreground shrink-0">Barbearias</span>
        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-medium shrink-0">
          3
        </div>
        <span className="font-medium shrink-0">Plano</span>
      </div>

      <PlanSelectionStep
        selectedPlanId={selectedPlanId}
        onSelectPlan={handlePlanSelect}
        onBack={() => setSignupStep(2)}
        onComplete={handleSignupComplete}
        loading={loading}
        preSelectedPlanSlug={preSelectedPlan}
      />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-lg barbershop-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            {currentLogoUrl ? (
              <img 
                src={currentLogoUrl} 
                alt={effectiveBranding?.system_name || 'Logo'} 
                className="h-28 w-auto max-w-[280px] object-contain animate-enter"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Scissors className="h-12 w-12 text-primary" />
              </div>
            )}
          </div>
          {!currentLogoUrl && (
            <CardTitle className="text-2xl">
              {hasWhiteLabel && tenantBarbershopName 
                ? tenantBarbershopName 
                : effectiveBranding?.system_name || 'BarberSmart'}
            </CardTitle>
          )}
          <CardDescription>
            {effectiveBranding?.tagline || 'Sistema de gestão para barbearias'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup" onClick={() => { setSignupStep(1); setSignupMethod('email'); setSignupOtpStep('phone'); }}>Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {showPasswordRecovery ? (
                renderPasswordRecovery()
              ) : loginMethod === 'whatsapp' ? (
                renderWhatsAppLogin()
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Senha</Label>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setShowPasswordRecovery(true)}
                      >
                        Esqueci minha senha
                      </Button>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>

                  {/* WhatsApp Login Option */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        ou continue com
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                    onClick={() => setLoginMethod('whatsapp')}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Entrar com WhatsApp
                  </Button>

                  {/* Social Login Buttons */}
                  {(socialProviders.google.enabled || socialProviders.facebook.enabled) && (
                    <div className="grid gap-2">
                      {socialProviders.google.enabled && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleSocialLogin('google')}
                          disabled={socialLoading !== null}
                        >
                          {socialLoading === 'google' ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                          )}
                          Entrar com Google
                        </Button>
                      )}

                      {socialProviders.facebook.enabled && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleSocialLogin('facebook')}
                          disabled={socialLoading !== null}
                        >
                          {socialLoading === 'facebook' ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="#1877F2">
                              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                            </svg>
                          )}
                          Entrar com Facebook
                        </Button>
                      )}
                    </div>
                  )}
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              {signupMethod === 'whatsapp' && signupOtpStep !== 'details' ? (
                renderWhatsAppSignup()
              ) : signupStep === 1 ? (
                signupMethod === 'whatsapp' && signupOtpStep === 'details' ? renderWhatsAppSignup() : renderSignupStep1()
              ) : signupStep === 2 ? (
                renderSignupStep2()
              ) : (
                renderSignupStep3()
              )}
            </TabsContent>
          </Tabs>
          
          {/* Diagnóstico WhatsApp - apenas para admins */}
          <WhatsAppDiagnostic />
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
