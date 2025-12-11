import { useAuth } from "@/contexts/AuthContext";
import { Building2, ChevronDown, Check, Eye } from "lucide-react";
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

const BarbershopSelector = () => {
  const { barbershops, selectedBarbershopId, setSelectedBarbershop, userRole } = useAuth();

  // Super admin always sees the selector (to switch between client views)
  // Regular users only see it if they have more than one barbershop
  const isSuperAdmin = userRole === 'super_admin';
  
  if (!isSuperAdmin && barbershops.length <= 1) {
    return null;
  }

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
          {isSuperAdmin ? 'Visualizar como Cliente' : 'Suas Unidades'}
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
        
        {/* Barbershop list - with scroll for super admin who may have many */}
        <ScrollArea className={cn(isSuperAdmin && barbershops.length > 8 ? "h-[300px]" : "")}>
          {barbershops.map((barbershop) => (
            <DropdownMenuItem
              key={barbershop.id}
              onClick={() => setSelectedBarbershop(barbershop.id)}
              className={cn(
                "flex items-center justify-between cursor-pointer",
                selectedBarbershopId === barbershop.id && "bg-primary/10"
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span className="truncate flex-1">{barbershop.name}</span>
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
