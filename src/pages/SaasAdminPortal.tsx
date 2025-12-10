import React, { useEffect, useState } from "react";
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
  Globe,
  ChevronDown,
  ChevronRight,
  MapPin,
  Link,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GlobalEvolutionConfig } from "@/components/saas/GlobalEvolutionConfig";
import { GlobalChatbotConfig } from "@/components/saas/GlobalChatbotConfig";
import { WhatsAppStatusPanel } from "@/components/saas/WhatsAppStatusPanel";
import { SocialAuthConfig } from "@/components/saas/SocialAuthConfig";
import { BrandingConfig } from "@/components/saas/BrandingConfig";
import DomainsManagement from "@/components/saas/DomainsManagement";
import { PlanFeaturesSelector, defaultPlanFeatures, featuresToStringArray, stringArrayToFeatures, type PlanFeatures } from "@/components/saas/PlanFeaturesSelector";
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
  parent_id?: string | null;
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
  units?: Tenant[]; // Unidades filhas
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
  feature_flags?: PlanFeatures;
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
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());
  const [linkUnitDialogOpen, setLinkUnitDialogOpen] = useState(false);
  const [allBarbershops, setAllBarbershops] = useState<{id: string; name: string; parent_id: string | null}[]>([]);
  const [linkForm, setLinkForm] = useState({ unitId: '', parentId: '' });
  const [savingLink, setSavingLink] = useState(false);

  // Dialogs
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [tenantDetailOpen, setTenantDetailOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SystemMessage | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string } | null>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({
    planId: '',
    status: 'active',
    validUntil: '',
  });
  const [savingSubscription, setSavingSubscription] = useState(false);

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
    feature_flags: defaultPlanFeatures as PlanFeatures,
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

    // Guardar lista completa para o modal de vinculação
    setAllBarbershops((barbershops || []).map(b => ({ id: b.id, name: b.name, parent_id: b.parent_id })));

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

    // Separar matrizes (sem parent_id) das unidades (com parent_id)
    const headquarters = tenantsWithDetails.filter(t => !t.parent_id);
    const units = tenantsWithDetails.filter(t => t.parent_id);

    // Associar unidades às suas matrizes
    const tenantsHierarchy = headquarters.map(hq => ({
      ...hq,
      units: units.filter(u => u.parent_id === hq.id),
    }));

    // Adicionar barbearias órfãs (unidades sem matriz válida) como matrizes temporárias
    const orphanUnits = units.filter(u => !headquarters.find(hq => hq.id === u.parent_id));
    orphanUnits.forEach(orphan => {
      tenantsHierarchy.push({ ...orphan, units: [] });
    });

    setTenants(tenantsHierarchy);

    // Calcular estatísticas (apenas matrizes reais)
    const activeTenants = headquarters.filter(t => t.active).length;
    const trialTenants = headquarters.filter(t => t.subscription?.status === 'trial').length;
    const totalRevenue = tenantsWithDetails.reduce((sum, t) => sum + (t.usage?.revenue || 0), 0);

    setStats({
      totalTenants: headquarters.length,
      activeTenants,
      trialTenants,
      totalRevenue,
    });
  };

  // Função para detectar ciclos na hierarquia
  const detectCycle = (unitId: string, proposedParentId: string): boolean => {
    if (!proposedParentId) return false;
    if (unitId === proposedParentId) return true;
    
    // Verificar se a unidade selecionada é ancestral do parent proposto
    let currentId: string | null = proposedParentId;
    const visited = new Set<string>();
    
    while (currentId) {
      if (visited.has(currentId)) return true; // Ciclo detectado
      if (currentId === unitId) return true; // A unidade é ancestral do parent
      visited.add(currentId);
      
      const parent = allBarbershops.find(b => b.id === currentId);
      currentId = parent?.parent_id || null;
    }
    
    // Verificar se alguma unidade filha da barbearia selecionada é o parent proposto
    const getDescendants = (id: string): string[] => {
      const children = allBarbershops.filter(b => b.parent_id === id);
      let descendants: string[] = children.map(c => c.id);
      children.forEach(child => {
        descendants = [...descendants, ...getDescendants(child.id)];
      });
      return descendants;
    };
    
    const descendants = getDescendants(unitId);
    if (descendants.includes(proposedParentId)) return true;
    
    return false;
  };

  const handleLinkUnit = async () => {
    if (!linkForm.unitId) {
      toast.error("Selecione uma barbearia para vincular");
      return;
    }
    
    // Validação de ciclo
    if (linkForm.parentId && detectCycle(linkForm.unitId, linkForm.parentId)) {
      toast.error("Não é possível criar este vínculo: causaria um ciclo na hierarquia!");
      return;
    }
    
    try {
      setSavingLink(true);
      
      const { error } = await supabase
        .from('barbershops')
        .update({ parent_id: linkForm.parentId || null })
        .eq('id', linkForm.unitId);

      if (error) throw error;
      
      toast.success(linkForm.parentId ? "Unidade vinculada à matriz!" : "Barbearia definida como matriz!");
      setLinkUnitDialogOpen(false);
      setLinkForm({ unitId: '', parentId: '' });
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingLink(false);
    }
  };

  const openSubscriptionDialog = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    
    // Buscar assinatura atual
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*, subscription_plans(id)')
      .eq('barbershop_id', tenant.id)
      .maybeSingle();
    
    if (subscription) {
      setSubscriptionForm({
        planId: (subscription.subscription_plans as any)?.id || '',
        status: subscription.status || 'active',
        validUntil: subscription.current_period_end ? subscription.current_period_end.split('T')[0] : '',
      });
    } else {
      // Nova assinatura
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setSubscriptionForm({
        planId: plans[0]?.id || '',
        status: 'active',
        validUntil: nextMonth.toISOString().split('T')[0],
      });
    }
    
    setSubscriptionDialogOpen(true);
  };

  const handleSaveSubscription = async () => {
    if (!selectedTenant || !subscriptionForm.planId) {
      toast.error("Selecione um plano");
      return;
    }
    
    try {
      setSavingSubscription(true);
      
      // Verificar se já existe assinatura
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('barbershop_id', selectedTenant.id)
        .maybeSingle();
      
      const subscriptionData = {
        barbershop_id: selectedTenant.id,
        plan_id: subscriptionForm.planId,
        status: subscriptionForm.status,
        current_period_start: new Date().toISOString(),
        current_period_end: subscriptionForm.validUntil ? new Date(subscriptionForm.validUntil).toISOString() : null,
      };
      
      if (existing) {
        const { error } = await supabase
          .from('subscriptions')
          .update(subscriptionData)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subscriptions')
          .insert(subscriptionData);
        if (error) throw error;
      }
      
      toast.success("Assinatura atualizada com sucesso!");
      setSubscriptionDialogOpen(false);
      fetchTenants();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingSubscription(false);
    }
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
        feature_flags: planForm.feature_flags,
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
        feature_flags: plan.feature_flags || stringArrayToFeatures(plan.features || []),
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
        feature_flags: defaultPlanFeatures,
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

  const toggleExpandTenant = (tenantId: string) => {
    setExpandedTenants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tenantId)) {
        newSet.delete(tenantId);
      } else {
        newSet.add(tenantId);
      }
      return newSet;
    });
  };

  // Calcular métricas consolidadas (matriz + unidades)
  const getConsolidatedMetrics = (tenant: Tenant) => {
    const matrizAppointments = tenant.usage?.appointments_count || 0;
    const matrizClients = tenant.usage?.clients_count || 0;
    const matrizRevenue = tenant.usage?.revenue || 0;
    
    const unitsAppointments = tenant.units?.reduce((sum, u) => sum + (u.usage?.appointments_count || 0), 0) || 0;
    const unitsClients = tenant.units?.reduce((sum, u) => sum + (u.usage?.clients_count || 0), 0) || 0;
    const unitsRevenue = tenant.units?.reduce((sum, u) => sum + (u.usage?.revenue || 0), 0) || 0;
    
    return {
      appointments: matrizAppointments + unitsAppointments,
      clients: matrizClients + unitsClients,
      revenue: matrizRevenue + unitsRevenue,
      hasUnits: (tenant.units?.length || 0) > 0,
    };
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
          <Shield className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground max-w-md">
            Este portal é exclusivo para administradores do sistema (Super Admin).
          </p>
        </div>
      </SaasAdminLayout>
    );
  }

  return (
    <SaasAdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="p-4 md:p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 md:gap-3">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-warning" />
              <span className="hidden sm:inline">Portal de Administração SaaS</span>
              <span className="sm:hidden">Admin SaaS</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mt-1">
              Gerencie tenants, planos e monitore o uso do sistema
            </p>
          </div>
          <Button variant="outline" onClick={fetchAllData} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{stats.totalTenants}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Tenants</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-success">{stats.activeTenants}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-warning">{stats.trialTenants}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Trial</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:pt-6 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold text-success truncate">
                    R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Receita</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs - Hidden on mobile since sidebar handles navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden md:flex flex-wrap gap-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-warning data-[state=active]:text-warning-foreground">
              <BarChart3 className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="tenants" className="data-[state=active]:bg-warning data-[state=active]:text-warning-foreground">
              <Building2 className="h-4 w-4 mr-2" />
              Barbearias
            </TabsTrigger>
            <TabsTrigger value="plans" className="data-[state=active]:bg-warning data-[state=active]:text-warning-foreground">
              <Package className="h-4 w-4 mr-2" />
              Planos
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-warning data-[state=active]:text-warning-foreground">
              <MessageSquare className="h-4 w-4 mr-2" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="branding" className="data-[state=active]:bg-warning data-[state=active]:text-warning-foreground">
              <Settings className="h-4 w-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="integrations" className="data-[state=active]:bg-warning data-[state=active]:text-warning-foreground">
              <Smartphone className="h-4 w-4 mr-2" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="domains" className="data-[state=active]:bg-warning data-[state=active]:text-warning-foreground">
              <Globe className="h-4 w-4 mr-2" />
              Domínios
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              {/* Plan Distribution Chart */}
              {planDistribution.length > 0 && (
                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base">Distribuição por Plano</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6 pt-0">
                    <div className="h-[200px] sm:h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={planDistribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {planDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Tenants */}
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-sm sm:text-base">Barbearias Recentes</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="space-y-2 sm:space-y-3">
                    {tenants.slice(0, 5).map((tenant) => (
                      <div key={tenant.id} className="flex items-center justify-between p-2 sm:p-3 bg-muted rounded-lg gap-2">
                        <div className="min-w-0">
                          <p className="text-foreground font-medium text-sm truncate">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(tenant.created_at), "dd/MM/yy", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge className={`shrink-0 text-xs ${tenant.active ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}>
                          {tenant.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    ))}
                    {tenants.length === 0 && (
                      <p className="text-muted-foreground text-center py-4 text-sm">Nenhuma barbearia</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tenants Tab */}
          <TabsContent value="tenants">
            <Card>
              <CardHeader className="p-3 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm sm:text-base">Barbearias Cadastradas</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {tenants.length} barbearias (matrizes) • {tenants.reduce((sum, t) => sum + (t.units?.length || 0), 0)} unidades
                  </CardDescription>
                </div>
                <Button onClick={() => setLinkUnitDialogOpen(true)} variant="outline" className="w-full sm:w-auto">
                  <Link className="h-4 w-4 mr-2" />
                  Gerenciar Hierarquia
                </Button>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {tenants.map((tenant) => {
                    const consolidated = getConsolidatedMetrics(tenant);
                    return (
                    <div key={tenant.id} className="border rounded-lg overflow-hidden">
                      {/* Matriz */}
                      <div className="p-3 space-y-2 bg-card">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {(tenant.units?.length || 0) > 0 && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 shrink-0" 
                                onClick={() => toggleExpandTenant(tenant.id)}
                              >
                                {expandedTenants.has(tenant.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Building2 className="h-4 w-4 text-warning shrink-0" />
                            <span className="font-medium text-sm truncate">{tenant.name}</span>
                            {(tenant.units?.length || 0) > 0 && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {tenant.units?.length} unidade{tenant.units?.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedTenant(tenant); setTenantDetailOpen(true); }}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openSubscriptionDialog(tenant)} title="Gerenciar plano">
                              <CreditCard className="h-3 w-3 text-warning" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleTenantStatus(tenant)}>
                              {tenant.active ? <XCircle className="h-3 w-3 text-destructive" /> : <CheckCircle className="h-3 w-3 text-success" />}
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="text-xs">{tenant.subscription?.plan_name || 'Free'}</Badge>
                          {tenant.subscription ? getStatusBadge(tenant.subscription.status) : <Badge variant="outline" className="text-xs">Sem assin.</Badge>}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Agend.{consolidated.hasUnits && ' (total)'}</p>
                            <p className="font-medium">{consolidated.appointments}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Clientes{consolidated.hasUnits && ' (total)'}</p>
                            <p className="font-medium">{consolidated.clients}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Receita{consolidated.hasUnits && ' (total)'}</p>
                            <p className="font-medium text-success">R$ {consolidated.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                          </div>
                        </div>
                      </div>
                      {/* Unidades */}
                      {expandedTenants.has(tenant.id) && tenant.units && tenant.units.length > 0 && (
                        <div className="border-t bg-muted/30">
                          {tenant.units.map((unit) => (
                            <div key={unit.id} className="p-3 pl-8 border-b last:border-b-0 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className="text-sm truncate">{unit.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSelectedTenant(unit); setTenantDetailOpen(true); }}>
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleTenantStatus(unit)}>
                                    {unit.active ? <XCircle className="h-3 w-3 text-warning" /> : <CheckCircle className="h-3 w-3 text-success" />}
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Agend.</p>
                                  <p className="font-medium">{unit.usage?.appointments_count || 0}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Clientes</p>
                                  <p className="font-medium">{unit.usage?.clients_count || 0}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Receita</p>
                                  <p className="font-medium text-success">R$ {(unit.usage?.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Barbearia</TableHead>
                        <TableHead>Unidades</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Agend.</TableHead>
                        <TableHead>Clientes</TableHead>
                        <TableHead>Receita</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants.map((tenant) => {
                        const consolidated = getConsolidatedMetrics(tenant);
                        return (
                        <React.Fragment key={tenant.id}>
                          {/* Linha da Matriz */}
                          <TableRow className="bg-card">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {(tenant.units?.length || 0) > 0 ? (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6" 
                                    onClick={() => toggleExpandTenant(tenant.id)}
                                  >
                                    {expandedTenants.has(tenant.id) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                ) : (
                                  <div className="w-6" />
                                )}
                                <Building2 className="h-4 w-4 text-warning" />
                                <span className="font-medium">{tenant.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {tenant.units?.length || 0} unidade{(tenant.units?.length || 0) !== 1 ? 's' : ''}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{tenant.subscription?.plan_name || 'Free'}</Badge>
                            </TableCell>
                            <TableCell>
                              {tenant.subscription ? getStatusBadge(tenant.subscription.status) : <Badge variant="outline">Sem assinatura</Badge>}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{consolidated.appointments}</span>
                                {consolidated.hasUnits && (
                                  <span className="text-xs text-muted-foreground">consolidado</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{consolidated.clients}</span>
                                {consolidated.hasUnits && (
                                  <span className="text-xs text-muted-foreground">consolidado</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-success">
                              <div className="flex flex-col">
                                <span className="font-medium">R$ {consolidated.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                                {consolidated.hasUnits && (
                                  <span className="text-xs text-muted-foreground">consolidado</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedTenant(tenant); setTenantDetailOpen(true); }} title="Ver detalhes">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openSubscriptionDialog(tenant)} title="Gerenciar plano">
                                  <CreditCard className="h-4 w-4 text-warning" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleToggleTenantStatus(tenant)} title={tenant.active ? 'Desativar' : 'Ativar'}>
                                  {tenant.active ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-success" />}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {/* Linhas das Unidades */}
                          {expandedTenants.has(tenant.id) && tenant.units?.map((unit) => (
                            <TableRow key={unit.id} className="bg-muted/30">
                              <TableCell>
                                <div className="flex items-center gap-2 pl-8">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">{unit.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">Unidade</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground">—</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={unit.active ? "secondary" : "outline"} className="text-xs">
                                  {unit.active ? 'Ativa' : 'Inativa'}
                                </Badge>
                              </TableCell>
                              <TableCell>{unit.usage?.appointments_count || 0}</TableCell>
                              <TableCell>{unit.usage?.clients_count || 0}</TableCell>
                              <TableCell className="text-success">R$ {(unit.usage?.revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => { setSelectedTenant(unit); setTenantDetailOpen(true); }}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleToggleTenantStatus(unit)}>
                                    {unit.active ? <XCircle className="h-4 w-4 text-warning" /> : <CheckCircle className="h-4 w-4 text-success" />}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <Card>
              <CardHeader className="p-3 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm sm:text-base">Planos de Assinatura</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Gerencie os planos disponíveis</CardDescription>
                </div>
                <Button onClick={() => openPlanDialog()} className="bg-warning hover:bg-warning/90 text-warning-foreground w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Plano
                </Button>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {plans.map((plan) => (
                    <Card key={plan.id} className={`relative ${!plan.active ? 'opacity-60' : ''}`}>
                      <CardHeader className="p-3 sm:p-6">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm sm:text-lg">{plan.name}</CardTitle>
                          {!plan.active && <Badge variant="secondary" className="text-xs">Inativo</Badge>}
                        </div>
                        <CardDescription className="text-xs sm:text-sm">{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 pt-0">
                        <p className="text-xl sm:text-3xl font-bold text-warning mb-3 sm:mb-4">
                          R$ {plan.price.toFixed(0)}
                          <span className="text-xs sm:text-sm text-muted-foreground font-normal">
                            /{plan.billing_period === 'monthly' ? 'mês' : 'ano'}
                          </span>
                        </p>
                        <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                          <p>👥 {plan.max_staff} profissionais</p>
                          <p>📋 {plan.max_clients} clientes</p>
                          <p>📅 {plan.max_appointments_month} agend./mês</p>
                        </div>
                        <div className="flex gap-2 mt-3 sm:mt-4">
                          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openPlanDialog(plan)}>
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" className="hover:bg-destructive/20" onClick={() => { setItemToDelete({ type: 'plan', id: plan.id }); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
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
            <Card>
              <CardHeader className="p-3 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm sm:text-base">Mensagens do Sistema</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Envie comunicados para os tenants</CardDescription>
                </div>
                <Button onClick={() => openMessageDialog()} className="bg-warning hover:bg-warning/90 text-warning-foreground w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Mensagem
                </Button>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                {messages.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm">
                    Nenhuma mensagem cadastrada
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className="p-3 sm:p-4 rounded-lg border bg-muted/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
                              <Badge variant={
                                msg.type === 'warning' ? 'default' :
                                msg.type === 'alert' ? 'destructive' :
                                msg.type === 'update' ? 'secondary' : 'outline'
                              } className={`text-xs ${
                                msg.type === 'warning' ? 'bg-warning text-warning-foreground' :
                                msg.type === 'update' ? 'bg-primary text-primary-foreground' : ''
                              }`}>
                                {msg.type}
                              </Badge>
                              <span className="font-semibold text-foreground text-sm truncate">{msg.title}</span>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{msg.message}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-1 sm:mt-2">
                              {msg.published_at ? format(new Date(msg.published_at), "dd/MM/yy HH:mm", { locale: ptBR }) : 'Não publicado'}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => openMessageDialog(msg)}>
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-destructive/20" onClick={() => { setItemToDelete({ type: 'message', id: msg.id }); setDeleteDialogOpen(true); }}>
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
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

          {/* Branding Tab */}
          <TabsContent value="branding">
            <BrandingConfig />
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <div className="space-y-6 sm:space-y-8">
              <h2 className="text-base sm:text-xl font-semibold text-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                WhatsApp Evolution API
              </h2>
              <GlobalEvolutionConfig />
              <WhatsAppStatusPanel />
              
              <div className="border-t border-border pt-6 sm:pt-8">
                <h2 className="text-base sm:text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                  🤖 Chatbot IA (OpenAI)
                </h2>
                <GlobalChatbotConfig />
              </div>

              <div className="border-t border-border pt-6 sm:pt-8">
                <h2 className="text-base sm:text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                  🔐 Login Social (OAuth)
                </h2>
                <SocialAuthConfig />
              </div>
            </div>
          </TabsContent>

          {/* Domains Tab */}
          <TabsContent value="domains">
            <DomainsManagement />
          </TabsContent>
        </Tabs>

        {/* Plan Dialog */}
        <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
              <DialogDescription>Configure os limites e funcionalidades do plano</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground border-b pb-2">Informações Básicas</h3>
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
              </div>

              {/* Limits */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground border-b pb-2">Limites</h3>
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
                    <Label>Max Agend./mês</Label>
                    <Input type="number" value={planForm.max_appointments_month} onChange={(e) => setPlanForm({ ...planForm, max_appointments_month: parseInt(e.target.value) })} />
                  </div>
                </div>
              </div>

              {/* Features Selector */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-foreground border-b pb-2">Funcionalidades Incluídas</h3>
                <PlanFeaturesSelector 
                  features={planForm.feature_flags} 
                  onChange={(features) => setPlanForm({ ...planForm, feature_flags: features })} 
                />
              </div>

              {/* Legacy Features Text (optional) */}
              <div className="space-y-2">
                <Label>Recursos Adicionais (texto livre)</Label>
                <Textarea 
                  rows={2} 
                  value={planForm.features} 
                  onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })} 
                  placeholder="Outros recursos personalizados (um por linha)"
                  className="text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={planForm.active} onCheckedChange={(v) => setPlanForm({ ...planForm, active: v })} />
                <Label>Plano Ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSavePlan} disabled={saving} className="bg-warning hover:bg-warning/90 text-warning-foreground">
                {saving ? 'Salvando...' : 'Salvar'}
              </Button>
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
                {selectedTenant?.parent_id ? (
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Building2 className="h-5 w-5 text-warning" />
                )}
                {selectedTenant?.name}
                {selectedTenant?.parent_id && (
                  <Badge variant="outline" className="text-xs">Unidade</Badge>
                )}
                {!selectedTenant?.parent_id && selectedTenant?.units && selectedTenant.units.length > 0 && (
                  <Badge variant="secondary" className="text-xs">Matriz</Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedTenant && (
              <div className="space-y-4 py-4">
                {/* Tipo */}
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-medium">
                    {selectedTenant.parent_id ? 'Unidade (Filial)' : 'Barbearia (Matriz)'}
                  </p>
                </div>
                
                {/* Unidades (se matriz) */}
                {!selectedTenant.parent_id && selectedTenant.units && selectedTenant.units.length > 0 && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-2">Unidades ({selectedTenant.units.length})</p>
                    <div className="space-y-1">
                      {selectedTenant.units.map(unit => (
                        <div key={unit.id} className="flex items-center gap-2 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{unit.name}</span>
                          <Badge variant={unit.active ? "secondary" : "outline"} className="text-xs ml-auto">
                            {unit.active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-medium">{selectedTenant.active ? 'Ativo' : 'Inativo'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Plano</p>
                    <p className="font-medium">{selectedTenant.subscription?.plan_name || (selectedTenant.parent_id ? '—' : 'Free')}</p>
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

        {/* Link Unit Dialog */}
        <Dialog open={linkUnitDialogOpen} onOpenChange={setLinkUnitDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link className="h-5 w-5 text-warning" />
                Gerenciar Hierarquia de Barbearias
              </DialogTitle>
              <DialogDescription>
                Vincule uma barbearia como unidade de outra (matriz) ou defina-a como matriz independente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Lista de todas as barbearias */}
              <div className="rounded-lg border p-3 bg-muted/50 max-h-48 overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Barbearias no sistema:</p>
                <div className="space-y-1">
                  {allBarbershops.map(b => {
                    const isMatrix = !b.parent_id;
                    const parentName = b.parent_id ? allBarbershops.find(p => p.id === b.parent_id)?.name : null;
                    return (
                      <div key={b.id} className="flex items-center gap-2 text-sm py-1">
                        {isMatrix ? (
                          <Building2 className="h-3 w-3 text-warning shrink-0" />
                        ) : (
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0 ml-4" />
                        )}
                        <span className={isMatrix ? 'font-medium' : 'text-muted-foreground'}>{b.name}</span>
                        {parentName && (
                          <Badge variant="outline" className="text-xs ml-auto">
                            → {parentName}
                          </Badge>
                        )}
                        {isMatrix && (
                          <Badge variant="secondary" className="text-xs ml-auto">Matriz</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Formulário de vinculação */}
              <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                  <Label>Barbearia a vincular</Label>
                  <Select value={linkForm.unitId} onValueChange={(v) => setLinkForm({ ...linkForm, unitId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma barbearia" /></SelectTrigger>
                    <SelectContent>
                      {allBarbershops.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} {b.parent_id ? '(unidade)' : '(matriz)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Vincular como unidade de (matriz)</Label>
                  <Select 
                    value={linkForm.parentId} 
                    onValueChange={(v) => setLinkForm({ ...linkForm, parentId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione a matriz (ou deixe vazio para ser matriz)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <div className="flex items-center gap-2">
                          <Unlink className="h-3 w-3" />
                          Nenhuma (será matriz independente)
                        </div>
                      </SelectItem>
                      {allBarbershops
                        .filter(b => !b.parent_id && b.id !== linkForm.unitId)
                        .map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-warning" />
                              {b.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Se deixar vazio, a barbearia será uma matriz independente.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkUnitDialogOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleLinkUnit} 
                disabled={savingLink || !linkForm.unitId}
                className="bg-warning hover:bg-warning/90 text-warning-foreground"
              >
                {savingLink ? 'Salvando...' : 'Salvar Vínculo'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Subscription Management Dialog */}
        <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-warning" />
                Gerenciar Assinatura
              </DialogTitle>
              <DialogDescription>
                {selectedTenant?.name} - Configure o plano e status da assinatura
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Plano */}
              <div className="space-y-2">
                <Label>Plano de Assinatura</Label>
                <Select value={subscriptionForm.planId} onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, planId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                  <SelectContent>
                    {plans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex items-center gap-2">
                          <span>{plan.name}</span>
                          <span className="text-muted-foreground text-xs">
                            R$ {plan.price.toFixed(0)}/{plan.billing_period === 'monthly' ? 'mês' : 'ano'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Status */}
              <div className="space-y-2">
                <Label>Status da Assinatura</Label>
                <Select value={subscriptionForm.status} onValueChange={(v) => setSubscriptionForm({ ...subscriptionForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-success" />
                        Ativo
                      </div>
                    </SelectItem>
                    <SelectItem value="trial">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-warning" />
                        Trial (Teste)
                      </div>
                    </SelectItem>
                    <SelectItem value="cancelled">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-destructive" />
                        Cancelado
                      </div>
                    </SelectItem>
                    <SelectItem value="expired">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                        Expirado
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Validade */}
              <div className="space-y-2">
                <Label>Válido até</Label>
                <Input 
                  type="date" 
                  value={subscriptionForm.validUntil}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, validUntil: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Data de expiração do período atual da assinatura
                </p>
              </div>
              
              {/* Ações rápidas */}
              <div className="border-t pt-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Ações Rápidas</p>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const nextMonth = new Date();
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      setSubscriptionForm({ ...subscriptionForm, status: 'active', validUntil: nextMonth.toISOString().split('T')[0] });
                    }}
                  >
                    +1 Mês
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const next3Months = new Date();
                      next3Months.setMonth(next3Months.getMonth() + 3);
                      setSubscriptionForm({ ...subscriptionForm, status: 'active', validUntil: next3Months.toISOString().split('T')[0] });
                    }}
                  >
                    +3 Meses
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const nextYear = new Date();
                      nextYear.setFullYear(nextYear.getFullYear() + 1);
                      setSubscriptionForm({ ...subscriptionForm, status: 'active', validUntil: nextYear.toISOString().split('T')[0] });
                    }}
                  >
                    +1 Ano
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleSaveSubscription} 
                disabled={savingSubscription || !subscriptionForm.planId}
                className="bg-warning hover:bg-warning/90 text-warning-foreground"
              >
                {savingSubscription ? 'Salvando...' : 'Salvar Assinatura'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SaasAdminLayout>
  );
};

export default SaasAdminPortal;
