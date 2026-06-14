"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { PRESET_USERS, slugUserId, type SessionUser } from "@/lib/session";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn } = useUser();
  const [name, setName] = useState("");

  function pick(u: SessionUser) {
    signIn(u);
    router.push("/");
  }

  function customSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    signIn({ id: slugUserId(name), name: name.trim(), role: "buyer" });
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo tone="light" size="lg" />
        <p className="mt-3 text-sm text-storm">
          Sign in to simulate different people. Orders, credits, coupons and returns are
          separate per account. (Google sign-in coming later.)
        </p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold">Quick switch — demo accounts</p>
            <div className="space-y-2">
              {PRESET_USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => pick(u)}
                  className={`flex w-full items-center justify-between rounded border p-3 text-left hover:shadow-card ${
                    u.id === user.id ? "border-ember bg-zest/10" : "border-line"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-squid text-zest">
                      {u.role === "owner" ? "🏪" : "🛍"}
                    </span>
                    <span>
                      <span className="block font-semibold">{u.name}</span>
                      <span className="block text-xs text-storm">
                        {u.role === "owner" ? "Owner / seller (has demo orders)" : "Buyer"}
                      </span>
                    </span>
                  </span>
                  {u.id === user.id && <span className="text-xs font-bold text-success">Signed in</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <p className="mb-2 text-sm font-semibold">Or sign in as someone new</p>
            <form onSubmit={customSignIn} className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="flex-1 rounded border border-line px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={!name.trim()}>
                Sign in
              </Button>
            </form>
          </div>
        </CardBody>
      </Card>

      <p className="mt-4 text-center text-xs text-storm">
        Currently signed in as <span className="font-semibold">{user.name}</span>
      </p>
    </div>
  );
}
