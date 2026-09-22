import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 数据看板聚合接口
export async function GET(req: NextRequest) {
  const supabase = getSupabaseClient();

  // 1. 设备状态汇总
  const [devicesRes, alertsRes, telemetryRes, sourcesRes] = await Promise.all([
    supabase.from("devices").select("*"),
    supabase.from("device_telemetry").select("*").eq("status", "alarm"),
    supabase.from("device_telemetry").select("*").order("collected_at", { ascending: false }).limit(200),
    supabase.from("device_sources").select("*"),
  ]);

  const errObj =
    (devicesRes.error || alertsRes.error || telemetryRes.error || sourcesRes.error);
  if (errObj) {
    return NextResponse.json({ error: errObj.message }, { status: 500 });
  }

  const devices = devicesRes.data || [];
  const telemetry = telemetryRes.data || [];

  // 设备状态统计
  const deviceStatus = {
    total: devices.length,
    online: devices.filter((d: any) => d.status === "online").length,
    offline: devices.filter((d: any) => d.status === "offline").length,
    maintenance: devices.filter((d: any) => d.status === "maintenance").length,
  };

  // 告警统计
  const alarmCount = (alertsRes.data || []).length;
  const warningCount = telemetry.filter((t: any) => t.status === "warning").length;
  const normalCount = telemetry.filter((t: any) => t.status === "normal").length;

  // 数据源统计
  const sourceStats = {
    total: (sourcesRes.data || []).length,
    connected: (sourcesRes.data || []).filter((s: any) => s.status === "connected").length,
    active: (sourcesRes.data || []).filter((s: any) => s.status === "active").length,
    failed: (sourcesRes.data || []).filter((s: any) => s.status === "failed").length,
  };

  // 按指标分组生成时间序列
  const metricMap = new Map<string, any[]>();
  for (const t of telemetry) {
    const key = t.metric_key || "unknown";
    if (!metricMap.has(key)) metricMap.set(key, []);
    metricMap.get(key)!.push({
      time: t.collected_at,
      value: t.metric_value,
      status: t.status,
    });
  }

  // 生成图表数据（每个指标最近20个点）
  const charts: any[] = [];
  for (const [key, points] of metricMap) {
    charts.push({ metric: key, data: points.slice(-20).reverse() });
  }

  // 最近告警
  const recentAlerts = (alertsRes.data || [])
    .sort((a: any, b: any) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime())
    .slice(0, 10);

  return NextResponse.json({
    deviceStatus,
    alarmStats: { alarm: alarmCount, warning: warningCount, normal: normalCount },
    sourceStats,
    charts,
    recentAlerts,
  });
}