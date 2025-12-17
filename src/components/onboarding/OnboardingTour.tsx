import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    icon: <Sparkles className="h-8 w-8" />,
    position: "center"
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Aqui você tem uma visão geral do seu negócio: agendamentos do dia, receita, clientes e métricas importantes.",
    icon: <BarChart3 className="h-6 w-6" />,
    targetSelector: '[data-tour="dashboard"]',
    position: "right"
  },
  {
    id: "appointments",
    title: "Agendamentos",
    description: "Gerencie todos os agendamentos da sua barbearia. Crie, edite e acompanhe o status de cada atendimento.",
    icon: <Calendar className="h-6 w-6" />,
    targetSelector: '[data-tour="appointments"]',
    position: "right"
  },
  {
    id: "clients",
    title: "Clientes",
    description: "Mantenha o cadastro completo dos seus clientes com histórico de atendimentos, preferências e contatos.",
    icon: <Users className="h-6 w-6" />,
    targetSelector: '[data-tour="clients"]',
    position: "right"
  },
  {
    id: "finance",
    title: "Financeiro",
    description: "Controle suas receitas e despesas, acompanhe o fluxo de caixa e gere relatórios financeiros detalhados.",
    icon: <DollarSign className="h-6 w-6" />,
    targetSelector: '[data-tour="finance"]',
    position: "right"
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    description: "Envie notificações automáticas, lembretes de agendamento e comunique-se com seus clientes via WhatsApp.",
    icon: <MessageSquare className="h-6 w-6" />,
    targetSelector: '[data-tour="whatsapp"]',
    position: "right"
  },
  {
    id: "settings",
    title: "Configurações",
    description: "Personalize o sistema: horários de funcionamento, serviços, equipe, integrações e muito mais.",
    icon: <Settings className="h-6 w-6" />,
    targetSelector: '[data-tour="settings"]',
    position: "right"
  },
  {
    id: "complete",
    title: "Tudo pronto! ✨",
    description: "Você está pronto para começar! Explore o sistema e, se precisar de ajuda, acesse as configurações ou entre em contato conosco.",
    icon: <Sparkles className="h-8 w-8" />,
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

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  const isCenterStep = step.position === "center";

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
    const tooltipWidth = 320;
    const tooltipHeight = 200;

    switch (step.position) {
      case "right":
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + padding}px`,
          transform: "translateY(-50%)"
        };
      case "left":
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.left - tooltipWidth - padding}px`,
          transform: "translateY(-50%)"
        };
      case "bottom":
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)"
        };
      case "top":
        return {
          top: `${targetRect.top - tooltipHeight - padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)"
        };
      default:
        return {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)"
        };
    }
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

      {/* Spotlight hole */}
      <AnimatePresence mode="wait">
        {targetRect && !isCenterStep && (
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
          className="absolute z-10"
          style={{
            ...getTooltipPosition(),
            width: isCenterStep ? "auto" : "320px",
            maxWidth: "90vw"
          }}
        >
          <Card className={`p-6 shadow-2xl border-primary/20 ${isCenterStep ? "text-center max-w-md" : ""}`}>
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={onSkip}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Icon */}
            <div className={`mb-4 ${isCenterStep ? "flex justify-center" : ""}`}>
              <div className="p-3 rounded-full bg-primary/10 text-primary inline-flex">
                {step.icon}
              </div>
            </div>

            {/* Content */}
            <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
            <p className="text-muted-foreground text-sm mb-6">{step.description}</p>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mb-4">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentStep 
                      ? "w-6 bg-primary" 
                      : index < currentStep 
                        ? "w-1.5 bg-primary/50" 
                        : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground"
              >
                Pular tour
              </Button>

              <div className="flex gap-2">
                {!isFirstStep && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleNext}
                >
                  {isLastStep ? "Começar" : "Próximo"}
                  {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
