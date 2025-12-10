import { useAuth } from "@/contexts/AuthContext";
import { Building2, ChevronDown, Check } from "lucide-react";
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

const BarbershopSelector = () => {
  const { barbershops, selectedBarbershopId, setSelectedBarbershop } = useAuth();

  // Don't show selector if user has only one barbershop
  if (barbershops.length <= 1) {
    return null;
  }

  const selectedBarbershop = barbershops.find(b => b.id === selectedBarbershopId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 max-w-[280px] sm:max-w-none justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="truncate">
              {selectedBarbershopId === null 
                ? 'Todas as Unidades' 
                : (selectedBarbershop?.name || 'Selecionar Unidade')
              }
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[280px] sm:w-[320px]" align="start">
        <DropdownMenuLabel>Suas Unidades</DropdownMenuLabel>
        <DropdownMenuSeparator />
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setSelectedBarbershop(null)}
          className={cn(
            "flex items-center justify-between cursor-pointer",
            selectedBarbershopId === null && "bg-primary/10"
          )}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>Todas as Unidades</span>
          </div>
          {selectedBarbershopId === null && (
            <Check className="h-4 w-4 text-primary" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BarbershopSelector;
