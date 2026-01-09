# BarberSmart


![Version](https://img.shields.io/github/v/release/seu-usuario/barbersmart?label=vers%C3%A3o&color=8B5CF6)
![License](https://img.shields.io/badge/licen%C3%A7a-MIT-green)
![Build](https://img.shields.io/github/actions/workflow/status/seu-usuario/barbersmart/build-push.yml?label=build)
![Docker](https://img.shields.io/docker/v/seu-usuario/barbersmartapp?label=docker&color=2496ED)

> 🚀 Plataforma SaaS completa para gestão de barbearias

---

## ✨ Funcionalidades

- 📅 **Agendamento Inteligente** - Sistema de agendamento online com integração WhatsApp
- 💰 **Gestão Financeira** - Controle de receitas, despesas e comissões
- 👥 **Gestão de Equipe** - Perfis, horários e métricas de desempenho
- 📱 **Portal do Cliente** - Agendamento self-service para clientes
- 🤖 **Chatbot IA** - Atendimento automatizado via WhatsApp
- 🏢 **Multi-unidade** - Suporte para redes de barbearias
- 📊 **Relatórios** - Análises e insights do negócio

---

## 🛠️ Tecnologias

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions)
- **Infraestrutura:** Docker, GitHub Actions, Portainer

---

## 🚀 Início Rápido

### Desenvolvimento Local

```bash
# Clonar repositório
git clone <YOUR_GIT_URL>
cd barbersmart

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### Docker

```bash
# Build e run
docker compose up -d

# Ou usando imagem do Docker Hub
docker pull seu-usuario/barbersmartapp:latest
```

---

## 📦 Deploy

### Deploy Controlado por Tags

O deploy é disparado apenas quando uma tag de versão é criada:

```bash
# Instalar hooks de validação (primeira vez)
chmod +x scripts/setup-hooks.sh
./scripts/setup-hooks.sh

# Criar release
chmod +x scripts/release.sh
./scripts/release.sh
```

O script irá:
1. ✅ Validar commits (Conventional Commits)
2. ✅ Gerar changelog automaticamente
3. ✅ Atualizar versão no package.json
4. ✅ Criar tag e fazer push
5. ✅ Disparar build e deploy via GitHub Actions

### Tipos de Release

| Comando | Descrição | Exemplo |
|---------|-----------|---------|
| `./scripts/release.sh patch` | Correções | v1.0.0 → v1.0.1 |
| `./scripts/release.sh minor` | Novas funcionalidades | v1.0.0 → v1.1.0 |
| `./scripts/release.sh major` | Breaking changes | v1.0.0 → v2.0.0 |

---

## 📝 Conventional Commits

Todas as mensagens de commit devem seguir o padrão:

```
<tipo>(<escopo>): <descrição>
```

**Tipos:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

**Exemplos:**
```bash
feat: adicionar login com Google
fix(auth): corrigir token expirado
docs: atualizar README
```

---

## 📚 Documentação

- [Guia de Release](docs/RELEASE-GUIDE.md)
- [Arquitetura Multi-tenant](docs/MULTI-TENANT-ARCHITECTURE.md)
- [Self-Hosting](docs/SELF-HOSTING-GUIDE.md)
- [Configuração WhatsApp](docs/WHATSAPP-SETUP-INSTRUCTIONS.md)

---

## 🔗 Links

- **Lovable:** [Abrir no Editor](https://lovable.dev/projects/d7d3f7bb-7e01-497c-925a-df1aa3ec8da6)
- **Changelog:** [Ver atualizações](CHANGELOG.md)

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
