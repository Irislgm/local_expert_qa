"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Plus, MessageSquare, Trash2, Bot, User } from "lucide-react";

interface Conversation {
  id: number;
  title: string;
  message_count: number;
  knowledge_base_id: number | null;
  knowledge_bases?: { name: string } | null;
  created_at: string;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface KnowledgeBase {
  id: number;
  name: string;
}

export default function ExpertChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    setConversations(data.data || []);
  };

  const fetchKnowledgeBases = async () => {
    const res = await fetch("/api/knowledge-bases");
    const data = await res.json();
    setKnowledgeBases(data.data || []);
  };

  const fetchMessages = async (conversationId: number) => {
    const res = await fetch(`/api/conversations/chat/messages?conversation_id=${conversationId}`);
    const data = await res.json();
    setMessages(data || []);
  };

  useEffect(() => {
    fetchConversations();
    fetchKnowledgeBases();
  }, []);

  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation.id);
    }
  }, [currentConversation]);

  const createConversation = async () => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "新对话",
        knowledge_base_id: selectedKB ? parseInt(selectedKB) : null,
      }),
    });
    const data = await res.json();
    setCurrentConversation(data);
    setMessages([]);
    fetchConversations();
  };

  const deleteConversation = async (id: number) => {
    if (!confirm("确定要删除这个对话吗？")) return;
    await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
    if (currentConversation?.id === id) {
      setCurrentConversation(null);
      setMessages([]);
    }
    fetchConversations();
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    let conv = currentConversation;
    if (!conv) {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.slice(0, 50),
          knowledge_base_id: selectedKB ? parseInt(selectedKB) : null,
        }),
      });
      conv = await res.json();
      setCurrentConversation(conv);
      fetchConversations();
    }

    if (!conv) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/conversations/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conv.id,
          message: input,
          knowledge_base_id: conv.knowledge_base_id || (selectedKB ? parseInt(selectedKB) : null),
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  assistantContent += parsed.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id ? { ...m, content: assistantContent } : m
                    )
                  );
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* 左侧对话列表 */}
      <div className="w-72 bg-white rounded-lg border shadow-sm flex flex-col">
        <div className="p-4 border-b">
          <div className="mb-3">
            <label className="text-xs text-slate-500 mb-1 block">选择知识库</label>
            <Select value={selectedKB} onValueChange={setSelectedKB}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="通用模式（无知识库）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">通用模式（无知识库）</SelectItem>
                {knowledgeBases.map((kb) => (
                  <SelectItem key={kb.id} value={kb.id.toString()}>
                    {kb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={createConversation}>
            <Plus className="w-4 h-4 mr-2" />
            新建对话
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">暂无对话</div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer mb-1 ${
                  currentConversation?.id === conv.id
                    ? "bg-blue-50 border border-blue-200"
                    : "hover:bg-slate-50"
                }`}
                onClick={() => setCurrentConversation(conv)}
              >
                <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{conv.title}</div>
                  <div className="text-xs text-slate-400">{conv.message_count} 条消息</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="w-3 h-3 text-slate-400" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧对话区域 */}
      <div className="flex-1 bg-white rounded-lg border shadow-sm flex flex-col">
        {!currentConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Bot className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600">AI 随身专家</h3>
              <p className="text-slate-400 mt-2">选择知识库并创建对话开始咨询</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-medium">{currentConversation.title}</h3>
                {currentConversation.knowledge_bases && (
                  <Badge variant="outline" className="mt-1">
                    {currentConversation.knowledge_bases.name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入您的问题..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={sending}
                />
                <Button onClick={sendMessage} disabled={sending || !input.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
