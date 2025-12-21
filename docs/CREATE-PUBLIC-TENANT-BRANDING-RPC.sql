-- =====================================================
-- RPC: Buscar branding público por domínio
-- Permite buscar branding de uma barbearia pelo domínio
-- sem necessidade de autenticação
-- =====================================================

-- Função para buscar branding por domínio (pública)
CREATE OR REPLACE FUNCTION get_tenant_branding_by_domain(domain_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  barbershop_record RECORD;
  root_barbershop_id uuid;
  has_white_label boolean := false;
BEGIN
  -- Buscar domínio ativo (custom_domain ou subdomain)
  SELECT 
    bd.barbershop_id,
    b.custom_branding,
    b.name,
    b.parent_id
  INTO barbershop_record
  FROM barbershop_domains bd
  JOIN barbershops b ON b.id = bd.barbershop_id
  WHERE (
    (bd.custom_domain = domain_name AND bd.custom_domain_status = 'active')
    OR (bd.subdomain = domain_name AND bd.subdomain_status = 'active')
  )
  LIMIT 1;
  
  -- Se não encontrar domínio, retornar null
  IF barbershop_record.barbershop_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Determinar barbearia raiz (matriz) para herdar branding
  root_barbershop_id := COALESCE(barbershop_record.parent_id, barbershop_record.barbershop_id);
  
  -- Se é uma unidade, buscar branding da matriz
  IF barbershop_record.parent_id IS NOT NULL THEN
    SELECT b.custom_branding, b.name
    INTO barbershop_record.custom_branding, barbershop_record.name
    FROM barbershops b
    WHERE b.id = root_barbershop_id;
  END IF;
  
  -- Verificar se tem feature white_label ativa
  -- Verifica na matriz ou na própria unidade
  SELECT COALESCE((sp.feature_flags->>'white_label')::boolean, false)
  INTO has_white_label
  FROM subscriptions s
  JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE s.barbershop_id IN (root_barbershop_id, barbershop_record.barbershop_id)
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- Se não tem white_label, retornar null (usa branding padrão)
  IF NOT COALESCE(has_white_label, false) THEN
    RETURN NULL;
  END IF;
  
  -- Se não tem custom_branding definido, retornar null
  IF barbershop_record.custom_branding IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Retornar branding com metadados
  result := barbershop_record.custom_branding;
  result := result || jsonb_build_object(
    'barbershop_name', barbershop_record.name,
    'has_white_label', true,
    'barbershop_id', barbershop_record.barbershop_id
  );
  
  RETURN result;
END;
$$;

-- Garantir acesso público à função
GRANT EXECUTE ON FUNCTION get_tenant_branding_by_domain(text) TO anon;
GRANT EXECUTE ON FUNCTION get_tenant_branding_by_domain(text) TO authenticated;

-- Comentário explicativo
COMMENT ON FUNCTION get_tenant_branding_by_domain IS 
'Busca branding de uma barbearia pelo domínio customizado ou subdomínio.
Retorna NULL se não encontrar ou se não tiver white_label ativo.
Usado para aplicar branding na tela de login antes da autenticação.';
