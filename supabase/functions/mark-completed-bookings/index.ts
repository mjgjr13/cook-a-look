import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Scheduled function: flips confirmed bookings whose slot has ended to 'completed'.
// Existing DB triggers then award reward points and update advisor monthly stats.
// Invoked by pg_cron; uses CRON_SECRET shared header to gate access.

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");

  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerSecret = req.headers.get("x-cron-secret");
  if (cronSecret && headerSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data, error } = await supabase.rpc("complete_due_bookings");
  if (error) {
    console.error("complete_due_bookings error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  console.log("Marked completed:", data);
  return new Response(JSON.stringify({ completed: data ?? 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
