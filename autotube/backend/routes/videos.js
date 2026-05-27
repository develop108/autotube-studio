const express = require('express');
const auth = require('../middleware/auth');
const { getDB } = require('../utils/db');
const router = express.Router();

// GET all videos (optionally filter by channel)
router.get('/', auth, (req, res) => {
  const db = getDB();
  const { channelId } = req.query;
  let query = `SELECT v.*, c.name as channel_name, c.emoji as channel_emoji
               FROM videos v LEFT JOIN channels c ON c.id = v.channel_id
               WHERE v.user_id = ?`;
  const params = [req.user.id];
  if (channelId) { query += ' AND v.channel_id = ?'; params.push(channelId); }
  query += ' ORDER BY v.created_at DESC LIMIT 100';
  res.json(db.prepare(query).all(...params));
});

// GET single video
router.get('/:id', auth, (req, res) => {
  const db = getDB();
  const v = db.prepare('SELECT * FROM videos WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  res.json(v);
});

// DELETE video
router.delete('/:id', auth, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM videos WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
