import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type UserRole = 'super_admin' | 'admin' | 'barbeiro' | 'recepcionista';

interface Barbershop {
  id: string;
  name: string;
  is_primary: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  barbershopId: string | null;
  barbershops: Barbershop[];
  selectedBarbershopId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, phone: string, isAlsoBarber?: boolean) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  setSelectedBarbershop: (barbershopId: string | null) => void;
  refreshBarbershops: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [selectedBarbershopId, setSelectedBarbershopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch user role and barbershop when session changes
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
          setBarbershopId(null);
          setBarbershops([]);
          setSelectedBarbershopId(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
      } else if (roleData) {
        setUserRole(roleData.role as UserRole);
      }

      // Fetch all barbershops the user has access to
      const { data: userBarbershopsData, error: userBarbershopsError } = await supabase
        .from('user_barbershops')
        .select(`
          barbershop_id,
          is_primary,
          barbershops:barbershop_id (
            id,
            name
          )
        `)
        .eq('user_id', userId);

      if (userBarbershopsError) {
        console.error('Error fetching user barbershops:', userBarbershopsError);
        // Fallback: try to get from profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('barbershop_id')
          .eq('id', userId)
          .maybeSingle();

        if (profileData?.barbershop_id) {
          const { data: barbershopData } = await supabase
            .from('barbershops')
            .select('id, name')
            .eq('id', profileData.barbershop_id)
            .maybeSingle();

          if (barbershopData) {
            const fallbackBarbershop = {
              id: barbershopData.id,
              name: barbershopData.name,
              is_primary: true
            };
            setBarbershops([fallbackBarbershop]);
            setBarbershopId(profileData.barbershop_id);
            setSelectedBarbershopId(profileData.barbershop_id);
          }
        }
      } else if (userBarbershopsData && userBarbershopsData.length > 0) {
        const mappedBarbershops: Barbershop[] = userBarbershopsData.map((ub: any) => ({
          id: ub.barbershops?.id || ub.barbershop_id,
          name: ub.barbershops?.name || 'Barbearia',
          is_primary: ub.is_primary
        }));

        setBarbershops(mappedBarbershops);

        // Set primary barbershop as default
        const primaryBarbershop = mappedBarbershops.find(b => b.is_primary);
        const defaultBarbershop = primaryBarbershop || mappedBarbershops[0];
        
        setBarbershopId(defaultBarbershop.id);
        setSelectedBarbershopId(defaultBarbershop.id);
      } else {
        // No user_barbershops found, try profiles fallback
        const { data: profileData } = await supabase
          .from('profiles')
          .select('barbershop_id')
          .eq('id', userId)
          .maybeSingle();

        if (profileData?.barbershop_id) {
          const { data: barbershopData } = await supabase
            .from('barbershops')
            .select('id, name')
            .eq('id', profileData.barbershop_id)
            .maybeSingle();

          if (barbershopData) {
            const fallbackBarbershop = {
              id: barbershopData.id,
              name: barbershopData.name,
              is_primary: true
            };
            setBarbershops([fallbackBarbershop]);
            setBarbershopId(profileData.barbershop_id);
            setSelectedBarbershopId(profileData.barbershop_id);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    } finally {
      setLoading(false);
    }
  };

  const setSelectedBarbershop = (barbershopId: string | null) => {
    setSelectedBarbershopId(barbershopId);
    // Also update the legacy barbershopId for backward compatibility
    if (barbershopId) {
      setBarbershopId(barbershopId);
    }
  };

  const refreshBarbershops = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: 'Erro ao fazer login',
          description: error.message,
          variant: 'destructive',
        });
      }
      
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone: string, isAlsoBarber: boolean = false) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone,
            is_also_barber: isAlsoBarber,
          },
        },
      });
      
      if (error) {
        toast({
          title: 'Erro ao criar conta',
          description: error.message,
          variant: 'destructive',
        });
      } else if (data.user && isAlsoBarber) {
        // Store the isAlsoBarber preference in localStorage to be used when barbershop is created
        localStorage.setItem('pendingBarberRegistration', JSON.stringify({
          userId: data.user.id,
          fullName,
          phone,
          isAlsoBarber: true
        }));
      }
      
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRole(null);
      setBarbershopId(null);
      setBarbershops([]);
      setSelectedBarbershopId(null);
      toast({
        title: 'Logout realizado',
        description: 'Você saiu da sua conta com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao sair',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        barbershopId,
        barbershops,
        selectedBarbershopId,
        loading,
        signIn,
        signUp,
        signOut,
        setSelectedBarbershop,
        refreshBarbershops,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
