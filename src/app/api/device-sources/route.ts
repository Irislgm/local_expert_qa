import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { z } from "zod";

const sourceSchema = z.object({
  name: z.string().min(1),
  db_type: z.string().optional().default("postgres"),
  host: z.string().optional(),
  port: z.number().optional().default(5432),
  database_name: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  status: z.string().optional().default("inactive"),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("page_size") || "10");
  const start = (page - 1) * pageSize;
  const supabase = getSupabaseClient();

  const { data, error, count } = await supabase
    .from("device_sources")
    .select("*", { count: "exact" })
    .order("id", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [], total: count || 0, page, page_size: pageSize });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = sourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("device_sources")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();
  const parsed = sourceSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("device_sources")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("device_sources").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}