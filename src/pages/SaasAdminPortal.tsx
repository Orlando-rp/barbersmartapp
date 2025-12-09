import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import SaasAdminLayout from "@/components/layout/SaasAdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  Send,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  Package,
  MessageSquare,
  TrendingUp,
  Calendar,
  Shield,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GlobalEvolutionConfig } from "@/components/saas/GlobalEvolutionConfig";
import { GlobalChatbotConfig } from "@/components/saas/GlobalChatbotConfig";
import { WhatsAppStatusPanel } from "@/components/saas/WhatsAppStatusPanel";
import { SocialAuthConfig } from "@/components/saas/SocialAuthConfig";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Tenant {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  subscription?: {
    plan_name: string;
    status: string;
    current_period_end: string;
  };
  usage?: {
    appointments_count: number;
    clients_count: number;
    staff_count: number;
    revenue: number;
  };
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  billing_period: string;
  max_staff: number;
  max_clients: number;
  max_appointments_month: number;
  features: string[];
  active: boolean;
}

interface SystemMessage {
  id: string;
  title: string;
  message: string;
  type: string;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const SaasAdminPortal = () => {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalRevenue: 0,
    trialTenants: 0,
  });

  // Dialogs
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [tenantDetailOpen, setTenantDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SystemMessage | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string } | null>(null);

  // Form states
  const [planForm, setPlanForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: 0,
    billing_period: 'monthly',
    max_staff: 5,
    max_clients: 100,
    max_appointments_month: 500,
    features: '',
    active: true,
  });

  const [messageForm, setMessageForm] = useState({
    title: '',
    message: '',
    type: 'info',
    published_at: '',
    expires_at: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userRole === 'super_admin') {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [userRole]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTenants(),
        fetchPlans(),
        fetchMessages(),
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do portal');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    const { data: barbershops, error } = await supabase
      .from('barbershops')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Buscar assinaturas e uso para cada tenant
    const tenantsWithDetails = await Promise.all(
      (barbershops || []).map(async (shop) => {
        // Assinatura
        const { data: sub } = await supabase
          .from('subscriptions')
          .select(`
            status,
            current_period_end,
            subscription_plans(name)
          `)
          .eq('barbershop_id', shop.id)
          .maybeSingle();

        // Uso atual
        const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
        const { data: usage } = await supabase
          .from('usage_metrics')
          .select('*')
          .eq('barbershop_id', shop.id)
          .eq('month', currentMonth)
          .maybeSingle();

        return {
          ...shop,
          subscription: sub ? {
            plan_name: (sub.subscription_plans as any)?.name || 'Free',
            status: sub.status,
            current_period_end: sub.current_period_end,
          } : undefined,
          usage: usage || undefined,
        };
      })
    );

    setTenants(tenantsWithDetails);

    // Calcular estatísticas
    const activeTenants = tenantsWithDetails.filter(t => t.active).length;
    const trialTenants = tenantsWithDetails.filter(t => t.subscription?.status === 'trial').length;
    const totalRevenue = tenantsWithDetails.reduce((sum, t) => sum + (t.usage?.revenue || 0), 0);

    setStats({
      totalTenants: tenantsWithDetails.length,
      activeTenants,
      trialTenants,
      totalRevenue,
    });
  };

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      console.log('Tabela de planos não existe ainda');
      return;
    }

    setPlans(data || []);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('system_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Tabela de mensagens não existe ainda');
      return;
    }

    setMessages(data || []);
  };

  const handleSavePlan = async () => {
    try {
      setSaving(true);

      const planData = {
        ...planForm,
        features: planForm.features.split('\n').filter(f => f.trim()),
      };

      if (selectedPlan) {
        const { error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', selectedPlan.id);
        if (error) throw error;
        toast.success('Plano atualizado');
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert(planData);
        if (error) throw error;
        toast.success('Plano criado');
      }

      setPlanDialogOpen(false);
      setSelectedPlan(null);
      fetchPlans();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMessage = async () => {
    try {
      setSaving(true);

      if (selectedMessage) {
        const { error } = await supabase
          .from('system_messages')
          .update(messageForm)
          .eq('id', selectedMessage.id);
        if (error) throw error;
        toast.success('Mensagem atualizada');
      } else {
        const { error } = await supabase
          .from('system_messages')
          .insert(messageForm);
        if (error) throw error;
        toast.success('Mensagem criada');
      }

      setMessageDialogOpen(false);
      setSelectedMessage(null);
      fetchMessages();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTenantStatus = async (tenant: Tenant) => {
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({ active: !tenant.active })
        .eq('id', tenant.id);

      if (error) throw error;
      toast.success(`Barbearia ${tenant.active ? 'desativada' : 'ativada'}`);
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const table = itemToDelete.type === 'plan' ? 'subscription_plans' : 'system_messages';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;
      toast.success('Removido com sucesso');
      
      if (itemToDelete.type === 'plan') fetchPlans();
      else fetchMessages();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const openPlanDialog = (plan?: Plan) => {
    if (plan) {
      setSelectedPlan(plan);
      setPlanForm({
        name: plan.name,
        slug: plan.slug,
        description: plan.description || '',
        price: plan.price,
        billing_period: plan.billing_period,
        max_staff: plan.max_staff,
        max_clients: plan.max_clients,
        max_appointments_month: plan.max_appointments_month,
        features: (plan.features || []).join('\n'),
        active: plan.active,
      });
    } else {
      setSelectedPlan(null);
      setPlanForm({
        name: '',
        slug: '',
        description: '',
        price: 0,
        billing_period: 'monthly',
        max_staff: 5,
        max_clients: 100,
        max_appointments_month: 500,
        features: '',
        active: true,
      });
    }
    setPlanDialogOpen(true);
  };

  const openMessageDialog = (msg?: SystemMessage) => {
    if (msg) {
      setSelectedMessage(msg);
      setMessageForm({
        title: msg.title,
        message: msg.message,
        type: msg.type,
        published_at: msg.published_at || '',
        expires_at: msg.expires_at || '',
      });
    } else {
      setSelectedMessage(null);
      setMessageForm({
        title: '',
        message: '',
        type: 'info',
        published_at: new Date().toISOString(),
        expires_at: '',
      });
    }
    setMessageDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Ativo</Badge>;
      case 'trial':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Trial</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>;
      case 'expired':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const planDistribution = plans.map(plan => ({
    name: plan.name,
    value: tenants.filter(t => t.subscription?.plan_name === plan.name).length,
  })).filter(p => p.value > 0);

  if (loading) {
    return (
      <SaasAdminLayout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </SaasAdminLayout>
    );
  }

  if (userRole !== 'super_admin') {
    return (
      <SaasAdminLayout>
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <Shield className="h-16 w-16 text-slate-600 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-slate-400 max-w-md">
            Este portal é exclusivo para administradores do sistema (Super Admin).
          </p>
        </div>
      </SaasAdminLayout>
    );
  }

  return (
    <SaasAdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="p-4 md:p-6 space-y-6 bg-slate-950 min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-2 md:gap-3">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-amber-500" />
              <span className="hidden sm:inline">Portal de Administração SaaS</span>
              <span className="sm:hidden">Admin SaaS</span>
            </h1>
            <p className="text-slate-400 text-sm md:text-base mt-1">
              Gerencie tenants, planos e monitore o uso do sistema
            </p>
          </div>
          <Button variant="outline" onClick={fetchAllData} className="border-slate-700 text-slate-300 hover:bg-slate-800 w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total de Tenants</p>
                  <p className="text-2xl font-bold text-white">{stats.totalTenants}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Tenants Ativos</p>
                  <p className="text-2xl font-bold text-emerald-500">{stats.activeTenants}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Em Trial</p>
                  <p className="text-2xl font-bold text-amber-500">{stats.trialTenants}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Receita Total (Mês)</p>
                  <p className="text-2xl font-bold text-emerald-500">
                    R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs - Hidden on mobile since sidebar handles navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900 border border-slate-800 hidden md:flex flex-wrap gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-300">
              <BarChart3 className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="tenants" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-300">
              <Building2 className="h-4 w-4 mr-2" />
              Barbearias
            </TabsTrigger>
            <TabsTrigger value="plans" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-300">
              <Package className="h-4 w-4 mr-2" />
              Planos
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-300">
              <MessageSquare className="h-4 w-4 mr-2" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="integrations" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-300">
              <Smartphone className="h-4 w-4 mr-2" />
              Integrações
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Plan Distribution Chart */}
              {planDistribution.length > 0 && (
                <Card className="bg-slate-900 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">Distribuição por Plano</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={planDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {planDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Recent Tenants */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Barbearias Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tenants.slice(0, 5).map((tenant) => (
                      <div key={tenant.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{tenant.name}</p>
                          <p className="text-sm text-slate-400">
                            {format(new Date(tenant.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge className={tenant.active ? "bg-emerald-500" : "bg-slate-600"}>
                          {tenant.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    ))}
                    {tenants.length === 0 && (
                      <p className="text-slate-400 text-center py-4">Nenhuma barbearia cadastrada</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tenants Tab */}
          <TabsContent value="tenants">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Barbearias Cadastradas</CardTitle>
                <CardDescription className="text-slate-400">{tenants.length} tenants no sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-slate-800 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-slate-800/50">
                        <TableHead className="text-slate-300">Barbearia</TableHead>
                        <TableHead className="text-slate-300">Plano</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Agendamentos</TableHead>
                        <TableHead className="text-slate-300">Clientes</TableHead>
                        <TableHead className="text-slate-300">Receita</TableHead>
                        <TableHead className="text-slate-300">Criado em</TableHead>
                        <TableHead className="text-right text-slate-300">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants.map((tenant) => (
                        <TableRow key={tenant.id} className="border-slate-800 hover:bg-slate-800/50">
                          <TableCell className="text-white">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-amber-500" />
                              <span className="font-medium">{tenant.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-slate-700 text-slate-200">
                              {tenant.subscription?.plan_name || 'Free'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tenant.subscription 
                              ? getStatusBadge(tenant.subscription.status)
                              : <Badge variant="outline" className="border-slate-600 text-slate-400">Sem assinatura</Badge>
                            }
                          </TableCell>
                          <TableCell className="text-slate-300">{tenant.usage?.appointments_count || 0}</TableCell>
                          <TableCell className="text-slate-300">{tenant.usage?.clients_count || 0}</TableCell>
                          <TableCell className="text-emerald-500">
                            R$ {(tenant.usage?.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {format(new Date(tenant.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-white hover:bg-slate-800"
                                onClick={() => {
                                  setSelectedTenant(tenant);
                                  setTenantDetailOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-slate-800"
                                onClick={() => handleToggleTenantStatus(tenant)}
                              >
                                {tenant.active ? (
                                  <XCircle className="h-4 w-4 text-orange-500" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white">Planos de Assinatura</CardTitle>
                  <CardDescription className="text-slate-400">Gerencie os planos disponíveis</CardDescription>
                </div>
                <Button onClick={() => openPlanDialog()} className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Plano
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {plans.map((plan) => (
                    <Card key={plan.id} className={`relative bg-slate-800 border-slate-700 ${!plan.active ? 'opacity-60' : ''}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg text-white">{plan.name}</CardTitle>
                          {!plan.active && (
                            <Badge className="bg-slate-600 text-slate-300">Inativo</Badge>
                          )}
                        </div>
                        <CardDescription className="text-slate-400">{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-amber-500 mb-4">
                          R$ {plan.price.toFixed(2)}
                          <span className="text-sm text-slate-400 font-normal">
                            /{plan.billing_period === 'monthly' ? 'mês' : 'ano'}
                          </span>
                        </p>
                        <div className="space-y-2 text-sm text-slate-300">
                          <p>👥 {plan.max_staff} profissionais</p>
                          <p>📋 {plan.max_clients} clientes</p>
                          <p>📅 {plan.max_appointments_month} agend./mês</p>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                            onClick={() => openPlanDialog(plan)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 hover:bg-red-500/20"
                            onClick={() => {
                              setItemToDelete({ type: 'plan', id: plan.id });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white">Mensagens do Sistema</CardTitle>
                  <CardDescription className="text-slate-400">Envie comunicados para os tenants</CardDescription>
                </div>
                <Button onClick={() => openMessageDialog()} className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Mensagem
                </Button>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    Nenhuma mensagem cadastrada
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className="p-4 rounded-lg border border-slate-700 bg-slate-800/50">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={
                                msg.type === 'warning' ? 'bg-orange-500' :
                                msg.type === 'alert' ? 'bg-red-500' :
                                msg.type === 'update' ? 'bg-blue-500' : 'bg-slate-600'
                              }>
                                {msg.type}
                              </Badge>
                              <span className="font-semibold text-white">{msg.title}</span>
                            </div>
                            <p className="text-sm text-slate-400">{msg.message}</p>
                            <p className="text-xs text-slate-500 mt-2">
                              Publicado: {msg.published_at ? format(new Date(msg.published_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'Não publicado'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => openMessageDialog(msg)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:bg-red-500/20" onClick={() => {
                              setItemToDelete({ type: 'message', id: msg.id });
                              setDeleteDialogOpen(true);
                            }}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <div className="space-y-8">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                <Smartphone className="h-5 w-5 text-amber-500" />
                WhatsApp Evolution API
              </h2>
              <GlobalEvolutionConfig />
              <WhatsAppStatusPanel />
              
              <div className="border-t border-slate-800 pt-8">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                  🤖 Chatbot IA (OpenAI)
                </h2>
                <GlobalChatbotConfig />
              </div>

              <div className="border-t border-slate-800 pt-8">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                  🔐 Login Social (OAuth)
                </h2>
                <SocialAuthConfig />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Plan Dialog */}
        <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={planForm.slug} onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço (R$)</Label>
                  <Input type="number" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select value={planForm.billing_period} onValueChange={(v) => setPlanForm({ ...planForm, billing_period: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Max Staff</Label>
                  <Input type="number" value={planForm.max_staff} onChange={(e) => setPlanForm({ ...planForm, max_staff: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Max Clientes</Label>
                  <Input type="number" value={planForm.max_clients} onChange={(e) => setPlanForm({ ...planForm, max_clients: parseInt(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Max Agend.</Label>
                  <Input type="number" value={planForm.max_appointments_month} onChange={(e) => setPlanForm({ ...planForm, max_appointments_month: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Recursos (um por linha)</Label>
                <Textarea rows={4} value={planForm.features} onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })} placeholder="Agendamento online&#10;Notificações WhatsApp&#10;Relatórios" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={planForm.active} onCheckedChange={(v) => setPlanForm({ ...planForm, active: v })} />
                <Label>Plano Ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSavePlan} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Message Dialog */}
        <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedMessage ? 'Editar Mensagem' : 'Nova Mensagem'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={messageForm.title} onChange={(e) => setMessageForm({ ...messageForm, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea rows={4} value={messageForm.message} onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={messageForm.type} onValueChange={(v) => setMessageForm({ ...messageForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informação</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
                    <SelectItem value="alert">Alerta</SelectItem>
                    <SelectItem value="update">Atualização</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveMessage} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tenant Detail Dialog */}
        <Dialog open={tenantDetailOpen} onOpenChange={setTenantDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {selectedTenant?.name}
              </DialogTitle>
            </DialogHeader>
            {selectedTenant && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-medium">{selectedTenant.active ? 'Ativo' : 'Inativo'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Plano</p>
                    <p className="font-medium">{selectedTenant.subscription?.plan_name || 'Free'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Agendamentos</p>
                    <p className="font-medium">{selectedTenant.usage?.appointments_count || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Clientes</p>
                    <p className="font-medium">{selectedTenant.usage?.clients_count || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Profissionais</p>
                    <p className="font-medium">{selectedTenant.usage?.staff_count || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Receita (Mês)</p>
                    <p className="font-medium">R$ {(selectedTenant.usage?.revenue || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Criado em</p>
                  <p className="font-medium">{format(new Date(selectedTenant.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SaasAdminLayout>
  );
};

export default SaasAdminPortal;
