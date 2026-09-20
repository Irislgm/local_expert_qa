'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, Eye, Plus } from 'lucide-react';

interface Event {
  id: number;
  event_no: string;
  plan_id: number | null;
  title: string;
  description: string | null;
  level: string;
  status: string;
  location: string | null;
  trigger_type: string;
  started_at: string;
  resolved_at: string | null;
  plan: { id: number; name: string } | null;
  creator: { id: number; name: string } | null;
}

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
  critical: 'bg-red-100 text-red-700 animate-pulse',
};

const statusLabels: Record<string, string> = {
  active: '进行中',
  processing: '处理中',
  resolved: '已解决',
  closed: '已关闭',
};

const statusColors: Record<string, string> = {
  active: 'bg-red-100 text-red-700',
  processing: 'bg-amber-100 text-amber-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-slate-100 text-slate-500',
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (levelFilter) params.set('level', levelFilter);

    const res = await fetch(`/api/events?${params}`);
    const data = await res.json();
    setEvents(data.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [search, statusFilter, levelFilter]);

  const handleViewDetail = (eventId: number) => {
    router.push(`/events/detail?id=${eventId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">事件中心</h1>
          <p className="text-sm text-slate-500 mt-1">查看和管理所有应急事件</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-sm text-slate-500">进行中</div>
          <div className="text-2xl font-semibold text-red-600 mt-1">
            {events.filter((e) => e.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-sm text-slate-500">处理中</div>
          <div className="text-2xl font-semibold text-amber-600 mt-1">
            {events.filter((e) => e.status === 'processing').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-sm text-slate-500">已解决</div>
          <div className="text-2xl font-semibold text-green-600 mt-1">
            {events.filter((e) => e.status === 'resolved').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-sm text-slate-500">总计</div>
          <div className="text-2xl font-semibold text-slate-900 mt-1">{events.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="搜索事件标题..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部状态</SelectItem>
            <SelectItem value="active">进行中</SelectItem>
            <SelectItem value="processing">处理中</SelectItem>
            <SelectItem value="resolved">已解决</SelectItem>
            <SelectItem value="closed">已关闭</SelectItem>
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="全部等级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全部等级</SelectItem>
            <SelectItem value="low">低</SelectItem>
            <SelectItem value="medium">中</SelectItem>
            <SelectItem value="high">高</SelectItem>
            <SelectItem value="critical">紧急</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>事件编号</TableHead>
              <TableHead>事件标题</TableHead>
              <TableHead>关联预案</TableHead>
              <TableHead>等级</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>位置</TableHead>
              <TableHead>触发方式</TableHead>
              <TableHead>开始时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                  加载中...
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                  暂无事件
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {event.event_no}
                  </TableCell>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell className="text-slate-600">{event.plan?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge className={levelColors[event.level]}>
                      {levelLabels[event.level] || event.level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[event.status]}>
                      {statusLabels[event.status] || event.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">{event.location || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {event.trigger_type === 'auto' ? '自动' : '手动'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(event.started_at).toLocaleString('zh-CN')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetail(event.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      详情
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
