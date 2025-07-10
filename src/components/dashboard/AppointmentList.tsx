import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Scissors, Calendar } from "lucide-react";

interface Appointment {
  id: string;
  clientName: string;
  clientAvatar?: string;
  service: string;
  time: string;
  duration: string;
  status: "confirmed" | "pending" | "completed" | "cancelled";
  barber: string;
}

const mockAppointments: Appointment[] = [
  {
    id: "1",
    clientName: "Carlos Silva",
    service: "Corte + Barba",
    time: "09:00",
    duration: "45min",
    status: "confirmed",
    barber: "João"
  },
  {
    id: "2",
    clientName: "Pedro Santos",
    service: "Corte Social",
    time: "10:30",
    duration: "30min",
    status: "pending",
    barber: "João"
  },
  {
    id: "3",
    clientName: "Rafael Lima",
    service: "Barba",
    time: "11:15",
    duration: "25min",
    status: "confirmed",
    barber: "João"
  },
  {
    id: "4",
    clientName: "Lucas Oliveira",
    service: "Corte + Sobrancelha",
    time: "14:00",
    duration: "40min",
    status: "confirmed",
    barber: "João"
  }
];

const AppointmentList = () => {
  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return "bg-success text-success-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      case "completed":
        return "bg-primary text-primary-foreground";
      case "cancelled":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getStatusText = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmed":
        return "Confirmado";
      case "pending":
        return "Pendente";
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  return (
    <Card className="barbershop-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Próximos Agendamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockAppointments.map((appointment) => (
          <div
            key={appointment.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={appointment.clientAvatar} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {appointment.clientName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex flex-col">
                <div className="font-medium text-foreground">{appointment.clientName}</div>
                <div className="flex items-center text-sm text-muted-foreground space-x-2">
                  <Scissors className="h-3 w-3" />
                  <span>{appointment.service}</span>
                  <span>•</span>
                  <User className="h-3 w-3" />
                  <span>{appointment.barber}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="flex items-center text-sm font-medium text-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {appointment.time}
                </div>
                <div className="text-xs text-muted-foreground">{appointment.duration}</div>
              </div>
              
              <Badge className={getStatusColor(appointment.status)}>
                {getStatusText(appointment.status)}
              </Badge>
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t border-border">
          <Button variant="outline" className="w-full">
            Ver Todos os Agendamentos
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentList;