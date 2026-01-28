import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const { messages } = await req.json() as { messages: ChatMessage[] };

    // Fetch available advisors for context
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: advisors, error: advisorError } = await supabase
      .from("profiles")
      .select("id, full_name, specialty, bio, price_per_session, rating, virtual_available, in_person_available, location")
      .eq("is_advisor", true)
      .eq("advisor_approved", true);

    if (advisorError) {
      console.error("Error fetching advisors:", advisorError);
    }

    const advisorContext = advisors?.map((a) => ({
      id: a.id,
      name: a.full_name,
      specialty: a.specialty,
      bio: a.bio,
      price: a.price_per_session,
      rating: a.rating,
      virtual: a.virtual_available,
      inPerson: a.in_person_available,
      location: a.location,
    })) || [];

    const systemPrompt = `You are a friendly fashion concierge for Cook-a-Look. Help users find the right style advisor quickly.

Available Advisors:
${JSON.stringify(advisorContext, null, 2)}

CRITICAL RULES:
1. Be BRIEF - max 2-3 sentences per response
2. When mentioning an advisor, ALWAYS use this exact format: [Advisor Name](advisor:ID)
   Example: I'd recommend [Johnny Test](advisor:d5717c49-9c09-49d5-b2ee-34b138f6be04) for menswear.
3. Ask ONE clarifying question at a time (budget, virtual/in-person, occasion)
4. Get to recommendations fast - don't over-explain
5. If no perfect match, suggest the closest option

Keep it conversational and helpful. ✨`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("advisor-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
