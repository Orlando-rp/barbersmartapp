import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeploymentGuide } from "./DeploymentGuide";
import { ReleaseGuide } from "./ReleaseGuide";
import { ReleaseNotes } from "./ReleaseNotes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, 
  Server, 
  Tag, 
  FileText,
  ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const DocumentationTab = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Documentação</h2>
            <p className="text-muted-foreground">
              Guias e referências para deploy e manutenção do sistema
            </p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Deploy</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configuração de servidor, DNS e containers Docker
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-success" />
              <CardTitle className="text-base">Releases</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Versionamento, changelog e processo de release
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-warning" />
              <CardTitle className="text-base">Release Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Histórico de versões e mudanças do sistema
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs with Guides */}
      <Tabs defaultValue="deploy" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="deploy" className="gap-2">
            <Server className="h-4 w-4" />
            <span className="hidden sm:inline">Deploy</span>
          </TabsTrigger>
          <TabsTrigger value="releases" className="gap-2">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">Releases</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Release Notes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deploy">
          <DeploymentGuide />
        </TabsContent>

        <TabsContent value="releases">
          <ReleaseGuide />
        </TabsContent>

        <TabsContent value="notes">
          <ReleaseNotes />
        </TabsContent>
      </Tabs>

      {/* Additional Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recursos Adicionais</CardTitle>
          <CardDescription>
            Links úteis para documentação externa e suporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Supabase Docs
              </a>
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="https://docs.docker.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Docker Docs
              </a>
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="https://doc.traefik.io/traefik/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Traefik Docs
              </a>
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="https://letsencrypt.org/docs/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Let's Encrypt
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
