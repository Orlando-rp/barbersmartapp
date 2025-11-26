import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SalesData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface ServiceData {
  name: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface ClientMetrics {
  totalClients: number;
  activeClients: number;
  newClients: number;
  retentionRate: number;
  topClients: Array<{
    name: string;
    appointments: number;
    totalSpent: number;
    lastVisit: string;
  }>;
}

interface StaffPerformance {
  name: string;
  appointments: number;
  revenue: number;
  avgTicket: number;
  commission: number;
  completionRate: number;
}

interface ReportData {
  barbershopName: string;
  period: string;
  salesData: SalesData[];
  salesSummary: {
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    growth: number;
  };
  clientMetrics: ClientMetrics;
  servicesData: ServiceData[];
  teamPerformance: {
    totalAppointments: number;
    totalRevenue: number;
    totalCommissions: number;
    staff: StaffPerformance[];
  };
}

export const exportReportToPDF = (data: ReportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.text(data.barbershopName, pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Relatório - ${data.period}`, pageWidth / 2, 28, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, pageWidth / 2, 34, { align: 'center' });

  let yPos = 45;

  // Sales Summary
  doc.setFontSize(14);
  doc.text('Resumo Financeiro', 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: [
      ['Receita Total', `R$ ${data.salesSummary.totalRevenue.toFixed(2)}`],
      ['Despesas Totais', `R$ ${data.salesSummary.totalExpenses.toFixed(2)}`],
      ['Lucro Total', `R$ ${data.salesSummary.totalProfit.toFixed(2)}`],
      ['Crescimento', `${data.salesSummary.growth > 0 ? '+' : ''}${data.salesSummary.growth.toFixed(1)}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Client Metrics
  doc.setFontSize(14);
  doc.text('Métricas de Clientes', 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de Clientes', data.clientMetrics.totalClients.toString()],
      ['Clientes Ativos', data.clientMetrics.activeClients.toString()],
      ['Novos Clientes', data.clientMetrics.newClients.toString()],
      ['Taxa de Retenção', `${data.clientMetrics.retentionRate.toFixed(1)}%`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Top Services
  doc.setFontSize(14);
  doc.text('Serviços Mais Populares', 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Serviço', 'Atendimentos', 'Receita', 'Percentual']],
    body: data.servicesData.map(service => [
      service.name,
      service.count.toString(),
      `R$ ${service.revenue.toFixed(2)}`,
      `${service.percentage.toFixed(1)}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  // Team Performance
  doc.setFontSize(14);
  doc.text('Desempenho da Equipe', 14, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Profissional', 'Atendimentos', 'Receita', 'Ticket Médio', 'Comissão', 'Taxa Conclusão']],
    body: data.teamPerformance.staff.map(staff => [
      staff.name,
      staff.appointments.toString(),
      `R$ ${staff.revenue.toFixed(2)}`,
      `R$ ${staff.avgTicket.toFixed(2)}`,
      `R$ ${staff.commission.toFixed(2)}`,
      `${staff.completionRate.toFixed(1)}%`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
  });

  // Save PDF
  const fileName = `relatorio-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.pdf`;
  doc.save(fileName);
};

export const exportReportToExcel = (data: ReportData) => {
  const workbook = XLSX.utils.book_new();

  // Sales Data Sheet
  const salesSheet = XLSX.utils.json_to_sheet([
    { 'Métrica': 'Receita Total', 'Valor': data.salesSummary.totalRevenue },
    { 'Métrica': 'Despesas Totais', 'Valor': data.salesSummary.totalExpenses },
    { 'Métrica': 'Lucro Total', 'Valor': data.salesSummary.totalProfit },
    { 'Métrica': 'Crescimento (%)', 'Valor': data.salesSummary.growth },
    {},
    ...data.salesData.map(day => ({
      'Data': day.date,
      'Receita': day.revenue,
      'Despesas': day.expenses,
      'Lucro': day.profit,
    })),
  ]);
  XLSX.utils.book_append_sheet(workbook, salesSheet, 'Vendas');

  // Client Metrics Sheet
  const clientsSheet = XLSX.utils.json_to_sheet([
    { 'Métrica': 'Total de Clientes', 'Valor': data.clientMetrics.totalClients },
    { 'Métrica': 'Clientes Ativos', 'Valor': data.clientMetrics.activeClients },
    { 'Métrica': 'Novos Clientes', 'Valor': data.clientMetrics.newClients },
    { 'Métrica': 'Taxa de Retenção (%)', 'Valor': data.clientMetrics.retentionRate },
    {},
    { 'Nome': 'TOP CLIENTES', 'Atendimentos': '', 'Total Gasto': '', 'Última Visita': '' },
    ...data.clientMetrics.topClients.map(client => ({
      'Nome': client.name,
      'Atendimentos': client.appointments,
      'Total Gasto': client.totalSpent,
      'Última Visita': client.lastVisit,
    })),
  ]);
  XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clientes');

  // Services Sheet
  const servicesSheet = XLSX.utils.json_to_sheet(
    data.servicesData.map(service => ({
      'Serviço': service.name,
      'Atendimentos': service.count,
      'Receita': service.revenue,
      'Percentual (%)': service.percentage,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, servicesSheet, 'Serviços');

  // Team Performance Sheet
  const teamSheet = XLSX.utils.json_to_sheet([
    { 'Métrica': 'Total Atendimentos', 'Valor': data.teamPerformance.totalAppointments },
    { 'Métrica': 'Receita Total', 'Valor': data.teamPerformance.totalRevenue },
    { 'Métrica': 'Comissões Totais', 'Valor': data.teamPerformance.totalCommissions },
    {},
    { 'Nome': 'DESEMPENHO POR PROFISSIONAL', 'Atendimentos': '', 'Receita': '', 'Ticket Médio': '', 'Comissão': '', 'Taxa Conclusão (%)': '' },
    ...data.teamPerformance.staff.map(staff => ({
      'Nome': staff.name,
      'Atendimentos': staff.appointments,
      'Receita': staff.revenue,
      'Ticket Médio': staff.avgTicket,
      'Comissão': staff.commission,
      'Taxa Conclusão (%)': staff.completionRate,
    })),
  ]);
  XLSX.utils.book_append_sheet(workbook, teamSheet, 'Equipe');

  // Save Excel file
  const fileName = `relatorio-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
