import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { subscribeAuthState } from "@/services/authService";
import { startUserSession } from "@/services/sessionService";
import type { AppUser, AuthState } from "@/types/auth";

interface AuthContextValue extends AuthState {
  setUser: (user: AppUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeAuthState((profile, userId) => {
      setUser(profile);
      setFirebaseUserId(userId);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    return startUserSession(user);
  }, [user]);

  const value = useMemo(
    () => ({ firebaseUserId, user, loading, setUser }),
    [firebaseUserId, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
