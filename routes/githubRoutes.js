const express = require("express");
const axios = require("axios");
const { supabase } = require("../utils/supabase");
require("dotenv").config();

const router = express.Router();

// Step 1: Redirect user to GitHub OAuth
router.get("/login", (req, res) => {
  const client_id = process.env.GITHUB_CLIENT_ID;
  const redirect_uri = `${process.env.BACKEND_URL}/api/github/callback`;
  const scope = "repo"; // repo scope to push repos
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}`
  );
});

// Step 2: OAuth callback
router.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Missing code");

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      `https://github.com/login/oauth/access_token`,
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const access_token = tokenRes.data.access_token;
    if (!access_token) return res.status(400).send("Failed to get access token");

    // Store token in session or database associated with your user
    // Example: req.session.github_token = access_token
    // For simplicity, we redirect to frontend and store in localStorage via query param
    res.redirect(`${process.env.FRONTEND_URL}/github-connected?token=${access_token}`);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("GitHub OAuth failed");
  }
});

// Step 3: Push files to GitHub
router.put("/push", async (req, res) => {
  try {
    const { repoName, files ,mvpId} = req.body;
    const githubToken = process.env.GITHUB_TOKEN
    if (!repoName || !files || !githubToken)
      return res.status(400).json({ error: "Missing parameters" });

    // Get authenticated user
    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `token ${githubToken}` },
    });
    const username = userRes.data.login;

    // Create repo
    await axios.post(
      "https://api.github.com/user/repos",
      { name: repoName, private: false },
      { headers: { Authorization: `token ${githubToken}` } }
    );

    // Push files
    for (const file of files) {
      await axios.put(
        `https://api.github.com/repos/${username}/${repoName}/contents/${file.path}`,
        {
          message: `Add ${file.path}`,
          content: Buffer.from(file.content).toString("base64"),
        },
        { headers: { Authorization: `token ${githubToken}` } }
      );
    }
      // 🔹 Update Supabase record
    if (mvpId) {
      const { error } = await supabase
        .from("mvps")
        .update({ githubPushed: true }) // ✅ correct syntax
        .eq("id", mvpId);

      if (error) console.error("Supabase update error:", error.message);
    }
    res.json({ success: true, repoUrl: `https://github.com/${username}/${repoName}` });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "GitHub push failed" });
  }
});

module.exports = router;