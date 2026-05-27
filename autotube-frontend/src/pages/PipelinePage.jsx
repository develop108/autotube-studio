import { useState, useEffect, useRef } from 'react';
import { channelsAPI, pipelineAPI, createPipelineSocket } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const STEPS = [
  { id:'research',  icon:'🔍', label:'Research' },
  { id:'script',    icon:'✍️', label:'Script' },
  { id:'voice',     icon:'🎙️', label:'Voice' },
  { id:'avatar',    icon:'👤', label:'Avatar / B-roll' },
  { id:'thumbnail', icon:'🖼️', label:'Thumbnail' },
  { id:'render',    icon:'🎞️', label:'Finalize' },
];

export default function PipelinePage() {
  const { user } = useAuth();
  const toast = useToast();
  const wsRef = useRef(null);

  const [channels, setChannels]     = useState([]);
  const [channelId, setChannelId]   = useState('');
  const [prompt, setPrompt]         = useState('');
  const [videoType, setVideoType]   = useState('avatar');
  const [voiceProvider, setVoiceProvider] = useState('elevenlabs');
  const [running, setRunning]       = useState(false);
  const [stepStates, setStepStates] = useState({});
  const [outputs, setOutputs]       = useState({});
  const [ideas, setIdeas]           = useState([]);
  const [script, setScript]         = useState(null);

  useEffect(() => {
    channelsAPI.list().then(setChannels).catch(()=>{});
  }, []);

  // Connect WebSocket
  useEffect(() => {
    if (!user?.id) return;
    const ws = createPipelineSocket(user.id, handleWsMessage);
    wsRef.current = ws;
    return () => ws.close();
  }, [user?.id]);

  const handleWsMessage = (msg) => {
    if (msg.type !== 'pipeline_update') return;
    const { step, status, ...data } = msg;

    setStepStates(prev => ({ ...prev, [step]: status }));

    if (step === 'research' && status === 'done' && data.ideas) {
      setIdeas(data.ideas);
    }
    if (step === 'script' && status === 'done') {
      setOutputs(o => ({ ...o, scriptTitle: data.title }));
    }
    if (step === 'voice' && status === 'done' && data.voiceUrl) {
      setOutputs(o => ({ ...o, voiceUrl: data.voiceUrl }));
    }
    if (step === 'avatar' && status === 'done' && data.avatarVideoUrl) {
      setOutputs(o => ({ ...o, avatarVideoUrl: data.avatarVideoUrl }));
    }
    if (step === 'thumbnail' && status === 'done') {
      setOutputs(o => ({ ...o, thumbnailUrl: data.thumbnailUrl, thumbConcept: data.concept }));
    }
    if (step === 'render' && status === 'done') {
      setOutputs(o => ({ ...o, finalVideoUrl: data.finalVideoUrl, title: data.title }));
      setRunning(false);
      toast('🎉 Video pipeline complete!');
    }
    if (step === 'error') {
      toast(data.message || 'Pipeline failed', 'error');
      setRunning(false);
    }
  };

  const startPipeline = async () => {
    if (!prompt.trim()) return toast('Video topic দিন', 'error');
    setRunning(true);
    setStepStates({});
    setOutputs({});
    setIdeas([]);
    setScript(null);
    try {
      await pipelineAPI.run(channelId||null, prompt, videoType, voiceProvider);
    } catch (e) {
      toast(e.response?.data?.error || 'Failed to start', 'error');
      setRunning(false);
    }
  };

  const stepStatus = (id) => stepStates[id] || 'waiting';

  return (
    <div style={s.shell}>
      {/* LEFT PANEL */}
      <div style={s.left}>
        <div style={s.panelTitle}>Channel</div>
        <select value={channelId} onChange={e=>setChannelId(e.target.value)} style={{marginBottom:16}}>
          <option value="">— General (no channel) —</option>
          {channels.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>

        <div style={s.panelTitle}>Video Topic</div>
        <textarea
          style={{marginBottom:8,minHeight:90}}
          placeholder={"e.g. 3 IRS secrets seniors don't know\n\nOr: Find me a viral topic for this channel"}
          value={prompt}
          onChange={e=>setPrompt(e.target.value)}
        />

        <div style={s.panelTitle}>Type</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
          {[['avatar','👤 AI Avatar'],['faceless','🎬 Faceless']].map(([v,l])=>(
            <button key={v} onClick={()=>setVideoType(v)}
              style={{...s.typeBtn,...(videoType===v?s.typeBtnActive:{})}}>
              {l}
            </button>
          ))}
        </div>

        <div style={s.panelTitle}>Voice Provider</div>
        <select value={voiceProvider} onChange={e=>setVoiceProvider(e.target.value)} style={{marginBottom:20}}>
          <option value="elevenlabs">ElevenLabs</option>
          <option value="minimax">MiniMax (cheaper)</option>
        </select>

        <button className="btn btn-primary btn-full" onClick={startPipeline} disabled={running}
          style={{fontSize:15,padding:'13px 20px'}}>
          {running ? <><span className="spinner"/> Running...</> : '▶ Start Pipeline'}
        </button>

        {/* Pipeline Steps */}
        <div style={{marginTop:24}}>
          <div style={s.panelTitle}>Progress</div>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {STEPS.map(step => {
              const st = stepStatus(step.id);
              return (
                <div key={step.id} style={{...s.stepRow,...(st==='running'?s.stepRunning:st==='done'?s.stepDone:st==='error'?s.stepError:{})}}>
                  <div style={{...s.stepDot,...(st==='running'?{background:'var(--accent)',animation:'spin .7s linear infinite'}:st==='done'?{background:'var(--green)',color:'#080810'}:{})}}>
                    {st==='done'?'✓':step.icon}
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{step.label}</div>
                    <div style={{fontSize:11,color:st==='running'?'var(--accent)':st==='done'?'var(--green)':'var(--text3)'}}>
                      {st==='running'?'Processing...':st==='done'?'Done':st==='error'?'Error':'Waiting'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={s.right}>
        {!running && Object.keys(stepStates).length === 0 && (
          <div style={s.empty}>
            <div style={{fontSize:56,marginBottom:16}}>🎬</div>
            <div style={{fontSize:20,fontWeight:700,marginBottom:8}}>Pipeline Ready</div>
            <div style={{color:'var(--text2)',maxWidth:320,textAlign:'center'}}>
              Channel, topic এবং type বেছে নিয়ে Start Pipeline চাপুন।
              AI সবকিছু করবে।
            </div>
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* Ideas */}
          {ideas.length > 0 && (
            <div className="card">
              <div style={s.outHead}><span>🔍 Viral Ideas</span><span className="badge badge-blue">Research</span></div>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:14}}>
                {ideas.map((idea,i)=>(
                  <div key={i} style={s.ideaRow}>
                    <div style={s.ideaNum}>{i+1}</div>
                    <div>
                      <div style={{fontWeight:700,fontSize:14}}>{idea.title}</div>
                      <div style={{fontSize:12,color:'var(--text2)',marginTop:3}}>{idea.description}</div>
                    </div>
                    <span className="badge badge-green" style={{marginLeft:'auto',flexShrink:0}}>{idea.potential}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Script title */}
          {outputs.scriptTitle && (
            <div className="card" style={{borderColor:'rgba(91,94,244,.3)'}}>
              <div style={s.outHead}><span>✍️ Script Generated</span><span className="badge badge-blue">Claude AI</span></div>
              <div style={{marginTop:12,fontWeight:700,fontSize:16}}>"{outputs.scriptTitle}"</div>
              <div style={{marginTop:8,fontSize:13,color:'var(--green)'}}>✅ Script complete — voice generation started</div>
            </div>
          )}

          {/* Voice */}
          {outputs.voiceUrl && (
            <div className="card" style={{borderColor:'rgba(0,229,160,.2)'}}>
              <div style={s.outHead}><span>🎙️ Voice Ready</span><span className="badge badge-green">ElevenLabs</span></div>
              <audio controls src={`${process.env.REACT_APP_API_URL||''}${outputs.voiceUrl}`}
                style={{width:'100%',marginTop:12,borderRadius:8}} />
            </div>
          )}

          {/* Avatar video */}
          {outputs.avatarVideoUrl && (
            <div className="card">
              <div style={s.outHead}><span>👤 Avatar Video</span><span className="badge badge-blue">HeyGen</span></div>
              <video controls src={`${process.env.REACT_APP_API_URL||''}${outputs.avatarVideoUrl}`}
                style={{width:'100%',borderRadius:10,marginTop:12,maxHeight:300,objectFit:'cover'}} />
            </div>
          )}

          {/* Thumbnail */}
          {outputs.thumbnailUrl && (
            <div className="card">
              <div style={s.outHead}><span>🖼️ Thumbnail</span><span className="badge badge-blue">FAL.ai</span></div>
              <img src={`${process.env.REACT_APP_API_URL||''}${outputs.thumbnailUrl}`} alt="thumbnail"
                style={{width:'100%',borderRadius:10,marginTop:12,aspectRatio:'16/9',objectFit:'cover'}} />
            </div>
          )}

          {/* Final */}
          {outputs.finalVideoUrl && (
            <div className="card" style={{borderColor:'rgba(0,229,160,.3)'}}>
              <div style={s.outHead}><span>🎉 Video Complete!</span><span className="badge badge-green">Ready</span></div>
              <div style={{marginTop:12,fontWeight:700,fontSize:15}}>"{outputs.title}"</div>
              <div style={{display:'flex',gap:10,marginTop:16}}>
                <a href={`${process.env.REACT_APP_API_URL||''}${outputs.finalVideoUrl}`}
                  target="_blank" rel="noreferrer" className="btn btn-success" style={{flex:1,justifyContent:'center'}}>
                  ⬇️ Download Video
                </a>
                <button className="btn btn-ghost" onClick={()=>{setStepStates({});setOutputs({});setIdeas([]);setPrompt('');}} style={{flex:1}}>
                  🔄 New Video
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  shell:{display:'grid',gridTemplateColumns:'300px 1fr',height:'calc(100vh - 0px)',overflow:'hidden'},
  left:{background:'var(--surface)',borderRight:'1px solid var(--border)',padding:20,overflowY:'auto',display:'flex',flexDirection:'column'},
  right:{padding:24,overflowY:'auto'},
  panelTitle:{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:8},
  typeBtn:{padding:'10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--text2)',cursor:'pointer',fontFamily:'var(--font)',fontWeight:600,fontSize:13,transition:'all .15s'},
  typeBtnActive:{borderColor:'var(--accent)',background:'rgba(91,94,244,.15)',color:'var(--accent-h)'},
  stepRow:{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:'1px solid var(--border)',background:'var(--surface2)',transition:'all .3s'},
  stepRunning:{borderColor:'var(--accent)',background:'rgba(91,94,244,.08)'},
  stepDone:{borderColor:'rgba(0,229,160,.3)',background:'rgba(0,229,160,.05)'},
  stepError:{borderColor:'var(--red)',background:'rgba(255,68,102,.06)'},
  stepDot:{width:28,height:28,borderRadius:7,background:'var(--surface)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0},
  empty:{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center'},
  outHead:{display:'flex',alignItems:'center',justifyContent:'space-between',fontWeight:700},
  ideaRow:{display:'flex',alignItems:'flex-start',gap:12,padding:'12px',background:'var(--surface2)',borderRadius:10},
  ideaNum:{width:24,height:24,borderRadius:6,background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0,marginTop:2},
};
