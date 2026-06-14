import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
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
            <Navbar />
            <main className="min-h-[calc(100vh-6rem)]">{children}</main>
            <SiteFooter />
          </CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}
