import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle, XCircle, Smartphone } from "lucide-react";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode: string | null;
  instanceName: string;
  onRefresh: () => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' | 'missing';
  loading: boolean;
}

export const QRCodeModal = ({
  open,
  onOpenChange,
  qrCode,
  instanceName,
  onRefresh,
  connectionStatus,
  loading
}: QRCodeModalProps) => {
  const [countdown, setCountdown] = useState(120);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open && connectionStatus === 'connecting') {
      setCountdown(120);
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            return 120;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [open, connectionStatus]);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [connectionStatus]);

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-success/10 text-success"><CheckCircle className="h-3 w-3 mr-1" />Conectado</Badge>;
      case 'connecting':
        return <Badge className="bg-warning/10 text-warning"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Aguardando scan</Badge>;
      case 'error':
        return <Badge className="bg-destructive/10 text-destructive"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      case 'missing':
        return <Badge className="bg-destructive/10 text-destructive"><XCircle className="h-3 w-3 mr-1" />Não Existe</Badge>;
      default:
        return <Badge variant="outline">Desconectado</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para conectar a instância <strong>{instanceName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {connectionStatus === 'connecting' && (
              <span className="text-xs text-muted-foreground">
                Expira em {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>

          {/* QR Code or Status Message */}
          {loading ? (
            <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : connectionStatus === 'connected' ? (
            <div className="w-64 h-64 flex flex-col items-center justify-center bg-success/10 rounded-lg">
              <CheckCircle className="h-16 w-16 text-success mb-2" />
              <p className="text-success font-medium">WhatsApp Conectado!</p>
            </div>
          ) : qrCode ? (
            <div className="p-4 bg-white rounded-lg">
              <img 
                src={qrCode} 
                alt="QR Code para WhatsApp" 
                className="w-56 h-56 object-contain"
              />
            </div>
          ) : (
            <div className="w-64 h-64 flex flex-col items-center justify-center bg-muted rounded-lg">
              <XCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                Não foi possível gerar o QR Code
              </p>
            </div>
          )}

          {/* Instructions */}
          {connectionStatus === 'connecting' && (
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>1. Abra o WhatsApp no seu celular</p>
              <p>2. Toque em <strong>Menu</strong> → <strong>Aparelhos conectados</strong></p>
              <p>3. Toque em <strong>Conectar um aparelho</strong></p>
              <p>4. Aponte a câmera para este QR Code</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {connectionStatus !== 'connected' && (
              <Button
                variant="outline"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar QR Code
              </Button>
            )}
            <Button
              variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
              onClick={() => onOpenChange(false)}
            >
              {connectionStatus === 'connected' ? 'Concluir' : 'Fechar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
