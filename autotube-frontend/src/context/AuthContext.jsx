import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('at_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('at_token');
    if (token) {
      authAPI.me()
        .then(u => setUser(u))
        .catch(() => { localStorage.removeItem('at_token'); localStorage.removeItem('at_user'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    localStorage.setItem('at_token', data.token);
    localStorage.setItem('at_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (email, password, name) => {
    const data = await authAPI.register(email, password, name);
    localStorage.setItem('at_token', data.token);
    localStorage.setItem('at_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('at_token');
    localStorage.removeItem('at_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
