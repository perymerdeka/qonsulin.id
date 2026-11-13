import { NextRequest, NextResponse } from "next/server";
import { adminCookieName, verifyAdminSessionValue } from "@/lib/server/admin-auth";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

function authorized(request: NextRequest) {
  return verifyAdminSessionValue(request.cookies.get(adminCookieName)?.value);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdminClient() as any;
  if (!supabase) return NextResponse.json({ ok: false, message: "Supabase admin tidak tersedia." }, { status: 500 });
  const { data, error } = await supabase.from("letter_templates")
    .select("id, code, name, paper_style, wax_seal_color, tier_required, is_active, sort_order")
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, templates: data || [] });
}

export async function PATCH(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { id?: string; name?: string; tier_required?: string; sort_order?: number; is_active?: boolean };
  if (!body.id || typeof body.name !== "string" || body.name.trim().length < 2 || body.name.length > 80 ||
      !["free", "premium"].includes(body.tier_required || "") || typeof body.sort_order !== "number" || !Number.isInteger(body.sort_order) ||
      body.sort_order < 0 || body.sort_order > 999 || typeof body.is_active !== "boolean") {
    return NextResponse.json({ ok: false, message: "Data template tidak valid." }, { status: 400 });
  }
  const supabase = getSupabaseAdminClient() as any;
  if (!supabase) return NextResponse.json({ ok: false, message: "Supabase admin tidak tersedia." }, { status: 500 });
  const { data, error } = await supabase.from("letter_templates")
    .update({ name: body.name.trim(), tier_required: body.tier_required, sort_order: body.sort_order, is_active: body.is_active })
    .eq("id", body.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ ok: false, message: "Template tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ ok: true, message: "Template diperbarui." });
}