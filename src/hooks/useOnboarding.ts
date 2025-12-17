import { useState, useEffect, useCallback } from "react";

const ONBOARDING_KEY = "barbersmart_onboarding_completed";

export function useOnboarding() {
  const [showTour, setShowTour] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if onboarding was completed
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
    setIsLoading(false);
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShowTour(false);
  }, []);

  const skipTour = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShowTour(false);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowTour(true);
  }, []);

  return {
    showTour,
    isLoading,
    completeTour,
    skipTour,
    resetTour
  };
}
