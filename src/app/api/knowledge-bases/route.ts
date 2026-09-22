import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { HeaderUtils, EmbeddingClient } from "coze-coding-dev-sdk";

// GET /api/knowledge-bases - 获取知识库列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "10");
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("knowledge_bases").select("*", { count: "exact" });

    if (category) query = query.eq("category", category);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return NextResponse.json({ data, total: count, page, page_size: pageSize });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/knowledge-bases - 创建知识库
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { name, description, category, created_by } = body;

    if (!name) {
      return NextResponse.json({ error: "知识库名称不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("knowledge_bases")
      .insert({ name, description, category, created_by, status: "active" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/knowledge-bases - 更新知识库
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { id, name, description, category, status } = body;

    if (!id) {
      return NextResponse.json({ error: "知识库ID不能为空" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from("knowledge_bases")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/knowledge-bases - 删除知识库
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "知识库ID不能为空" }, { status: 400 });
    }

    const { error } = await supabase.from("knowledge_bases").delete().eq("id", parseInt(id));

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
