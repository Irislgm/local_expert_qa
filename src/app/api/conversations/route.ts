import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// GET /api/conversations - 获取对话列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "10");
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("conversations")
      .select("*, knowledge_bases(name)", { count: "exact" });

    if (userId) query = query.eq("user_id", parseInt(userId));

    const { data, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({ data, total: count, page, page_size: pageSize });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/conversations - 创建对话
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { title, user_id, knowledge_base_id } = body;

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        title: title || "新对话",
        user_id,
        knowledge_base_id,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/conversations - 删除对话
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "对话ID不能为空" }, { status: 400 });
    }

    const { error } = await supabase.from("conversations").delete().eq("id", parseInt(id));

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
