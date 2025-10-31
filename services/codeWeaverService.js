// File: services/codeWeaverService.js
const { supabase } = require("../utils/supabase");
const { createChatCompletion } = require("../utils/openrouterClient");

/**
 * 🧱 CodeWeaver Agent — generates tech architecture & MVP plan
 * Streams progress live through `emit` callback.
 */
async function runCodeWeaverAgent(ideaId, emit = console.log) {
  emit(`🧱 [CodeWeaver] Generating MVP plan for idea ${ideaId}...`);

  // 1️⃣ Fetch idea from Supabase
  const { data: idea, error: fetchError } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .single();

  if (fetchError) throw new Error(fetchError.message);
  if (!idea) throw new Error("Idea not found");

  emit(`✅ [CodeWeaver] Retrieved idea: ${idea.idea_text}`);

  // 2️⃣ Define system + user prompt
  const messages = [
    {
      role: "system",
      content: `
You are CodeWeaver — a full-stack AI architect for Galuxium OS.
Return ONLY valid JSON in this format:
{
  "recommended_stack": ["Next.js", "Supabase", "OpenAI"],
  "architecture": "string (brief system design)",
  "api_endpoints": ["POST /login", "GET /projects"],
  "mvp_features": ["auth", "dashboard", "AI assistant"],
  "integration_notes": "string (deployment & scaling hints)"
}
      `,
    },
    {
      role: "user",
      content: `Startup Idea: ${idea.idea_text}`,
    },
  ];

  emit(`💬 [CodeWeaver] Sending prompt to OpenRouter model...`);

  // 3️⃣ Query model with fallback
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
    emit(`❌ [CodeWeaver] Model request failed: ${err.message}`);
    throw new Error("Failed to contact OpenRouter");
  }

  emit(`📨 [CodeWeaver] Model response received, parsing JSON...`);

  // 4️⃣ Parse output safely
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (err) {
    const match = output.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else {
      emit(`❌ [CodeWeaver] No JSON found in output.`);
      throw new Error("Failed to parse CodeWeaver output");
    }
  }

  emit(`✅ [CodeWeaver] JSON parsed successfully`);

  // 5️⃣ Insert into Supabase
  const { error: insertError } = await supabase
    .from("dna_tech")
    .insert({ idea_id: ideaId, ...parsed });

  if (insertError) {
    emit(`❌ [CodeWeaver] Supabase insert error: ${insertError.message}`);
    throw new Error("Failed to insert tech data");
  }

  emit(`💾 [CodeWeaver] MVP plan saved to database`);

  // 6️⃣ Return structured output
  emit(`🎯 [CodeWeaver] Completed MVP architecture synthesis for ${ideaId}`);
  return parsed;
}

module.exports = { runCodeWeaverAgent };
