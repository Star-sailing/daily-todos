-- ============================================================
-- Daily Todos — 习惯与持续任务合并为统一"打卡项"
-- 在 Supabase SQL Editor 中运行（建议先备份 / 先跑前 4 步验证数量，再执行第 5 步删除）
-- ============================================================

-- 1) habits 表新增排序/重要字段
ALTER TABLE habits ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 2) 给已有习惯补一个连续排序值（按创建时间）
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) - 1 AS rn
  FROM habits
)
UPDATE habits h SET sort_order = ranked.rn FROM ranked WHERE h.id = ranked.id;

-- 3) 把"持续任务"(todos.task_type='ongoing') 迁移成"打卡项"(habits)
--    period_type='free' 表示自由打卡（无周期）；total_length=0 表示无目标次数
INSERT INTO habits (id, user_id, content, period_type, period_count, total_length, start_date, created_at, pinned, sort_order)
SELECT id, user_id, text, 'free', 1, 0, date, created_at, false, (SELECT COALESCE(MAX(sort_order),0)+1 FROM habits)
FROM todos
WHERE task_type = 'ongoing'
ON CONFLICT (id) DO NOTHING;

-- 4) 把持续任务打卡明细(ongoing_logs) 并入 habit_logs（done 恒为 true）
INSERT INTO habit_logs (id, habit_id, user_id, date, done, note)
SELECT id, todo_id, user_id, date, true, note
FROM ongoing_logs
ON CONFLICT (id) DO NOTHING;

-- 5) 确认第 3、4 步数量无误后再执行：删除已迁移的持续任务与明细表
--    （运行下面两条前，先各跑一遍 SELECT 对比条数）
-- DELETE FROM todos WHERE task_type = 'ongoing';
-- DROP TABLE IF EXISTS ongoing_logs;
