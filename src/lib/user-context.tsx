"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  DEFAULT_USER,
  getCurrentUser,
  setCurrentUser,
  type SessionUser,
} from "@/lib/session";

interface UserContextValue {
  user: SessionUser;
  signIn: (user: SessionUser) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser>(DEFAULT_USER);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const signIn = useCallback((next: SessionUser) => {
    setCurrentUser(next);
    setUser(next);
  }, []);

  return <UserContext.Provider value={{ user, signIn }}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within <UserProvider>.");
  return ctx;
}
