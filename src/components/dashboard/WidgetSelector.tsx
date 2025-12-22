import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, DollarSign, Calendar, Users, Activity, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export interface WidgetConfig {
  id: string;
  name: string;
  icon: any;
  description: string;
  enabled: boolean;
}

interface WidgetSelectorProps {
  widgets: WidgetConfig[];
  onToggleWidget: (widgetId: string) => void;
}

export const WidgetSelector = ({ widgets, onToggleWidget }: WidgetSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Widget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Personalizar Dashboard</DialogTitle>
          <DialogDescription>
            Selecione os widgets que deseja exibir no seu dashboard
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <Checkbox
                id={widget.id}
                checked={widget.enabled}
                onCheckedChange={() => onToggleWidget(widget.id)}
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <widget.icon className="h-4 w-4 text-primary" />
                  <label
                    htmlFor={widget.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {widget.name}
                  </label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {widget.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const defaultWidgets: WidgetConfig[] = [
  {
    id: 'revenue',
    name: 'Receita',
    icon: DollarSign,
    description: 'Acompanhe a receita diária e mensal em tempo real',
    enabled: true,
  },
  {
    id: 'appointments',
    name: 'Agendamentos',
    icon: Calendar,
    description: 'Visualize agendamentos do dia e próximos compromissos',
    enabled: true,
  },
  {
    id: 'clients',
    name: 'Clientes',
    icon: Users,
    description: 'Estatísticas de clientes totais, ativos e novos',
    enabled: true,
  },
  {
    id: 'occupancy',
    name: 'Taxa de Ocupação',
    icon: Activity,
    description: 'Percentual de horários ocupados hoje',
    enabled: true,
  },
  {
    id: 'waitlist',
    name: 'Lista de Espera',
    icon: Clock,
    description: 'Clientes aguardando horários disponíveis',
    enabled: true,
  },
];
