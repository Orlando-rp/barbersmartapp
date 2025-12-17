import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCEP, validateCEP, fetchAddressByCEP, ViaCEPResponse } from "@/lib/formatters";
import { Loader2, CheckCircle2, AlertCircle, Search } from "lucide-react";

interface CEPInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onAddressFound?: (address: ViaCEPResponse) => void;
  showValidation?: boolean;
}

export const CEPInput = React.forwardRef<HTMLInputElement, CEPInputProps>(
  ({ value, onChange, onAddressFound, showValidation = true, className, ...props }, ref) => {
    const [loading, setLoading] = React.useState(false);
    const [status, setStatus] = React.useState<'idle' | 'found' | 'not_found'>('idle');
    const lastSearchedCEP = React.useRef<string>('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCEP(e.target.value);
      onChange(formatted);
      setStatus('idle');
    };

    const searchAddress = React.useCallback(async () => {
      const numbers = value.replace(/\D/g, '');
      
      if (numbers.length !== 8 || numbers === lastSearchedCEP.current) return;
      
      lastSearchedCEP.current = numbers;
      setLoading(true);
      
      try {
        const address = await fetchAddressByCEP(value);
        if (address) {
          setStatus('found');
          onAddressFound?.(address);
        } else {
          setStatus('not_found');
        }
      } finally {
        setLoading(false);
      }
    }, [value, onAddressFound]);

    // Auto-search when CEP is complete
    React.useEffect(() => {
      const numbers = value.replace(/\D/g, '');
      if (numbers.length === 8 && numbers !== lastSearchedCEP.current) {
        const timer = setTimeout(searchAddress, 500);
        return () => clearTimeout(timer);
      }
    }, [value, searchAddress]);

    const isComplete = value.replace(/\D/g, '').length === 8;

    return (
      <div className="relative">
        <Input
          ref={ref}
          value={value}
          onChange={handleChange}
          className={cn(
            "pr-10",
            showValidation && isComplete && status === 'found' && "border-success focus-visible:ring-success",
            showValidation && isComplete && status === 'not_found' && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : isComplete ? (
            status === 'found' ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : status === 'not_found' ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <Search className="h-4 w-4 text-muted-foreground opacity-50" />
          )}
        </div>
      </div>
    );
  }
);

CEPInput.displayName = "CEPInput";
