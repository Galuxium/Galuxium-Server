const express = require("express");
const router = express.Router();
const axios = require("axios");
const supabase = require("../services/supabase");
let userAccessToken = null; // For now, global token storage. Later per-user

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const BACKEND_URL = process.env.BACKEND_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;
// GitHub OAuth login URL
router.get("/login", (req, res) => {
  const redirect_uri = `${BACKEND_URL}/api/github/callback`;
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect_uri}&scope=repo`
  );
});

// GitHub OAuth callback
router.get("/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
      },
      { headers: { Accept: "application/json" } }
    );

    userAccessToken = tokenRes.data.access_token;

    res.cookie("github_connected", true, { httpOnly: false });
    res.redirect(`${FRONTEND_URL}/mvps`); // your frontend redirect
  } catch (error) {
    console.error(error);
    res.status(500).send("GitHub OAuth failed");
  }
});

// Check if GitHub connected
router.get("/token", (req, res) => {
  res.json({ connected: userAccessToken !== null });
});

// Create Repo & Push Files
router.post("/push", async (req, res) => {
  if (!userAccessToken) return res.status(403).json({ error: "GitHub not connected" });

  const { repoName, description, files, mvpId } = req.body;

  try {
    // 1. Create repo
    const repoRes = await axios.post(
      "https://api.github.com/user/repos",
      { name: repoName, description },
      { headers: { Authorization: `token ${userAccessToken}` } }
    );

    const username = repoRes.data.owner.login;

    // 2. Upload each file
    for (const file of files) {
      await axios.put(
        `https://api.github.com/repos/${username}/${repoName}/contents/${file.path}`,
        {
          message: `Add ${file.path}`,
          content: Buffer.from(file.content).toString("base64"),
        },
        { headers: { Authorization: `token ${userAccessToken}` } }
      );
    }
   const { error } = await supabase
      .from('mvps')
      .update({ github_pushed: true })
      .eq('id', mvpId);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to push files to GitHub" });
  }
});

module.exports = router;
