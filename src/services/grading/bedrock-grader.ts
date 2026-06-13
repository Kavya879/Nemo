import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { env, assertBedrockConfigured } from "@/config/env";
import { GRADING_PROMPT } from "@/config/prompts";
import { UpstreamError } from "@/lib/errors";
import type { ImageInput } from "@/types";
import {
  GraderOutputSchema,
  type GraderOutput,
  type ImageGrader,
} from "./image-grader.interface";

/**
 * Primary grader — Amazon Bedrock with Claude vision.
 *
 * Sends the product images + a strict-JSON prompt, then parses and Zod-validates
 * the model's response. Any failure throws UpstreamError so the grading service
 * can fall back to the local grader.
 */

/** Strips ```json fences and grabs the first {...} block, then parses. */
function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new UpstreamError("Bedrock response contained no JSON object.", {
      raw: text.slice(0, 300),
    });
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

export function createBedrockGrader(): ImageGrader {
  // Construct lazily so the app can boot (and run the local grader) without AWS.
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
    async grade(images: ImageInput[]): Promise<GraderOutput> {
      if (images.length === 0) {
        throw new UpstreamError("Bedrock grader received no images.");
      }

      const content = [
        ...images.map((img) => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: img.mimeType,
            data: img.base64,
          },
        })),
        { type: "text" as const, text: GRADING_PROMPT },
      ];

      const body = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        temperature: 0,
        messages: [{ role: "user", content }],
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
        throw new UpstreamError("Bedrock invocation failed.", {
          cause: err instanceof Error ? err.message : String(err),
        });
      }

      // Validate the model's JSON against the contract — bad JSON is caught here,
      // never crashes the request.
      const parsed = GraderOutputSchema.safeParse(extractJson(responseText));
      if (!parsed.success) {
        throw new UpstreamError("Bedrock returned a malformed grade.", {
          issues: parsed.error.issues,
        });
      }
      return parsed.data;
    },
  };
}
