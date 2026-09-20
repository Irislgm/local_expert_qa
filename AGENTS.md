# 智慧园区专家问答策略系统 - AGENTS.md

## 项目概览

智慧园区「专家问答策略系统」Web 管理端，支持应急指挥工作流和 AI 故障诊断两大核心场景。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (邮箱登录)

## 目录结构

```
src/
├── app/
│   ├── (dashboard)/          # 仪表盘路由组（需登录）
│   │   ├── layout.tsx        # 侧边栏布局
│   │   ├── page.tsx          # 首页概览
│   │   ├── contacts/         # 通讯录管理
│   │   ├── messages/
│   │   │   ├── templates/    # 消息模板管理
│   │   │   └── records/      # 消息记录
│   │   └── work-orders/      # 工单管理
│   ├── api/                  # API 路由
│   │   ├── departments/      # 部门 CRUD
│   │   ├── contacts/         # 联系人 CRUD
│   │   ├── messages/
│   │   │   ├── templates/    # 消息模板 CRUD
│   │   │   └── records/      # 消息记录 CRUD
│   │   ├── work-orders/      # 工单 CRUD
│   │   └── supabase-config/  # Supabase 配置
│   ├── login/                # 登录页
│   ├── layout.tsx            # 根布局
│   └── globals.css           # 全局样式
├── components/ui/            # shadcn/ui 组件
├── lib/
│   ├── auth-context.tsx      # 认证上下文
│   ├── supabase-browser.ts   # 浏览器端 Supabase 客户端
│   └── utils.ts              # 工具函数
└── storage/database/
    ├── supabase-client.ts    # 服务端 Supabase 客户端
    └── shared/schema.ts      # Drizzle ORM Schema
```

## 数据库表

| 表名 | 说明 |
|------|------|
| departments | 部门表 |
| contacts | 通讯录/联系人表 |
| message_templates | 消息模板表 |
| message_records | 消息发送记录表 |
| work_orders | 工单表 |
| work_order_logs | 工单操作日志表 |

## 迭代规划

- **迭代1** (当前): 基础管理闭环 - 登录、通讯录、消息模板、消息记录、工单管理
- **迭代2**: 应急指挥闭环 - 应急预案、预案配置、事件中心
- **迭代3**: AI 随身专家 - 知识库管理、对话诊断
- **迭代4**: 设备接入与看板 - 设备配置、指标映射、数据看板

## 开发命令

```bash
pnpm install          # 安装依赖
pnpm run dev          # 开发模式
pnpm run build        # 构建
pnpm run start        # 生产启动
```

## API 接口

| 路径 | 方法 | 说明 |
|------|------|------|
| /api/departments | GET/POST/PUT/DELETE | 部门管理 |
| /api/contacts | GET/POST/PUT/DELETE | 联系人管理 |
| /api/messages/templates | GET/POST/PUT/DELETE | 消息模板管理 |
| /api/messages/records | GET/POST/PUT/DELETE | 消息记录管理 |
| /api/work-orders | GET/POST/PUT/DELETE | 工单管理 |
| /api/supabase-config | GET | Supabase 配置 |

## 设计规范

- 深色侧边栏（#0f172a ~ #1e293b）+ 浅色内容区
- 侧边栏分组：基础管理 / 应急指挥 / AI专家 / 设备管理
- 主色 #2563eb，紧急色 #ef4444，成功色 #10b981
- 字体：Inter + PingFang SC
