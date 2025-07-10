import Layout from "@/components/layout/Layout";
import StatsCard from "@/components/dashboard/StatsCard";
import AppointmentList from "@/components/dashboard/AppointmentList";
import RevenueChart from "@/components/dashboard/RevenueChart";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Scissors,
  TrendingUp,
  UserPlus,
  Clock,
  Star
} from "lucide-react";

const Index = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="gradient-subtle p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Bem-vindo ao BarberSmart! 👋
              </h1>
              <p className="text-muted-foreground text-lg">
                Gerencie sua barbearia de forma inteligente e eficiente
              </p>
            </div>
            <AppointmentDialog>
              <Button variant="premium" size="lg" className="shadow-gold">
                <UserPlus className="mr-2 h-5 w-5" />
                Novo Agendamento
              </Button>
            </AppointmentDialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Agendamentos Hoje"
            value="12"
            change={{ value: 8, type: "increase" }}
            icon={Calendar}
            variant="primary"
          />
          <StatsCard
            title="Receita do Mês"
            value="R$ 15.240"
            change={{ value: 12, type: "increase" }}
            icon={DollarSign}
            variant="success"
          />
          <StatsCard
            title="Clientes Ativos"
            value="248"
            change={{ value: 5, type: "increase" }}
            icon={Users}
            variant="default"
          />
          <StatsCard
            title="Avaliação Média"
            value="4.8"
            change={{ value: 2, type: "increase" }}
            icon={Star}
            variant="warning"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointments List */}
          <div className="lg:col-span-1">
            <AppointmentList />
          </div>

          {/* Revenue Chart */}
          <div className="lg:col-span-1">
            <RevenueChart />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="barbershop-card hover:shadow-medium cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5 text-primary" />
                Serviços Populares
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Corte + Barba</span>
                  <span className="text-sm font-medium">68%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Corte Social</span>
                  <span className="text-sm font-medium">52%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Barba</span>
                  <span className="text-sm font-medium">34%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card hover:shadow-medium cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Performance do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Taxa de Ocupação</span>
                  <span className="text-sm font-medium text-success">85%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Clientes Novos</span>
                  <span className="text-sm font-medium text-primary">+24</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fidelização</span>
                  <span className="text-sm font-medium text-warning">92%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card hover:shadow-medium cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Horários de Pico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Manhã (9h-12h)</span>
                  <span className="text-sm font-medium">Alto</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tarde (14h-17h)</span>
                  <span className="text-sm font-medium">Médio</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Noite (18h-20h)</span>
                  <span className="text-sm font-medium">Baixo</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
