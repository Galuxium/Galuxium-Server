const { supabase } = require("../utils/supabase");
const { createChatCompletion } = require("../utils/openrouterClient");

async function runLaunchLensAgent(ideaId) {
  console.log(`🚀 [LaunchLens] Running GTM analysis for ${ideaId}`);

  const { data: idea } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .single();

  if (!idea) throw new Error("Idea not found");

  const messages = [
    {
      role: "system",
      content: `
You are LaunchLens — create GTM, marketing, and investor-ready insights.
Return JSON like:
{
  "pricing_model": "string",
  "marketing_channels": ["Twitter", "Product Hunt"],
  "gtm_strategy": "string",
  "investor_pitch": "string"
}
`
    },
    {
      role: "user",
      content: `Startup Idea: ${idea.idea_text}`
    }
  ];

  const response = await createChatCompletion({
    model: "gpt-4o-mini",
    messages
  });

  let parsed;
  try {
    parsed = JSON.parse(response.choices?.[0]?.message?.content || "{}");
  } catch {
    throw new Error("Failed to parse LaunchLens output");
  }

  const { error } = await supabase
    .from("dna_launch")
    .insert({ idea_id: ideaId, ...parsed });

  if (error) throw error;

  console.log(`✅ [LaunchLens] GTM strategy saved for ${ideaId}`);
  return parsed;
}

module.exports = { runLaunchLensAgent };
