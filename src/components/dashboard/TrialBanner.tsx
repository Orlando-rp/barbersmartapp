import { Clock, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { differenceInDays, differenceInHours } from 'date-fns';

export const TrialBanner = () => {
  const navigate = useNavigate();
  const { subscription, loading } = useSubscription();

  if (loading || !subscription?.isTrialing || !subscription?.trialEndsAt) {
    return null;
  }

  const now = new Date();
  const trialEnd = new Date(subscription.trialEndsAt);
  const daysRemaining = differenceInDays(trialEnd, now);
  const hoursRemaining = differenceInHours(trialEnd, now);

  // Don't show if trial already ended
  if (daysRemaining < 0) {
    return null;
  }

  const getTimeText = () => {
    if (daysRemaining === 0) {
      return `${hoursRemaining} horas restantes`;
    }
    if (daysRemaining === 1) {
      return '1 dia restante';
    }
    return `${daysRemaining} dias restantes`;
  };

  const getUrgencyStyles = () => {
    if (daysRemaining <= 3) {
      return 'from-orange-500/20 to-red-500/20 border-orange-500/30';
    }
    return 'from-primary/10 to-primary/20 border-primary/20';
  };

  const getIconColor = () => {
    if (daysRemaining <= 3) {
      return 'text-orange-500';
    }
    return 'text-primary';
  };

  return (
    <div className={`relative overflow-hidden rounded-lg border bg-gradient-to-r ${getUrgencyStyles()} p-4 mb-6`}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full bg-background/50 ${getIconColor()}`}>
            {daysRemaining <= 3 ? (
              <Clock className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="font-semibold text-foreground">
              Período de teste do plano {subscription.planName}
            </p>
            <p className="text-sm text-muted-foreground">
              {getTimeText()} para aproveitar todos os recursos premium
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => navigate('/upgrade')}
          variant={daysRemaining <= 3 ? 'default' : 'outline'}
          className="shrink-0"
        >
          Assinar agora
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-background/50 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${daysRemaining <= 3 ? 'bg-orange-500' : 'bg-primary'}`}
          style={{ width: `${Math.max(0, Math.min(100, ((14 - daysRemaining) / 14) * 100))}%` }}
        />
      </div>
    </div>
  );
};
