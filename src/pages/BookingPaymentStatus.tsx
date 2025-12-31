import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface AppointmentDetails {
  id: string;
  appointment_date: string;
  appointment_time: string;
  service_name: string;
  service_price: number;
  payment_amount: number | null;
  staff: { name: string } | null;
  barbershop: { name: string; id: string } | null;
}

type PaymentStatus = 'success' | 'failure' | 'pending';

export default function BookingPaymentStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);

  const status = (searchParams.get('status') || 'pending') as PaymentStatus;
  const paymentId = searchParams.get('payment_id');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    const loadAppointment = async () => {
      if (!externalReference) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            appointment_date,
            appointment_time,
            service_name,
            service_price,
            payment_amount,
            staff:staff_id(name),
            barbershop:barbershop_id(name, id)
          `)
          .eq('id', externalReference)
          .maybeSingle();

        if (!error && data) {
          setAppointment(data as unknown as AppointmentDetails);
        }
      } catch (error) {
        console.error('Error loading appointment:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAppointment();
  }, [externalReference]);

  const statusConfig = {
    success: {
      icon: CheckCircle2,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      title: 'Pagamento Confirmado!',
      description: 'Seu agendamento foi confirmado com sucesso.',
      message: 'Você receberá uma confirmação por WhatsApp em breve.',
    },
    failure: {
      icon: XCircle,
      iconColor: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
      title: 'Pagamento não Aprovado',
      description: 'Houve um problema com seu pagamento.',
      message: 'Seu agendamento foi registrado, mas o pagamento não foi processado. Você pode pagar no local ou tentar novamente.',
    },
    pending: {
      icon: Clock,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      title: 'Pagamento em Processamento',
      description: 'Seu pagamento está sendo analisado.',
      message: 'Assim que o pagamento for confirmado, você receberá uma notificação por WhatsApp.',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const handleNewBooking = () => {
    if (appointment?.barbershop?.id) {
      navigate(`/agendar/${appointment.barbershop.id}`);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className={`border-2 ${config.borderColor} overflow-hidden`}>
          <div className={`${config.bgColor} p-8 flex flex-col items-center`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <Icon className={`h-20 w-20 ${config.iconColor}`} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold mt-4 text-center"
            >
              {config.title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground text-center mt-2"
            >
              {config.description}
            </motion.p>
          </div>

          <CardContent className="p-6 space-y-6">
            {appointment && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4"
              >
                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Data e Horário</p>
                      <p className="font-medium capitalize">
                        {formatDate(appointment.appointment_date)} às {appointment.appointment_time}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Serviço</p>
                        <p className="font-medium">{appointment.service_name}</p>
                      </div>
                      <p className="font-bold text-lg text-accent">
                        R$ {(appointment.payment_amount || appointment.service_price).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {appointment.staff && (
                    <div className="border-t border-border pt-3">
                      <p className="text-sm text-muted-foreground">Profissional</p>
                      <p className="font-medium">{appointment.staff.name}</p>
                    </div>
                  )}

                  {appointment.barbershop && (
                    <div className="border-t border-border pt-3">
                      <p className="text-sm text-muted-foreground">Local</p>
                      <p className="font-medium">{appointment.barbershop.name}</p>
                    </div>
                  )}
                </div>

                {paymentId && (
                  <p className="text-xs text-muted-foreground text-center">
                    ID do pagamento: {paymentId}
                  </p>
                )}
              </motion.div>
            )}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-muted-foreground text-center"
            >
              {config.message}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-col gap-3"
            >
              <Button onClick={handleNewBooking} className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                Fazer Novo Agendamento
              </Button>

              {status === 'failure' && appointment?.barbershop?.id && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/agendar/${appointment.barbershop!.id}`)}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
              )}
            </motion.div>
          </CardContent>
        </Card>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          Powered by Barber Smart
        </motion.p>
      </motion.div>
    </div>
  );
}
