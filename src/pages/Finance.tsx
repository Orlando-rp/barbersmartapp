import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { TransactionDialog } from "@/components/dialogs/TransactionDialog";
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Receipt,
  Edit,
  Trash2,
  Calendar as CalendarIcon,
  Building2
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
  commission_amount?: number;
}

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  commissions: number;
}

const Finance = () => {
  const { activeBarbershopIds, selectedBarbershopId, barbershops } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    commissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Visão consolidada quando há múltiplas unidades selecionáveis e nenhuma está selecionada
  const isConsolidatedView = activeBarbershopIds.length > 1 && selectedBarbershopId === null;

  // Handle ?new=true URL parameter to open dialog
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsDialogOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (activeBarbershopIds.length === 0) {
      setLoading(false);
      return;
    }
    
    fetchFinancialData();

    // Realtime subscription
    const channel = supabase
      .channel('finance-transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload: any) => {
          if (payload.new?.barbershop_id && activeBarbershopIds.includes(payload.new.barbershop_id)) {
            fetchFinancialData();
          } else if (payload.old?.barbershop_id && activeBarbershopIds.includes(payload.old.barbershop_id)) {
            fetchFinancialData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBarbershopIds, selectedMonth]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const firstDayOfMonth = `${selectedMonth}-01`;
      // Usar o primeiro dia do próximo mês para capturar todas as transações do mês
      const nextMonth = new Date(selectedMonth + '-01');
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const firstDayNextMonth = nextMonth.toISOString().split('T')[0];

      // Buscar transações do mês
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select('*')
        .in('barbershop_id', activeBarbershopIds)
        .gte('transaction_date', firstDayOfMonth)
        .lt('transaction_date', firstDayNextMonth)
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

      // Comissões: somar commission_amount de todas as transações que possuem
      const totalCommissions = transactionsData
        ?.filter(t => t.commission_amount && t.commission_amount > 0)
        .reduce((sum, t) => sum + Number(t.commission_amount || 0), 0) || 0;

      setSummary({
        totalRevenue: revenue,
        totalExpenses: expenses,
        netProfit: revenue - expenses,
        commissions: totalCommissions
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
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground text-sm lg:text-base">Controle das finanças</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2 sm:px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              />
            </div>
            <TransactionDialog onSuccess={fetchFinancialData}>
              <Button variant="premium" size="default">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nova Transação</span>
              </Button>
            </TransactionDialog>
            {/* Controlled dialog for FAB */}
            <TransactionDialog 
              open={isDialogOpen} 
              onOpenChange={setIsDialogOpen} 
              onSuccess={fetchFinancialData}
            />
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card className="barbershop-card">
            <CardContent className="pt-4 lg:pt-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-success flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-base lg:text-2xl font-bold text-foreground truncate">
                    R$ {summary.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs lg:text-sm text-muted-foreground">Receita</p>
                    {isConsolidatedView && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 flex items-center gap-0.5">
                        <Building2 className="h-2 w-2" />
                        <span>{activeBarbershopIds.length}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="barbershop-card">
            <CardContent className="pt-4 lg:pt-6">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 lg:h-5 lg:w-5 text-destructive flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-base lg:text-2xl font-bold text-foreground truncate">
                    R$ {summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs lg:text-sm text-muted-foreground">Despesas</p>
                    {isConsolidatedView && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 flex items-center gap-0.5">
                        <Building2 className="h-2 w-2" />
                        <span>{activeBarbershopIds.length}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-4 lg:pt-6">
              <div className="flex items-center space-x-2">
                <PiggyBank className="h-4 w-4 lg:h-5 lg:w-5 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-base lg:text-2xl font-bold text-foreground truncate">
                    R$ {summary.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs lg:text-sm text-muted-foreground">Lucro</p>
                    {isConsolidatedView && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 flex items-center gap-0.5">
                        <Building2 className="h-2 w-2" />
                        <span>{activeBarbershopIds.length}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="barbershop-card">
            <CardContent className="pt-4 lg:pt-6">
              <div className="flex items-center space-x-2">
                <Receipt className="h-4 w-4 lg:h-5 lg:w-5 text-warning flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-base lg:text-2xl font-bold text-foreground truncate">
                    R$ {summary.commissions.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs lg:text-sm text-muted-foreground">Comissões</p>
                    {isConsolidatedView && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 flex items-center gap-0.5">
                        <Building2 className="h-2 w-2" />
                        <span>{activeBarbershopIds.length}</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="barbershop-card overflow-hidden">
          <CardHeader className="p-4 lg:p-6">
            <CardTitle className="text-base lg:text-xl">Histórico de Transações</CardTitle>
          </CardHeader>
          <CardContent className="p-3 lg:p-6 lg:pt-0">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Nenhuma transação registrada neste mês</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="block md:hidden space-y-3">
                  {transactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="p-3 rounded-lg border border-border bg-background/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={transaction.type === 'receita' ? 'default' : 'destructive'} className="text-xs">
                          {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                        </Badge>
                        <span className={`font-bold text-sm ${transaction.type === 'receita' ? 'text-success' : 'text-destructive'}`}>
                          {transaction.type === 'receita' ? '+' : '-'}
                          R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <p className="font-medium text-sm text-foreground truncate">{transaction.description}</p>
                      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                        <span>{format(new Date(transaction.transaction_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        <span className="capitalize">{transaction.category}</span>
                        <span>{getPaymentMethodLabel(transaction.payment_method)}</span>
                      </div>
                      <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-border">
                        <TransactionDialog transaction={transaction} onSuccess={fetchFinancialData}>
                          <Button variant="ghost" size="sm" className="h-8 px-2">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TransactionDialog>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleDelete(transaction.id)}
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
                        <TableHead className="whitespace-nowrap">Data</TableHead>
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
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(transaction.transaction_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === 'receita' ? 'default' : 'destructive'}>
                              {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{transaction.description}</TableCell>
                          <TableCell className="capitalize whitespace-nowrap">{transaction.category}</TableCell>
                          <TableCell className="whitespace-nowrap">{getPaymentMethodLabel(transaction.payment_method)}</TableCell>
                          <TableCell className="text-right font-medium whitespace-nowrap">
                            <span className={transaction.type === 'receita' ? 'text-success' : 'text-destructive'}>
                              {transaction.type === 'receita' ? '+' : '-'}
                              R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
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
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Finance;
