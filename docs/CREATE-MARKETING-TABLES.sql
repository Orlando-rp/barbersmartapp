-- =====================================================
-- MARKETING TABLES: CUPONS E PROGRAMA DE FIDELIDADE
-- =====================================================

-- Tabela de cupons de desconto
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase_value DECIMAL(10, 2) DEFAULT 0,
  max_uses INT,
  current_uses INT DEFAULT 0,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(barbershop_id, code)
);

-- Tabela de programa de fidelidade
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  points INT DEFAULT 0,
  total_earned INT DEFAULT 0,
  total_redeemed INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(barbershop_id, client_id)
);

-- Tabela de histórico de pontos
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_points_id UUID NOT NULL REFERENCES public.loyalty_points(id) ON DELETE CASCADE,
  points INT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies para coupons
CREATE POLICY "Super admins can do everything with coupons"
  ON public.coupons
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view coupons from their barbershop"
  ON public.coupons
  FOR SELECT
  USING (
    barbershop_id = public.get_user_barbershop(auth.uid())
  );

CREATE POLICY "Admins can manage coupons from their barbershop"
  ON public.coupons
  FOR ALL
  USING (
    barbershop_id = public.get_user_barbershop(auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies para loyalty_points
CREATE POLICY "Super admins can do everything with loyalty_points"
  ON public.loyalty_points
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view loyalty_points from their barbershop"
  ON public.loyalty_points
  FOR SELECT
  USING (
    barbershop_id = public.get_user_barbershop(auth.uid())
  );

CREATE POLICY "Admins and receptionists can manage loyalty_points"
  ON public.loyalty_points
  FOR ALL
  USING (
    barbershop_id = public.get_user_barbershop(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'recepcionista')
    )
  );

-- RLS Policies para loyalty_transactions
CREATE POLICY "Super admins can do everything with loyalty_transactions"
  ON public.loyalty_transactions
  FOR ALL
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view loyalty_transactions"
  ON public.loyalty_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loyalty_points lp
      WHERE lp.id = loyalty_transactions.loyalty_points_id
      AND lp.barbershop_id = public.get_user_barbershop(auth.uid())
    )
  );

-- Indexes para performance
CREATE INDEX idx_coupons_barbershop ON public.coupons(barbershop_id);
CREATE INDEX idx_coupons_code ON public.coupons(barbershop_id, code);
CREATE INDEX idx_coupons_active ON public.coupons(barbershop_id, active);
CREATE INDEX idx_loyalty_points_barbershop ON public.loyalty_points(barbershop_id);
CREATE INDEX idx_loyalty_points_client ON public.loyalty_points(client_id);
CREATE INDEX idx_loyalty_transactions_loyalty ON public.loyalty_transactions(loyalty_points_id);

-- Trigger para updated_at
CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_points_updated_at
  BEFORE UPDATE ON public.loyalty_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para adicionar pontos automaticamente
CREATE OR REPLACE FUNCTION public.add_loyalty_points_on_appointment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_client_id UUID;
  v_points INT;
  v_loyalty_id UUID;
BEGIN
  -- Apenas adicionar pontos para agendamentos concluídos
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
    -- Buscar o client_id pelo nome do cliente
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE barbershop_id = NEW.barbershop_id
    AND name = NEW.client_name
    LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
      -- Calcular pontos (1 ponto por real gasto)
      v_points := FLOOR(NEW.service_price);
      
      -- Inserir ou atualizar pontos de fidelidade
      INSERT INTO public.loyalty_points (barbershop_id, client_id, points, total_earned)
      VALUES (NEW.barbershop_id, v_client_id, v_points, v_points)
      ON CONFLICT (barbershop_id, client_id)
      DO UPDATE SET
        points = public.loyalty_points.points + v_points,
        total_earned = public.loyalty_points.total_earned + v_points,
        updated_at = now()
      RETURNING id INTO v_loyalty_id;
      
      -- Registrar transação de pontos
      INSERT INTO public.loyalty_transactions (loyalty_points_id, points, type, description)
      VALUES (v_loyalty_id, v_points, 'earned', 
        'Pontos ganhos no agendamento: ' || NEW.service_name);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para adicionar pontos automaticamente
CREATE TRIGGER add_loyalty_points_trigger
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.add_loyalty_points_on_appointment();

COMMENT ON TABLE public.coupons IS 'Cupons de desconto da barbearia';
COMMENT ON TABLE public.loyalty_points IS 'Pontos de fidelidade dos clientes';
COMMENT ON TABLE public.loyalty_transactions IS 'Histórico de transações de pontos';
