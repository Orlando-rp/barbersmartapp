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
import { useMemo } from "react";

interface BarbershopWithHierarchy {
  id: string;
  name: string;
  is_primary?: boolean;
  parent_id?: string | null;
  isMatriz: boolean;
  children: string[];
}

const BarbershopSelector = () => {
  const { barbershops, selectedBarbershopId, setSelectedBarbershop, userRole } = useAuth();

  // Super admin always sees the selector (to switch between client views)
  // Regular users only see it if they have more than one barbershop
  const isSuperAdmin = userRole === 'super_admin';
  
  if (!isSuperAdmin && barbershops.length <= 1) {
    return null;
  }

  // Organizar barbearias: Mostrar apenas unidades (filiais), não a matriz
  const { selectableUnits, matrizName } = useMemo(() => {
    const matrizes: BarbershopWithHierarchy[] = [];
    const unidades: BarbershopWithHierarchy[] = [];
    
    // Separar matrizes (sem parent_id) e unidades
    barbershops.forEach((b: any) => {
      const item: BarbershopWithHierarchy = {
        ...b,
        isMatriz: !b.parent_id,
        children: [],
      };
      
      if (!b.parent_id) {
        matrizes.push(item);
      } else {
        unidades.push(item);
      }
    });
    
    // Identificar matrizes que TÊM unidades (não devem ser selecionáveis)
    const matrizesComUnidades = new Set<string>();
    unidades.forEach(u => {
      if (u.parent_id) {
        matrizesComUnidades.add(u.parent_id);
      }
    });
    
    // Resultado: unidades + matrizes SEM unidades (barbearias independentes)
    const result: BarbershopWithHierarchy[] = [];
    
    // Adicionar matrizes que NÃO têm unidades (são barbearias independentes)
    matrizes.forEach(matriz => {
      if (!matrizesComUnidades.has(matriz.id)) {
        result.push(matriz);
      }
    });
    
    // Adicionar todas as unidades
    result.push(...unidades);
    
    // Nome da matriz principal (para exibição)
    const matrizPrincipal = matrizes.find(m => matrizesComUnidades.has(m.id));
    
    return { 
      selectableUnits: result,
      matrizName: matrizPrincipal?.name || null
    };
  }, [barbershops]);

  const selectedBarbershop = barbershops.find(b => b.id === selectedBarbershopId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 max-w-[280px] sm:max-w-none justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isSuperAdmin ? (
              <Eye className="h-4 w-4 text-warning flex-shrink-0" />
            ) : (
              <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
            )}
            <span className="truncate">
              {selectedBarbershopId === null 
                ? (isSuperAdmin ? 'Todas as Barbearias' : 'Todas as Unidades')
                : (selectedBarbershop?.name || 'Selecionar')
              }
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
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
        <ScrollArea className={cn(isSuperAdmin && barbershops.length > 8 ? "h-[300px]" : "")}>
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
                {barbershop.isMatriz ? (
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