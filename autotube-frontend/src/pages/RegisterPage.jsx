import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true);
    try { await register(form.email, form.password, form.name); navigate('/integrations'); }
    catch (e) { setErr(e.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.wrap}>
      <div style={s.box}>
        <div style={s.logo}>Auto<span style={{color:'var(--accent)'}}>Tube</span></div>
        <h1 style={s.title}>Create account</h1>
        <p style={s.sub}>শুরু করুন — প্রথমে API keys সেট করতে হবে</p>

        <form onSubmit={submit} style={s.form}>
          <div className="field">
            <label>Name</label>
            <input placeholder="আপনার নাম" value={form.name}
              onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" placeholder="you@email.com" value={form.email}
              onChange={e => setForm({...form, email: e.target.value})} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" placeholder="Min 8 characters" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})} required minLength={6} />
          </div>
          {err && <div style={s.err}>{err}</div>}
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner"/> : 'Create Account →'}
          </button>
        </form>

        <p style={{textAlign:'center', fontSize:13, color:'var(--text2)', marginTop:20}}>
          Already have an account?{' '}
          <Link to="/login" style={{color:'var(--accent)'}}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const s = {
  wrap: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24,
          background:'radial-gradient(ellipse at 50% 0%, rgba(91,94,244,.12) 0%, transparent 60%)' },
  box: { width:'100%', maxWidth:400, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:18, padding:36 },
  logo: { fontFamily:'var(--mono)', fontSize:22, fontWeight:700, letterSpacing:-1, textAlign:'center', marginBottom:24 },
  title: { fontSize:24, fontWeight:700, textAlign:'center', marginBottom:4 },
  sub: { color:'var(--text2)', fontSize:14, textAlign:'center', marginBottom:24 },
  form: { display:'flex', flexDirection:'column', gap:14 },
  err: { background:'rgba(255,68,102,.1)', border:'1px solid var(--red)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--red)' },
};
