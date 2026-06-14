/**
 * Generates the HackOn with Amazon — Solution Document (.docx) for the
 * Amazon Nemo project, in the provided PRD template format (dark theme,
 * orange accents, section tables). Run: `node scripts/generate-solution-doc.mjs`
 * (requires the `docx` package).
 */
import fs from "node:fs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
} from "docx";

// ── Palette (matches the dark template) ──
const BG = "1C1C1C";
const TEXT = "D6D6D6";
const MUTED = "9AA0A6";
const WHITE = "FFFFFF";
const ORANGE = "FF9900";
const CARD = "262626";
const HEAD = "2C3A47";
const LINE = "3C3C3C";

const FONT = "Calibri";

// ── Helpers ──
const T = (text, o = {}) =>
  new TextRun({ text, font: FONT, color: o.color ?? TEXT, bold: o.bold, italics: o.italics, size: o.size ?? 21 });

const P = (children, o = {}) =>
  new Paragraph({
    children: Array.isArray(children) ? children : [children],
    spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 276 },
    alignment: o.align,
    indent: o.indent,
  });

const sectionTitle = (num, title) =>
  new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({ text: `${num}. `, font: FONT, bold: true, color: ORANGE, size: 30 }),
      new TextRun({ text: title, font: FONT, bold: true, color: WHITE, size: 30 }),
    ],
  });

const h2 = (title) =>
  new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text: title, font: FONT, bold: true, color: WHITE, size: 24 })],
  });

const jury = (text) =>
  new Paragraph({
    spacing: { after: 100 },
    indent: { left: 360 },
    children: [new TextRun({ text: `→ ${text}`, font: FONT, italics: true, color: MUTED, size: 18 })],
  });

const body = (text) => P([T(text)]);

const bullet = (text, level = 0) =>
  new Paragraph({
    bullet: { level },
    spacing: { after: 60, line: 264 },
    children: Array.isArray(text) ? text : [T(text)],
  });

const cell = (content, { fill = CARD, bold = false, color = TEXT, width, align } = {}) =>
  new TableCell({
    shading: { type: ShadingType.CLEAR, fill, color: "auto" },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        alignment: align,
        children: (Array.isArray(content) ? content : [content]).map((c) =>
          typeof c === "string" ? new TextRun({ text: c, font: FONT, bold, color, size: 20 }) : c,
        ),
      }),
    ],
  });

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  left: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  right: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: LINE },
  insideVertical: { style: BorderStyle.SINGLE, size: 2, color: LINE },
};

const dataTable = (headers, rows, widths) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((hd, i) =>
          cell(hd, { fill: HEAD, bold: true, color: WHITE, width: widths?.[i], align: AlignmentType.LEFT }),
        ),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: r.map((c, i) => cell(c, { width: widths?.[i] })),
          }),
      ),
    ],
  });

const spacer = (after = 120) => new Paragraph({ spacing: { after }, children: [] });
const divider = () =>
  new Paragraph({
    spacing: { before: 120, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ORANGE, space: 1 } },
    children: [new TextRun({ text: "", font: FONT })],
  });
const pageBreak = () => new Paragraph({ children: [new TextRun({ text: "", break: 0 })], pageBreakBefore: true });

// ── Cover ──
const cover = [
  spacer(400),
  spacer(400),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [
      new TextRun({ text: "HackOn", font: FONT, bold: true, color: WHITE, size: 56 }),
      new TextRun({ text: " with Amazon", font: FONT, bold: true, color: ORANGE, size: 56 }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: "A Universe of Opportunity", font: FONT, color: MUTED, size: 28 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({ text: "48-Hour Hackathon  |  Solution Document", font: FONT, color: MUTED, size: 18 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: "Amazon Nemo", font: FONT, bold: true, color: WHITE, size: 30 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: "The intelligent bridge between returns and second-life buyers.",
        font: FONT,
        italics: true,
        color: ORANGE,
        size: 20,
      }),
    ],
  }),
  divider(),
  spacer(200),
  dataTable(
    [],
    [],
  ),
];

// info table (label / value)
const infoRow = (label, value) =>
  new TableRow({
    children: [
      cell(label, { fill: HEAD, bold: true, color: WHITE, width: 32 }),
      cell([new TextRun({ text: value, font: FONT, italics: true, color: MUTED, size: 20 })], { width: 68 }),
    ],
  });

const infoTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tableBorders,
  rows: [
    infoRow("Team Name", "[Your Team Name]"),
    infoRow("Hackathon Theme", "A Universe of Opportunity — Circular Commerce / Returns Reinvented"),
    infoRow("Project", "Amazon Nemo — returns → second-life marketplace"),
    infoRow("Date", "[Submission Date]"),
  ],
});

const memberRow = (n, role) =>
  new TableRow({
    children: [
      cell([new TextRun({ text: n, font: FONT, color: MUTED, size: 20 })]),
      cell([new TextRun({ text: "[College]", font: FONT, color: MUTED, size: 20 })]),
      cell([new TextRun({ text: role, font: FONT, color: MUTED, size: 20 })]),
      cell([new TextRun({ text: "[Email]", font: FONT, color: MUTED, size: 20 })]),
    ],
  });

const membersTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tableBorders,
  rows: [
    new TableRow({
      tableHeader: true,
      children: ["Name", "College / University", "Role", "Email"].map((hd) =>
        cell(hd, { fill: HEAD, bold: true, color: WHITE, align: AlignmentType.CENTER }),
      ),
    }),
    memberRow("[Member 1]", "Full-stack / Backend"),
    memberRow("[Member 2]", "Frontend / UX"),
    memberRow("[Member 3]", "AI / ML"),
    memberRow("[Member 4]", "Product / DevOps"),
  ],
});

// ── Build document children ──
const children = [
  ...cover.slice(0, cover.length - 1), // drop the empty placeholder table
  infoTable,
  spacer(240),
  h2("Team Members"),
  membersTable,

  pageBreak(),

  // 1. Problem
  sectionTitle(1, "Problem Statement & Relevance"),
  jury("Jury focus: Innovativeness (novelty, theme alignment) + Degree of Disruption (global relevance)"),
  h2("The Problem"),
  body(
    "Online retail returns have become one of e-commerce's largest, fastest-growing leaks. A return today flows through a slow, expensive reverse-logistics pipeline — ship back → warehouse intake → manual inspection → grading → repackaging → relisting — that can take weeks and cost more than the item is worth. The result: perfectly good products sit idle, get liquidated for pennies, or go straight to landfill.",
  ),
  h2("Why It Matters"),
  body(
    "Returns are a global, trillion-dollar problem. Industry estimates put worldwide e-commerce returns at well over $1 trillion a year; in the US alone roughly 9+ billion lbs of returned product end up in landfill annually (Optoro), and category return rates run 25–40% in fashion. The cost of inaction is threefold — wasted recoverable value, avoidable reverse-logistics spend and storage, and millions of tonnes of needless CO₂ — while customers wait longer and pay more.",
  ),
  jury("This is not a niche pain: it affects every marketplace, every seller, and hundreds of millions of buyers worldwide."),
  h2("Theme Alignment"),
  body(
    "“A Universe of Opportunity” reframes the returns black hole as a circular-commerce opportunity. Amazon Nemo turns each return into instant second-life value: an AI trust layer makes used goods buyable with confidence, and a nearby-buyer marketplace gives returns a fast, local second home instead of a long trip back to a warehouse.",
  ),
  h2("What Makes This Novel"),
  body(
    "The core insight is to collapse the reverse-logistics loop. Instead of waiting for an item to reach the warehouse to be inspected and relisted, Amazon Nemo can sell it to a nearby buyer while it is still in transit — at a discount that grows automatically the longer it sits unsold. Combined with AI condition grading, a verifiable Product Health Card, fraud/identity verification, and a configurable decision engine, this “Return-in-Transit” early-sale model is the disruptive, novel angle competitors don't offer.",
  ),

  pageBreak(),

  // 2. Customer & Solution
  sectionTitle(2, "Customer & Solution"),
  jury("Jury focus: Quality of Presentation (clarity) + Quality of Implementation (working prototype)"),
  h2("Target Customer"),
  body(
    "Three sides of one marketplace: (1) Value buyers who want trustworthy, cheaper second-life products with proof of condition; (2) Sellers / returners who want their returned or unused items to recover value quickly; and (3) Marketplace operations teams who need to slash reverse-logistics cost, warehouse load, and product idle time. Primary persona: a price-conscious, sustainability-minded shopper who avoids used goods today because they can't trust the condition.",
  ),
  h2("How We Solve It"),
  bullet([T("AI Condition Grading (real model): ", { bold: true, color: WHITE }), T("a MobileNetV3 model fine-tuned on the Kaputt product-damage dataset (ONNX, run in-process) grades each photo and detects specific defect types — plus a pre-grade verification pass that screens for fraud / wrong-item against the catalog reference.")]),
  bullet([T("Product Health Card: ", { bold: true, color: WHITE }), T("a buyer-facing trust layer showing the AI-verified condition, exact confidence, detected defects, and provenance — only real, persisted values (never fabricated).")]),
  bullet([T("Two ecosystems: ", { bold: true, color: WHITE }), T("Brand New (standard inventory with live stock) and Resold (one-of-a-kind, AI-graded second-life) coexist cleanly across home, search, cart and checkout.")]),
  bullet([T("Return-in-Transit Deals: ", { bold: true, color: WHITE }), T("returned items go on sale to nearby buyers immediately, at a dynamic, config-driven discount that grows daily — before they ever reach the warehouse.")]),
  bullet([T("Give a Second Life — Donate & Peer-to-Peer: ", { bold: true, color: WHITE }), T("owners can donate an item to a charity partner (with a donation certificate + green credits) or pass it directly to a verified nearby neighbour via geo-matching.")]),
  bullet([T("Decision engine: ", { bold: true, color: WHITE }), T("a feasibility analysis routes each return to the cheapest good outcome — local resale, return-to-seller, refurbishment, donation, or recycling.")]),
  bullet([T("TrustPass seller reputation: ", { bold: true, color: WHITE }), T("a Platinum/Gold/Silver score built from verified contributions and AI-grading accuracy.")]),
  bullet([T("Operations Console + Delivery Partner app: ", { bold: true, color: WHITE }), T("ops review queues with accept/reject on AI-verdict and manual-review escalations + live business-rule config; a delivery board with daily pickups, original-vs-return photo verification, OpenStreetMap routing to the nearest Amazon FC, and a notifications feed.")]),
  h2("User Workflow"),
  body(
    "Customer initiates a return → AI verifies authenticity and grades condition → the feasibility engine decides the best path → the item is listed for second-life (or sold in-transit to a nearby buyer) → a delivery partner collects and verifies it against the original product (accept/reject) → the buyer receives it, the seller is refunded, and green credits are awarded.",
  ),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "[[ Insert the user-workflow diagram here ]]", font: FONT, italics: true, color: MUTED, size: 18 })] }),
  jury("A clear visual here directly improves the Presentation score."),
  h2("Working Prototype"),
  body(
    "A complete, multi-role, full-stack web app (not a mockup): buyers shop two ecosystems and check out; sellers list items that are graded by a real fine-tuned damage model; an Operations Console runs reviews, disputes and live business rules; a Delivery Partner board handles daily pickups with map routing and accept/reject. Backed by a real Postgres database and an in-process ONNX grading model.",
  ),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "[[ Insert 2–3 product screenshots + Demo/Deployed URL ]]", font: FONT, italics: true, color: MUTED, size: 18 })] }),
  jury("End-to-end working prototype with evidence = highest Implementation score."),

  pageBreak(),

  // 3. Tech Architecture
  sectionTitle(3, "Tech Architecture & Scaling"),
  jury("Jury focus: Tech Architecture (complexity, algorithms, APIs, code quality) + Scalability (depth, interconnectedness)"),
  h2("Architecture"),
  body(
    "A cleanly layered architecture: UI → a single typed API client → Next.js API routes (validated with Zod) → services (business logic) → repositories (data access) → Postgres + Redis. AI providers are swappable behind interfaces (in-process CLIP, AWS Bedrock vision, or a local heuristic), and every business rule lives in a database config table — so behavior changes live, with nothing hardcoded.",
  ),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: "[[ Insert system architecture diagram here ]]", font: FONT, italics: true, color: MUTED, size: 18 })] }),
  h2("Tech Stack"),
  dataTable(
    ["Layer", "Technology", "Why"],
    [
      ["Frontend", "Next.js 14 (App Router), React 18, Tailwind, Leaflet/OpenStreetMap, Framer Motion", "Fast storefront + live map routing for the delivery board."],
      ["Backend", "Next.js API routes (Node), Zod validation, layered services / repositories", "Type-safe, testable, single source of truth per concern."],
      ["AI / ML", "MobileNetV3 (Kaputt dataset) via ONNX + onnxruntime-node + sharp; Transformers.js CLIP (verification) + sentiment/embeddings; AWS Bedrock (optional)", "Real in-process damage grading + defect detection; swappable on-device/cloud graders."],
      ["Data", "PostgreSQL (Neon) + Prisma; Upstash Redis (nearby-buyer geo index)", "Durable data + a hot index for low-latency matching."],
      ["Infra", "Serverless (Vercel-style), Neon serverless Postgres, Upstash Redis, image CDN", "Stateless, elastic, scales horizontally with zero ops."],
    ],
    [14, 52, 34],
  ),
  h2("Key Algorithms & Complexity"),
  bullet([T("MobileNetV3 damage grader (Kaputt): ", { bold: true, color: WHITE }), T("a fine-tuned CNN with two heads — condition grade (Like New / Minor / Major) and multilabel defect detection — exported to ONNX and run in-process (~50ms/image) with sharp preprocessing (224×224, ImageNet-normalised).")]),
  bullet([T("Ensemble Return-Risk Score: ", { bold: true, color: WHITE }), T("weighted combination of independent real signals (return history, review sentiment, seller reliability, defect/verification, shopper propensity), each scaled by its own evidence-confidence and shrunk toward a neutral prior so thin data never produces extreme scores.")]),
  bullet([T("CLIP verification: ", { bold: true, color: WHITE }), T("the uploaded item is embedded and compared to the catalog reference to verify identity and screen for fraud before grading.")]),
  bullet([T("Feasibility analysis engine: ", { bold: true, color: WHITE }), T("computes reverse-logistics cost vs. expected recovery with warehouse-proximity routing to choose resell-locally vs. ship-back.")]),
  bullet([T("Geo matching & routing: ", { bold: true, color: WHITE }), T("haversine + radius filter over a Redis category→buyer index for nearby-buyer / peer-to-peer matching, plus nearest-FC routing and reverse-geocoding (Nominatim) for the delivery board.")]),
  bullet([T("Dynamic in-transit discount + rules engine: ", { bold: true, color: WHITE }), T("config-driven day-tiered discounts and a pluggable routing-rules engine (cost-vs-value, repairability, local-demand, donation, recycle).")]),
  jury("Thought leadership: novel combinations and creative use of algorithms/AI — not standard CRUD."),
  h2("Scaling Strategy"),
  body(
    "Stateless serverless API routes scale horizontally; Neon serverless Postgres handles elastic read/write; Redis serves the hot nearby-buyer index for low-latency matching; all thresholds, price bands, discount tiers and CO₂ factors live in a single config table so behaviour scales without redeploys. The AI layer is swappable — in-process CLIP for cost, cloud Bedrock vision for throughput — and product images are CDN-served. The same design supports 100×–1000× growth across regions.",
  ),

  pageBreak(),

  // 4. Future Vision
  sectionTitle(4, "Future Vision"),
  jury("Jury focus: Futuristic Vision (long-term thinking, multi-segment expansion, value impact)"),
  h2("Where This Goes"),
  body(
    "Amazon Nemo becomes the default returns rail for any marketplace — every return is automatically appraised, trust-verified, and given the fastest, greenest second life. The platform extends into B2B liquidation, certified-refurbishment partners, and a charity-donation network, turning reverse logistics from a cost centre into a revenue and sustainability engine.",
  ),
  h2("Roadmap"),
  dataTable(
    ["Horizon", "Milestone", "Impact"],
    [
      ["0–3 mo", "Pilot in 1–2 categories + cities; in-transit resale live", "Faster recovery, first CO₂ + cost savings"],
      ["3–6 mo", "Multi-category, partner fulfilment centres, refurb partners", "Higher recovery value, lower reverse-logistics cost"],
      ["6–12 mo", "Multi-marketplace + B2B liquidation + donation network", "Platform-scale circular commerce"],
    ],
    [16, 50, 34],
  ),
  h2("Multi-Segment Expansion"),
  body(
    "Start with electronics and fashion (high return rates, high recoverable value), then expand to furniture, sporting goods, and books; route low-value-but-usable goods to a donation/education pipeline and damaged goods to certified recycling. The same trust + matching engine generalises across segments, and the logistics layer plugs into existing delivery fleets.",
  ),
  jury("A clear multi-segment strategy (e.g., electronics → fashion → donation/education → logistics) scores highest."),
  h2("Value Impact"),
  body(
    "At scale the model diverts a large share of returns from landfill and ship-backs: each locally-resold or in-transit sale avoids a round-trip of reverse logistics, recovers a meaningful fraction of original value, and prevents the associated CO₂. Quantified per category via the configurable cost and CO₂ factors already built into the platform — translating directly into cost savings, recovered revenue, and items kept in circulation.",
  ),
  spacer(160),
  new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: "Links:  ", font: FONT, bold: true, color: WHITE, size: 20 }),
      new TextRun({ text: "GitHub [URL]   |   Demo Video [URL]   |   Live App [URL]", font: FONT, italics: true, color: MUTED, size: 20 }),
    ],
  }),
];

const doc = new Document({
  background: { color: BG },
  styles: { default: { document: { run: { font: FONT, size: 21, color: TEXT } } } },
  sections: [
    {
      properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
      children,
    },
  ],
});

const out = "Amazon-Nemo-Solution-Document.docx";
Packer.toBuffer(doc).then((buf) => {
  try {
    fs.writeFileSync(out, buf);
    console.info(`✔ Wrote ${out} (${(buf.length / 1024).toFixed(1)} KB)`);
  } catch (e) {
    // The file is probably open in Word (locked). Write a fresh copy instead.
    const alt = "Amazon-Nemo-Solution-Document-NEW.docx";
    fs.writeFileSync(alt, buf);
    console.info(`! ${out} was locked (${e.code}). Wrote ${alt} instead — close Word and rename it.`);
  }
});
