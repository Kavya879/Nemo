import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * Amazon-style global footer: a "back to top" strip, four link columns, and a
 * brand band. Link groups map to real routes in the app — no dead placeholders.
 */
const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Shop & Sell",
    links: [
      { label: "Second-Life Deals", href: "/marketplace" },
      { label: "Sell on Amazon Nemo", href: "/sell" },
      { label: "Your Orders", href: "/orders" },
      { label: "Your Cart", href: "/cart" },
    ],
  },
  {
    heading: "Returns & Impact",
    links: [
      { label: "Start a Return", href: "/return" },
      { label: "Your Impact", href: "/impact" },
      { label: "Green Credits & Coupons", href: "/coupons" },
      { label: "Your Account", href: "/account" },
    ],
  },
  {
    heading: "How it works",
    links: [
      { label: "AI Condition Grading", href: "/return" },
      { label: "Product Verification", href: "/return" },
      { label: "Nearby-Buyer Matching", href: "/marketplace" },
      { label: "Dispute an AI Verdict", href: "/orders" },
    ],
  },
  {
    heading: "Operations",
    links: [
      { label: "Operations Console", href: "/admin" },
      { label: "Sign in / Switch account", href: "/login" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-12">
      {/* Back to top */}
      <a
        href="#top"
        className="block bg-slateHover py-3.5 text-center text-sm font-medium text-white hover:bg-slate"
      >
        Back to top
      </a>

      {/* Link columns */}
      <div className="bg-slate py-10 text-mist">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-3 text-sm font-bold text-white">{col.heading}</h3>
              <ul className="space-y-2 text-sm text-mist/80">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-white hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Brand band */}
      <div className="border-t border-white/10 bg-squid py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-center">
          <Logo tone="dark" size="md" />
          <p className="text-xs text-mist/70">
            The intelligent bridge between returns and second-life buyers.
          </p>
          <p className="mt-2 text-xs text-mist/50">
            © {new Date().getFullYear()} Amazon Nemo. A circular-commerce platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
