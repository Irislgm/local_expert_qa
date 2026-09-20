'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface MessageRecord {
  id: number;
  template_id: number | null;
  contact_id: number | null;
  channel: string;
  title: string | null;
  content: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  created_at: string;
  message_templates: { name: string } | null;
  contacts: { name: string } | null;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: '待发送', icon: <Clock className="h-3 w-3" />, color: 'bg-slate-100 text-slate-600' },
  sent: { label: '已发送', icon: <CheckCircle className="h-3 w-3" />, color: 'bg-blue-100 text-blue-700' },
  delivered: { label: '已送达', icon: <CheckCircle className="h-3 w-3" />, color: 'bg-green-100 text-green-700' },
  failed: { label: '发送失败', icon: <XCircle className="h-3 w-3" />, color: 'bg-red-100 text-red-700' },
};

const channelLabels: Record<string, string> = {
  sms: '短信', email: '邮件', wechat: '微信', phone: '电话',
};

export default function MessageRecordsPage() {
  const [records, setRecords] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const pageSize = 20;

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<MessageRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/messages/records?${params}`);
      const result = await res.json();
      setRecords(result.data || []);
      setTotal(result.total || 0);
    } catch {
      // fetch failed
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totalPages = Math.ceil(total / pageSize);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">消息记录</h1>
        <p className="mt-1 text-sm text-slate-500">查看系统消息发送记录与状态</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">发送记录</CardTitle>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待发送</SelectItem>
                <SelectItem value="sent">已发送</SelectItem>
                <SelectItem value="delivered">已送达</SelectItem>
                <SelectItem value="failed">发送失败</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>消息标题</TableHead>
                <TableHead>接收人</TableHead>
                <TableHead>模板</TableHead>
                <TableHead>渠道</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>发送时间</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-400">加载中...</TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-400">暂无消息记录</TableCell>
                </TableRow>
              ) : (
                records.map((record) => {
                  const status = statusConfig[record.status] || statusConfig.pending;
                  return (
                    <TableRow
                      key={record.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => { setViewingRecord(record); setViewDialogOpen(true); }}
                    >
                      <TableCell className="font-medium text-slate-900">
                        {record.title || '(无标题)'}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {record.contacts?.name || '-'}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {record.message_templates?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">{channelLabels[record.channel] || record.channel}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <span className="mr-1">{status.icon}</span>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">{formatTime(record.sent_at)}</TableCell>
                      <TableCell className="text-slate-500">{formatTime(record.created_at)}</TableCell>
                    </TableRow>
                  );
                })
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

      {/* View Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>消息详情</DialogTitle>
          </DialogHeader>
          {viewingRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">消息标题</p>
                  <p className="font-medium">{viewingRecord.title || '(无标题)'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">状态</p>
                  <Badge className={(statusConfig[viewingRecord.status] || statusConfig.pending).color}>
                    {(statusConfig[viewingRecord.status] || statusConfig.pending).label}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-500">接收人</p>
                  <p>{viewingRecord.contacts?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">渠道</p>
                  <p>{channelLabels[viewingRecord.channel] || viewingRecord.channel}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">模板</p>
                  <p>{viewingRecord.message_templates?.name || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500">消息内容</p>
                <p className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">{viewingRecord.content}</p>
              </div>
              {viewingRecord.error_message && (
                <div className="rounded bg-red-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                    <AlertCircle className="h-4 w-4" /> 错误信息
                  </div>
                  <p className="mt-1 text-sm text-red-600">{viewingRecord.error_message}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">创建时间</p>
                  <p>{new Date(viewingRecord.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <p className="text-slate-500">发送时间</p>
                  <p>{viewingRecord.sent_at ? new Date(viewingRecord.sent_at).toLocaleString('zh-CN') : '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">送达时间</p>
                  <p>{viewingRecord.delivered_at ? new Date(viewingRecord.delivered_at).toLocaleString('zh-CN') : '-'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
