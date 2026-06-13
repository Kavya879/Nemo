import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { env, assertBedrockConfigured } from "@/config/env";
import { LISTING_PROMPT } from "@/config/prompts";
import { UpstreamError } from "@/lib/errors";
import {
  ListingCopySchema,
  type ListingCopy,
  type ListingCopyGenerator,
  type ListingCopyInput,
} from "./listing-copy.interface";

/**
 * Bedrock/Claude copy generator — writes the listing title + description.
 * Returns strict JSON, Zod-validated. Throws UpstreamError on any failure so
 * the listing service can fall back to the template generator.
 */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new UpstreamError("Bedrock listing response contained no JSON.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

export function createBedrockCopyGenerator(): ListingCopyGenerator {
  let client: BedrockRuntimeClient | null = null;
  const getClient = () => {
    if (!client) {
      assertBedrockConfigured();
      client = new BedrockRuntimeClient({
        region: env.AWS_REGION,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID as string,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY as string,
        },
      });
    }
    return client;
  };

  return {
    name: "bedrock",
    async generate(input: ListingCopyInput): Promise<ListingCopy> {
      const body = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 512,
        temperature: 0.4,
        messages: [{ role: "user", content: LISTING_PROMPT(input) }],
      };

      let text: string;
      try {
        const res = await getClient().send(
          new InvokeModelCommand({
            modelId: env.BEDROCK_TEXT_MODEL_ID,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
          }),
        );
        const decoded = JSON.parse(new TextDecoder().decode(res.body)) as {
          content?: Array<{ text?: string }>;
        };
        text = decoded.content?.[0]?.text ?? "";
      } catch (err) {
        if (err instanceof UpstreamError) throw err;
        throw new UpstreamError("Bedrock listing-copy invocation failed.", {
          cause: err instanceof Error ? err.message : String(err),
        });
      }

      const parsed = ListingCopySchema.safeParse(extractJson(text));
      if (!parsed.success) {
        throw new UpstreamError("Bedrock returned malformed listing copy.", {
          issues: parsed.error.issues,
        });
      }
      return parsed.data;
    },
  };
}
