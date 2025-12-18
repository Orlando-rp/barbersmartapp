import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  BarChart3, 
  Settings, 
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles
} from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetSelector?: string;
  position: "center" | "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao BarberSmart! 🎉",
    description: "Vamos fazer um tour rápido pelas principais funcionalidades do sistema para você começar a usar com confiança.",
    icon: <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" />,
    position: "center"
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Aqui você tem uma visão geral do seu negócio: agendamentos do dia, receita, clientes e métricas importantes.",
    icon: <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="dashboard"]',
    position: "right"
  },
  {
    id: "appointments",
    title: "Agendamentos",
    description: "Gerencie todos os agendamentos da sua barbearia. Crie, edite e acompanhe o status de cada atendimento.",
    icon: <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="appointments"]',
    position: "right"
  },
  {
    id: "clients",
    title: "Clientes",
    description: "Mantenha o cadastro completo dos seus clientes com histórico de atendimentos, preferências e contatos.",
    icon: <Users className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="clients"]',
    position: "right"
  },
  {
    id: "finance",
    title: "Financeiro",
    description: "Controle suas receitas e despesas, acompanhe o fluxo de caixa e gere relatórios financeiros detalhados.",
    icon: <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="finance"]',
    position: "right"
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    description: "Envie notificações automáticas, lembretes de agendamento e comunique-se com seus clientes via WhatsApp.",
    icon: <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="whatsapp"]',
    position: "right"
  },
  {
    id: "settings",
    title: "Configurações",
    description: "Personalize o sistema: horários de funcionamento, serviços, equipe, integrações e muito mais.",
    icon: <Settings className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="settings"]',
    position: "right"
  },
  {
    id: "complete",
    title: "Tudo pronto! ✨",
    description: "Você está pronto para começar! Explore o sistema e, se precisar de ajuda, acesse as configurações ou entre em contato conosco.",
    icon: <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" />,
    position: "center"
  }
];

interface OnboardingTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingTour({ onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const isMobile = useIsMobile();

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  
  // Em mobile, forçar centro se target não encontrado (sidebar oculta)
  const effectivePosition = isMobile && !targetRect ? "center" : step.position;
  const isCenterStep = effectivePosition === "center";

  const updateTargetPosition = useCallback(() => {
    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [step.targetSelector]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);
    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
    };
  }, [updateTargetPosition]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const getTooltipPosition = () => {
    if (!targetRect || isCenterStep) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)"
      };
    }

    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = isMobile ? Math.min(320, viewportWidth - 32) : 320;
    const tooltipHeight = 220;

    // Calcular posição base
    let top: number;
    let left: number;
    let transform = "";

    switch (step.position) {
      case "right":
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + padding;
        transform = "translateY(-50%)";
        
        // Se não couber à direita, mover para baixo
        if (left + tooltipWidth > viewportWidth - padding) {
          top = targetRect.bottom + padding;
          left = Math.max(padding, Math.min(targetRect.left, viewportWidth - tooltipWidth - padding));
          transform = "";
        }
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - tooltipWidth - padding;
        transform = "translateY(-50%)";
        
        // Se não couber à esquerda, mover para baixo
        if (left < padding) {
          top = targetRect.bottom + padding;
          left = Math.max(padding, Math.min(targetRect.left, viewportWidth - tooltipWidth - padding));
          transform = "";
        }
        break;
      case "bottom":
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2;
        transform = "translateX(-50%)";
        break;
      case "top":
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + targetRect.width / 2;
        transform = "translateX(-50%)";
        
        // Se não couber acima, mover para baixo
        if (top < padding) {
          top = targetRect.bottom + padding;
        }
        break;
      default:
        return {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        };
    }

    // Garantir que fique dentro da viewport
    top = Math.max(padding, Math.min(top, viewportHeight - tooltipHeight - padding));
    
    return {
      top: `${top}px`,
      left: `${left}px`,
      transform
    };
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay with spotlight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70"
        onClick={onSkip}
      />

      {/* Spotlight hole - hidden on mobile when target not visible */}
      <AnimatePresence mode="wait">
        {targetRect && !isCenterStep && !isMobile && (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="absolute bg-transparent rounded-lg ring-4 ring-primary/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              pointerEvents: "none"
            }}
          />
        )}
      </AnimatePresence>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "absolute z-10",
            isMobile && "px-4 w-full",
            !isMobile && !isCenterStep && "w-80"
          )}
          style={getTooltipPosition()}
        >
          <Card className={cn(
            "p-4 sm:p-6 shadow-2xl border-primary/20",
            isCenterStep && "text-center",
            isMobile ? "w-full max-w-[calc(100vw-32px)]" : isCenterStep ? "max-w-md" : ""
          )}>
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 sm:h-8 sm:w-8"
              onClick={onSkip}
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>

            {/* Icon */}
            <div className={cn("mb-3 sm:mb-4", isCenterStep && "flex justify-center")}>
              <div className="p-2 sm:p-3 rounded-full bg-primary/10 text-primary inline-flex">
                {step.icon}
              </div>
            </div>

            {/* Content */}
            <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 pr-6">{step.title}</h3>
            <p className="text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-6">{step.description}</p>

            {/* Progress dots */}
            <div className="flex justify-center gap-1 sm:gap-1.5 mb-3 sm:mb-4">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1 sm:h-1.5 rounded-full transition-all",
                    index === currentStep 
                      ? "w-4 sm:w-6 bg-primary" 
                      : index < currentStep 
                        ? "w-1 sm:w-1.5 bg-primary/50" 
                        : "w-1 sm:w-1.5 bg-muted"
                  )}
                />
              ))}
            </div>

            {/* Navigation - responsive layout */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground text-xs sm:text-sm w-full sm:w-auto"
              >
                <span className="sm:hidden">Pular</span>
                <span className="hidden sm:inline">Pular tour</span>
              </Button>

              <div className="flex gap-2 w-full sm:w-auto">
                {!isFirstStep && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Anterior</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="flex-1 sm:flex-none text-xs sm:text-sm"
                >
                  {isLastStep ? "Começar" : (
                    <>
                      <span className="hidden sm:inline">Próximo</span>
                      <span className="sm:hidden">Avançar</span>
                    </>
                  )}
                  {!isLastStep && <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:ml-1" />}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
