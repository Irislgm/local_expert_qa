# 智慧园区专家问答策略系统 - 本地部署指南

Next.js 16 (App Router) + React 19 + TypeScript + shadcn/ui + Tailwind CSS 4 + Supabase。

## 系统要求

- Node.js >= 20（推荐 22+）
- pnpm（本项目仅使用 pnpm，禁用 npm/yarn）
- 一个 Supabase 项目（含 Auth 邮箱登录 + pgvector 扩展）
- 可选：Coze AI API Token（用于「随身专家对话」的 RAG 检索与流式 LLM 应答）

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env.local
#   编辑 .env.local，填入 Supabase 与 AI 配置

# 3. 准备数据库
#   使用 db/init.sql 在 Supabase SQL Editor 中执行
#   （需 PostgreSQL 15+ 并启用 pgvector 扩展）

# 4. 启动开发模式
pnpm run dev
#   http://localhost:3000

# 5. 构建并运行生产模式
pnpm run build
pnpm run start
```

## 环境变量说明

| 变量 | 必需 | 说明 |
|------|------|------|
| `COZE_SUPABASE_URL` | ✅ | Supabase 项目 URL |
| `COZE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public 密钥 |
| `COZE_SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service_role 密钥（后端专用） |
| `COZE_API_TOKEN` | ❌ | Coze AI API Token（AI 对话功能） |
| `PORT` | ❌ | 端口，默认 3000 |

## 数据库

`db/init.sql` 包含完整 DDL（22+ 张业务表、pgvector 扩展、RPC 函数 match_knowledge_chunks）与种子数据。

注意：Supabase 控制台不支持直接执行完整 SQL 文件。请在 SQL Editor 中：
1. 先执行：`CREATE EXTENSION IF NOT EXISTS vector;`
2. 再执行 RPC 函数与建表语句（分批执行，避免超时）

## 登录账号

系统使用 Supabase Auth 邮箱登录。种子数据中的用户密码需要在 Supabase Auth 中手动创建同邮箱用户，或在登录页直接注册新账号后再与业务表绑定。