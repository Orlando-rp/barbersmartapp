# 🚀 Guia de Release - BarberSmart

## Visão Geral

O deploy do BarberSmart é controlado por **tags de versão**. Commits normais no GitHub **não disparam deploy automático**.

Para fazer deploy, você precisa criar uma tag de versão (ex: `v1.0.0`).

---

## Configuração Inicial (Uma vez)

### Instalar Git Hooks

Os hooks garantem qualidade do código e padronização de commits:

```bash
# Dar permissão e instalar
chmod +x scripts/setup-hooks.sh
./scripts/setup-hooks.sh
```

Isso instala:
- **commit-msg**: Valida mensagens no padrão Conventional Commits
- **pre-commit**: Verifica código (debugger, secrets, arquivos grandes)

---

## Conventional Commits

Todas as mensagens de commit devem seguir o padrão:

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

### Tipos Disponíveis

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `feat` | Nova funcionalidade | `feat: adicionar login com Google` |
| `fix` | Correção de bug | `fix(auth): corrigir token expirado` |
| `docs` | Documentação | `docs: atualizar README` |
| `style` | Formatação | `style: corrigir indentação` |
| `refactor` | Refatoração | `refactor: extrair componente` |
| `perf` | Performance | `perf: otimizar query SQL` |
| `test` | Testes | `test: adicionar testes de login` |
| `build` | Build/deps | `build: atualizar React` |
| `ci` | CI/CD | `ci: adicionar cache no workflow` |
| `chore` | Outras | `chore: limpar arquivos temp` |

### Breaking Changes

Use `!` antes de `:` para indicar mudanças incompatíveis:

```bash
feat!: alterar formato de resposta da API
```

### Escopo (Opcional)

Indica a área afetada:

```bash
fix(appointments): corrigir horário duplicado
feat(whatsapp): adicionar chatbot
docs(api): documentar endpoints
```

---

## Métodos de Release

### Método 1: Script Automático (Recomendado)

Use o script de release que automatiza todo o processo:

```bash
# Dar permissão de execução (apenas primeira vez)
chmod +x scripts/release.sh

# Executar o script
./scripts/release.sh

# Ou especificar o tipo diretamente
./scripts/release.sh patch   # v1.0.0 → v1.0.1 (correções)
./scripts/release.sh minor   # v1.0.0 → v1.1.0 (novas features)
./scripts/release.sh major   # v1.0.0 → v2.0.0 (breaking changes)
```

O script irá:
1. ✅ Verificar alterações não commitadas
2. ✅ Incrementar a versão no `package.json`
3. ✅ Criar commit com a nova versão
4. ✅ Criar a tag Git
5. ✅ Perguntar se deseja fazer push (deploy)

---

### Método 2: Via Git CLI

```bash
# 1. Certifique-se que todas as alterações estão commitadas
git status

# 2. Crie a tag
git tag v1.0.0

# 3. Envie para o GitHub
git push origin main
git push origin v1.0.0
```

---

### Método 3: Via GitHub Web

1. Acesse seu repositório no GitHub
2. Clique em **Releases** → **Create new release**
3. Em "Choose a tag", digite a nova versão (ex: `v1.0.1`)
4. Clique em **Create new tag: v1.0.1 on publish**
5. Adicione título e descrição (changelog)
6. Clique em **Publish release**

---

## Convenção de Versionamento (SemVer)

Seguimos o [Semantic Versioning](https://semver.org/):

| Tipo | Quando usar | Exemplo |
|------|-------------|---------|
| **MAJOR** | Mudanças incompatíveis com versão anterior | `v1.0.0` → `v2.0.0` |
| **MINOR** | Novas funcionalidades retrocompatíveis | `v1.0.0` → `v1.1.0` |
| **PATCH** | Correções de bugs retrocompatíveis | `v1.0.0` → `v1.0.1` |

---

## Fluxo de Trabalho

```
┌─────────────────────────────────────────────────────────────┐
│                    DESENVOLVIMENTO                          │
├─────────────────────────────────────────────────────────────┤
│  Lovable  ──sync──►  GitHub (main)                          │
│                      (sem deploy)                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ (quando pronto para deploy)
┌─────────────────────────────────────────────────────────────┐
│                       RELEASE                                │
├─────────────────────────────────────────────────────────────┤
│  ./scripts/release.sh  ──►  Cria tag v*  ──►  Push          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        DEPLOY                                │
├─────────────────────────────────────────────────────────────┤
│  GitHub Actions  ──►  Docker Build  ──►  Portainer Update   │
└─────────────────────────────────────────────────────────────┘
```

---

## Deploy de Emergência

Se precisar fazer deploy sem incrementar versão:

```bash
# Via GitHub Actions (workflow_dispatch)
# 1. Acesse: GitHub → Actions → Build and Push Docker Image
# 2. Clique em "Run workflow"
# 3. Defina a tag (ex: hotfix-123)
# 4. Clique em "Run workflow"
```

---

## Verificando Versão Atual

```bash
# Ver versão no package.json
node -p "require('./package.json').version"

# Ver última tag
git describe --tags --abbrev=0

# Listar todas as tags
git tag -l "v*" --sort=-v:refname
```

---

## Rollback

Para voltar para uma versão anterior:

```bash
# No Portainer, altere a tag da imagem para a versão desejada
# Exemplo: barbersmart/barbersmartapp:v1.0.0

# Ou via CLI no servidor
docker service update --image barbersmart/barbersmartapp:v1.0.0 barbersmart_app
```

---

## Troubleshooting

### Tag já existe
```bash
# Deletar tag local e remota
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0
```

### Deploy não iniciou
1. Verifique se a tag começa com `v` (ex: `v1.0.0`, não `1.0.0`)
2. Acesse GitHub Actions para ver o status
3. Verifique se os secrets estão configurados

### Workflow falhou
1. Veja os logs em GitHub → Actions
2. Verifique se `DOCKERHUB_TOKEN` e `PORTAINER_WEBHOOK_URL` estão configurados
