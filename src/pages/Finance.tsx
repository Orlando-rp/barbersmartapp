import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/layout/Layout";
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
import { TransactionDialog } from "@/components/dialogs/TransactionDialog";
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Receipt,
  Edit,
  Trash2,
  Calendar as CalendarIcon
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  id: string;
  type: "receita" | "despesa";
  amount: number;
  description: string;
  category: string;
  payment_method: string;
  transaction_date: string;
  notes: string | null;
  created_at: string;
}

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  commissions: number;
}

const Finance = () => {
  const { barbershopId } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    commissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (barbershopId) {
      fetchFinancialData();

      // Realtime subscription
      const channel = supabase
        .channel('finance-transactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
            filter: `barbershop_id=eq.${barbershopId}`
          },
          () => {
            fetchFinancialData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [barbershopId, selectedMonth]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const firstDayOfMonth = `${selectedMonth}-01`;
      const lastDay = new Date(selectedMonth + '-01');
      lastDay.setMonth(lastDay.getMonth() + 1);
      lastDay.setDate(0);
      const lastDayOfMonth = lastDay.toISOString().split('T')[0];

      // Buscar transações do mês
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('transaction_date', firstDayOfMonth)
        .lte('transaction_date', lastDayOfMonth)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      setTransactions(transactionsData || []);

      // Calcular resumo financeiro
      const revenue = transactionsData
        ?.filter(t => t.type === 'receita')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const expenses = transactionsData
        ?.filter(t => t.type === 'despesa')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const commissionExpenses = transactionsData
        ?.filter(t => t.type === 'despesa' && t.category === 'salarios')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      setSummary({
        totalRevenue: revenue,
        totalExpenses: expenses,
        netProfit: revenue - expenses,
        commissions: commissionExpenses
      });
    } catch (error) {
      console.error('Erro ao buscar dados financeiros:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Transação excluída com sucesso!');
    } catch (error: any) {
      console.error('Erro ao excluir transação:', error);
      toast.error('Erro ao excluir transação');
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      dinheiro: 'Dinheiro',
      credito: 'Crédito',
      debito: 'Débito',
      pix: 'PIX'
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Controle completo das finanças da barbearia</p>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-background text-foreground"
              />
            </div>
            <TransactionDialog onSuccess={fetchFinancialData}>
              <Button variant="premium" size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Nova Transação
              </Button>
            </TransactionDialog>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="barbershop-card">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    R$ {summary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
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
                  <div className="text-2xl font-bold text-foreground">
                    R$ {summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
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
                  <div className="text-2xl font-bold text-foreground">
                    R$ {summary.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
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
                  <div className="text-2xl font-bold text-foreground">
                    R$ {summary.commissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-sm text-muted-foreground">Comissões</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="barbershop-card">
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Nenhuma transação registrada neste mês</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === 'receita' ? 'default' : 'destructive'}>
                          {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className="capitalize">{transaction.category}</TableCell>
                      <TableCell>{getPaymentMethodLabel(transaction.payment_method)}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={transaction.type === 'receita' ? 'text-success' : 'text-destructive'}>
                          {transaction.type === 'receita' ? '+' : '-'}
                          R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <TransactionDialog transaction={transaction} onSuccess={fetchFinancialData}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TransactionDialog>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Finance;
