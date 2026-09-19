import React, { createContext, useContext, useState } from 'react';

interface SidebarContextValue {
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ mobileOpen, openMobile: () => setMobileOpen(true), closeMobile: () => setMobileOpen(false) }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar debe usarse dentro de SidebarProvider');
  return ctx;
}
