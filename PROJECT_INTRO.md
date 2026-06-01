# Daily Todos — PWA 待办清单应用

## 项目概述
一个支持多设备云端同步的待办清单 PWA 应用。手机和电脑通用，可安装到桌面，数据通过 Supabase 实时同步。

**线上地址：** https://star-sailing.github.io/daily-todos  
**GitHub 仓库：** https://github.com/Star-sailing/daily-todos

## 技术栈
- **前端：** 纯 HTML + CSS + Vanilla JS（零框架，零构建）
- **后端/数据库：** Supabase（PostgreSQL + 用户认证）
- **部署：** GitHub Pages（master 分支 root 目录）
- **离线支持：** Service Worker（network-first + 新版本自动检测更新）

## 文件结构
```
daily-todos/
  index.html      # 登录页 + 4 Tab（今日/历史/日历/打卡）+ 弹窗
  styles.css      # 移动端优先响应式样式
  app.js          # 全部业务逻辑（IIFE）
  manifest.json   # PWA 安装配置
  sw.js           # Service Worker（network-first, v5）
```

## Supabase 配置
- **Project URL:** https://inpfdizaklxdlpawzcge.supabase.co
- **Anon Key:** 见 app.js 第 8 行
- **数据库表 `todos`：**
  `id(UUID PK)`, `user_id(UUID FK)`, `text`, `done`, `date`, `created_at`, `carried_from`, `sort_order`, `pinned`, `highlighted`, `deadline`, `has_deadline`, `task_type`, `ongoing_count`, `last_ongoing_date`, `last_ongoing_note`
- **数据库表 `habits`：**
  `id(UUID PK)`, `user_id(UUID FK)`, `content`, `period_type`, `period_count`, `total_length`, `start_date`, `created_at`
- **数据库表 `habit_logs`：**
  `id(UUID PK)`, `habit_id(UUID FK)`, `user_id(UUID FK)`, `date`, `done`, `UNIQUE(habit_id, date)`
- 所有表 RLS 已开启，INSERT 触发器自动填充 `user_id = auth.uid()`
- **认证：** 邮箱+密码，邮件确认已关闭
- **后台：** https://supabase.com/dashboard/project/inpfdizaklxdlpawzcge

## 核心功能

### 今日视图
- 添加/打勾/删除待办，已完成自动沉底
- **📌置顶：** 蓝色左边框，排最前
- **⭐高亮：** 橙色左边框+黄色背景
- **⏰ DDL：** 红色左边框+淡红背景，显示"剩余X天"/"已逾期X天"徽章，排最前
- **💭 有空可以做：** 底部独立板块，虚线边框，轻量提醒列表

### 顺延引擎
- 每天打开 App，未完成原始待办自动复制到今天（中间副本不再重复顺延）
- 文本去重，徽章显示"从X月X日开始，已拖N天"
- 午夜自动检测日期变更

### 历史视图
- 按日期倒序卡片，折叠/展开双模式，日期选择器可跳转
- **编辑模式：** 点"编辑"后可切换待办完成状态，可向过去日期添加待办
- 编辑后卡片保持展开状态不折叠

### 日历视图
- 月份网格，彩色标记（蓝=未来/绿=全完成/橙=有未完成），独立统计面板

### 打卡板块（第 4 个 Tab）
- 两种模式切换：**当前习惯** / **打卡记录**
- **习惯：** 每日/每周/每月周期，自定义长度和起始日期，进度条+打卡按钮
- **持续任务：** 自由打卡，无固定频率，`+1` 按钮 + 每日笔记
- 已打卡可再点取消，登录时未打卡习惯弹出提醒
- 达成目标时弹出成就提示

### 认证与 PWA
- 记住账号/密码/自动登录，SIGNED_OUT 自动退回登录页
- network-first SW + 新版本自动 reload

## 数据库迁移 SQL
需在 Supabase SQL Editor 执行：
```sql
ALTER TABLE todos ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS highlighted BOOLEAN DEFAULT false;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS has_deadline BOOLEAN DEFAULT false;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'todo';
ALTER TABLE todos ADD COLUMN IF NOT EXISTS ongoing_count INTEGER DEFAULT 0;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS last_ongoing_date DATE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS last_ongoing_note TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS habits ( /* ...如上 */ );
CREATE TABLE IF NOT EXISTS habit_logs ( /* ...如上 */ );
```

## 开发流程
```bash
cd "E:\DIY APP\daily-todos"
git add -A && git commit -m "描述" && git push
# 等 30 秒 GitHub Pages 自动部署
```

## localStorage 键
| Key | 内容 |
|-----|------|
| `todoapp_cache` | `{ version:1, lastActiveDate, todos }` |
| `todoapp_remembered_email` | 邮箱 |
| `todoapp_remembered_password` | 密码（明文） |
| `todoapp_auto_login` | `'1'` / `'0'` |

## 已知问题
- Supabase console 少量 400 报错（SDK 内部噪声，不影响功能）
- PWA 桌面图标不自动更新，需删除重新添加
- 国内访问 GitHub Pages 需梯子
- Sync 模块通过 PGRST204 自动重试兼容缺失的数据库列
