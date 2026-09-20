# DESIGN.md

## Design Tokens

### 色彩
- 侧边栏背景：深蓝灰 `#1e293b` (slate-800)
- 侧边栏悬停：`#334155` (slate-700)
- 侧边栏激活：`#3b82f6` (blue-500) 左边框 + 背景微亮
- 内容区背景：`#f8fafc` (slate-50)
- 卡片背景：白色 `#ffffff`
- 主色：`#3b82f6` (blue-500)
- 紧急/危险：`#ef4444` (red-500)
- 警告：`#f59e0b` (amber-500)
- 成功：`#22c55e` (green-500)
- 文字主色：`#0f172a` (slate-900)
- 文字次色：`#64748b` (slate-500)

### 字体
- 字体族：Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif
- 标题：font-semibold (600)
- 正文：font-normal (400)
- 侧边栏分组标题：text-xs uppercase tracking-wider text-slate-400

### 间距
- 侧边栏宽度：260px
- 内容区内边距：p-6
- 卡片间距：gap-4 ~ gap-6

### 圆角
- 卡片：rounded-lg (8px)
- 按钮/输入框：rounded-md (6px)
- 侧边栏菜单项：rounded-md

### 阴影
- 卡片：shadow-sm
- 悬浮卡片：shadow-md

## 布局与响应式
- 左侧固定深色侧边栏（260px），分组展示菜单
- 顶部 Header 栏含面包屑和用户头像
- 内容区自适应宽度
- 表格使用全宽卡片包裹

## 交互与状态
- 侧边栏菜单项 hover 时背景变亮
- 当前激活菜单项左侧蓝色边框 + 背景高亮
- 表格行 hover 灰色背景
- 状态标签使用 Badge 组件，不同状态不同颜色
