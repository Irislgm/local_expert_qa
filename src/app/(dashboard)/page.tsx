'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, ClipboardList, AlertTriangle } from 'lucide-react';

interface Stats {
  contacts: number;
  templates: number;
  workOrders: number;
  pendingOrders: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ contacts: 0, templates: 0, workOrders: 0, pendingOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [contactsRes, templatesRes, ordersRes] = await Promise.all([
          fetch('/api/contacts?count=true'),
          fetch('/api/messages/templates?count=true'),
          fetch('/api/work-orders?count=true'),
        ]);
        const contactsData = await contactsRes.json();
        const templatesData = await templatesRes.json();
        const ordersData = await ordersRes.json();

        const pendingRes = await fetch('/api/work-orders?status=pending&count=true');
        const pendingData = await pendingRes.json();

        setStats({
          contacts: contactsData.count || 0,
          templates: templatesData.count || 0,
          workOrders: ordersData.count || 0,
          pendingOrders: pendingData.count || 0,
        });
      } catch {
        // stats fetch failed silently
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const cards = [
    { title: '通讯录联系人', value: stats.contacts, icon: <Users className="h-5 w-5" />, color: 'text-blue-500', bg: 'bg-blue-50' },
    { title: '消息模板', value: stats.templates, icon: <MessageSquare className="h-5 w-5" />, color: 'text-green-500', bg: 'bg-green-50' },
    { title: '工单总数', value: stats.workOrders, icon: <ClipboardList className="h-5 w-5" />, color: 'text-purple-500', bg: 'bg-purple-50' },
    { title: '待处理工单', value: stats.pendingOrders, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">工作台</h1>
        <p className="mt-1 text-sm text-slate-500">系统概览与数据统计</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{card.title}</CardTitle>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <span className={card.color}>{card.icon}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">系统信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-medium text-slate-900">迭代1 - 基础管理闭环</h3>
                <p className="mt-1 text-sm text-slate-500">登录、通讯录、消息模板、消息记录、工单管理</p>
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    已完成
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-medium text-slate-900">迭代2 - 应急指挥闭环</h3>
                <p className="mt-1 text-sm text-slate-500">应急预案管理、事件中心、AI复盘报告</p>
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    规划中
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="font-medium text-slate-900">迭代3 - AI随身专家</h3>
                <p className="mt-1 text-sm text-slate-500">火灾应急知识库、AI对话诊断</p>
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    规划中
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
