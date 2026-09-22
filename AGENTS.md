# 智慧园区专家问答策略系统 - AGENTS.md

## 项目概览

智慧园区「专家问答策略系统」Web 管理端，支持应急指挥工作流和 AI 故障诊断两大核心场景。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS 4
- **Database**: Supabase (PostgreSQL + pgvector)
- **Auth**: Supabase Auth (邮箱登录)
- **AI**: coze-coding-dev-sdk（RAG + LLM）

## 目录结构

```
src/
├── app/
│   ├── (dashboard)/            # 仪表盘路由组（需登录）
│   │   ├── layout.tsx          # 深色分组侧边栏布局
│   │   ├── page.tsx            # 首页概览
│   │   ├── contacts/           # 通讯录管理（迭代1）
│   │   ├── messages/
│   │   │   ├── templates/      # 消息模板管理（迭代1）
│   │   │   └── records/        # 消息记录（迭代1）
│   │   ├── work-orders/        # 工单管理（迭代1）
│   │   ├── emergency-plans/    # 应急预案 + 配置（迭代2）
│   │   ├── events/
│   │   │   ├── page.tsx        # 事件中心（迭代2）
│   │   │   └── detail/         # 事件详情（迭代2）
│   │   ├── knowledge/          # 知识库管理（迭代3）
│   │   ├── expert/             # 随身专家对话（迭代3）
│   │   ├── dashboard/          # 数据看板（迭代4）
│   │   └── devices/
│   │       ├── sources/        # 设备数据源（迭代4）
│   │       └── mappings/       # 指标映射（迭代4）
│   ├── api/                    # API 路由
│   │   ├── departments/        # 部门 CRUD（迭代1）
│   │   ├── contacts/           # 联系人 CRUD（迭代1）
│   │   ├── messages/
│   │   │   ├── templates/      # 消息模板 CRUD（迭代1）
│   │   │   └── records/        # 消息记录 CRUD（迭代1）
│   │   ├── work-orders/        # 工单 CRUD（迭代1）
│   │   ├── emergency-plans/    # 预案管理（迭代2）
│   │   ├── events/             # 事件管理（迭代2）
│   │   ├── knowledge-bases/    # 知识库管理（迭代3）
│   │   ├── conversations/      # 对话管理（迭代3）
│   │   ├── device-sources/     # 设备数据源（迭代4）
│   │   ├── devices/            # 设备管理（迭代4）
│   │   ├── metric-mappings/    # 指标映射（迭代4）
│   │   ├── telemetry/          # 遥测数据（迭代4）
│   │   ├── dashboard/          # 数据看板（迭代4）
│   │   └── supabase-config/    # Supabase 配置
│   ├── login/                  # 登录页
│   ├── layout.tsx              # 根布局
│   └── globals.css             # 全局样式
├── components/ui/              # shadcn/ui 组件
├── lib/
│   ├── auth-context.tsx        # 认证上下文
│   ├── supabase-browser.ts     # 浏览器端 Supabase 客户端
│   ├── supabase-config-inject.tsx  # Supabase 配置注入
│   └── utils.ts                # 工具函数
└── storage/database/
    ├── supabase-client.ts      # 服务端 Supabase 客户端
    └── shared/schema.ts        # Drizzle ORM Schema
```

## 数据库表（22张）

| 表名 | 说明 | 迭代 |
|------|------|------|
| departments | 部门表 | 1 |
| contacts | 通讯录/联系人表 | 1 |
| message_templates | 消息模板表 | 1 |
| message_records | 消息发送记录表 | 1 |
| work_orders | 工单表 | 1 |
| work_order_logs | 工单操作日志表 | 1 |
| emergency_plans | 应急预案表 | 2 |
| emergency_plan_nodes | 预案节点表（触发/通知/任务/升级/结束） | 2 |
| emergency_plan_triggers | 预案触发规则表 | 2 |
| events | 事件表 | 2 |
| event_node_progress | 事件节点进度表 | 2 |
| event_tasks | 事件任务表 | 2 |
| event_notifications | 事件通知表 | 2 |
| event_ai_reports | 事件 AI 复盘报告表 | 2 |
| knowledge_bases | 知识库表 | 3 |
| knowledge_documents | 知识文档表 | 3 |
| knowledge_chunks | 知识分块表（向量存储） | 3 |
| conversations | 对话表 | 3 |
| conversation_messages | 对话消息表 | 3 |
| device_sources | 设备数据源配置表 | 4 |
| devices | 设备表 | 4 |
| metric_mappings | 设备指标映射表 | 4 |
| device_telemetry | 设备遥测数据表 | 4 |
| dashboard_configs | 看板配置表 | 4 |

## 迭代规划（全部完成）

- **迭代1** ✅: 基础管理闭环 - 登录、通讯录、消息模板、消息记录、工单管理
- **迭代2** ✅: 应急指挥闭环 - 应急预案、预案配置（触发规则+节点编排+升级）、事件中心、事件详情（节点进度/任务/通知/AI复盘）
- **迭代3** ✅: AI 随身专家 - 知识库管理、随身专家对话（RAG 检索 + 结构化诊断 + 流式响应）
- **迭代4** ✅: 设备接入与看板 - 设备数据源直连配置+连接测试、指标映射、数据看板（recharts 图表可视化）

## 开发命令

```bash
pnpm install          # 安装依赖
pnpm run dev          # 开发模式
pnpm run build        # 构建
pnpm run start        # 生产启动
```

## 核心场景说明

### 场景1：应急指挥拖拽式工作流
五大节点：触发 → 通知 → 任务 → 升级（人工） → 结束。触发指标在预案配置页可调，升级为人为触发。

### 场景2：随身专家 AI 故障诊断
火灾应急知识库（pgvector 向量化）RAG 检索 + LLM 结构化诊断，流式响应。

## 设计规范

- 深色侧边栏（#0f172a ~ #1e293b）+ 浅色内容区
- 侧边栏分组：基础管理 / 应急指挥 / AI专家 / 设备与看板
- 主色 #2563eb，紧急色 #ef4444，成功色 #10b981
- 字体：Inter + PingFang SC
- 详细设计见 DESIGN.md