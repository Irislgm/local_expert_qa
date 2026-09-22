import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { z } from "zod";

const mappingSchema = z.object({
  device_source_id: z.number().min(1),
  device_id: z.number().optional(),
  source_metric: z.string().min(1),
  source_table: z.string().optional(),
  metric_name: z.string().min(1),
  metric_unit: z.string().optional(),
  metric_type: z.string().optional().default("value"),
  transform_rule: z.string().optional(),
  alarm_threshold: z.number().optional(),
  alarm_operator: z.string().optional().default(">"),
  is_active: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get("source_id");
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("page_size") || "20");
  const start = (page - 1) * pageSize;
  const supabase = getSupabaseClient();

  let query = supabase.from("metric_mappings").select("*", { count: "exact" });
  if (sourceId) query = query.eq("device_source_id", sourceId);

  const { data, error, count } = await query
    .order("id", { ascending: false })
    .range(start, start + pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [], total: count || 0, page, page_size: pageSize });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = mappingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("metric_mappings")
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
  const parsed = mappingSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("metric_mappings")
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
  const { error } = await supabase.from("metric_mappings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}