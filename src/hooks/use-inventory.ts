"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Subscribes to Supabase Realtime stock/product changes and invokes `onChange`
// (typically router.refresh) so inventory views stay live across devices.
export function useInventoryRealtime(onChange: () => void) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("inventory-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_entries" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, onChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
