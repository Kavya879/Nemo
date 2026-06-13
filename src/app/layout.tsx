import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

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
      <body className="min-h-screen bg-cloud text-ink antialiased">
        <Navbar />
        <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
      </body>
    </html>
  );
}
