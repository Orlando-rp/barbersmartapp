import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Save, TestTube, Loader2, Eye, EyeOff, Info, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from_email: string;
  from_name: string;
}

const defaultConfig: EmailConfig = {
  enabled: false,
  host: "",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  from_email: "",
  from_name: "",
};

export default function BarbershopEmailConfig() {
  const { barbershopId } = useAuth();
  const [config, setConfig] = useState<EmailConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [barbershopName, setBarbershopName] = useState("");
  const [usingGlobal, setUsingGlobal] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      loadConfig();
    }
  }, [barbershopId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("barbershops")
        .select("name, email_config")
        .eq("id", barbershopId)
        .single();

      if (error) throw error;

      setBarbershopName(data?.name || "");
      
      if (data?.email_config) {
        setConfig(data.email_config);
        setUsingGlobal(!data.email_config.enabled);
      } else {
        setConfig({
          ...defaultConfig,
          from_name: data?.name || "",
        });
        setUsingGlobal(true);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações de email");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from("barbershops")
        .update({ email_config: config })
        .eq("id", barbershopId);

      if (error) throw error;

      setUsingGlobal(!config.enabled);
      toast.success("Configurações de email salvas!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const { data, error } = await supabase.functions.invoke("test-smtp-connection", {
        body: {
          host: config.host,
          port: config.port,
          secure: config.secure,
          user: config.user,
          pass: config.pass,
          from_email: config.from_email,
          from_name: config.from_name || barbershopName,
          barbershop_id: barbershopId,
        },
      });

      if (error) throw error;

      setTestResult({
        success: data.success,
        message: data.success ? data.message : data.error,
      });
    } catch (error: any) {
      console.error("Erro no teste:", error);
      setTestResult({
        success: false,
        message: error.message || "Erro ao testar conexão",
      });
    } finally {
      setTesting(false);
    }
  };

  const handlePortChange = (value: string) => {
    const port = parseInt(value);
    setConfig({
      ...config,
      port,
      secure: port === 465,
    });
  };

  if (loading) {
    return (
      <Card className="barbershop-card">
        <CardContent className="pt-6 flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="barbershop-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Servidor de Email (SMTP)</CardTitle>
                <CardDescription>Configure seu próprio servidor para emails da barbearia</CardDescription>
              </div>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!config.enabled && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Usando servidor de email global do sistema. Ative para usar seu próprio servidor SMTP.
              </AlertDescription>
            </Alert>
          )}

          {config.enabled && (
            <>
              {/* Server Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Configurações do Servidor</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Host SMTP</Label>
                    <Input
                      placeholder="smtp.exemplo.com"
                      value={config.host}
                      onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Porta</Label>
                    <Select value={config.port.toString()} onValueChange={handlePortChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 (SMTP)</SelectItem>
                        <SelectItem value="465">465 (SSL)</SelectItem>
                        <SelectItem value="587">587 (TLS - Recomendado)</SelectItem>
                        <SelectItem value="2525">2525 (Alternativa)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="secure"
                    checked={config.secure}
                    onCheckedChange={(checked) => setConfig({ ...config, secure: checked })}
                  />
                  <Label htmlFor="secure">Conexão segura (SSL/TLS)</Label>
                </div>
              </div>

              {/* Authentication */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Autenticação</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Usuário</Label>
                    <Input
                      placeholder="email@exemplo.com"
                      value={config.user}
                      onChange={(e) => setConfig({ ...config, user: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={config.pass}
                        onChange={(e) => setConfig({ ...config, pass: e.target.value })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sender Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Informações do Remetente</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email do Remetente</Label>
                    <Input
                      placeholder="contato@suabarbearia.com"
                      value={config.from_email}
                      onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Remetente</Label>
                    <Input
                      placeholder={barbershopName || "Nome da Barbearia"}
                      value={config.from_name}
                      onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <span className="text-muted-foreground">Preview do remetente:</span>
                <br />
                <strong>{config.from_name || barbershopName || "Sua Barbearia"} &lt;{config.from_email || "email@exemplo.com"}&gt;</strong>
              </div>

              {/* Test Result */}
              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            {config.enabled && (
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={testing || !config.host || !config.user || !config.pass || !config.from_email}
              >
                {testing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                Testar Conexão
              </Button>
            )}
            <Button onClick={saveConfig} disabled={saving} className="sm:ml-auto">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="barbershop-card border-dashed">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-3">💡 Dicas</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Use um email profissional com domínio próprio para maior credibilidade</li>
            <li>• Porta 587 com TLS é recomendada pela maioria dos provedores</li>
            <li>• Configure SPF, DKIM e DMARC no seu domínio para melhor entregabilidade</li>
            <li>• Se desativar o SMTP próprio, os emails usarão o servidor global do sistema</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
