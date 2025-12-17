import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Link, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode,
  Share2,
  Eye,
  CalendarCheck,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useSharedBarbershopId } from "@/hooks/useSharedBarbershopId";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BookingStats {
  total_visits: number;
  unique_visits: number;
  conversions: number;
  conversion_rate: number;
}

export const PublicBookingLink = () => {
  const { barbershops } = useAuth();
  const { matrizBarbershopId, allRelatedBarbershopIds, loading: loadingMatriz } = useSharedBarbershopId();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [subdomain, setSubdomain] = useState<string | null>(null);

  const currentBarbershop = barbershops.find(b => b.id === matrizBarbershopId);
  
  // Generate the public booking URL using subdomain or matriz ID
  const baseUrl = window.location.origin;
  const bookingSlug = subdomain || matrizBarbershopId;
  const publicUrl = bookingSlug 
    ? `${baseUrl}/agendar/${bookingSlug}`
    : null;

  // Fetch subdomain for matriz
  useEffect(() => {
    const fetchSubdomain = async () => {
      if (!matrizBarbershopId) return;
      
      const { data } = await supabase
        .from('barbershop_domains')
        .select('subdomain')
        .eq('barbershop_id', matrizBarbershopId)
        .eq('subdomain_status', 'active')
        .maybeSingle();
      
      if (data?.subdomain) {
        setSubdomain(data.subdomain);
      }
    };
    
    fetchSubdomain();
  }, [matrizBarbershopId]);

  // Fetch aggregated stats for all related barbershops (matriz + units)
  useEffect(() => {
    if (matrizBarbershopId && allRelatedBarbershopIds.length > 0) {
      fetchStats();
    }
  }, [matrizBarbershopId, allRelatedBarbershopIds]);

  const fetchStats = async () => {
    if (!matrizBarbershopId || allRelatedBarbershopIds.length === 0) return;
    
    setLoadingStats(true);
    try {
      // Fetch stats for all related barbershops (matriz + units)
      const { data: visitsData, error: visitsError } = await supabase
        .from('public_booking_visits')
        .select('id, visitor_ip, converted')
        .in('barbershop_id', allRelatedBarbershopIds)
        .gte('visited_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!visitsError && visitsData) {
        const total = visitsData.length;
        const unique = new Set(visitsData.map(v => v.visitor_ip)).size;
        const conversions = visitsData.filter(v => v.converted).length;
        
        setStats({
          total_visits: total,
          unique_visits: unique,
          conversions: conversions,
          conversion_rate: total > 0 ? Math.round((conversions / total) * 100 * 10) / 10 : 0
        });
      } else {
        setStats({
          total_visits: 0,
          unique_visits: 0,
          conversions: 0,
          conversion_rate: 0
        });
      }
    } catch (error) {
      console.log('Stats not available yet');
      setStats({
        total_visits: 0,
        unique_visits: 0,
        conversions: 0,
        conversion_rate: 0
      });
    } finally {
      setLoadingStats(false);
    }
  };

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

  const qrCodeUrl = publicUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`
    : null;

  if (loadingMatriz || !matrizBarbershopId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-muted-foreground">
          {loadingMatriz ? 'Carregando...' : 'Selecione uma barbearia para ver o link de agendamento'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="barbershop-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Link className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm sm:text-base font-semibold truncate">Link Público de Agendamento</CardTitle>
              <CardDescription className="text-xs sm:text-sm line-clamp-1">
                Compartilhe para clientes agendarem online
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 self-start sm:self-center shrink-0 text-xs">
            Ativo
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Eye className="h-3.5 w-3.5" />
              <span className="text-xs">Visitas</span>
            </div>
            {loadingStats ? (
              <Skeleton className="h-6 w-12 mx-auto" />
            ) : (
              <p className="text-lg sm:text-xl font-bold text-foreground">
                {stats?.total_visits || 0}
              </p>
            )}
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <CalendarCheck className="h-3.5 w-3.5" />
              <span className="text-xs">Agendamentos</span>
            </div>
            {loadingStats ? (
              <Skeleton className="h-6 w-12 mx-auto" />
            ) : (
              <p className="text-lg sm:text-xl font-bold text-success">
                {stats?.conversions || 0}
              </p>
            )}
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs">Conversão</span>
            </div>
            {loadingStats ? (
              <Skeleton className="h-6 w-12 mx-auto" />
            ) : (
              <p className="text-lg sm:text-xl font-bold text-primary">
                {stats?.conversion_rate || 0}%
              </p>
            )}
          </div>
          
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="text-xs">Únicos</span>
            </div>
            {loadingStats ? (
              <Skeleton className="h-6 w-12 mx-auto" />
            ) : (
              <p className="text-lg sm:text-xl font-bold text-foreground">
                {stats?.unique_visits || 0}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Estatísticas dos últimos 30 dias
        </p>

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
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <Button variant="default" onClick={handleCopy} size="sm" className="gap-1.5 text-xs sm:text-sm">
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Copiar</span> Link
          </Button>
          
          <Button variant="outline" onClick={handleShare} size="sm" className="gap-1.5 text-xs sm:text-sm">
            <Share2 className="h-3.5 w-3.5" />
            Compartilhar
          </Button>
          
          <Button variant="outline" onClick={handleOpenLink} size="sm" className="gap-1.5 text-xs sm:text-sm">
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir
          </Button>

          <Dialog open={showQR} onOpenChange={setShowQR}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm">
                <QrCode className="h-3.5 w-3.5" />
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
