const { createChatCompletion } = require("../utils/openrouterClient.js");

const systemPrompt = `
You are Galuxium's Intent Classifier.
You must output ONLY valid JSON — no markdown, no explanations.

Schema:
{
  "title": string,
  "domain": string,
  "problem_statement": string,
  "user_type": string,
  "product_type": "SaaS" | "Marketplace" | "MobileApp" | "API" | "Hardware" | "Other",
  "urgency": "low" | "medium" | "high"
}

Return only a JSON object. No backticks, no text before or after.
`;

async function classifyIdea(ideaText) {
  try {
    const data = await createChatCompletion({
      model: "z-ai/glm-4.5-air:free", // use a deterministic model for consistency
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: ideaText },
      ],
      stream: false,
    });

    let raw = data?.choices?.[0]?.message?.content?.trim();
    if (!raw) {
      throw new Error("Model returned empty content.");
    }

    // 🧠 Extract JSON block even if model adds extra text
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) raw = jsonMatch[0];

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn("⚠️ Model returned invalid JSON. Raw output:\n", raw);
      parsed = { raw_output: raw, error: "Invalid JSON format" };
    }

    return parsed;
  } catch (err) {
    console.error("❌ Intent classification failed:", err.response?.data || err.message);
    throw err;
  }
}

module.exports = { classifyIdea };
