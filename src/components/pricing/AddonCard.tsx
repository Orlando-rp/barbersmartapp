import { motion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddonModule } from '@/hooks/useAddonModules';
import {
  MessageSquare,
  Bot,
  Megaphone,
  Gift,
  Calculator,
  BarChart3,
  Building2,
  Palette,
  Package
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  'message-square': MessageSquare,
  'bot': Bot,
  'megaphone': Megaphone,
  'gift': Gift,
  'calculator': Calculator,
  'bar-chart-3': BarChart3,
  'building-2': Building2,
  'palette': Palette,
  'package': Package,
};

interface AddonCardProps {
  addon: AddonModule;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export const AddonCard = ({ 
  addon, 
  selected, 
  onToggle, 
  disabled = false,
  compact = false 
}: AddonCardProps) => {
  const Icon = iconMap[addon.icon] || Package;

  if (compact) {
    return (
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border transition-all text-left w-full",
          selected
            ? "bg-amber-500/20 border-amber-500/50"
            : "bg-white/5 border-white/10 hover:border-white/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          selected ? "bg-amber-500" : "bg-white/10"
        )}>
          <Icon className={cn("w-4 h-4", selected ? "text-black" : "text-white/70")} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-white truncate">{addon.name}</div>
          <div className="text-xs text-white/50">+R$ {addon.price.toFixed(2)}/mês</div>
        </div>
        
        <div className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
          selected ? "bg-amber-500 border-amber-500" : "border-white/30"
        )}>
          {selected && <Check className="w-3 h-3 text-black" />}
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "relative flex flex-col p-4 rounded-2xl border transition-all text-left group",
        selected
          ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/50 shadow-lg shadow-amber-500/10"
          : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Selection indicator */}
      <div className={cn(
        "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
        selected 
          ? "bg-amber-500 border-amber-500" 
          : "border-white/30 group-hover:border-white/50"
      )}>
        {selected ? (
          <Check className="w-4 h-4 text-black" />
        ) : (
          <Plus className="w-4 h-4 text-white/50 group-hover:text-white/70" />
        )}
      </div>

      {/* Icon */}
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors",
        selected ? "bg-amber-500" : "bg-white/10 group-hover:bg-white/15"
      )}>
        <Icon className={cn("w-6 h-6", selected ? "text-black" : "text-white/70")} />
      </div>

      {/* Content */}
      <h3 className="font-semibold text-white mb-1 pr-8">{addon.name}</h3>
      <p className="text-sm text-white/50 mb-3 line-clamp-2">{addon.description}</p>

      {/* Price */}
      <div className="mt-auto">
        <div className="flex items-baseline gap-1">
          <span className="text-xs text-white/40">+R$</span>
          <span className={cn(
            "text-xl font-bold",
            selected ? "text-amber-400" : "text-white"
          )}>
            {addon.price.toFixed(2).replace('.', ',')}
          </span>
          <span className="text-xs text-white/40">/mês</span>
        </div>
      </div>
    </motion.button>
  );
};

export default AddonCard;
