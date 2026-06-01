# Daily Todos — PWA 待办清单应用

## 项目概述
一个支持多设备云端同步的待办清单 PWA 应用。手机和电脑通用，可安装到桌面，数据通过 Supabase 实时同步。

**线上地址：** https://star-sailing.github.io/daily-todos  
**GitHub 仓库：** https://github.com/Star-sailing/daily-todos

## 技术栈
- **前端：** 纯 HTML + CSS + Vanilla JS（零框架，零构建）
- **后端/数据库：** Supabase（PostgreSQL + 用户认证）
- **部署：** GitHub Pages（master 分支 root 目录）
- **离线支持：** Service Worker（network-first 策略 + 新版本自动检测更新）

## 文件结构
```
daily-todos/
  index.html      # 登录页 + 4 Tab 主应用（今日/历史/日历/打卡）+ 弹窗
  styles.css      # 移动端优先响应式样式（~1200行）
  app.js          # 全部业务逻辑（~1700行 IIFE）
  manifest.json   # PWA 安装配置
  sw.js           # Service Worker 离线缓存（network-first, v5）
```

## Supabase 配置
- **Project URL:** https://inpfdizaklxdlpawzcge.supabase.co
- **Anon Key:** 见 app.js 第 8 行
- **数据库表 `todos`：**
  - 列：`id(UUID PK)`, `user_id(UUID FK→auth.users)`, `text(TEXT)`, `done(BOOL)`, `date(DATE)`, `created_at(TIMESTAMPTZ)`, `carried_from(DATE)`, `sort_order(INT)`, `pinned(BOOL)`, `highlighted(BOOL)`, `deadline(DATE)`, `has_deadline(BOOL)`, `task_type(TEXT)`, `ongoing_count(INT)`, `last_ongoing_date(DATE)`
- **数据库表 `habits`：**
  - 列：`id(UUID PK)`, `user_id(UUID FK)`, `content(TEXT)`, `period_type(TEXT)`, `period_count(INT)`, `total_length(INT)`, `start_date(DATE)`, `created_at(TIMESTAMPTZ)`
- **数据库表 `habit_logs`：**
  - 列：`id(UUID PK)`, `habit_id(UUID FK→habits)`, `user_id(UUID FK)`, `date(DATE)`, `done(BOOL)`, `UNIQUE(habit_id, date)`
- 所有表 RLS 已开启，有 INSERT 触发器自动填充 `user_id = auth.uid()`
- **认证方式：** 邮箱 + 密码，邮件确认已关闭
- **Supabase 后台：** https://supabase.com/dashboard/project/inpfdizaklxdlpawzcge

## 核心功能

### 今日视图
- 添加/打勾/删除待办，已完成自动沉底（删除线+半透明）
- **📌置顶：** 永远排最前（蓝色左边框）
- **⭐高亮：** 橙色左边框+黄色背景
- **⏰ DDL 截止日期：** 红色左边框+淡红背景（区别于高亮），显示"剩余X天"/"今天截止"/"已逾期X天"徽章，死亡线项排最前
- **🔄 持续任务：** 独立添加区，`[+1]` 按钮替代 checkbox，累计"已做X天"，虚线边框，不参与顺延

### 未完成顺延
- 每天打开 App 时，昨天的未完成任务（仅原始待办，不含中间副本）自动复制到今天
- 按文本去重，`carriedFrom` 指向原始创建日期
- 徽章显示"从X月X日开始，已拖N天"

### 历史视图
- 按日期倒序卡片展示，折叠/展开双模式，日期选择器可跳转

### 日历视图
- 月份网格，日期下方彩色横线标记（蓝=未来/绿=全完成/橙=有未完成），独立月度统计面板

### 打卡板块（第 4 个 Tab）
- 支持每日/每周/每月周期，自定义长度和起始日期
- 进度条 + 打卡按钮，当天已打卡自动禁用
- **登录提醒：** 当天有未打卡习惯时自动弹 Toast
- **成就展示：** 目标达成时弹出 🎉 恭喜提示

### 认证与 PWA
- 邮箱+密码登录，记住账号/密码/自动登录
- 手机可安装到桌面，network-first SW 策略确保始终加载最新版本
- 检测到新 SW 版本自动 reload
- 静默登出（SIGNED_OUT）自动退回登录页

## app.js 架构

### 模块（按代码顺序）
| 模块 | 行号（约） | 职责 |
|------|-----------|------|
| 工具函数 | ~13 | getToday, formatDate, daysBetween, generateId 等 |
| Toast | ~60 | 通知弹窗（2-4s 自动消失） |
| Supabase Client | ~75 | 初始化 Supabase SDK |
| Auth | ~96 | getSession, refreshSession, login, register, logout |
| Sync | ~136 | fetchTodos, addTodo, updateTodo, deleteTodo, batchAdd, batchUpdate — 全部含 PGRST204 自动重试 |
| HabitSync | ~302 | fetchHabits, fetchHabitLogs, addHabit, deleteHabit, addHabitLog |
| LocalCache | ~380 | localStorage 读写 |
| Habit Helpers | ~400 | getHabitCompletionDays, isHabitDoneToday, getHabitProgress |
| Carry-Over | ~425 | runCarryOver（只顺延原始待办，排除 ongoing） |
| State | ~470 | 全局 state 对象 |
| Renderers | ~485 | renderToday, renderHistory, renderCalendar, renderStats, renderHabits, renderModalList |
| Event Handlers | ~1050 | handleAdd, handleToggle, handleDelete, handlePin, handleHighlight, handleSetDeadline, handleDeadlineClick, handleIncrementOngoing, handleAddHabit, handleCheckHabit, handleDeleteHabit |
| App Entry | ~1500 | enterApp, startMidnightChecker, init |

### 关键模式
- **Sync 模块：** 所有 DB 操作自动 camelCase↔snake_case 映射，遇到 `PGRST204`（列不存在）静默删除该字段重试
- **Handler 模式：** sync-first — 先写 Supabase，成功后才更新本地 state 和 UI
- **isAuthError()：** 统一检测 401/403/JWT 过期，自动退回登录页
- **SW 更新：** `updatefound` 事件 → `window.location.reload()` 自动刷新

## 开发流程
```bash
cd "E:\DIY APP\daily-todos"
git add -A
git commit -m "描述改动内容"
git push
# 等 30 秒，GitHub Pages 自动部署
```

## localStorage 键
| Key | 内容 |
|-----|------|
| `todoapp_cache` | `{ version:1, lastActiveDate, todos }` |
| `todoapp_remembered_email` | 邮箱字符串 |
| `todoapp_remembered_password` | 密码（明文） |
| `todoapp_auto_login` | `'1'` 或 `'0'` |

## 已知问题
- Supabase console 有少量 400 报错（SDK 内部噪声，不影响功能）
- PWA 桌面图标不会自动更新，需删除后重新添加
- 国内访问 GitHub Pages 需要梯子
- `pinned`/`highlighted` 列可能不在 DB 中（Sync 模块通过 PGRST204 重试自动兼容）
