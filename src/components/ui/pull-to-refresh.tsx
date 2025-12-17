import { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface PullToRefreshContainerProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const PullToRefreshContainer = ({
  children,
  onRefresh,
  disabled = false,
  className,
}: PullToRefreshContainerProps) => {
  const { containerRef, pullDistance, pullProgress, isRefreshing } = usePullToRefresh({
    onRefresh,
    disabled,
  });

  const showIndicator = pullDistance > 10 || isRefreshing;
  const indicatorHeight = Math.min(pullDistance, 60);

  return (
    <div 
      ref={containerRef} 
      className={cn("relative", className)}
    >
      {/* Pull indicator - mobile only */}
      <div 
        className={cn(
          "lg:hidden absolute left-0 right-0 flex flex-col items-center justify-center transition-all duration-200 z-10 pointer-events-none overflow-hidden",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{ 
          height: `${indicatorHeight}px`,
          top: 0,
        }}
      >
        <div 
          className={cn(
            "flex items-center justify-center rounded-full bg-primary/10 p-2",
            isRefreshing && "animate-pulse"
          )}
          style={{
            transform: `rotate(${pullProgress * 360}deg)`,
          }}
        >
          <RefreshCw 
            className={cn(
              "h-5 w-5 text-primary",
              isRefreshing && "animate-spin"
            )}
          />
        </div>
        <span className="text-xs text-muted-foreground mt-1">
          {isRefreshing ? "Atualizando..." : pullProgress >= 1 ? "Solte para atualizar" : "Puxe para atualizar"}
        </span>
      </div>

      {/* Content with transform on mobile when pulling */}
      <div 
        className="transition-transform duration-200 ease-out"
        style={{ 
          transform: pullDistance > 10 ? `translateY(${indicatorHeight}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
};
