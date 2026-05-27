import { useState, useEffect } from 'react';
import { channelsAPI, pipelineAPI } from '../services/api';
import { useToast } from '../components/Toast';

const EMOJIS = ['💼','🩺','🌿','🏠','💡','📚','💰','🍳','🏋️','✈️','🎵','🐾'];

function ChannelModal({ channel, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!channel?.id;
  const [form, setForm] = useState({
    name: channel?.name||'', niche: channel?.niche||'',
    audience: channel?.audience||'', style: channel?.style||'',
    emoji: channel?.emoji||'📺', avatar_id: channel?.avatar_id||'',
    voice_id: channel?.voice_id||'',
  });
  const [saving, setSaving] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [voices, setVoices]  = useState([]);

  useEffect(() => {
    pipelineAPI.avatars().then(setAvatars).catch(() => {});
    pipelineAPI.voices().then(setVoices).catch(() => {});
  }, []);

  const save = async () => {
    if (!form.name) return toast('Channel name required', 'error');
    setSaving(true);
    try {
      if (isEdit) await channelsAPI.update(channel.id, form);
      else        await channelsAPI.create(form);
      toast(isEdit ? 'Channel updated ✅' : 'Channel created ✅');
      onSaved();
    } catch (e) {
      toast(e.response?.data?.error || 'Error', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div style={m.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={m.modal}>
        <div style={m.mHead}>
          <h2 style={{fontSize:18,fontWeight:700}}>{isEdit ? 'Edit Channel' : 'New Channel'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Emoji picker */}
          <div className="field">
            <label>Icon</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {EMOJIS.map(e => (
                <button key={e} onClick={()=>setForm({...form,emoji:e})}
                  style={{...m.emoji, ...(form.emoji===e?m.emojiActive:{})}}>{e}</button>
              ))}
            </div>
          </div>

          <div className="two-col">
            <div className="field"><label>Channel Name *</label>
              <input placeholder="Marcus Finance" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div className="field"><label>Niche</label>
              <input placeholder="Senior finance tips" value={form.niche} onChange={e=>setForm({...form,niche:e.target.value})} /></div>
          </div>

          <div className="field"><label>Target Audience</label>
            <input placeholder="Seniors 60+, retirees..." value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})} /></div>

          <div className="field"><label>Channel Style / Tone</label>
            <textarea rows={3} placeholder="Friendly financial advisor, simple language, no jargon..." value={form.style} onChange={e=>setForm({...form,style:e.target.value})} /></div>

          {avatars.length > 0 && (
            <div className="field"><label>HeyGen Avatar</label>
              <select value={form.avatar_id} onChange={e=>setForm({...form,avatar_id:e.target.value})}>
                <option value="">— Select Avatar —</option>
                {avatars.map(a=><option key={a.avatar_id} value={a.avatar_id}>{a.avatar_name}</option>)}
              </select>
            </div>
          )}

          {avatars.length === 0 && (
            <div className="field"><label>HeyGen Avatar ID</label>
              <input placeholder="Paste avatar ID from HeyGen dashboard..." value={form.avatar_id} onChange={e=>setForm({...form,avatar_id:e.target.value})} /></div>
          )}

          {voices.length > 0 ? (
            <div className="field"><label>ElevenLabs Voice</label>
              <select value={form.voice_id} onChange={e=>setForm({...form,voice_id:e.target.value})}>
                <option value="">— Default Voice —</option>
                {voices.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="field"><label>ElevenLabs Voice ID</label>
              <input placeholder="Voice ID (optional — uses default if empty)" value={form.voice_id} onChange={e=>setForm({...form,voice_id:e.target.value})} /></div>
          )}
        </div>

        <div style={{display:'flex',gap:10,marginTop:24}}>
          <button className="btn btn-ghost" onClick={onClose} style={{flex:1}}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{flex:2}}>
            {saving ? <span className="spinner"/> : isEdit ? 'Save Changes' : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChannelsPage() {
  const toast = useToast();
  const [channels, setChannels] = useState([]);
  const [modal, setModal] = useState(null); // null | 'new' | channel obj

  const load = () => channelsAPI.list().then(setChannels).catch(()=>{});
  useEffect(() => { load(); }, []);

  const del = async (ch) => {
    if (!window.confirm(`"${ch.name}" delete করবেন?`)) return;
    await channelsAPI.delete(ch.id);
    toast('Channel deleted');
    load();
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div><h1 style={s.title}>📺 Channels</h1>
          <p style={s.sub}>প্রতিটি channel আলাদা niche ও avatar দিয়ে configure করুন</p></div>
        <button className="btn btn-primary" onClick={()=>setModal('new')}>+ New Channel</button>
      </div>

      {channels.length === 0 ? (
        <div style={s.empty}>
          <div style={{fontSize:48,marginBottom:16}}>📺</div>
          <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>No channels yet</div>
          <div style={{color:'var(--text2)',marginBottom:20}}>প্রথম channel তৈরি করুন</div>
          <button className="btn btn-primary" onClick={()=>setModal('new')}>+ Create First Channel</button>
        </div>
      ) : (
        <div style={s.grid}>
          {channels.map(ch => (
            <div key={ch.id} className="card" style={s.card}>
              <div style={s.cardTop}>
                <div style={s.avatar}>{ch.emoji}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:16}}>{ch.name}</div>
                  <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{ch.niche}</div>
                </div>
              </div>
              <div style={s.stats}>
                <div style={s.stat}><div style={{fontWeight:700,fontSize:18}}>{ch.video_count||0}</div><div style={s.statL}>Videos</div></div>
                <div style={s.stat}><div style={{fontWeight:700,fontSize:18,color:ch.avatar_id?'var(--green)':'var(--text3)'}}>{ch.avatar_id?'✓':'—'}</div><div style={s.statL}>Avatar</div></div>
                <div style={s.stat}><div style={{fontWeight:700,fontSize:18,color:ch.voice_id?'var(--green)':'var(--text3)'}}>{ch.voice_id?'✓':'—'}</div><div style={s.statL}>Voice</div></div>
              </div>
              <div style={s.audience}>👥 {ch.audience||'General audience'}</div>
              <div style={{display:'flex',gap:8,marginTop:14}}>
                <button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={()=>setModal(ch)}>✏️ Edit</button>
                <button className="btn btn-danger btn-sm" onClick={()=>del(ch)}>🗑</button>
              </div>
            </div>
          ))}
          <div style={s.addCard} onClick={()=>setModal('new')}>
            <div style={{fontSize:28}}>+</div>
            <div style={{fontWeight:700}}>New Channel</div>
          </div>
        </div>
      )}

      {modal && (
        <ChannelModal
          channel={modal === 'new' ? null : modal}
          onClose={()=>setModal(null)}
          onSaved={()=>{ setModal(null); load(); }}
        />
      )}
    </div>
  );
}

const s = {
  wrap:{padding:'28px 32px'},
  header:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28,gap:16},
  title:{fontSize:24,fontWeight:700,marginBottom:4},
  sub:{color:'var(--text2)',fontSize:14},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16},
  card:{transition:'border-color .2s',cursor:'default'},
  cardTop:{display:'flex',alignItems:'center',gap:12,marginBottom:16},
  avatar:{width:48,height:48,borderRadius:12,background:'var(--surface2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0},
  stats:{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8},
  stat:{background:'var(--surface2)',borderRadius:8,padding:'10px',textAlign:'center'},
  statL:{fontSize:10,color:'var(--text3)',marginTop:2},
  audience:{marginTop:12,fontSize:13,color:'var(--text2)',padding:'8px 12px',background:'var(--surface2)',borderRadius:8},
  addCard:{border:'2px dashed var(--border)',borderRadius:14,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,minHeight:200,cursor:'pointer',color:'var(--text3)',transition:'all .2s',},
  empty:{textAlign:'center',padding:'80px 24px',color:'var(--text2)'},
};

const m = {
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24,backdropFilter:'blur(8px)'},
  modal:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:18,width:'100%',maxWidth:560,padding:28,maxHeight:'90vh',overflowY:'auto'},
  mHead:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24},
  emoji:{width:36,height:36,borderRadius:8,border:'1px solid var(--border)',background:'var(--surface2)',fontSize:18,cursor:'pointer',transition:'all .15s'},
  emojiActive:{border:'2px solid var(--accent)',background:'rgba(91,94,244,.15)'},
};
