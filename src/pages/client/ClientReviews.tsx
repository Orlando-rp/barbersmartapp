import { useState, useEffect } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Star, Calendar, User, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { IllustratedEmptyState } from '@/components/ui/illustrated-empty-state';
import { cn } from '@/lib/utils';

export default function ClientReviews() {
  const { client, barbershop } = useClientAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  // Check for ?appointment=id parameter
  useEffect(() => {
    const appointmentId = searchParams.get('appointment');
    if (appointmentId) {
      // Fetch the appointment and open dialog
      supabase
        .from('appointments')
        .select(`
          *,
          staff:staff_id(id, user_id, profiles:user_id(full_name)),
          service:service_id(name)
        `)
        .eq('id', appointmentId)
        .single()
        .then(({ data }) => {
          if (data) {
            setSelectedAppointment(data);
            setReviewDialogOpen(true);
          }
        });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch existing reviews
  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ['client-reviews', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];

      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          appointment:appointment_id(
            id,
            appointment_date,
            appointment_time,
            service_name,
            staff:staff_id(id, user_id, profiles:user_id(full_name))
          )
        `)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.id,
  });

  // Fetch pending reviews (completed appointments without reviews)
  const { data: pendingReviews, isLoading: loadingPending } = useQuery({
    queryKey: ['client-pending-reviews-list', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];

      // Get completed appointments
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select(`
          *,
          staff:staff_id(id, user_id, profiles:user_id(full_name)),
          service:service_id(name)
        `)
        .eq('client_id', client.id)
        .eq('status', 'concluido')
        .order('appointment_date', { ascending: false });

      if (apptError) throw apptError;

      // Get reviews for these appointments
      const appointmentIds = appointments?.map(a => a.id) || [];
      if (appointmentIds.length === 0) return [];

      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('appointment_id')
        .in('appointment_id', appointmentIds);

      const reviewedIds = existingReviews?.map(r => r.appointment_id) || [];
      
      return appointments?.filter(a => !reviewedIds.includes(a.id)) || [];
    },
    enabled: !!client?.id,
  });

  // Submit review mutation
  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!client?.id || !selectedAppointment || !barbershop?.id) {
        throw new Error('Dados incompletos');
      }

      const { error } = await supabase
        .from('reviews')
        .insert({
          barbershop_id: barbershop.id,
          client_id: client.id,
          staff_id: selectedAppointment.staff_id,
          appointment_id: selectedAppointment.id,
          rating,
          comment: comment.trim() || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['client-pending-reviews'] });
      toast.success('Avaliação enviada com sucesso!');
      closeReviewDialog();
    },
    onError: () => {
      toast.error('Erro ao enviar avaliação');
    },
  });

  const openReviewDialog = (appointment: any) => {
    setSelectedAppointment(appointment);
    setRating(0);
    setComment('');
    setReviewDialogOpen(true);
  };

  const closeReviewDialog = () => {
    setReviewDialogOpen(false);
    setSelectedAppointment(null);
    setRating(0);
    setComment('');
  };

  const renderStars = (value: number, interactive = false) => {
    const displayRating = interactive ? (hoverRating || rating) : value;
    
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={cn(
              'p-0.5 transition-transform',
              interactive && 'hover:scale-110 cursor-pointer'
            )}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          >
            <Star
              className={cn(
                'h-6 w-6 transition-colors',
                star <= displayRating
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground/30'
              )}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Avaliações</h1>
          <p className="text-muted-foreground">Avalie os serviços que você recebeu</p>
        </div>

        {/* Pending Reviews */}
        {pendingReviews && pendingReviews.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Avaliações Pendentes
              </CardTitle>
              <CardDescription>
                Serviços que você ainda não avaliou
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingPending ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))
              ) : (
                pendingReviews.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border"
                  >
                    <div>
                      <p className="font-medium">{apt.service?.name || apt.service_name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(parseISO(apt.appointment_date), "d 'de' MMM", { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {apt.staff?.profiles?.full_name || 'Profissional'}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => openReviewDialog(apt)}>
                      Avaliar
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Existing Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Minhas Avaliações</CardTitle>
            <CardDescription>
              Avaliações que você já enviou
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReviews ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))
                }
              </div>
            ) : reviews?.length === 0 ? (
              <IllustratedEmptyState
                title="Nenhuma avaliação"
                description="Você ainda não avaliou nenhum serviço."
              />
            ) : (
              <div className="space-y-4">
                {reviews?.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 rounded-lg bg-muted/50 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          {review.appointment?.service_name || 'Serviço'}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {review.appointment?.appointment_date && 
                              format(parseISO(review.appointment.appointment_date), "d 'de' MMM", { locale: ptBR })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {review.appointment?.staff?.profiles?.full_name || 'Profissional'}
                          </span>
                        </div>
                      </div>
                      {renderStars(review.rating)}
                    </div>

                    {review.comment && (
                      <p className="text-sm text-muted-foreground">
                        "{review.comment}"
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Enviada em {format(parseISO(review.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Avaliar Serviço</DialogTitle>
              <DialogDescription>
                Como foi sua experiência?
              </DialogDescription>
            </DialogHeader>

            {selectedAppointment && (
              <div className="space-y-6">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">
                    {selectedAppointment.service?.name || selectedAppointment.service_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(selectedAppointment.appointment_date), "d 'de' MMMM", { locale: ptBR })} • {selectedAppointment.staff?.profiles?.full_name}
                  </p>
                </div>

                <div className="space-y-2 text-center">
                  <Label>Sua avaliação</Label>
                  <div className="flex justify-center">
                    {renderStars(rating, true)}
                  </div>
                  {rating > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {rating === 1 && 'Muito ruim'}
                      {rating === 2 && 'Ruim'}
                      {rating === 3 && 'Regular'}
                      {rating === 4 && 'Bom'}
                      {rating === 5 && 'Excelente'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment">Comentário (opcional)</Label>
                  <Textarea
                    id="comment"
                    placeholder="Conte como foi sua experiência..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={closeReviewDialog}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => submitReviewMutation.mutate()}
                    disabled={rating === 0 || submitReviewMutation.isPending}
                    className="flex-1"
                  >
                    {submitReviewMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Avaliação'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ClientLayout>
  );
}
