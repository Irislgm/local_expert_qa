'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, GripVertical, Plus, Save, Trash2, Zap } from 'lucide-react';

interface PlanNode {
  id?: number;
  node_type: string;
  node_name: string;
  node_order: number;
  config: Record<string, unknown>;
}

interface TriggerRule {
  id?: number;
  plan_id: number;
  metric_type: string;
  threshold: number;
  operator: string;
  duration_seconds: number;
  is_active: boolean;
}

const nodeTypes = [
  { value: 'trigger', label: '触发节点', color: 'bg-red-500', icon: '🔔' },
  { value: 'notification', label: '通知节点', color: 'bg-blue-500', icon: '📢' },
  { value: 'task', label: '任务节点', color: 'bg-green-500', icon: '📋' },
  { value: 'escalation', label: '升级节点', color: 'bg-amber-500', icon: '⬆️' },
  { value: 'end', label: '结束节点', color: 'bg-slate-500', icon: '🏁' },
];

const metricOptions = [
  { value: 'smoke_level', label: '烟雾浓度' },
  { value: 'temperature', label: '温度' },
  { value: 'flame_detected', label: '火焰检测' },
  { value: 'gas_level', label: '燃气浓度' },
  { value: 'water_level', label: '水位' },
];

export default function PlanConfigPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = parseInt(searchParams.get('id') || '0');

  const [plan, setPlan] = useState<{ id: number; name: string; category: string; level: string } | null>(null);
  const [nodes, setNodes] = useState<PlanNode[]>([]);
  const [triggers, setTriggers] = useState<TriggerRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    // Fetch plan
    const planRes = await fetch('/api/emergency-plans');
    const planData = await planRes.json();
    const currentPlan = planData.data?.find((p: { id: number }) => p.id === planId);
    setPlan(currentPlan);

    // Fetch nodes
    const nodesRes = await fetch(`/api/emergency-plans/nodes?plan_id=${planId}`);
    const nodesData = await nodesRes.json();
    setNodes(nodesData || []);

    // Fetch triggers
    const triggersRes = await fetch(`/api/emergency-plans/triggers?plan_id=${planId}`);
    const triggersData = await triggersRes.json();
    setTriggers(triggersData || []);

    setLoading(false);
  };

  useEffect(() => {
    if (!planId) return;
    fetchData();
  }, [planId]);

  const addNode = (type: string) => {
    const nodeTypeInfo = nodeTypes.find((t) => t.value === type);
    const newNode: PlanNode = {
      node_type: type,
      node_name: nodeTypeInfo?.label || '新节点',
      node_order: nodes.length,
      config: {},
    };
    setNodes([...nodes, newNode]);
  };

  const updateNode = (index: number, field: string, value: string) => {
    const newNodes = [...nodes];
    newNodes[index] = { ...newNodes[index], [field]: value };
    setNodes(newNodes);
  };

  const removeNode = (index: number) => {
    setNodes(nodes.filter((_, i) => i !== index));
  };

  const moveNode = (index: number, direction: 'up' | 'down') => {
    const newNodes = [...nodes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newNodes.length) return;
    [newNodes[index], newNodes[targetIndex]] = [newNodes[targetIndex], newNodes[index]];
    newNodes.forEach((n, i) => (n.node_order = i));
    setNodes(newNodes);
  };

  const addTrigger = () => {
    const newTrigger: TriggerRule = {
      plan_id: planId,
      metric_type: 'smoke_level',
      threshold: 80,
      operator: '>',
      duration_seconds: 30,
      is_active: true,
    };
    setTriggers([...triggers, newTrigger]);
  };

  const updateTrigger = (index: number, field: string, value: unknown) => {
    const newTriggers = [...triggers];
    newTriggers[index] = { ...newTriggers[index], [field]: value };
    setTriggers(newTriggers);
  };

  const removeTrigger = (index: number) => {
    setTriggers(triggers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    // Save nodes
    await fetch('/api/emergency-plans/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId, nodes }),
    });

    // Save triggers (delete all and re-insert)
    for (const trigger of triggers) {
      if (trigger.id) {
        await fetch('/api/emergency-plans/triggers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trigger),
        });
      } else {
        await fetch('/api/emergency-plans/triggers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...trigger, plan_id: planId }),
        });
      }
    }

    setSaving(false);
    alert('保存成功！');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">加载中...</div>;
  }

  if (!plan) {
    return <div className="flex items-center justify-center h-64">预案不存在</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/emergency-plans')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900">{plan.name} - 预案配置</h1>
          <p className="text-sm text-slate-500 mt-1">配置预案节点流程和触发规则</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? '保存中...' : '保存配置'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Node Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">节点编排</CardTitle>
              <div className="flex gap-2">
                {nodeTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant="outline"
                    size="sm"
                    onClick={() => addNode(type.value)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {type.icon}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {nodes.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  点击上方按钮添加节点
                </div>
              ) : (
                <div className="space-y-3">
                  {nodes.map((node, index) => {
                    const nodeTypeInfo = nodeTypes.find((t) => t.value === node.node_type);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50"
                      >
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveNode(index, 'up')}
                            disabled={index === 0}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveNode(index, 'down')}
                            disabled={index === nodes.length - 1}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
                          >
                            ▼
                          </button>
                        </div>
                        <GripVertical className="w-4 h-4 text-slate-400" />
                        <div className={`w-2 h-10 rounded ${nodeTypeInfo?.color}`} />
                        <div className="flex-1">
                          <Input
                            value={node.node_name}
                            onChange={(e) => updateNode(index, 'node_name', e.target.value)}
                            className="h-8"
                          />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {nodeTypeInfo?.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNode(index)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trigger Rules */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                触发规则
              </CardTitle>
              <Button variant="outline" size="sm" onClick={addTrigger}>
                <Plus className="w-3 h-3 mr-1" />
                添加
              </Button>
            </CardHeader>
            <CardContent>
              {triggers.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm">
                  暂无触发规则
                </div>
              ) : (
                <div className="space-y-3">
                  {triggers.map((trigger, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Select
                          value={trigger.metric_type}
                          onValueChange={(v) => updateTrigger(index, 'metric_type', v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {metricOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTrigger(index)}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={trigger.operator}
                          onValueChange={(v) => updateTrigger(index, 'operator', v)}
                        >
                          <SelectTrigger className="w-16 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=">">&gt;</SelectItem>
                            <SelectItem value=">=">&gt;=</SelectItem>
                            <SelectItem value="<">&lt;</SelectItem>
                            <SelectItem value="<=">&lt;=</SelectItem>
                            <SelectItem value="=">=</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={trigger.threshold}
                          onChange={(e) =>
                            updateTrigger(index, 'threshold', parseFloat(e.target.value))
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>持续</span>
                        <Input
                          type="number"
                          value={trigger.duration_seconds}
                          onChange={(e) =>
                            updateTrigger(index, 'duration_seconds', parseInt(e.target.value))
                          }
                          className="h-6 w-16 text-xs"
                        />
                        <span>秒</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
