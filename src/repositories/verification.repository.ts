import type { Prisma, VerificationResult } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * VerificationResult repository — data access for pre-grade product-verification
 * assessments. Pure persistence; the verification service owns the logic.
 */
export const verificationRepository = {
  async create(data: Prisma.VerificationResultCreateInput): Promise<VerificationResult> {
    return prisma.verificationResult.create({ data });
  },

  async findById(id: string): Promise<VerificationResult | null> {
    return prisma.verificationResult.findUnique({ where: { id } });
  },

  /** Latest verification for an item, if any. */
  async findLatestForItem(itemId: string): Promise<VerificationResult | null> {
    return prisma.verificationResult.findFirst({
      where: { itemId },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Full verification history for an item (newest first) — used by reviewers. */
  async listForItem(itemId: string): Promise<VerificationResult[]> {
    return prisma.verificationResult.findMany({
      where: { itemId },
      orderBy: { createdAt: "desc" },
    });
  },
};
