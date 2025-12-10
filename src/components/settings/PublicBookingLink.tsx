import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Link, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode,
  Share2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const PublicBookingLink = () => {
  const { selectedBarbershopId, barbershops } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const currentBarbershop = barbershops.find(b => b.id === selectedBarbershopId);
  
  // Generate the public booking URL
  const baseUrl = window.location.origin;
  const publicUrl = selectedBarbershopId 
    ? `${baseUrl}/agendar/${selectedBarbershopId}`
    : null;

  const handleCopy = async () => {
    if (!publicUrl) return;
    
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar link");
    }
  };

  const handleShare = async () => {
    if (!publicUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Agende seu horário - ${currentBarbershop?.name || 'Barbearia'}`,
          text: 'Agende seu horário online de forma rápida e fácil!',
          url: publicUrl,
        });
      } catch (err) {
        // User cancelled or error
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handleOpenLink = () => {
    if (publicUrl) {
      window.open(publicUrl, '_blank');
    }
  };

  // Generate QR Code URL using a free QR API
  const qrCodeUrl = publicUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`
    : null;

  if (!selectedBarbershopId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-muted-foreground">
          Selecione uma barbearia para ver o link de agendamento
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="barbershop-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Link className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Link Público de Agendamento</CardTitle>
              <CardDescription className="text-sm">
                Compartilhe este link para seus clientes agendarem online
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            Ativo
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Display */}
        <div className="flex gap-2">
          <Input 
            value={publicUrl || ''} 
            readOnly 
            className="font-mono text-sm bg-muted/50"
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="default" onClick={handleCopy} className="gap-2">
            <Copy className="h-4 w-4" />
            Copiar Link
          </Button>
          
          <Button variant="outline" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
          
          <Button variant="outline" onClick={handleOpenLink} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Abrir
          </Button>

          <Dialog open={showQR} onOpenChange={setShowQR}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <QrCode className="h-4 w-4" />
                QR Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>QR Code para Agendamento</DialogTitle>
                <DialogDescription>
                  Seus clientes podem escanear este código para acessar a página de agendamento
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                {qrCodeUrl && (
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code para agendamento"
                      className="w-48 h-48"
                    />
                  </div>
                )}
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  Imprima e coloque este QR Code em sua barbearia para facilitar o agendamento
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCopy} className="gap-2">
                    <Copy className="h-4 w-4" />
                    Copiar Link
                  </Button>
                  {qrCodeUrl && (
                    <Button variant="default" asChild className="gap-2">
                      <a href={qrCodeUrl} download="qrcode-agendamento.png">
                        Baixar QR Code
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tips */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Dica:</strong> Adicione este link no seu Instagram, WhatsApp Business, ou site para seus clientes agendarem a qualquer momento.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
