import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

export default function useAuth(){
  const user = useAuthStore(s => s.user);
  const setHydrated = useAuthStore(s => s.setHydrated);
  const login = useAuthStore(s => s.login);
  const logout = useAuthStore(s => s.logout);

  const [ready, setReady] = useState(false);
  useEffect(() => {
    // wait one tick so zustand-persist can load from localStorage
    setReady(true);
    setHydrated();
  }, [setHydrated]);

  return { user, login, logout, ready };
}
