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
        <Button variant="outline" className="gap-2 min-w-[180px] justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="truncate max-w-[120px]">
              {selectedBarbershop?.name || 'Selecionar Unidade'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[220px]" align="start">
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
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="truncate">{barbershop.name}</span>
              {barbershop.is_primary && (
                <Badge variant="secondary" className="text-xs">
                  Principal
                </Badge>
              )}
            </div>
            {selectedBarbershopId === barbershop.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setSelectedBarbershop(null)}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            selectedBarbershopId === null && "bg-primary/10"
          )}
        >
          <Building2 className="h-4 w-4" />
          <span>Todas as Unidades</span>
          {selectedBarbershopId === null && (
            <Check className="h-4 w-4 text-primary ml-auto" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BarbershopSelector;
