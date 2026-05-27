const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════
//  ANTHROPIC (Claude) — Script & Research
// ═══════════════════════════════════════
async function claudeGenerate(apiKey, systemPrompt, userPrompt, maxTokens = 1500) {
  const res = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  }, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }
  });
  return res.data.content[0].text;
}

// Research viral video ideas
async function researchIdeas(apiKey, channelContext, userPrompt) {
  const system = `You are a YouTube research expert specializing in viral content. Always respond with valid JSON only, no markdown.`;
  const prompt = `Channel info: ${channelContext}\nUser request: "${userPrompt}"\n\nGenerate 3 compelling viral video ideas based on outlier analysis.\n\nRespond ONLY with this JSON:\n{"ideas":[{"title":"...","description":"...","hook":"...","potential":"High|Medium","tags":["tag1","tag2"]}]}`;
  const text = await claudeGenerate(apiKey, system, prompt);
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// Write full script
async function writeScript(apiKey, channelContext, topic) {
  const system = `You are an expert YouTube scriptwriter. Always respond with valid JSON only, no markdown.`;
  const prompt = `Channel: ${channelContext}\nVideo topic: "${topic}"\n\nWrite a compelling 60-second YouTube script.\n\nRespond ONLY with this JSON:\n{"title":"...","hook":"...","script":"...","cta":"...","word_count":150}`;
  const text = await claudeGenerate(apiKey, system, prompt, 2000);
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// Generate thumbnail concept
async function thumbnailConcept(apiKey, title, audience) {
  const system = `You are a YouTube thumbnail expert. Always respond with valid JSON only.`;
  const prompt = `Video title: "${title}"\nAudience: ${audience}\n\nCreate a viral thumbnail concept.\n\nRespond ONLY with JSON:\n{"text_overlay":"...","background_color":"...","accent_color":"...","emotion":"...","layout":"...","tips":["tip1","tip2"]}`;
  const text = await claudeGenerate(apiKey, system, prompt, 500);
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// ═══════════════════════════════════════
//  ELEVENLABS — Voice Generation
// ═══════════════════════════════════════
async function generateVoice(apiKey, text, voiceId, outputPath) {
  // Default voice: Rachel
  const vid = voiceId || '21m00Tcm4TlvDq8ikWAM';
  const res = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${vid}`,
    {
      text,
      model_id: 'eleven_turbo_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 }
    },
    {
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      responseType: 'arraybuffer'
    }
  );
  fs.writeFileSync(outputPath, Buffer.from(res.data));
  return outputPath;
}

async function getVoicesList(apiKey) {
  const res = await axios.get('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey }
  });
  return res.data.voices.map(v => ({ id: v.voice_id, name: v.name, preview: v.preview_url }));
}

// ═══════════════════════════════════════
//  MINIMAX — Voice Generation (alternative)
// ═══════════════════════════════════════
async function minimaxGenerateVoice(apiKey, groupId, text, voiceId, outputPath) {
  const res = await axios.post(
    `https://api.minimax.chat/v1/t2a_v2?GroupId=${groupId}`,
    {
      model: 'speech-01-turbo',
      text,
      stream: false,
      voice_setting: { voice_id: voiceId || 'male-qn-qingse', speed: 1.0, vol: 1.0, pitch: 0 },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3' }
    },
    {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    }
  );
  const audioHex = res.data.data?.audio;
  if (audioHex) {
    fs.writeFileSync(outputPath, Buffer.from(audioHex, 'hex'));
    return outputPath;
  }
  throw new Error('MiniMax: no audio in response');
}

// ═══════════════════════════════════════
//  HEYGEN — Avatar Video
// ═══════════════════════════════════════
async function heygenCreateVideo(apiKey, avatarId, voiceId, script, outputDir) {
  // Submit video generation job
  const res = await axios.post('https://api.heygen.com/v2/video/generate', {
    video_inputs: [{
      character: {
        type: 'avatar',
        avatar_id: avatarId,
        avatar_style: 'normal'
      },
      voice: {
        type: 'text',
        voice_id: voiceId || 'en-US-BrianNeural',
        input_text: script
      },
      background: { type: 'color', value: '#1a1a2e' }
    }],
    dimension: { width: 1280, height: 720 },
    aspect_ratio: '16:9'
  }, {
    headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' }
  });
  return res.data.data?.video_id;
}

async function heygenCheckStatus(apiKey, videoId) {
  const res = await axios.get(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
    headers: { 'X-Api-Key': apiKey }
  });
  return res.data.data; // { status, video_url, thumbnail_url }
}

async function heygenGetAvatars(apiKey) {
  const res = await axios.get('https://api.heygen.com/v2/avatars', {
    headers: { 'X-Api-Key': apiKey }
  });
  return res.data.data?.avatars || [];
}

// Poll HeyGen until video is done (max 10 min)
async function heygenPollVideo(apiKey, videoId, maxWaitMs = 600000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 8000));
    const data = await heygenCheckStatus(apiKey, videoId);
    if (data.status === 'completed') return data.video_url;
    if (data.status === 'failed') throw new Error('HeyGen video generation failed');
  }
  throw new Error('HeyGen timed out');
}

// ═══════════════════════════════════════
//  KLING AI — Text/Image to Video
// ═══════════════════════════════════════
async function klingGenerateVideo(apiKey, apiSecret, prompt, imageUrl = null) {
  // Kling uses JWT auth
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { iss: apiKey, exp: Math.floor(Date.now() / 1000) + 1800 },
    apiSecret,
    { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
  );

  const endpoint = imageUrl
    ? 'https://api.klingai.com/v1/videos/image2video'
    : 'https://api.klingai.com/v1/videos/text2video';

  const body = imageUrl
    ? { model_name: 'kling-v1', image: imageUrl, prompt, duration: '5', aspect_ratio: '16:9' }
    : { model_name: 'kling-v1', prompt, negative_prompt: 'blur, low quality', duration: '5', aspect_ratio: '16:9', cfg_scale: 0.5 };

  const res = await axios.post(endpoint, body, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  return res.data.data?.task_id;
}

async function klingCheckStatus(apiKey, apiSecret, taskId) {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { iss: apiKey, exp: Math.floor(Date.now() / 1000) + 1800 },
    apiSecret,
    { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } }
  );
  const res = await axios.get(`https://api.klingai.com/v1/videos/text2video/${taskId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.data.data;
}

// ═══════════════════════════════════════
//  RUNWAY — Text/Image to Video
// ═══════════════════════════════════════
async function runwayGenerateVideo(apiKey, promptText, promptImage = null) {
  const body = {
    promptText,
    model: 'gen3a_turbo',
    duration: 5,
    ratio: '1280:768',
    watermark: false
  };
  if (promptImage) body.promptImage = promptImage;

  const res = await axios.post('https://api.dev.runwayml.com/v1/image_to_video', body, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06'
    }
  });
  return res.data.id; // task id
}

async function runwayCheckStatus(apiKey, taskId) {
  const res = await axios.get(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Runway-Version': '2024-11-06' }
  });
  return res.data; // { status, output: [url] }
}

// ═══════════════════════════════════════
//  FAL.AI — Image Generation (Thumbnails)
// ═══════════════════════════════════════
async function falGenerateImage(apiKey, prompt, width = 1280, height = 720) {
  const res = await axios.post('https://fal.run/fal-ai/flux/schnell', {
    prompt,
    image_size: { width, height },
    num_images: 1,
    enable_safety_checker: true
  }, {
    headers: { 'Authorization': `Key ${apiKey}`, 'Content-Type': 'application/json' }
  });
  return res.data.images?.[0]?.url;
}

// ═══════════════════════════════════════
//  Download helper
// ═══════════════════════════════════════
async function downloadFile(url, destPath) {
  const res = await axios.get(url, { responseType: 'stream' });
  const writer = fs.createWriteStream(destPath);
  res.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

module.exports = {
  claudeGenerate, researchIdeas, writeScript, thumbnailConcept,
  generateVoice, getVoicesList,
  minimaxGenerateVoice,
  heygenCreateVideo, heygenCheckStatus, heygenGetAvatars, heygenPollVideo,
  klingGenerateVideo, klingCheckStatus,
  runwayGenerateVideo, runwayCheckStatus,
  falGenerateImage,
  downloadFile
};
