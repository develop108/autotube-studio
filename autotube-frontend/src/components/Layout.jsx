import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ToastProvider } from './Toast';

const NAV = [
  { to: '/',            icon: '◈', label: 'Dashboard' },
  { to: '/pipeline',    icon: '▶', label: 'Pipeline' },
  { to: '/channels',    icon: '📺', label: 'Channels' },
  { to: '/videos',      icon: '🎬', label: 'Videos' },
  { to: '/integrations',icon: '🔌', label: 'Integrations' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <ToastProvider>
      <div style={s.shell}>
        {/* SIDEBAR */}
        <aside style={s.sidebar}>
          <div style={s.logo}>
            Auto<span style={{ color: 'var(--accent)' }}>Tube</span>
          </div>

          <nav style={s.nav}>
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                style={({ isActive }) => ({ ...s.navItem, ...(isActive ? s.navActive : {}) })}
              >
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                <span>{n.label}</span>
              </NavLink>
            ))}
          </nav>

          <div style={s.userBox}>
            <div style={s.userAvatar}>{(user?.name || user?.email || '?')[0].toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
            </div>
            <button onClick={handleLogout} style={s.logoutBtn} title="Logout">⏻</button>
          </div>
        </aside>

        {/* MAIN */}
        <main style={s.main}>
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  );
}

const s = {
  shell: { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: {
    width: 220, flexShrink: 0,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    padding: '20px 12px',
  },
  logo: {
    fontFamily: 'var(--mono)',
    fontSize: 20, fontWeight: 700,
    letterSpacing: -1,
    padding: '4px 10px 20px',
    borderBottom: '1px solid var(--border)',
    marginBottom: 12,
  },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px', borderRadius: 8,
    fontSize: 14, fontWeight: 500,
    color: 'var(--text2)',
    transition: 'all .15s',
  },
  navActive: {
    background: 'rgba(91,94,244,.15)',
    color: 'var(--accent-h)',
  },
  userBox: {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '12px 10px',
    borderTop: '1px solid var(--border)',
    marginTop: 8,
  },
  userAvatar: {
    width: 32, height: 32, borderRadius: 8,
    background: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 14, flexShrink: 0,
  },
  logoutBtn: {
    background: 'none', border: 'none',
    color: 'var(--text3)', fontSize: 16, cursor: 'pointer',
    padding: 4, borderRadius: 6,
    transition: 'color .15s',
  },
  main: { flex: 1, overflow: 'auto', background: 'var(--bg)' },
};
