import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { EmbeddingClient, HeaderUtils } from "coze-coding-dev-sdk";

// 文本分块函数
function splitIntoChunks(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[。！？\n])/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // 保留重叠部分
      const words = currentChunk.split("");
      const overlapText = words.slice(-overlap).join("");
      currentChunk = overlapText + sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// GET /api/knowledge-documents - 获取知识文档列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const knowledgeBaseId = searchParams.get("knowledge_base_id");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("page_size") || "10");
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("knowledge_documents")
      .select("*, knowledge_bases(name)", { count: "exact" });

    if (knowledgeBaseId) query = query.eq("knowledge_base_id", parseInt(knowledgeBaseId));
    if (status) query = query.eq("status", status);

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

// POST /api/knowledge-documents - 创建知识文档并自动向量化
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { knowledge_base_id, title, content, source_type, source_url, created_by } = body;

    if (!knowledge_base_id || !title || !content) {
      return NextResponse.json(
        { error: "知识库ID、标题和内容不能为空" },
        { status: 400 }
      );
    }

    // 创建文档
    const { data: doc, error: docError } = await supabase
      .from("knowledge_documents")
      .insert({
        knowledge_base_id,
        title,
        content,
        source_type: source_type || "text",
        source_url,
        word_count: content.length,
        status: "processing",
        created_by,
      })
      .select()
      .single();

    if (docError) throw docError;

    // 文本分块
    const chunks = splitIntoChunks(content);

    // 生成向量嵌入
    const embeddingClient = new EmbeddingClient();

    const chunkRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embeddingClient.embedText(chunks[i], { dimensions: 1024 });
      chunkRecords.push({
        document_id: doc.id,
        chunk_index: i,
        content: chunks[i],
        embedding: JSON.stringify(embedding),
        token_count: chunks[i].length,
      });
    }

    // 批量插入分块
    if (chunkRecords.length > 0) {
      const { error: chunkError } = await supabase
        .from("knowledge_chunks")
        .insert(chunkRecords);

      if (chunkError) throw chunkError;
    }

    // 更新文档状态和统计
    await supabase
      .from("knowledge_documents")
      .update({
        status: "processed",
        chunk_count: chunks.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", doc.id);

    // 更新知识库统计
    const { count: docCount } = await supabase
      .from("knowledge_documents")
      .select("*", { count: "exact", head: true })
      .eq("knowledge_base_id", knowledge_base_id);

    const { count: chunkCount } = await supabase
      .from("knowledge_chunks")
      .select("*", { count: "exact", head: true })
      .in(
        "document_id",
        (
          await supabase
            .from("knowledge_documents")
            .select("id")
            .eq("knowledge_base_id", knowledge_base_id)
        ).data?.map((d: { id: number }) => d.id) || []
      );

    await supabase
      .from("knowledge_bases")
      .update({
        document_count: docCount || 0,
        chunk_count: chunkCount || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", knowledge_base_id);

    return NextResponse.json({ ...doc, chunk_count: chunks.length }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/knowledge-documents - 删除知识文档
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "文档ID不能为空" }, { status: 400 });
    }

    // 获取文档信息以更新知识库统计
    const { data: doc } = await supabase
      .from("knowledge_documents")
      .select("knowledge_base_id")
      .eq("id", parseInt(id))
      .single();

    // 删除文档（级联删除分块）
    const { error } = await supabase.from("knowledge_documents").delete().eq("id", parseInt(id));

    if (error) throw error;

    // 更新知识库统计
    if (doc) {
      const { count: docCount } = await supabase
        .from("knowledge_documents")
        .select("*", { count: "exact", head: true })
        .eq("knowledge_base_id", doc.knowledge_base_id);

      await supabase
        .from("knowledge_bases")
        .update({
          document_count: docCount || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", doc.knowledge_base_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
