-- Circular Commerce Decision Engine config knobs (all nullable — the engine has
-- safe code defaults, the seed populates these for live tuning).
ALTER TABLE "RoutingConfig" ADD COLUMN IF NOT EXISTS "conditionScoreByGrade" JSONB;
ALTER TABLE "RoutingConfig" ADD COLUMN IF NOT EXISTS "routeScoreBands" JSONB;
ALTER TABLE "RoutingConfig" ADD COLUMN IF NOT EXISTS "confidenceBandThresholds" JSONB;
