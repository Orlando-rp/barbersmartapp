# Integração cPanel para Subdomínios Automáticos

Este documento descreve como configurar a integração com cPanel para criação automática de subdomínios no BarberSmart.

## Visão Geral

Quando um cliente define um identificador para sua barbearia (ex: "minhabarbearia"), o sistema:

1. Salva o identificador no banco de dados
2. Chama a API do cPanel para criar o subdomínio `minhabarbearia.barbersmart.app`
3. O AutoSSL do cPanel provisiona automaticamente o certificado SSL
4. O sistema verifica periodicamente se o SSL está ativo

Enquanto o SSL não estiver ativo, o cliente usa a rota interna (`/s/minhabarbearia`) que sempre funciona.

## Requisitos

- Acesso ao cPanel da hospedagem
- Token de API do cPanel gerado
- Domínio principal configurado (ex: barbersmart.app)

## Configuração

### 1. Gerar Token de API no cPanel

1. Acesse o cPanel do seu servidor
2. Navegue até **Segurança** → **Gerenciar Tokens de API**
3. Clique em **Criar**
4. Defina um nome descritivo (ex: "barbersmart-subdomain-api")
5. Copie o token gerado (ele só é exibido uma vez!)

### 2. Configurar Secrets no Supabase

Adicione os seguintes secrets no Supabase:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `CPANEL_USER` | Nome de usuário do cPanel | `meucpanel` |
| `CPANEL_TOKEN` | Token de API gerado | `ABCDEF123456...` |
| `CPANEL_DOMAIN` | Domínio base | `barbersmart.app` |

### 3. Verificar Permissões

O token de API precisa ter permissão para:
- `SubDomain::addsubdomain` - Criar subdomínios
- `SubDomain::delsubdomain` - Remover subdomínios

## Edge Functions

### create-cpanel-subdomain

Cria um novo subdomínio no cPanel.

**Endpoint:** `POST /functions/v1/create-cpanel-subdomain`

**Body:**
```json
{
  "subdomain": "minhabarbearia",
  "barbershopId": "uuid-da-barbearia"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "subdomain": "minhabarbearia.barbersmart.app",
  "message": "Subdomínio criado com sucesso. O SSL será provisionado automaticamente em alguns minutos."
}
```

### delete-cpanel-subdomain

Remove um subdomínio do cPanel.

**Endpoint:** `POST /functions/v1/delete-cpanel-subdomain`

**Body:**
```json
{
  "subdomain": "minhabarbearia",
  "barbershopId": "uuid-da-barbearia"
}
```

### check-cpanel-ssl

Verifica se o SSL está ativo para um subdomínio.

**Endpoint:** `POST /functions/v1/check-cpanel-ssl`

**Body:**
```json
{
  "subdomain": "minhabarbearia",
  "barbershopId": "uuid-da-barbearia"
}
```

**Resposta:**
```json
{
  "success": true,
  "subdomain": "minhabarbearia.barbersmart.app",
  "sslActive": true,
  "message": "SSL está ativo para este subdomínio."
}
```

## Fluxo de Criação

```
┌─────────────────────────────────────────────────────────────────┐
│                    Fluxo de Criação de Subdomínio               │
└─────────────────────────────────────────────────────────────────┘

Cliente define identificador "minhabarbearia"
                    │
                    ▼
        ┌───────────────────────┐
        │  Salva no banco com   │
        │  status: provisioning │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Chama Edge Function  │
        │ create-cpanel-subdomain│
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  cPanel cria subdomínio│
        │ minhabarbearia.domain │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  AutoSSL provisiona   │
        │  certificado (2-5min) │
        └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  Atualiza status para │
        │  ssl_status: active   │
        └───────────────────────┘
```

## URLs Geradas

| Status SSL | URL Usada |
|------------|-----------|
| `pending` ou `provisioning` | `https://barbersmart.app/s/minhabarbearia` (rota interna) |
| `active` | `https://minhabarbearia.barbersmart.app` (subdomínio real) |

## Troubleshooting

### Erro: "cPanel credentials not configured"

Os secrets `CPANEL_USER` e `CPANEL_TOKEN` não foram configurados no Supabase.

### Erro: "Subdomain already exists"

O subdomínio já existe no cPanel. Isso não é um erro crítico - o sistema continua normalmente.

### SSL não está sendo provisionado

1. Verifique se o AutoSSL está habilitado no cPanel
2. Verifique se o domínio raiz tem SSL válido
3. Aguarde até 24 horas para o AutoSSL processar
4. Verifique os logs do AutoSSL no cPanel

### Subdomínio não funciona

1. Verifique se o diretório correto está configurado no cPanel
2. Verifique as configurações de DNS
3. Teste a rota interna (`/s/identificador`) para confirmar que a aplicação funciona

## Limitações

- O cPanel precisa ter AutoSSL habilitado para SSL automático
- Pode levar de 2 a 30 minutos para o SSL ser provisionado
- Se o AutoSSL falhar, o cliente precisa usar a rota interna ou configurar SSL manualmente
