const express = require("express");
const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { supabase } = require("../utils/supabase");

const router = express.Router();

const VERCEL_API_BASE = "https://api.vercel.com";
const activeMonitors = new Map(); // projectId -> intervalId

// -------------------------
// 1️⃣ Validate Vercel Token
// -------------------------
async function checkVercelToken(token) {
  try {
    const res = await axios.get(`${VERCEL_API_BASE}/v2/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { valid: true, user: res.data };
  } catch (err) {
    return { valid: false, error: err.response?.data || err.message };
  }
}

// ----------------------------
// 2️⃣ Check if Project Exists
// ----------------------------
async function findProject(token, name) {
  const res = await axios.get(`${VERCEL_API_BASE}/v10/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.data.projects.find((p) => p.name === name);
}

// ----------------------------
// 3️⃣ Create New Vercel Project
// ----------------------------
async function createProject(token, name) {
  const payload = {
    name,
    framework: "nextjs",
  };

  const res = await axios.post(`${VERCEL_API_BASE}/v11/projects`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return res.data;
}

// ----------------------------
// 4️⃣ Create New Deployment
// ----------------------------
async function createDeployment(token, name, files) {
  const vercelFiles = files.map((f) => ({
    file: f.path,
    data: Buffer.from(f.content).toString("base64"),
  }));

  const payload = {
    name,
    files: vercelFiles,
    projectSettings: {
      framework: "nextjs",
    },
  };

  const res = await axios.post(`${VERCEL_API_BASE}/v13/deployments`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return res.data;
}

// ----------------------------
// 5️⃣ Monitor Deployment
// ----------------------------
async function monitorDeployment(projectId, deploymentId, token, mvpId) {
  const intervalId = setInterval(async () => {
    try {
      const res = await axios.get(
        `${VERCEL_API_BASE}/v13/deployments/${deploymentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { readyState, url } = res.data;

      console.log(`🟡 Deployment ${deploymentId} => ${readyState}`);

      if (readyState === "READY" || readyState === "ERROR") {
        clearInterval(intervalId);
        activeMonitors.delete(projectId);

        const finalUrl = `https://${url}`;

        // Update Supabase
        await supabase
          .from("mvps")
          .update({
            vercel_deployed: readyState === "READY",
            vercel_url: readyState === "READY" ? finalUrl : null,
            vercel_status: readyState,
          })
          .eq("id", mvpId);

        console.log(`✅ Deployment completed: ${readyState} (${finalUrl})`);
      }
    } catch (err) {
      console.error("Error monitoring deployment:", err.message);
    }
  }, 3000);

  activeMonitors.set(projectId, intervalId);
}

// ----------------------------
// 6️⃣ Main Deploy Endpoint
// ----------------------------
router.put("/deploy", async (req, res) => {
  try {
    const { files, mvpId, name ,token } = req.body;
    if (!files?.length) return res.status(400).json({ error: "No files provided" });
    if (!mvpId || !name) return res.status(400).json({ error: "Missing parameters" });

    
    if (!token) return res.status(500).json({ error: "Missing Vercel token" });

    // Sanitize repo name
    let repoName = name.toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");

    // 1️⃣ Validate Token
    const tokenCheck = await checkVercelToken(token);
    if (!tokenCheck.valid) return res.status(401).json({ error: "Invalid Vercel token" });

    // 2️⃣ Ensure Project Exists
    let project = await findProject(token, repoName);
    if (!project) {
      console.log(`🚀 Creating new Vercel project: ${repoName}`);
      project = await createProject(token, repoName);
    }

    // 3️⃣ Create Deployment
    console.log(`🧱 Deploying ${repoName} to Vercel...`);
    const deployment = await createDeployment(token, repoName, files);

    const deploymentId = deployment.id;
    const deploymentUrl = `https://${deployment.url}`;

    // 4️⃣ Start Monitoring in Background
    monitorDeployment(project.id, deploymentId, token, mvpId);

    // 5️⃣ Update DB immediately
    await supabase
      .from("mvps")
      .update({ vercel_deployed: false, vercel_url: deploymentUrl, vercel_status: "QUEUED" })
      .eq("id", mvpId);

    res.json({
      success: true,
      project_id: project.id,
      deployment_id: deploymentId,
      vercel_url: deploymentUrl,
      message: "Deployment started. Monitoring in background.",
    });
  } catch (err) {
    console.error("❌ Vercel deploy failed:", err.response?.data || err.message);
    res.status(500).json({ error: "Vercel deployment failed", details: err.message });
  }
});

// ----------------------------
// 7️⃣ Stop Monitoring
// ----------------------------
router.delete("/deploy/stop/:projectId", (req, res) => {
  const { projectId } = req.params;
  if (activeMonitors.has(projectId)) {
    clearInterval(activeMonitors.get(projectId));
    activeMonitors.delete(projectId);
    return res.json({ message: `Stopped monitoring project ${projectId}` });
  }
  res.status(404).json({ error: "No active monitor for this project" });
});

// ----------------------------
// 8️⃣ Get Active Monitors
// ----------------------------
router.get("/deploy/active", (req, res) => {
  res.json({ active_projects: Array.from(activeMonitors.keys()) });
});

module.exports = router;
