// DashboardPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { channelsAPI, videosAPI, pipelineAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [videos,   setVideos]   = useState([]);
  const [jobs,     setJobs]     = useState([]);

  useEffect(() => {
    channelsAPI.list().then(setChannels).catch(()=>{});
    videosAPI.list().then(setVideos).catch(()=>{});
    pipelineAPI.jobs().then(setJobs).catch(()=>{});
  }, []);

  const ready   = videos.filter(v=>v.status==='ready').length;
  const running = jobs.filter(j=>j.status==='running').length;

  return (
    <div style={s.wrap}>
      <div style={s.greeting}>
        <h1 style={s.title}>Welcome back{user?.name ? `, ${user.name}` : ''} 👋</h1>
        <p style={s.sub}>আজকে কোন চ্যানেলের ভিডিও বানাবেন?</p>
      </div>

      {/* Stats */}
      <div style={s.stats}>
        {[
          { label:'Channels', value: channels.length, icon:'📺', color:'var(--accent)' },
          { label:'Videos Ready', value: ready, icon:'🎬', color:'var(--green)' },
          { label:'Total Videos', value: videos.length, icon:'📹', color:'var(--yellow)' },
          { label:'Jobs Running', value: running, icon:'⚡', color:running>0?'var(--accent)':'var(--text3)' },
        ].map(stat => (
          <div key={stat.label} className="card" style={s.statCard}>
            <div style={{fontSize:28}}>{stat.icon}</div>
            <div style={{fontSize:32,fontWeight:700,color:stat.color,lineHeight:1}}>{stat.value}</div>
            <div style={{fontSize:13,color:'var(--text2)',marginTop:4}}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={s.actions}>
        <Link to="/pipeline" className="btn btn-primary" style={{padding:'14px 28px',fontSize:15}}>
          ▶ Start Pipeline
        </Link>
        <Link to="/channels" className="btn btn-ghost" style={{padding:'14px 28px',fontSize:15}}>
          📺 Manage Channels
        </Link>
        <Link to="/integrations" className="btn btn-ghost" style={{padding:'14px 28px',fontSize:15}}>
          🔌 API Keys
        </Link>
      </div>

      {/* Recent jobs */}
      {jobs.length > 0 && (
        <div style={{marginTop:32}}>
          <h2 style={{fontSize:18,fontWeight:700,marginBottom:16}}>Recent Pipeline Jobs</h2>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {jobs.slice(0,5).map(job=>(
              <div key={job.id} className="card card-sm" style={{display:'flex',alignItems:'center',gap:14}}>
                <span style={{fontSize:20}}>{job.status==='completed'?'✅':job.status==='running'?'⚡':job.status==='failed'?'❌':'⏳'}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14}}>{job.title||'Processing...'}</div>
                  <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{new Date(job.created_at).toLocaleString()}</div>
                </div>
                <span className={`badge badge-${job.status==='completed'?'green':job.status==='running'?'blue':job.status==='failed'?'red':'gray'}`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {channels.length === 0 && (
        <div className="card" style={{marginTop:32,textAlign:'center',padding:40,borderColor:'rgba(91,94,244,.2)',background:'rgba(91,94,244,.04)'}}>
          <div style={{fontSize:40,marginBottom:12}}>🚀</div>
          <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>Setup শুরু করুন</div>
          <div style={{color:'var(--text2)',marginBottom:20,fontSize:14}}>প্রথমে API keys, তারপর channel, তারপর ভিডিও বানান।</div>
          <div style={{display:'flex',gap:10,justifyContent:'center'}}>
            <Link to="/integrations" className="btn btn-primary">1. API Keys →</Link>
            <Link to="/channels" className="btn btn-ghost">2. Create Channel</Link>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:{padding:'28px 32px',maxWidth:960,margin:'0 auto'},
  greeting:{marginBottom:28},
  title:{fontSize:28,fontWeight:700,marginBottom:4},
  sub:{color:'var(--text2)',fontSize:15},
  stats:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24},
  statCard:{textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:6},
  actions:{display:'flex',gap:12,flexWrap:'wrap'},
};

export default DashboardPage;
