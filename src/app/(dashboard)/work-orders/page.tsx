'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react';

interface WorkOrder {
  id: number;
  order_no: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  source: string;
  creator_id: number | null;
  assignee_id: number | null;
  location: string | null;
  expected_resolve_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  creator: { id: number; name: string } | null;
  assignee: { id: number; name: string } | null;
}

const typeLabels: Record<string, string> = {
  fault: '故障', request: '需求', complaint: '投诉', suggestion: '建议',
};
const typeColors: Record<string, string> = {
  fault: 'bg-red-100 text-red-700',
  request: 'bg-blue-100 text-blue-700',
  complaint: 'bg-amber-100 text-amber-700',
  suggestion: 'bg-green-100 text-green-700',
};

const priorityLabels: Record<string, string> = {
  low: '低', medium: '中', high: '高', urgent: '紧急',
};
const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭',
};
const statusColors: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  processing: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-200 text-slate-500',
};

const sourceLabels: Record<string, string> = {
  manual: '手动创建', system: '系统自动', phone: '电话报修', wechat: '微信报修',
};

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const pageSize = 20;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<WorkOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [formData, setFormData] = useState({
    title: '', description: '', type: 'fault', priority: 'medium',
    status: 'pending', source: 'manual', assignee_id: '', location: '',
  });
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      const res = await fetch(`/api/work-orders?${params}`);
      const result = await res.json();
      setOrders(result.data || []);
      setTotal(result.total || 0);
    } catch {
      // fetch failed
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterPriority]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openCreateDialog = () => {
    setEditingOrder(null);
    setFormData({
      title: '', description: '', type: 'fault', priority: 'medium',
      status: 'pending', source: 'manual', assignee_id: '', location: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (order: WorkOrder) => {
    setEditingOrder(order);
    setFormData({
      title: order.title,
      description: order.description || '',
      type: order.type,
      priority: order.priority,
      status: order.status,
      source: order.source,
      assignee_id: order.assignee_id ? String(order.assignee_id) : '',
      location: order.location || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        type: formData.type,
        priority: formData.priority,
        status: formData.status,
        source: formData.source,
        assignee_id: formData.assignee_id ? Number(formData.assignee_id) : null,
        location: formData.location || null,
      };

      if (editingOrder) {
        await fetch('/api/work-orders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: editingOrder.id }),
        });
      } else {
        await fetch('/api/work-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setDialogOpen(false);
      fetchOrders();
    } catch {
      // save failed
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await fetch(`/api/work-orders?id=${deletingId}`, { method: 'DELETE' });
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchOrders();
    } catch {
      // delete failed
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">工单管理</h1>
          <p className="mt-1 text-sm text-slate-500">管理园区故障报修、需求与投诉工单</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          创建工单
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">工单列表</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="搜索工单号或标题..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="w-28"><SelectValue placeholder="状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="processing">处理中</SelectItem>
                  <SelectItem value="resolved">已解决</SelectItem>
                  <SelectItem value="closed">已关闭</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={(v) => { setFilterPriority(v === 'all' ? '' : v); setPage(1); }}>
                <SelectTrigger className="w-28"><SelectValue placeholder="优先级" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部优先级</SelectItem>
                  <SelectItem value="urgent">紧急</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>工单号</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>处理人</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-slate-400">加载中...</TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-slate-400">暂无工单数据</TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs text-slate-500">{order.order_no}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium text-slate-900">{order.title}</TableCell>
                    <TableCell>
                      <Badge className={typeColors[order.type] || 'bg-slate-100 text-slate-600'}>
                        {typeLabels[order.type] || order.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[order.priority] || 'bg-slate-100 text-slate-600'}>
                        {priorityLabels[order.priority] || order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status] || 'bg-slate-100 text-slate-600'}>
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">{sourceLabels[order.source] || order.source}</TableCell>
                    <TableCell className="text-slate-600">{order.assignee?.name || '-'}</TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(order.created_at).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setViewingOrder(order); setViewDialogOpen(true); }}>
                            <Eye className="mr-2 h-4 w-4" /> 查看
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(order)}>
                            <Pencil className="mr-2 h-4 w-4" /> 编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => { setDeletingId(order.id); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> 删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">共 {total} 条记录</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
                <span className="text-sm text-slate-600">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOrder ? '编辑工单' : '创建工单'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>标题 *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入工单标题"
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请描述问题详情..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>类型</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fault">故障</SelectItem>
                    <SelectItem value="request">需求</SelectItem>
                    <SelectItem value="complaint">投诉</SelectItem>
                    <SelectItem value="suggestion">建议</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>优先级</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editingOrder && (
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待处理</SelectItem>
                    <SelectItem value="processing">处理中</SelectItem>
                    <SelectItem value="resolved">已解决</SelectItem>
                    <SelectItem value="closed">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>来源</Label>
                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">手动创建</SelectItem>
                    <SelectItem value="system">系统自动</SelectItem>
                    <SelectItem value="phone">电话报修</SelectItem>
                    <SelectItem value="wechat">微信报修</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>位置</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="如：A栋3楼"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !formData.title.trim()}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>工单详情</DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-slate-500">{viewingOrder.order_no}</span>
                <Badge className={statusColors[viewingOrder.status]}>{statusLabels[viewingOrder.status]}</Badge>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{viewingOrder.title}</h3>
                {viewingOrder.description && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{viewingOrder.description}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
                <div>
                  <p className="text-xs text-slate-500">类型</p>
                  <Badge className={typeColors[viewingOrder.type]}>{typeLabels[viewingOrder.type]}</Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500">优先级</p>
                  <Badge className={priorityColors[viewingOrder.priority]}>{priorityLabels[viewingOrder.priority]}</Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500">来源</p>
                  <p className="text-sm">{sourceLabels[viewingOrder.source]}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">位置</p>
                  <p className="text-sm">{viewingOrder.location || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">创建人</p>
                  <p className="text-sm">{viewingOrder.creator?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">处理人</p>
                  <p className="text-sm">{viewingOrder.assignee?.name || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">创建时间</p>
                  <p>{new Date(viewingOrder.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <p className="text-slate-500">解决时间</p>
                  <p>{viewingOrder.resolved_at ? new Date(viewingOrder.resolved_at).toLocaleString('zh-CN') : '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">关闭时间</p>
                  <p>{viewingOrder.closed_at ? new Date(viewingOrder.closed_at).toLocaleString('zh-CN') : '-'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">确定要删除该工单吗？相关操作日志也将一并删除。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
