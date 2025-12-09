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
import { Scissors, Building2, User, Check, ArrowRight, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

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

const step2Schema = z.object({
  barbershopName: z.string().min(3, { message: 'Nome da barbearia deve ter no mínimo 3 caracteres' }),
  barbershopAddress: z.string().optional(),
  barbershopPhone: z.string().optional(),
  barbershopEmail: z.string().email({ message: 'Email inválido' }).optional().or(z.literal('')),
});

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, refreshBarbershops } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

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

  // Step 2: Barbershop data
  const [barbershopName, setBarbershopName] = useState('');
  const [barbershopAddress, setBarbershopAddress] = useState('');
  const [barbershopPhone, setBarbershopPhone] = useState('');
  const [barbershopEmail, setBarbershopEmail] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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

  const handleSignupComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validate step 2
      step2Schema.parse({
        barbershopName,
        barbershopAddress,
        barbershopPhone,
        barbershopEmail,
      });

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

      // 2. Create barbershop
      const { data: barbershopData, error: barbershopError } = await supabase
        .from('barbershops')
        .insert({
          name: barbershopName,
          address: barbershopAddress || null,
          phone: barbershopPhone || signupPhone,
          email: barbershopEmail || signupEmail,
          active: true,
        })
        .select()
        .single();

      if (barbershopError) throw barbershopError;

      const barbershopId = barbershopData.id;

      // 3. Update profile with barbershop_id
      await supabase
        .from('profiles')
        .upsert({
          id: userId,
          barbershop_id: barbershopId,
          full_name: signupFullName,
          phone: signupPhone,
        });

      // 4. Create user_barbershops entry
      await supabase
        .from('user_barbershops')
        .insert({
          user_id: userId,
          barbershop_id: barbershopId,
          is_primary: true,
        });

      // 5. Create admin role
      await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
          barbershop_id: barbershopId,
        });

      // 6. If also barber, create staff entry
      if (signupIsAlsoBarber) {
        await supabase
          .from('staff')
          .insert({
            user_id: userId,
            barbershop_id: barbershopId,
            is_also_barber: true,
            specialties: ['Corte', 'Barba'],
            commission_rate: 50,
            active: true,
          });
      }

      toast.success('Conta criada com sucesso!', {
        description: 'Bem-vindo ao Barber Smart!',
      });

      // Refresh barbershops in context
      await refreshBarbershops();
      
      navigate('/');
    } catch (error: any) {
      console.error('Erro no cadastro:', error);
      
      if (error instanceof z.ZodError) {
        const formattedErrors: any = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            formattedErrors[err.path[0]] = err.message;
          }
        });
        setErrors(formattedErrors);
      } else {
        toast.error('Erro ao criar conta', {
          description: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

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
        <span className="text-muted-foreground">Barbearia</span>
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
        <span className="font-medium">Barbearia</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="barbershop-name">Nome da Barbearia *</Label>
        <Input
          id="barbershop-name"
          type="text"
          placeholder="Ex: Barbearia do João"
          value={barbershopName}
          onChange={(e) => setBarbershopName(e.target.value)}
          required
        />
        {errors.barbershopName && (
          <p className="text-sm text-destructive">{errors.barbershopName}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="barbershop-address">Endereço</Label>
        <Input
          id="barbershop-address"
          type="text"
          placeholder="Rua, número, bairro"
          value={barbershopAddress}
          onChange={(e) => setBarbershopAddress(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="barbershop-phone">Telefone</Label>
          <Input
            id="barbershop-phone"
            type="tel"
            placeholder="(00) 0000-0000"
            value={barbershopPhone}
            onChange={(e) => setBarbershopPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="barbershop-email">Email</Label>
          <Input
            id="barbershop-email"
            type="email"
            placeholder="contato@barbearia.com"
            value={barbershopEmail}
            onChange={(e) => setBarbershopEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg border">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Resumo do Cadastro
        </h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Administrador:</strong> {signupFullName}</p>
          <p><strong>Email:</strong> {signupEmail}</p>
          <p><strong>Barbearia:</strong> {barbershopName || '(preencha acima)'}</p>
          {signupIsAlsoBarber && (
            <p className="text-primary">✓ Você será cadastrado como barbeiro</p>
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
          {loading ? 'Criando conta...' : 'Criar Conta e Barbearia'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md barbershop-card">
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