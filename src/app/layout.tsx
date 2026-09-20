import type { Metadata } from 'next';
import './globals.css';
import { SupabaseConfigProvider } from '@/lib/supabase-config-inject';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: '智慧园区专家问答策略系统',
  description: '智慧园区专家问答策略系统 - 应急指挥与AI故障诊断管理平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <SupabaseConfigProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SupabaseConfigProvider>
      </body>
    </html>
  );
}
