-- ===========================================
-- PORTAL DO CLIENTE - ETAPA 2: TABELAS E RLS
-- Execute APÓS a etapa 1 ter sido commitada
-- ===========================================

-- Tabela de vinculação cliente-usuário
CREATE TABLE IF NOT EXISTS public.client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT client_users_user_id_key UNIQUE (user_id),
    CONSTRAINT client_users_client_id_key UNIQUE (client_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON public.client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON public.client_users(client_id);

-- Habilitar RLS
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- FUNÇÕES AUXILIARES
-- ===========================================

-- Função para obter client_id do usuário
CREATE OR REPLACE FUNCTION public.get_client_id_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT client_id FROM public.client_users WHERE user_id = p_user_id LIMIT 1;
$$;

-- Função para verificar se usuário é cliente
CREATE OR REPLACE FUNCTION public.is_client(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = p_user_id AND role = 'cliente'
    );
$$;

-- Função para obter barbershop_id do cliente
CREATE OR REPLACE FUNCTION public.get_client_barbershop_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT c.barbershop_id 
    FROM public.clients c
    JOIN public.client_users cu ON cu.client_id = c.id
    WHERE cu.user_id = p_user_id
    LIMIT 1;
$$;

-- ===========================================
-- POLÍTICAS RLS - client_users
-- ===========================================

DROP POLICY IF EXISTS "Clients can view own link" ON public.client_users;
CREATE POLICY "Clients can view own link"
ON public.client_users FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Super admins can view all client_users" ON public.client_users;
CREATE POLICY "Super admins can view all client_users"
ON public.client_users FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Barbershop admins can view their client_users" ON public.client_users;
CREATE POLICY "Barbershop admins can view their client_users"
ON public.client_users FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.clients c
        WHERE c.id = client_users.client_id
        AND public.user_has_access_to_barbershop_hierarchy(auth.uid(), c.barbershop_id)
    )
);

DROP POLICY IF EXISTS "System can insert client_users" ON public.client_users;
CREATE POLICY "System can insert client_users"
ON public.client_users FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ===========================================
-- POLÍTICAS RLS - clients (para clientes)
-- ===========================================

DROP POLICY IF EXISTS "Clients can view own record" ON public.clients;
CREATE POLICY "Clients can view own record"
ON public.clients FOR SELECT
TO authenticated
USING (
    id = public.get_client_id_for_user(auth.uid())
);

DROP POLICY IF EXISTS "Clients can update own record" ON public.clients;
CREATE POLICY "Clients can update own record"
ON public.clients FOR UPDATE
TO authenticated
USING (
    id = public.get_client_id_for_user(auth.uid())
)
WITH CHECK (
    id = public.get_client_id_for_user(auth.uid())
);

-- ===========================================
-- POLÍTICAS RLS - appointments (para clientes)
-- ===========================================

DROP POLICY IF EXISTS "Clients can view own appointments" ON public.appointments;
CREATE POLICY "Clients can view own appointments"
ON public.appointments FOR SELECT
TO authenticated
USING (
    client_id = public.get_client_id_for_user(auth.uid())
);

DROP POLICY IF EXISTS "Clients can update own appointments" ON public.appointments;
CREATE POLICY "Clients can update own appointments"
ON public.appointments FOR UPDATE
TO authenticated
USING (
    client_id = public.get_client_id_for_user(auth.uid())
    AND status IN ('pendente', 'confirmado')
)
WITH CHECK (
    client_id = public.get_client_id_for_user(auth.uid())
);

-- ===========================================
-- POLÍTICAS RLS - reviews (para clientes)
-- ===========================================

DROP POLICY IF EXISTS "Clients can view own reviews" ON public.reviews;
CREATE POLICY "Clients can view own reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (
    client_id = public.get_client_id_for_user(auth.uid())
);

DROP POLICY IF EXISTS "Clients can insert own reviews" ON public.reviews;
CREATE POLICY "Clients can insert own reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (
    client_id = public.get_client_id_for_user(auth.uid())
);

DROP POLICY IF EXISTS "Clients can update own reviews" ON public.reviews;
CREATE POLICY "Clients can update own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (
    client_id = public.get_client_id_for_user(auth.uid())
)
WITH CHECK (
    client_id = public.get_client_id_for_user(auth.uid())
);

-- ===========================================
-- POLÍTICAS RLS - whatsapp_messages (para clientes)
-- ===========================================

DROP POLICY IF EXISTS "Clients can view own messages" ON public.whatsapp_messages;
CREATE POLICY "Clients can view own messages"
ON public.whatsapp_messages FOR SELECT
TO authenticated
USING (
    client_id = public.get_client_id_for_user(auth.uid())
);

-- ===========================================
-- GRANTS
-- ===========================================

GRANT EXECUTE ON FUNCTION public.get_client_id_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_barbershop_id(UUID) TO authenticated;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_client_users_updated_at ON public.client_users;
CREATE TRIGGER set_client_users_updated_at
    BEFORE UPDATE ON public.client_users
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
