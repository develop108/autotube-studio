const express = require('express');
const auth = require('../middleware/auth');
const { runPipeline } = require('../services/pipeline');
const { getDB } = require('../utils/db');
const router = express.Router();

// POST /api/pipeline/run — Start a pipeline job
router.post('/run', auth, async (req, res) => {
  const { channelId, prompt, videoType, voiceProvider } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  // Return job ID immediately, run pipeline async
  res.json({ message: 'Pipeline started', status: 'running' });

  // Run in background
  runPipeline({
    userId: req.user.id,
    channelId: channelId || null,
    prompt,
    videoType: videoType || 'avatar',
    voiceProvider: voiceProvider || 'elevenlabs'
  }).catch(err => {
    console.error('Pipeline error:', err.message);
  });
});

// GET /api/pipeline/jobs — List all jobs
router.get('/jobs', auth, (req, res) => {
  const db = getDB();
  const jobs = db.prepare(`
    SELECT j.*, v.title, v.final_video_url, v.thumbnail_url
    FROM pipeline_jobs j
    LEFT JOIN videos v ON v.id = j.video_id
    WHERE j.user_id = ?
    ORDER BY j.created_at DESC
    LIMIT 50
  `).all(req.user.id);
  res.json(jobs.map(j => ({ ...j, steps: JSON.parse(j.steps || '[]') })));
});

// GET /api/pipeline/jobs/:id — Single job status
router.get('/jobs/:id', auth, (req, res) => {
  const db = getDB();
  const job = db.prepare(`
    SELECT j.*, v.title, v.final_video_url, v.thumbnail_url, v.voice_url, v.script
    FROM pipeline_jobs j
    LEFT JOIN videos v ON v.id = j.video_id
    WHERE j.id = ? AND j.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ ...job, steps: JSON.parse(job.steps || '[]') });
});

// GET /api/pipeline/avatars — List HeyGen avatars
router.get('/avatars', auth, async (req, res) => {
  const db = getDB();
  const keys = db.prepare('SELECT heygen_key FROM integrations WHERE user_id = ?').get(req.user.id);
  if (!keys?.heygen_key) return res.status(400).json({ error: 'HeyGen API key not configured' });
  try {
    const { heygenGetAvatars } = require('../services/aiServices');
    const avatars = await heygenGetAvatars(keys.heygen_key);
    res.json(avatars);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/pipeline/voices — List ElevenLabs voices
router.get('/voices', auth, async (req, res) => {
  const db = getDB();
  const keys = db.prepare('SELECT elevenlabs_key FROM integrations WHERE user_id = ?').get(req.user.id);
  if (!keys?.elevenlabs_key) return res.status(400).json({ error: 'ElevenLabs API key not configured' });
  try {
    const { getVoicesList } = require('../services/aiServices');
    const voices = await getVoicesList(keys.elevenlabs_key);
    res.json(voices);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
