# BarberSmart - Arquitetura Multi-Tenant

## Visão Geral

O BarberSmart é um SaaS multi-tenant onde cada barbearia (tenant) é isolada por:

1. **Domínio/Subdomínio** - Identificação automática pelo hostname
2. **RLS (Row Level Security)** - Isolamento de dados no Supabase
3. **White-Label** - Branding customizável por tenant

## Fluxo de Resolução de Tenant

```
┌─────────────────────────────────────────────────────┐
│              Requisição HTTP                         │
│  Host: barbearia1.barbersmart.app                   │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│           SubdomainRouter.tsx                        │
│  - Extrai hostname                                   │
│  - Verifica se é domínio principal ou tenant        │
└─────────────────────┬───────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│           Consulta: barbershop_domains              │
│  WHERE subdomain = 'barbearia1'                     │
│  OR custom_domain = 'barbearia1'                    │
└─────────────────────┬───────────────────────────────┘
                      ▼
         ┌────────────┴────────────┐
         ▼                         ▼
    Encontrado               Não encontrado
         │                         │
         ▼                         ▼
    Landing Page            TenantNotFound
    /s/barbearia1
```

## Estrutura de Dados

### Tabela: barbershop_domains
```sql
- id: uuid
- barbershop_id: uuid (FK)
- subdomain: text (ex: 'barbearia1')
- custom_domain: text (ex: 'minhabarbearia.com.br')
- subdomain_status: 'pending' | 'active' | 'inactive'
- custom_domain_status: 'pending' | 'active' | 'inactive'
- landing_page_config: jsonb
```

### White-Label

Cada barbearia pode ter branding customizado em `barbershops.custom_branding`:

```json
{
  "system_name": "Minha Barbearia",
  "logo_url": "https://...",
  "primary_color": "#123456",
  "secondary_color": "#789abc"
}
```

## Isolamento de Dados (RLS)

Todas as tabelas usam RLS baseado em `barbershop_id`:

```sql
CREATE POLICY "Isolamento por barbershop"
ON appointments
FOR ALL
USING (barbershop_id IN (
  SELECT barbershop_id FROM user_barbershops
  WHERE user_id = auth.uid()
));
```

## Variáveis de Ambiente

```env
VITE_MAIN_DOMAINS=barbersmart.app,barbersmart.com.br
VITE_IGNORED_DOMAINS=localhost,lovable.app
VITE_ENABLE_TENANT_DETECTION=true
```
