import { useState, useEffect } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Lock, Settings as SettingsIcon, Scissors } from "lucide-react";
import { ProfileForm } from "@/components/forms/ProfileForm";
import { PasswordForm } from "@/components/forms/PasswordForm";
import { PreferencesForm } from "@/components/forms/PreferencesForm";
import { MyStaffProfileForm } from "@/components/forms/MyStaffProfileForm";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  full_name: string;
  phone: string;
  avatar_url: string | null;
  preferred_name: string | null;
}

const Profile = () => {
  const { user, barbershopId } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: "",
    phone: "",
    avatar_url: null,
    preferred_name: null,
  });
  const [loading, setLoading] = useState(true);
  const [isBarber, setIsBarber] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkIfBarber();
    }
  }, [user, barbershopId]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url, preferred_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfileData(data);
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        title: 'Erro ao carregar perfil',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkIfBarber = async () => {
    if (!user || !barbershopId) return;

    try {
      // Check if user has barbeiro role or is a staff member
      const { data: staffData } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user.id)
        .eq('barbershop_id', barbershopId)
        .maybeSingle();

      setIsBarber(!!staffData);
    } catch (error) {
      console.error('Erro ao verificar status de barbeiro:', error);
    }
  };

  const handleAvatarUpdate = (url: string) => {
    setProfileData(prev => ({ ...prev, avatar_url: url }));
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-96">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gerencie suas informações pessoais e preferências
          </p>
        </div>

        <Card className="barbershop-card">
          <CardContent className="pt-6">
            <AvatarUpload
              currentAvatarUrl={profileData.avatar_url}
              onAvatarUpdate={handleAvatarUpdate}
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className={`grid w-full h-auto ${isBarber ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="personal" className="flex flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Informações Pessoais</span>
              <span className="sm:hidden">Perfil</span>
            </TabsTrigger>
            {isBarber && (
              <TabsTrigger value="professional" className="flex flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
                <Scissors className="h-4 w-4" />
                <span className="hidden sm:inline">Profissional</span>
                <span className="sm:hidden">Prof.</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="security" className="flex flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
              <Lock className="h-4 w-4" />
              <span>Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex flex-col sm:flex-row gap-1 py-2 text-xs sm:text-sm">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Preferências</span>
              <span className="sm:hidden">Pref.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card className="barbershop-card">
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize suas informações de perfil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileForm
                  initialData={profileData}
                  onSuccess={fetchProfile}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {isBarber && (
            <TabsContent value="professional">
              <Card className="barbershop-card">
                <CardHeader>
                  <CardTitle>Configurações Profissionais</CardTitle>
                  <CardDescription>
                    Gerencie seus horários e serviços que você atende
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MyStaffProfileForm />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="security">
            <Card className="barbershop-card">
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Mantenha sua conta segura com uma senha forte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PasswordForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card className="barbershop-card">
              <CardHeader>
                <CardTitle>Preferências</CardTitle>
                <CardDescription>
                  Configure suas preferências de notificação e interface
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PreferencesForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Profile;
