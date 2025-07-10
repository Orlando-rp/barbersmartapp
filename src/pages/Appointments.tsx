import Layout from "@/components/layout/Layout";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const Appointments = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agendamentos</h1>
            <p className="text-muted-foreground">Gerencie todos os agendamentos da sua barbearia</p>
          </div>
          <AppointmentDialog>
            <Button variant="premium" size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Novo Agendamento
            </Button>
          </AppointmentDialog>
        </div>

        {/* Filters */}
        <Card className="barbershop-card">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por cliente..." 
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
              <Button variant="outline">
                <Calendar className="mr-2 h-4 w-4" />
                Hoje
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View Placeholder */}
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle>Calendário de Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Vista do Calendário</h3>
                <p className="text-muted-foreground">O calendário interativo será implementado aqui</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Appointments;