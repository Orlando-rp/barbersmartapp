import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Rocket, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Info,
  GitBranch,
  ExternalLink,
  Terminal,
  RefreshCw,
  History,
  Clock,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Get version from package.json (injected at build time)
const APP_VERSION = "1.4.2"; // This would ideally come from a build-time variable

interface DeployHistory {
  id: string;
  tag: string;
  status: 'triggered' | 'success' | 'error';
  triggered_by: string | null;
  skip_health_check: boolean;
  error_message: string | null;
  created_at: string;
}

const DeployPanel = () => {
  const [tag, setTag] = useState("");
  const [skipHealthCheck, setSkipHealthCheck] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployHistory, setDeployHistory] = useState<DeployHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    fetchDeployHistory();
  }, []);

  const fetchDeployHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('deploy_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setDeployHistory(data || []);
    } catch (error) {
      console.error('Error fetching deploy history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

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
        fetchDeployHistory();
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        fetchDeployHistory();
        return;
      }

      toast.success(`Deploy da versão ${tag} disparado com sucesso!`);
      setTag("");
      setSkipHealthCheck(false);
      fetchDeployHistory();
    } catch (err: any) {
      console.error('Deploy exception:', err);
      toast.error(`Erro inesperado: ${err.message}`);
      fetchDeployHistory();
    } finally {
      setIsDeploying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sucesso
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      case 'triggered':
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Disparado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
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

      {/* Deploy History Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Deploys
            </CardTitle>
            <CardDescription>
              Últimos 10 deploys disparados
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDeployHistory}
            disabled={isLoadingHistory}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : deployHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Rocket className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum deploy registrado ainda</p>
              <p className="text-sm">Dispare seu primeiro deploy acima</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Versão</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Data/Hora</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Health Check</th>
                  </tr>
                </thead>
                <tbody>
                  {deployHistory.map((deploy) => (
                    <tr key={deploy.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {deploy.tag}
                        </code>
                      </td>
                      <td className="py-3 px-2">
                        {deploy.error_message ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  {getStatusBadge(deploy.status)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">{deploy.error_message}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          getStatusBadge(deploy.status)
                        )}
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {format(new Date(deploy.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="text-xs">
                          {deploy.skip_health_check ? 'Pulado' : 'Executado'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeployPanel;
