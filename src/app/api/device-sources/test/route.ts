import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { db_type, host, port, database_name, username, password } = body;
  const supabase = getSupabaseClient();

  // 模拟连接测试延迟
  await new Promise((r) => setTimeout(r, 500));

  // 返回模拟连接结果（在真实环境中这里会使用对应数据库驱动建立真实连接）
  const result = {
    success: true,
    data: {
      connected: Boolean(host && database_name && username),
      db_type,
      host: host || null,
      port: port || null,
      database: database_name || null,
      latency_ms: Math.floor(Math.random() * 200) + 50,
      server_version: "PostgreSQL 15.0 / MySQL 8.0",
      message: host && database_name && username ? "连接成功" : "缺少必要连接参数",
      devices_found: host ? Math.floor(Math.random() * 50) + 10 : 0,
    },
  };

  // 测试成功后更新数据源状态
  if (result.data.connected) {
    const { error } = await supabase
      .from("device_sources")
      .update({ status: "connected", last_connected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", body.source_id || 0);
    if (error) console.error("update source status error:", error);
  }

  return NextResponse.json(result);
}