import type { Metadata } from "next";
import { NavSidebar } from "@/components/nav-sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReLoop",
  description: "AI-powered circular economy platform — grade, route, and match returned products locally.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NavSidebar />
        <div className="min-h-screen pt-14 lg:pl-64 lg:pt-0">
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
