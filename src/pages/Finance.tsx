import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Plus, TrendingUp, TrendingDown, PiggyBank, Receipt } from "lucide-react";

const Finance = () => {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Controle completo das finanças da barbearia</p>
          </div>
          <Button variant="premium" size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Nova Transação
          </Button>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <div>
                  <div className="text-2xl font-bold text-foreground">R$ 15.240</div>
                  <p className="text-sm text-muted-foreground">Receita do Mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <div>
                  <div className="text-2xl font-bold text-foreground">R$ 3.520</div>
                  <p className="text-sm text-muted-foreground">Despesas do Mês</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-foreground">R$ 11.720</div>
                  <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-warning" />
                <div>
                  <div className="text-2xl font-bold text-foreground">R$ 1.850</div>
                  <p className="text-sm text-muted-foreground">Comissões</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Tools */}
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Gestão Financeira
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Relatórios Financeiros</h3>
                <p className="text-muted-foreground">Gráficos e relatórios detalhados serão implementados aqui</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Finance;