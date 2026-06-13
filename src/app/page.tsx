"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const PERSONAS = [
  {
    emoji: "📦",
    title: "The Returner",
    line: "Sends back an item — and it actually finds a second life instead of a landfill.",
  },
  {
    emoji: "🛒",
    title: "The Second-Life Buyer",
    line: "Buys certified pre-owned with a verified Product Health Card they can trust.",
  },
  {
    emoji: "🌍",
    title: "The Planet",
    line: "Every reused product is CO₂ avoided, cost saved, and waste prevented.",
  },
];

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 * i, duration: 0.4 },
  }),
};

export default function HomePage() {
  return (
    <div className="bg-gradient-to-b from-white to-cloud">
      <PageShell className="py-16">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fade}
          custom={0}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-link">
            Second-Life Commerce
          </p>
          <h1 className="text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Millions of products.
            <br />
            <span className="text-storm">No intelligent bridge.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-storm">
            ReLoop is the AI bridge between a return and its best next life — graded
            in seconds, routed by reasoning, matched to a nearby buyer.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/return">
              <Button size="lg">Start a Return →</Button>
            </Link>
            <Link href="/marketplace">
              <Button size="lg" variant="secondary">
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </motion.div>

        <div className="mt-16 grid gap-5 sm:grid-cols-3">
          {PERSONAS.map((p, i) => (
            <motion.div
              key={p.title}
              initial="hidden"
              animate="show"
              variants={fade}
              custom={i + 1}
            >
              <Card className="h-full transition-shadow hover:shadow-cardHover">
                <CardBody className="text-center">
                  <div className="mb-3 text-4xl">{p.emoji}</div>
                  <h3 className="mb-2 text-lg font-semibold text-ink">{p.title}</h3>
                  <p className="text-sm text-storm">{p.line}</p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={fade}
          custom={4}
          className="mt-16 grid gap-4 rounded-card bg-squid p-8 text-center text-white sm:grid-cols-4"
        >
          {[
            ["< 2s", "AI condition grade"],
            ["5 paths", "Smart routing"],
            ["Nearby", "Buyer matching"],
            ["Green", "Credits & impact"],
          ].map(([big, small]) => (
            <div key={small}>
              <div className="text-2xl font-bold text-zest">{big}</div>
              <div className="mt-1 text-sm text-white/70">{small}</div>
            </div>
          ))}
        </motion.div>
      </PageShell>
    </div>
  );
}
