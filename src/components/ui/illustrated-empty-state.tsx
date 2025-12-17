import { ReactNode } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface IllustratedEmptyStateProps {
  illustration: 'calendar' | 'users' | 'services' | 'finance' | 'marketing' | 'reviews' | 'generic';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  children?: ReactNode;
}

const illustrations = {
  calendar: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="30" y="30" width="140" height="110" rx="8" className="fill-muted stroke-border" strokeWidth="2"/>
      <rect x="30" y="30" width="140" height="28" rx="8" className="fill-primary/10"/>
      <rect x="30" y="50" width="140" height="8" className="fill-primary/20"/>
      <circle cx="55" cy="44" r="6" className="fill-primary/60"/>
      <circle cx="145" cy="44" r="6" className="fill-primary/60"/>
      <rect x="45" y="70" width="24" height="20" rx="4" className="fill-muted-foreground/10"/>
      <rect x="78" y="70" width="24" height="20" rx="4" className="fill-muted-foreground/10"/>
      <rect x="111" y="70" width="24" height="20" rx="4" className="fill-muted-foreground/10"/>
      <rect x="144" y="70" width="14" height="20" rx="4" className="fill-muted-foreground/10"/>
      <rect x="45" y="98" width="24" height="20" rx="4" className="fill-muted-foreground/10"/>
      <rect x="78" y="98" width="24" height="20" rx="4" className="fill-primary/30"/>
      <rect x="111" y="98" width="24" height="20" rx="4" className="fill-muted-foreground/10"/>
      <rect x="144" y="98" width="14" height="20" rx="4" className="fill-muted-foreground/10"/>
      <path d="M86 108 L92 114 L102 102" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <circle cx="100" cy="55" r="28" className="fill-muted stroke-border" strokeWidth="2"/>
      <circle cx="100" cy="48" r="12" className="fill-primary/30"/>
      <path d="M82 68 Q100 82 118 68" className="fill-primary/20"/>
      <path d="M55 130 Q100 95 145 130" className="fill-muted stroke-border" strokeWidth="2"/>
      <circle cx="55" cy="75" r="18" className="fill-muted/80 stroke-border" strokeWidth="1.5"/>
      <circle cx="55" cy="70" r="7" className="fill-primary/20"/>
      <path d="M45 82 Q55 90 65 82" className="fill-primary/10"/>
      <circle cx="145" cy="75" r="18" className="fill-muted/80 stroke-border" strokeWidth="1.5"/>
      <circle cx="145" cy="70" r="7" className="fill-primary/20"/>
      <path d="M135 82 Q145 90 155 82" className="fill-primary/10"/>
      <path d="M88 108 L90 102 L94 108 L92 114 Z" className="fill-primary/40"/>
      <path d="M106 108 L108 102 L112 108 L110 114 Z" className="fill-primary/40"/>
    </svg>
  ),
  services: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="25" y="40" width="65" height="80" rx="8" className="fill-muted stroke-border" strokeWidth="2"/>
      <rect x="35" y="50" width="45" height="30" rx="4" className="fill-primary/10"/>
      <rect x="35" y="88" width="30" height="6" rx="2" className="fill-muted-foreground/30"/>
      <rect x="35" y="100" width="45" height="4" rx="2" className="fill-muted-foreground/15"/>
      <rect x="35" y="108" width="35" height="4" rx="2" className="fill-muted-foreground/15"/>
      <rect x="110" y="40" width="65" height="80" rx="8" className="fill-muted stroke-border" strokeWidth="2"/>
      <rect x="120" y="50" width="45" height="30" rx="4" className="fill-primary/20"/>
      <rect x="120" y="88" width="30" height="6" rx="2" className="fill-muted-foreground/30"/>
      <rect x="120" y="100" width="45" height="4" rx="2" className="fill-muted-foreground/15"/>
      <rect x="120" y="108" width="35" height="4" rx="2" className="fill-muted-foreground/15"/>
      <circle cx="100" cy="130" r="4" className="fill-muted-foreground/30"/>
      <circle cx="88" cy="130" r="3" className="fill-muted-foreground/20"/>
      <circle cx="112" cy="130" r="3" className="fill-muted-foreground/20"/>
    </svg>
  ),
  finance: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="30" y="35" width="140" height="90" rx="10" className="fill-muted stroke-border" strokeWidth="2"/>
      <rect x="45" y="50" width="50" height="8" rx="2" className="fill-primary/30"/>
      <rect x="45" y="65" width="80" height="4" rx="2" className="fill-muted-foreground/20"/>
      <rect x="45" y="85" width="110" height="25" rx="4" className="fill-background stroke-border"/>
      <text x="55" y="102" className="fill-primary text-lg font-bold" fontSize="14">R$ 0,00</text>
      <circle cx="155" cy="55" r="12" className="fill-primary/20 stroke-primary/40" strokeWidth="1.5"/>
      <text x="151" y="60" className="fill-primary" fontSize="12">$</text>
      <path d="M40 130 L60 115 L80 120 L100 105 L120 110 L140 95 L160 100" className="stroke-primary/40" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <circle cx="100" cy="105" r="3" className="fill-primary"/>
    </svg>
  ),
  marketing: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path d="M40 80 L80 50 L80 110 Z" className="fill-primary/20 stroke-primary/40" strokeWidth="2"/>
      <rect x="80" y="55" width="80" height="50" rx="4" className="fill-muted stroke-border" strokeWidth="2"/>
      <rect x="90" y="65" width="40" height="6" rx="2" className="fill-primary/30"/>
      <rect x="90" y="78" width="60" height="4" rx="2" className="fill-muted-foreground/20"/>
      <rect x="90" y="88" width="50" height="4" rx="2" className="fill-muted-foreground/20"/>
      <circle cx="155" cy="40" r="15" className="fill-primary/10 stroke-primary/30" strokeWidth="1.5"/>
      <path d="M150 40 L155 35 L160 40 L155 45 Z" className="fill-primary/40"/>
      <circle cx="45" cy="130" r="10" className="fill-muted stroke-border"/>
      <circle cx="75" cy="125" r="8" className="fill-muted stroke-border"/>
      <circle cx="100" cy="130" r="6" className="fill-muted stroke-border"/>
    </svg>
  ),
  reviews: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="35" y="40" width="130" height="80" rx="8" className="fill-muted stroke-border" strokeWidth="2"/>
      <path d="M60 70 L64 78 L73 79 L67 85 L68 94 L60 90 L52 94 L53 85 L47 79 L56 78 Z" className="fill-primary/40 stroke-primary/60" strokeWidth="1"/>
      <path d="M90 70 L94 78 L103 79 L97 85 L98 94 L90 90 L82 94 L83 85 L77 79 L86 78 Z" className="fill-primary/40 stroke-primary/60" strokeWidth="1"/>
      <path d="M120 70 L124 78 L133 79 L127 85 L128 94 L120 90 L112 94 L113 85 L107 79 L116 78 Z" className="fill-primary/40 stroke-primary/60" strokeWidth="1"/>
      <path d="M150 70 L154 78 L163 79 L157 85 L158 94 L150 90 L142 94 L143 85 L137 79 L146 78 Z" className="fill-muted-foreground/20 stroke-muted-foreground/30" strokeWidth="1"/>
      <rect x="50" y="102" width="100" height="6" rx="2" className="fill-muted-foreground/20"/>
      <path d="M100 130 L90 145 L110 145 Z" className="fill-muted stroke-border" strokeWidth="2"/>
    </svg>
  ),
  generic: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect x="50" y="35" width="100" height="90" rx="8" className="fill-muted stroke-border" strokeWidth="2"/>
      <rect x="65" y="50" width="70" height="8" rx="2" className="fill-primary/20"/>
      <rect x="65" y="68" width="50" height="4" rx="2" className="fill-muted-foreground/20"/>
      <rect x="65" y="78" width="60" height="4" rx="2" className="fill-muted-foreground/15"/>
      <rect x="65" y="88" width="40" height="4" rx="2" className="fill-muted-foreground/15"/>
      <circle cx="100" cy="110" r="8" className="fill-primary/10 stroke-primary/30" strokeWidth="1.5"/>
      <path d="M97 110 L100 107 L103 110 L100 113 Z" className="fill-primary/40"/>
      <circle cx="40" cy="80" r="6" className="fill-muted-foreground/10"/>
      <circle cx="160" cy="80" r="6" className="fill-muted-foreground/10"/>
      <circle cx="100" cy="145" r="4" className="fill-muted-foreground/20"/>
    </svg>
  ),
};

export const IllustratedEmptyState = ({
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  children,
}: IllustratedEmptyStateProps) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      <div className="w-48 h-40 mb-6 opacity-80">
        {illustrations[illustration]}
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {description}
      </p>

      {children}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} className="min-w-[140px]">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction} className="min-w-[140px]">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
