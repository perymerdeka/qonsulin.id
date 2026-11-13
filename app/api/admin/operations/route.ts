import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, getAdminSession } from "@/lib/server/admin-auth";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

const handlingStatuses = ["waiting", "assigned", "in_progress", "completed", "needs_attention"] as const;

function getSession(request: NextRequest) {
  return getAdminSession(request.cookies.get(adminCookieName)?.value);
}

function isOperator(role: string) {
  return role === "admin" || role === "moderator";
}

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session || !isOperator(session.role)) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdminClient() as any;
  if (!supabase) return NextResponse.json({ ok: false, message: "Supabase admin tidak tersedia." }, { status: 500 });

  const [threads, companions, members, reports] = await Promise.all([
    supabase
      .from("letter_threads")
      .select("id, author_id, topic, special_destination, handling_status, assigned_companion_id, assigned_at, created_at, letters!inner(id, title, content, template_code, created_at, is_opening)")
      .eq("delivery_mode", "special")
      .eq("letters.is_opening", true)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("companions").select("id, name, role, badge, status").order("sort_order", { ascending: true }),
    supabase.from("member_profiles").select("id, alias").limit(500),
    session.role === "admin"
      ? supabase.from("letter_reports").select("id, thread_id, reporter_id, reason, status, created_at, reviewed_at").order("created_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null })
  ]);

  const failure = threads.error || companions.error || members.error || (reports as any).error;
  if (failure) return NextResponse.json({ ok: false, message: failure.message || "Data operasi tidak dapat dimuat." }, { status: 500 });

  const specialLetters = (threads.data || []).map((thread: any) => ({
    ...thread,
    opening_letter: Array.isArray(thread.letters) ? thread.letters.find((letter: any) => letter.is_opening) || thread.letters[0] : thread.letters
  }));

  return NextResponse.json({ ok: true, specialLetters, companions: companions.data || [], members: members.data || [], reports: (reports as any).data || [] });
}

export async function PATCH(request: NextRequest) {
  const session = getSession(request);
  if (!session || !isOperator(session.role)) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    type?: "special-letter" | "report";
    id?: string;
    handling_status?: string;
    assigned_companion_id?: string | null;
    operator_response?: string | null;
    status?: string;
  };
  if (!body.type || !body.id) return NextResponse.json({ ok: false, message: "Data tindakan tidak lengkap." }, { status: 400 });

  const supabase = getSupabaseAdminClient() as any;
  if (!supabase) return NextResponse.json({ ok: false, message: "Supabase admin tidak tersedia." }, { status: 500 });

  if (body.type === "special-letter") {
    if (!body.handling_status || !handlingStatuses.includes(body.handling_status as typeof handlingStatuses[number])) {
      return NextResponse.json({ ok: false, message: "Status penanganan tidak valid." }, { status: 400 });
    }
    const response = body.operator_response?.trim() || null;
    if (response && (response.length < 10 || response.length > 3000)) {
      return NextResponse.json({ ok: false, message: "Balasan member harus 10-3000 karakter." }, { status: 400 });
    }
    const { data, error } = await supabase.rpc("admin_handle_special_letter", {
      p_thread_id: body.id,
      p_status: body.handling_status,
      p_companion_id: body.assigned_companion_id || null,
      p_response: response
    });
    if (error || !data?.ok) return NextResponse.json({ ok: false, message: error?.message || data?.message || "Penanganan surat belum tersimpan." }, { status: 400 });
    return NextResponse.json({ ok: true, message: response ? "Penanganan dan balasan surat privat diperbarui." : "Penanganan surat privat diperbarui." });
  }

  if (body.type === "report") {
    if (session.role !== "admin") return NextResponse.json({ ok: false, message: "Akses ditolak." }, { status: 403 });
    const allowed = ["open", "reviewed", "resolved", "dismissed"];
    if (!body.status || !allowed.includes(body.status)) return NextResponse.json({ ok: false, message: "Status laporan tidak valid." }, { status: 400 });
    const update = body.status === "open" ? { status: body.status } : { status: body.status, reviewed_at: new Date().toISOString() };
    const { data, error } = await supabase.from("letter_reports").update(update).eq("id", body.id).select("id").maybeSingle();
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ ok: false, message: "Laporan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, message: "Status laporan diperbarui." });
  }

  return NextResponse.json({ ok: false, message: "Tipe operasi tidak valid." }, { status: 400 });
}
