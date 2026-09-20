'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, CheckCircle2, Clock, AlertCircle, FileText, Sparkles } from 'lucide-react';

interface EventDetail {
  event: {
    id: number;
    event_no: string;
    title: string;
    description: string | null;
    level: string;
    status: string;
    location: string | null;
    trigger_type: string;
    started_at: string;
    resolved_at: string | null;
    plan: { id: number; name: string; category: string } | null;
    creator: { id: number; name: string } | null;
  };
  progress: Array<{
    id: number;
    node_type: string;
    node_name: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    operator: { id: number; name: string } | null;
  }>;
  tasks: Array<{
    id: number;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    assignee: { id: number; name: string } | null;
    created_at: string;
    completed_at: string | null;
  }>;
  notifications: Array<{
    id: number;
    channel: string;
    title: string;
    content: string;
    status: string;
    sent_at: string | null;
    recipient: { id: number; name: string } | null;
  }>;
  ai_report: {
    id: number;
    summary: string;
    timeline: string;
    analysis: string;
    suggestions: string;
    generated_at: string;
  } | null;
}

const nodeTypeIcons: Record<string, string> = {
  trigger: '🔔',
  notification: '📢',
  task: '📋',
  escalation: '⬆️',
  end: '🏁',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-4 h-4 text-slate-400" />,
  in_progress: <AlertCircle className="w-4 h-4 text-amber-500" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  skipped: <Clock className="w-4 h-4 text-slate-300" />,
};

const statusColors: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  skipped: 'bg-slate-100 text-slate-500',
};

const levelColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

export default function EventDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = parseInt(searchParams.get('id') || '0');

  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    const res = await fetch(`/api/events/detail?event_id=${eventId}`);
    const data = await res.json();
    setDetail(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!eventId) return;
    fetchDetail();
  }, [eventId]);

  const generateAIReport = async () => {
    setGeneratingReport(true);
    await fetch('/api/events/ai-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId }),
    });
    fetchDetail();
    setGeneratingReport(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">加载中...</div>;
  }

  if (!detail || !detail.event) {
    return <div className="flex items-center justify-center h-64">事件不存在</div>;
  }

  const { event, progress, tasks, notifications, ai_report } = detail;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/events')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{event.title}</h1>
            <Badge className={levelColors[event.level]}>{event.level}</Badge>
            <Badge className={statusColors[event.status]}>{event.status}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            事件编号: {event.event_no} | 位置: {event.location || '-'} | 触发方式:{' '}
            {event.trigger_type === 'auto' ? '自动触发' : '手动触发'}
          </p>
        </div>
      </div>

      {/* Event Info Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">关联预案</div>
            <div className="text-lg font-medium mt-1">{event.plan?.name || '-'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">开始时间</div>
            <div className="text-lg font-medium mt-1">
              {new Date(event.started_at).toLocaleString('zh-CN')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">解决时间</div>
            <div className="text-lg font-medium mt-1">
              {event.resolved_at ? new Date(event.resolved_at).toLocaleString('zh-CN') : '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-slate-500">创建人</div>
            <div className="text-lg font-medium mt-1">{event.creator?.name || '-'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="progress">节点进度 ({progress.length})</TabsTrigger>
          <TabsTrigger value="tasks">任务列表 ({tasks.length})</TabsTrigger>
          <TabsTrigger value="notifications">通知记录 ({notifications.length})</TabsTrigger>
          <TabsTrigger value="ai-report">AI 复盘报告</TabsTrigger>
        </TabsList>

        {/* Node Progress */}
        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>节点执行进度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {progress.map((node, index) => (
                  <div key={node.id} className="flex items-start gap-4">
                    {/* Timeline */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">
                        {nodeTypeIcons[node.node_type] || '⚪'}
                      </div>
                      {index < progress.length - 1 && (
                        <div className="w-0.5 h-12 bg-slate-200 mt-2" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{node.node_name}</span>
                        <Badge className={statusColors[node.status]}>
                          {node.status === 'completed' ? '已完成' : 
                           node.status === 'in_progress' ? '进行中' : 
                           node.status === 'pending' ? '待执行' : '已跳过'}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        {node.started_at && (
                          <span>开始: {new Date(node.started_at).toLocaleTimeString('zh-CN')}</span>
                        )}
                        {node.completed_at && (
                          <span className="ml-4">
                            完成: {new Date(node.completed_at).toLocaleTimeString('zh-CN')}
                          </span>
                        )}
                        {node.operator && (
                          <span className="ml-4">操作人: {node.operator.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>任务列表</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>任务名称</TableHead>
                    <TableHead>负责人</TableHead>
                    <TableHead>优先级</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>完成时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{task.assignee?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            task.priority === 'high'
                              ? 'bg-red-100 text-red-700'
                              : task.priority === 'medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }
                        >
                          {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[task.status]}>
                          {task.status === 'completed' ? '已完成' : 
                           task.status === 'in_progress' ? '进行中' : '待处理'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(task.created_at).toLocaleString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {task.completed_at ? new Date(task.completed_at).toLocaleString('zh-CN') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>通知记录</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>渠道</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>接收人</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>发送时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notif) => (
                    <TableRow key={notif.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {notif.channel === 'sms' ? '短信' : 
                           notif.channel === 'app' ? 'APP' : '邮件'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{notif.title}</TableCell>
                      <TableCell>{notif.recipient?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            notif.status === 'sent' || notif.status === 'delivered'
                              ? 'bg-green-100 text-green-700'
                              : notif.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-700'
                          }
                        >
                          {notif.status === 'sent' ? '已发送' : 
                           notif.status === 'delivered' ? '已送达' : 
                           notif.status === 'failed' ? '失败' : '待发送'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {notif.sent_at ? new Date(notif.sent_at).toLocaleString('zh-CN') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Report */}
        <TabsContent value="ai-report">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI 复盘报告
              </CardTitle>
              {!ai_report && (
                <Button onClick={generateAIReport} disabled={generatingReport}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generatingReport ? '生成中...' : '生成报告'}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {ai_report ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      事件摘要
                    </h3>
                    <p className="text-slate-600 bg-slate-50 p-4 rounded-lg">{ai_report.summary}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">事件时间线</h3>
                    <pre className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg whitespace-pre-wrap">
                      {ai_report.timeline}
                    </pre>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">AI 分析</h3>
                    <p className="text-slate-600 bg-slate-50 p-4 rounded-lg whitespace-pre-wrap">
                      {ai_report.analysis}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 mb-2">改进建议</h3>
                    <p className="text-slate-600 bg-slate-50 p-4 rounded-lg whitespace-pre-wrap">
                      {ai_report.suggestions}
                    </p>
                  </div>
                  <div className="text-sm text-slate-400">
                    报告生成时间: {new Date(ai_report.generated_at).toLocaleString('zh-CN')}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>暂无AI复盘报告</p>
                  <p className="text-sm mt-1">点击"生成报告"按钮，AI将为您分析本次事件</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
