const express = require('express');
const auth = require('../middleware/auth');
const { getDB } = require('../utils/db');
const router = express.Router();

// GET all channels
router.get('/', auth, (req, res) => {
  const db = getDB();
  const channels = db.prepare(`
    SELECT c.*, COUNT(v.id) as video_count
    FROM channels c
    LEFT JOIN videos v ON v.channel_id = c.id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all(req.user.id);
  res.json(channels);
});

// GET single channel
router.get('/:id', auth, (req, res) => {
  const db = getDB();
  const ch = db.prepare('SELECT * FROM channels WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });
  res.json(ch);
});

// POST create channel
router.post('/', auth, (req, res) => {
  const { name, niche, audience, style, emoji, avatar_id, voice_id, youtube_channel_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Channel name required' });

  const db = getDB();
  const result = db.prepare(`
    INSERT INTO channels (user_id, name, niche, audience, style, emoji, avatar_id, voice_id, youtube_channel_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, name, niche||'', audience||'', style||'', emoji||'📺', avatar_id||null, voice_id||null, youtube_channel_id||null);

  const ch = db.prepare('SELECT * FROM channels WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(ch);
});

// PATCH update channel
router.patch('/:id', auth, (req, res) => {
  const db = getDB();
  const ch = db.prepare('SELECT * FROM channels WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!ch) return res.status(404).json({ error: 'Channel not found' });

  const fields = ['name','niche','audience','style','emoji','avatar_id','voice_id','youtube_channel_id'];
  const updates = [];
  const values = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  });
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  values.push(req.params.id);
  db.prepare(`UPDATE channels SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json(db.prepare('SELECT * FROM channels WHERE id = ?').get(req.params.id));
});

// DELETE channel
router.delete('/:id', auth, (req, res) => {
  const db = getDB();
  const ch = db.prepare('SELECT id FROM channels WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!ch) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM channels WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
