import { useBranding } from "@/contexts/BrandingContext";
import { Smartphone } from "lucide-react";

interface PWAInstallPreviewProps {
  /** URL do ícone customizado para preview (sobrescreve o branding) */
  customIconUrl?: string;
  /** Nome do app customizado para preview (sobrescreve o branding) */
  customAppName?: string;
  /** Variante de tema do preview */
  variant?: "light" | "dark";
}

/**
 * Componente de preview visual mostrando como o app aparecerá
 * quando instalado como PWA no celular do usuário
 */
export const PWAInstallPreview = ({ 
  customIconUrl, 
  customAppName,
  variant = "dark" 
}: PWAInstallPreviewProps) => {
  const { effectiveBranding } = useBranding();
  
  // Prioridade: customIconUrl > logo_icon_url > favicon_url > logo_url
  const iconUrl = customIconUrl || 
    effectiveBranding?.logo_icon_url || 
    effectiveBranding?.favicon_url || 
    effectiveBranding?.logo_url ||
    "/pwa-192x192.png";
  
  const appName = customAppName || 
    effectiveBranding?.system_name || 
    "Barber Smart";

  // Truncar nome do app para caber na tela
  const displayName = appName.length > 12 ? appName.substring(0, 11) + "…" : appName;

  const isDark = variant === "dark";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* iPhone Frame */}
      <div 
        className={`relative w-[180px] h-[360px] rounded-[32px] p-1.5 shadow-2xl ${
          isDark 
            ? "bg-gradient-to-b from-zinc-700 to-zinc-900" 
            : "bg-gradient-to-b from-zinc-300 to-zinc-400"
        }`}
      >
        {/* Screen bezel */}
        <div 
          className={`relative w-full h-full rounded-[26px] overflow-hidden ${
            isDark 
              ? "bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900" 
              : "bg-gradient-to-b from-slate-100 via-white to-slate-50"
          }`}
        >
          {/* Dynamic Island / Notch */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />
          
          {/* Status Bar */}
          <div className={`absolute top-2 left-4 right-4 flex justify-between items-center text-[8px] font-medium ${
            isDark ? "text-white" : "text-black"
          }`}>
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                <div className={`w-1 h-1.5 rounded-sm ${isDark ? "bg-white" : "bg-black"}`} />
                <div className={`w-1 h-2 rounded-sm ${isDark ? "bg-white" : "bg-black"}`} />
                <div className={`w-1 h-2.5 rounded-sm ${isDark ? "bg-white" : "bg-black"}`} />
                <div className={`w-1 h-3 rounded-sm ${isDark ? "bg-white/40" : "bg-black/40"}`} />
              </div>
              <span>100%</span>
            </div>
          </div>

          {/* Home Screen Grid */}
          <div className="pt-12 px-4 grid grid-cols-4 gap-3">
            {/* Other App Icons (placeholders) */}
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div 
                  className={`w-10 h-10 rounded-xl ${
                    isDark 
                      ? "bg-gradient-to-br from-zinc-700 to-zinc-800" 
                      : "bg-gradient-to-br from-gray-200 to-gray-300"
                  }`} 
                />
                <div className={`w-8 h-1.5 rounded ${isDark ? "bg-zinc-700" : "bg-gray-300"}`} />
              </div>
            ))}
            
            {/* YOUR APP ICON - Highlighted */}
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-xl bg-primary/30 blur-md scale-110" />
                
                {/* Icon container */}
                <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 shadow-lg">
                  {iconUrl ? (
                    <img 
                      src={iconUrl} 
                      alt={appName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/pwa-192x192.png";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary">
                      <span className="text-primary-foreground font-bold text-lg">
                        {appName.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* New app indicator dot */}
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full border border-white" />
              </div>
              
              {/* App name */}
              <span className={`text-[7px] font-medium text-center leading-tight max-w-12 truncate ${
                isDark ? "text-white" : "text-black"
              }`}>
                {displayName}
              </span>
            </div>

            {/* More placeholder icons */}
            {[...Array(4)].map((_, i) => (
              <div key={`row2-${i}`} className="flex flex-col items-center gap-1">
                <div 
                  className={`w-10 h-10 rounded-xl ${
                    isDark 
                      ? "bg-gradient-to-br from-zinc-700 to-zinc-800" 
                      : "bg-gradient-to-br from-gray-200 to-gray-300"
                  }`} 
                />
                <div className={`w-8 h-1.5 rounded ${isDark ? "bg-zinc-700" : "bg-gray-300"}`} />
              </div>
            ))}
          </div>

          {/* Page Dots */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-white" : "bg-black"}`} />
            <div className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-white/30" : "bg-black/30"}`} />
            <div className={`w-1.5 h-1.5 rounded-full ${isDark ? "bg-white/30" : "bg-black/30"}`} />
          </div>

          {/* Dock */}
          <div className={`absolute bottom-3 left-3 right-3 h-14 rounded-2xl flex items-center justify-around px-2 ${
            isDark 
              ? "bg-zinc-800/80 backdrop-blur-sm" 
              : "bg-white/80 backdrop-blur-sm"
          }`}>
            {[...Array(4)].map((_, i) => (
              <div 
                key={`dock-${i}`}
                className={`w-9 h-9 rounded-xl ${
                  isDark 
                    ? "bg-gradient-to-br from-zinc-600 to-zinc-700" 
                    : "bg-gradient-to-br from-gray-200 to-gray-300"
                }`} 
              />
            ))}
          </div>

          {/* Home Indicator */}
          <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full ${
            isDark ? "bg-white/50" : "bg-black/30"
          }`} />
        </div>
      </div>

      {/* Label */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Smartphone className="h-3.5 w-3.5" />
        <span>Preview do PWA instalado</span>
      </div>
    </div>
  );
};

export default PWAInstallPreview;
