"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, ArrowLeft, FileText } from "lucide-react";

interface Document {
  id: number;
  title: string;
  content: string;
  word_count: number;
  chunk_count: number;
  status: string;
  created_at: string;
  knowledge_bases?: { name: string };
}

interface KnowledgeBase {
  id: number;
  name: string;
}

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const knowledgeBaseId = searchParams.get("id");

  const [documents, setDocuments] = useState<Document[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", content: "" });
  const [adding, setAdding] = useState(false);

  const fetchDocuments = async () => {
    if (!knowledgeBaseId) return;
    setLoading(true);
    const res = await fetch(`/api/knowledge-documents?knowledge_base_id=${knowledgeBaseId}`);
    const data = await res.json();
    setDocuments(data.data || []);
    setLoading(false);
  };

  const fetchKnowledgeBase = async () => {
    const res = await fetch("/api/knowledge-bases");
    const data = await res.json();
    const kb = data.data?.find((k: KnowledgeBase) => k.id === parseInt(knowledgeBaseId || "0"));
    setKnowledgeBase(kb || null);
  };

  useEffect(() => {
    fetchDocuments();
    fetchKnowledgeBase();
  }, [knowledgeBaseId]);

  const handleAdd = async () => {
    if (!newDoc.title || !newDoc.content) return;
    setAdding(true);
    await fetch("/api/knowledge-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        knowledge_base_id: parseInt(knowledgeBaseId || "0"),
        title: newDoc.title,
        content: newDoc.content,
        source_type: "text",
      }),
    });
    setNewDoc({ title: "", content: "" });
    setShowAddDialog(false);
    setAdding(false);
    fetchDocuments();
    fetchKnowledgeBase();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个文档吗？")) return;
    await fetch(`/api/knowledge-documents?id=${id}`, { method: "DELETE" });
    fetchDocuments();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/knowledge")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{knowledgeBase?.name || "知识文档"}</h1>
          <p className="text-slate-500 mt-1">管理知识库中的文档，文档将自动进行向量化处理</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            添加文档
          </Button>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>添加知识文档</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">标题</label>
                <Input
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  placeholder="请输入文档标题"
                />
              </div>
              <div>
                <label className="text-sm font-medium">内容</label>
                <Textarea
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                  placeholder="请输入文档内容，系统将自动进行分块和向量化处理"
                  rows={12}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleAdd} disabled={adding}>
                  {adding ? "处理中..." : "添加并处理"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>文档标题</TableHead>
              <TableHead>字数</TableHead>
              <TableHead>分块数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  加载中...
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  暂无文档，点击上方按钮添加
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {doc.title}
                    </div>
                  </TableCell>
                  <TableCell>{doc.word_count}</TableCell>
                  <TableCell>{doc.chunk_count}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        doc.status === "processed"
                          ? "default"
                          : doc.status === "processing"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {doc.status === "processed"
                        ? "已处理"
                        : doc.status === "processing"
                        ? "处理中"
                        : doc.status === "failed"
                        ? "失败"
                        : "待处理"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
