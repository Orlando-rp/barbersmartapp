import Layout from "@/components/layout/Layout";
import { ServiceDialog } from "@/components/dialogs/ServiceDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Scissors, Plus, Search, Filter, Clock, DollarSign, Edit, Trash2 } from "lucide-react";

const mockServices = [
  {
    id: "1",
    name: "Corte Social",
    description: "Corte clássico masculino com acabamento profissional",
    price: 35,
    duration: 30,
    category: "Corte",
    popular: true,
    active: true,
  },
  {
    id: "2",
    name: "Corte + Barba",
    description: "Corte completo com barba aparada e finalizada",
    price: 60,
    duration: 45,
    category: "Combo",
    popular: true,
    active: true,
  },
  {
    id: "3",
    name: "Barba",
    description: "Aparar e finalizar barba com navalha",
    price: 25,
    duration: 25,
    category: "Barba",
    popular: false,
    active: true,
  },
  {
    id: "4",
    name: "Sobrancelha",
    description: "Design e alinhamento de sobrancelhas",
    price: 15,
    duration: 15,
    category: "Estética",
    popular: false,
    active: true,
  },
  {
    id: "5",
    name: "Corte Degradê",
    description: "Corte moderno com degradê nas laterais",
    price: 45,
    duration: 40,
    category: "Corte",
    popular: true,
    active: true,
  },
];

const Services = () => {
  const categories = ["Todos", "Corte", "Barba", "Combo", "Estética"];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Serviços</h1>
            <p className="text-muted-foreground">Gerencie o catálogo de serviços da sua barbearia</p>
          </div>
          <ServiceDialog>
            <Button variant="premium" size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Novo Serviço
            </Button>
          </ServiceDialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{mockServices.length}</div>
              <p className="text-sm text-muted-foreground">Total de Serviços</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">
                R$ {Math.round(mockServices.reduce((sum, s) => sum + s.price, 0) / mockServices.length)}
              </div>
              <p className="text-sm text-muted-foreground">Preço Médio</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">
                {mockServices.filter(s => s.popular).length}
              </div>
              <p className="text-sm text-muted-foreground">Mais Populares</p>
            </CardContent>
          </Card>
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-warning">
                {Math.round(mockServices.reduce((sum, s) => sum + s.duration, 0) / mockServices.length)}min
              </div>
              <p className="text-sm text-muted-foreground">Duração Média</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="barbershop-card">
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar serviços..." 
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {categories.map((category) => (
                  <Button 
                    key={category}
                    variant={category === "Todos" ? "default" : "outline"}
                    size="sm"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockServices.map((service) => (
            <Card key={service.id} className="barbershop-card hover:shadow-medium">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{service.category}</Badge>
                      {service.popular && (
                        <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 text-success mr-1" />
                      <span className="font-semibold text-success">R$ {service.price}</span>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{service.duration}min</span>
                    </div>
                  </div>
                  
                  <Badge 
                    variant={service.active ? "default" : "secondary"}
                    className={service.active ? "bg-success text-success-foreground" : ""}
                  >
                    {service.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Services;