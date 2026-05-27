# 🚀 AutoTube Studio — Deploy Guide (Railway + Vercel)
### কোনো VPS লাগবে না, কোডিং লাগবে না

---

## 📁 ফাইল স্ট্রাকচার

```
autotube-project/
├── backend/          ← Railway-তে deploy হবে
└── frontend/         ← Vercel-এ deploy হবে
```

---

## STEP 1 — GitHub এ code upload করুন

1. **github.com** এ account খুলুন (free)
2. "New Repository" → নাম দিন `autotube-studio` → Create
3. আপনার computer-এ **GitHub Desktop** ইনস্টল করুন
4. Repository clone করুন
5. `backend/` এবং `frontend/` ফোল্ডার দুটো সেই folder-এ রাখুন
6. **Commit & Push** করুন

---

## STEP 2 — Backend Railway-তে Deploy করুন

1. **railway.app** এ যান → GitHub দিয়ে login
2. "New Project" → "Deploy from GitHub repo" → `autotube-studio` বেছে নিন
3. "Add Service" → `backend` ফোল্ডার বেছে নিন
4. Railway automatically deploy করবে

### Environment Variables সেট করুন (Railway Dashboard):
```
PORT                = 3001
NODE_ENV            = production
JWT_SECRET          = (যেকোনো random string, min 32 chars)
FRONTEND_URL        = https://your-app.vercel.app  (পরে দিন)

# AI Keys (যেগুলো আছে)
ANTHROPIC_API_KEY   = sk-ant-...
ELEVENLABS_API_KEY  = xi-api-...
HEYGEN_API_KEY      = ...
KLING_API_KEY       = ...
KLING_API_SECRET    = ...
RUNWAY_API_KEY      = ...
FAL_API_KEY         = ...
MINIMAX_API_KEY     = ...
MINIMAX_GROUP_ID    = ...
```

5. Deploy হলে Railway একটি URL দেবে, যেমন:
   `https://autotube-backend-production.up.railway.app`
   এটা note করে রাখুন।

---

## STEP 3 — Frontend Vercel-এ Deploy করুন

1. **vercel.com** এ যান → GitHub দিয়ে login
2. "Add New Project" → `autotube-studio` repo বেছে নিন
3. **Root Directory** → `frontend` বেছে নিন
4. **Framework**: Create React App
5. **Environment Variables** যোগ করুন:
   ```
   REACT_APP_API_URL = https://autotube-backend-production.up.railway.app
   REACT_APP_WS_URL  = wss://autotube-backend-production.up.railway.app
   ```
6. "Deploy" চাপুন

Vercel একটি URL দেবে, যেমন: `https://autotube-studio.vercel.app`

---

## STEP 4 — Railway-তে FRONTEND_URL আপডেট করুন

Railway Dashboard → Variables → `FRONTEND_URL` = `https://autotube-studio.vercel.app`
তারপর Redeploy করুন।

---

## STEP 5 — প্রথমবার ব্যবহার

1. `https://autotube-studio.vercel.app` এ যান
2. Register করুন
3. **Integrations** পেজে API keys দিন
4. **Channels** পেজে চ্যানেল তৈরি করুন (avatar_id দিন)
5. **Pipeline** তে topic দিয়ে ভিডিও বানান!

---

## 💰 Monthly Cost

| Service | Cost |
|---|---|
| Railway (backend) | ~$5/month |
| Vercel (frontend) | Free |
| Anthropic API | Pay-per-use (~$0.01/video) |
| ElevenLabs | $5/month থেকে |
| HeyGen | $29/month থেকে |
| **Total minimum** | **~$39/month** |

---

## 🔧 Problems?

### Backend URL কাজ করছে না?
Railway Dashboard → Logs দেখুন

### CORS error?
Railway-এ `FRONTEND_URL` ঠিকমতো সেট করুন

### WebSocket connect হচ্ছে না?
`REACT_APP_WS_URL` এ `wss://` (https এর জায়গায়) আছে কিনা দেখুন

### HeyGen avatar পাচ্ছেন না?
HeyGen Dashboard → Avatars → Avatar ID copy করুন → Channel settings-এ paste করুন
