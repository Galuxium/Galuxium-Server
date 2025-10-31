// File: backend/routes/orchestrator.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { supabase } = require("../utils/supabase");

const { classifyIdea } = require("../services/classifyIdea");
const { runBizMindAgent } = require("../services/bizMindService");
const { runBrandPulseAgent } = require("../services/brandPulseService");
const { runCodeWeaverAgent } = require("../services/codeWeaverService");
const { runLaunchLensAgent } = require("../services/launchLensService");

function send(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function logProgress(idea_id, user_id, agent, message, sub_phase = null, progress = null) {
  await supabase.from("orchestration_logs").insert([
    { idea_id, user_id, agent, message, sub_phase, progress, created_at: new Date().toISOString() },
  ]);
}

router.get("/", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const { idea, user_id } = req.query;
  if (!idea) {
    send(res, { error: "Missing idea text" });
    return res.end();
  }

  console.log("🛰️ Received SSE Orchestration request:", req.query);

  try {
    send(res, { phase: "classification",progress: 50, message: "🧠 Classifying startup idea..." });
    const classification = await classifyIdea(idea);
    send(res, { phase: "classification",progress: 100, message: "✅ Classification complete", data: classification });

    const dna_hash = crypto.createHash("sha256").update(idea).digest("hex");
    const { data: existing } = await supabase
  .from("ideas")
  .select("*")
  .eq("user_id", user_id)
  .eq("dna_hash", dna_hash)
  .maybeSingle();

let ideaData = existing;

if (!ideaData) {
  const { data, error } = await supabase
    .from("ideas")
    .insert([{ user_id, idea_text: idea, intent: classification, dna_hash }])
    .select()
    .single();

  if (error) throw error;
  ideaData = data;
} else {
  console.log("♻️ Idea already exists — reusing existing record.");
}

send(res, { phase: "setup", message: "💾 Idea ready", idea_id: ideaData.id,progress: 50 });


    send(res, { phase: "setup", message: "💾 Idea stored successfully", idea_id: ideaData.id,progress: 100 });

    const agents = [
      { name: "BizMind", func: runBizMindAgent },
      { name: "BrandPulse", func: runBrandPulseAgent },
      { name: "CodeWeaver", func: runCodeWeaverAgent },
      { name: "LaunchLens", func: runLaunchLensAgent },
    ];

    for (const { name, func } of agents) {
      send(res, { phase: name, sub_phase: "initializing", progress: 5, message: `⚙️ Starting ${name} Agent...` });
      await logProgress(ideaData.id, user_id, name, `Starting ${name} Agent...`);

      try {
        await func(ideaData.id, async (msg) => {
          const payload =
            typeof msg === "string"
              ? { phase: name, message: msg }
              : {
                  phase: name,
                  sub_phase: msg.sub_phase || null,
                  message: msg.message || msg,
                  progress: msg.progress || 0,
                  file_url: msg.file_url || null,
                  output: msg.output || null,
                };

          send(res, payload);
          await logProgress(ideaData.id, user_id, name, payload.message, payload.sub_phase, payload.progress);
        });

        send(res, { phase: name, message: `✅ ${name} Agent completed`, progress: 100 });
        await logProgress(ideaData.id, user_id, name, "✅ Agent completed");
      } catch (err) {
        send(res, { phase: name, error: `❌ ${name} Agent failed: ${err.message}` });
        await logProgress(ideaData.id, user_id, name, `Agent failed: ${err.message}`);
      }
    }

    send(res, { done: true, message: "🎯 All agents completed successfully" });
    res.end();
  } catch (err) {
    console.error("❌ Orchestration failed:", err);
    send(res, { error: err.message });
    res.end();
  }
});

module.exports = router;
