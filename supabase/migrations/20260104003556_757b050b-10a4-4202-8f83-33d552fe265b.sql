-- Fix the remaining search_path warning and add seed data
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Planos de assinatura padrão
INSERT INTO public.subscription_plans (name, slug, description, price, max_staff, max_clients, max_appointments_month, features)
VALUES 
    ('Starter', 'starter', 'Plano inicial para barbearias pequenas', 49.90, 2, 100, 200, 
     '["Agendamento online", "Gestão de clientes", "Relatórios básicos"]'::jsonb),
    ('Professional', 'professional', 'Plano profissional com recursos avançados', 99.90, 5, 500, 1000, 
     '["Agendamento online", "Gestão de clientes", "Relatórios avançados", "Marketing por WhatsApp", "Programa de fidelidade"]'::jsonb),
    ('Premium', 'premium', 'Plano premium para barbearias em crescimento', 199.90, 15, 2000, 5000, 
     '["Agendamento online", "Gestão de clientes", "Relatórios avançados", "Marketing por WhatsApp", "Programa de fidelidade", "Multi-unidade (até 3)", "API de integração"]'::jsonb),
    ('Enterprise', 'enterprise', 'Plano empresarial para redes de barbearias', 499.90, -1, -1, -1, 
     '["Todos os recursos Premium", "Unidades ilimitadas", "Suporte prioritário", "Gerente de conta dedicado", "Customização de marca"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    max_staff = EXCLUDED.max_staff,
    max_clients = EXCLUDED.max_clients,
    max_appointments_month = EXCLUDED.max_appointments_month,
    features = EXCLUDED.features,
    updated_at = now();

-- Branding padrão do sistema
INSERT INTO public.system_branding (system_name, tagline, primary_color, secondary_color, accent_color)
VALUES ('BarberSmart', 'Gestão Inteligente para Barbearias', '#d4a574', '#1a1a2e', '#c9a86c')
ON CONFLICT DO NOTHING;

-- Config de uptime padrão
INSERT INTO public.uptime_config (config_key, config_value, description)
VALUES 
    ('alert_threshold', '2', 'Número de falhas consecutivas antes de alertar'),
    ('cooldown_minutes', '15', 'Minutos entre alertas para o mesmo endpoint'),
    ('check_interval_minutes', '5', 'Intervalo entre verificações em minutos')
ON CONFLICT (config_key) DO NOTHING;

-- Inserir registro padrão de payment config
INSERT INTO public.global_payment_config (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM public.global_payment_config);