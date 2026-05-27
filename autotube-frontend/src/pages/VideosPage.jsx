import { useState, useEffect } from 'react';
import { videosAPI, channelsAPI } from '../services/api';
import { useToast } from '../components/Toast';

export default function VideosPage() {
  const toast = useToast();
  const [videos,   setVideos]   = useState([]);
  const [channels, setChannels] = useState([]);
  const [filter,   setFilter]   = useState('');

  const load = () => videosAPI.list(filter||undefined).then(setVideos).catch(()=>{});
  useEffect(() => { load(); }, [filter]);
  useEffect(() => { channelsAPI.list().then(setChannels).catch(()=>{}); }, []);

  const del = async (v) => {
    if (!window.confirm('Delete this video?')) return;
    await videosAPI.delete(v.id);
    toast('Video deleted');
    load();
  };

  const BASE = process.env.REACT_APP_API_URL || '';
  const statusColor = st => st==='ready'?'badge-green':st==='processing'?'badge-blue':st==='failed'?'badge-red':'badge-gray';

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div><h1 style={s.title}>🎬 Videos</h1><p style={s.sub}>Generated videos library</p></div>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{width:200}}>
          <option value="">All Channels</option>
          {channels.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
      </div>

      {videos.length === 0 ? (
        <div style={s.empty}>
          <div style={{fontSize:48,marginBottom:16}}>🎬</div>
          <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>No videos yet</div>
          <div style={{color:'var(--text2)'}}>Pipeline চালালেই এখানে videos আসবে</div>
        </div>
      ) : (
        <div style={s.grid}>
          {videos.map(v => (
            <div key={v.id} className="card" style={s.card}>
              {/* Thumbnail */}
              <div style={s.thumb}>
                {v.thumbnail_url
                  ? <img src={`${BASE}${v.thumbnail_url}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  : <div style={{fontSize:32}}>🎬</div>}
                <span className={`badge ${statusColor(v.status)}`} style={{position:'absolute',top:8,right:8}}>
                  {v.status}
                </span>
              </div>

              <div style={{padding:'14px'}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {v.title||'Processing...'}
                </div>
                <div style={{fontSize:12,color:'var(--text2)',marginBottom:12}}>
                  {v.channel_emoji} {v.channel_name||'No channel'} · {new Date(v.created_at).toLocaleDateString()}
                </div>

                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {v.final_video_url && (
                    <a href={`${BASE}${v.final_video_url}`} target="_blank" rel="noreferrer"
                      className="btn btn-ghost btn-sm">⬇️ Video</a>
                  )}
                  {v.voice_url && (
                    <a href={`${BASE}${v.voice_url}`} target="_blank" rel="noreferrer"
                      className="btn btn-ghost btn-sm">🎙️ Audio</a>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={()=>del(v)}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:{padding:'28px 32px'},
  header:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28,gap:16},
  title:{fontSize:24,fontWeight:700,marginBottom:4},
  sub:{color:'var(--text2)',fontSize:14},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:16},
  card:{padding:0,overflow:'hidden'},
  thumb:{aspectRatio:'16/9',background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'},
  empty:{textAlign:'center',padding:'80px 24px',color:'var(--text2)'},
};
