import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/index.js';
import { TOKEN_KEY } from '../services/api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authService.me().then(setUser).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setLoading(false));
  }, []);

  const accept = ({ user: u, token }) => { localStorage.setItem(TOKEN_KEY, token); setUser(u); };
  const login = useCallback(async (b) => accept(await authService.login(b)), []);
  const register = useCallback(async (b) => accept(await authService.register(b)), []);
  const logout = useCallback(async () => { await authService.logout(); localStorage.removeItem(TOKEN_KEY); setUser(null); }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
