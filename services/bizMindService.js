// backend/services/bizMindService.js
const fs = require("fs");
const path = require("path");
const { supabase } = require("../utils/supabase.js");
const { generateEmbedding, createChatCompletion } = require("../utils/openrouterClient.js");

async function persistTimelineEvent(ideaId, phase, sub_phase, message, progress = null, file_url = null) {
  try {
    await supabase.from("timeline_events").insert([{
      idea_id: ideaId,
      phase,
      sub_phase,
      message,
      progress,
      file_url,
      created_at: new Date().toISOString()
    }]);
  } catch (err) {
    console.warn("Failed to persist timeline event:", err?.message || err);
  }
}

async function uploadReportToStorage(bucket, keyPath, contentBuffer) {
  // Uses Supabase Storage; adapt if you use S3/CDN
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(keyPath, contentBuffer, { contentType: "application/json", upsert: true });

    if (error) throw error;

    // public URL (adjust if your bucket requires signed URLs)
    const { publicURL, error: urlErr } = supabase.storage.from(bucket).getPublicUrl(keyPath);
    if (urlErr) throw urlErr;
    return publicURL;
  } catch (err) {
    console.error("Upload error:", err.message || err);
    return null;
  }
}

async function runBizMindAgent(ideaId, streamUpdate) {
  try {
    streamUpdate?.({ phase: "BizMind", sub_phase: "fetch", progress: 5, message: "Fetching idea from DB..." });
    const { data: idea, error: fetchError } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", ideaId)
      .single();

    if (fetchError) {
      throw new Error("Failed to fetch idea: " + (fetchError.message || fetchError));
    }
    if (!idea) throw new Error("Idea not found");

    // Persist timeline
    await persistTimelineEvent(ideaId, "BizMind", "fetch", "Fetched idea from DB", 5, null);

    // Sub-phase: pre-processing
    streamUpdate?.({ phase: "BizMind", sub_phase: "prep", progress: 10, message: "Preparing prompt & context..." });
    await persistTimelineEvent(ideaId, "BizMind", "prep", "Preparing prompt & context", 10, null);

    // Build system + user messages for model
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
${idea.idea_text || "Untitled"}

Problem:
${idea.problem_statement || "N/A"}

Domain:
${idea.domain || "Unknown"}
`,
      },
    ];

    streamUpdate?.({ phase: "BizMind", sub_phase: "analysis", progress: 25, message: "Analyzing market & competitors..." });
    await persistTimelineEvent(ideaId, "BizMind", "analysis", "Sent prompt to model", 25, null);

    // Model call (non-stream here; agent can be changed to stream as well)
    let output;
    try {
      const response = await createChatCompletion({
        model: "z-ai/glm-4.5-air:free",
        messages,
        stream: false,
      });
      output = response?.choices?.[0]?.message?.content;
      if (!output) throw new Error("Empty model response");
    } catch (err) {
      streamUpdate?.({ phase: "BizMind", sub_phase: "error", progress: 30, message: `Model error: ${err.message}` });
      await persistTimelineEvent(ideaId, "BizMind", "error", `Model error: ${err.message}`, 30, null);
      throw err;
    }

    streamUpdate?.({ phase: "BizMind", sub_phase: "parse", progress: 55, message: "Parsing model output..." });
    await persistTimelineEvent(ideaId, "BizMind", "parse", "Parsing model output", 55, null);

    // Try parse robustly
    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch (err) {
      const match = output.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); }
        catch (inner) {
          streamUpdate?.({ phase: "BizMind", sub_phase: "parse_error", progress: 60, message: "Failed to parse JSON" });
          await persistTimelineEvent(ideaId, "BizMind", "parse_error", "Failed to parse JSON", 60, null);
          throw new Error("Failed to parse BizMind output");
        }
      } else {
        streamUpdate?.({ phase: "BizMind", sub_phase: "parse_error", progress: 60, message: "No JSON detected in model output" });
        await persistTimelineEvent(ideaId, "BizMind", "parse_error", "No JSON detected in model output", 60, null);
        throw new Error("No JSON detected in model output");
      }
    }

    streamUpdate?.({ phase: "BizMind", sub_phase: "store", progress: 70, message: "Inserting validation results into DB..." });
    await persistTimelineEvent(ideaId, "BizMind", "store", "Inserting validation results into DB", 70, null);

    // Insert into dna_validation
    const { error: insertError } = await supabase
      .from("dna_validation")
      .insert({
        idea_id: ideaId,
        ...parsed,
        raw_report: parsed,
      });

    if (insertError) {
      streamUpdate?.({ phase: "BizMind", sub_phase: "db_error", progress: 75, message: "DB insert error" });
      await persistTimelineEvent(ideaId, "BizMind", "db_error", "DB insert error: " + insertError.message, 75, null);
      throw new Error("Failed to insert validation data");
    }

    // Prepare summary file and upload
    streamUpdate?.({ phase: "BizMind", sub_phase: "report", progress: 85, message: "Generating and uploading report..." });
    const report = {
      idea: idea.idea_text,
      parsed,
      generated_at: new Date().toISOString(),
    };
    const buffer = Buffer.from(JSON.stringify(report, null, 2), "utf-8");

    // key path example: "bizmind-reports/<ideaId>.json"
    const keyPath = `bizmind-reports/${ideaId}.json`;
    const publicUrl = await uploadReportToStorage("galuxium-reports", keyPath, buffer);

    if (publicUrl) {
      await persistTimelineEvent(ideaId, "BizMind", "report_upload", "Uploaded report file", 95, publicUrl);
      streamUpdate?.({ phase: "BizMind", sub_phase: "report_upload", progress: 95, message: "Report uploaded", file_url: publicUrl });
    } else {
      await persistTimelineEvent(ideaId, "BizMind", "report_upload_failed", "Report upload failed", 95, null);
    }

    // Embedding & docs
    const summary = `${idea.idea_text || ""} ${parsed.insights || ""} ${parsed.recommendations?.join(",") || ""}`;
    try {
      const embedding = await generateEmbedding(summary);
      await supabase.from("startup_docs").insert({
        title: idea.idea_text || "Untitled",
        description: parsed.insights,
        metadata: { source: "BizMind", idea_id: ideaId },
        embedding,
      });
    } catch (err) {
      console.warn("Embedding or docs insert failed:", err.message || err);
    }

    streamUpdate?.({ phase: "BizMind", sub_phase: "complete", progress: 100, message: "BizMind complete", file_url: publicUrl || null });
    await persistTimelineEvent(ideaId, "BizMind", "complete", "BizMind complete", 100, publicUrl || null);

    return parsed;
  } catch (err) {
    // bubble up error after emitting final event
    streamUpdate?.({ phase: "BizMind", sub_phase: "failed", progress: null, message: err.message || String(err) });
    await persistTimelineEvent(ideaId, "BizMind", "failed", err.message || String(err), null, null);
    throw err;
  }
}

module.exports = { runBizMindAgent };
