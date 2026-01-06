# Configuração de Secrets para Edge Functions

Este documento descreve os secrets necessários para as Edge Functions funcionarem corretamente com o **Supabase Externo** (projeto `nmsblmmhigwsevnqmhwn`).

## Supabase - Obrigatórios

| Secret | Descrição | Onde Obter |
|--------|-----------|------------|
| `SUPABASE_URL` | URL do projeto Supabase | `https://nmsblmmhigwsevnqmhwn.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (acesso total) | Dashboard Supabase → Settings → API → service_role |
| `SUPABASE_ANON_KEY` | Chave pública anônima | Dashboard Supabase → Settings → API → anon |

## WhatsApp / Evolution API

| Secret | Descrição |
|--------|-----------|
| `EVOLUTION_API_URL` | URL da API Evolution |
| `EVOLUTION_API_KEY` | Chave de API Evolution |
| `WHATSAPP_API_TOKEN` | Token da API WhatsApp (Meta Cloud) |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número WhatsApp |

## OpenAI

| Secret | Descrição |
|--------|-----------|
| `OPENAI_API_KEY` | Chave de API OpenAI para chatbot |

## Email

| Secret | Descrição |
|--------|-----------|
| `RESEND_API_KEY` | Chave de API Resend para envio de emails |

## GitHub (Deploy)

| Secret | Descrição |
|--------|-----------|
| `GITHUB_PAT` | Personal Access Token GitHub |
| `GITHUB_OWNER` | Dono do repositório |
| `GITHUB_REPO` | Nome do repositório |

## cPanel (Subdomínios)

| Secret | Descrição |
|--------|-----------|
| `CPANEL_USER` | Usuário cPanel |
| `CPANEL_DOMAIN` | Domínio principal cPanel |
| `CPANEL_TOKEN` | Token de API cPanel |

---

## Como Configurar

### Via Lovable Cloud

1. Acesse o projeto no Lovable
2. Vá em **Settings → Secrets**
3. Adicione cada secret com o nome e valor correspondente

### Via Dashboard Supabase

1. Acesse o [Dashboard Supabase](https://supabase.com/dashboard/project/nmsblmmhigwsevnqmhwn)
2. Vá em **Settings → Edge Functions**
3. Na seção **Secrets**, adicione os valores

---

## Verificação

Para verificar se os secrets estão configurados corretamente, você pode:

1. Acessar a página `/debug` do sistema (se disponível)
2. Verificar os logs das Edge Functions
3. Testar as funcionalidades que dependem de cada integração

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                     BarberSmart App                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────┐    ┌───────────────────────────────┐│
│  │     Frontend      │    │        Edge Functions         ││
│  │ (React/Vite)      │    │ (Deno)                        ││
│  │                   │    │                               ││
│  │ src/lib/supabase  │    │ Deno.env.get('SUPABASE_URL')  ││
│  └─────────┬─────────┘    └───────────────┬───────────────┘│
│            │                              │                │
│            └──────────────┬───────────────┘                │
│                           ▼                                │
│  ┌─────────────────────────────────────────────────────┐  │
│  │          Supabase Externo (Produção)                │  │
│  │          nmsblmmhigwsevnqmhwn.supabase.co           │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Importante

⚠️ **NUNCA** commite secrets no código fonte!

⚠️ O `SUPABASE_SERVICE_ROLE_KEY` tem acesso total ao banco - use com cuidado!

⚠️ Mantenha os secrets sincronizados entre Lovable Cloud e Supabase Dashboard.
