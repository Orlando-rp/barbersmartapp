-- =====================================================
-- FIX: RLS de Subscriptions para Multi-Unidade
-- =====================================================
-- Este script corrige as políticas RLS das tabelas subscriptions
-- e usage_metrics para funcionar corretamente com a arquitetura
-- multi-unidade do BarberSmart.
--
-- Problema: A política anterior usava get_user_barbershop_id() que
-- não funciona para multi-unidades onde a assinatura está na matriz.
--
-- Solução: Usar user_has_access_to_barbershop_hierarchy() que
-- verifica toda a hierarquia de barbearias do usuário.
-- =====================================================

-- Verificar se a função user_has_access_to_barbershop_hierarchy existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'user_has_access_to_barbershop_hierarchy'
    ) THEN
        RAISE EXCEPTION 'Função user_has_access_to_barbershop_hierarchy não encontrada. Execute FIX-RLS-MULTI-UNIT-ALL-TABLES.sql primeiro.';
    END IF;
END $$;

-- =====================================================
-- 1. Corrigir RLS da tabela subscriptions
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage own subscriptions" ON public.subscriptions;

-- Política de SELECT: usuários podem ver assinaturas de sua hierarquia
CREATE POLICY "Users can view subscriptions in hierarchy"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
    public.is_super_admin(auth.uid()) OR
    public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
);

-- Política de INSERT: apenas super admins podem criar assinaturas
CREATE POLICY "Super admins can insert subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_super_admin(auth.uid())
);

-- Política de UPDATE: super admins podem atualizar qualquer assinatura
CREATE POLICY "Super admins can update subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (
    public.is_super_admin(auth.uid())
)
WITH CHECK (
    public.is_super_admin(auth.uid())
);

-- Política de DELETE: apenas super admins podem deletar assinaturas
CREATE POLICY "Super admins can delete subscriptions"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (
    public.is_super_admin(auth.uid())
);

-- =====================================================
-- 2. Corrigir RLS da tabela usage_metrics (se existir)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_metrics') THEN
        -- Remover políticas antigas
        DROP POLICY IF EXISTS "Users can view own metrics" ON public.usage_metrics;
        DROP POLICY IF EXISTS "Super admins can manage all metrics" ON public.usage_metrics;
        
        -- Política de SELECT
        CREATE POLICY "Users can view metrics in hierarchy"
        ON public.usage_metrics
        FOR SELECT
        TO authenticated
        USING (
            public.is_super_admin(auth.uid()) OR
            public.user_has_access_to_barbershop_hierarchy(auth.uid(), barbershop_id)
        );
        
        -- Política de INSERT/UPDATE/DELETE apenas para super admins
        CREATE POLICY "Super admins can manage metrics"
        ON public.usage_metrics
        FOR ALL
        TO authenticated
        USING (public.is_super_admin(auth.uid()))
        WITH CHECK (public.is_super_admin(auth.uid()));
    END IF;
END $$;

-- =====================================================
-- 3. Verificação
-- =====================================================

-- Verificar políticas criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('subscriptions', 'usage_metrics')
ORDER BY tablename, policyname;

-- =====================================================
-- 4. Teste de acesso (execute como usuário logado)
-- =====================================================

-- Este SELECT deve retornar a assinatura se o usuário tiver acesso
-- SELECT * FROM subscriptions WHERE status = 'active';
