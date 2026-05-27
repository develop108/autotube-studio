# 🎬 AutoTube Studio — Full Stack AI YouTube Automation

Rookcast.com-এর মতো একটি সম্পূর্ণ AI YouTube Automation platform।

---

## 📁 Project Structure

```
autotube/
├── backend/
│   ├── server.js              # Main Express server + WebSocket
│   ├── .env.example           # Environment variables template
│   ├── package.json
│   ├── routes/
│   │   ├── auth.js            # Register / Login / JWT
│   │   ├── channels.js        # Channel CRUD
│   │   ├── pipeline.js        # Video generation pipeline
│   │   ├── integrations.js    # API key management
│   │   └── videos.js          # Video library
│   ├── services/
│   │   ├── aiServices.js      # All AI API calls
│   │   └── pipeline.js        # Pipeline orchestrator
│   ├── middleware/
│   │   └── auth.js            # JWT middleware
│   └── utils/
│       └── db.js              # SQLite database
├── frontend/                  # Your React frontend (connect to API)
├── nginx.conf                 # Production Nginx config
├── deploy.sh                  # One-command VPS deployment
└── ecosystem.config.js        # PM2 process manager config
```

---

## ⚡ A-Z Setup Guide

### STEP 1 — VPS কিনুন
- DigitalOcean, Hostinger, Vultr থেকে **Ubuntu 22.04** VPS নিন
- Minimum: **2 vCPU, 2GB RAM** ($12-15/month)

### STEP 2 — Domain Setup
- Namecheap/GoDaddy থেকে domain কিনুন
- DNS A record → VPS IP address পয়েন্ট করুন

### STEP 3 — Deploy করুন
```bash
# VPS-এ SSH করুন
ssh root@YOUR_VPS_IP

# Project ফাইলগুলো আপলোড করুন
scp -r ./autotube/* root@YOUR_VPS_IP:/var/www/autotube/

# Deploy script রান করুন
bash /var/www/autotube/deploy.sh
```

### STEP 4 — API Keys সেট করুন
```bash
nano /var/www/autotube/backend/.env
```
নিচের keys গুলো পূরণ করুন:

| Service | কোথায় পাবেন | দাম |
|---|---|---|
| **Anthropic** | console.anthropic.com | Pay-per-use |
| **ElevenLabs** | elevenlabs.io | $5/month থেকে |
| **HeyGen** | heygen.com | $29/month থেকে |
| **Kling AI** | klingai.com | Pay-per-use |
| **Runway** | runwayml.com | $15/month থেকে |
| **FAL.ai** | fal.ai | Pay-per-use |
| **MiniMax** | minimax.chat | Pay-per-use |

### STEP 5 — SSL Certificate
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### STEP 6 — PM2 দিয়ে Server চালু করুন
```bash
pm2 restart autotube
pm2 logs autotube  # লাইভ লগ দেখুন
```

---

## 🔌 API Endpoints

### Auth
```
POST /api/auth/register    — নতুন account
POST /api/auth/login       — Login, JWT token পাবেন
GET  /api/auth/me          — Current user info
```

### Integrations (API Keys)
```
GET    /api/integrations   — সব keys দেখুন (masked)
POST   /api/integrations   — Keys সেভ করুন
DELETE /api/integrations/:provider  — একটি key মুছুন
```

### Channels
```
GET    /api/channels        — সব চ্যানেল
POST   /api/channels        — নতুন চ্যানেল
PATCH  /api/channels/:id    — চ্যানেল আপডেট
DELETE /api/channels/:id    — চ্যানেল মুছুন
```

### Pipeline (ভিডিও বানানো)
```
POST /api/pipeline/run      — Pipeline শুরু করুন
GET  /api/pipeline/jobs     — সব jobs
GET  /api/pipeline/jobs/:id — একটি job এর status
GET  /api/pipeline/avatars  — HeyGen avatars list
GET  /api/pipeline/voices   — ElevenLabs voices list
```

### Videos
```
GET    /api/videos          — সব ভিডিও
GET    /api/videos/:id      — একটি ভিডিও
DELETE /api/videos/:id      — ভিডিও মুছুন
```

### WebSocket (Real-time progress)
```
ws://yourdomain.com/ws?userId=USER_ID
```
Messages আসবে:
```json
{"type": "pipeline_update", "step": "script", "status": "done", "title": "..."}
```

---

## 🎬 Pipeline Flow

```
User Prompt
    ↓
1. RESEARCH   → Claude API → 3 viral ideas
    ↓
2. SCRIPT     → Claude API → Full script + hook + CTA
    ↓
3. VOICE      → ElevenLabs OR MiniMax → MP3 file
    ↓
4. AVATAR     → HeyGen (avatar) OR Kling/Runway (faceless) → MP4
    ↓
5. THUMBNAIL  → Claude concept + FAL.ai image → JPG
    ↓
6. DONE       → Files saved, WebSocket notification sent
```

---

## 🖥️ Frontend Connection

Frontend থেকে API call করুন:

```javascript
// Login
const { token } = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
}).then(r => r.json());

// Save API keys
await fetch('/api/integrations', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ anthropic_key: '...', elevenlabs_key: '...' })
});

// Start pipeline
await fetch('/api/pipeline/run', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ channelId: 1, prompt: 'IRS tax tips for seniors', videoType: 'avatar' })
});

// WebSocket for real-time updates
const ws = new WebSocket(`wss://yourdomain.com/ws?userId=${userId}`);
ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  console.log(data.step, data.status); // "script", "done"
};
```

---

## 💡 Important Notes

1. **HeyGen** — Avatar generate করতে avatar_id লাগবে। Channel settings-এ সেট করুন।
2. **Voice** — ElevenLabs-এ voice_id না দিলে default "Rachel" voice ব্যবহার হবে।
3. **Faceless** — Kling বা Runway এর যেকোনো একটি লাগবে।
4. **Thumbnail** — FAL.ai key না থাকলে শুধু concept দেবে, image generate করবে না।
5. **FFmpeg** — Voice + Video merge করতে FFmpeg যোগ করুন (advanced step)।

---

## 🔧 Troubleshooting

```bash
# Server বন্ধ হয়ে গেলে
pm2 restart autotube

# Logs দেখুন
pm2 logs autotube --lines 100

# Nginx reload
nginx -t && systemctl reload nginx

# Port check
netstat -tlnp | grep 3001
```
