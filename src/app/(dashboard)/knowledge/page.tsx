"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, BookOpen, FileText, Trash2, Edit } from "lucide-react";
import Link from "next/link";

interface KnowledgeBase {
  id: number;
  name: string;
  description: string | null;
  category: string;
  document_count: number;
  chunk_count: number;
  status: string;
  created_at: string;
}

const categories = [
  { value: "fire_safety", label: "火灾安全" },
  { value: "equipment", label: "设备维护" },
  { value: "safety", label: "安全管理" },
  { value: "other", label: "其他" },
];

const categoryColors: Record<string, string> = {
  fire_safety: "bg-red-100 text-red-700",
  equipment: "bg-blue-100 text-blue-700",
  safety: "bg-green-100 text-green-700",
  other: "bg-gray-100 text-gray-700",
};

export default function KnowledgeBasePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newKB, setNewKB] = useState({ name: "", description: "", category: "fire_safety" });

  const fetchKnowledgeBases = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);

    const res = await fetch(`/api/knowledge-bases?${params}`);
    const data = await res.json();
    setKnowledgeBases(data.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchKnowledgeBases();
  }, [search, category]);

  const handleAdd = async () => {
    if (!newKB.name) return;
    await fetch("/api/knowledge-bases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newKB),
    });
    setNewKB({ name: "", description: "", category: "fire_safety" });
    setShowAddDialog(false);
    fetchKnowledgeBases();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个知识库吗？")) return;
    await fetch(`/api/knowledge-bases?id=${id}`, { method: "DELETE" });
    fetchKnowledgeBases();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">知识库管理</h1>
          <p className="text-slate-500 mt-1">管理火灾应急知识库，支持文档向量化存储</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建知识库
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建知识库</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">名称</label>
                <Input
                  value={newKB.name}
                  onChange={(e) => setNewKB({ ...newKB, name: e.target.value })}
                  placeholder="请输入知识库名称"
                />
              </div>
              <div>
                <label className="text-sm font-medium">描述</label>
                <Input
                  value={newKB.description}
                  onChange={(e) => setNewKB({ ...newKB, description: e.target.value })}
                  placeholder="请输入知识库描述"
                />
              </div>
              <div>
                <label className="text-sm font-medium">分类</label>
                <Select
                  value={newKB.category}
                  onValueChange={(value) => setNewKB({ ...newKB, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleAdd}>创建</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索知识库..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>知识库名称</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>文档数</TableHead>
              <TableHead>分块数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  加载中...
                </TableCell>
              </TableRow>
            ) : knowledgeBases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  暂无知识库
                </TableCell>
              </TableRow>
            ) : (
              knowledgeBases.map((kb) => (
                <TableRow key={kb.id}>
                  <TableCell className="font-medium">
                    <Link href={`/knowledge-base/documents?id=${kb.id}`} className="hover:text-blue-600 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      {kb.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={categoryColors[kb.category] || "bg-gray-100 text-gray-700"}>
                      {categories.find((c) => c.value === kb.category)?.label || kb.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{kb.document_count}</TableCell>
                  <TableCell>{kb.chunk_count}</TableCell>
                  <TableCell>
                    <Badge variant={kb.status === "active" ? "default" : "secondary"}>
                      {kb.status === "active" ? "启用" : "禁用"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(kb.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(kb.id)}>
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
