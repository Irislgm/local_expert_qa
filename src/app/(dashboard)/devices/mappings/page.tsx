"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

interface Mapping {
  id: number;
  device_source_id: number;
  device_id: number | null;
  source_metric: string;
  source_table: string | null;
  metric_name: string;
  metric_unit: string | null;
  metric_type: string;
  transform_rule: string | null;
  alarm_threshold: number | null;
  alarm_operator: string | null;
  is_active: boolean;
}

interface Source { id: number; name: string; }
interface Device { id: number; source_id: number | null; device_name: string; device_code: string; }

export default function MetricMappingsPage() {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Mapping | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [form, setForm] = useState({
    device_source_id: 0,
    device_id: 0,
    source_metric: "",
    source_table: "",
    metric_name: "",
    metric_unit: "",
    metric_type: "value",
    transform_rule: "",
    alarm_threshold: "",
    alarm_operator: ">",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = selectedSource && selectedSource !== "all" ? `?source_id=${selectedSource}` : "";
      const [mapRes, srcRes, devRes] = await Promise.all([
        fetch(`/api/metric-mappings${qs}`),
        fetch("/api/device-sources"),
        fetch("/api/devices?page_size=100"),
      ]);
      const mapData = await mapRes.json();
      const srcData = await srcRes.json();
      const devData = await devRes.json();
      setMappings(mapData.data || []);
      setSources(srcData.data || []);
      setDevices(devData.data || []);
    } catch (e) {
      console.error("fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, [selectedSource]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    const payload = {
      ...form,
      device_source_id: Number(form.device_source_id),
      device_id: form.device_id ? Number(form.device_id) : null,
      alarm_threshold: form.alarm_threshold ? Number(form.alarm_threshold) : null,
    };
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/metric-mappings?id=${editing.id}` : "/api/metric-mappings";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setDialogOpen(false);
      setEditing(null);
      setForm({ device_source_id: 0, device_id: 0, source_metric: "", source_table: "", metric_name: "", metric_unit: "", metric_type: "value", transform_rule: "", alarm_threshold: "", alarm_operator: ">" });
      fetchData();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该指标映射？")) return;
    const res = await fetch(`/api/metric-mappings?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchData();
  };

  const typeMap: Record<string, { label: string; cls: string }> = {
    value: { label: "数值", cls: "bg-blue-100 text-blue-700" },
    counter: { label: "计数", cls: "bg-amber-100 text-amber-700" },
    status: { label: "状态", cls: "bg-purple-100 text-purple-700" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">指标映射</h1>
          <p className="mt-1 text-sm text-slate-500">将设备数据源的原始指标映射为业务可用指标</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="全部数据源" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部数据源</SelectItem>
              {sources.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditing(null); setForm({ device_source_id: 0, device_id: 0, source_metric: "", source_table: "", metric_name: "", metric_unit: "", metric_type: "value", transform_rule: "", alarm_threshold: "", alarm_operator: ">" }); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> 新增映射
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">数据源</th>
                  <th className="px-6 py-3">设备</th>
                  <th className="px-6 py-3">源指标</th>
                  <th className="px-6 py-3">业务指标</th>
                  <th className="px-6 py-3">类型</th>
                  <th className="px-6 py-3">告警阈值</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">加载中...</td></tr>
                ) : mappings.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">暂无指标映射</td></tr>
                ) : (
                  mappings.map((m) => {
                    const src = sources.find((s) => s.id === m.device_source_id);
                    const dev = devices.find((d) => d.id === m.device_id);
                    return (
                      <tr key={m.id} className="border-b hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{src?.name || `#${m.device_source_id}`}</td>
                        <td className="px-6 py-4 text-slate-600">{dev ? `${dev.device_name} (${dev.device_code})` : "-"}</td>
                        <td className="px-6 py-4">
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{m.source_metric}</code>
                          {m.source_table && <div className="mt-0.5 text-xs text-slate-400">{m.source_table}</div>}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {m.metric_name}
                          {m.metric_unit && <span className="ml-1 text-xs text-slate-400">({m.metric_unit})</span>}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={typeMap[m.metric_type]?.cls || "bg-gray-100 text-gray-600"}>
                            {typeMap[m.metric_type]?.label || m.metric_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {m.alarm_threshold !== null && m.alarm_threshold !== undefined
                            ? <span>{m.alarm_operator === ">" ? ">" : m.alarm_operator === "<" ? "<" : m.alarm_operator} {m.alarm_threshold} {m.metric_unit || ""}</span>
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => {
                              setEditing(m);
                              setForm({
                                device_source_id: m.device_source_id,
                                device_id: m.device_id || 0,
                                source_metric: m.source_metric,
                                source_table: m.source_table || "",
                                metric_name: m.metric_name,
                                metric_unit: m.metric_unit || "",
                                metric_type: m.metric_type,
                                transform_rule: m.transform_rule || "",
                                alarm_threshold: m.alarm_threshold !== null ? String(m.alarm_threshold) : "",
                                alarm_operator: m.alarm_operator || ">",
                              });
                              setDialogOpen(true);
                            }}>编辑</Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(m.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑指标映射" : "新增指标映射"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>数据源</Label>
                <Select value={String(form.device_source_id)} onValueChange={(v) => setForm({ ...form, device_source_id: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="选择数据源" /></SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>设备</Label>
                <Select value={String(form.device_id || 0)} onValueChange={(v) => setForm({ ...form, device_id: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="选择设备(可选)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">不指定</SelectItem>
                    {devices.filter((d) => !form.device_source_id || d.source_id === form.device_source_id).map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.device_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>源指标字段</Label>
                <Input value={form.source_metric} onChange={(e) => setForm({ ...form, source_metric: e.target.value })} placeholder="smoke_level" />
              </div>
              <div>
                <Label>源数据表</Label>
                <Input value={form.source_table} onChange={(e) => setForm({ ...form, source_table: e.target.value })} placeholder="smoke_readings" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>业务指标名</Label>
                <Input value={form.metric_name} onChange={(e) => setForm({ ...form, metric_name: e.target.value })} placeholder="烟雾浓度" />
              </div>
              <div>
                <Label>单位</Label>
                <Input value={form.metric_unit} onChange={(e) => setForm({ ...form, metric_unit: e.target.value })} placeholder="ppm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>指标类型</Label>
                <Select value={form.metric_type} onValueChange={(v) => setForm({ ...form, metric_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="value">数值</SelectItem>
                    <SelectItem value="counter">计数</SelectItem>
                    <SelectItem value="status">状态</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>转换规则</Label>
                <Input value={form.transform_rule} onChange={(e) => setForm({ ...form, transform_rule: e.target.value })} placeholder="/100" />
              </div>
              <div>
                <Label>告警阈值</Label>
                <Input value={form.alarm_threshold} onChange={(e) => setForm({ ...form, alarm_threshold: e.target.value })} placeholder="80" />
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