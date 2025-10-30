// backend/routes/chat.js
const express = require("express");
const router = express.Router();
const { supabase } = require("../utils/supabase");
const { v4: uuidv4 } = require("uuid");
const { createChatCompletion } = require("../utils/openrouterClient");
const { RateLimiterMemory } = require("rate-limiter-flexible");
const rateLimiter = new RateLimiterMemory({ points: 50, duration: 60 });
const axios = require("axios");
/**
 * POST /api/chat/create
 * body: { userId, title, model }
 */
router.post("/create", async (req, res) => {
  try {
    const { userId, title = "New Chat", model = null } = req.body;
    if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // conversations has model_slug column (kept for compatibility)
    const { data, error } = await supabase
      .from("conversations")
      .insert([{ user_id: userId, title }])
      .select()
      .single();
    if (error) throw error;

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * GET /api/chat/list?userId=...
 */
router.get("/list", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false, nulls: "last" });
    if (error) throw error;

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

/**
 * POST /api/chat/save
 * body: { conversationId, userId, role, content, model }
 */
router.post("/save", async (req, res) => {
  try {
    const { conversationId, userId, role, content, model } = req.body;
    if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
    if (!conversationId || !role || !content) return res.status(400).json({ error: "Missing fields" });

    const id = uuidv4();
    const insert = {
      id,
      conversation_id: conversationId,
      role,
      content,
      model_used:model
    };

    const { data, error } = await supabase.from("messages").insert([insert]).select().single();
    if (error) throw error;

const updates = { updated_at: new Date() };


// fetch current conversation
const { data: conv, error: convErr } = await supabase
  .from("conversations")
  .select("title")
  .eq("id", conversationId)
  .single();

if (convErr) console.warn("Failed to fetch conversation", convErr);

// only update title if it’s still default ("New Chat") or null
if (conv && (conv.title === "New Chat" || !conv.title)) {
  updates.title = content.length > 20 ? content.slice(0, 20) + "…" : content;
}

const { error: updateErr } = await supabase
  .from("conversations")
  .update(updates)
  .eq("id", conversationId);

if (updateErr) console.warn("Failed to update conversation timestamp", updateErr);


    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});





router.post("/delete", async (req, res) => {
  const { conversationId } = req.body;

  if (!conversationId) {
    return res.status(400).json({ error: "Missing conversationId" });
  }

  try {
    // 1. Delete messages related to this conversation
    const { error: msgErr } = await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);

    if (msgErr) {
      console.error("Error deleting messages:", msgErr);
      return res.status(500).json({ error: "Failed to delete messages" });
    }

    // 2. Delete the conversation itself
    const { error: convoErr } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (convoErr) {
      console.error("Error deleting conversation:", convoErr);
      return res.status(500).json({ error: "Failed to delete conversation" });
    }

    return res.status(200).json({ success: true, deletedId: conversationId });
  } catch (err) {
    console.error("Unexpected delete error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
});


function parseJSONSafe(raw) {
  try {
    if (!raw) return {};
    if (typeof raw === "object") return raw; // already parsed

    const cleaned = raw
      .replace(/```(?:json)?/gi, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("⚠️ Could not parse classifier output:", raw);
    return {};
  }
}



// router.post("/search", async (req, res) => {
//   try {
//     const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
//     await rateLimiter.consume(ip);

//     const { model, userMessages, modelProfile } = req.body;

//     console.log("Searching with model:", model);
//     if (!Array.isArray(userMessages) || userMessages.length === 0) {
//       return res.status(400).json({ error: "userMessages array required" });
//     }
//     const { data: profile, error } = await supabase
//       .from("model_profiles")
//       .select("slug")
//       .eq("id", model)
//       .single();
// console.log("Model found:", profile);
//       if (error || !profile) {
//       console.error("Model not found:", model);
//       return res.status(400).json({ error: "Model not found" });
//     }
//     const messages = [];

//     // Add system prompt if present or fallback
//     messages.push({
//       role: "system",
//       content:
//         modelProfile?.system_prompt ||
//         "You are Galuxium — an advanced assistant that is helpful, concise, and written in a friendly Galuxium voice. You were founded by Aaditya Salgaonkar.",
//     });

//     // Append user/assistant pairs
//     userMessages.forEach((m) => {
//       if (m && m.role && typeof m.content === "string") {
//         messages.push({ role: m.role, content: m.content });
//       }
//     });

//     // Call OpenRouter (non-stream)
//     const providerResp = await createChatCompletion({ model:profile.slug, messages, stream: false });

//     return res.json({ ok: true, providerResp });
//   } catch (err) {
//     console.error("openrouter error", err?.response?.data || err.message);
//     return res.status(500).json({
//       error: "openrouter proxy failed",
//       detail: err?.message || err,
//     });
//   }
// });

router.post("/search", async (req, res) => {
  try {
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    await rateLimiter.consume(ip);

    const {userId, model, userMessages, modelProfile } = req.body;
    if (!Array.isArray(userMessages) || userMessages.length === 0) {
      return res.status(400).json({ error: "userMessages array required" });
    }
    console.log("user",userId)
    // Get model slug
    const { data: profile, error } = await supabase
      .from("model_profiles")
      .select("slug")
      .eq("id", model)
      .single();

    if (error || !profile) {
      console.error("Model not found:", model);
      return res.status(400).json({ error: "Model not found" });
    }

    // Extract the latest user message
    const latestMessage = userMessages[userMessages.length - 1]?.content || "";

    // 🧠 STEP 1: Classify message
    const classifierPrompt = `
You are Galuxium's Intent Classifier.
Detect if the message describes a startup or business idea.

Return ONLY JSON:
{
  "is_startup_idea": boolean,
  "idea": string,
  "reasoning": string | null
}`;

    const classificationResp = await createChatCompletion({
      model: "z-ai/glm-4.5-air:free",
      messages: [
        { role: "system", content: classifierPrompt },
        { role: "user", content: latestMessage },
      ],
      stream: false,
    });

    const raw1 = classificationResp?.choices?.[0]?.message?.content || "{}";
    const raw = parseJSONSafe(raw1)
    console.log("🧩 Classification Result:", raw);

    // 🚀 STEP 2: If startup idea → forward to /api/idea
    if (raw?.is_startup_idea === true) {
      console.log("🚀 Detected startup idea. Forwarding to /api/idea...");

      try {
        const ideaResp = await axios.post(
  "http://localhost:5000/api/ideas",
  { user_id: userId, idea: raw?.idea },
  { headers: { "Content-Type": "application/json" } }
);

const ideaId = ideaResp.data?.id;

console.log("🧭 Orchestration started for idea:", ideaId);

return res.json({
  ok: true,
  route: "idea",
  idea: ideaResp.data,
  streamUrl: `http://localhost:5000/api/stream/idea/${ideaResp.data.id}`,
});


      } catch (forwardErr) {
        console.error("❌ Failed to forward to /api/idea:", forwardErr.message);
        return res.status(500).json({
          error: "Failed to forward startup idea",
          detail: forwardErr.message,
        });
      }
    }

    // 💬 STEP 3: Normal chat fallback
    const messages = [
      {
        role: "system",
        content:
          modelProfile?.system_prompt ||
          "You are Galuxium — an advanced assistant that is helpful, concise, and written in a friendly Galuxium voice. You were founded by Aaditya Salgaonkar.",
      },
      ...userMessages,
    ];

    const providerResp = await createChatCompletion({
      model: profile.slug,
      messages,
      stream: false,
    });

    return res.json({ ok: true, providerResp });
  } catch (err) {
    console.error("❌ openrouter error", err?.response?.data || err.message);
    return res.status(500).json({
      error: "openrouter proxy failed",
      detail: err?.message || err,
    });
  }
});

router.get("/models", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("model_profiles")
      .select("id,name,description");
    if (error) throw error;


    res.json({ data});
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!supabase) return res.status(500).json({ error: "Supabase not configured" });

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});

router.post("/updateTokens", async (req, res) => {
  const { userId, tokens,userTokens,assistantTokens } = req.body;
  if (!userId || !tokens || tokens <= 0)
    return res.status(400).json({ error: "Invalid request" });

  try {
    // 1. Fetch current tokens
    const { data: userData, error: fetchErr } = await supabase
      .from("users")
      .select("tokens_used,userTokens,assistantTokens")
      .eq("id", userId)
      .single();

    if (fetchErr) throw fetchErr;

    const currentTokens = userData.tokens_used || 0;
    const currentUserTokens = userData.userTokens || 0;
    const currentAssistantTokens = userData.assistantTokens || 0;

    // 2. Update tokens_used
    const { data, error: updateErr } = await supabase
      .from("users")
      .update({ tokens_used: currentTokens + tokens, userTokens: currentUserTokens + userTokens, assistantTokens: currentAssistantTokens + assistantTokens })
      .eq("id", userId)
      .select();

    if (updateErr) throw updateErr;

    return res.status(200).json({ data });
  } catch (err) {
    console.error("updateTokens error", err);
    return res.status(500).json({ error: err.message || err });
  }
});


module.exports = router;
