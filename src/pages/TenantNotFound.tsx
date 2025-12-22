import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Home, Search, Mail } from "lucide-react";
import { DEFAULT_SYSTEM_NAME, MAIN_DOMAINS } from "@/lib/tenantConfig";

/**
 * TenantNotFound - Displayed when a domain/subdomain is not registered
 * 
 * This page is shown when:
 * - A subdomain like xyz.barbersmart.app is not registered
 * - A custom domain pointing to the system is not configured
 */
export default function TenantNotFound() {
  const hostname = window.location.hostname;
  const mainDomain = MAIN_DOMAINS[0] || 'barbersmart.app';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center border-destructive/20">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Página Não Encontrada</CardTitle>
          <CardDescription className="text-base mt-2">
            O endereço <span className="font-mono text-foreground bg-muted px-1 rounded">{hostname}</span> não está configurado no sistema.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Possíveis motivos:</p>
            <ul className="list-disc list-inside text-left space-y-1">
              <li>O subdomínio ainda não foi ativado</li>
              <li>O domínio personalizado não foi configurado</li>
              <li>Há um erro de digitação no endereço</li>
            </ul>
          </div>
          
          <div className="border-t border-border pt-6 space-y-3">
            <Button 
              variant="default" 
              className="w-full"
              onClick={() => window.location.href = `https://${mainDomain}`}
            >
              <Home className="h-4 w-4 mr-2" />
              Ir para {DEFAULT_SYSTEM_NAME}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = `https://${mainDomain}/contato`}
            >
              <Mail className="h-4 w-4 mr-2" />
              Entrar em Contato
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Se você é o proprietário deste domínio, acesse o painel administrativo para configurá-lo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
