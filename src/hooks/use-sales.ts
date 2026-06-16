"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Subscribes to new sales in real time (e.g. for a live dashboard ticker).
// Invokes `onChange` (typically router.refresh) whenever a sale is inserted.
export function useSalesRealtime(onChange: () => void) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("sales-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sales" }, onChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
