import { useState, useEffect } from 'react';
import { integrationsAPI } from '../services/api';
import { useToast } from '../components/Toast';

const PROVIDERS = [
  { key:'anthropic',  label:'Anthropic (Claude)',  icon:'🤖', desc:'Script writing & research',       field:'anthropic_key',   link:'https://console.anthropic.com' },
  { key:'elevenlabs', label:'ElevenLabs',           icon:'🎙️', desc:'AI voice generation',             field:'elevenlabs_key',  link:'https://elevenlabs.io' },
  { key:'heygen',     label:'HeyGen',               icon:'👤', desc:'AI Avatar videos',                field:'heygen_key',      link:'https://heygen.com' },
  { key:'minimax',    label:'MiniMax',              icon:'🔊', desc:'Voice alternative (cheaper)',     field:'minimax_key',     link:'https://minimax.chat' },
  { key:'kling',      label:'Kling AI',             icon:'🎬', desc:'Text/Image to video (faceless)',  field:'kling_key',       link:'https://klingai.com' },
  { key:'runway',     label:'Runway',               icon:'🎞️', desc:'Video generation alternative',   field:'runway_key',      link:'https://runwayml.com' },
  { key:'fal',        label:'FAL.ai',               icon:'🖼️', desc:'AI thumbnail image generation',  field:'fal_key',         link:'https://fal.ai' },
  { key:'openai',     label:'OpenAI',               icon:'⚡', desc:'GPT alternative for scripts',    field:'openai_key',      link:'https://platform.openai.com' },
];

export default function IntegrationsPage() {
  const toast = useToast();
  const [status, setStatus] = useState({});
  const [form, setForm] = useState({});
  const [minimaxGroup, setMinimaxGroup] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    integrationsAPI.get().then(setStatus).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([k, v]) => { if (v.trim()) payload[k] = v.trim(); });
      if (minimaxGroup) payload.minimax_group_id = minimaxGroup;
      await integrationsAPI.save(payload);
      toast('API keys saved securely ✅');
      setForm({});
      const fresh = await integrationsAPI.get();
      setStatus(fresh);
    } catch (e) {
      toast(e.response?.data?.error || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const remove = async (provider) => {
    if (!window.confirm(`Remove ${provider} key?`)) return;
    await integrationsAPI.remove(provider);
    toast(`${provider} disconnected`);
    setStatus(s => ({ ...s, [provider]: { connected: false } }));
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>🔌 Integrations</h1>
          <p style={s.sub}>আপনার AI provider accounts connect করুন। Keys encrypted হয়ে সেভ হয়।</p>
        </div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? <span className="spinner"/> : '💾 Save All Keys'}
        </button>
      </div>

      <div style={s.grid}>
        {PROVIDERS.map(p => {
          const connected = status[p.key]?.connected;
          const masked = status[p.key]?.masked;
          return (
            <div key={p.key} className="card" style={{ ...s.card, ...(connected ? s.cardConnected : {}) }}>
              <div style={s.cardTop}>
                <div style={s.cardIcon}>{p.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)' }}>{p.desc}</div>
                </div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  {connected
                    ? <span className="badge badge-green">● Connected</span>
                    : <span className="badge badge-gray">○ Not set</span>}
                  <a href={p.link} target="_blank" rel="noreferrer"
                    style={{ fontSize:11, color:'var(--accent)', textDecoration:'underline' }}>
                    Get key
                  </a>
                </div>
              </div>

              {connected ? (
                <div style={s.connectedRow}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--text2)' }}>{masked}</span>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(p.key)}>Remove</button>
                </div>
              ) : (
                <input
                  type="password"
                  placeholder={`Enter ${p.label} API key...`}
                  value={form[p.field] || ''}
                  onChange={e => setForm({ ...form, [p.field]: e.target.value })}
                  style={{ marginTop: 12 }}
                />
              )}

              {p.key === 'minimax' && !connected && (
                <input
                  type="text" placeholder="MiniMax Group ID"
                  value={minimaxGroup}
                  onChange={e => setMinimaxGroup(e.target.value)}
                  style={{ marginTop: 8 }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop:20, background:'rgba(91,94,244,.06)', borderColor:'rgba(91,94,244,.2)' }}>
        <div style={{ fontWeight:700, marginBottom:8 }}>💡 কোন API গুলো দরকার?</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:13, color:'var(--text2)' }}>
          <div>✅ <strong>Anthropic</strong> — অবশ্যই লাগবে (script)</div>
          <div>✅ <strong>ElevenLabs</strong> — অবশ্যই লাগবে (voice)</div>
          <div>✅ <strong>HeyGen</strong> — Avatar video চাইলে</div>
          <div>✅ <strong>Kling/Runway</strong> — Faceless video চাইলে</div>
          <div>⚡ <strong>FAL.ai</strong> — AI thumbnail চাইলে</div>
          <div>⚡ <strong>MiniMax</strong> — সস্তা voice alternative</div>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { padding: '28px 32px', maxWidth: 900, margin: '0 auto' },
  header: { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28, gap:16 },
  title: { fontSize:24, fontWeight:700, marginBottom:4 },
  sub: { color:'var(--text2)', fontSize:14 },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(380px, 1fr))', gap:14 },
  card: { transition:'border-color .2s' },
  cardConnected: { borderColor:'rgba(0,229,160,.3)' },
  cardTop: { display:'flex', alignItems:'center', gap:12 },
  cardIcon: { width:40, height:40, borderRadius:10, background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 },
  connectedRow: { display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12, padding:'8px 12px', background:'var(--surface2)', borderRadius:8 },
};
