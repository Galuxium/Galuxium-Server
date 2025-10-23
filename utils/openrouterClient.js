// backend/utils/openrouterClient.js
const axios = require("axios");

const OPENROUTER_BASE = process.env.OPENROUTER_BASE || "https://openrouter.ai/api/v1";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.warn("OPENROUTER_API_KEY is not set. OpenRouter requests will fail.");
}

const client = axios.create({
  baseURL: OPENROUTER_BASE,
  headers: {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

async function createChatCompletion({ model , messages, stream = false }) {
  const url = "/chat/completions";
  const payload = { model, messages, stream };
  const res = await client.post(url, payload);
  return res.data;
}

module.exports = { createChatCompletion };
