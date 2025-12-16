import { Toaster as Sonner, toast as sonnerToast } from "sonner"
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      expand={true}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: cn(
            "group toast",
            "group-[.toaster]:bg-card group-[.toaster]:text-card-foreground",
            "group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            "group-[.toaster]:rounded-xl group-[.toaster]:p-4",
            "group-[.toaster]:flex group-[.toaster]:items-start group-[.toaster]:gap-3"
          ),
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: cn(
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            "group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1.5",
            "group-[.toast]:text-sm group-[.toast]:font-medium",
            "group-[.toast]:transition-colors group-[.toast]:hover:bg-primary/90"
          ),
          cancelButton: cn(
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            "group-[.toast]:rounded-md group-[.toast]:px-3 group-[.toast]:py-1.5",
            "group-[.toast]:text-sm group-[.toast]:font-medium"
          ),
          closeButton: cn(
            "group-[.toast]:text-muted-foreground",
            "group-[.toast]:hover:text-foreground",
            "group-[.toast]:transition-colors"
          ),
          success: cn(
            "group-[.toaster]:border-success/30",
            "group-[.toaster]:bg-success/10",
            "[&>div>svg]:text-success"
          ),
          error: cn(
            "group-[.toaster]:border-destructive/30",
            "group-[.toaster]:bg-destructive/10",
            "[&>div>svg]:text-destructive"
          ),
          warning: cn(
            "group-[.toaster]:border-warning/30",
            "group-[.toaster]:bg-warning/10",
            "[&>div>svg]:text-warning"
          ),
          info: cn(
            "group-[.toaster]:border-primary/30",
            "group-[.toaster]:bg-primary/10",
            "[&>div>svg]:text-primary"
          ),
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-success" />,
        error: <XCircle className="h-5 w-5 text-destructive" />,
        warning: <AlertTriangle className="h-5 w-5 text-warning" />,
        info: <Info className="h-5 w-5 text-primary" />,
      }}
      {...props}
    />
  )
}

// Enhanced toast functions with better typing and actions
interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastOptions {
  description?: string
  action?: ToastAction
  cancel?: ToastAction
  duration?: number
  onUndo?: () => void
}

const toast = {
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      description: options?.description,
      action: options?.onUndo 
        ? {
            label: "Desfazer",
            onClick: options.onUndo,
          }
        : options?.action,
      cancel: options?.cancel,
      duration: options?.duration ?? 4000,
    })
  },
  
  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      description: options?.description,
      action: options?.action,
      cancel: options?.cancel,
      duration: options?.duration ?? 6000,
    })
  },
  
  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      description: options?.description,
      action: options?.action,
      cancel: options?.cancel,
      duration: options?.duration ?? 5000,
    })
  },
  
  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      description: options?.description,
      action: options?.action,
      cancel: options?.cancel,
      duration: options?.duration ?? 4000,
    })
  },
  
  // For backward compatibility with existing code
  default: (message: string, options?: ToastOptions) => {
    return sonnerToast(message, {
      description: options?.description,
      action: options?.action,
      cancel: options?.cancel,
      duration: options?.duration ?? 4000,
    })
  },
  
  // Promise-based toast for async operations
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: unknown) => string)
    }
  ) => {
    return sonnerToast.promise(promise, messages)
  },
  
  // Dismiss toast
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId)
  },
}

export { Toaster, toast }
