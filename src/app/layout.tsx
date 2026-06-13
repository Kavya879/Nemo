import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
