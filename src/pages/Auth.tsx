import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Scissors, Building2, Check, ArrowRight, ArrowLeft, Plus, Trash2, Star, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

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

interface BarbershopUnit {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, refreshBarbershops } = useAuth();
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [errors, setErrors] = useState<any>({});
  const [socialProviders, setSocialProviders] = useState<SocialProviders>({
    google: { enabled: false },
    facebook: { enabled: false }
  });

  // Signup wizard step
  const [signupStep, setSignupStep] = useState(1);

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

  // Current unit being edited
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    loadSocialProviders();
  }, []);

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
      
      if (!error) {
        navigate('/');
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

  const handleSignupComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (!validateUnits()) return;
    
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

      toast.success('Conta criada com sucesso!', {
        description: `${barbershopUnits.length} unidade(s) cadastrada(s). Bem-vindo ao Barber Smart!`,
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

  const renderSignupStep1 = () => (
    <div className="space-y-4">
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

      <div className="grid grid-cols-2 gap-4">
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
            <p className="text-sm text-destructive">{errors.password}</p>
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
            <p className="text-sm text-destructive">{errors.confirmPassword}</p>
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
    </div>
  );

  const renderSignupStep2 = () => (
    <form onSubmit={handleSignupComplete} className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-medium">
          <Check className="h-4 w-4" />
        </div>
        <span className="text-muted-foreground">Seus dados</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
          2
        </div>
        <span className="font-medium">Barbearias</span>
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
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Criando conta...' : `Criar Conta (${barbershopUnits.length} unidade${barbershopUnits.length > 1 ? 's' : ''})`}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-lg barbershop-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Scissors className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Barber Smart</CardTitle>
          <CardDescription>
            Sistema de gestão para barbearias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup" onClick={() => setSignupStep(1)}>Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
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
                  <Label htmlFor="login-password">Senha</Label>
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

                {/* Social Login Buttons */}
                {(socialProviders.google.enabled || socialProviders.facebook.enabled) && (
                  <>
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
                  </>
                )}
              </form>
            </TabsContent>

            <TabsContent value="signup">
              {signupStep === 1 ? renderSignupStep1() : renderSignupStep2()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;