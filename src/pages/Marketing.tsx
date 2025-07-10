import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Plus, Send, Users, Gift, Star } from "lucide-react";

const Marketing = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Marketing</h1>
            <p className="text-muted-foreground">Ferramentas para fidelizar e atrair clientes</p>
          </div>
          <Button variant="premium" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Nova Campanha
          </Button>
        </div>

        {/* Marketing Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Send className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-foreground">1.250</div>
                  <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-success" />
                <div>
                  <div className="text-2xl font-bold text-foreground">85%</div>
                  <p className="text-sm text-muted-foreground">Taxa de Abertura</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Gift className="h-5 w-5 text-warning" />
                <div>
                  <div className="text-2xl font-bold text-foreground">24</div>
                  <p className="text-sm text-muted-foreground">Cupons Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-foreground">4.8</div>
                  <p className="text-sm text-muted-foreground">Avaliação Média</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Marketing Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="barbershop-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Campanhas de WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">Lembrete de Aniversário</h4>
                    <span className="text-sm text-success">Ativa</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Mensagem automática para clientes no aniversário</p>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">Promoção Mensal</h4>
                    <span className="text-sm text-primary">Agendada</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Oferta especial para clientes inativos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-warning" />
                Programa de Fidelidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-semibold mb-2">Pontos por Serviço</h4>
                  <p className="text-sm text-muted-foreground mb-2">Cliente ganha pontos a cada serviço realizado</p>
                  <div className="text-sm">
                    <span className="font-medium">248 clientes</span> participando
                  </div>
                </div>
                <div className="p-4 border border-border rounded-lg">
                  <h4 className="font-semibold mb-2">Cupons de Desconto</h4>
                  <p className="text-sm text-muted-foreground mb-2">Descontos automáticos para clientes fiéis</p>
                  <div className="text-sm">
                    <span className="font-medium">24 cupons</span> ativos
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Marketing;