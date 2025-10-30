const { supabase } = require("../utils/supabase");
const { createChatCompletion } = require("../utils/openrouterClient");

async function runCodeWeaverAgent(ideaId) {
  console.log(`🧱 [CodeWeaver] Generating MVP plan for idea ${ideaId}`);

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
You are CodeWeaver — a full-stack system architect.
Generate JSON like:
{
  "stack": ["Next.js", "Supabase", "OpenAI"],
  "architecture": "description",
  "api_endpoints": ["POST /login", "GET /projects"],
  "mvp_features": ["auth", "dashboard", "AI assistant"]
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
    throw new Error("Failed to parse CodeWeaver output");
  }

  const { error } = await supabase
    .from("dna_tech")
    .insert({ idea_id: ideaId, ...parsed });

  if (error) throw error;

  console.log(`✅ [CodeWeaver] MVP plan saved for ${ideaId}`);
  return parsed;
}

module.exports = { runCodeWeaverAgent };
