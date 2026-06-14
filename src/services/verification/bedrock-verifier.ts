import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { env, assertBedrockConfigured } from "@/config/env";
import { VERIFICATION_PROMPT } from "@/config/prompts";
import { UpstreamError } from "@/lib/errors";
import { VerifierOutputSchema, type RoledImageInput, type VerifierOutput } from "@/types";
import type { ProductVerifier, VerifyContext } from "./product-verifier.interface";

/**
 * Primary verifier — AWS Bedrock with Claude vision. Sends the catalog reference
 * image (when available) followed by the seller's role-tagged uploads and a
 * strict-JSON prompt, then parses + Zod-validates the response. Any failure
 * throws UpstreamError so the verification service can fall back to CLIP.
 */

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new UpstreamError("Bedrock verification response contained no JSON object.", {
      raw: text.slice(0, 300),
    });
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

export function createBedrockVerifier(): ProductVerifier {
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
    async verify(images: RoledImageInput[], context: VerifyContext): Promise<VerifierOutput> {
      if (images.length === 0) {
        throw new UpstreamError("Bedrock verifier received no images.");
      }

      const imageBlocks = [
        ...(context.reference
          ? [
              {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: context.reference.mimeType,
                  data: context.reference.base64,
                },
              },
            ]
          : []),
        ...images.map((img) => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: img.mimeType,
            data: img.base64,
          },
        })),
      ];

      const prompt = VERIFICATION_PROMPT({
        name: context.name,
        brand: context.brand,
        category: context.category,
        roles: images.map((i) => i.role),
        hasReference: Boolean(context.reference),
      });

      const body = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        temperature: 0,
        messages: [{ role: "user", content: [...imageBlocks, { type: "text" as const, text: prompt }] }],
      };

      let responseText: string;
      try {
        const res = await getClient().send(
          new InvokeModelCommand({
            modelId: env.BEDROCK_MODEL_ID,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(body),
          }),
        );
        const decoded = JSON.parse(new TextDecoder().decode(res.body)) as {
          content?: Array<{ text?: string }>;
        };
        responseText = decoded.content?.[0]?.text ?? "";
      } catch (err) {
        if (err instanceof UpstreamError) throw err;
        throw new UpstreamError("Bedrock verification invocation failed.", {
          cause: err instanceof Error ? err.message : String(err),
        });
      }

      const parsed = VerifierOutputSchema.safeParse(extractJson(responseText));
      if (!parsed.success) {
        throw new UpstreamError("Bedrock returned a malformed verification.", {
          issues: parsed.error.issues,
        });
      }
      return parsed.data;
    },
  };
}
