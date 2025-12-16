import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type UserRole = 'super_admin' | 'admin' | 'barbeiro' | 'recepcionista';

interface Barbershop {
  id: string;
  name: string;
  is_primary: boolean;
  parent_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  barbershopId: string | null;
  barbershops: Barbershop[];
  selectedBarbershopId: string | null;
  activeBarbershopIds: string[];
  loading: boolean;
  needsProfileCompletion: boolean;
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
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
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
          setNeedsProfileCompletion(false);
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

      // Super admin gets access to ALL barbershops
      if (roleData?.role === 'super_admin') {
        const { data: allBarbershops, error: allBarbershopsError } = await supabase
          .from('barbershops')
          .select('id, name, parent_id')
          .eq('active', true)
          .order('name');

        if (allBarbershopsError) {
          console.error('Error fetching all barbershops:', allBarbershopsError);
        } else if (allBarbershops && allBarbershops.length > 0) {
          const mappedBarbershops: Barbershop[] = allBarbershops.map((b: any) => ({
            id: b.id,
            name: b.name,
            is_primary: false,
            parent_id: b.parent_id
          }));
          setBarbershops(mappedBarbershops);
          // Super admin starts with "All" view (null)
          setSelectedBarbershopId(null);
          setBarbershopId(mappedBarbershops[0].id);
        }
        setNeedsProfileCompletion(false);
        setLoading(false);
        return;
      }

      // Check if user has a profile with barbershop
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, barbershop_id')
        .eq('id', userId)
        .maybeSingle();

      // Fetch all barbershops the user has access to
      const { data: userBarbershopsData, error: userBarbershopsError } = await supabase
        .from('user_barbershops')
        .select(`
          barbershop_id,
          is_primary,
          barbershops:barbershop_id (
            id,
            name,
            parent_id
          )
        `)
        .eq('user_id', userId);

      if (userBarbershopsError) {
        console.error('Error fetching user barbershops:', userBarbershopsError);
      }

      // Check if user needs to complete profile (no barbershop association)
      const hasBarbershops = userBarbershopsData && userBarbershopsData.length > 0;
      const hasProfileWithBarbershop = profileData?.barbershop_id;
      
      // Check if this is a social login (provider is not email)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const isSocialLogin = currentUser?.app_metadata?.provider && 
                           currentUser.app_metadata.provider !== 'email';
      
      // Only require profile completion for social logins without existing data
      if (!hasBarbershops && !hasProfileWithBarbershop && !roleData && isSocialLogin) {
        // User logged in via social auth but has no barbershop - needs profile completion
        setNeedsProfileCompletion(true);
        setLoading(false);
        return;
      }

      setNeedsProfileCompletion(false);

      if (userBarbershopsError || !hasBarbershops) {
        // Fallback: try to get from profiles
        if (profileData?.barbershop_id) {
          const { data: barbershopData } = await supabase
            .from('barbershops')
            .select('id, name, parent_id')
            .eq('id', profileData.barbershop_id)
            .maybeSingle();

          if (barbershopData) {
            const fallbackBarbershop = {
              id: barbershopData.id,
              name: barbershopData.name,
              is_primary: true,
              parent_id: barbershopData.parent_id
            };
            setBarbershops([fallbackBarbershop]);
            setBarbershopId(profileData.barbershop_id);
            setSelectedBarbershopId(profileData.barbershop_id);
          }
        }
      } else if (hasBarbershops) {
        const mappedBarbershops: Barbershop[] = userBarbershopsData.map((ub: any) => ({
          id: ub.barbershops?.id || ub.barbershop_id,
          name: ub.barbershops?.name || 'Barbearia',
          is_primary: ub.is_primary,
          parent_id: ub.barbershops?.parent_id || null
        }));

        setBarbershops(mappedBarbershops);

        // Identify matrices that have units (should not be auto-selected)
        const matrizesComUnidades = new Set<string>();
        mappedBarbershops.forEach(b => {
          if (b.parent_id) {
            matrizesComUnidades.add(b.parent_id);
          }
        });

        // Set primary barbershop as default reference
        const primaryBarbershop = mappedBarbershops.find(b => b.is_primary);
        const defaultBarbershop = primaryBarbershop || mappedBarbershops[0];
        
        setBarbershopId(defaultBarbershop.id);

        // If default is a matriz with units, start with consolidated view (null)
        // Otherwise, select the default barbershop
        const isMatrizComUnidades = matrizesComUnidades.has(defaultBarbershop.id);
        if (isMatrizComUnidades) {
          setSelectedBarbershopId(null);
        } else {
          setSelectedBarbershopId(defaultBarbershop.id);
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
      setNeedsProfileCompletion(false);
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

  // Compute activeBarbershopIds based on selection
  // Filter out matrices that have units (only units are selectable for operations)
  const activeBarbershopIds = (() => {
    if (selectedBarbershopId !== null) {
      return [selectedBarbershopId];
    }
    
    // Identify matrices that have units (should not be included in queries)
    const matrizesComUnidades = new Set<string>();
    barbershops.forEach(b => {
      if (b.parent_id) {
        matrizesComUnidades.add(b.parent_id);
      }
    });
    
    // Return only: independent barbershops (no children) + units (have parent_id)
    return barbershops
      .filter(b => !matrizesComUnidades.has(b.id) || b.parent_id)
      .map(b => b.id);
  })();

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        barbershopId,
        barbershops,
        selectedBarbershopId,
        activeBarbershopIds,
        loading,
        needsProfileCompletion,
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
