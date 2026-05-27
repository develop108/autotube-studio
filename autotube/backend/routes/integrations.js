const express = require('express');
const auth = require('../middleware/auth');
const { getDB } = require('../utils/db');
const router = express.Router();

// GET /api/integrations — get user's saved integrations (masked)
router.get('/', auth, (req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT * FROM integrations WHERE user_id = ?').get(req.user.id);
  if (!row) return res.json({});

  // Mask keys: show only last 6 chars
  const mask = (v) => v ? '••••••••' + v.slice(-6) : null;
  res.json({
    anthropic:     { connected: !!row.anthropic_key,  masked: mask(row.anthropic_key) },
    openai:        { connected: !!row.openai_key,     masked: mask(row.openai_key) },
    elevenlabs:    { connected: !!row.elevenlabs_key, masked: mask(row.elevenlabs_key) },
    minimax:       { connected: !!row.minimax_key,    masked: mask(row.minimax_key) },
    heygen:        { connected: !!row.heygen_key,     masked: mask(row.heygen_key) },
    kling:         { connected: !!row.kling_key,      masked: mask(row.kling_key) },
    runway:        { connected: !!row.runway_key,     masked: mask(row.runway_key) },
    fal:           { connected: !!row.fal_key,        masked: mask(row.fal_key) },
  });
});

// POST /api/integrations — save API keys
router.post('/', auth, (req, res) => {
  const db = getDB();
  const {
    anthropic_key, openai_key,
    elevenlabs_key, minimax_key, minimax_group_id,
    heygen_key, kling_key, kling_secret,
    runway_key, fal_key
  } = req.body;

  // Get existing
  const existing = db.prepare('SELECT * FROM integrations WHERE user_id = ?').get(req.user.id);

  // Only update fields that are provided (don't clear existing if not sent)
  const merged = {
    anthropic_key:  anthropic_key  || existing?.anthropic_key  || null,
    openai_key:     openai_key     || existing?.openai_key     || null,
    elevenlabs_key: elevenlabs_key || existing?.elevenlabs_key || null,
    minimax_key:    minimax_key    || existing?.minimax_key    || null,
    minimax_group_id: minimax_group_id || existing?.minimax_group_id || null,
    heygen_key:     heygen_key     || existing?.heygen_key     || null,
    kling_key:      kling_key      || existing?.kling_key      || null,
    kling_secret:   kling_secret   || existing?.kling_secret   || null,
    runway_key:     runway_key     || existing?.runway_key     || null,
    fal_key:        fal_key        || existing?.fal_key        || null,
  };

  db.prepare(`
    INSERT INTO integrations (user_id, anthropic_key, openai_key, elevenlabs_key, minimax_key, minimax_group_id, heygen_key, kling_key, kling_secret, runway_key, fal_key, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      anthropic_key = excluded.anthropic_key,
      openai_key = excluded.openai_key,
      elevenlabs_key = excluded.elevenlabs_key,
      minimax_key = excluded.minimax_key,
      minimax_group_id = excluded.minimax_group_id,
      heygen_key = excluded.heygen_key,
      kling_key = excluded.kling_key,
      kling_secret = excluded.kling_secret,
      runway_key = excluded.runway_key,
      fal_key = excluded.fal_key,
      updated_at = CURRENT_TIMESTAMP
  `).run(req.user.id, ...Object.values(merged));

  res.json({ success: true, message: 'API keys saved securely' });
});

// DELETE /api/integrations/:provider — remove one key
router.delete('/:provider', auth, (req, res) => {
  const allowed = ['anthropic_key','openai_key','elevenlabs_key','minimax_key','heygen_key','kling_key','runway_key','fal_key'];
  const field = req.params.provider + '_key';
  if (!allowed.includes(field)) return res.status(400).json({ error: 'Unknown provider' });

  const db = getDB();
  db.prepare(`UPDATE integrations SET ${field} = NULL WHERE user_id = ?`).run(req.user.id);
  res.json({ success: true });
});

module.exports = router;
