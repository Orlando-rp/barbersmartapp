import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface Client {
  id: string;
  barbershop_id: string;
  name: string;
  preferred_name: string | null;
  email: string | null;
  phone: string;
  birth_date: string | null;
  avatar_url: string | null;
  notification_enabled: boolean;
  notification_types: any;
}

interface Barbershop {
  id: string;
  name: string;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
}

interface ClientAuthContextType {
  user: User | null;
  session: Session | null;
  client: Client | null;
  barbershop: Barbershop | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshClient: () => Promise<void>;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export const ClientAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClientData = async (userId: string) => {
    try {
      // Buscar client_users para obter o client_id
      const { data: clientUser, error: clientUserError } = await supabase
        .from('client_users')
        .select('client_id')
        .eq('user_id', userId)
        .single();

      if (clientUserError || !clientUser) {
        console.log('Usuário não é um cliente vinculado');
        setClient(null);
        setBarbershop(null);
        return;
      }

      // Buscar dados do cliente
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientUser.client_id)
        .single();

      if (clientError || !clientData) {
        console.error('Erro ao buscar dados do cliente:', clientError);
        return;
      }

      setClient(clientData);

      // Buscar dados da barbearia
      const { data: barbershopData, error: barbershopError } = await supabase
        .from('barbershops')
        .select('id, name, logo_url, phone, address')
        .eq('id', clientData.barbershop_id)
        .single();

      if (!barbershopError && barbershopData) {
        setBarbershop(barbershopData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchClientData(session.user.id);
          }, 0);
        } else {
          setClient(null);
          setBarbershop(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchClientData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setClient(null);
    setBarbershop(null);
  };

  const refreshClient = async () => {
    if (user) {
      await fetchClientData(user.id);
    }
  };

  return (
    <ClientAuthContext.Provider value={{
      user,
      session,
      client,
      barbershop,
      loading,
      signOut,
      refreshClient
    }}>
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
};
