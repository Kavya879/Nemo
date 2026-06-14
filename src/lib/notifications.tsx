"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useUser } from "@/lib/user-context";
import type { NotificationDTO } from "@/types/dto";

/**
 * Notifications context — fetches the signed-in user's activity feed and tracks
 * which items have been seen (a per-user "last seen" timestamp in localStorage)
 * so the header bell can show an accurate unread count. Shared between the bell
 * and the /notifications page so marking-as-read updates both instantly.
 */

interface NotificationsValue {
  items: NotificationDTO[];
  unread: number;
  loading: boolean;
  markAllRead: () => void;
  refresh: () => void;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);
const seenKey = (userId: string) => `nemo-notifs-seen-v1:${userId}`;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [seen, setSeen] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    apiClient
      .getNotifications(user.id)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [user.id]);

  useEffect(() => {
    try {
      setSeen(localStorage.getItem(seenKey(user.id)) ?? "");
    } catch {
      /* ignore */
    }
    refresh();
  }, [user.id, refresh]);

  const unread = useMemo(
    () => items.filter((i) => !seen || i.createdAt > seen).length,
    [items, seen],
  );

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    try {
      localStorage.setItem(seenKey(user.id), now);
    } catch {
      /* ignore */
    }
    setSeen(now);
  }, [user.id]);

  const value = useMemo<NotificationsValue>(
    () => ({ items, unread, loading, markAllRead, refresh }),
    [items, unread, loading, markAllRead, refresh],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within <NotificationsProvider>.");
  return ctx;
}
