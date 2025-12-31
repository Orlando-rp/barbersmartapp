import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Calendar, DollarSign, User, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivityItem {
  id: string;
  type: "appointment" | "payment" | "client" | "cancellation";
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
  };
  amount?: number;
  status?: "completed" | "pending" | "cancelled";
}

const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "appointment",
    title: "Agendamento confirmado",
    description: "Carlos Silva agendou Corte + Barba para hoje às 14:30",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    user: { name: "Carlos Silva" },
    status: "pending"
  },
  {
    id: "2",
    type: "payment",
    title: "Pagamento recebido",
    description: "Pedro Santos pagou R$ 35,00 por Corte Social",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    user: { name: "Pedro Santos" },
    amount: 35,
    status: "completed"
  },
  {
    id: "3",
    type: "client",
    title: "Novo cliente cadastrado",
    description: "Rafael Lima foi cadastrado no sistema",
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    user: { name: "Rafael Lima" },
    status: "completed"
  },
  {
    id: "4",
    type: "appointment",
    title: "Serviço concluído",
    description: "João Silva finalizou o atendimento de Maria Santos",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    user: { name: "Maria Santos" },
    status: "completed"
  },
  {
    id: "5",
    type: "cancellation",
    title: "Agendamento cancelado",
    description: "Bruno Costa cancelou seu agendamento das 16:00",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    user: { name: "Bruno Costa" },
    status: "cancelled"
  }
];

export const LiveActivityFeed = () => {
  const [activities, setActivities] = useState(mockActivities);
  const [isLive, setIsLive] = useState(true);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      // Randomly add new activity
      if (Math.random() > 0.7) {
        const newActivity: ActivityItem = {
          id: Date.now().toString(),
          type: "appointment",
          title: "Nova atividade",
          description: "Sistema simulando atividade em tempo real",
          timestamp: new Date(),
          status: "pending"
        };
        
        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
      }
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [isLive]);

  const getActivityIcon = (type: string, status?: string) => {
    switch (type) {
      case "appointment":
        return status === "completed" ? 
          <CheckCircle2 className="h-4 w-4 text-success" /> : 
          <Calendar className="h-4 w-4 text-primary" />;
      case "payment":
        return <DollarSign className="h-4 w-4 text-success" />;
      case "client":
        return <User className="h-4 w-4 text-primary" />;
      case "cancellation":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-success text-success-foreground">Concluído</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="barbershop-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Atividades Recentes
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-success animate-pulse' : 'bg-muted'}`} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLive(!isLive)}
            className="text-xs"
          >
            {isLive ? 'Ao vivo' : 'Pausado'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          <div className="space-y-1 p-4">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-300 hover:bg-accent/50 ${
                  index === 0 ? 'animate-fade-in' : ''
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type, activity.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.title}
                    </p>
                    <div className="flex items-center space-x-2">
                      {activity.amount && (
                        <span className="text-sm font-medium text-success">
                          R$ {activity.amount.toFixed(2)}
                        </span>
                      )}
                      {getStatusBadge(activity.status)}
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    {activity.user && (
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={activity.user.avatar || undefined} />
                          <AvatarFallback className="text-xs">
                            {activity.user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {activity.user.name}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(activity.timestamp, { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};