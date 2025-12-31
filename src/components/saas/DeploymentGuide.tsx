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
  Server, 
  Globe, 
  Key, 
  Terminal, 
  AlertTriangle, 
  CheckCircle,
  Copy,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

const CodeBlock = ({ children, language = "bash" }: { children: string; language?: string }) => {
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

export const DeploymentGuide = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Server className="h-6 w-6 text-primary" />
          <CardTitle>Guia de Deploy</CardTitle>
        </div>
        <CardDescription>
          Passo a passo para fazer deploy do BarberSmart em produção
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {/* Pré-requisitos */}
          <AccordionItem value="prerequisites" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-semibold">1. Pré-requisitos</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Badge variant="outline">VPS</Badge>
                  <div>
                    <p className="font-medium">Servidor Virtual Privado</p>
                    <p className="text-sm text-muted-foreground">
                      Ubuntu 20.04+ com no mínimo 2GB RAM e 20GB de disco
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Badge variant="outline">Docker</Badge>
                  <div>
                    <p className="font-medium">Docker + Docker Compose</p>
                    <p className="text-sm text-muted-foreground">
                      Versão 20.10+ do Docker e Compose v2
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Badge variant="outline">Domínio</Badge>
                  <div>
                    <p className="font-medium">Domínio próprio</p>
                    <p className="text-sm text-muted-foreground">
                      Com acesso ao painel DNS para configuração
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Badge variant="outline">Supabase</Badge>
                  <div>
                    <p className="font-medium">Projeto Supabase</p>
                    <p className="text-sm text-muted-foreground">
                      URL e chave anon key do projeto
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Instalar Docker (se necessário):</p>
                <CodeBlock>{`curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Faça logout e login novamente`}</CodeBlock>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Configuração DNS */}
          <AccordionItem value="dns" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <span className="font-semibold">2. Configuração DNS</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Configure os seguintes registros DNS no painel do seu provedor de domínio:
              </p>
              
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-3 gap-4 text-sm font-mono">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="text-muted-foreground">Nome</span>
                  <span className="text-muted-foreground">Valor</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm font-mono border-t border-border pt-2">
                  <Badge variant="secondary">A</Badge>
                  <span>@</span>
                  <span className="text-primary">IP_DA_VPS</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm font-mono">
                  <Badge variant="secondary">A</Badge>
                  <span>*</span>
                  <span className="text-primary">IP_DA_VPS</span>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Importante</p>
                  <p className="text-muted-foreground">
                    O registro wildcard (*) permite que subdomínios das barbearias funcionem 
                    automaticamente (ex: minhabarbearia.seudominio.com)
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                A propagação DNS pode levar até 24 horas. Verifique com:
              </p>
              <CodeBlock>{`dig +short seudominio.com
dig +short teste.seudominio.com`}</CodeBlock>
            </AccordionContent>
          </AccordionItem>

          {/* Variáveis de Ambiente */}
          <AccordionItem value="env" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-warning" />
                <span className="font-semibold">3. Variáveis de Ambiente</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Crie um arquivo <code className="bg-muted px-1 rounded">.env</code> na raiz do projeto:
              </p>
              
              <CodeBlock>{`# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon

# Domínio Principal
VITE_APP_DOMAIN=seudominio.com
VITE_APP_URL=https://seudominio.com

# Traefik (Proxy Reverso / SSL)
TRAEFIK_ACME_EMAIL=seu-email@exemplo.com

# Opcional - Analytics
VITE_GA_TRACKING_ID=G-XXXXXXXX`}</CodeBlock>

              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Nunca commite o arquivo .env!</p>
                  <p className="text-muted-foreground">
                    Adicione ao .gitignore e mantenha suas chaves seguras
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Comandos de Deploy */}
          <AccordionItem value="commands" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Terminal className="h-5 w-5 text-success" />
                <span className="font-semibold">4. Comandos de Deploy</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Clone o repositório:</p>
                  <CodeBlock>{`git clone https://github.com/seu-usuario/barbersmart.git
cd barbersmart`}</CodeBlock>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Crie a rede Docker:</p>
                  <CodeBlock>{`docker network create web`}</CodeBlock>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Inicie os containers:</p>
                  <CodeBlock>{`# Build e start em produção
docker-compose -f docker-stack.yml up -d --build

# Verificar logs
docker-compose -f docker-stack.yml logs -f

# Verificar status
docker-compose -f docker-stack.yml ps`}</CodeBlock>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Atualizar para nova versão:</p>
                  <CodeBlock>{`git pull origin main
docker-compose -f docker-stack.yml up -d --build`}</CodeBlock>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Troubleshooting */}
          <AccordionItem value="troubleshooting" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="font-semibold">5. Troubleshooting</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-medium text-sm">Domínio não resolve</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verifique a propagação DNS com <code className="bg-muted px-1 rounded">dig</code> 
                    ou use serviços como whatsmydns.net
                  </p>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-medium text-sm">Certificado SSL não emitido</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verifique se a porta 80 está aberta e acessível. O Let's Encrypt precisa 
                    validar via HTTP.
                  </p>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-medium text-sm">Container reiniciando</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verifique os logs com <code className="bg-muted px-1 rounded">docker logs container_name</code>
                  </p>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-medium text-sm">Erro de conexão com Supabase</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Confirme que as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão corretas
                  </p>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Comandos úteis para debug:</p>
                <CodeBlock>{`# Ver logs em tempo real
docker-compose -f docker-stack.yml logs -f --tail=100

# Reiniciar um serviço específico
docker-compose -f docker-stack.yml restart app

# Verificar uso de recursos
docker stats

# Acessar shell do container
docker exec -it barbersmart_app sh`}</CodeBlock>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};
