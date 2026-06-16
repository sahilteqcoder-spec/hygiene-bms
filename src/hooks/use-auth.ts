"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppUser } from "@/lib/auth";

// Client-side current-user hook. Server Components should prefer getCurrentUser()
// from @/lib/auth; use this only inside Client Components that need live auth.
export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }
      const { data: profile } = await supabase
        .from("users")
        .select("id, email, name, role")
        .eq("id", authUser.id)
        .single();
      if (active) {
        setUser(profile ? (profile as AppUser) : null);
        setLoading(false);
      }
    }

    load();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => load());

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
