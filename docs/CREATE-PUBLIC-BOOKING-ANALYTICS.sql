-- =====================================================
-- MIGRAÇÃO: Sistema de Analytics do Link Público
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Criar tabela de visitas ao link público
CREATE TABLE IF NOT EXISTS public_booking_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid REFERENCES barbershops(id) ON DELETE CASCADE NOT NULL,
  visitor_ip text,
  user_agent text,
  referrer text,
  visited_at timestamptz DEFAULT now(),
  converted boolean DEFAULT false,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_booking_visits_barbershop ON public_booking_visits(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_booking_visits_date ON public_booking_visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_booking_visits_converted ON public_booking_visits(barbershop_id, converted);

-- 3. Habilitar RLS
ALTER TABLE public_booking_visits ENABLE ROW LEVEL SECURITY;

-- 4. Política para inserção pública (visitantes podem registrar visita)
CREATE POLICY "Anyone can register visits"
ON public_booking_visits
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 5. Política para leitura (apenas admins da barbearia)
CREATE POLICY "Barbershop admins can view visits"
ON public_booking_visits
FOR SELECT
TO authenticated
USING (
  barbershop_id IN (
    SELECT barbershop_id FROM user_barbershops WHERE user_id = auth.uid()
  )
);

-- 6. Função para obter estatísticas do link público
CREATE OR REPLACE FUNCTION get_public_booking_stats(p_barbershop_id uuid, p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_visits', COALESCE(COUNT(*), 0),
    'unique_visits', COALESCE(COUNT(DISTINCT visitor_ip), 0),
    'conversions', COALESCE(COUNT(*) FILTER (WHERE converted = true), 0),
    'conversion_rate', CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE converted = true)::numeric / COUNT(*)::numeric) * 100, 1)
      ELSE 0 
    END,
    'visits_by_day', COALESCE((
      SELECT jsonb_agg(day_data ORDER BY day)
      FROM (
        SELECT 
          visited_at::date as day,
          COUNT(*) as visits,
          COUNT(*) FILTER (WHERE converted = true) as conversions
        FROM public_booking_visits
        WHERE barbershop_id = p_barbershop_id
          AND visited_at >= now() - (p_days || ' days')::interval
        GROUP BY visited_at::date
      ) day_data
    ), '[]'::jsonb),
    'top_referrers', COALESCE((
      SELECT jsonb_agg(ref_data ORDER BY count DESC)
      FROM (
        SELECT 
          COALESCE(NULLIF(referrer, ''), 'Direto') as referrer,
          COUNT(*) as count
        FROM public_booking_visits
        WHERE barbershop_id = p_barbershop_id
          AND visited_at >= now() - (p_days || ' days')::interval
        GROUP BY referrer
        ORDER BY count DESC
        LIMIT 5
      ) ref_data
    ), '[]'::jsonb)
  ) INTO result
  FROM public_booking_visits
  WHERE barbershop_id = p_barbershop_id
    AND visited_at >= now() - (p_days || ' days')::interval;

  RETURN COALESCE(result, '{
    "total_visits": 0,
    "unique_visits": 0,
    "conversions": 0,
    "conversion_rate": 0,
    "visits_by_day": [],
    "top_referrers": []
  }'::jsonb);
END;
$$;

-- 7. Conceder permissões
GRANT EXECUTE ON FUNCTION get_public_booking_stats TO authenticated;
GRANT INSERT ON public_booking_visits TO anon;
GRANT INSERT ON public_booking_visits TO authenticated;
GRANT SELECT ON public_booking_visits TO authenticated;
