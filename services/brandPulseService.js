// File: services/brandPulseService.js
const { supabase } = require("../utils/supabase");
const { createChatCompletion } = require("../utils/openrouterClient");

/**
 * 🎨 BrandPulse Agent — builds brand identity for an idea
 * Supports real-time streaming logs via `emit` callback.
 */
async function runBrandPulseAgent(ideaId, emit = console.log) {
  emit(`🎨 [BrandPulse] Starting branding synthesis for idea ${ideaId}`);

  // 1️⃣ Fetch validated idea data
  const { data: idea, error: fetchError } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!idea) throw new Error("Idea not found");

  emit(`✅ [BrandPulse] Retrieved idea: ${idea.idea_text}`);

  // 2️⃣ Build structured prompt
  const messages = [
    {
      role: "system",
      content: `
You are BrandPulse — an AI branding strategist for Galuxium OS.
Return ONLY valid JSON in this format:
{
  "brand_name": "string",
  "tagline": "string",
  "tone": "string",
  "color_palette": ["#HEX"],
  "brand_story": "string",
  "logo_concept": "string"
}
      `,
    },
    {
      role: "user",
      content: `Startup Idea: ${idea.idea_text}
Domain: ${idea.domain || "General"}
`,
    },
  ];

  emit(`💬 [BrandPulse] Sending prompt to OpenRouter model...`);

  // 3️⃣ Query the model
  let output;
  try {
    const response = await createChatCompletion({
      model: "gpt-4o-mini",
      messages,
      stream: false,
    });

    output = response?.choices?.[0]?.message?.content;
    if (!output) throw new Error("Empty model response");
  } catch (err) {
    emit(`❌ [BrandPulse] Model call failed: ${err.message}`);
    throw new Error("Failed to contact OpenRouter");
  }

  emit(`📨 [BrandPulse] Model returned branding concept. Parsing JSON...`);

  // 4️⃣ Parse and sanitize model output
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    const match = output.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error("No JSON detected in BrandPulse output");
  }

  emit(`✅ [BrandPulse] Parsed branding JSON successfully`);

  // 5️⃣ Save in Supabase
  const { error: insertError } = await supabase
    .from("dna_branding")
    .insert({ idea_id: ideaId, ...parsed });

  if (insertError) {
    emit(`❌ [BrandPulse] Supabase insert error: ${insertError.message}`);
    throw new Error("Failed to insert branding data");
  }

  emit(`💾 [BrandPulse] Branding stored successfully`);

  // 6️⃣ Return structured data
  emit(`🎯 [BrandPulse] Branding synthesis complete for ${ideaId}`);
  return parsed;
}

module.exports = { runBrandPulseAgent };
