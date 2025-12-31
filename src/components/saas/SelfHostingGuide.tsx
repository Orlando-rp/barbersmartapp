import { useState } from "react";
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
  Shield, 
  Network, 
  Lock, 
  Settings2, 
  AlertTriangle, 
  CheckCircle,
  Copy,
  Check,
  Globe,
  HardDrive
} from "lucide-react";
import { toast } from "sonner";

const CodeBlock = ({ children }: { children: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-muted/50 border border-border rounded-lg p-4 pr-12 overflow-x-auto text-sm font-mono">
        <code>{children}</code>
      </pre>
      <Button
        variant="outline"
        size="icon"
        className={`absolute top-2 right-2 h-8 w-8 backdrop-blur-sm transition-all ${
          copied 
            ? "bg-success text-success-foreground border-success" 
            : "bg-background/80 hover:bg-primary hover:text-primary-foreground"
        }`}
        onClick={copyToClipboard}
        title="Copiar comando"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export const SelfHostingGuide = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <HardDrive className="h-6 w-6 text-primary" />
          <CardTitle>Guia de Self-Hosting</CardTitle>
        </div>
        <CardDescription>
          Configuração avançada com Traefik, SSL e certificados wildcard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {/* Visão Geral da Arquitetura */}
          <AccordionItem value="architecture" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Network className="h-5 w-5 text-primary" />
                <span className="font-semibold">1. Arquitetura Multi-Tenant</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                O BarberSmart utiliza arquitetura multi-tenant com subdomínios dinâmicos:
              </p>
              
              <div className="bg-muted/30 rounded-lg p-4 space-y-2 font-mono text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">App Principal</Badge>
                  <span>seudominio.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Admin SaaS</Badge>
                  <span>seudominio.com/saas-admin</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Barbearia A</Badge>
                  <span>barbearia-a.seudominio.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Barbearia B</Badge>
                  <span>barbearia-b.seudominio.com</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Certificado Wildcard Necessário</p>
                  <p className="text-muted-foreground">
                    Para suportar subdomínios ilimitados, você precisa de um certificado wildcard (*.seudominio.com)
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Configuração do Traefik */}
          <AccordionItem value="traefik" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Settings2 className="h-5 w-5 text-success" />
                <span className="font-semibold">2. Configuração do Traefik</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                O Traefik é o proxy reverso que gerencia SSL e roteamento. Crie o arquivo 
                <code className="bg-muted px-1 rounded mx-1">traefik.yml</code>:
              </p>
              
              <CodeBlock>{`# traefik.yml
api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: seu-email@exemplo.com
      storage: /letsencrypt/acme.json
      # Para certificados wildcard, use DNS challenge
      dnsChallenge:
        provider: cloudflare  # ou seu provedor DNS
        delayBeforeCheck: 10
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: web`}</CodeBlock>

              <div>
                <p className="text-sm font-medium mb-2">Provedores DNS suportados:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Cloudflare</Badge>
                  <Badge variant="outline">AWS Route53</Badge>
                  <Badge variant="outline">DigitalOcean</Badge>
                  <Badge variant="outline">GoDaddy</Badge>
                  <Badge variant="outline">Google Cloud DNS</Badge>
                  <Badge variant="outline">OVH</Badge>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Certificados Wildcard */}
          <AccordionItem value="wildcard" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-warning" />
                <span className="font-semibold">3. Certificados Wildcard (Let's Encrypt)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Certificados wildcard requerem validação DNS. Configure as credenciais do seu provedor:
              </p>
              
              <div>
                <p className="text-sm font-medium mb-2">Para Cloudflare:</p>
                <CodeBlock>{`# .env do Traefik
CF_API_EMAIL=seu-email@cloudflare.com
CF_DNS_API_TOKEN=seu-token-api-cloudflare`}</CodeBlock>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Para AWS Route53:</p>
                <CodeBlock>{`# .env do Traefik
AWS_ACCESS_KEY_ID=sua-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
AWS_REGION=us-east-1
AWS_HOSTED_ZONE_ID=seu-zone-id`}</CodeBlock>
              </div>

              <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Importante sobre DNS Challenge</p>
                  <p className="text-muted-foreground">
                    O DNS Challenge é necessário para certificados wildcard. A validação HTTP 
                    (padrão) não funciona para *.dominio.com
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Docker Compose Completo */}
          <AccordionItem value="docker" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-primary" />
                <span className="font-semibold">4. Docker Compose Completo</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Arquivo docker-compose.yml completo com Traefik e certificados wildcard:
              </p>
              
              <CodeBlock>{`version: '3.8'

networks:
  web:
    external: true

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    ports:
      - "80:80"
      - "443:443"
    environment:
      - CF_API_EMAIL=\${CF_API_EMAIL}
      - CF_DNS_API_TOKEN=\${CF_DNS_API_TOKEN}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/traefik.yml:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - web
    labels:
      - "traefik.enable=true"
      # Dashboard (opcional)
      - "traefik.http.routers.dashboard.rule=Host(\`traefik.\${DOMAIN}\`)"
      - "traefik.http.routers.dashboard.service=api@internal"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"

  barbersmart:
    build: .
    container_name: barbersmart_app
    restart: unless-stopped
    environment:
      - VITE_SUPABASE_URL=\${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=\${VITE_SUPABASE_ANON_KEY}
      - VITE_APP_DOMAIN=\${DOMAIN}
    networks:
      - web
    labels:
      - "traefik.enable=true"
      # Rota principal
      - "traefik.http.routers.app.rule=Host(\`\${DOMAIN}\`)"
      - "traefik.http.routers.app.tls=true"
      - "traefik.http.routers.app.tls.certresolver=letsencrypt"
      # Rota wildcard para subdomínios
      - "traefik.http.routers.app-wildcard.rule=HostRegexp(\`{subdomain:[a-z0-9-]+}.\${DOMAIN}\`)"
      - "traefik.http.routers.app-wildcard.tls=true"
      - "traefik.http.routers.app-wildcard.tls.certresolver=letsencrypt"
      - "traefik.http.routers.app-wildcard.tls.domains[0].main=\${DOMAIN}"
      - "traefik.http.routers.app-wildcard.tls.domains[0].sans=*.\${DOMAIN}"
      - "traefik.http.services.app.loadbalancer.server.port=80"`}</CodeBlock>
            </AccordionContent>
          </AccordionItem>

          {/* Configuração do Nginx */}
          <AccordionItem value="nginx" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-success" />
                <span className="font-semibold">5. Configuração Nginx (Alternativa)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Se preferir usar Nginx ao invés de Traefik:
              </p>
              
              <CodeBlock>{`# /etc/nginx/sites-available/barbersmart
server {
    listen 80;
    server_name seudominio.com *.seudominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com *.seudominio.com;

    # Certificado wildcard
    ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;
    
    # Configurações SSL recomendadas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}`}</CodeBlock>

              <div>
                <p className="text-sm font-medium mb-2">Gerar certificado wildcard com Certbot:</p>
                <CodeBlock>{`# Instalar Certbot com plugin Cloudflare
sudo apt install certbot python3-certbot-dns-cloudflare

# Criar arquivo de credenciais
cat > ~/.secrets/cloudflare.ini << EOF
dns_cloudflare_api_token = seu-token-aqui
EOF
chmod 600 ~/.secrets/cloudflare.ini

# Gerar certificado wildcard
sudo certbot certonly \\
  --dns-cloudflare \\
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \\
  -d seudominio.com \\
  -d "*.seudominio.com"`}</CodeBlock>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Troubleshooting */}
          <AccordionItem value="troubleshooting" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-destructive" />
                <span className="font-semibold">6. Troubleshooting SSL/Certificados</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-medium text-sm">Certificado não emitido</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verifique se as credenciais DNS estão corretas e se o token tem permissão 
                    para editar registros DNS.
                  </p>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-medium text-sm">Erro "too many certificates"</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Let's Encrypt tem limite de 50 certificados por semana. Use staging para testes:
                  </p>
                  <CodeBlock>{`# Adicione ao traefik.yml para testes
caServer: https://acme-staging-v02.api.letsencrypt.org/directory`}</CodeBlock>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-medium text-sm">Subdomínio não resolve</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Confirme que o registro DNS wildcard (*.seudominio.com) está apontando para o IP correto.
                  </p>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="font-medium text-sm">Erro de permissão no acme.json</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    O arquivo precisa ter permissão 600:
                  </p>
                  <CodeBlock>{`chmod 600 ./letsencrypt/acme.json`}</CodeBlock>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-sm font-medium mb-2">Comandos úteis para debug SSL:</p>
                <CodeBlock>{`# Verificar certificado atual
echo | openssl s_client -connect seudominio.com:443 2>/dev/null | openssl x509 -noout -dates

# Verificar certificado para subdomínio
echo | openssl s_client -connect teste.seudominio.com:443 -servername teste.seudominio.com 2>/dev/null | openssl x509 -noout -text | grep DNS

# Logs do Traefik
docker logs traefik -f --tail=100

# Forçar renovação de certificado
docker exec traefik traefik healthcheck`}</CodeBlock>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};