import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Save, FolderOpen, Trash2, ChevronDown, Layout, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { WidgetConfig, ColumnConfig } from "./WidgetSelector";
import { cn } from "@/lib/utils";

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  widgetOrder: string[];
  columns: ColumnConfig;
  createdAt: string;
}

interface LayoutManagerProps {
  currentWidgets: WidgetConfig[];
  currentOrder: string[];
  currentColumns: ColumnConfig;
  onLoadLayout: (layout: DashboardLayout) => void;
}

const LAYOUTS_STORAGE_KEY = 'dashboard-saved-layouts';
const ACTIVE_LAYOUT_KEY = 'dashboard-active-layout';

const generateId = () => Math.random().toString(36).substring(2, 9);

export const getSavedLayouts = (): DashboardLayout[] => {
  const saved = localStorage.getItem(LAYOUTS_STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

export const getActiveLayoutId = (): string | null => {
  return localStorage.getItem(ACTIVE_LAYOUT_KEY);
};

export const setActiveLayoutId = (id: string | null) => {
  if (id) {
    localStorage.setItem(ACTIVE_LAYOUT_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_LAYOUT_KEY);
  }
};

export const LayoutManager = ({
  currentWidgets,
  currentOrder,
  currentColumns,
  onLoadLayout,
}: LayoutManagerProps) => {
  const [layouts, setLayouts] = useState<DashboardLayout[]>(getSavedLayouts);
  const [activeLayoutId, setActiveLayout] = useState<string | null>(getActiveLayoutId);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");

  const saveLayouts = (newLayouts: DashboardLayout[]) => {
    localStorage.setItem(LAYOUTS_STORAGE_KEY, JSON.stringify(newLayouts));
    setLayouts(newLayouts);
  };

  const handleSaveLayout = () => {
    if (!newLayoutName.trim()) {
      toast.error("Digite um nome para o layout");
      return;
    }

    const newLayout: DashboardLayout = {
      id: generateId(),
      name: newLayoutName.trim(),
      widgets: currentWidgets,
      widgetOrder: currentOrder,
      columns: currentColumns,
      createdAt: new Date().toISOString(),
    };

    const updated = [...layouts, newLayout];
    saveLayouts(updated);
    setActiveLayout(newLayout.id);
    setActiveLayoutId(newLayout.id);
    setNewLayoutName("");
    setSaveDialogOpen(false);
    toast.success(`Layout "${newLayout.name}" salvo com sucesso`);
  };

  const handleLoadLayout = (layout: DashboardLayout) => {
    onLoadLayout(layout);
    setActiveLayout(layout.id);
    setActiveLayoutId(layout.id);
    toast.success(`Layout "${layout.name}" carregado`);
  };

  const handleDeleteLayout = (layoutId: string) => {
    const layout = layouts.find(l => l.id === layoutId);
    const updated = layouts.filter(l => l.id !== layoutId);
    saveLayouts(updated);
    
    if (activeLayoutId === layoutId) {
      setActiveLayout(null);
      setActiveLayoutId(null);
    }
    
    toast.success(`Layout "${layout?.name}" excluído`);
  };

  const handleUpdateCurrentLayout = () => {
    if (!activeLayoutId) return;
    
    const updated = layouts.map(l => 
      l.id === activeLayoutId 
        ? { ...l, widgets: currentWidgets, widgetOrder: currentOrder, columns: currentColumns }
        : l
    );
    saveLayouts(updated);
    toast.success("Layout atualizado");
  };

  const activeLayout = layouts.find(l => l.id === activeLayoutId);

  return (
    <div className="flex items-center gap-2">
      {/* Layout Selector Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline max-w-[100px] truncate">
              {activeLayout?.name || "Layouts"}
            </span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {layouts.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              Nenhum layout salvo
            </div>
          ) : (
            layouts.map((layout) => (
              <DropdownMenuItem
                key={layout.id}
                className="flex items-center justify-between group cursor-pointer"
                onClick={() => handleLoadLayout(layout)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {activeLayoutId === layout.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <span className={cn(
                    "truncate",
                    activeLayoutId !== layout.id && "ml-6"
                  )}>
                    {layout.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLayout(layout.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </DropdownMenuItem>
            ))
          )}
          
          <DropdownMenuSeparator />
          
          {activeLayoutId && (
            <DropdownMenuItem onClick={handleUpdateCurrentLayout}>
              <Save className="h-4 w-4 mr-2" />
              Atualizar "{activeLayout?.name}"
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={() => setSaveDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Salvar novo layout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Save New Layout Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Salvar Layout</DialogTitle>
            <DialogDescription>
              Dê um nome para salvar a configuração atual do dashboard
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="layout-name">Nome do layout</Label>
            <Input
              id="layout-name"
              value={newLayoutName}
              onChange={(e) => setNewLayoutName(e.target.value)}
              placeholder="Ex: Visão financeira, Dia a dia..."
              className="mt-2"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveLayout()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLayout}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LayoutManager;
