"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Cable, RefreshCw, Database as DatabaseIcon, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Source {
  id: number;
  name: string;
  db_type: string;
  host: string | null;
  port: number | null;
  database_name: string | null;
  username: string | null;
  password: string | null;
  status: string;
  last_connected_at: string | null;
}

const statusMap: Record<string, { label: string; cls: string }> = {
  connected: { label: "已连接", cls: "bg-green-100 text-green-700" },
  active: { label: "已配置", cls: "bg-blue-100 text-blue-700" },
  inactive: { label: "未激活", cls: "bg-gray-100 text-gray-600" },
  failed: { label: "连接失败", cls: "bg-red-100 text-red-600" },
};

export default function DeviceSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [form, setForm] = useState({
    name: "",
    db_type: "postgres",
    host: "",
    port: 5432,
    database_name: "",
    username: "",
    password: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/device-sources");
      const data = await res.json();
      setSources(data.data || []);
    } catch (e) {
      console.error("fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/device-sources?id=${editing.id}` : "/api/device-sources";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setDialogOpen(false);
      setEditing(null);
      setForm({ name: "", db_type: "postgres", host: "", port: 5432, database_name: "", username: "", password: "" });
      fetchData();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该数据源配置？")) return;
    const res = await fetch(`/api/device-sources?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchData();
  };

  const handleTest = async (s: Source) => {
    setTestingId(s.id);
    setTestResult(null);
    try {
      const res = await fetch("/api/device-sources/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_id: s.id,
          db_type: s.db_type,
          host: s.host,
          port: s.port,
          database_name: s.database_name,
          username: s.username,
          password: s.password,
        }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.data?.message || (data.success ? "连接成功" : "连接失败"),
      });
      fetchData();
    } catch (e) {
      setTestResult({ success: false, message: "连接测试失败" });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">设备数据源</h1>
          <p className="mt-1 text-sm text-slate-500">配置设备数据库直连信息，用于接入园区各类物联网平台</p>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ name: "", db_type: "postgres", host: "", port: 5432, database_name: "", username: "", password: "" }); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> 新增数据源
        </Button>
      </div>

      {testResult && (
        <div className={`flex items-center gap-2 rounded-md border p-3 text-sm ${testResult.success ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {testResult.message}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">名称</th>
                  <th className="px-6 py-3">数据库类型</th>
                  <th className="px-6 py-3">连接信息</th>
                  <th className="px-6 py-3">状态</th>
                  <th className="px-6 py-3">上次连接</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">加载中...</td></tr>
                ) : sources.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">暂无数据源配置</td></tr>
                ) : (
                  sources.map((s) => (
                    <tr key={s.id} className="border-b hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="uppercase">{s.db_type}</Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <DatabaseIcon className="h-3.5 w-3.5 text-slate-400" />
                          {s.host || "-"}:{s.port || "-"}
                          <span className="text-slate-400">/</span>{s.database_name || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={statusMap[s.status]?.cls || statusMap.inactive.cls}>
                          {statusMap[s.status]?.label || s.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{s.last_connected_at ? new Date(s.last_connected_at).toLocaleString() : "-"}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => handleTest(s)} disabled={testingId === s.id}>
                            {testingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cable className="h-3.5 w-3.5" />}
                            <span className="ml-1">测试</span>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setEditing(s); setForm({ name: s.name, db_type: s.db_type, host: s.host || "", port: s.port || 5432, database_name: s.database_name || "", username: s.username || "", password: s.password || "" }); setDialogOpen(true); }}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑数据源" : "新增数据源"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>数据源名称</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="如：园区消防物联网平台" />
            </div>
            <div>
              <Label>数据库类型</Label>
              <Select value={form.db_type} onValueChange={(v) => setForm({ ...form, db_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="sqlserver">SQL Server</SelectItem>
                  <SelectItem value="oracle">Oracle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>主机地址</Label>
                <Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="10.0.0.100" />
              </div>
              <div>
                <Label>端口</Label>
                <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>数据库名</Label>
              <Input value={form.database_name} onChange={(e) => setForm({ ...form, database_name: e.target.value })} placeholder="fire_iot" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>用户名</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="iot_user" />
              </div>
              <div>
                <Label>密码</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="********" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave}>{editing ? "保存修改" : "创建"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}