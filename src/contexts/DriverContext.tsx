import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Driver {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface DriverContextType {
  currentDriver: Driver | null;
  setCurrentDriver: (driver: Driver | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load driver from sessionStorage on mount
    const stored = sessionStorage.getItem("currentDriver");
    if (stored) {
      try {
        setCurrentDriver(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored driver", e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Save driver to sessionStorage whenever it changes
    if (currentDriver) {
      sessionStorage.setItem("currentDriver", JSON.stringify(currentDriver));
    } else {
      sessionStorage.removeItem("currentDriver");
    }
  }, [currentDriver]);

  const logout = () => {
    setCurrentDriver(null);
    sessionStorage.removeItem("currentDriver");
  };

  return (
    <DriverContext.Provider value={{ currentDriver, setCurrentDriver, logout, isLoading }}>
      {children}
    </DriverContext.Provider>
  );
}

export function useDriver() {
  const context = useContext(DriverContext);
  if (context === undefined) {
    throw new Error("useDriver must be used within a DriverProvider");
  }
  return context;
}
