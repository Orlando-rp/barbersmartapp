import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Plus, Search, Filter, Phone, Mail, Calendar, Star } from "lucide-react";

const mockClients = [
  {
    id: "1",
    name: "Carlos Silva",
    email: "carlos@email.com",
    phone: "(11) 99999-9999",
    lastVisit: "2024-07-08",
    totalSpent: 450,
    visits: 12,
    rating: 5,
    status: "VIP",
  },
  {
    id: "2",
    name: "Pedro Santos",
    email: "pedro@email.com",
    phone: "(11) 88888-8888",
    lastVisit: "2024-07-05",
    totalSpent: 180,
    visits: 4,
    rating: 4.5,
    status: "Regular",
  },
  {
    id: "3",
    name: "Rafael Lima",
    email: "rafael@email.com",
    phone: "(11) 77777-7777",
    lastVisit: "2024-07-10",
    totalSpent: 90,
    visits: 2,
    rating: 5,
    status: "Novo",
  },
];

const Clients = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gerencie a base de clientes da sua barbearia</p>
          </div>
          <Button variant="premium" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Novo Cliente
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">248</div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">24</div>
              <p className="text-sm text-muted-foreground">Novos este Mês</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">85%</div>
              <p className="text-sm text-muted-foreground">Taxa de Retenção</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">4.8</div>
              <p className="text-sm text-muted-foreground">Avaliação Média</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="barbershop-card">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar clientes..." 
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Clients List */}
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Lista de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={`/placeholder-${client.id}.jpg`} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {client.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        {client.name}
                        <Badge 
                          variant={client.status === 'VIP' ? 'default' : client.status === 'Regular' ? 'secondary' : 'outline'}
                          className={client.status === 'VIP' ? 'bg-primary text-primary-foreground' : ''}
                        >
                          {client.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {client.email}
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {client.phone}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end space-x-4 text-sm">
                      <div>
                        <div className="font-medium text-foreground">R$ {client.totalSpent}</div>
                        <div className="text-muted-foreground">{client.visits} visitas</div>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-warning mr-1" />
                          <span className="font-medium">{client.rating}</span>
                        </div>
                        <div className="text-muted-foreground flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {client.lastVisit}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Clients;