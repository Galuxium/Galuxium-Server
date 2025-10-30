const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { classifyIdea } = require("../services/classifyIdea");
const { orchestrateAgents } = require("../services/orchestratorService");
const { supabase } = require("../utils/supabase");

// =============================================================
// 🚀 POST /api/idea — Auto-runs the entire Galuxium pipeline
// =============================================================
router.post("/", async (req, res) => {
  console.log("\n==========================================");
  console.log("🧩 Incoming /api/idea request");
  console.log("🕐 Timestamp:", new Date().toISOString());
  console.log("📥 Payload:", req.body);
  console.log("==========================================\n");

  try {
    const { idea, user_id } = req.body;

    if (!idea) {
      console.warn("⚠️ No 'idea' field provided in request body.");
      return res.status(400).json({ success: false, error: "Idea text required" });
    }

    // 🧠 Step 1: Intent Classification
    console.log("🧠 Step 1: Starting classification for idea...");
    const intent = await classifyIdea(idea);
    console.log("✅ Classification Result:", JSON.stringify(intent, null, 2));

    // 🧬 Step 2: DNA Blueprint
    console.log("🧬 Step 2: Generating DNA blueprint...");
    const dna = {
      metadata: {
        version: "1.0",
        created_at: new Date().toISOString(),
      },
      inputs: { raw: idea },
      intent,
    };
    console.log("🧩 DNA Blueprint:", JSON.stringify(dna, null, 2));

    // 🔐 Step 3: Hash Generation
    console.log("🔐 Step 3: Creating DNA hash...");
    const dna_hash = crypto.createHash("sha256").update(JSON.stringify(dna)).digest("hex");
    console.log("✅ DNA Hash:", dna_hash);

    // 💾 Step 4: Store Idea in Supabase
    console.log("💾 Step 4: Attempting to insert idea into Supabase...");
    console.log("🌐 Supabase URL:", process.env.SUPABASE_URL);
    console.log("🔑 Using anon key:", process.env.SUPABASE_ANON_KEY ? "✅ Present" : "❌ Missing");

    const { data: ideaData, error } = await supabase
      .from("ideas")
      .insert([{ user_id, idea_text: idea, intent, dna, dna_hash }])
      .select()
      .single();

    if (error) {
      console.error("🧨 Supabase Insert Error:", error);
      throw new Error(`Supabase insert failed: ${error.message}`);
    }

    console.log("✅ Supabase Insert Success:", JSON.stringify(ideaData, null, 2));

    // 🪄 Step 5: Start Orchestration Automatically
    console.log("🧭 Step 5: Triggering orchestration...");
    orchestrateAgents(ideaData.id)
      .then(() => console.log(`✅ Orchestration complete for idea ${ideaData.id}`))
      .catch((err) => {
        console.error("❌ Orchestration internal error:", err);
      });

    console.log("📤 Responding to client (async orchestration continues)...");
    res.status(201).json({
      success: true,
      message: "Idea created, orchestration running automatically",
      idea: ideaData,
    });
  } catch (err) {
    console.error("\n❌ FATAL ERROR in /api/idea:");
    console.error("🧠 Message:", err.message);
    console.error("📄 Stack Trace:\n", err.stack);
    res.status(500).json({ success: false, error: err.message });
  }

  console.log("\n==========================================");
  console.log("🔚 /api/idea request complete");
  console.log("==========================================\n");
});

module.exports = router;
