/**
 * Vitest global setup.
 *
 * Runs before any test module is imported, so we can populate the environment
 * with safe test defaults. This means env.ts validation passes in tests without
 * needing a real .env, and unit tests stay hermetic (no real DB/Redis/AWS).
 */
const procEnv = process.env as Record<string, string | undefined>;
procEnv.NODE_ENV = "test";
process.env.DATABASE_URL ??=
  "postgresql://test:test@localhost:5432/reloop_test?sslmode=disable";
process.env.UPSTASH_REDIS_REST_URL ??= "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN ??= "test-token";
process.env.GRADER_PROVIDER ??= "local";
process.env.AWS_REGION ??= "us-east-1";
process.env.BEDROCK_MODEL_ID ??= "anthropic.claude-3-5-sonnet-20240620-v1:0";
process.env.NEXT_PUBLIC_API_BASE_URL ??= "http://localhost:3000";
