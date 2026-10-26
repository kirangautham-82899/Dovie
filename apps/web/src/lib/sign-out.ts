"use client";

import { createClient } from "@/lib/supabase/client";
import { clearAppCache } from "@/lib/app-cache";

/**
 * Signs out this device and leaves with a full page load. The reload is the
 * point: it drops every cached query (so the old screen can't refetch without
 * a session and flash errors).
 * "local" scope clears the session here without waiting on the network, and
 * the saved data cache is wiped so the next person starts clean.
 */
export async function signOutAndLeave(to = "/login") {
  try {
    await createClient().auth.signOut({ scope: "local" });
  } finally {
    // Last thing before leaving, so a pending cache save can't write it back.
    clearAppCache();
    window.location.replace(to);
  }
}
