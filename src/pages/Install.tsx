import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Monitor, CheckCircle, Share, Plus, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl">App Instalado!</CardTitle>
            <CardDescription>
              O BarberSmart já está instalado no seu dispositivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Abrir App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/20 to-background px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-3xl font-bold shadow-lg">
            BS
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Instale o BarberSmart
          </h1>
          <p className="text-muted-foreground text-lg">
            Tenha acesso rápido ao sistema direto da tela inicial do seu dispositivo
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Benefícios do App</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Acesso Rápido</p>
                <p className="text-sm text-muted-foreground">
                  Abra o app direto da tela inicial, sem precisar do navegador
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Tela Cheia</p>
                <p className="text-sm text-muted-foreground">
                  Interface otimizada sem barras do navegador
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Funciona Offline</p>
                <p className="text-sm text-muted-foreground">
                  Acesse informações básicas mesmo sem internet
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Install Button (Android/Desktop) */}
        {deferredPrompt && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <Button onClick={handleInstall} size="lg" className="w-full gap-2">
                <Download className="h-5 w-5" />
                Instalar Agora
              </Button>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {isIOS && !deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Share className="h-5 w-5" />
                Como instalar no iPhone/iPad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                  1
                </div>
                <div>
                  <p className="text-foreground">
                    Toque no botão <Share className="h-4 w-4 inline mx-1" /> Compartilhar na barra inferior do Safari
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                  2
                </div>
                <div>
                  <p className="text-foreground">
                    Role para baixo e toque em <Plus className="h-4 w-4 inline mx-1" /> "Adicionar à Tela de Início"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                  3
                </div>
                <div>
                  <p className="text-foreground">
                    Toque em "Adicionar" no canto superior direito
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Manual Instructions */}
        {isAndroid && !deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MoreVertical className="h-5 w-5" />
                Como instalar no Android
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                  1
                </div>
                <div>
                  <p className="text-foreground">
                    Toque no menu <MoreVertical className="h-4 w-4 inline mx-1" /> do Chrome (3 pontos)
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                  2
                </div>
                <div>
                  <p className="text-foreground">
                    Toque em "Adicionar à tela inicial" ou "Instalar app"
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                  3
                </div>
                <div>
                  <p className="text-foreground">
                    Confirme tocando em "Adicionar" ou "Instalar"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Instructions */}
        {!isIOS && !isAndroid && !deferredPrompt && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como instalar no Desktop</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Procure pelo ícone de instalação <Download className="h-4 w-4 inline mx-1" /> na barra de endereços do navegador, ou acesse o menu do navegador e selecione "Instalar BarberSmart".
              </p>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <Button variant="outline" onClick={() => navigate('/')} className="w-full">
          Voltar para o App
        </Button>
      </div>
    </div>
  );
};

export default Install;
