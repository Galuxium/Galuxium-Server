const { runBizMindAgent } = require("./bizMindService");
const { runBrandPulseAgent } = require("./brandPulseService");
const { runCodeWeaverAgent } = require("./codeWeaverService");
const { runLaunchLensAgent } = require("./launchLensService");
const { supabase } = require("../utils/supabase");

/**
 * Master Orchestrator — runs all Galuxium agents in order
 */
async function orchestrateAgents(ideaId) {
  try {
    console.log(`🧭 Orchestration started for idea: ${ideaId}`);

 
    const validation = await runBizMindAgent(ideaId);
    const branding = await runBrandPulseAgent(ideaId);
    const tech = await runCodeWeaverAgent(ideaId);
    const launch = await runLaunchLensAgent(ideaId);

    // 🧩 Step 6: Save DNA Genome Output
    const dna_output = {
      idea_id: ideaId,
      validation,
      branding,
      tech,
      launch
    //   branding,
    //   mvp,
    //   pitch,
    //   launch,
    };

    await supabase.from("galuxium_dna").insert([dna_output]);

    console.log(`✅ Orchestration completed successfully for ${ideaId}`);
    return dna_output;
  } catch (err) {
    console.error("❌ Orchestration failed:", err.message);
    throw err;
  }
}

module.exports = { orchestrateAgents };
