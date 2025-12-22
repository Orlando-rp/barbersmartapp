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
import { Plus, DollarSign, Calendar, Users, Activity, Clock, LayoutGrid } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface WidgetConfig {
  id: string;
  name: string;
  icon: any;
  description: string;
  enabled: boolean;
}

export type ColumnConfig = 2 | 3 | 4;

interface WidgetSelectorProps {
  widgets: WidgetConfig[];
  onToggleWidget: (widgetId: string) => void;
  columns: ColumnConfig;
  onColumnsChange: (cols: ColumnConfig) => void;
}

const ColumnPreview = ({ cols, selected }: { cols: number; selected: boolean }) => (
  <div className={cn(
    "p-2 rounded-lg border-2 transition-all cursor-pointer",
    selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
  )}>
    <div className={cn(
      "grid gap-1",
      cols === 2 && "grid-cols-2",
      cols === 3 && "grid-cols-3",
      cols === 4 && "grid-cols-4"
    )}>
      {Array.from({ length: cols * 2 }).map((_, i) => (
        <div 
          key={i} 
          className={cn(
            "h-3 rounded-sm",
            selected ? "bg-primary/60" : "bg-muted-foreground/30"
          )} 
        />
      ))}
    </div>
    <p className={cn(
      "text-xs text-center mt-1.5 font-medium",
      selected ? "text-primary" : "text-muted-foreground"
    )}>
      {cols} colunas
    </p>
  </div>
);

export const WidgetSelector = ({ widgets, onToggleWidget, columns, onColumnsChange }: WidgetSelectorProps) => {
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
            Configure o layout e selecione os widgets do seu dashboard
          </DialogDescription>
        </DialogHeader>
        
        {/* Column Selector */}
        <div className="space-y-3 pb-4 border-b">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">Layout do Grid</Label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {([2, 3, 4] as ColumnConfig[]).map((cols) => (
              <div key={cols} onClick={() => onColumnsChange(cols)}>
                <ColumnPreview cols={cols} selected={columns === cols} />
              </div>
            ))}
          </div>
        </div>

        {/* Widget List */}
        <div className="space-y-3 py-2">
          <Label className="text-sm font-medium">Widgets disponíveis</Label>
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
