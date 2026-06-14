import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { CartProvider } from "@/lib/cart";
import { UserProvider } from "@/lib/user-context";

export const metadata: Metadata = {
  title: "ReLoop — The intelligent bridge for returns",
  description:
    "ReLoop turns returns into second-life value: AI grading, smart routing, nearby-buyer matching, and green credits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-mist text-ink antialiased">
        <UserProvider>
          <CartProvider>
            <Navbar />
            <main className="min-h-[calc(100vh-6rem)]">{children}</main>
            <footer className="mt-10 bg-slate py-8 text-center text-sm text-mist/80">
              <p className="font-bold text-white">
                Re<span className="text-zest">Loop</span>
              </p>
              <p className="mt-1">The intelligent bridge between returns and second-life buyers.</p>
            </footer>
          </CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}
