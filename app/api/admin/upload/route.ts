import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, verifyAdminSessionValue } from "@/lib/server/admin-auth";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import fs from "node:fs";
import path from "node:path";

const BUCKET_NAME = "media";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml"
]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "svg"]);

function isAuthorizedAdmin(request: NextRequest): boolean {
  return verifyAdminSessionValue(request.cookies.get(adminCookieName)?.value);
}

function sanitizeExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  const ext = parts.length > 1 ? parts.pop() || "" : "";
  return ALLOWED_EXTENSIONS.has(ext) ? ext : "png";
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return NextResponse.json(
      { ok: false, message: "Akses ditolak. Silakan login sebagai administrator." },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, message: "File tidak ditemukan." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { ok: false, message: "Ukuran file maksimal 5 MB." },
        { status: 400 }
      );
    }

    const mimeType = (file.type || "").toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { ok: false, message: "Format file tidak didukung. Gunakan JPG, PNG, WEBP, GIF, atau SVG." },
        { status: 400 }
      );
    }

    const ext = sanitizeExtension(file.name);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        if (!buckets?.some((b) => b.name === BUCKET_NAME)) {
          await supabase.storage.createBucket(BUCKET_NAME, { public: true });
        }

        const { error } = await supabase.storage.from(BUCKET_NAME).upload(filename, buffer, {
          contentType: mimeType,
          upsert: false
        });

        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
          return NextResponse.json({ ok: true, url: publicUrl });
        }
        console.warn("[Upload] Supabase Storage upload error:", error.message);
      } catch (err) {
        console.warn("[Upload] Supabase Storage exception:", err);
      }
    }

    // Local filesystem fallback (local development only)
    try {
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buffer);
      return NextResponse.json({ ok: true, url: `/uploads/${filename}`, isLocal: true });
    } catch (writeErr) {
      console.error("[Upload] Local write failed:", writeErr);
      return NextResponse.json(
        { ok: false, message: "Gagal menyimpan file ke penyimpanan lokal." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Upload Server Error]:", error);
    return NextResponse.json({ ok: false, message: "Gagal memproses file upload." }, { status: 500 });
  }
}
