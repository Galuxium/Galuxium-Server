const { supabase } = require("../utils/supabase.js");
const { generateEmbedding, createChatCompletion } = require("../utils/openrouterClient.js");

async function runBizMindAgent(ideaId) {
  console.log("🧠 [BizMind] Starting validation for idea:", ideaId);

  // 1️⃣ Fetch the idea
  const { data: idea, error: fetchError } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .single();

  if (fetchError) {
    console.error("❌ [BizMind] Supabase fetch error:", fetchError);
    throw new Error("Failed to fetch idea data");
  }
  if (!idea) throw new Error("Idea not found");

  console.log("✅ [BizMind] Retrieved idea:", {
    id: idea.id,
    title: idea.idea_text,
    domain: idea.domain,
  });

  // 2️⃣ Construct system + user prompt
  const messages = [
    {
      role: "system",
      content: `
You are BizMind, the market validation agent for Galuxium OS.
Return ONLY valid JSON in the format:
{
  "target_customers": ["..."],
  "competitors": [{"name": "", "url": ""}],
  "tam_estimate": number,
  "risks": ["..."],
  "insights": "string",
  "recommendations": ["..."],
  "validation_score": number
}
`,
    },
    {
      role: "user",
      content: `
Startup Idea:
${idea.title || "Untitled"}

Problem:
${idea.problem_statement || "N/A"}

Domain:
${idea.domain || "Unknown"}
`,
    },
  ];

  console.log("💬 [BizMind] Sending prompt to OpenRouter...");

  // 3️⃣ Query model safely
  let output;
  try {
    const response = await createChatCompletion({
      model: "z-ai/glm-4.5-air:free",
      messages,
      stream: false,
    });

    // Extract text content safely
    output = response?.choices?.[0]?.message?.content;
    if (!output) {
      console.error("❌ [BizMind] Model returned no content:", response);
      throw new Error("Empty model response");
    }
  } catch (err) {
    console.error("❌ [BizMind] Model call failed:", err.message);
    throw new Error("Failed to contact OpenRouter");
  }

  console.log("📨 [BizMind] Raw model output:", output.slice(0, 500) + "...");

  // 4️⃣ Try parsing JSON output
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (err) {
    console.warn("⚠️ [BizMind] Output not pure JSON. Attempting cleanup...");
    const match = output.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch (innerErr) {
        console.error("❌ [BizMind] Still invalid after cleanup:", innerErr.message);
        throw new Error("Failed to parse BizMind output");
      }
    } else {
      console.error("❌ [BizMind] No JSON detected in output.");
      throw new Error("Failed to parse BizMind output");
    }
  }

  console.log("✅ [BizMind] Parsed output successfully:", parsed);

  // 5️⃣ Store validation results
  const { error: insertError } = await supabase
    .from("dna_validation")
    .insert({
      idea_id: ideaId,
      ...parsed,
      raw_report: parsed,
    });

  if (insertError) {
    console.error("❌ [BizMind] Supabase insert error:", insertError);
    throw new Error("Failed to insert validation data");
  }

  // 6️⃣ Embed and store
  const summary = `${idea.title || ""} ${parsed.insights || ""} ${parsed.recommendations?.join(",") || ""}`;
  const embedding = await generateEmbedding(summary);

  await supabase.from("startup_docs").insert({
    title: idea.title || "Untitled",
    description: parsed.insights,
    metadata: { source: "BizMind", idea_id: ideaId },
    embedding,
  });

  console.log("🎯 [BizMind] Completed successfully for idea:", ideaId);
  return parsed;
}

module.exports = { runBizMindAgent };
