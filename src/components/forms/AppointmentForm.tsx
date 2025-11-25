import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Clock, User, Scissors } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface AppointmentFormProps {
  onClose?: () => void;
}

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

export const AppointmentForm = ({ onClose }: AppointmentFormProps) => {
  const { barbershopId } = useAuth();
  const { toast } = useToast();
  
  const [date, setDate] = useState<Date>();
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  useEffect(() => {
    if (barbershopId) {
      fetchServices();
      fetchStaff();
    }
  }, [barbershopId]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('active', true);

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar serviços',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('active', true);

      if (error) throw error;
      setStaff(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar equipe',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !clientName || !clientPhone || !selectedService || !selectedBarber || !selectedTime) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Find or create client
      let clientId = null;
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('barbershop_id', barbershopId)
        .eq('phone', clientPhone)
        .single();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            barbershop_id: barbershopId,
            name: clientName,
            phone: clientPhone,
            active: true,
          })
          .select('id')
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Get service details
      const service = services.find(s => s.id === selectedService);

      // Create appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          barbershop_id: barbershopId,
          client_id: clientId,
          staff_id: selectedBarber,
          service_id: selectedService,
          appointment_date: format(date, "yyyy-MM-dd"),
          appointment_time: selectedTime,
          status: 'pendente',
          notes,
          client_name: clientName,
          client_phone: clientPhone,
          service_name: service?.name,
          service_price: service?.price,
        });

      if (appointmentError) throw appointmentError;

      toast({
        title: "Agendamento Criado!",
        description: `Agendamento para ${clientName} em ${format(date, "dd/MM/yyyy")} às ${selectedTime}`,
      });

      onClose?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar agendamento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="barbershop-card w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Novo Agendamento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Nome *</Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Telefone *</Label>
                <Input
                  id="client-phone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          </div>

          {/* Service and Barber */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Serviço e Profissional
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serviço *</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{service.name}</span>
                          <span className="text-sm text-muted-foreground ml-4">
                            {service.duration}min - R$ {service.price}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Barbeiro *</Label>
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o barbeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Data e Horário
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "dd/MM/yyyy") : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[200]" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="p-3 pointer-events-auto z-[200]"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o agendamento..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="premium" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Agendamento'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};