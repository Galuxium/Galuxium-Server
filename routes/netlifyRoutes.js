const express = require("express");
const axios = require("axios");
const { FRONTEND_URL } = require("../config");
const router = express.Router();

// 🔐 Environment Config
const CLIENT_ID = process.env.NETLIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.NETLIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.NETLIFY_REDIRECT_URI;

// ⚠ TEMPORARY Storage: In production use DB or sessions
let userTokens = {};

// 1️⃣ Login: Redirect user to Netlify OAuth
router.get("/login", (req, res) => {
  const state = generateState();
const authURL = `https://app.netlify.com/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${state}`;
  res.redirect(authURL);
});

// 2️⃣ Callback: Netlify redirects here after user authorizes
router.get("/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing code parameter" });
  }

  try {
    const response = await axios.post("https://api.netlify.com/oauth/token", {
      grant_type: "authorization_code",
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    });

    const token = response.data.access_token;
    userTokens[req.ip] = token;  // 👈 associate token with user (for demo)

    // ✅ Redirect back to frontend app
    res.redirect(`${FRONTEND_URL}/mvps`);
  } catch (err) {
    console.error("Token Exchange Failed:", err.response?.data || err);
    res.status(500).json({ error: "Failed to exchange Netlify token" });
  }
});

// 3️⃣ Token Status: Check if user is connected
router.get("/token", (req, res) => {
  const token = userTokens[req.ip];
  res.json({ connected: !!token });
});

// 4️⃣ Deploy Route: Deploy user files to Netlify
router.post("/deploy", async (req, res) => {
  const token = userTokens[req.ip];
  if (!token) return res.status(401).json({ error: "Not connected to Netlify" });

  const { files, mvpId } = req.body;

  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ error: "Invalid or missing files" });
  }

  try {
    // ✅ Create new site
    const siteResp = await axios.post(
      "https://api.netlify.com/api/v1/sites",
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const siteId = siteResp.data.id;
    const siteURL = siteResp.data.ssl_url;

    // ✅ Upload deploy files using simplified (non-official) approach for demo
    const deployFiles = {};
    for (let file of files) {
      deployFiles[file.path] = file.content;
    }

    await axios.post(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      { files: deployFiles },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({ netlify_url: siteURL });
  } catch (err) {
    console.error("Deployment Failed:", err.response?.data || err);
    res.status(500).json({ error: "Failed to deploy to Netlify" });
  }
});

// 🔧 Helper — Secure random state string
function generateState(length = 16) {
  return [...Array(length)].map(() => Math.random().toString(36)[2]).join("");
}

module.exports = router;
