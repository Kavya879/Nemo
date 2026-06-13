"""
ReLoop AI Microservice
─────────────────────────────────────────────────────────────────────────────
FastAPI service using only free local tools:
  • Ollama (local LLM) for text reasoning
  • OpenCV for image quality analysis
  • YOLO placeholder for defect detection
  • scikit-learn-style scoring logic
  • sentence-transformers for embeddings (optional)

Every endpoint returns structured JSON with deterministic fallbacks
when Ollama or vision models are unavailable.
"""

import os
import hashlib
import math
from typing import Any

import cv2
import numpy as np
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# ─── Configuration ──────────────────────────────────────────────────────────────

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "")
EMBEDDINGS_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    _embed_model = None

app = FastAPI(
    title="ReLoop AI Service",
    version="0.2.0",
    description="Local AI microservice for grading, routing, pricing, and matching.",
)

# ─── Request/Response Models ────────────────────────────────────────────────────


class InspectRequest(BaseModel):
    title: str
    brand: str | None = None
    category: str
    reason: str
    details: str = ""
    image_urls: list[str] = Field(default_factory=list)
    image_base64: str | None = None  # Optional single image as base64


class InspectResponse(BaseModel):
    condition_grade: str
    condition_score: int
    damage_score: int
    cleanliness_score: int
    confidence_score: int
    ai_summary: str
    quality_score: int
    history_score: int
    severe_terms: list[str]
    mild_terms: list[str]
    unused_terms: list[str]
    vision: dict[str, Any]
    yolo_defects: int
    risk_flags: list[str]
    fallback_mode: bool
    services_used: list[str]


class RouteRequest(BaseModel):
    condition_score: int
    quality_score: int
    history_score: int
    grade: str
    category: str
    severe_defect_count: int = 0
    has_nearby_demand: bool = False
    demand_score: float = 0.0


class RouteResponse(BaseModel):
    route: str
    reason: str
    expected_recovery_value: str
    confidence_score: int
    priority: int


class PriceRequest(BaseModel):
    title: str
    brand: str | None = None
    category: str
    grade: str
    original_price: float | None = None
    purchase_date: str | None = None  # ISO date


class PriceResponse(BaseModel):
    estimated_price: float
    price_range: dict[str, float]
    confidence: int
    source: str
    factors: dict[str, Any]


class RewriteRequest(BaseModel):
    title: str
    description: str = ""
    return_reasons: list[str]
    category: str | None = None


class RewriteResponse(BaseModel):
    revised_title: str
    revised_description: str
    revised_bullets: list[str]
    size_note: str
    detected_issue: str
    prevention_tip: str
    source: str


class FitRequest(BaseModel):
    brand: str
    category: str
    current_size: str | None = None
    foot_width: str | None = None  # "narrow" | "regular" | "wide"


class FitResponse(BaseModel):
    recommendation: str
    size_adjustment: int
    fit_type: str
    confidence: int
    notes: str | None = None
    source: str


class EmbedRequest(BaseModel):
    texts: list[str]


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str
    dimensions: int


class MatchRequest(BaseModel):
    item_category: str
    item_size: str | None = None
    item_region: str
    item_condition_score: int
    need_signals: list[dict[str, Any]]


class MatchResponse(BaseModel):
    matches: list[dict[str, Any]]
    best_match: dict[str, Any] | None
    recommend_peer_exchange: bool
    threshold: int


# ─── Health Check ───────────────────────────────────────────────────────────────


@app.get("/health")
def health() -> dict[str, Any]:
    ollama_ok = check_ollama()
    return {
        "status": "ok",
        "services": {
            "ollama": "available" if ollama_ok else "unavailable",
            "opencv": "available",
            "yolo": "configured" if YOLO_MODEL_PATH else "not-configured",
            "embeddings": "available" if EMBEDDINGS_AVAILABLE else "unavailable",
        },
    }


# ─── POST /inspect ──────────────────────────────────────────────────────────────


@app.post("/inspect", response_model=InspectResponse)
async def inspect(req: InspectRequest) -> InspectResponse:
    services_used: list[str] = []
    fallback_mode = False

    # ── Text analysis ──
    text = f"{req.reason} {req.details}".lower()

    severe_list = ["broken", "cracked", "dead", "missing", "fake", "torn"]
    mild_list = ["opened", "scratch", "loose", "box", "minor"]
    unused_list = ["unused", "new", "sealed", "wrong", "duplicate", "gift"]

    severe_terms = [t for t in severe_list if t in text]
    mild_terms = [t for t in mild_list if t in text]
    unused_terms = [t for t in unused_list if t in text]

    # ── Vision analysis ──
    vision = analyze_vision(req.image_base64, req.image_urls)
    if vision.get("analyzed"):
        services_used.append("opencv")

    clarity_bonus = 8 if vision.get("is_clear") else 0
    yolo_defects = run_yolo_detection(req.image_base64)
    if YOLO_MODEL_PATH:
        services_used.append("yolo")

    # ── Score computation ──
    image_count = len(req.image_urls) + (1 if req.image_base64 else 0)
    image_signal = min(image_count * 5, 15)

    condition_score = clamp(
        88 + image_signal + len(unused_terms) * 4
        - len(severe_terms) * 22 - len(mild_terms) * 7
        - yolo_defects * 10 + clarity_bonus,
        12, 98
    )
    quality_score = clamp(
        82 + image_signal + clarity_bonus
        - len(severe_terms) * 16 - yolo_defects * 8,
        18, 96
    )
    history_score = clamp(
        78 + len(unused_terms) * 5
        - len(severe_terms) * 10 - len(mild_terms) * 3,
        20, 94
    )

    confidence_score = round((condition_score + quality_score + history_score) / 3)
    grade = score_to_grade(confidence_score)

    # Damage and cleanliness derived scores
    damage_score = clamp(100 - len(severe_terms) * 25 - len(mild_terms) * 10 - yolo_defects * 15, 0, 100)
    cleanliness_score = clamp(quality_score + (10 if vision.get("is_clear") else -10), 0, 100)

    # ── AI summary ──
    ai_summary = generate_inspection_summary(
        req.title, grade, condition_score, severe_terms, mild_terms, unused_terms, req.reason
    )
    if "ollama" in ai_summary.get("source", ""):
        services_used.append("ollama")
    else:
        fallback_mode = True

    # ── Risk flags ──
    risk_flags: list[str] = []
    if severe_terms:
        risk_flags.append("Manual inspection required before resale.")
    if image_count < 2:
        risk_flags.append("Request additional images to improve grading confidence.")
    if "missing" in text:
        risk_flags.append("Accessory completeness must be verified.")
    if yolo_defects > 0:
        risk_flags.append(f"{yolo_defects} defect(s) detected via vision analysis.")
    if not risk_flags:
        risk_flags.append("No major quality risk detected.")

    services_used.append("text-analysis")

    return InspectResponse(
        condition_grade=grade,
        condition_score=condition_score,
        damage_score=damage_score,
        cleanliness_score=cleanliness_score,
        confidence_score=confidence_score,
        ai_summary=ai_summary["text"],
        quality_score=quality_score,
        history_score=history_score,
        severe_terms=severe_terms,
        mild_terms=mild_terms,
        unused_terms=unused_terms,
        vision=vision,
        yolo_defects=yolo_defects,
        risk_flags=risk_flags,
        fallback_mode=fallback_mode,
        services_used=services_used,
    )


# ─── POST /route ────────────────────────────────────────────────────────────────


@app.post("/route", response_model=RouteResponse)
def route_item(req: RouteRequest) -> RouteResponse:
    """Priority-based routing: PEER_EXCHANGE > RESALE > REFURBISH > DONATE > LIQUIDATE"""

    category = req.category.upper()

    # Priority 1: Peer Exchange
    if req.has_nearby_demand and req.condition_score > 74 and category != "ELECTRONICS":
        return RouteResponse(
            route="PEER_EXCHANGE",
            reason=f"Nearby demand match (score {req.demand_score:.0f}) with condition {req.condition_score} > 74, non-electronics",
            expected_recovery_value="85-95% via direct exchange",
            confidence_score=min(95, req.condition_score),
            priority=1,
        )

    # Priority 2: Resale
    if req.grade == "A" or (req.grade == "B" and req.condition_score > 78):
        reason = (
            f"Grade {req.grade} (confidence {(req.condition_score + req.quality_score + req.history_score) // 3}%)"
            if req.grade == "A"
            else f"Grade B with condition score {req.condition_score} > 78"
        )
        return RouteResponse(
            route="RESALE",
            reason=reason,
            expected_recovery_value="50-70% of original price",
            confidence_score=min(90, req.condition_score),
            priority=2,
        )

    # Priority 3: Refurbish
    if category == "ELECTRONICS" and req.quality_score > 48 and req.severe_defect_count < 2:
        return RouteResponse(
            route="REFURBISH",
            reason=f"Electronics with quality {req.quality_score} > 48, severe defects {req.severe_defect_count} < 2",
            expected_recovery_value="30-50% after refurbishment cost",
            confidence_score=min(75, req.quality_score),
            priority=3,
        )

    # Priority 4: Donate
    if req.grade == "C":
        return RouteResponse(
            route="DONATE",
            reason="Grade C — functional but below resale threshold; community donation maximizes value",
            expected_recovery_value="No monetary recovery; 3.8 kg CO₂ offset",
            confidence_score=60,
            priority=4,
        )

    # Priority 5: Liquidate
    return RouteResponse(
        route="LIQUIDATE",
        reason="Grade D — significant quality issues; parts recovery or responsible disposal",
        expected_recovery_value="5-15% via bulk liquidation",
        confidence_score=40,
        priority=5,
    )


# ─── POST /price ────────────────────────────────────────────────────────────────


@app.post("/price", response_model=PriceResponse)
def price_suggest(req: PriceRequest) -> PriceResponse:
    grade_multipliers = {"A": 0.70, "B": 0.50, "C": 0.30, "D": 0.15}
    category_multipliers = {
        "ELECTRONICS": 1.15, "FOOTWEAR": 1.05, "APPAREL": 0.90,
        "HOME": 1.00, "BOOKS": 0.85, "TOYS": 0.95, "OTHER": 1.00,
    }

    grade_mult = grade_multipliers.get(req.grade.upper(), 0.50)
    cat_mult = category_multipliers.get(req.category.upper(), 1.00)
    source = "formula"
    confidence = 82

    if req.original_price and req.original_price > 0:
        base_price = req.original_price * grade_mult
    else:
        # Try Ollama estimate
        ollama_price = ask_ollama_price(req.title, req.brand, req.category)
        if ollama_price:
            base_price = ollama_price * grade_mult
            confidence = 60
            source = "ollama"
        else:
            base_price = get_fallback_price(req.category) * grade_mult
            confidence = 45
            source = "fallback"

    estimated = base_price * cat_mult

    # Age decay
    age_multiplier = 1.0
    if req.purchase_date:
        months = get_months_elapsed(req.purchase_date)
        age_multiplier = max(0.60, 1.0 - 0.02 * months)
        estimated *= age_multiplier

    # Price floor: 15% of base
    price_floor = base_price * 0.15
    estimated = max(estimated, price_floor)
    estimated = round(estimated, 2)

    price_low = round(estimated * 0.85, 2)
    price_high = round(estimated * 1.15, 2)

    return PriceResponse(
        estimated_price=estimated,
        price_range={"low": price_low, "high": price_high},
        confidence=confidence,
        source=source,
        factors={
            "grade_multiplier": grade_mult,
            "category_multiplier": cat_mult,
            "age_multiplier": round(age_multiplier, 3),
            "price_floor": round(price_floor, 2),
        },
    )


# ─── POST /rewrite-listing ─────────────────────────────────────────────────────


@app.post("/rewrite-listing", response_model=RewriteResponse)
def rewrite_listing(req: RewriteRequest) -> RewriteResponse:
    reasons_text = ", ".join(req.return_reasons).lower()
    source = "fallback"

    # Attempt Ollama rewrite
    ollama_result = try_ollama_rewrite(req.title, req.description, req.return_reasons)
    if ollama_result:
        source = "ollama"
        return RewriteResponse(
            revised_title=ollama_result.get("title", req.title)[:200],
            revised_description=ollama_result.get("description", req.description)[:2000],
            revised_bullets=ollama_result.get("bullets", [])[:6],
            size_note=ollama_result.get("size_note", "")[:500],
            detected_issue=ollama_result.get("detected_issue", "Unknown")[:500],
            prevention_tip=ollama_result.get("prevention_tip", "")[:500],
            source=source,
        )

    # ── Deterministic fallback ──
    detected_issue, title_suffix, size_note, prevention_tip, bullets = compute_fallback_rewrite(
        req.title, req.description, reasons_text, req.category
    )

    revised_desc = req.description if req.description else req.title
    revised_desc += f"\n\n⚠️ {prevention_tip}"

    return RewriteResponse(
        revised_title=(req.title + title_suffix)[:200],
        revised_description=revised_desc[:2000],
        revised_bullets=bullets,
        size_note=size_note,
        detected_issue=detected_issue,
        prevention_tip=prevention_tip,
        source=source,
    )


# ─── POST /fit-recommend ───────────────────────────────────────────────────────


@app.post("/fit-recommend", response_model=FitResponse)
def fit_recommend(req: FitRequest) -> FitResponse:
    """Deterministic brand fit rules. No external service needed."""
    brand_lower = req.brand.strip().lower()
    category_upper = req.category.upper()

    # Built-in brand fit database
    fit_rules: dict[str, dict[str, Any]] = {
        "aerostride": {
            "category": "FOOTWEAR", "adjustment": 1, "fit": "narrow",
            "confidence": 87, "rec": "Runs narrow. Size up 1 from your usual size.",
            "notes": "Based on 284 return cases. 68% of UK7 returns cite size.",
        },
        "cloudwalk": {
            "category": "FOOTWEAR", "adjustment": 0, "fit": "regular",
            "confidence": 72, "rec": "True to size. Order your usual UK size.",
            "notes": "Standard canvas fit.",
        },
        "trailmaster": {
            "category": "FOOTWEAR", "adjustment": 1, "fit": "narrow",
            "confidence": 78, "rec": "Size up half a size for thick socks. Snug toe box.",
            "notes": "Performance hiking fit.",
        },
    }

    rule = fit_rules.get(brand_lower)

    if not rule or rule["category"] != category_upper:
        return FitResponse(
            recommendation="No fit data available for this brand. Order your usual size.",
            size_adjustment=0,
            fit_type="unknown",
            confidence=0,
            notes=None,
            source="no-data",
        )

    rec = rule["rec"]
    if req.foot_width == "wide" and rule["fit"] == "narrow":
        rec = f"WIDE FOOT: Size up at least {rule['adjustment'] + 1} for this brand. {rec}"

    return FitResponse(
        recommendation=rec,
        size_adjustment=rule["adjustment"],
        fit_type=rule["fit"],
        confidence=rule["confidence"],
        notes=rule["notes"],
        source="brand-fit-rules",
    )


# ─── POST /embed ───────────────────────────────────────────────────────────────


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest) -> EmbedResponse:
    """Generate text embeddings using sentence-transformers (if available) or hash-based fallback."""
    if EMBEDDINGS_AVAILABLE and _embed_model is not None:
        embeddings = _embed_model.encode(req.texts).tolist()
        return EmbedResponse(
            embeddings=embeddings,
            model="all-MiniLM-L6-v2",
            dimensions=384,
        )

    # Deterministic hash-based pseudo-embeddings for demo
    embeddings = [hash_embed(text, 128) for text in req.texts]
    return EmbedResponse(
        embeddings=embeddings,
        model="hash-fallback",
        dimensions=128,
    )


# ─── POST /match ───────────────────────────────────────────────────────────────


@app.post("/match", response_model=MatchResponse)
def match(req: MatchRequest) -> MatchResponse:
    """Composite scoring: distance(0.30) + urgency(0.25) + size(0.25) + demand(0.20)"""

    matches: list[dict[str, Any]] = []

    for signal in req.need_signals:
        sig_category = signal.get("category", "").upper()
        sig_region = signal.get("region", "")
        sig_size = signal.get("size")
        sig_urgency = signal.get("urgency", 5)
        sig_distance_km = signal.get("distance_km", 10.0)
        sig_demand = signal.get("demand_level", "Medium")

        # Only match same category
        if sig_category != req.item_category.upper():
            continue

        # Score components
        distance_score = max(0.0, 100.0 - sig_distance_km * 10.0)
        urgency_score = sig_urgency * 10.0
        size_score = compute_size_score(req.item_size, sig_size)
        demand_score = {"High": 85.0, "Medium": 60.0, "Low": 35.0}.get(sig_demand, 50.0)

        composite = (
            distance_score * 0.30 +
            urgency_score * 0.25 +
            size_score * 0.25 +
            demand_score * 0.20
        )
        composite = round(min(100, max(0, composite)))

        matches.append({
            "pool": signal.get("pool", f"{sig_region} pool"),
            "region": sig_region,
            "category": sig_category,
            "size": sig_size,
            "urgency": sig_urgency,
            "distance_km": sig_distance_km,
            "demand_level": sig_demand,
            "scores": {
                "distance": round(distance_score),
                "urgency": round(urgency_score),
                "size": round(size_score),
                "demand": round(demand_score),
                "composite": composite,
            },
            "above_threshold": composite > 55,
        })

    # Sort by composite score
    matches.sort(key=lambda m: m["scores"]["composite"], reverse=True)
    best = matches[0] if matches else None

    return MatchResponse(
        matches=matches,
        best_match=best,
        recommend_peer_exchange=best is not None and best["scores"]["composite"] > 55 and req.item_condition_score > 74,
        threshold=55,
    )


# ─── Helper Functions ───────────────────────────────────────────────────────────


def check_ollama() -> bool:
    try:
        resp = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        return resp.status_code == 200
    except requests.RequestException:
        return False


def ask_ollama(prompt: str, timeout: int = 12) -> str:
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=timeout,
        )
        response.raise_for_status()
        return response.json().get("response", "").strip()
    except requests.RequestException:
        return ""


def ask_ollama_price(title: str, brand: str | None, category: str) -> float | None:
    prompt = f"Estimate the retail price in INR for: {title}{f' by {brand}' if brand else ''} (category: {category}). Reply with only a number."
    result = ask_ollama(prompt)
    if result:
        import re
        match = re.search(r"[\d,]+\.?\d*", result)
        if match:
            try:
                return float(match.group().replace(",", ""))
            except ValueError:
                pass
    return None


def try_ollama_rewrite(title: str, description: str, reasons: list[str]) -> dict[str, Any] | None:
    prompt = (
        "You are a product listing optimizer. Given a product listing and its return reasons, "
        "generate an improved listing to prevent returns.\n\n"
        f"Title: {title}\nDescription: {description}\nReturn Reasons: {', '.join(reasons)}\n\n"
        "Respond in this exact JSON format:\n"
        '{"title": "improved title", "description": "improved description", '
        '"bullets": ["bullet 1", "bullet 2", "bullet 3"], '
        '"size_note": "size/fit guidance", '
        '"detected_issue": "main problem detected", '
        '"prevention_tip": "actionable prevention tip"}'
    )
    result = ask_ollama(prompt)
    if result:
        import json
        import re
        json_match = re.search(r"\{[\s\S]*\}", result)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
    return None


def generate_inspection_summary(
    title: str, grade: str, score: int,
    severe: list[str], mild: list[str], unused: list[str], reason: str
) -> dict[str, str]:
    """Try Ollama for summary, fall back to template."""
    prompt = (
        f"In 2 sentences, summarize this product inspection result:\n"
        f"Product: {title}\nGrade: {grade} (score {score}/100)\n"
        f"Return reason: {reason}\n"
        f"Severe defects: {', '.join(severe) or 'none'}\n"
        f"Mild issues: {', '.join(mild) or 'none'}\n"
        f"Unused indicators: {', '.join(unused) or 'none'}"
    )
    result = ask_ollama(prompt, timeout=5)
    if result:
        return {"text": result[:500], "source": "ollama"}

    # Template fallback
    if severe:
        text = f"Grade {grade} ({score}/100). Defect indicators detected ({', '.join(severe)}). Condition score reduced. Manual inspection recommended before routing."
    elif unused:
        text = f"Grade {grade} ({score}/100). Item appears unused ({', '.join(unused)}). High condition confidence. Suitable for direct resale or exchange."
    else:
        text = f"Grade {grade} ({score}/100). Standard return with moderate condition signals. No critical defects detected in text or vision analysis."

    return {"text": text, "source": "template-fallback"}


def analyze_vision(image_base64: str | None, image_urls: list[str]) -> dict[str, Any]:
    """Run OpenCV analysis on provided image data."""
    if not image_base64 and not image_urls:
        return {"analyzed": False, "is_clear": False, "blur": None, "brightness": None, "edge_density": None}

    if image_base64:
        try:
            import base64
            img_bytes = base64.b64decode(image_base64)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if frame is not None:
                return run_opencv_analysis(frame)
        except Exception:
            pass

    # For URL-based images in production, you'd download them here.
    # For demo, return simulated vision metrics based on image count.
    count = len(image_urls)
    return {
        "analyzed": count > 0,
        "is_clear": count >= 2,
        "blur": 120.5 if count >= 2 else 55.0,
        "brightness": 132.0 if count >= 2 else 42.0,
        "edge_density": 0.31 if count >= 2 else 0.11,
        "note": "Simulated vision metrics (image URLs not downloaded in demo mode)",
    }


def run_opencv_analysis(frame: np.ndarray) -> dict[str, Any]:
    """Full OpenCV pipeline: blur, brightness, edge density."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(gray.mean())
    edges = cv2.Canny(gray, 80, 160)
    edge_density = float(edges.mean()) / 255.0

    is_clear = blur > 80 and 45 < brightness < 220

    return {
        "analyzed": True,
        "is_clear": is_clear,
        "blur": round(blur, 2),
        "brightness": round(brightness, 2),
        "edge_density": round(edge_density, 4),
    }


def run_yolo_detection(image_base64: str | None) -> int:
    """YOLO defect detection stub. Returns defect count."""
    if not YOLO_MODEL_PATH or not image_base64:
        return 0

    # Placeholder: when YOLO model file is present, load with ultralytics
    # from ultralytics import YOLO
    # model = YOLO(YOLO_MODEL_PATH)
    # results = model(frame)
    # return len(results[0].boxes)
    return 0


def compute_size_score(item_size: str | None, signal_size: str | None) -> float:
    """Size matching: exact=100, no requirement=60, mismatch=20."""
    if signal_size is None:
        return 60.0
    if item_size and item_size.upper() == signal_size.upper():
        return 100.0
    return 20.0


def compute_fallback_rewrite(
    title: str, description: str, reasons_text: str, category: str | None
) -> tuple[str, str, str, str, list[str]]:
    """Deterministic rewrite based on return reason patterns."""

    if any(w in reasons_text for w in ["size", "tight", "small", "fit", "narrow", "large"]):
        detected_issue = "Size/fit expectations mismatch"
        title_suffix = " — check size guide before ordering"
        size_note = "This product runs narrow/small. Consider sizing up if between sizes."
        prevention_tip = "Add prominent size comparison chart and mention fit type (slim, regular, relaxed)."
        bullets = [
            "✓ Check the size guide — this item runs narrow",
            "✓ Size up if you're between sizes or prefer relaxed fit",
            "✓ Wide-foot buyers: choose wide-fit variant or size up 1",
        ]
    elif any(w in reasons_text for w in ["bright", "color", "different", "photo", "looks"]):
        detected_issue = "Appearance differs from listing"
        title_suffix = " — see verified product photos"
        size_note = ""
        prevention_tip = "Use natural lighting photos and state exact color/brightness specs."
        bullets = [
            "✓ Photos taken in natural daylight for accurate color",
            "✓ Actual brightness/output specs clearly listed",
            "✓ What you see is what you get — no filters",
        ]
    elif any(w in reasons_text for w in ["quality", "cheap", "broken", "defective"]):
        detected_issue = "Quality perception below expectations"
        title_suffix = " — detailed quality specs inside"
        size_note = ""
        prevention_tip = "List exact materials, certifications, and build quality indicators."
        bullets = [
            "✓ Materials and build quality detailed below",
            "✓ Tested and certified before shipping",
            "✓ Exact specifications — no surprises",
        ]
    else:
        detected_issue = f"Multiple return patterns detected ({len(reasons_text.split(','))} reasons)"
        title_suffix = " — read full specs before buying"
        size_note = ""
        prevention_tip = "Address the top return reasons directly in the listing description."
        bullets = [
            "✓ Complete specifications listed",
            "✓ Common questions answered below",
            "✓ What's included clearly stated",
        ]

    return detected_issue, title_suffix, size_note, prevention_tip, bullets


def get_fallback_price(category: str) -> float:
    averages = {
        "ELECTRONICS": 5000, "FOOTWEAR": 3000, "APPAREL": 2000,
        "HOME": 1500, "BOOKS": 500, "TOYS": 1200, "OTHER": 2000,
    }
    return averages.get(category.upper(), 2000)


def get_months_elapsed(purchase_date_str: str) -> int:
    from datetime import date
    try:
        parts = purchase_date_str.split("T")[0].split("-")
        pd = date(int(parts[0]), int(parts[1]), int(parts[2]))
        today = date.today()
        return (today.year - pd.year) * 12 + (today.month - pd.month)
    except (ValueError, IndexError):
        return 0


def score_to_grade(score: int) -> str:
    if score >= 86:
        return "A"
    if score >= 70:
        return "B"
    if score >= 52:
        return "C"
    return "D"


def clamp(value: int | float, lo: int, hi: int) -> int:
    return max(lo, min(hi, int(value)))


def hash_embed(text: str, dims: int = 128) -> list[float]:
    """Deterministic pseudo-embedding via hashing for demo purposes."""
    h = hashlib.sha256(text.encode()).digest()
    # Expand hash to fill dimensions
    expanded = h * (dims // len(h) + 1)
    values = [float(b) / 255.0 - 0.5 for b in expanded[:dims]]
    # Normalize
    norm = math.sqrt(sum(v * v for v in values)) or 1.0
    return [round(v / norm, 6) for v in values]
