import { useState, useEffect } from "react";

export const useSidebarGroups = (storageKey: string, defaultState: Record<string, boolean> = {}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : defaultState;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(openGroups));
  }, [openGroups, storageKey]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const openGroup = (groupId: string) => {
    if (!openGroups[groupId]) {
      setOpenGroups(prev => ({ ...prev, [groupId]: true }));
    }
  };

  return { openGroups, toggleGroup, openGroup, setOpenGroups };
};
