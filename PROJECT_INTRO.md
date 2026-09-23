# Daily Todos — PWA 待办清单应用

## 项目概述
一个支持多设备云端同步的待办清单 PWA 应用。手机和电脑通用，可安装到桌面，数据存储在 Supabase，打开页面 / 切换 Tab / 窗口聚焦时自动拉取最新数据同步。

**线上地址：** https://star-sailing.github.io/daily-todos   
**GitHub 仓库：** https://github.com/Star-sailing/daily-todos

## 技术栈
- **前端：** 纯 HTML + CSS + Vanilla JS（零框架，零构建）
- **后端/数据库：** Supabase（PostgreSQL + 用户认证）
- **部署：** GitHub Pages（master 分支 root 目录）
- **离线支持：** Service Worker（network-first + 自动检测更新）

## 文件结构
```
daily-todos/
  index.html      # 登录页 + 4 Tab（今日/历史/日历/打卡）+ 弹窗
  styles.css      # 移动端优先响应式样式
  app.js          # 全部业务逻辑（IIFE）
  manifest.json   # PWA 安装配置
  sw.js           # Service Worker（network-first, v5）
  migration_ongoing_logs.sql      # 打卡回放功能数据库迁移（已废弃，见下）
  migration_completed_date.sql    # 完成率按天统计迁移
  migration_merge_habits.sql      # 习惯与持续任务合并迁移
```

## Supabase 配置
- **Project URL:** https://inpfdizaklxdlpawzcge.supabase.co
- **Anon Key:** 见 app.js 第 8 行
- **数据库表 `todos`：**
  `id(UUID PK)`, `user_id(UUID FK)`, `text`, `done`, `date`, `created_at`, `carried_from`, `sort_order`, `pinned`, `highlighted`, `deadline`, `has_deadline`, `task_type`, `ongoing_count`, `last_ongoing_date`, `last_ongoing_note`, `completed_date`
- **数据库表 `habits`（统一打卡项）：**
  `id(UUID PK)`, `user_id(UUID FK)`, `content`, `period_type`(free/daily/weekly/monthly), `period_count`, `total_length`(0=无目标), `start_date`, `pinned`, `sort_order`, `created_at`
- **数据库表 `habit_logs`：**
  `id(UUID PK)`, `habit_id(UUID FK)`, `user_id(UUID FK)`, `date`, `done`, `note`, `UNIQUE(habit_id, date)`
- （`ongoing_logs` 表已废弃：持续任务已合并进 habits/habit_logs）
- 所有表 RLS 已开启，INSERT 触发器自动填充 `user_id = auth.uid()`
- **认证：** 邮箱+密码，邮件确认已关闭
- **后台：** https://supabase.com/dashboard/project/inpfdizaklxdlpawzcge

## 核心功能

### 今日视图
- 添加/打勾/删除待办，已完成自动沉底
- **📌置顶：** 蓝色左边框，排最前
- **⭐高亮：** 橙色左边框+黄色背景
- **⏰ DDL：** 红色左边框+淡红背景，日历图标设截止日期，显示"剩余X天"/"已逾期X天"，排最前
- **💭 有空可以做：** 底部独立板块，虚线边框轻量提醒，添加/删除

### 顺延引擎
- 每天把未完成的原始待办**复制**一份到今天（原记录保留在当天历史中，不再"移动"）
- 按原始行 id 识别顺延链，同名任务互不干扰；今天只保留每条链的一份副本
- 徽章显示"从X月X日开始，已拖N天"
- **完成语义**：勾掉一个任务只标记"当天那条"为完成，过去几天保持未完成；根源行记 `completed_date` 停止继续顺延
- 午夜 60 秒检测自动触发；历史记录按天保留未完成任务

### 历史视图
- 按日期倒序卡片，折叠/展开双模式，日期选择器可跳转
- 每个日期的卡片同时展示当天**已完成和未完成**的待办
- **未办池：** 汇总所有当前未完成的事务（按顺延链去重，未来任务不显示）
- **编辑模式：** 点「编辑」后进入可编辑状态（按钮变红提示），可：
  - 切换待办完成/未完成（点击圆点）
  - 删除单条记录（✕ 按钮）
  - 向指定日期添加新待办（每个卡片底部「+ 添加到此日期」）
- 编辑后卡片保持展开状态不折叠

### 日历视图
- 月份网格，彩色横线标记（蓝=未来/绿=全完成/橙=有未完成）
- 独立月度统计面板，可前后翻月；**完成率按"天"累加**：Σ每天完成数 ÷ Σ每天任务数（例如 (1+2)/(3+4)）

### 打卡板块（第 4 个 Tab）
- **模式切换：** 当前习惯 / 打卡记录
- **统一打卡项：** 周期可选（每日/每周/每月/自由打卡），目标次数可选（0=无目标），起始日期
  - 每条是一个**可折叠条形卡片**：点击卡片展开，内联显示打卡历史
  - 卡片右上角：📌置顶（重要）· ↑↓上下移排序 · ✎编辑参数 · ✕删除
  - 一键打卡按钮，已打卡可再点取消
- **展开后（内联历史）：**
  - 统计：累计天数 / 连续天数 / 本月天数
  - 时间线：按日期倒序列出每次打卡，✎ 编辑备注，单条可删除
  - 漏卡提示：每日型习惯显示从开始日期起未打卡的日期（最近60天）
  - 补打卡：选择过去日期 + 备注补记
- **打卡记录：** 按日期卡片展示所有打卡项当天的打卡（含备注，含当天）
- 登录时未打卡习惯弹出 Toast 提醒
- 达成目标时弹出 🎉 成就提示（自由打卡无目标不弹）

### 认证与 PWA
- 记住账号/密码/自动登录
- SIGNED_OUT 自动退回登录页
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

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  period_type TEXT DEFAULT 'daily',
  period_count INT DEFAULT 1,
  total_length INT DEFAULT 30,
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  done BOOLEAN DEFAULT true,
  UNIQUE(habit_id, date)
);
-- + RLS policies + INSERT triggers for auth.uid()
```

### 打卡回放功能迁移（2026-08-18）
完整幂等脚本见 `migration_ongoing_logs.sql`，在 Supabase SQL Editor 中整体运行：
1. `habit_logs` 增加 `note TEXT DEFAULT ''` 列
2. 新建 `ongoing_logs` 表（含 RLS 策略 + user_id 插入触发器）
3. 回填现有持续任务的最后一次打卡到明细表（更早历史未存储，无法恢复）

### 完成率按天统计迁移
脚本见 `migration_completed_date.sql`：
```sql
ALTER TABLE todos ADD COLUMN IF NOT EXISTS completed_date DATE;
```

### 习惯与持续任务合并迁移
脚本见 `migration_merge_habits.sql`（先跑 1–4 步，验证数量后再执行第 5 步删除）：
1. `habits` 增加 `pinned`、`sort_order` 列
2. 把 `todos.task_type='ongoing'` 迁移成 habits（period_type='free'）
3. 把 `ongoing_logs` 并入 `habit_logs`
4. 最后删除 `ongoing` todos 与 `ongoing_logs` 表

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
- 2026-08-18 版本曾把历史记录批量标记为已完成（顺延链"全局完成"逻辑在登录时误触发），该逻辑已移除；被误标记的历史记录无法自动还原，可在历史编辑模式手动修正
- 习惯达成目标后，之后每次再打卡都会重复弹出 🎉 成就提示（待修复）
- Supabase console 少量 400 报错（SDK 内部噪声，不影响功能）
- PWA 桌面图标不自动更新，需删除重新添加
- 国内访问 GitHub Pages 需梯子
- Sync 模块通过 PGRST204 自动重试兼容缺失的数据库列
