import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Calendar,
  Users,
  DollarSign,
  Scissors,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FABAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  color?: string;
}

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Get contextual actions based on current page
  const getContextualActions = (): FABAction[] => {
    const path = location.pathname;

    // Global actions always available
    const globalActions: FABAction[] = [
      {
        id: "new-appointment",
        label: "Novo Agendamento",
        icon: Calendar,
        action: () => navigate("/appointments?new=true"),
      },
      {
        id: "new-client",
        label: "Novo Cliente",
        icon: Users,
        action: () => navigate("/clients?new=true"),
      },
    ];

    // Page-specific actions
    if (path === "/clients" || path.startsWith("/clients")) {
      return [
        {
          id: "new-client",
          label: "Novo Cliente",
          icon: Users,
          action: () => navigate("/clients?new=true"),
        },
        ...globalActions.filter(a => a.id !== "new-client"),
      ];
    }

    if (path === "/appointments" || path.startsWith("/appointments")) {
      return [
        {
          id: "new-appointment",
          label: "Novo Agendamento",
          icon: Calendar,
          action: () => navigate("/appointments?new=true"),
        },
        ...globalActions.filter(a => a.id !== "new-appointment"),
      ];
    }

    if (path === "/finance" || path.startsWith("/finance")) {
      return [
        {
          id: "new-transaction",
          label: "Nova Transação",
          icon: DollarSign,
          action: () => navigate("/finance?new=true"),
        },
        ...globalActions,
      ];
    }

    if (path === "/services" || path.startsWith("/services")) {
      return [
        {
          id: "new-service",
          label: "Novo Serviço",
          icon: Scissors,
          action: () => navigate("/services?new=true"),
        },
        ...globalActions,
      ];
    }

    if (path === "/staff" || path.startsWith("/staff")) {
      return [
        {
          id: "new-staff",
          label: "Novo Profissional",
          icon: UserCog,
          action: () => navigate("/staff?new=true"),
        },
        ...globalActions,
      ];
    }

    // Default actions for other pages
    return globalActions;
  };

  const actions = getContextualActions();

  const handleActionClick = (action: FABAction) => {
    action.action();
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 lg:hidden">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Action buttons */}
            <div className="absolute bottom-16 right-0 flex flex-col-reverse items-end gap-3">
              {actions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <span className="px-3 py-1.5 bg-card text-foreground text-sm font-medium rounded-lg shadow-lg border border-border">
                    {action.label}
                  </span>
                  <button
                    onClick={() => handleActionClick(action)}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95",
                      "bg-primary text-primary-foreground"
                    )}
                  >
                    <action.icon className="h-5 w-5" />
                  </button>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors",
          "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
      </motion.button>
    </div>
  );
};

export default FloatingActionButton;
