"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { useUser } from "@/lib/user-context";
import { isAdmin } from "@/lib/session";
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

  const admin = isAdmin(user);
  const isConsoleArea = pathname.startsWith("/admin") || pathname === "/login";
  const redirectingAdmin = admin && !isConsoleArea;

  useEffect(() => {
    if (redirectingAdmin) router.replace("/admin");
  }, [redirectingAdmin, router]);

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-6rem)]">
        {redirectingAdmin ? (
          <LoadingState label="Opening the Operations Console…" />
        ) : (
          children
        )}
      </main>
      {/* The customer footer is storefront chrome — hidden for admins. */}
      {!admin && <SiteFooter />}
    </>
  );
}
