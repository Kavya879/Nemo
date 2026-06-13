import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/items/intake
 * Submit a new return case. Creates Product, ProductItem, Return, and ProductImages.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      brand,
      category,
      size,
      color,
      region,
      reason,
      details,
      imageUrls = [],
      userId,
      originalPrice,
      purchaseDate,
    } = body;

    // Validation
    if (!title || !category || !region || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: title, category, region, reason" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    // Create product + item + return in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          title,
          brand: brand || null,
          category,
          originalPrice: originalPrice ? parseFloat(originalPrice) : null,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
          ownerId: userId,
        },
      });

      const productItem = await tx.productItem.create({
        data: {
          productId: product.id,
          size: size || null,
          color: color || null,
          status: "RETURNED",
          serialHash: `rl-${product.id.slice(0, 8)}`,
          materialNotes: [],
          ownerCount: 1,
          cityTrail: [region],
          carbonSaved: 0,
        },
      });

      const returnCase = await tx.return.create({
        data: {
          productItemId: productItem.id,
          userId,
          reason,
          details: details || null,
          region,
          status: "DRAFT",
        },
      });

      // Create images if provided
      if (imageUrls.length > 0) {
        await tx.productImage.createMany({
          data: imageUrls.map((url: string, i: number) => ({
            productItemId: productItem.id,
            returnId: returnCase.id,
            url,
            filename: `image-${i + 1}.jpg`,
            mimeType: "image/jpeg",
            sizeBytes: 0,
          })),
        });
      }

      // Record product event
      await tx.productEvent.create({
        data: {
          productId: product.id,
          eventType: "returned",
          description: `Item returned: ${reason}`,
          city: region,
          carbonDelta: 0,
        },
      });

      return { product, productItem, returnCase };
    });

    return NextResponse.json({
      id: result.returnCase.id,
      productId: result.product.id,
      productItemId: result.productItem.id,
      status: "DRAFT",
      message: "Return case created. Ready for AI inspection.",
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/items/intake error:", error);
    return NextResponse.json(
      { error: "Failed to create return case" },
      { status: 500 }
    );
  }
}
