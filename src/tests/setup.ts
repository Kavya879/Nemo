/**
 * Vitest global setup.
 *
 * Runs before any test module is imported, so we can populate the environment
 * with safe test defaults. This means env.ts validation passes in tests without
 * needing a real .env, and unit tests stay hermetic (no real DB/Redis/AWS).
 */
const procEnv = process.env as Record<string, string | undefined>;
procEnv.NODE_ENV = "test";
// Default to the local docker-compose stack so integration tests run against a
// real DB/Redis. Override via real env vars (e.g. CI) to point elsewhere.
process.env.DATABASE_URL ??=
  "postgresql://nemo:nemo@localhost:55432/nemo?sslmode=disable";
process.env.UPSTASH_REDIS_REST_URL ??= "http://localhost:8079";
process.env.UPSTASH_REDIS_REST_TOKEN ??= "local_dev_token";
process.env.GRADER_PROVIDER ??= "local";
process.env.AWS_REGION ??= "us-east-1";
process.env.BEDROCK_MODEL_ID ??= "anthropic.claude-3-5-sonnet-20240620-v1:0";
process.env.NEXT_PUBLIC_API_BASE_URL ??= "http://localhost:3000";
