// File: services/launchLensService.js
const { supabase } = require("../utils/supabase");
const { createChatCompletion } = require("../utils/openrouterClient");

/**
 * 🚀 LaunchLens Agent — GTM, pricing, and investor insights generator.
 * Streams live subphase updates for frontend via `emit`.
 */
async function runLaunchLensAgent(ideaId, emit = console.log) {
  emit(`🚀 [LaunchLens] Starting GTM and investor strategy analysis for idea ${ideaId}`);

  // 1️⃣ Fetch idea
  const { data: idea, error: fetchError } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!idea) throw new Error("Idea not found");

  emit(`✅ [LaunchLens] Retrieved idea: ${idea.idea_text}`);

  // 2️⃣ Define system prompt
  const messages = [
    {
      role: "system",
      content: `
You are LaunchLens — the go-to-market, marketing, and investor strategy agent for Galuxium OS.
Your goal is to design a sharp GTM plan for the given startup idea.
Return ONLY valid JSON in this format:
{
  "pricing_model": "string",
  "marketing_channels": ["Twitter", "Product Hunt", "Reddit"],
  "gtm_strategy": "string (explain how to reach early adopters)",
  "investor_pitch": "string (1 paragraph pitch summary)",
  "growth_forecast": "string (describe short-term traction goals)"
}
      `,
    },
    {
      role: "user",
      content: `Startup Idea: ${idea.idea_text}\nDomain: ${idea.domain || "General"}`,
    },
  ];

  emit(`💬 [LaunchLens] Building GTM context and sending to OpenRouter model...`);
  emit(`📊 [LaunchLens] Subphase 1/3: Analyzing market positioning...`);

  // 3️⃣ Query model safely
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
    emit(`❌ [LaunchLens] Model call failed: ${err.message}`);
    throw new Error("Failed to contact OpenRouter");
  }

  emit(`📨 [LaunchLens] Model responded — parsing structured GTM data...`);
  emit(`📣 [LaunchLens] Subphase 2/3: Synthesizing pricing & marketing channels...`);

  // 4️⃣ Parse output safely
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (err) {
    const match = output.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else {
      emit(`❌ [LaunchLens] Output not valid JSON`);
      throw new Error("Failed to parse LaunchLens output");
    }
  }

  emit(`✅ [LaunchLens] GTM data parsed successfully`);
  emit(`📈 [LaunchLens] Subphase 3/3: Finalizing investor pitch and strategy...`);

  // 5️⃣ Save results to Supabase
  const { error: insertError } = await supabase
    .from("dna_launch")
    .insert({ idea_id: ideaId, ...parsed });

  if (insertError) {
    emit(`❌ [LaunchLens] Supabase insert error: ${insertError.message}`);
    throw new Error("Failed to insert GTM data");
  }

  emit(`💾 [LaunchLens] GTM & investor strategy stored successfully`);

  // 6️⃣ Return final structured report
  emit(`🎯 [LaunchLens] Completed GTM orchestration for idea ${ideaId}`);
  return parsed;
}

module.exports = { runLaunchLensAgent };
