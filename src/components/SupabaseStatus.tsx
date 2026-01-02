"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

type Status = "checking" | "connected" | "missing_env" | "error";

export default function SupabaseStatus({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      setStatus("missing_env");
      setMessage("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
      return;
    }

    // Run a lightweight test query
    (async () => {
      const { error } = await supabase.from("app_settings").select("id").limit(1);
      if (error) {
        setStatus("error");
        setMessage(error.message);
      } else {
        setStatus("connected");
        setMessage("OK");
      }
    })();
  }, []);

  if (status === "checking") {
    return <Badge variant="secondary" className={className}>Checking Supabase…</Badge>;
  }

  if (status === "connected") {
    return <Badge className={className}>Supabase: Connected</Badge>;
  }

  if (status === "missing_env") {
    return <Badge variant="destructive" className={className}>Supabase: Missing env</Badge>;
  }

  return <Badge variant="destructive" className={className}>Supabase: {message || "Error"}</Badge>;
}