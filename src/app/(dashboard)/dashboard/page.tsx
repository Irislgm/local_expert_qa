"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Cpu, AlertTriangle, Database, Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface DashboardData {
  deviceStatus: { total: number; online: number; offline: number; maintenance: number };
  alarmStats: { alarm: number; warning: number; normal: number };
  sourceStats: { total: number; connected: number; active: number; failed: number };
  charts: { metric: string; data: { time: string; value: number; status: string }[] }[];
  recentAlerts: { id: number; device_id: number; metric_key: string; metric_value: number; metric_unit: string | null; status: string; collected_at: string }[];
}

const metricLabels: Record<string, string> = {
  smoke_level: "烟雾浓度 (ppm)",
  temperature: "温度 (°C)",
  power_consumption: "能耗 (kWh)",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    const json = await res.json();
    if (!json.error) setData(json);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().then(() => {
      setLoading(false);
      timerRef.current = setInterval(fetchData, 15000);
    });
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 300);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-slate-500">看板数据加载失败</div>;
  }

  const statCards = [
    { label: "设备总数", value: data.deviceStatus.total, icon: Cpu, cls: "text-blue-600 bg-blue-50" },
    { label: "在线设备", value: data.deviceStatus.online, icon: Wifi, cls: "text-green-600 bg-green-50" },
    { label: "离线设备", value: data.deviceStatus.offline, icon: WifiOff, cls: "text-slate-600 bg-slate-100" },
    { label: "告警指标", value: data.alarmStats.alarm, icon: AlertTriangle, cls: "text-red-600 bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">数据看板</h1>
          <p className="mt-1 text-sm text-slate-500">园区设备实时监控与数据可视化</p>
        </div>
        <ButtonRefresh refreshing={refreshing} onRefresh={handleRefresh} />
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${c.cls}`}>
                <c.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{c.label}</p>
                <p className="text-2xl font-semibold text-slate-900">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 数据源状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-slate-500" /> 数据源状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-md border px-4 py-2">
              <span className="text-sm text-slate-500">总数</span>
              <span className="text-lg font-semibold">{data.sourceStats.total}</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-2">
              <span className="text-sm text-green-700">已连接</span>
              <span className="text-lg font-semibold text-green-700">{data.sourceStats.connected}</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2">
              <span className="text-sm text-blue-700">已配置</span>
              <span className="text-lg font-semibold text-blue-700">{data.sourceStats.active}</span>
            </div>
            {data.sourceStats.failed > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2">
                <span className="text-sm text-red-700">连接失败</span>
                <span className="text-lg font-semibold text-red-700">{data.sourceStats.failed}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 趋势图表 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {data.charts.map((chart) => (
          <Card key={chart.metric}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-slate-500" /> {metricLabels[chart.metric] || chart.metric}
                </span>
                <Badge variant="outline" className="bg-slate-50">
                  {chart.data.filter((d) => d.status === "alarm").length > 0 ? "有告警" : "正常"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} fontSize={11} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(value: any) => [value, chart.metric]}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                  />
                  {chart.metric !== "power_consumption" && <Legend />}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={chart.data.filter((d) => d.status === "alarm").length > 0 ? "#ef4444" : "#3b82f6"}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 最近告警 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-red-500" /> 最近告警
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentAlerts.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
              <Activity className="h-4 w-4" /> 暂无告警
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentAlerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md border border-red-100 bg-red-50/50 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500">告警</Badge>
                    <span className="font-medium text-slate-800">{metricLabels[a.metric_key] || a.metric_key}</span>
                    <span className="text-sm font-semibold text-red-600">{a.metric_value}{a.metric_unit || ""}</span>
                  </div>
                  <span className="text-xs text-slate-500">{new Date(a.collected_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ButtonRefresh({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  return (
    <button
      onClick={onRefresh}
      disabled={refreshing}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
    >
      {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      实时刷新
    </button>
  );
}