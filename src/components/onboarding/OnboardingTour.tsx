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
  Sparkles,
  Scissors,
  UserCog,
  Clock,
  Menu
} from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetSelector?: string;
  mobileTargetSelector?: string;
  position: "center" | "top" | "bottom" | "left" | "right";
  mobileHint?: string;
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao Barber Smart! 🎉",
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
    mobileTargetSelector: '[data-tour="dashboard"]',
    position: "right",
    mobileHint: "Toque em 'Início' na barra inferior"
  },
  {
    id: "appointments",
    title: "Agendamentos",
    description: "Gerencie todos os agendamentos da sua barbearia. Crie, edite e acompanhe o status de cada atendimento.",
    icon: <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="appointments"]',
    mobileTargetSelector: '[data-tour="appointments"]',
    position: "right",
    mobileHint: "Toque em 'Agenda' na barra inferior"
  },
  {
    id: "clients",
    title: "Clientes",
    description: "Mantenha o cadastro completo dos seus clientes com histórico de atendimentos, preferências e contatos.",
    icon: <Users className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="clients"]',
    mobileTargetSelector: '[data-tour="clients"]',
    position: "right",
    mobileHint: "Toque em 'Clientes' na barra inferior"
  },
  {
    id: "services",
    title: "Serviços",
    description: "Cadastre seus cortes, barbas e combos com preços, duração e categorias personalizadas.",
    icon: <Scissors className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="services"]',
    mobileTargetSelector: '[data-tour="services"]',
    position: "right",
    mobileHint: "Acesse via 'Mais' na barra inferior"
  },
  {
    id: "staff",
    title: "Equipe",
    description: "Gerencie barbeiros, horários de trabalho e comissões de cada profissional da sua equipe.",
    icon: <UserCog className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="staff"]',
    mobileTargetSelector: '[data-tour="staff"]',
    position: "right",
    mobileHint: "Acesse via 'Mais' na barra inferior"
  },
  {
    id: "finance",
    title: "Financeiro",
    description: "Controle suas receitas e despesas, acompanhe o fluxo de caixa e gere relatórios financeiros detalhados.",
    icon: <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="finance"]',
    mobileTargetSelector: '[data-tour="finance"]',
    position: "right",
    mobileHint: "Toque em 'Financeiro' na barra inferior"
  },
  {
    id: "reports",
    title: "Relatórios",
    description: "Acompanhe métricas de desempenho, tendências do negócio e tome decisões baseadas em dados.",
    icon: <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="reports"]',
    mobileTargetSelector: '[data-tour="reports"]',
    position: "right",
    mobileHint: "Acesse via 'Mais' na barra inferior"
  },
  {
    id: "hours",
    title: "Horários de Funcionamento",
    description: "Configure os horários de funcionamento da barbearia, intervalos e folgas da equipe.",
    icon: <Clock className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="hours"]',
    mobileTargetSelector: '[data-tour="hours"]',
    position: "right",
    mobileHint: "Acesse via 'Mais' na barra inferior"
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    description: "Envie notificações automáticas, lembretes de agendamento e comunique-se com seus clientes via WhatsApp.",
    icon: <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="whatsapp"]',
    mobileTargetSelector: '[data-tour="whatsapp"]',
    position: "right",
    mobileHint: "Acesse via 'Mais' na barra inferior"
  },
  {
    id: "settings",
    title: "Configurações",
    description: "Personalize o sistema: horários de funcionamento, serviços, equipe, integrações e muito mais.",
    icon: <Settings className="h-5 w-5 sm:h-6 sm:w-6" />,
    targetSelector: '[data-tour="settings"]',
    mobileTargetSelector: '[data-tour="settings"]',
    position: "right",
    mobileHint: "Acesse via 'Mais' na barra inferior"
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
  
  // Verificar se deve mostrar dica mobile
  const showMobileHint = isMobile && !targetRect && step.mobileHint;

  const updateTargetPosition = useCallback(() => {
    // Em mobile, tenta primeiro o seletor mobile, depois o normal
    const selector = isMobile ? (step.mobileTargetSelector || step.targetSelector) : step.targetSelector;
    
    if (selector) {
      const element = document.querySelector(selector) as HTMLElement | null;
      // Verificar se elemento está visível (não está em sidebar oculta)
      if (element && element.offsetParent !== null) {
        const rect = element.getBoundingClientRect();
        // Verificar se está dentro da viewport
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
          setTargetRect(rect);
          return;
        }
      }
      setTargetRect(null);
    } else {
      setTargetRect(null);
    }
  }, [step.targetSelector, step.mobileTargetSelector, isMobile]);

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

  const getTooltipPosition = (): React.CSSProperties => {
    // Em mobile centralizado, não aplicar style (usar flexbox do container)
    if (isMobile && isCenterStep) {
      return {};
    }
    
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
    const tooltipHeight = 280; // Altura mais realista

    let top: number;
    let left: number;
    let transform = "";

    switch (step.position) {
      case "right":
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.right + padding;
        transform = "translateY(-50%)";
        
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
          className={cn(
            "z-10",
            // Mobile centralizado: usar flexbox
            isMobile && isCenterStep && "fixed inset-0 flex items-center justify-center p-4 pb-20",
            // Mobile não centralizado: posicionar absolute
            isMobile && !isCenterStep && "absolute px-4 w-full",
            // Desktop não centralizado
            !isMobile && !isCenterStep && "absolute w-80",
            // Desktop centralizado
            !isMobile && isCenterStep && "absolute"
          )}
          style={getTooltipPosition()}
        >
          <Card className={cn(
            "shadow-2xl border-primary/20 flex flex-col",
            isCenterStep && "text-center",
            // Mobile: card com max-height e scroll
            isMobile 
              ? "w-full max-w-sm max-h-[calc(100vh-120px)] p-4" 
              : isCenterStep 
                ? "max-w-md p-6" 
                : "p-6"
          )}>
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 sm:h-8 sm:w-8 shrink-0"
              onClick={onSkip}
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Icon */}
              <div className={cn("mb-3 sm:mb-4", isCenterStep && "flex justify-center")}>
                <div className="p-2 sm:p-3 rounded-full bg-primary/10 text-primary inline-flex">
                  {step.icon}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 pr-6">{step.title}</h3>
              <p className="text-muted-foreground text-xs sm:text-sm mb-3 sm:mb-4">{step.description}</p>

              {/* Mobile hint when element not visible */}
              {showMobileHint && (
                <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 rounded-lg p-2 mb-3">
                  <Menu className="h-4 w-4 shrink-0" />
                  <span>{step.mobileHint}</span>
                </div>
              )}
            </div>

            {/* Fixed footer area - always visible */}
            <div className="shrink-0 pt-3 border-t border-border/50 mt-3">
              {/* Progress dots */}
              <div className="flex justify-center gap-1 sm:gap-1.5 mb-3">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === currentStep 
                        ? "w-5 bg-primary" 
                        : index < currentStep 
                          ? "w-1.5 bg-primary/50" 
                          : "w-1.5 bg-muted"
                    )}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-muted-foreground text-xs"
                >
                  Pular
                </Button>

                <div className="flex gap-2">
                  {!isFirstStep && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      className="text-xs px-3"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="text-xs px-4"
                  >
                    {isLastStep ? "Começar" : "Próximo"}
                    {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}