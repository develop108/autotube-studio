const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { getDB } = require('../utils/db');
const ai = require('./aiServices');

const OUTPUT_DIR = path.resolve(process.env.OUTPUT_DIR || './outputs');

// ═══════════════════════════════════════════════
//  Pipeline Orchestrator
//  Runs all steps, broadcasts progress via WS
// ═══════════════════════════════════════════════
async function runPipeline({ userId, channelId, prompt, videoType, voiceProvider }) {
  const db = getDB();
  const jobId = uuidv4();

  // Load user integrations
  const keys = db.prepare('SELECT * FROM integrations WHERE user_id = ?').get(userId);
  if (!keys) throw new Error('No API keys configured. Add them in Integrations.');

  // Load channel
  const channel = channelId ? db.prepare('SELECT * FROM channels WHERE id = ? AND user_id = ?').get(channelId, userId) : null;
  const channelCtx = channel
    ? `Channel: ${channel.name}\nNiche: ${channel.niche}\nAudience: ${channel.audience}\nStyle: ${channel.style}`
    : 'General YouTube channel';

  // Create video record
  const videoResult = db.prepare(`
    INSERT INTO videos (channel_id, user_id, status) VALUES (?, ?, 'processing')
  `).run(channelId || null, userId);
  const videoId = videoResult.lastInsertRowid;

  // Create job record
  db.prepare(`
    INSERT INTO pipeline_jobs (id, user_id, channel_id, video_id, status, steps)
    VALUES (?, ?, ?, ?, 'running', '[]')
  `).run(jobId, userId, channelId || null, videoId);

  const steps = [];
  const broadcast = (step, status, data = {}) => {
    const entry = { step, status, timestamp: new Date().toISOString(), ...data };
    steps.push(entry);
    db.prepare('UPDATE pipeline_jobs SET steps = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(JSON.stringify(steps), jobId);
    if (global.broadcastProgress) {
      global.broadcastProgress(userId, { type: 'pipeline_update', jobId, videoId, step, status, ...data });
    }
  };

  const userOutputDir = path.join(OUTPUT_DIR, String(userId));
  if (!fs.existsSync(userOutputDir)) fs.mkdirSync(userOutputDir, { recursive: true });

  let scriptData, voiceUrl, avatarVideoUrl, thumbnailUrl, finalVideoUrl;

  try {
    // ── STEP 1: RESEARCH ──────────────────────────
    broadcast('research', 'running', { message: 'Analyzing viral content...' });
    if (!keys.anthropic_key) throw new Error('Anthropic API key missing');

    const researchData = await ai.researchIdeas(keys.anthropic_key, channelCtx, prompt);
    broadcast('research', 'done', { ideas: researchData.ideas });

    // Use top idea or user prompt directly
    const chosenTopic = researchData.ideas?.[0]?.title || prompt;

    // ── STEP 2: SCRIPT ────────────────────────────
    broadcast('script', 'running', { message: 'Writing script...' });
    scriptData = await ai.writeScript(keys.anthropic_key, channelCtx, chosenTopic);

    db.prepare('UPDATE videos SET title = ?, script = ? WHERE id = ?')
      .run(scriptData.title, scriptData.script, videoId);
    broadcast('script', 'done', { title: scriptData.title, wordCount: scriptData.word_count });

    // ── STEP 3: VOICE ─────────────────────────────
    broadcast('voice', 'running', { message: 'Generating voice...' });
    const voicePath = path.join(userOutputDir, `voice_${videoId}.mp3`);
    const voiceText = scriptData.script || '';

    if (voiceProvider === 'minimax' && keys.minimax_key) {
      await ai.minimaxGenerateVoice(keys.minimax_key, keys.minimax_group_id, voiceText, null, voicePath);
    } else if (keys.elevenlabs_key) {
      const voiceId = channel?.voice_id || null;
      await ai.generateVoice(keys.elevenlabs_key, voiceText, voiceId, voicePath);
    } else {
      throw new Error('No voice API key (ElevenLabs or MiniMax) configured');
    }

    voiceUrl = `/outputs/${userId}/voice_${videoId}.mp3`;
    db.prepare('UPDATE videos SET voice_url = ? WHERE id = ?').run(voiceUrl, videoId);
    broadcast('voice', 'done', { voiceUrl });

    // ── STEP 4: AVATAR / VIDEO ────────────────────
    if (videoType === 'avatar' && keys.heygen_key) {
      broadcast('avatar', 'running', { message: 'Generating AI avatar (this takes ~5 min)...' });
      const avatarId = channel?.avatar_id;
      if (!avatarId) throw new Error('No avatar ID set for this channel. Update channel settings.');

      const heygenVoiceId = channel?.voice_id || null;
      const heygenVideoId = await ai.heygenCreateVideo(
        keys.heygen_key, avatarId, heygenVoiceId, scriptData.script
      );
      broadcast('avatar', 'processing', { message: 'HeyGen rendering...', heygenVideoId });

      const heygenUrl = await ai.heygenPollVideo(keys.heygen_key, heygenVideoId);
      const avatarPath = path.join(userOutputDir, `avatar_${videoId}.mp4`);
      await ai.downloadFile(heygenUrl, avatarPath);
      avatarVideoUrl = `/outputs/${userId}/avatar_${videoId}.mp4`;
      db.prepare('UPDATE videos SET avatar_video_url = ? WHERE id = ?').run(avatarVideoUrl, videoId);
      broadcast('avatar', 'done', { avatarVideoUrl });

    } else if (videoType === 'faceless') {
      // Faceless: generate B-roll clips with Kling or Runway
      broadcast('avatar', 'running', { message: 'Generating B-roll video clips...' });

      if (keys.kling_key && keys.kling_secret) {
        const klingPrompt = `Professional YouTube video background: ${scriptData.title}. Cinematic, high quality.`;
        const taskId = await ai.klingGenerateVideo(keys.kling_key, keys.kling_secret, klingPrompt);
        broadcast('avatar', 'processing', { message: 'Kling AI rendering...' });

        // Poll Kling
        let klingDone = false;
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 10000));
          const klingData = await ai.klingCheckStatus(keys.kling_key, keys.kling_secret, taskId);
          if (klingData.task_status === 'succeed') {
            const clipUrl = klingData.task_result?.videos?.[0]?.url;
            if (clipUrl) {
              const clipPath = path.join(userOutputDir, `broll_${videoId}.mp4`);
              await ai.downloadFile(clipUrl, clipPath);
              avatarVideoUrl = `/outputs/${userId}/broll_${videoId}.mp4`;
              db.prepare('UPDATE videos SET avatar_video_url = ? WHERE id = ?').run(avatarVideoUrl, videoId);
            }
            klingDone = true;
            break;
          }
          if (klingData.task_status === 'failed') throw new Error('Kling video generation failed');
        }
        if (!klingDone) throw new Error('Kling timed out');

      } else if (keys.runway_key) {
        const rwPrompt = `Cinematic B-roll: ${scriptData.title}. Professional, high quality footage.`;
        const rwTaskId = await ai.runwayGenerateVideo(keys.runway_key, rwPrompt);
        broadcast('avatar', 'processing', { message: 'Runway rendering...' });
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 8000));
          const rwData = await ai.runwayCheckStatus(keys.runway_key, rwTaskId);
          if (rwData.status === 'SUCCEEDED') {
            const clipUrl = rwData.output?.[0];
            if (clipUrl) {
              const clipPath = path.join(userOutputDir, `broll_${videoId}.mp4`);
              await ai.downloadFile(clipUrl, clipPath);
              avatarVideoUrl = `/outputs/${userId}/broll_${videoId}.mp4`;
              db.prepare('UPDATE videos SET avatar_video_url = ? WHERE id = ?').run(avatarVideoUrl, videoId);
            }
            break;
          }
          if (rwData.status === 'FAILED') throw new Error('Runway failed');
        }
      } else {
        broadcast('avatar', 'skipped', { message: 'No video generation key (Kling/Runway). Skipped.' });
      }
      broadcast('avatar', 'done', { avatarVideoUrl });
    } else {
      broadcast('avatar', 'skipped', { message: 'No avatar provider selected' });
    }

    // ── STEP 5: THUMBNAIL ─────────────────────────
    broadcast('thumbnail', 'running', { message: 'Creating thumbnail...' });
    const thumbConcept = await ai.thumbnailConcept(
      keys.anthropic_key, scriptData.title, channel?.audience || 'general audience'
    );

    if (keys.fal_key) {
      const thumbPrompt = `YouTube thumbnail for "${scriptData.title}". ${thumbConcept.background_color} background. ${thumbConcept.emotion} expression. Professional, eye-catching, viral. Text overlay: ${thumbConcept.text_overlay}. 4K quality.`;
      const thumbImageUrl = await ai.falGenerateImage(keys.fal_key, thumbPrompt, 1280, 720);
      if (thumbImageUrl) {
        const thumbPath = path.join(userOutputDir, `thumb_${videoId}.jpg`);
        await ai.downloadFile(thumbImageUrl, thumbPath);
        thumbnailUrl = `/outputs/${userId}/thumb_${videoId}.jpg`;
        db.prepare('UPDATE videos SET thumbnail_url = ? WHERE id = ?').run(thumbnailUrl, videoId);
      }
    }
    broadcast('thumbnail', 'done', { thumbnailUrl, concept: thumbConcept });

    // ── STEP 6: FINALIZE ──────────────────────────
    broadcast('render', 'running', { message: 'Finalizing video package...' });

    // At this point final video = avatar/broll video
    // In a full system you'd use FFmpeg to merge audio+video
    finalVideoUrl = avatarVideoUrl;
    db.prepare('UPDATE videos SET final_video_url = ?, status = ? WHERE id = ?')
      .run(finalVideoUrl, 'ready', videoId);

    db.prepare('UPDATE pipeline_jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('completed', jobId);

    broadcast('render', 'done', {
      finalVideoUrl,
      thumbnailUrl,
      title: scriptData.title,
      message: '✅ Video ready!'
    });

    return { success: true, jobId, videoId, title: scriptData.title, finalVideoUrl, thumbnailUrl };

  } catch (err) {
    db.prepare('UPDATE pipeline_jobs SET status = ?, error = ? WHERE id = ?')
      .run('failed', err.message, jobId);
    db.prepare("UPDATE videos SET status = 'failed' WHERE id = ?").run(videoId);
    broadcast('error', 'failed', { message: err.message });
    throw err;
  }
}

module.exports = { runPipeline };
