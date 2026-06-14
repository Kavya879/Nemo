import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { CartProvider } from "@/lib/cart";
import { UserProvider } from "@/lib/user-context";

export const metadata: Metadata = {
  title: "Amazon Nemo — The intelligent bridge for returns",
  description:
    "Amazon Nemo turns returns into second-life value: AI grading, smart routing, nearby-buyer matching, and green credits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body id="top" className="min-h-screen bg-mist text-ink antialiased">
        <UserProvider>
          <CartProvider>
            <AppShell>{children}</AppShell>
          </CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}
