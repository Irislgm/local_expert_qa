'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Search, Settings, Trash2 } from 'lucide-react';

interface EmergencyPlan {
  id: number;
  name: string;
  description: string | null;
  category: string;
  level: string;
  status: string;
  created_by: number | null;
  created_at: string;
  creator: { id: number; name: string } | null;
}

const categoryLabels: Record<string, string> = {
  fire: '火灾',
  equipment: '设备',
  security: '安全',
  other: '其他',
};

const levelLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急',
};

const levelColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  active: '启用',
  disabled: '停用',
};

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-green-100 text-green-700',
  disabled: 'bg-slate-100 text-slate-500',
};

export default function EmergencyPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<EmergencyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<EmergencyPlan> | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryFilter) params.set('category', categoryFilter);
    if (statusFilter) params.set('status', statusFilter);

    const res = await fetch(`/api/emergency-plans?${params}`);
    const data = await res.json();
    setPlans(data.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, [search, categoryFilter, statusFilter]);

  const handleCreate = () => {
    setEditingPlan({
      name: '',
      description: '',
      category: 'fire',
      level: 'medium',
      status: 'draft',
    });
    setDialogOpen(true);
  };

  const handleEdit = (plan: EmergencyPlan) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingPlan) return;

    const method = editingPlan.id ? 'PUT' : 'POST';
    await fetch('/api/emergency-plans', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPlan),
    });

    setDialogOpen(false);
    fetchPlans();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该预案吗？')) return;
    await fetch(`/api/emergency-plans?id=${id}`, { method: 'DELETE' });
    fetchPlans();
  };

  const handleConfig = (planId: number) => {
    router.push(`/emergency-plans/config?id=${planId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">应急预案管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理园区各类应急预案及配置</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          新建预案
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索预案名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部类型</SelectItem>
            <SelectItem value="fire">火灾</SelectItem>
            <SelectItem value="equipment">设备</SelectItem>
            <SelectItem value="security">安全</SelectItem>
            <SelectItem value="other">其他</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部状态</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="active">启用</SelectItem>
            <SelectItem value="disabled">停用</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>预案名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>等级</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建人</TableHead>
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
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{categoryLabels[plan.category] || plan.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={levelColors[plan.level]}>
                      {levelLabels[plan.level] || plan.level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[plan.status]}>
                      {statusLabels[plan.status] || plan.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">{plan.creator?.name || '-'}</TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(plan.created_at).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleConfig(plan.id)}>
                      <Settings className="w-4 h-4 mr-1" />
                      配置
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(plan)}>
                      编辑
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(plan.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan?.id ? '编辑预案' : '新建预案'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">预案名称</label>
              <Input
                value={editingPlan?.name || ''}
                onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                placeholder="请输入预案名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">描述</label>
              <Input
                value={editingPlan?.description || ''}
                onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                placeholder="请输入预案描述"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">类型</label>
                <Select
                  value={editingPlan?.category || 'fire'}
                  onValueChange={(v) => setEditingPlan({ ...editingPlan, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fire">火灾</SelectItem>
                    <SelectItem value="equipment">设备</SelectItem>
                    <SelectItem value="security">安全</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">等级</label>
                <Select
                  value={editingPlan?.level || 'medium'}
                  onValueChange={(v) => setEditingPlan({ ...editingPlan, level: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="critical">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSave}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
