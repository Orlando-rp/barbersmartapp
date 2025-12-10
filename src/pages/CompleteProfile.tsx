import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Scissors, Building2, Loader2, Plus, Trash2, Star, ArrowRight, ArrowLeft, Link2 } from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const phoneSchema = z.string().min(10, { message: 'Telefone inválido' });

interface BarbershopUnit {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

interface ExistingAccount {
  hasProfile: boolean;
  hasBarbershops: boolean;
  barbershops: { id: string; name: string }[];
  profile: { full_name: string; phone: string } | null;
}

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { user, refreshBarbershops } = useAuth();
  const { branding } = useBranding();
  const [loading, setLoading] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [existingAccount, setExistingAccount] = useState<ExistingAccount | null>(null);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<any>({});

  // Step 1: Additional user data
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '');
  const [isAlsoBarber, setIsAlsoBarber] = useState(false);

  // Step 2: Barbershop data
  const [barbershopUnits, setBarbershopUnits] = useState<BarbershopUnit[]>([
    { id: '1', name: '', address: '', phone: '', email: '', isPrimary: true }
  ]);
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);

  // Check for existing account on mount
  useEffect(() => {
    if (user?.email) {
      checkExistingAccount();
    } else {
      setCheckingAccount(false);
    }
  }, [user?.email]);

  const checkExistingAccount = async () => {
    if (!user) return;
    
    setCheckingAccount(true);
    try {
      // Check if there's an existing profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, phone, barbershop_id')
        .eq('id', user.id)
        .maybeSingle();

      // Check for existing barbershops via user_barbershops
      const { data: userBarbershops } = await supabase
        .from('user_barbershops')
        .select(`
          barbershop_id,
          barbershops:barbershop_id (
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      const hasBarbershops = userBarbershops && userBarbershops.length > 0;
      const hasProfile = !!profileData;

      if (hasBarbershops || hasProfile) {
        const barbershops = userBarbershops?.map((ub: any) => ({
          id: ub.barbershops?.id || ub.barbershop_id,
          name: ub.barbershops?.name || 'Barbearia'
        })) || [];

        setExistingAccount({
          hasProfile,
          hasBarbershops: !!hasBarbershops,
          barbershops,
          profile: profileData ? {
            full_name: profileData.full_name || '',
            phone: profileData.phone || ''
          } : null
        });

        // Pre-fill form with existing data
        if (profileData?.full_name) setFullName(profileData.full_name);
        if (profileData?.phone) setPhone(profileData.phone);
      }
    } catch (error) {
      console.error('Error checking existing account:', error);
    } finally {
      setCheckingAccount(false);
    }
  };

  const handleLinkExistingAccount = async () => {
    if (!user || !existingAccount) return;
    
    setLoading(true);
    try {
      // Just refresh barbershops - account is already linked
      await refreshBarbershops();
      
      toast.success('Conta vinculada com sucesso!', {
        description: 'Você agora pode acessar sua(s) barbearia(s) com o login social.'
      });
      
      navigate('/');
    } catch (error: any) {
      console.error('Erro ao vincular conta:', error);
      toast.error('Erro ao vincular conta', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Next = () => {
    setErrors({});
    
    try {
      phoneSchema.parse(phone);
      if (!fullName || fullName.length < 3) {
        setErrors({ fullName: 'Nome deve ter no mínimo 3 caracteres' });
        return;
      }
      setStep(2);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ phone: error.errors[0]?.message });
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

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (!validateUnits()) return;
    if (!user) {
      toast.error('Usuário não encontrado');
      return;
    }
    
    setLoading(true);

    try {
      const userId = user.id;
      let primaryBarbershopId: string | null = null;

      // 1. Create all barbershops
      const createdBarbershops: { id: string; isPrimary: boolean }[] = [];
      
      for (const unit of barbershopUnits) {
        const { data: barbershopData, error: barbershopError } = await supabase
          .from('barbershops')
          .insert({
            name: unit.name,
            address: unit.address || null,
            phone: unit.phone || phone,
            email: unit.email || user.email,
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

      // 2. Create or update profile FIRST (staff needs this to exist)
      if (primaryBarbershopId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            barbershop_id: primaryBarbershopId,
            full_name: fullName,
            phone: phone,
          });

        if (profileError) {
          console.error('Erro ao criar profile:', profileError);
          throw profileError;
        }
      }

      // 3. Create user_barbershops, roles, and staff for each barbershop
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

        // If also barber, create staff entry
        if (isAlsoBarber) {
          // Small delay to ensure profile is propagated
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const { error: staffError } = await supabase
            .from('staff')
            .insert({
              user_id: userId,
              barbershop_id: barbershop.id,
              specialties: ['Corte', 'Barba'],
              commission_rate: 50,
              active: true,
              schedule: {
                monday: { start: '09:00', end: '18:00', enabled: true },
                tuesday: { start: '09:00', end: '18:00', enabled: true },
                wednesday: { start: '09:00', end: '18:00', enabled: true },
                thursday: { start: '09:00', end: '18:00', enabled: true },
                friday: { start: '09:00', end: '18:00', enabled: true },
                saturday: { start: '09:00', end: '14:00', enabled: true },
                sunday: { start: '00:00', end: '00:00', enabled: false },
              },
            });

          if (staffError) {
            console.error('Erro ao criar staff:', staffError);
            // Try without schedule if there's an error
            const { error: staffRetryError } = await supabase
              .from('staff')
              .insert({
                user_id: userId,
                barbershop_id: barbershop.id,
                specialties: ['Corte', 'Barba'],
                commission_rate: 50,
                active: true,
              });
            
            if (staffRetryError) {
              console.error('Erro ao criar staff (retry):', staffRetryError);
              toast.error('Aviso: Seu perfil de barbeiro não foi criado automaticamente', {
                description: 'Você pode adicionar manualmente na tela de Equipe'
              });
            }
          }
          
          // Also add barbeiro role
          const { error: barberRoleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'barbeiro',
              barbershop_id: barbershop.id,
            });

          if (barberRoleError) console.error('Erro ao criar role barbeiro:', barberRoleError);
        }
      }

      toast.success('Perfil completo!', {
        description: `${barbershopUnits.length} unidade(s) cadastrada(s). Bem-vindo ao ${branding?.system_name || 'BarberSmart'}!`,
      });

      await refreshBarbershops();
      navigate('/');
    } catch (error: any) {
      console.error('Erro ao completar perfil:', error);
      toast.error('Erro ao completar perfil', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const currentUnit = barbershopUnits[currentUnitIndex];

  if (!user) {
    navigate('/auth');
    return null;
  }

  // Show loading while checking for existing account
  if (checkingAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando sua conta...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show link account option if existing account found
  if (existingAccount && existingAccount.hasBarbershops) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
              <div className="p-3 rounded-full bg-primary/10">
                <Link2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Conta Existente Encontrada</CardTitle>
            <CardDescription>
              Identificamos que você já tem uma conta cadastrada com este email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertTitle>Barbearias vinculadas</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1">
                  {existingAccount.barbershops.map((b) => (
                    <li key={b.id} className="flex items-center gap-2">
                      <Scissors className="h-3 w-3" />
                      {b.name}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>

            <p className="text-sm text-muted-foreground text-center">
              Deseja vincular seu login social a esta conta existente?
            </p>

            <div className="flex flex-col gap-2">
              <Button onClick={handleLinkExistingAccount} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Vincular Conta
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setExistingAccount(null)}
                disabled={loading}
              >
                Criar Nova Conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Scissors className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Complete seu Cadastro</CardTitle>
          <CardDescription>
            Precisamos de mais algumas informações para configurar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
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
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>

              <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
                <Checkbox
                  id="isAlsoBarber"
                  checked={isAlsoBarber}
                  onCheckedChange={(checked) => setIsAlsoBarber(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="isAlsoBarber" className="cursor-pointer font-medium">
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
          ) : (
            <form onSubmit={handleComplete} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-medium">
                  ✓
                </div>
                <span className="text-muted-foreground">Seus dados</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <span className="font-medium">Barbearia</span>
              </div>

              {/* Unit selector */}
              {barbershopUnits.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {barbershopUnits.map((unit, index) => (
                    <Badge
                      key={unit.id}
                      variant={currentUnitIndex === index ? "default" : "outline"}
                      className="cursor-pointer flex items-center gap-1"
                      onClick={() => setCurrentUnitIndex(index)}
                    >
                      {unit.isPrimary && <Star className="h-3 w-3" />}
                      <Building2 className="h-3 w-3" />
                      {unit.name || `Unidade ${index + 1}`}
                      {barbershopUnits.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeUnit(index);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                  <Badge
                    variant="outline"
                    className="cursor-pointer border-dashed"
                    onClick={addNewUnit}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Nova Unidade
                  </Badge>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="barbershop-name">Nome da Barbearia *</Label>
                <Input
                  id="barbershop-name"
                  type="text"
                  placeholder="Minha Barbearia"
                  value={currentUnit?.name || ''}
                  onChange={(e) => updateCurrentUnit('name', e.target.value)}
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
                  value={currentUnit?.address || ''}
                  onChange={(e) => updateCurrentUnit('address', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="barbershop-phone">Telefone</Label>
                  <Input
                    id="barbershop-phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={currentUnit?.phone || ''}
                    onChange={(e) => updateCurrentUnit('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barbershop-email">Email</Label>
                  <Input
                    id="barbershop-email"
                    type="email"
                    placeholder="contato@barbearia.com"
                    value={currentUnit?.email || ''}
                    onChange={(e) => updateCurrentUnit('email', e.target.value)}
                  />
                </div>
              </div>

              {barbershopUnits.length > 1 && !currentUnit?.isPrimary && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPrimaryUnit(currentUnitIndex)}
                  className="w-full"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Definir como unidade principal
                </Button>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      Concluir Cadastro
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;
