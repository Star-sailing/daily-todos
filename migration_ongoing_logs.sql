-- ============================================================
-- Daily Todos — 打卡回放功能数据库迁移
-- 在 Supabase SQL Editor 中整体运行（可重复执行，幂等）
-- ============================================================

-- 1) habit_logs 增加备注列（每次习惯打卡可记录"干了什么"）
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';

-- 2) 持续任务打卡明细表（每次打卡一行，含日期和备注）
CREATE TABLE IF NOT EXISTS ongoing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  note TEXT DEFAULT '',
  UNIQUE(todo_id, date)
);

-- 3) RLS 策略
ALTER TABLE ongoing_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ongoing_logs_select_own" ON ongoing_logs;
CREATE POLICY "ongoing_logs_select_own" ON ongoing_logs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ongoing_logs_insert_own" ON ongoing_logs;
CREATE POLICY "ongoing_logs_insert_own" ON ongoing_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ongoing_logs_update_own" ON ongoing_logs;
CREATE POLICY "ongoing_logs_update_own" ON ongoing_logs
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ongoing_logs_delete_own" ON ongoing_logs;
CREATE POLICY "ongoing_logs_delete_own" ON ongoing_logs
  FOR DELETE USING (user_id = auth.uid());

-- 4) 插入时自动填充 user_id 的触发器（与其他表一致）
CREATE OR REPLACE FUNCTION public.handle_new_ongoing_log() RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_ongoing_logs_user_id ON ongoing_logs;
CREATE TRIGGER trg_ongoing_logs_user_id
  BEFORE INSERT ON ongoing_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_ongoing_log();

-- 5) 回填：把现有持续任务的最后一次打卡导入明细表
--    （更早的打卡历史当时未存储，无法恢复）
INSERT INTO ongoing_logs (todo_id, user_id, date, note)
SELECT id, user_id, last_ongoing_date, last_ongoing_note
FROM todos
WHERE task_type = 'ongoing' AND last_ongoing_date IS NOT NULL
ON CONFLICT (todo_id, date) DO NOTHING;
