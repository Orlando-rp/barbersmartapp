import { useAuth } from "@/contexts/AuthContext";
import { Building2, ChevronDown, Check, Eye, Home, GitBranch } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSelectableUnits } from "@/hooks/useSelectableUnits";

const BarbershopSelector = () => {
  const { barbershops, selectedBarbershopId, setSelectedBarbershop, userRole } = useAuth();

  // Super admin always sees the selector (to switch between client views)
  // Regular users only see it if they have more than one barbershop
  const isSuperAdmin = userRole === 'super_admin';
  
  // Filtrar unidades selecionáveis (excluindo matrizes que têm unidades)
  const { selectableUnits, matrizName, hasMultipleUnits } = useSelectableUnits(barbershops);
  
  if (!isSuperAdmin && !hasMultipleUnits) {
    return null;
  }

  const selectedBarbershop = barbershops.find(b => b.id === selectedBarbershopId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-1.5 sm:gap-2 max-w-[160px] sm:max-w-[280px] md:max-w-none justify-between h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {isSuperAdmin ? (
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning flex-shrink-0" />
            ) : (
              <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
            )}
            <span className="truncate">
              {selectedBarbershopId === null 
                ? (isSuperAdmin ? 'Todas' : 'Todas')
                : (selectedBarbershop?.name || 'Selecionar')
              }
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px] sm:w-[320px]" align="start">
        <DropdownMenuLabel>
          {isSuperAdmin ? 'Visualizar como Cliente' : (matrizName ? `${matrizName} - Unidades` : 'Selecionar Unidade')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* "All" option */}
        <DropdownMenuItem
          onClick={() => setSelectedBarbershop(null)}
          className={cn(
            "flex items-center justify-between cursor-pointer",
            selectedBarbershopId === null && "bg-primary/10"
          )}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>{isSuperAdmin ? 'Visão Consolidada (Todas)' : 'Todas as Unidades'}</span>
          </div>
          {selectedBarbershopId === null && (
            <Check className="h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Barbershop list with hierarchy */}
        <ScrollArea className={cn(isSuperAdmin && selectableUnits.length > 8 ? "h-[300px]" : "")}>
          {selectableUnits.map((barbershop) => (
            <DropdownMenuItem
              key={barbershop.id}
              onClick={() => setSelectedBarbershop(barbershop.id)}
              className={cn(
                "flex items-center justify-between cursor-pointer",
                selectedBarbershopId === barbershop.id && "bg-primary/10"
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {!barbershop.parent_id ? (
                  <Home className="h-4 w-4 flex-shrink-0 text-primary" />
                ) : (
                  <GitBranch className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                )}
                <span className="truncate flex-1">
                  {barbershop.name}
                </span>
                {barbershop.is_primary && (
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    Principal
                  </Badge>
                )}
              </div>
              {selectedBarbershopId === barbershop.id && (
                <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
              )}
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BarbershopSelector;