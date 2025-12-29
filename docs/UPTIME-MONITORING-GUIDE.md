# BarberSmart - Guia de Monitoramento de Uptime

## Visão Geral

O sistema de monitoramento de uptime do BarberSmart verifica automaticamente a disponibilidade dos serviços e envia alertas quando detecta problemas.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DE MONITORAMENTO                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐     ┌────────────────┐     ┌─────────────────┐   │
│   │ pg_cron  │────▶│ uptime-monitor │────▶│ Health Checks   │   │
│   │ (5 min)  │     │ Edge Function  │     │ /health         │   │
│   └──────────┘     └───────┬────────┘     └─────────────────┘   │
│                            │                                     │
│                            ▼                                     │
│              ┌─────────────────────────┐                        │
│              │     Análise de Status   │                        │
│              │  healthy/degraded/down  │                        │
│              └───────────┬─────────────┘                        │
│                          │                                       │
│            ┌─────────────┴─────────────┐                        │
│            ▼                           ▼                        │
│    ┌──────────────┐           ┌──────────────┐                  │
│    │ uptime_logs  │           │ Alertas      │                  │
│    │ (histórico)  │           │ Email/WhatsApp│                  │
│    └──────────────┘           └──────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Recursos

- ✅ **Verificação automática** a cada 5 minutos
- ✅ **Alertas por Email** via Resend
- ✅ **Alertas por WhatsApp** via Meta Business API
- ✅ **Detecção de lentidão** (status degraded)
- ✅ **Cooldown inteligente** para evitar spam de alertas
- ✅ **Dashboard de uptime** com métricas 24h
- ✅ **Limpeza automática** de logs antigos (30 dias)
- ✅ **Notificação de recuperação** quando serviço volta

## Pré-requisitos

### 1. Resend (para alertas por email)

1. Crie uma conta em [resend.com](https://resend.com)
2. Valide seu domínio em [Domains](https://resend.com/domains)
3. Crie uma API key em [API Keys](https://resend.com/api-keys)

### 2. WhatsApp Business API (opcional)

Se quiser alertas por WhatsApp, configure:
- `WHATSAPP_API_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`

## Instalação

### Passo 1: Criar Tabelas

Execute o SQL em `docs/CREATE-UPTIME-MONITORING-TABLES.sql` no Supabase SQL Editor.

### Passo 2: Configurar Secrets

No Supabase Dashboard → Project Settings → Secrets, adicione:

| Secret | Descrição | Obrigatório |
|--------|-----------|-------------|
| `RESEND_API_KEY` | API key do Resend | Sim (para email) |
| `ALERT_EMAIL` | Email(s) para alertas (separados por vírgula) | Sim (para email) |
| `MAIN_DOMAIN` | Domínio principal (ex: barbersmart.app) | Sim |
| `ALERT_WHATSAPP` | Telefone(s) para WhatsApp (separados por vírgula) | Não |
| `WHATSAPP_API_TOKEN` | Token da API do WhatsApp | Não |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número WhatsApp | Não |

### Passo 3: Deploy das Edge Functions

```bash
# Na raiz do projeto
supabase functions deploy uptime-monitor
supabase functions deploy uptime-recovery-alert
```

### Passo 4: Configurar Cron Job

1. Edite `docs/SETUP-UPTIME-MONITOR-CRON.sql`
2. Substitua `YOUR_PROJECT_REF` e `YOUR_ANON_KEY`
3. Execute no Supabase SQL Editor

## Configuração

### Endpoints Monitorados (Padrão)

| Endpoint | URL | Timeout |
|----------|-----|---------|
| Frontend Principal | https://{MAIN_DOMAIN}/health | 10s |
| Frontend WWW | https://www.{MAIN_DOMAIN}/health | 10s |
| API Supabase | {SUPABASE_URL}/rest/v1/ | 5s |

### Adicionar Endpoints Customizados

Você pode adicionar endpoints extras via body da requisição:

```json
{
  "endpoints": [
    {
      "name": "API Externa",
      "url": "https://api.exemplo.com/health",
      "expectedStatus": 200,
      "timeout": 5000
    }
  ]
}
```

### Configurações no Banco

Na tabela `uptime_config`:

| Chave | Valor Padrão | Descrição |
|-------|--------------|-----------|
| `alert_threshold` | 2 | Falhas consecutivas antes de alertar |
| `cooldown_minutes` | 15 | Minutos entre alertas do mesmo endpoint |
| `check_interval_minutes` | 5 | Intervalo entre verificações |

## Status dos Endpoints

| Status | Condição | Cor |
|--------|----------|-----|
| `healthy` | Resposta correta < 5 segundos | 🟢 Verde |
| `degraded` | Resposta correta > 5 segundos | 🟡 Amarelo |
| `down` | Erro, timeout ou status 5xx | 🔴 Vermelho |

## Alertas

### Formato do Email

```
🚨 ALERTA: 1 serviço(s) OFFLINE - BarberSmart

❌ Serviços Offline (1)
• Frontend Principal: Timeout (10023ms)

✅ Serviços Saudáveis
• API Supabase: 234ms

Verificação realizada em: 29/12/2025 14:30:00
```

### Formato do WhatsApp

```
🚨 *ALERTA: Sistema OFFLINE*

📊 *BarberSmart Uptime Monitor*
⏰ 29/12/2025 14:30:00

❌ *Serviços Offline:*
• Frontend Principal: Timeout (10023ms)

✅ Serviços saudáveis: 1/2
```

### Alerta de Recuperação

Quando um serviço que estava offline volta ao normal, um alerta de recuperação é enviado:

```
✅ *RECUPERADO: Sistema Online*

🎉 Frontend Principal está funcionando normalmente!

📈 *Detalhes:*
• Tempo offline: 15 minutos
• Tempo de resposta: 456ms
```

## Dashboard de Uptime

A view `uptime_dashboard` mostra métricas das últimas 24h:

```sql
SELECT * FROM uptime_dashboard;
```

Retorna:
- Total de verificações
- Contagem por status (healthy, degraded, down)
- Porcentagem de uptime
- Tempo médio/máximo/mínimo de resposta
- Última verificação

## Comandos Úteis

### Verificar Status do Cron

```sql
SELECT * FROM cron.job WHERE jobname LIKE 'uptime%';
```

### Ver Últimas Verificações

```sql
SELECT * FROM uptime_logs 
ORDER BY checked_at DESC 
LIMIT 20;
```

### Ver Alertas Enviados

```sql
SELECT * FROM uptime_alerts 
ORDER BY sent_at DESC 
LIMIT 20;
```

### Testar Manualmente

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/uptime-monitor \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Desabilitar Temporariamente

```sql
SELECT cron.unschedule('uptime-monitor-check');
```

### Limpar Logs Antigos Manualmente

```sql
SELECT cleanup_old_uptime_logs();
```

## Troubleshooting

### Alertas não estão sendo enviados

1. Verifique os secrets no Supabase Dashboard
2. Confirme que `ALERT_EMAIL` ou `ALERT_WHATSAPP` estão configurados
3. Verifique os logs da Edge Function

### Cron não está executando

1. Confirme que `pg_cron` e `pg_net` estão habilitados
2. Verifique se o job foi criado: `SELECT * FROM cron.job`
3. Veja erros: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10`

### Endpoint sempre mostra "down"

1. Verifique se o endpoint `/health` está acessível publicamente
2. Teste manualmente com curl
3. Confirme que não há firewall bloqueando

## Segurança

- Logs de uptime só podem ser visualizados por super admins
- Secrets são armazenados de forma segura no Supabase
- Cooldown previne spam de alertas
- Limpeza automática remove dados antigos
