import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Rocket, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Info,
  GitBranch,
  ExternalLink,
  Terminal
} from "lucide-react";
import { toast } from "sonner";

// Get version from package.json (injected at build time)
const APP_VERSION = "1.4.2"; // This would ideally come from a build-time variable

const DeployPanel = () => {
  const [tag, setTag] = useState("");
  const [skipHealthCheck, setSkipHealthCheck] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [lastDeploy, setLastDeploy] = useState<{
    tag: string;
    timestamp: Date;
    success: boolean;
  } | null>(null);

  const validateTag = (value: string): boolean => {
    // Accept semver format (v1.0.0) or simple tags
    const semverRegex = /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
    return semverRegex.test(value) || value === 'latest';
  };

  const handleDeploy = async () => {
    if (!tag.trim()) {
      toast.error("Digite uma tag/versão para o deploy");
      return;
    }

    if (!validateTag(tag)) {
      toast.error("Formato de versão inválido. Use semver (ex: v1.0.0) ou 'latest'");
      return;
    }

    setIsDeploying(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const { data, error } = await supabase.functions.invoke('trigger-deploy', {
        body: { 
          tag: tag.startsWith('v') ? tag : `v${tag}`,
          skip_health_check: skipHealthCheck 
        }
      });

      if (error) {
        console.error('Deploy error:', error);
        toast.error(`Erro ao disparar deploy: ${error.message}`);
        setLastDeploy({
          tag,
          timestamp: new Date(),
          success: false
        });
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setLastDeploy({
          tag,
          timestamp: new Date(),
          success: false
        });
        return;
      }

      toast.success(`Deploy da versão ${tag} disparado com sucesso!`);
      setLastDeploy({
        tag,
        timestamp: new Date(),
        success: true
      });
      setTag("");
    } catch (err: any) {
      console.error('Deploy exception:', err);
      toast.error(`Erro inesperado: ${err.message}`);
      setLastDeploy({
        tag,
        timestamp: new Date(),
        success: false
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Rocket className="h-6 w-6 text-warning" />
          Deploy & Versões
        </h2>
        <p className="text-muted-foreground mt-1">
          Publique novas versões da aplicação diretamente do painel
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Deploy Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Publicar Nova Versão
            </CardTitle>
            <CardDescription>
              Dispare o workflow de build e deploy no GitHub Actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Version */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Versão Atual:</span>
              <Badge variant="outline" className="font-mono">
                v{APP_VERSION}
              </Badge>
            </div>

            {/* Tag Input */}
            <div className="space-y-2">
              <Label htmlFor="tag">Tag/Versão</Label>
              <Input
                id="tag"
                placeholder="v1.5.0"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                disabled={isDeploying}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Use formato semver (v1.0.0) ou 'latest'
              </p>
            </div>

            {/* Skip Health Check */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="skipHealthCheck"
                checked={skipHealthCheck}
                onCheckedChange={(checked) => setSkipHealthCheck(checked as boolean)}
                disabled={isDeploying}
              />
              <Label 
                htmlFor="skipHealthCheck" 
                className="text-sm font-normal cursor-pointer"
              >
                Pular Health Check
              </Label>
            </div>

            {/* Deploy Button */}
            <Button
              onClick={handleDeploy}
              disabled={isDeploying || !tag.trim()}
              className="w-full bg-warning hover:bg-warning/90 text-warning-foreground"
              size="lg"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Disparando Deploy...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-5 w-5" />
                  Publicar Nova Versão
                </>
              )}
            </Button>

            {/* Last Deploy Status */}
            {lastDeploy && (
              <Alert variant={lastDeploy.success ? "default" : "destructive"}>
                {lastDeploy.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {lastDeploy.success ? "Deploy disparado" : "Falha no deploy"}
                </AlertTitle>
                <AlertDescription>
                  Versão: {lastDeploy.tag} às {lastDeploy.timestamp.toLocaleTimeString('pt-BR')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Configuration Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Configuração
            </CardTitle>
            <CardDescription>
              Secrets necessários para o deploy funcionar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Secrets do Supabase</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-2">Configure os seguintes secrets no Supabase:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><code className="bg-muted px-1 rounded">GITHUB_PAT</code> - Personal Access Token</li>
                  <li><code className="bg-muted px-1 rounded">GITHUB_OWNER</code> - Usuário/Org do repositório</li>
                  <li><code className="bg-muted px-1 rounded">GITHUB_REPO</code> - Nome do repositório</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Como funciona:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Você insere a versão desejada</li>
                <li>O sistema dispara o GitHub Actions</li>
                <li>Build da imagem Docker é iniciado</li>
                <li>Imagem é publicada no Docker Hub</li>
                <li>Portainer atualiza automaticamente</li>
              </ol>
            </div>

            <div className="pt-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => window.open('https://github.com/Orlando-rp/barbersmartapp/actions', '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver GitHub Actions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeployPanel;
