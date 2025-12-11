import { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scissors, Loader2, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDuration } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
}

interface StaffServicesSectionProps {
  barbershopId: string;
  selectedServices: string[];
  onServicesChange: (services: string[]) => void;
}

export const StaffServicesSection = ({
  barbershopId,
  selectedServices,
  onServicesChange,
}: StaffServicesSectionProps) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      fetchServices();
    }
  }, [barbershopId]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      console.log('[StaffServicesSection] Buscando serviços para barbershop_id:', barbershopId);
      
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, duration, category")
        .eq("barbershop_id", barbershopId)
        .eq("active", true)
        .order("category")
        .order("name");

      if (error) {
        console.error("[StaffServicesSection] Erro na query:", error);
        throw error;
      }
      
      console.log('[StaffServicesSection] Serviços encontrados:', data?.length || 0, data);
      setServices(data || []);
    } catch (error) {
      console.error("Erro ao carregar serviços:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleService = useCallback((serviceId: string) => {
    const isSelected = selectedServices.includes(serviceId);
    if (isSelected) {
      onServicesChange(selectedServices.filter((id) => id !== serviceId));
    } else {
      onServicesChange([...selectedServices, serviceId]);
    }
  }, [selectedServices, onServicesChange]);

  const selectAll = useCallback(() => {
    onServicesChange(services.map((s) => s.id));
  }, [services, onServicesChange]);

  const deselectAll = useCallback(() => {
    onServicesChange([]);
  }, [onServicesChange]);

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const category = service.category || "Outros";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Serviços que Atende
            </CardTitle>
            <CardDescription>
              Selecione os serviços que este profissional pode realizar
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-primary hover:underline"
            >
              Selecionar todos
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs text-muted-foreground hover:underline"
            >
              Limpar
            </button>
          </div>
        </div>
        <Badge variant="secondary" className="w-fit mt-2">
          {selectedServices.length} de {services.length} serviços selecionados
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum serviço cadastrado na barbearia
          </p>
        ) : (
          Object.entries(servicesByCategory).map(([category, categoryServices]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {categoryServices.map((service) => {
                  const isSelected = selectedServices.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => handleToggleService(service.id)}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors text-left ${
                        isSelected
                          ? "bg-primary/10 border-primary"
                          : "bg-background hover:bg-muted/50 border-border"
                      }`}
                    >
                      <div className={`flex items-center justify-center w-5 h-5 rounded border ${
                        isSelected 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-muted-foreground/30"
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(service.duration)} • R$ {service.price.toFixed(2)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
