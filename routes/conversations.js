const express = require("express");
const router = express.Router();
const axios = require("axios");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

router.post("/save", async (req, res) => {
  try {
    const { conversation, messages } = req.body;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    // ✅ 1. Save conversation (must be an array)
    await axios.post(`${SUPABASE_URL}/rest/v1/conversations`, [conversation], {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    });

    // ✅ 2. Normalize messages to match your table columns
    const normalizedMessages = messages.map(m => ({
      
      conversation_id: m.conversation_id ?? conversation.id,
      role: m.role ?? null,
      content: m.content ?? null,
      created_at: m.created_at ?? new Date().toISOString(),
    }));

    // ✅ 3. Save messages in bulk
    await axios.post(`${SUPABASE_URL}/rest/v1/messages`, normalizedMessages, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Save conversation error:", err?.response?.data || err.message);
    res.status(500).json({ error: "Save failed", detail: err?.message || err });
  }
});

module.exports = router;
