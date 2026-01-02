import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CampaignDialog } from "@/components/dialogs/CampaignDialog";
import { CouponDialog } from "@/components/dialogs/CouponDialog";
import { FeatureGate } from "@/components/FeatureGate";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { 
  MessageSquare, 
  Plus, 
  Gift, 
  Star,
  Edit,
  Trash2,
  Users,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
}

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: string;
  discount_value: number;
  current_uses: number;
  max_uses: number | null;
  active: boolean;
  valid_until: string;
}

interface LoyaltyStats {
  totalClients: number;
  activeParticipants: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
}

const Marketing = () => {
  const { activeBarbershopIds } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loyaltyStats, setLoyaltyStats] = useState<LoyaltyStats>({
    totalClients: 0,
    activeParticipants: 0,
    totalPointsEarned: 0,
    totalPointsRedeemed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeBarbershopIds.length > 0) {
      fetchMarketingData();
    }
  }, [activeBarbershopIds]);

  const fetchMarketingData = async () => {
    try {
      setLoading(true);

      // Buscar campanhas
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name, type, status, created_at')
        .in('barbershop_id', activeBarbershopIds)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Buscar cupons
      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select('*')
        .in('barbershop_id', activeBarbershopIds)
        .order('created_at', { ascending: false });

      if (couponsError) throw couponsError;
      setCoupons(couponsData || []);

      // Buscar estatísticas de fidelidade
      const { data: loyaltyData, error: loyaltyError } = await supabase
        .from('loyalty_points')
        .select('points, total_earned, total_redeemed')
        .in('barbershop_id', activeBarbershopIds);

      if (loyaltyError) throw loyaltyError;

      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .in('barbershop_id', activeBarbershopIds)
        .eq('active', true);

      const stats = {
        totalClients: totalClients || 0,
        activeParticipants: loyaltyData?.length || 0,
        totalPointsEarned: loyaltyData?.reduce((sum, l) => sum + (l.total_earned || 0), 0) || 0,
        totalPointsRedeemed: loyaltyData?.reduce((sum, l) => sum + (l.total_redeemed || 0), 0) || 0
      };

      setLoyaltyStats(stats);

    } catch (error) {
      console.error('Erro ao buscar dados de marketing:', error);
      toast.error('Erro ao carregar dados de marketing');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Campanha excluída com sucesso!');
      fetchMarketingData();
    } catch (error: any) {
      console.error('Erro ao excluir campanha:', error);
      toast.error('Erro ao excluir campanha');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return;

    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Cupom excluído com sucesso!');
      fetchMarketingData();
    } catch (error: any) {
      console.error('Erro ao excluir cupom:', error);
      toast.error('Erro ao excluir cupom');
    }
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    }
    return `R$ ${coupon.discount_value.toFixed(2)} OFF`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Marketing</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Ferramentas para fidelizar e atrair clientes</p>
          </div>
        </div>

        {/* Loyalty Program Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="barbershop-card">
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-lg sm:text-2xl font-bold text-foreground">{loyaltyStats.totalClients}</div>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Clientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="barbershop-card">
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-success shrink-0" />
                <div className="min-w-0">
                  <div className="text-lg sm:text-2xl font-bold text-foreground">{loyaltyStats.activeParticipants}</div>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Participantes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-warning shrink-0" />
                <div className="min-w-0">
                  <div className="text-lg sm:text-2xl font-bold text-foreground truncate">{loyaltyStats.totalPointsEarned.toLocaleString()}</div>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Pontos Ganhos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex items-center space-x-2">
                <Gift className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-lg sm:text-2xl font-bold text-foreground">{coupons.filter(c => c.active).length}</div>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Cupons Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="campaigns" className="text-xs sm:text-sm py-2">Campanhas</TabsTrigger>
            <TabsTrigger value="coupons" className="text-xs sm:text-sm py-2">Cupons</TabsTrigger>
            <TabsTrigger value="loyalty" className="text-xs sm:text-sm py-2">Fidelidade</TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-lg sm:text-xl font-semibold">Campanhas de Marketing</h2>
              <CampaignDialog onSuccess={fetchMarketingData}>
                <Button variant="premium" className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Campanha
                </Button>
              </CampaignDialog>
            </div>

            <Card className="barbershop-card">
              <CardContent className="p-3 sm:pt-6 sm:p-6">
                {campaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground text-sm sm:text-base">Nenhuma campanha criada ainda</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Cards View */}
                    <div className="block md:hidden space-y-3">
                      {campaigns.map((campaign) => (
                        <div key={campaign.id} className="p-3 rounded-lg border border-border">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-medium text-sm truncate">{campaign.name}</p>
                            <Badge variant={campaign.status === 'ativa' ? 'default' : 'secondary'} className="text-xs shrink-0">
                              {campaign.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="capitalize">{campaign.type}</span>
                            <span>{new Date(campaign.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-border">
                            <CampaignDialog campaign={campaign} onSuccess={fetchMarketingData}>
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </CampaignDialog>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => handleDeleteCampaign(campaign.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Criada em</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {campaigns.map((campaign) => (
                            <TableRow key={campaign.id}>
                              <TableCell className="font-medium">{campaign.name}</TableCell>
                              <TableCell className="capitalize">{campaign.type}</TableCell>
                              <TableCell>
                                <Badge variant={campaign.status === 'ativa' ? 'default' : 'secondary'}>
                                  {campaign.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <CampaignDialog campaign={campaign} onSuccess={fetchMarketingData}>
                                    <Button variant="ghost" size="sm">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </CampaignDialog>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteCampaign(campaign.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-lg sm:text-xl font-semibold">Cupons de Desconto</h2>
              <CouponDialog onSuccess={fetchMarketingData}>
                <Button variant="premium" className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Cupom
                </Button>
              </CouponDialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.length === 0 ? (
                <Card className="barbershop-card col-span-full">
                  <CardContent className="pt-12 pb-12 text-center">
                    <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">Nenhum cupom criado ainda</p>
                  </CardContent>
                </Card>
              ) : (
                coupons.map((coupon) => (
                  <Card key={coupon.id} className="barbershop-card">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-lg font-mono">{coupon.code}</span>
                        <Badge variant={coupon.active ? 'default' : 'secondary'}>
                          {coupon.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-2xl font-bold text-primary">
                        {getDiscountDisplay(coupon)}
                      </div>
                      {coupon.description && (
                        <p className="text-sm text-muted-foreground">{coupon.description}</p>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Usos:</span>
                        <span className="font-medium">
                          {coupon.current_uses}/{coupon.max_uses || '∞'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Válido até:</span>
                        <span className="font-medium">
                          {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <CouponDialog coupon={coupon} onSuccess={fetchMarketingData}>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </CouponDialog>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteCoupon(coupon.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Loyalty Tab */}
          <TabsContent value="loyalty" className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">Programa de Fidelidade</h2>
            
            <Card className="barbershop-card">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Como Funciona
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">💰</div>
                    <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">Ganhe Pontos</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      1 ponto para cada R$ 1 gasto
                    </p>
                  </div>
                  
                  <div className="p-3 sm:p-4 bg-success/5 rounded-lg border border-success/20">
                    <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">🎁</div>
                    <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">Troque</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Pontos viram descontos
                    </p>
                  </div>
                  
                  <div className="p-3 sm:p-4 bg-warning/5 rounded-lg border border-warning/20">
                    <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">⭐</div>
                    <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">Automático</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Pontos ao concluir serviço
                    </p>
                  </div>
                </div>

                <div className="pt-3 sm:pt-4 border-t">
                  <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Estatísticas</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                      <div className="text-lg sm:text-2xl font-bold text-foreground">
                        {loyaltyStats.activeParticipants}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Participantes</p>
                    </div>
                    <div>
                      <div className="text-lg sm:text-2xl font-bold text-success truncate">
                        {loyaltyStats.totalPointsEarned.toLocaleString()}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Pts Ganhos</p>
                    </div>
                    <div>
                      <div className="text-lg sm:text-2xl font-bold text-warning truncate">
                        {loyaltyStats.totalPointsRedeemed.toLocaleString()}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Pts Resgatados</p>
                    </div>
                    <div>
                      <div className="text-lg sm:text-2xl font-bold text-primary">
                        {Math.round((loyaltyStats.activeParticipants / (loyaltyStats.totalClients || 1)) * 100)}%
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Adesão</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Marketing;
