import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCPFOrCNPJ, validateCPFOrCNPJ } from "@/lib/formatters";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface CPFCNPJInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  showValidation?: boolean;
}

export const CPFCNPJInput = React.forwardRef<HTMLInputElement, CPFCNPJInputProps>(
  ({ value, onChange, showValidation = true, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCPFOrCNPJ(e.target.value);
      onChange(formatted);
    };

    const validation = validateCPFOrCNPJ(value);
    const numbers = value.replace(/\D/g, '');
    const hasValue = numbers.length > 0;
    const isComplete = numbers.length === 11 || numbers.length === 14;

    return (
      <div className="relative">
        <Input
          ref={ref}
          value={value}
          onChange={handleChange}
          className={cn(
            showValidation && hasValue && isComplete && (
              validation.valid 
                ? "pr-10 border-success focus-visible:ring-success" 
                : "pr-10 border-destructive focus-visible:ring-destructive"
            ),
            className
          )}
          {...props}
        />
        {showValidation && hasValue && isComplete && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {validation.valid ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
        )}
      </div>
    );
  }
);

CPFCNPJInput.displayName = "CPFCNPJInput";
