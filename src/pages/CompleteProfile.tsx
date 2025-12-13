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
  isMatriz: boolean; // Indica se é a matriz (primeira sempre é)
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

  // Step 2: Barbershop data - Primeira é sempre a MATRIZ
  const [barbershopUnits, setBarbershopUnits] = useState<BarbershopUnit[]>([
    { id: '1', name: '', address: '', phone: '', email: '', isMatriz: true }
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
    // Novas unidades nunca são matriz
    const newUnit: BarbershopUnit = {
      id: Date.now().toString(),
      name: '',
      address: '',
      phone: '',
      email: '',
      isMatriz: false,
    };
    setBarbershopUnits(prev => [...prev, newUnit]);
    setCurrentUnitIndex(barbershopUnits.length);
  };

  const removeUnit = (index: number) => {
    // Não pode remover a matriz (primeira)
    if (index === 0) {
      toast.error('A barbearia principal não pode ser removida');
      return;
    }
    
    if (barbershopUnits.length === 1) {
      toast.error('Você precisa ter pelo menos uma barbearia');
      return;
    }
    
    const newUnits = barbershopUnits.filter((_, idx) => idx !== index);
    setBarbershopUnits(newUnits);
    setCurrentUnitIndex(Math.min(currentUnitIndex, newUnits.length - 1));
  };

  // Não precisa mais de setPrimaryUnit - a matriz é sempre a primeira

  const validateUnits = (): boolean => {
    // Validar matriz (primeira)
    if (!barbershopUnits[0].name || barbershopUnits[0].name.length < 3) {
      setCurrentUnitIndex(0);
      setErrors({ barbershopName: 'Nome da barbearia deve ter no mínimo 3 caracteres' });
      return false;
    }
    
    // Validar unidades (demais)
    for (let i = 1; i < barbershopUnits.length; i++) {
      if (!barbershopUnits[i].name || barbershopUnits[i].name.length < 3) {
        setCurrentUnitIndex(i);
        setErrors({ barbershopName: 'Nome da unidade deve ter no mínimo 3 caracteres' });
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
      let matrizId: string | null = null;

      // 1. Criar MATRIZ primeiro (primeira da lista)
      const matrizData = barbershopUnits[0];
      const { data: matrizResult, error: matrizError } = await supabase
        .from('barbershops')
        .insert({
          name: matrizData.name,
          address: matrizData.address || null,
          phone: matrizData.phone || phone,
          email: matrizData.email || user.email,
          parent_id: null, // É a matriz, sem parent
          active: true,
        })
        .select()
        .single();

      if (matrizError) throw matrizError;
      matrizId = matrizResult.id;

      // 2. Criar UNIDADES com parent_id apontando para matriz
      const unitIds: string[] = [];
      for (let i = 1; i < barbershopUnits.length; i++) {
        const unit = barbershopUnits[i];
        const { data: unitResult, error: unitError } = await supabase
          .from('barbershops')
          .insert({
            name: unit.name,
            address: unit.address || null,
            phone: unit.phone || phone,
            email: unit.email || user.email,
            parent_id: matrizId, // Aponta para a matriz
            active: true,
          })
          .select()
          .single();

        if (unitError) {
          console.error('Erro ao criar unidade:', unitError);
        } else {
          unitIds.push(unitResult.id);
        }
      }

      // 3. Criar profile associado à MATRIZ
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          barbershop_id: matrizId,
          full_name: fullName,
          phone: phone,
        });

      if (profileError) {
        console.error('Erro ao criar profile:', profileError);
        throw profileError;
      }

      // 4. Criar user_barbershops e roles para MATRIZ
      const { error: ubMatrizError } = await supabase
        .from('user_barbershops')
        .insert({
          user_id: userId,
          barbershop_id: matrizId,
          is_primary: true,
        });
      if (ubMatrizError) console.error('Erro ao criar user_barbershops matriz:', ubMatrizError);

      const { error: roleMatrizError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'admin',
          barbershop_id: matrizId,
        });
      if (roleMatrizError) console.error('Erro ao criar role matriz:', roleMatrizError);

      // 5. Criar user_barbershops e roles para UNIDADES
      for (const unitId of unitIds) {
        const { error: ubUnitError } = await supabase
          .from('user_barbershops')
          .insert({
            user_id: userId,
            barbershop_id: unitId,
            is_primary: false,
          });
        if (ubUnitError) console.error('Erro ao criar user_barbershops unidade:', ubUnitError);

        const { error: roleUnitError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'admin',
            barbershop_id: unitId,
          });
        if (roleUnitError) console.error('Erro ao criar role unidade:', roleUnitError);
      }

      // 6. Se também é barbeiro, criar staff na MATRIZ e em todas as UNIDADES
      if (isAlsoBarber) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const allBarbershopIds = [matrizId, ...unitIds];
        
        for (const bsId of allBarbershopIds) {
          const { error: staffError } = await supabase
            .from('staff')
            .insert({
              user_id: userId,
              barbershop_id: bsId,
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
          }

          // Adicionar role barbeiro
          const { error: barberRoleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'barbeiro',
              barbershop_id: bsId,
            });
          if (barberRoleError) console.error('Erro ao criar role barbeiro:', barberRoleError);
        }
      }

      const unidadesCount = unitIds.length;
      toast.success('Perfil completo!', {
        description: `Barbearia${unidadesCount > 0 ? ` + ${unidadesCount} unidade(s)` : ''} cadastrada(s). Bem-vindo ao ${branding?.system_name || 'BarberSmart'}!`,
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
                      <Building2 className="h-3 w-3" />
                      {unit.name || (unit.isMatriz ? 'Barbearia' : `Unidade ${index}`)}
                      {/* Não pode remover a matriz (index 0) */}
                      {index > 0 && (
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
                <Label htmlFor="barbershop-name">
                  {currentUnit?.isMatriz ? 'Nome da Barbearia *' : 'Nome da Unidade *'}
                </Label>
                <Input
                  id="barbershop-name"
                  type="text"
                  placeholder={currentUnit?.isMatriz ? 'Minha Barbearia' : 'Unidade Centro'}
                  value={currentUnit?.name || ''}
                  onChange={(e) => updateCurrentUnit('name', e.target.value)}
                  required
                />
                {errors.barbershopName && (
                  <p className="text-sm text-destructive">{errors.barbershopName}</p>
                )}
                {currentUnit?.isMatriz && (
                  <p className="text-xs text-muted-foreground">
                    Esta é sua barbearia principal. Clientes e serviços ficarão vinculados a ela.
                  </p>
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
