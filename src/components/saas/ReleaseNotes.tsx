import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Sparkles, Bug, Zap, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';

interface ReleaseItem {
  text: string;
  hash: string | null;
}

interface ReleaseSection {
  [key: string]: ReleaseItem[];
}

interface Release {
  version: string;
  date: string | null;
  sections: ReleaseSection;
}

interface ReleaseNotesData {
  releases: Release[];
  total: number;
  latest: Release | null;
  generated_at: string;
}

const getSectionIcon = (sectionName: string) => {
  if (sectionName.includes('BREAKING')) return <AlertTriangle className="h-4 w-4 text-destructive" />;
  if (sectionName.includes('Funcionalidades') || sectionName.includes('Features')) return <Sparkles className="h-4 w-4 text-emerald-500" />;
  if (sectionName.includes('Correções') || sectionName.includes('Fixes')) return <Bug className="h-4 w-4 text-amber-500" />;
  if (sectionName.includes('Performance')) return <Zap className="h-4 w-4 text-blue-500" />;
  if (sectionName.includes('Refatoração')) return <RefreshCw className="h-4 w-4 text-purple-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

const getSectionColor = (sectionName: string): "destructive" | "default" | "secondary" | "outline" => {
  if (sectionName.includes('BREAKING')) return 'destructive';
  return 'secondary';
};

export const ReleaseNotes: React.FC = () => {
  const [data, setData] = useState<ReleaseNotesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReleaseNotes();
  }, []);

  const fetchReleaseNotes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/release-notes.json');
      
      if (!response.ok) {
        throw new Error('Release notes não encontradas');
      }
      
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar release notes:', err);
      setError('Não foi possível carregar as release notes');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Release Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {error || 'Nenhuma release encontrada.'}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Execute <code className="bg-muted px-1 rounded">./scripts/generate-release-notes.sh</code> para gerar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Release Notes
        </CardTitle>
        {data.latest && (
          <Badge variant="outline" className="font-mono">
            {data.latest.version}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        {data.releases.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma release encontrada.</p>
        ) : (
          <>
            {/* Latest Release Summary */}
            {data.latest && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary">{data.latest.version}</Badge>
                  {data.latest.date && (
                    <span className="text-xs text-muted-foreground">{data.latest.date}</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  {Object.entries(data.latest.sections).slice(0, 2).map(([section, items]) => (
                    items.length > 0 && (
                      <div key={section} className="text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          {getSectionIcon(section)}
                          <span className="font-medium">{section.replace(/^[^\s]+\s/, '')}</span>
                        </div>
                        <ul className="pl-5 space-y-0.5">
                          {items.slice(0, 3).map((item, idx) => (
                            <li key={idx} className="text-muted-foreground text-xs">
                              {item.text}
                            </li>
                          ))}
                          {items.length > 3 && (
                            <li className="text-xs text-primary">+{items.length - 3} mais</li>
                          )}
                        </ul>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* View All Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Todas as Releases ({data.total})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Histórico de Releases
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-6">
                    {data.releases.map((release, idx) => (
                      <div key={idx} className="border-b border-border pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant={idx === 0 ? "default" : "secondary"} className="font-mono">
                            {release.version}
                          </Badge>
                          {release.date && (
                            <span className="text-sm text-muted-foreground">{release.date}</span>
                          )}
                          {idx === 0 && (
                            <Badge variant="outline" className="text-xs">Mais recente</Badge>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          {Object.entries(release.sections).map(([section, items]) => (
                            items.length > 0 && (
                              <div key={section}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  {getSectionIcon(section)}
                                  <span className="text-sm font-medium">{section}</span>
                                </div>
                                <ul className="pl-6 space-y-1">
                                  {items.map((item, itemIdx) => (
                                    <li key={itemIdx} className="text-sm text-muted-foreground">
                                      {item.text}
                                      {item.hash && (
                                        <code className="ml-2 text-xs bg-muted px-1 rounded opacity-60">
                                          {item.hash}
                                        </code>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <p className="text-xs text-muted-foreground mt-2 text-center">
              Atualizado em {new Date(data.generated_at).toLocaleString('pt-BR')}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ReleaseNotes;
