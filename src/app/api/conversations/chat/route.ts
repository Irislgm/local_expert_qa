import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { LLMClient, EmbeddingClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// 向量相似度搜索
async function searchKnowledge(
  query: string,
  knowledgeBaseId: number,
  topK: number = 3
): Promise<string[]> {
  const supabase = getSupabaseClient();
  const embeddingClient = new EmbeddingClient();

  // 生成查询向量
  const queryEmbedding = await embeddingClient.embedText(query, { dimensions: 1024 });

  // 获取知识库中的文档ID
  const { data: docs } = await supabase
    .from("knowledge_documents")
    .select("id")
    .eq("knowledge_base_id", knowledgeBaseId)
    .eq("status", "processed");

  if (!docs || docs.length === 0) return [];

  const docIds = docs.map((d: { id: number }) => d.id);

  // 使用 pgvector 进行相似度搜索
  const { data: chunks } = await supabase.rpc("match_knowledge_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_document_ids: docIds,
    match_count: topK,
  });

  if (!chunks) return [];

  return chunks.map((c: { content: string }) => c.content);
}

// POST /api/conversations/chat - 对话（流式响应）
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { conversation_id, message, knowledge_base_id } = body;

    if (!conversation_id || !message) {
      return NextResponse.json(
        { error: "对话ID和消息内容不能为空" },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);

    // 保存用户消息
    const { data: userMsg, error: userMsgError } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id,
        role: "user",
        content: message,
        token_count: message.length,
      })
      .select()
      .single();

    if (userMsgError) throw userMsgError;

    // RAG 检索相关知识
    let context = "";
    if (knowledge_base_id) {
      const relevantChunks = await searchKnowledge(
        message,
        knowledge_base_id,
        3
      );
      if (relevantChunks.length > 0) {
        context = relevantChunks.join("\n\n---\n\n");
      }
    }

    // 获取历史消息
    const { data: history } = await supabase
      .from("conversation_messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(10);

    // 构建系统提示
    const systemPrompt = context
      ? `你是智慧园区的AI安全专家助手。请根据以下知识库内容回答用户的问题。如果知识库内容不足以回答问题，请说明并给出一般性建议。

## 参考知识库内容：
${context}

## 回答要求：
1. 优先使用知识库中的信息
2. 回答要专业、准确、简洁
3. 涉及安全问题时，强调安全第一
4. 必要时给出具体的操作步骤`
      : `你是智慧园区的AI安全专家助手。请根据专业知识回答用户关于园区安全、应急管理、设备维护等方面的问题。回答要专业、准确、简洁。`;

    // 构建消息列表
    interface ChatMessage {
      role: "system" | "user" | "assistant";
      content: string;
    }
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    if (history) {
      for (const msg of history) {
        messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
      }
    }

    // 调用 LLM 生成回复（流式）
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const stream = client.stream(messages, {
      model: "doubao-seed-2-0-mini-260215",
      temperature: 0.7,
    });

    // 收集完整回复
    let fullResponse = "";
    const encoder = new TextEncoder();

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullResponse += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
              );
            }
          }

          // 保存助手回复
          await supabase.from("conversation_messages").insert({
            conversation_id,
            role: "assistant",
            content: fullResponse,
            metadata: context ? { has_context: true } : {},
            token_count: fullResponse.length,
          });

          // 更新对话统计
          const { count } = await supabase
            .from("conversation_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conversation_id);

          await supabase
            .from("conversations")
            .update({
              message_count: count || 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversation_id);

          // 更新对话标题（如果是第一条消息）
          if ((count || 0) <= 2) {
            await supabase
              .from("conversations")
              .update({ title: message.slice(0, 50) })
              .eq("id", conversation_id);
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/conversations/chat/messages - 获取对话消息
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");

    if (!conversationId) {
      return NextResponse.json({ error: "对话ID不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", parseInt(conversationId))
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
