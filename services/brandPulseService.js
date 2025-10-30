const { supabase } = require("../utils/supabase");
const { createChatCompletion } = require("../utils/openrouterClient");

async function runBrandPulseAgent(ideaId) {
  console.log(`🎨 [BrandPulse] Starting branding synthesis for idea ${ideaId}`);

  // 1️⃣ Fetch validated idea data
  const { data: idea } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .single();

  if (!idea) throw new Error("Idea not found");

  // 2️⃣ Build structured prompt
  const messages = [
    {
      role: "system",
      content: `
You are BrandPulse — an AI branding strategist.
Generate structured JSON like:
{
  "brand_name": "string",
  "tagline": "string",
  "tone": "string",
  "colors": ["#HEX"],
  "narrative": "string",
  "logo_concept": "string"
}
`
    },
    {
      role: "user",
      content: `Idea: ${idea.idea_text}\nDomain: ${idea.domain || "General"}`
    }
  ];

  // 3️⃣ Query model
  const response = await createChatCompletion({
    model: "gpt-4o-mini",
    messages
  });

  // 4️⃣ Parse output
  let parsed;
  try {
    parsed = JSON.parse(response.choices?.[0]?.message?.content || "{}");
  } catch {
    throw new Error("Failed to parse BrandPulse output");
  }

  // 5️⃣ Save in Supabase
  const { error } = await supabase
    .from("dna_branding")
    .insert({ idea_id: ideaId, ...parsed });

  if (error) throw error;

  console.log(`✅ [BrandPulse] Branding saved for ${ideaId}`);
  return parsed;
}

module.exports = { runBrandPulseAgent };
