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
import { Plus, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react';

interface MessageTemplate {
  id: number;
  name: string;
  category: string;
  channel: string;
  title_template: string | null;
  content_template: string;
  variables: string | null;
  is_active: boolean;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  notification: '通知',
  alert: '告警',
  emergency: '应急',
};

const categoryColors: Record<string, string> = {
  notification: 'bg-blue-100 text-blue-700',
  alert: 'bg-amber-100 text-amber-700',
  emergency: 'bg-red-100 text-red-700',
};

const channelLabels: Record<string, string> = {
  sms: '短信',
  email: '邮件',
  wechat: '微信',
  phone: '电话',
};

export default function MessageTemplatesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState('');
  const pageSize = 20;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState<MessageTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '', category: 'notification', channel: 'sms', title_template: '', content_template: '',
  });
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (filterCategory) params.set('category', filterCategory);
      const res = await fetch(`/api/messages/templates?${params}`);
      const result = await res.json();
      setTemplates(result.data || []);
      setTotal(result.total || 0);
    } catch {
      // fetch failed
    } finally {
      setLoading(false);
    }
  }, [page, filterCategory]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData({ name: '', category: 'notification', channel: 'sms', title_template: '', content_template: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (tpl: MessageTemplate) => {
    setEditingTemplate(tpl);
    setFormData({
      name: tpl.name,
      category: tpl.category,
      channel: tpl.channel,
      title_template: tpl.title_template || '',
      content_template: tpl.content_template,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.content_template.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        channel: formData.channel,
        title_template: formData.title_template || null,
        content_template: formData.content_template,
      };

      if (editingTemplate) {
        await fetch('/api/messages/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: editingTemplate.id, is_active: editingTemplate.is_active }),
        });
      } else {
        await fetch('/api/messages/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setDialogOpen(false);
      fetchTemplates();
    } catch {
      // save failed
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await fetch(`/api/messages/templates?id=${deletingId}`, { method: 'DELETE' });
      setDeleteDialogOpen(false);
      setDeletingId(null);
      fetchTemplates();
    } catch {
      // delete failed
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">消息模板</h1>
          <p className="mt-1 text-sm text-slate-500">管理系统通知、告警和应急消息模板</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          新增模板
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">模板列表</CardTitle>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="notification">通知</SelectItem>
                <SelectItem value="alert">告警</SelectItem>
                <SelectItem value="emergency">应急</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模板名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>渠道</TableHead>
                <TableHead>内容预览</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-400">加载中...</TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-400">暂无模板数据</TableCell>
                </TableRow>
              ) : (
                templates.map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell className="font-medium text-slate-900">{tpl.name}</TableCell>
                    <TableCell>
                      <Badge className={categoryColors[tpl.category] || 'bg-slate-100 text-slate-600'}>
                        {categoryLabels[tpl.category] || tpl.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">{channelLabels[tpl.channel] || tpl.channel}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-slate-500">
                      {tpl.content_template}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tpl.is_active ? 'default' : 'secondary'}>
                        {tpl.is_active ? '启用' : '停用'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(tpl.created_at).toLocaleDateString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setViewingTemplate(tpl); setViewDialogOpen(true); }}>
                            <Eye className="mr-2 h-4 w-4" /> 查看
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(tpl)}>
                            <Pencil className="mr-2 h-4 w-4" /> 编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => { setDeletingId(tpl.id); setDeleteDialogOpen(true); }}
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
            <DialogTitle>{editingTemplate ? '编辑模板' : '新增模板'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>模板名称 *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：火灾告警通知"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分类</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notification">通知</SelectItem>
                    <SelectItem value="alert">告警</SelectItem>
                    <SelectItem value="emergency">应急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>渠道</Label>
                <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">短信</SelectItem>
                    <SelectItem value="email">邮件</SelectItem>
                    <SelectItem value="wechat">微信</SelectItem>
                    <SelectItem value="phone">电话</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>标题模板</Label>
              <Input
                value={formData.title_template}
                onChange={(e) => setFormData({ ...formData, title_template: e.target.value })}
                placeholder="支持变量: {{name}}, {{location}}"
              />
            </div>
            <div className="space-y-2">
              <Label>内容模板 *</Label>
              <Textarea
                value={formData.content_template}
                onChange={(e) => setFormData({ ...formData, content_template: e.target.value })}
                placeholder="支持变量: {{name}}, {{location}}, {{time}}"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim() || !formData.content_template.trim()}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>模板详情</DialogTitle>
          </DialogHeader>
          {viewingTemplate && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-500">模板名称</Label>
                <p className="mt-1 font-medium">{viewingTemplate.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">分类</Label>
                  <p className="mt-1">
                    <Badge className={categoryColors[viewingTemplate.category]}>
                      {categoryLabels[viewingTemplate.category]}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-slate-500">渠道</Label>
                  <p className="mt-1">{channelLabels[viewingTemplate.channel]}</p>
                </div>
              </div>
              {viewingTemplate.title_template && (
                <div>
                  <Label className="text-slate-500">标题模板</Label>
                  <p className="mt-1 rounded bg-slate-50 p-2 text-sm">{viewingTemplate.title_template}</p>
                </div>
              )}
              <div>
                <Label className="text-slate-500">内容模板</Label>
                <p className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">{viewingTemplate.content_template}</p>
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
          <p className="text-sm text-slate-600">确定要删除该消息模板吗？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
