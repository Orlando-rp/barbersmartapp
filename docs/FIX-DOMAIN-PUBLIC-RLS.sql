-- ============================================
-- FIX DOMAIN PUBLIC RLS FOR WHITE-LABEL
-- Permite consulta anônima de domínios ativos para detecção de tenant
-- ============================================

-- 1. Adicionar política para usuários anônimos consultarem domínios ativos
-- Necessário para detectar tenant antes do login

CREATE POLICY "Public can view active domains"
ON public.barbershop_domains FOR SELECT
TO anon
USING (
    (subdomain_status = 'active' AND subdomain IS NOT NULL)
    OR (custom_domain_status = 'active' AND custom_domain IS NOT NULL)
);

-- 2. Garantir que as funções de validação também são acessíveis para anon
GRANT EXECUTE ON FUNCTION public.validate_subdomain TO anon;
GRANT EXECUTE ON FUNCTION public.check_subdomain_availability TO anon;

-- 3. Grant SELECT para anon na tabela
GRANT SELECT ON public.barbershop_domains TO anon;

-- 4. Verificação
SELECT 
    policyname, 
    cmd, 
    roles 
FROM pg_policies 
WHERE tablename = 'barbershop_domains';
