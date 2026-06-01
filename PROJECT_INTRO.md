# Daily Todos — PWA 待办清单应用

## 项目概述
一个支持多设备云端同步的待办清单 PWA 应用。手机和电脑通用，可安装到桌面，数据通过 Supabase 实时同步。

**线上地址：** https://star-sailing.github.io/daily-todos
**GitHub 仓库：** https://github.com/Star-sailing/daily-todos

## 技术栈
- **前端：** 纯 HTML + CSS + Vanilla JS（零框架，零构建）
- **后端/数据库：** Supabase（PostgreSQL + 用户认证）
- **部署：** GitHub Pages（master 分支 root 目录）
- **离线支持：** Service Worker（cache-first 策略）

## 文件结构
```
daily-todos/
  index.html      # 登录页 + 主应用（今日/历史/日历三个 Tab）+ 弹窗
  styles.css      # 移动端优先响应式样式（~980行）
  app.js          # 全部业务逻辑（~1100行 IIFE）
  manifest.json   # PWA 安装配置
  sw.js           # Service Worker 离线缓存
```

## Supabase 配置
- **Project URL:** https://inpfdizaklxdlpawzcge.supabase.co
- **Anon Key:** 见 app.js 第 8 行
- **数据库表 `todos`：**
  - 列：`id(UUID PK)`, `user_id(UUID FK→auth.users)`, `text(TEXT)`, `done(BOOL)`, `date(DATE)`, `created_at(TIMESTAMPTZ)`, `carried_from(DATE)`, `sort_order(INT)`, `pinned(BOOL)`, `highlighted(BOOL)`
  - RLS 已开启，每个用户只能读写自己的数据
  - 有 INSERT 触发器自动填充 `user_id = auth.uid()`
- **认证方式：** 邮箱 + 密码，邮件确认已关闭
- **Supabase 后台：** https://supabase.com/dashboard/project/inpfdizaklxdlpawzcge

## 核心功能
1. **今日视图：** 添加/打勾/删除待办，已完成自动沉底（删除线+半透明）
2. **置顶 & 高亮：** 📌置顶永远排最前（蓝色左边框），⭐高亮（橙色左边框+黄色背景）
3. **未完成顺延：** 每天打开 App 时，昨天的未完成任务自动复制到今天，按文本去重
4. **历史视图：** 按日期倒序卡片展示，折叠/展开双模式，日期选择器可跳转
5. **日历视图：** 月份网格，日期下方彩色横线标记（蓝=未来/绿=全完成/橙=有未完成），独立月度统计面板
6. **记住账号/密码：** 邮箱自动保存，可选"记住密码"和"自动登录"
7. **PWA：** 手机可安装到桌面，离线能打开（缓存 App Shell）
8. **云端同步：** 所有操作实时写入 Supabase，多设备登录同一账号自动同步

## 开发流程
```bash
# 修改代码后
cd "E:\DIY APP\daily-todos"
git add -A
git commit -m "描述改动内容"
git push
# 等 30 秒，GitHub Pages 自动部署
```

## 已知问题
- Supabase 的 console 有少量 400 报错（realtime 已禁用，剩下的是 SDK 内部噪声，不影响功能）
- PWA 桌面图标不会自动更新，需删除后重新添加
- 国内访问 GitHub Pages 需要梯子

## 注意事项
- 所有 Supabase API 调用都在 app.js 的 Sync 模块中
- Service Worker 版本号在 sw.js 第 1 行 `CACHE_NAME`
- localStorage key `todoapp_cache` 存本地缓存，`todoapp_remembered_email`/`todoapp_remembered_password`/`todoapp_auto_login` 存登录偏好
- 顺延引擎在 `enterApp()` 中调用 `runCarryOver()`
- 午夜检测每 60 秒运行一次
