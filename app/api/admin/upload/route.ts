import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import fs from "node:fs";
import path from "node:path";

const BUCKET_NAME = "media";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, message: "File tidak ditemukan" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
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
          contentType: file.type,
          upsert: true
        });

        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
          return NextResponse.json({ ok: true, url: publicUrl });
        }
      } catch (err) {
        console.warn("Supabase storage upload failed, using local fallback:", err);
      }
    }

    // Local file storage fallback for local testing
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({ ok: true, url: `/uploads/${filename}`, isLocal: true });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ ok: false, message: error?.message || "Gagal upload" }, { status: 500 });
  }
}
