import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken, type LoginResponse } from './api';

interface AuthState {
  user: LoginResponse['user'] | null;
  extension: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  pickExtension: (extension: string) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse['user'] | null>(() => {
    const raw = localStorage.getItem('cerdik_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [extension, setExtension] = useState<string | null>(() => localStorage.getItem('cerdik_extension'));

  useEffect(() => {
    if (!getToken()) {
      setUser(null);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setToken(res.token);
    localStorage.setItem('cerdik_user', JSON.stringify(res.user));
    setUser(res.user);
    if (res.user.extension) pickExtension(res.user.extension);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('cerdik_user');
    localStorage.removeItem('cerdik_extension');
    setUser(null);
    setExtension(null);
  };

  const pickExtension = (ext: string) => {
    localStorage.setItem('cerdik_extension', ext);
    setExtension(ext);
    // Persists to users.extension and swaps in a token carrying the new
    // value, so server-side extension scoping stays correct for the rest of
    // the session. Best-effort: the picker already applied optimistically.
    api.setExtension(ext).then((res) => setToken(res.token)).catch(() => {});
  };

  const value = useMemo(
    () => ({ user, extension, isAdmin: user?.isAdmin ?? false, login, logout, pickExtension }),
    [user, extension],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
