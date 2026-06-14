"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { useUser } from "@/lib/user-context";
import { isAdmin, isDelivery } from "@/lib/session";
import { NotificationsProvider } from "@/lib/notifications";
import { LoadingState } from "@/components/flow/States";

/**
 * App chrome wrapper. Gives ADMINS a console-only experience: they never see the
 * customer storefront (search, departments, cart, shopping pages or footer) —
 * any non-admin route is redirected to the Operations Console. /login stays
 * reachable so an admin can switch back to a customer account.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  // Admins and delivery partners get a focused, console-only experience — no
  // storefront. Any non-console route is redirected to their home.
  const admin = isAdmin(user);
  const delivery = isDelivery(user);
  const focused = admin || delivery;
  const home = admin ? "/admin" : "/delivery";
  const inConsoleArea = !focused || pathname.startsWith(home) || pathname === "/login";
  const redirecting = focused && !inConsoleArea;

  useEffect(() => {
    if (redirecting) router.replace(home);
  }, [redirecting, home, router]);

  return (
    <NotificationsProvider>
      <Navbar />
      <main className="min-h-[calc(100vh-6rem)]">
        {redirecting ? (
          <LoadingState label={admin ? "Opening the Operations Console…" : "Opening your route…"} />
        ) : (
          children
        )}
      </main>
      {/* The customer footer is storefront chrome — hidden for focused roles. */}
      {!focused && <SiteFooter />}
    </NotificationsProvider>
  );
}
