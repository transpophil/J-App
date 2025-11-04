"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ThemeContextType = {
  christmasEnabled: boolean;
  setChristmasEnabled: (enabled: boolean) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [christmasEnabled, setChristmasEnabledState] = useState<boolean>(false);

  async function loadSetting() {
    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "christmas_theme_enabled")
      .maybeSingle();

    setChristmasEnabledState((data?.setting_value ?? "false") === "true");
  }

  useEffect(() => {
    loadSetting();

    const channel = supabase
      .channel("app_settings_theme")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
          filter: "setting_key=eq.christmas_theme_enabled",
        },
        () => loadSetting()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Add/remove a helpful class on <html> for subtle background styling
  useEffect(() => {
    const root = document.documentElement;
    if (christmasEnabled) {
      root.classList.add("christmas-enabled");
    } else {
      root.classList.remove("christmas-enabled");
    }
  }, [christmasEnabled]);

  async function setChristmasEnabled(enabled: boolean) {
    setChristmasEnabledState(enabled);
    await supabase
      .from("app_settings")
      .upsert(
        { setting_key: "christmas_theme_enabled", setting_value: enabled ? "true" : "false" },
        { onConflict: "setting_key" }
      );
  }

  const value = useMemo(
    () => ({ christmasEnabled, setChristmasEnabled }),
    [christmasEnabled]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}