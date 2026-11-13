import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, verifyAdminSessionValue } from "@/lib/server/admin-auth";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

function authorized(request: NextRequest) {
  return verifyAdminSessionValue(request.cookies.get(adminCookieName)?.value);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { type?: string; id?: string; action?: string; note?: string };
  if (!body.id || !body.type || !body.action) {
    return NextResponse.json({ ok: false, message: "Data review tidak lengkap." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;
  if (!supabase) return NextResponse.json({ ok: false, message: "Supabase admin tidak tersedia." }, { status: 500 });

  if (body.type === "order") {
    if (body.action === "activate") {
      const { data, error } = await supabase.rpc("activate_package_order", { target_order_id: body.id });
      if (error || !data?.ok) return NextResponse.json({ ok: false, message: error?.message || data?.message || "Pesanan gagal diaktifkan." }, { status: 400 });
      return NextResponse.json({ ok: true, message: data.message });
    }
    if (body.action === "reject") {
      const { data, error } = await supabase.from("package_orders").update({ status: "rejected", notes: body.note || "Ditolak admin" }).eq("id", body.id).eq("status", "pending").select("id").maybeSingle();
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
      if (!data) return NextResponse.json({ ok: false, message: "Pesanan tidak ditemukan atau sudah diproses." }, { status: 409 });
      return NextResponse.json({ ok: true, message: "Pesanan ditolak." });
    }
  }

  if (body.type === "letter") {
    const { data: letter, error: letterError } = await supabase
      .from("letters")
      .select("id, letter_threads!inner(delivery_mode)")
      .eq("id", body.id)
      .maybeSingle();
    if (letterError) return NextResponse.json({ ok: false, message: letterError.message }, { status: 400 });
    if (!letter || (Array.isArray(letter.letter_threads) ? letter.letter_threads[0] : letter.letter_threads)?.delivery_mode !== "public") {
      return NextResponse.json({ ok: false, message: "Surat privat ditangani melalui Inbox Penanganan, bukan Moderasi Surat." }, { status: 409 });
    }

    const statusByAction: Record<string, string> = { approve: "approved", reject: "rejected" };
    const moderationStatus = statusByAction[body.action];
    if (!moderationStatus) return NextResponse.json({ ok: false, message: "Tindakan moderasi tidak dikenal." }, { status: 400 });
    const { data, error } = await supabase.from("letters").update({ moderation_status: moderationStatus, reviewed_at: new Date().toISOString(), review_note: body.note || null }).eq("id", body.id).in("moderation_status", body.action === "approve" ? ["pending"] : ["pending", "crisis_hold", "approved"]).select("id").maybeSingle();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ ok: false, message: "Surat tidak ditemukan, sudah diproses, atau memerlukan penanganan khusus." }, { status: 409 });
    return NextResponse.json({ ok: true, message: moderationStatus === "approved" ? "Surat disetujui dan tampil di Kolam Surat." : "Surat ditolak dari Kolam Surat." });
  }

  return NextResponse.json({ ok: false, message: "Tindakan tidak didukung." }, { status: 400 });
}
