'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, User } from '@/lib/api';
type AuthState = { user: User | null; loading: boolean; refresh: () => Promise<User | null>; logout: () => Promise<void> };
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { try { const value = await api<User>('/auth/me'); setUser(value); return value; } catch { setUser(null); return null; } finally { setLoading(false); } }, []);
  useEffect(() => { api<User>('/auth/me').then(setUser).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const logout = async () => { try { await api('/auth/logout', { method: 'POST' }, false); } finally { setUser(null); router.replace('/login'); } };
  return <Context.Provider value={{ user, loading, refresh, logout }}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error('AuthProvider missing'); return value; }
