import { z } from "zod";

/**
 * Environment configuration.
 *
 * Every environment variable the app depends on is declared and validated here
 * with Zod. This is the single source of truth for configuration. If a required
 * variable is missing or malformed, the app crashes at startup with a readable
 * message instead of failing mysteriously deep inside a request.
 *
 * Nothing in the codebase should read `process.env` directly — import `env` from
 * this module instead, so every consumer gets a typed, validated value.
 */

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Database (Neon Postgres)
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (Neon Postgres connection string)")
    .refine(
      (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
      "DATABASE_URL must be a postgres:// or postgresql:// connection string",
    ),

  // Redis (Upstash REST)
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url("UPSTASH_REDIS_REST_URL must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .min(1, "UPSTASH_REDIS_REST_TOKEN is required"),

  // Grading provider selection
  GRADER_PROVIDER: z.enum(["bedrock", "local"]).default("bedrock"),

  // AWS Bedrock — required only when the bedrock grader is actually invoked.
  // Kept optional at startup so the app can run on the local fallback alone.
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  BEDROCK_MODEL_ID: z
    .string()
    .default("anthropic.claude-3-5-sonnet-20240620-v1:0"),
  BEDROCK_TEXT_MODEL_ID: z
    .string()
    .default("anthropic.claude-3-5-haiku-20241022-v1:0"),

  // Local grader (Transformers.js)
  LOCAL_GRADER_MODEL: z.string().default("Xenova/vit-base-patch16-224"),

  // App
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    // Fail loudly and clearly — never a silent or cryptic failure.
    throw new Error(
      `\n❌ Invalid environment configuration. Fix these variables in your .env file:\n\n${issues}\n\n` +
        `See .env.example for the full list of required variables.\n`,
    );
  }

  return parsed.data;
}

/**
 * Validated, typed environment. Import this everywhere instead of process.env.
 */
export const env: Env = loadEnv();

/**
 * Convenience guard used by the Bedrock grader to assert its credentials exist
 * before it tries to call AWS. Lets the rest of the app boot without AWS keys
 * (running on the local fallback) while still giving a clear error if someone
 * selects the bedrock provider without configuring it.
 */
export function assertBedrockConfigured(): void {
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    throw new Error(
      "Bedrock grader selected but AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are not set. " +
        "Set them in .env or switch GRADER_PROVIDER=local.",
    );
  }
}
