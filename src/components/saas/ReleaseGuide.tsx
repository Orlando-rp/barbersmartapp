import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  GitBranch, 
  Tag, 
  FileText, 
  RotateCcw,
  Copy,
  Rocket,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

const CodeBlock = ({ children }: { children: string }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(children);
    toast.success("Copiado para a área de transferência!");
  };

  return (
    <div className="relative group">
      <pre className="bg-muted/50 border border-border rounded-lg p-4 overflow-x-auto text-sm font-mono">
        <code>{children}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
        onClick={copyToClipboard}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const ReleaseGuide = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Tag className="h-6 w-6 text-primary" />
          <CardTitle>Guia de Releases</CardTitle>
        </div>
        <CardDescription>
          Como criar novas versões e gerenciar releases do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {/* Conventional Commits */}
          <AccordionItem value="commits" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-primary" />
                <span className="font-semibold">1. Conventional Commits</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Todos os commits devem seguir o padrão Conventional Commits para 
                geração automática de changelog:
              </p>
              
              <CodeBlock>{`<tipo>(<escopo>): <descrição>

# Exemplos:
feat(agendamento): adiciona seleção de horário por período
fix(auth): corrige loop de redirecionamento no login
docs(readme): atualiza instruções de instalação
style(dashboard): melhora espaçamento dos cards
refactor(api): simplifica lógica de validação
perf(queries): otimiza consultas de relatórios
chore(deps): atualiza dependências do projeto`}</CodeBlock>

              <div className="grid gap-2">
                <p className="text-sm font-medium">Tipos disponíveis:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">feat</Badge>
                  <Badge variant="secondary">fix</Badge>
                  <Badge variant="outline">docs</Badge>
                  <Badge variant="outline">style</Badge>
                  <Badge variant="outline">refactor</Badge>
                  <Badge variant="outline">perf</Badge>
                  <Badge variant="outline">test</Badge>
                  <Badge variant="outline">chore</Badge>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Breaking Changes</p>
                  <p className="text-muted-foreground">
                    Use <code className="bg-muted px-1 rounded">feat!</code> ou 
                    <code className="bg-muted px-1 rounded ml-1">fix!</code> para mudanças 
                    que quebram compatibilidade
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Script de Release */}
          <AccordionItem value="script" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Rocket className="h-5 w-5 text-success" />
                <span className="font-semibold">2. Criar Release (Recomendado)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Use o script automatizado para criar releases:
              </p>
              
              <CodeBlock>{`# Release patch (1.0.0 → 1.0.1) - correções
./scripts/release.sh patch

# Release minor (1.0.0 → 1.1.0) - novos recursos
./scripts/release.sh minor

# Release major (1.0.0 → 2.0.0) - breaking changes
./scripts/release.sh major`}</CodeBlock>

              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <p className="font-medium text-sm">O script automaticamente:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Incrementa a versão no package.json</li>
                  <li>Gera changelog a partir dos commits</li>
                  <li>Atualiza CHANGELOG.md</li>
                  <li>Gera release-notes.json</li>
                  <li>Cria commit e tag Git</li>
                  <li>Faz push para o GitHub</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Versionamento Semântico */}
          <AccordionItem value="semver" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-warning" />
                <span className="font-semibold">3. Versionamento Semântico</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Seguimos o padrão SemVer (MAJOR.MINOR.PATCH):
              </p>
              
              <div className="space-y-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-destructive">MAJOR</Badge>
                    <span className="font-medium text-sm">1.0.0 → 2.0.0</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mudanças incompatíveis com versões anteriores (breaking changes)
                  </p>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-primary">MINOR</Badge>
                    <span className="font-medium text-sm">1.0.0 → 1.1.0</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Novos recursos mantendo compatibilidade
                  </p>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary">PATCH</Badge>
                    <span className="font-medium text-sm">1.0.0 → 1.0.1</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Correções de bugs e pequenas melhorias
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Rollback */}
          <AccordionItem value="rollback" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <RotateCcw className="h-5 w-5 text-destructive" />
                <span className="font-semibold">4. Rollback</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Em caso de problemas, reverta para uma versão anterior:
              </p>
              
              <div>
                <p className="text-sm font-medium mb-2">Via Portainer:</p>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                  <li>Acesse a stack do BarberSmart</li>
                  <li>Altere a tag da imagem para a versão desejada</li>
                  <li>Clique em "Update the stack"</li>
                </ol>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Via Docker CLI:</p>
                <CodeBlock>{`# Listar versões disponíveis
docker images | grep barbersmart

# Fazer rollback para versão específica
docker-compose -f docker-stack.yml down
docker-compose -f docker-stack.yml up -d --build

# Ou usando tag específica
docker pull ghcr.io/seu-usuario/barbersmart:v1.2.0
docker-compose -f docker-stack.yml up -d`}</CodeBlock>
              </div>

              <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Atenção</p>
                  <p className="text-muted-foreground">
                    Rollbacks podem causar inconsistências se houve migração de banco de dados. 
                    Sempre verifique o changelog antes.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Deploy de Emergência */}
          <AccordionItem value="emergency" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="font-semibold">5. Deploy de Emergência</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Para deployar uma correção urgente sem criar release formal:
              </p>
              
              <CodeBlock>{`# 1. Faça o commit da correção
git add .
git commit -m "fix: correção urgente de bug crítico"

# 2. Crie uma tag de hotfix
git tag -a v1.2.1-hotfix -m "Hotfix: correção urgente"

# 3. Push
git push origin main --tags

# 4. O GitHub Actions fará o deploy automaticamente`}</CodeBlock>

              <p className="text-sm text-muted-foreground">
                Ou acione manualmente via GitHub Actions:
              </p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Vá em Actions → Build and Push</li>
                <li>Clique em "Run workflow"</li>
                <li>Informe a tag desejada</li>
                <li>Execute o workflow</li>
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};
