import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

/**
 * POST /api/upload
 * Upload product images to public/uploads/ directory.
 * Accepts multipart/form-data with field name "files".
 * Returns array of stored file URLs.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided. Send files via multipart/form-data with field name 'files'." },
        { status: 400 }
      );
    }

    if (files.length > 6) {
      return NextResponse.json(
        { error: "Maximum 6 images allowed per upload." },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        errors.push(`${file.name}: unsupported format (accepted: JPEG, PNG, WebP)`);
        continue;
      }

      // Validate file size (5 MB max)
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name}: exceeds 5 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
        continue;
      }

      // Generate unique filename
      const ext = file.name.split(".").pop() || "jpg";
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const filename = `${timestamp}-${random}.${ext}`;

      // Write file
      const buffer = Buffer.from(await file.arrayBuffer());
      const filePath = path.join(uploadDir, filename);
      await writeFile(filePath, buffer);

      uploadedUrls.push(`/uploads/${filename}`);
    }

    return NextResponse.json({
      urls: uploadedUrls,
      count: uploadedUrls.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      { error: "File upload failed. Check server logs." },
      { status: 500 }
    );
  }
}
