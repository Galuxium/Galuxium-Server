const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const router = express.Router();
const os = require("os");
const { supabase } = require("../utils/supabase");
// POST /api/vercel/deploy
router.put("/deploy", async (req, res) => {
  try {
    const { files, mvpId ,name} = req.body;
    let repoName = name.toLowerCase();

// 2️⃣ Replace invalid characters with hyphens
repoName = repoName.replace(/[^a-z0-9._-]/g, "-");

// 3️⃣ Replace multiple consecutive hyphens with single hyphen
repoName = repoName.replace(/-{2,}/g, "-");

// 4️⃣ Trim hyphens from start and end
repoName = repoName.replace(/^-+|-+$/g, "");
    if (!files || files.length === 0)
      return res.status(400).json({ error: "No files provided" });

    if (!mvpId) return res.status(400).json({ error: "Missing MVP ID" });

    // 🔹 Temporary folder outside backend
    const tmpDir = path.join(os.tmpdir(), `mvp-${mvpId}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    files.forEach((f) => {
      const filePath = path.join(tmpDir, f.path);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, f.content, "utf-8");
    });

    // 🔹 Prepare files array for Vercel
    const vercelFiles = files.map((f) => ({
      file: f.path,
      data: Buffer.from(f.content).toString("base64"),
    }));
    console.log(repoName)
    // 🔹 Deploy to Vercel
    const vercelRes = await axios.post(
      "https://api.vercel.com/v13/deployments",
      {
        name: repoName,
        files: vercelFiles,
        projectSettings: {
          framework: "nextjs",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    // 🔹 Clean up temp folder
    fs.rmSync(tmpDir, { recursive: true, force: true });

    // 🔹 Update Supabase
    const { error: dbError } = await supabase
      .from("mvps")
      .update({ vercel_deployed: true, vercel_url: vercelRes.data.url })
      .eq("id", mvpId);

    if (dbError) {
      console.error("Supabase update error:", dbError);
      return res
        .status(500)
        .json({ error: "Deployment succeeded but DB update failed" });
    }

    res.json({ vercel_url: vercelRes.data.url });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Vercel deploy failed" });
  }
});

module.exports = router;
