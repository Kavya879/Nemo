"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { apiClient, ApiError } from "@/lib/api-client";
import type {
  EligibleOrderDTO,
  GradeResultDTO,
  ItemDTO,
  ListingDTO,
  MatchResultDTO,
  PriceResultDTO,
  RoutingResultDTO,
} from "@/types/dto";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GradeBadge } from "@/components/GradeBadge";
import { ProductHealthCard } from "@/components/ProductHealthCard";
import { Stepper } from "./Stepper";
import { LoadingState, ErrorState } from "./States";

const BuyerMap = dynamic(() => import("./BuyerMap"), {
  ssr: false,
  loading: () => <LoadingState label="Loading map…" />,
});

// The returner's location for the demo (matches the seeded buyer cluster).
const ORIGIN = { lat: 12.9716, lng: 77.5946 };
const RADIUS_KM = 5;
const REASONS = [
  "Size too small",
  "Size too large",
  "Color not as pictured",
  "Defective on arrival",
  "Changed my mind",
];

type Step = "select" | "grade" | "route" | "match" | "list";
const STEP_INDEX: Record<Step, number> = { select: 0, grade: 1, route: 2, match: 3, list: 4 };

function fileToImage(file: File): Promise<{ base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp" }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const base64 = result.split(",")[1] ?? "";
      const mime = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
      resolve({ base64, mimeType: mime });
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

const transition = { duration: 0.35 };

export function ReturnFlow() {
  const [step, setStep] = useState<Step>("select");
  const [orders, setOrders] = useState<EligibleOrderDTO[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [selected, setSelected] = useState<ItemDTO | null>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [photos, setPhotos] = useState<Array<{ base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; preview: string }>>([]);

  const [grade, setGrade] = useState<GradeResultDTO | null>(null);
  const [routing, setRouting] = useState<RoutingResultDTO | null>(null);
  const [price, setPrice] = useState<PriceResultDTO | null>(null);
  const [match, setMatch] = useState<MatchResultDTO | null>(null);
  const [listing, setListing] = useState<ListingDTO | null>(null);

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getOrders()
      .then(setOrders)
      .catch((e) => setOrdersError(e instanceof Error ? e.message : "Failed to load orders"));
  }, []);

  function describeError(e: unknown): string {
    if (e instanceof ApiError) return `${e.message} (${e.code})`;
    return e instanceof Error ? e.message : "Something went wrong";
  }

  async function onPickFiles(files: FileList | null) {
    if (!files) return;
    const picked = Array.from(files).slice(0, 3);
    const imgs = await Promise.all(
      picked.map(async (f) => ({ ...(await fileToImage(f)), preview: URL.createObjectURL(f) })),
    );
    setPhotos(imgs);
  }

  // Step 1 → grade
  async function submitReturn() {
    if (!selected) return;
    setError(null);
    setBusy(true);
    setBusyLabel("Submitting return & analyzing photos…");
    setStep("grade");
    try {
      await apiClient.createReturn({ itemId: selected.id, reason, photos: photos.map((p) => p.preview) });
      const images = photos.length
        ? photos.map((p) => ({ base64: p.base64, mimeType: p.mimeType }))
        : [{ base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", mimeType: "image/png" as const }];
      const result = await apiClient.grade(images, selected.id);
      setGrade(result);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  // Step 2 → compute price + match + routing, then show router
  async function computeRouting() {
    if (!selected || !grade) return;
    setError(null);
    setBusy(true);
    setBusyLabel("Reasoning over inputs…");
    setStep("route");
    try {
      const [priceRes, matchRes] = await Promise.all([
        apiClient.price({
          grade: grade.grade,
          originalPrice: selected.originalPrice,
          category: selected.category,
          demandCount: 0,
        }),
        apiClient.match(selected.category, ORIGIN.lat, ORIGIN.lng, RADIUS_KM),
      ]);
      setPrice(priceRes);
      setMatch(matchRes);

      const relistingCost = Math.round(selected.originalPrice * 0.05);
      const routeRes = await apiClient.routeItem(
        {
          grade: grade.grade,
          category: selected.category,
          relistingCost,
          resaleValue: priceRes.price,
          nearbyDemandCount: matchRes.count,
          repairability: selected.repairability,
        },
        selected.id,
      );
      setRouting(routeRes);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function createListing() {
    if (!selected || !grade || !price) return;
    setError(null);
    setBusy(true);
    setBusyLabel("Generating listing…");
    try {
      const created = await apiClient.createListing({
        itemId: selected.id,
        grade: grade.grade,
        confidence: grade.confidence,
        flaws: grade.flaws,
        price: price.price,
        pricePct: price.pricePct,
        history: [`Returned: ${reason}`],
      });
      setListing(created);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Stepper current={STEP_INDEX[step]} />

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={transition}
        >
          {/* ───────── Step 1: select item + reason + photos ───────── */}
          {step === "select" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Return or replace items</h2>
                <p className="text-sm text-storm">
                  Choose a delivered order within its return window. Items outside the window
                  can&apos;t be returned.
                </p>
              </div>

              {ordersError && <ErrorState message={ordersError} />}

              <div className="grid gap-3 sm:grid-cols-2">
                {orders.map((o) => {
                  const it = o.order.item;
                  const eligible = o.returnEligible;
                  const isSelected = selected?.id === it.id;
                  return (
                    <button
                      key={o.order.id}
                      onClick={() => eligible && setSelected(it)}
                      disabled={!eligible}
                      className={`rounded border bg-white p-4 text-left transition-shadow ${
                        !eligible
                          ? "cursor-not-allowed opacity-60"
                          : isSelected
                            ? "border-ember ring-2 ring-zest"
                            : "border-line hover:shadow-cardHover"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-semibold">{it.name}</span>
                        {it.currentGrade && <GradeBadge grade={it.currentGrade} size="sm" />}
                      </div>
                      <p className="text-xs text-storm">
                        {it.brand ? `${it.brand} · ` : ""}
                        {it.category} · ₹{it.originalPrice.toLocaleString("en-IN")}
                      </p>
                      <p className="mt-1 text-xs text-storm">
                        Delivered {new Date(o.order.deliveredAt).toLocaleDateString("en-IN")}
                      </p>
                      <div className="mt-2">
                        {eligible ? (
                          <Badge tone="success">
                            Returnable · {o.returnDaysLeft} day(s) left
                          </Badge>
                        ) : (
                          <Badge tone="danger">{o.reasonIfNot ?? "Not returnable"}</Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selected && (
                <Card>
                  <CardBody className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-semibold">Reason for return</label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full rounded-lg border border-line px-3 py-2 text-sm"
                      >
                        {REASONS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-semibold">Photos (2–3 recommended)</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => onPickFiles(e.target.files)}
                        className="block w-full text-sm"
                      />
                      {photos.length > 0 && (
                        <div className="mt-3 flex gap-2">
                          {photos.map((p, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={p.preview}
                              alt={`upload ${i + 1}`}
                              className="h-20 w-20 rounded-lg border border-line object-cover"
                            />
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-storm">
                        No photo handy? You can submit without one — we&apos;ll still grade it.
                      </p>
                    </div>

                    <Button size="lg" onClick={submitReturn} disabled={!selected}>
                      Submit return & grade →
                    </Button>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {/* ───────── Step 2: grading result ───────── */}
          {step === "grade" && (
            <div className="space-y-6">
              {busy && <GradingAnimation label={busyLabel} />}
              {!busy && error && <ErrorState message={error} onRetry={submitReturn} />}
              {!busy && !error && grade && selected && (
                <>
                  <GradingResult grade={grade} photo={photos[0]?.preview} itemName={selected.name} />
                  <div className="flex justify-end">
                    <Button size="lg" onClick={computeRouting}>
                      See the Smart Router →
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ───────── Step 3: smart router ───────── */}
          {step === "route" && (
            <div className="space-y-6">
              {busy && <LoadingState label={busyLabel} />}
              {!busy && error && <ErrorState message={error} onRetry={computeRouting} />}
              {!busy && !error && routing && (
                <>
                  <RouterView routing={routing} />
                  <div className="flex justify-end">
                    <Button size="lg" onClick={() => setStep("match")}>
                      See nearby buyers →
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ───────── Step 4: nearby buyer match ───────── */}
          {step === "match" && match && selected && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">
                  {match.count} buyer{match.count === 1 ? "" : "s"} within {RADIUS_KM}km want this
                </h2>
                <p className="text-sm text-storm">
                  Verified buyers near you who have {selected.category} on their wishlist.
                </p>
              </div>
              <BuyerMap origin={ORIGIN} matches={match.matches} radiusKm={RADIUS_KM} />
              <div className="grid gap-2 sm:grid-cols-2">
                {match.matches.map((m) => (
                  <Card key={m.buyerId}>
                    <CardBody className="flex items-center justify-between py-3">
                      <span className="font-medium">{m.name}</span>
                      <Badge tone="info">{m.distanceKm.toFixed(1)} km</Badge>
                    </CardBody>
                  </Card>
                ))}
              </div>
              <div className="flex justify-end">
                <Button size="lg" onClick={() => setStep("list")}>
                  Price &amp; list it →
                </Button>
              </div>
            </div>
          )}

          {/* ───────── Step 5: pricing + auto-listing ───────── */}
          {step === "list" && price && selected && grade && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold">Suggested price &amp; auto-listing</h2>
                <p className="text-sm text-storm">{price.reasoning}</p>
              </div>

              <div className="flex items-end gap-4 rounded-card bg-squid p-6 text-white">
                <div>
                  <div className="text-sm text-white/60">Suggested resale price</div>
                  <div className="text-4xl font-bold text-zest">
                    ₹{price.price.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="pb-1 text-sm text-white/70">
                  {Math.round(price.pricePct * 100)}% of ₹{selected.originalPrice.toLocaleString("en-IN")}
                </div>
              </div>

              {!listing && !busy && (
                <Button size="lg" onClick={createListing}>
                  Generate listing (one click) →
                </Button>
              )}
              {busy && <LoadingState label={busyLabel} />}
              {error && <ErrorState message={error} onRetry={createListing} />}

              {listing && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid gap-5 lg:grid-cols-2"
                >
                  <Card>
                    <CardBody className="space-y-2">
                      <Badge tone="success">Listing created</Badge>
                      <h3 className="text-lg font-bold">{listing.title}</h3>
                      <p className="text-sm text-storm">{listing.description}</p>
                      <div className="text-2xl font-bold text-ink">
                        ₹{listing.price.toLocaleString("en-IN")}
                      </div>
                      <a href="/marketplace" className="text-sm font-medium text-link hover:underline">
                        View in marketplace →
                      </a>
                    </CardBody>
                  </Card>
                  <ProductHealthCard card={listing.healthCard} />
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** "AI analyzing…" animation with a live sub-2s timer feel. */
function GradingAnimation({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <motion.div
        className="h-16 w-16 rounded-full border-4 border-mist border-t-link"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
      />
      <motion.p
        className="text-lg font-semibold text-ink"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.4 }}
      >
        {label}
      </motion.p>
      <p className="text-sm text-storm">Inspecting condition, detecting flaws…</p>
    </div>
  );
}

/** Grade result with the Damage Detective flaw callouts over the photo. */
function GradingResult({
  grade,
  photo,
  itemName,
}: {
  grade: GradeResultDTO;
  photo?: string;
  itemName: string;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardBody>
          <div className="relative overflow-hidden rounded-lg bg-mist">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={itemName} className="h-64 w-full object-cover" />
            ) : (
              <div className="flex h-64 items-center justify-center text-storm">No photo</div>
            )}
            {grade.flaws.map((f, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.25 }}
                className="absolute"
                style={{ top: `${20 + i * 22}%`, left: `${25 + i * 18}%` }}
              >
                <span className="flex items-center gap-1 rounded-full bg-danger px-2 py-1 text-xs font-semibold text-white shadow">
                  ⦿ {f.type} ({f.severity})
                </span>
              </motion.div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-3">
            <GradeBadge grade={grade.grade} size="lg" />
            <div>
              <div className="text-sm text-storm">Condition grade</div>
              <div className="text-xl font-bold">{grade.summary}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="text-sm text-storm">Confidence</div>
              <div className="text-lg font-bold">{Math.round(grade.confidence * 100)}%</div>
            </div>
            <div>
              <div className="text-sm text-storm">Graded in</div>
              <div className="text-lg font-bold">{(grade.tookMs / 1000).toFixed(2)}s</div>
            </div>
            <div>
              <div className="text-sm text-storm">Engine</div>
              <div className="text-lg font-bold capitalize">{grade.gradedBy}</div>
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm font-semibold text-storm">Damage Detective</div>
            {grade.flaws.length === 0 ? (
              <Badge tone="success">No flaws detected</Badge>
            ) : (
              <ul className="space-y-1 text-sm">
                {grade.flaws.map((f, i) => (
                  <li key={i}>
                    • <span className="font-medium">{f.type}</span> — {f.severity} at {f.location}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/** Smart Router visualization — inputs flowing into a chosen path + reasoning. */
function RouterView({ routing }: { routing: RoutingResultDTO }) {
  const inputs = [
    ["Grade", routing.inputs.grade],
    ["Re-listing cost", `₹${routing.inputs.relistingCost.toLocaleString("en-IN")}`],
    ["Resale value", `₹${routing.inputs.resaleValue.toLocaleString("en-IN")}`],
    ["Nearby demand", `${routing.inputs.nearbyDemandCount} buyer(s)`],
    ["Repairability", `${Math.round(routing.inputs.repairability * 100)}%`],
  ] as const;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardBody>
          <div className="mb-2 text-sm font-semibold text-storm">Inputs</div>
          <ul className="space-y-2">
            {inputs.map(([k, v], i) => (
              <motion.li
                key={k}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between rounded-lg bg-cloud px-3 py-2 text-sm"
              >
                <span className="text-storm">{k}</span>
                <span className="font-semibold">{v}</span>
              </motion.li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card className="border-zestDark/40">
        <CardBody className="space-y-3">
          <Badge tone="info">Decision</Badge>
          <div className="text-2xl font-bold text-ink">{routing.path.replace(/_/g, " ")}</div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-lg bg-cloud p-3 text-sm leading-relaxed text-ink"
          >
            {routing.reasoning}
          </motion.p>
          <div className="text-xs text-storm">
            Considered: {routing.considered.map((c) => c.path.replace(/_/g, " ")).join(", ")}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
