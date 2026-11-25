import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const systemPrompt = `You are Sheepdog Studio, the AI marketing partner from Sheepdog Marketing.
You help small UK businesses market themselves confidently and practically.
Always use UK English. Use the business profile supplied to personalise every answer: name, sector, location, website, audience, services, tone, goal and brand notes.
Be specific, commercially aware and useful. Avoid generic filler and jargon.
Never invent testimonials, awards, statistics, prices, certifications, guarantees, opening hours or facts.
Use clearly marked placeholders where information is missing.
Make outputs easy to copy, edit and use. For regulated sectors, flag claims requiring human/compliance review.
For website reviews, only assess information supplied in the prompt/profile; do not claim to have crawled a site.
For design requests, provide a clear creative brief and image-generation prompt; do not claim an image has been rendered.`;

const creditCosts: Record<string, number> = {
  social: 2, blog: 5, design: 5, seo: 5, pr: 3, website: 5, strategy: 5, product: 2,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in again." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorised. Please sign in again." }, 401);

    const body = await req.json();
    const type = String(body.type || "social");
    const prompt = String(body.prompt || "").trim();
    if (!prompt || prompt.length > 10000) return json({ error: "Enter a request under 10,000 characters." }, 400);
    const cost = creditCosts[type] ?? 3;
    const { data: profile, error: profileError } = await supabase
      .from("business_profiles").select("*").eq("user_id", user.id).single();
    if (profileError || !profile) return json({ error: "Please save your business profile before generating content." }, 400);

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) return json({ error: "The OpenAI API key is not configured in Supabase secrets." }, 503);

    const ai = new OpenAI({ apiKey: openAiKey });
    const completion = await ai.chat.completions.create({
      model: Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini",
      temperature: 0.7,
      max_tokens: 2200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Tool: ${type}\nBusiness profile:\n${JSON.stringify(profile, null, 2)}\n\nCustomer request:\n${prompt}` },
      ],
    });
    const output = completion.choices[0]?.message?.content?.trim();
    if (!output) return json({ error: "The AI returned an empty response. Please try again." }, 502);

    const { data: remaining, error: spendError } = await supabase.rpc("spend_marketing_credits", {
      p_user_id: user.id, p_amount: cost,
    });
    if (spendError) return json({ error: spendError.message.includes("Insufficient") ? "You have run out of credits." : "Could not update your credit balance." }, 402);

    const title = prompt.length > 90 ? `${prompt.slice(0, 87)}…` : prompt;
    const { error: saveError } = await supabase.from("generations").insert({
      user_id: user.id, tool_type: type, title, prompt, output, credits_used: cost,
    });
    if (saveError) console.error("Could not save generation:", saveError.message);

    return json({ output, credits_used: cost, credits_remaining: remaining });
  } catch (error) {
    console.error("marketing-agent:", error);
    return json({ error: "Something went wrong generating your marketing content. Please try again." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
