import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Bug, Zap, AlertTriangle, FileText, X, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReleaseItem {
  text: string;
  hash: string | null;
}

interface Release {
  version: string;
  date: string | null;
  sections: { [key: string]: ReleaseItem[] };
}

interface ReleaseNotesData {
  releases: Release[];
  latest: Release | null;
  generated_at: string;
}

const LAST_SEEN_VERSION_KEY = 'barbersmart_last_seen_version';

const getSectionIcon = (sectionName: string) => {
  if (sectionName.includes('BREAKING')) return <AlertTriangle className="h-4 w-4 text-destructive" />;
  if (sectionName.includes('Funcionalidades') || sectionName.includes('Features')) return <Sparkles className="h-4 w-4 text-emerald-500" />;
  if (sectionName.includes('Correções') || sectionName.includes('Fixes')) return <Bug className="h-4 w-4 text-amber-500" />;
  if (sectionName.includes('Performance')) return <Zap className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

export const WhatsNewNotification: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ReleaseNotesData | null>(null);
  const [showBadge, setShowBadge] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkForNewVersion();
  }, []);

  const checkForNewVersion = async () => {
    try {
      setLoading(true);
      const response = await fetch('/release-notes.json');
      
      if (!response.ok) {
        setLoading(false);
        return;
      }
      
      const json: ReleaseNotesData = await response.json();
      setData(json);

      if (json.latest) {
        const lastSeenVersion = localStorage.getItem(LAST_SEEN_VERSION_KEY);
        
        // If user hasn't seen this version yet, show notification
        if (lastSeenVersion !== json.latest.version) {
          setShowBadge(true);
          
          // Auto-open dialog if it's the first time seeing this version
          // and user has seen at least one version before (not first visit)
          if (lastSeenVersion) {
            setTimeout(() => {
              setOpen(true);
            }, 2000); // Delay to let the page load first
          }
        }
      }
    } catch (error) {
      console.error('Error checking for new version:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    
    // Mark version as seen when dialog is closed
    if (!isOpen && data?.latest) {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, data.latest.version);
      setShowBadge(false);
    }
  };

  const handleDismiss = () => {
    if (data?.latest) {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, data.latest.version);
      setShowBadge(false);
    }
    setOpen(false);
  };

  if (loading || !data?.latest) {
    return null;
  }

  return (
    <>
      {/* Floating Notification Button (when there's a new version) */}
      <AnimatePresence>
        {showBadge && !open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-20 right-4 z-50 md:bottom-6"
          >
            <Button
              onClick={() => setOpen(true)}
              className="group relative rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Novidades</span>
              <Badge variant="secondary" className="bg-white text-primary text-xs font-bold">
                {data.latest.version}
              </Badge>
              
              {/* Pulse animation */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* What's New Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Novidades</DialogTitle>
                  <DialogDescription className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {data.latest.version}
                    </Badge>
                    {data.latest.date && (
                      <span className="text-xs text-muted-foreground">
                        {data.latest.date}
                      </span>
                    )}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-2">
              {Object.entries(data.latest.sections).map(([section, items]) => (
                items.length > 0 && (
                  <div key={section} className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getSectionIcon(section)}
                      <h4 className="font-medium text-sm">{section}</h4>
                    </div>
                    <ul className="space-y-1.5 pl-6">
                      {items.map((item, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1.5">•</span>
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleDismiss}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsNewNotification;
