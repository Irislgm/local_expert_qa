import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取设备遥测数据（带模拟实时数据）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("device_id");
  const metric = searchParams.get("metric") || "";
  const hours = parseInt(searchParams.get("hours") || "24");
  const limit = parseInt(searchParams.get("limit") || "50");
  const supabase = getSupabaseClient();

  let query = supabase.from("device_telemetry").select("*");
  if (deviceId) query = query.eq("device_id", deviceId);
  if (metric) query = query.eq("metric_key", metric);

  const { data, error } = await query
    .gte("collected_at", new Date(Date.now() - hours * 3600 * 1000).toISOString())
    .order("collected_at", { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

// 上报遥测数据
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { device_id, metric_key, metric_value, metric_unit, status } = body;

  if (!device_id || !metric_key || metric_value === undefined) {
    return NextResponse.json({ error: "device_id, metric_key, metric_value 为必填项" }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("device_telemetry")
    .insert({
      device_id,
      metric_key,
      metric_value,
      metric_unit: metric_unit || null,
      status: status || "normal",
      collected_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}