'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  ClipboardList,
  LogOut,
  ChevronDown,
  Shield,
  Radio,
  Bot,
  Monitor,
  Database,
  GitBranch,
  Activity,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    title: '基础管理',
    items: [
      { label: '工作台', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: '通讯录', href: '/contacts', icon: <Users className="h-4 w-4" /> },
      { label: '消息模板', href: '/messages/templates', icon: <MessageSquare className="h-4 w-4" /> },
      { label: '消息记录', href: '/messages/records', icon: <FileText className="h-4 w-4" /> },
      { label: '工单管理', href: '/work-orders', icon: <ClipboardList className="h-4 w-4" /> },
    ],
  },
  {
    title: '应急指挥',
    items: [
      { label: '应急预案', href: '/emergency-plans', icon: <Shield className="h-4 w-4" /> },
      { label: '事件中心', href: '/events', icon: <Radio className="h-4 w-4" /> },
    ],
  },
  {
    title: 'AI随身专家',
    items: [
      { label: '知识库管理', href: '/knowledge', icon: <Bot className="h-4 w-4" /> },
      { label: '随身专家对话', href: '/expert', icon: <MessageSquare className="h-4 w-4" /> },
    ],
  },
  {
    title: '设备与看板',
    items: [
      { label: '数据看板', href: '/dashboard', icon: <Monitor className="h-4 w-4" /> },
      { label: '设备数据源', href: '/devices/sources', icon: <Database className="h-4 w-4" /> },
      { label: '指标映射', href: '/devices/mappings', icon: <GitBranch className="h-4 w-4" /> },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && !user && mounted) {
      router.replace('/login');
    }
  }, [isLoading, user, mounted, router]);

  if (isLoading || !mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userEmail = user?.email || '';
  const userName = user?.user_metadata?.full_name || userEmail.split('@')[0] || '用户';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-[260px] flex-col bg-slate-800 text-slate-200">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-700 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">智慧园区</h1>
            <p className="text-xs text-slate-400">专家问答策略系统</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sidebarGroups.map((group) => (
            <div key={group.title} className="mb-4">
              <h3 className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                {group.title}
              </h3>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href) && item.href !== '#';
                  const isDisabled = item.href === '#';

                  return (
                    <li key={item.label}>
                      {isDisabled ? (
                        <span className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed">
                          {item.icon}
                          {item.label}
                          <span className="ml-auto rounded bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">
                            即将上线
                          </span>
                        </span>
                      ) : (
                        <a
                          href={item.href}
                          onClick={(e) => {
                            e.preventDefault();
                            router.push(item.href);
                          }}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-slate-700/70 text-white border-l-2 border-blue-400'
                              : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                          }`}
                        >
                          {item.icon}
                          {item.label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-slate-700 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-500 text-xs text-white">
                    {userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">{userName}</p>
                  <p className="truncate text-xs text-slate-400">{userEmail}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
