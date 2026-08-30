(function() {
  'use strict';

  /* ==================================================================
     CONFIGURATION — 在这里填入你的 Supabase 信息
     ================================================================== */
  const SUPABASE_URL = 'https://inpfdizaklxdlpawzcge.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlucGZkaXpha2x4ZGxwYXd6Y2dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODczMjEsImV4cCI6MjA5NTU2MzMyMX0.NZZRVEr94sBcBYPAdZVfek6JHL1_wQ5AeS8RB2X4j-g';

  /* ==================================================================
     UTILITY FUNCTIONS
     ================================================================== */
  function getToday() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + days[d.getDay()];
  }

  function formatDateShort(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function formatDateFull(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function getWeekday(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return days[d.getDay()];
  }

  function daysBetween(dateStr1, dateStr2) {
    var d1 = new Date(dateStr1 + 'T00:00:00');
    var d2 = new Date(dateStr2 + 'T00:00:00');
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /* ==================================================================
     TOAST NOTIFICATIONS
     ================================================================== */
  const Toast = {
    show(msg, duration) {
      if (duration === undefined) duration = 2000;
      const container = document.getElementById('toastContainer');
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = msg;
      container.appendChild(el);
      setTimeout(function() {
        el.classList.add('removing');
        setTimeout(function() { el.remove(); }, 200);
      }, duration);
    }
  };

  /* ==================================================================
     SUPABASE CLIENT
     ================================================================== */
  let supabase = null;

  function initSupabase() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
      return false;
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: { enabled: false },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
    return true;
  }

  /* ==================================================================
     AUTH MODULE
     ================================================================== */
  const Auth = {
    async getSession() {
      if (!supabase) return null;
      var result = await supabase.auth.getSession();
      return result.data.session;
    },

    async refreshSession() {
      if (!supabase) return null;
      var result = await supabase.auth.refreshSession();
      if (result.error) return null;
      return result.data.session;
    },

    async login(email, password) {
      var result = await supabase.auth.signInWithPassword({ email: email, password: password });
      if (result.error) throw result.error;
      return result.data;
    },

    async register(email, password) {
      var result = await supabase.auth.signUp({ email: email, password: password });
      if (result.error) throw result.error;
      return result.data;
    },

    async logout() {
      await supabase.auth.signOut();
    }
  };

  /* ==================================================================
     DATA SYNC MODULE
     ================================================================== */
  const Sync = {
    async fetchTodos() {
      if (!supabase) return [];
      var allTodos = [];
      var from = 0;
      var size = 1000;
      while (true) {
        var result = await supabase
          .from('todos')
          .select('*')
          .order('date', { ascending: false })
          .range(from, from + size - 1);
        if (result.error) throw result.error;
        var batch = result.data || [];
        allTodos = allTodos.concat(batch);
        if (batch.length < size) break;
        from += size;
      }
      return allTodos.map(function(t) {
        return {
          id: t.id,
          text: t.text,
          done: t.done,
          status: t.status || (t.done ? 'done' : 'active'),
          date: t.date,
          createdAt: t.created_at,
          carriedFrom: t.carried_from,
          completedDate: t.completed_date || null,
          order: t.sort_order,
          pinned: t.pinned || false,
          highlighted: t.highlighted || false,
          deadline: t.deadline || null,
          hasDeadline: t.has_deadline || false,
          taskType: t.task_type || 'todo',
          ongoingCount: t.ongoing_count || 0,
          lastOngoingDate: t.last_ongoing_date || null,
          lastOngoingNote: t.last_ongoing_note || ''
        };
      });
    },

    async addTodo(todo) {
      if (!supabase) return null;
      var payload = {
        id: todo.id,
        text: todo.text,
        done: todo.done,
        status: todo.status || 'active',
        date: todo.date,
        carried_from: todo.carriedFrom || null,
        sort_order: todo.order || 0
      };
      // Optional columns — only include if set or if DB may have them
      if (todo.pinned !== undefined) payload.pinned = todo.pinned;
      if (todo.highlighted !== undefined) payload.highlighted = todo.highlighted;
      if (todo.deadline !== undefined) payload.deadline = todo.deadline;
      if (todo.hasDeadline !== undefined) payload.has_deadline = todo.hasDeadline;
      if (todo.taskType !== undefined && todo.taskType !== 'todo') payload.task_type = todo.taskType;
      if (todo.ongoingCount !== undefined) payload.ongoing_count = todo.ongoingCount;
      if (todo.lastOngoingDate !== undefined) payload.last_ongoing_date = todo.lastOngoingDate;
      if (todo.lastOngoingNote !== undefined) payload.last_ongoing_note = todo.lastOngoingNote;
      if (todo.completedDate !== undefined) payload.completed_date = todo.completedDate;
      var result = await supabase.from('todos').insert(payload);
      if (result.error) {
        // If columns don't exist, retry without them (silent — expected until DB migration)
        if (result.error.code === 'PGRST204') {
          delete payload.pinned;
          delete payload.highlighted;
          delete payload.deadline;
          delete payload.has_deadline;
          delete payload.task_type;
          delete payload.ongoing_count;
          delete payload.last_ongoing_date;
          delete payload.last_ongoing_note;
          delete payload.completed_date;
          delete payload.status;
          result = await supabase.from('todos').insert(payload);
          if (result.error) throw result.error;
          return todo;
        }
        console.error('Supabase addTodo error:', {
          message: result.error.message,
          code: result.error.code,
          details: result.error.details,
          hint: result.error.hint
        });
        throw result.error;
      }
      return todo;
    },

    async updateTodo(id, changes) {
      if (!supabase) return null;
      var payload = {};
      if (changes.text !== undefined) payload.text = changes.text;
      if (changes.done !== undefined) payload.done = changes.done;
      if (changes.status !== undefined) payload.status = changes.status;
      if (changes.date !== undefined) payload.date = changes.date;
      if (changes.carriedFrom !== undefined) payload.carried_from = changes.carriedFrom;
      if (changes.order !== undefined) payload.sort_order = changes.order;
      if (changes.pinned !== undefined) payload.pinned = changes.pinned;
      if (changes.highlighted !== undefined) payload.highlighted = changes.highlighted;
      if (changes.deadline !== undefined) payload.deadline = changes.deadline;
      if (changes.hasDeadline !== undefined) payload.has_deadline = changes.hasDeadline;
      if (changes.taskType !== undefined) payload.task_type = changes.taskType;
      if (changes.ongoingCount !== undefined) payload.ongoing_count = changes.ongoingCount;
      if (changes.lastOngoingDate !== undefined) payload.last_ongoing_date = changes.lastOngoingDate;
      if (changes.lastOngoingNote !== undefined) payload.last_ongoing_note = changes.lastOngoingNote;
      if (changes.completedDate !== undefined) payload.completed_date = changes.completedDate;
      var result = await supabase.from('todos').update(payload).eq('id', id);
      if (result.error) {
        // If columns don't exist, retry without them (silent — expected until DB migration)
        if (result.error.code === 'PGRST204') {
          delete payload.pinned;
          delete payload.highlighted;
          delete payload.deadline;
          delete payload.has_deadline;
          delete payload.task_type;
          delete payload.ongoing_count;
          delete payload.last_ongoing_date;
          delete payload.last_ongoing_note;
          delete payload.completed_date;
          delete payload.status;
          result = await supabase.from('todos').update(payload).eq('id', id);
          if (result.error) throw result.error;
          return;
        }
        console.error('Supabase updateTodo error:', {
          message: result.error.message,
          code: result.error.code,
          details: result.error.details,
          hint: result.error.hint
        });
        throw result.error;
      }
    },

    async deleteTodo(id) {
      if (!supabase) return;
      var result = await supabase.from('todos').delete().eq('id', id);
      if (result.error) throw result.error;
    },

    async batchAdd(todos) {
      if (!supabase || todos.length === 0) return;
      var payload = todos.map(function(t) {
        var item = {
          id: t.id,
          text: t.text,
          done: t.done,
          status: t.status || 'active',
          date: t.date,
          carried_from: t.carriedFrom || null,
          sort_order: t.order || 0
        };
        if (t.pinned !== undefined) item.pinned = t.pinned;
        if (t.highlighted !== undefined) item.highlighted = t.highlighted;
        if (t.deadline !== undefined) item.deadline = t.deadline;
        if (t.hasDeadline !== undefined) item.has_deadline = t.hasDeadline;
        if (t.taskType !== undefined && t.taskType !== 'todo') item.task_type = t.taskType;
        if (t.ongoingCount !== undefined) item.ongoing_count = t.ongoingCount;
        if (t.lastOngoingDate !== undefined) item.last_ongoing_date = t.lastOngoingDate;
        if (t.completedDate !== undefined) item.completed_date = t.completedDate;
        return item;
      });
      var result = await supabase.from('todos').insert(payload);
      if (result.error) {
        // If columns don't exist, retry without them (silent — expected until DB migration)
        if (result.error.code === 'PGRST204') {
          payload = payload.map(function(item) {
            delete item.pinned;
            delete item.highlighted;
            delete item.deadline;
            delete item.has_deadline;
            delete item.task_type;
            delete item.ongoing_count;
            delete item.last_ongoing_date;
            delete item.completed_date;
            delete item.status;
            return item;
          });
          result = await supabase.from('todos').insert(payload);
          if (result.error) throw result.error;
          return;
        }
        console.error('Supabase batchAdd error:', {
          message: result.error.message,
          code: result.error.code,
          details: result.error.details,
          hint: result.error.hint
        });
        throw result.error;
      }
    },

    async batchUpdate(updates) {
      if (!supabase || updates.length === 0) return;
      for (var i = 0; i < updates.length; i++) {
        var u = updates[i];
        var payload = {};
        if (u.done !== undefined) payload.done = u.done;
        if (u.date !== undefined) payload.date = u.date;
        if (u.carriedFrom !== undefined) payload.carried_from = u.carriedFrom;
        if (u.order !== undefined) payload.sort_order = u.order;
        await supabase.from('todos').update(payload).eq('id', u.id);
      }
    }
  };

  /* ==================================================================
     HABIT SYNC MODULE
     ================================================================== */
  var HabitSync = {
    async fetchHabits() {
      if (!supabase) return [];
      var result = await supabase.from('habits').select('*').order('created_at', { ascending: true });
      if (result.error) throw result.error;
      return (result.data || []).map(function(h) {
        return {
          id: h.id,
          content: h.content,
          periodType: h.period_type,
          periodCount: h.period_count,
          totalLength: h.total_length,
          startDate: h.start_date,
          createdAt: h.created_at
        };
      });
    },

    async fetchHabitLogs() {
      if (!supabase) return [];
      var result = await supabase.from('habit_logs').select('*').order('date', { ascending: false });
      if (result.error) throw result.error;
      return (result.data || []).map(function(l) {
        return {
          id: l.id,
          habitId: l.habit_id,
          date: l.date,
          done: l.done,
          note: l.note || ''
        };
      });
    },

    async addHabit(habit) {
      if (!supabase) return null;
      var payload = {
        id: habit.id,
        content: habit.content,
        period_type: habit.periodType,
        period_count: habit.periodCount,
        total_length: habit.totalLength,
        start_date: habit.startDate
      };
      var result = await supabase.from('habits').insert(payload);
      if (result.error) throw result.error;
      return habit;
    },

    async deleteHabit(id) {
      if (!supabase) return;
      var result = await supabase.from('habits').delete().eq('id', id);
      if (result.error) throw result.error;
    },

    async deleteHabitLog(id) {
      if (!supabase) return;
      var result = await supabase.from('habit_logs').delete().eq('id', id);
      if (result.error) throw result.error;
    },

    async addHabitLog(log) {
      if (!supabase) return null;
      var payload = {
        id: log.id,
        habit_id: log.habitId,
        date: log.date,
        done: log.done
      };
      if (log.note !== undefined) payload.note = log.note;
      var result = await supabase.from('habit_logs').insert(payload);
      if (result.error) {
        if (result.error.code === '23505') return null; // already checked in that day
        if (result.error.code === 'PGRST204') {
          // note column not migrated yet — retry without it
          delete payload.note;
          result = await supabase.from('habit_logs').insert(payload);
          if (result.error) throw result.error;
          return log;
        }
        throw result.error;
      }
      return log;
    },

    async updateLog(id, note) {
      if (!supabase) return;
      var result = await supabase.from('habit_logs').update({ note: note }).eq('id', id);
      if (result.error) throw result.error;
    }
  };

  /* ==================================================================
     ONGOING LOG SYNC MODULE (per-day check-in details for ongoing tasks)
     ================================================================== */
  var OngoingLogSync = {
    async fetchLogs() {
      if (!supabase) return [];
      var result = await supabase.from('ongoing_logs').select('*').order('date', { ascending: false });
      if (result.error) throw result.error;
      return (result.data || []).map(function(l) {
        return {
          id: l.id,
          todoId: l.todo_id,
          date: l.date,
          note: l.note || ''
        };
      });
    },

    async addLog(log) {
      if (!supabase) return null;
      var payload = {
        id: log.id,
        todo_id: log.todoId,
        date: log.date,
        note: log.note || ''
      };
      var result = await supabase.from('ongoing_logs').insert(payload);
      if (result.error) {
        if (result.error.code === '23505') return null; // already logged that day
        // Table not migrated yet — callers degrade gracefully
        if (result.error.code === 'PGRST204' || result.error.code === 'PGRST205' || result.error.code === '42P01') {
          console.warn('ongoing_logs not available yet', result.error.message);
          throw result.error;
        }
        throw result.error;
      }
      return log;
    },

    async deleteLog(id) {
      if (!supabase) return;
      var result = await supabase.from('ongoing_logs').delete().eq('id', id);
      if (result.error) throw result.error;
    },

    async updateLog(id, note) {
      if (!supabase) return;
      var result = await supabase.from('ongoing_logs').update({ note: note }).eq('id', id);
      if (result.error) throw result.error;
    }
  };

  /* ==================================================================
     LOCAL CACHE
     ================================================================== */
  var localCache = { todos: [], lastActiveDate: '' };

  function saveLocalCache() {
    try {
      localStorage.setItem('todoapp_cache', JSON.stringify({
        version: 1,
        lastActiveDate: localCache.lastActiveDate,
        todos: localCache.todos
      }));
    } catch (e) { /* quota exceeded — non-critical */ }
  }

  function loadLocalCache() {
    try {
      var raw = localStorage.getItem('todoapp_cache');
      if (raw) {
        var data = JSON.parse(raw);
        localCache.lastActiveDate = data.lastActiveDate || '';
        localCache.todos = data.todos || [];
      }
    } catch (e) { /* ignore */ }
  }

  /* ==================================================================
     HABIT HELPERS
     ================================================================== */
  function getHabitCompletionDays(habitId) {
    var logs = state.habitLogs.filter(function(l) { return l.habitId === habitId && l.done; });
    return logs.length;
  }

  function isHabitDoneToday(habitId) {
    var today = getToday();
    for (var i = 0; i < state.habitLogs.length; i++) {
      if (state.habitLogs[i].habitId === habitId && state.habitLogs[i].date === today && state.habitLogs[i].done) {
        return true;
      }
    }
    return false;
  }

  function getHabitProgress(habit) {
    var doneDays = getHabitCompletionDays(habit.id);
    var pct = habit.totalLength > 0 ? Math.round(doneDays / habit.totalLength * 100) : 0;
    return { done: doneDays, total: habit.totalLength, pct: pct };
  }

  /* ==================================================================
     CARRY-OVER ENGINE
     ================================================================== */
  function getMaxOrder(todos, date) {
    var max = -1;
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].date === date && todos[i].order > max) {
        max = todos[i].order;
      }
    }
    return max;
  }

  function normalizeTodoText(text) {
    return (text || '').trim().toLowerCase();
  }

  // Follow the carriedFrom chain back to the ultimate original row
  // (the one whose carriedFrom is null). When several rows match a date+text
  // lookup, the true original (carriedFrom === null) wins. Returns the
  // farthest reachable row.
  function resolveUltimateRootTodo(todo, todos) {
    var cur = todo;
    var visited = {};
    while (cur.carriedFrom && !visited[cur.id]) {
      visited[cur.id] = true;
      var prev = null;
      for (var i = 0; i < todos.length; i++) {
        var t = todos[i];
        if (t.date === cur.carriedFrom && normalizeTodoText(t.text) === normalizeTodoText(cur.text)) {
          if (t.carriedFrom === null) { prev = t; break; }
          if (!prev) prev = t;
        }
      }
      if (!prev) break;
      cur = prev;
    }
    return cur;
  }

  // Stable identity of a logical carry chain. Anchored on the original row's
  // id whenever that row still exists, so two independently created tasks with
  // the same text are NEVER merged. A chain whose original was deleted/moved
  // (MOVE-based carry) is treated as its own single-row chain.
  function carryChainKey(todo, todos) {
    var root = resolveUltimateRootTodo(todo, todos);
    if (root.carriedFrom === null) return 'root:' + root.id;
    return 'lone:' + todo.id;
  }

  // Find ALL todos in the same carry chain (original + all copies)
  function getCarryChainTodos(todo, todos) {
    var list = todos || state.allTodos;
    var key = carryChainKey(todo, list);
    return list.filter(function(t) {
      return t.taskType === 'todo' && carryChainKey(t, list) === key;
    });
  }

  // Set (or clear) the chain anchor's completion date. The anchor is the row
  // with carriedFrom === null; its completedDate is the "this task is finished,
  // stop carrying forward" signal, kept separate from per-day done flags so
  // history / completion-rate stay accurate per day.
  async function setChainClosed(todo, completedDate) {
    var list = state.allTodos;
    var key = carryChainKey(todo, list);
    var chain = list.filter(function(t) {
      return t.taskType === 'todo' && carryChainKey(t, list) === key;
    });
    var anchor = null;
    for (var i = 0; i < chain.length; i++) {
      if (chain[i].carriedFrom === null) { anchor = chain[i]; break; }
    }
    if (anchor) {
      anchor.completedDate = completedDate;
      try {
        await Sync.updateTodo(anchor.id, { completedDate: completedDate });
      } catch (e) { /* ignore */ }
    }
  }

  // Mark a todo complete for the day it was actually done: only the clicked
  // row becomes done; the anchor is closed (stops future carry-over); future
  // copies are removed. Past copies stay undone so per-day history is accurate.
  async function completeCarryChain(doneTodo) {
    await setChainClosed(doneTodo, doneTodo.date);
    var list = state.allTodos;
    var key = carryChainKey(doneTodo, list);
    var chain = list.filter(function(t) {
      return t.taskType === 'todo' && t.id !== doneTodo.id && carryChainKey(t, list) === key;
    });
    for (var i = 0; i < chain.length; i++) {
      var t = chain[i];
      // Remove any copy dated AFTER the actual completion date (e.g. today's
      // copy when the task was completed on a past date in edit mode).
      if (t.date > doneTodo.date) {
        try { await Sync.deleteTodo(t.id); } catch (e) { /* ignore */ }
        state.allTodos = state.allTodos.filter(function(x) { return x.id !== t.id; });
      }
    }
  }

  // Collapse accidental duplicate copies within a chain. Runs on login /
  // midnight before carry-over. Important: it must NOT delete the per-day
  // history rows — history keeps showing unfinished tasks on each day they
  // were pending. It only removes extra rows that share the same chain+date.
  async function consolidateCarryChains(todos) {
    var groups = {};
    for (var i = 0; i < todos.length; i++) {
      var t = todos[i];
      if (t.taskType === 'ongoing' || t.taskType === 'someday') continue;
      var key = carryChainKey(t, todos);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }

    for (var key in groups) {
      var group = groups[key];
      if (group.length <= 1) continue;

      // A chain with any completed row is finished history: keep every row.
      var hasDone = false;
      for (var d = 0; d < group.length; d++) {
        if (group[d].done) { hasDone = true; break; }
      }
      if (hasDone) continue;

      // All-undone chain: keep at most one row per date. Clean up accidental
      // double copies (e.g. concurrent devices) without touching history.
      var seenDates = {};
      for (var k = 0; k < group.length; k++) {
        var dup = group[k];
        if (seenDates[dup.date]) {
          try { await Sync.deleteTodo(dup.id); } catch (e) { /* ignore */ }
          todos = todos.filter(function(tt) { return tt.id !== dup.id; });
        } else {
          seenDates[dup.date] = true;
        }
      }
    }
    return todos;
  }

  async function runCarryOver(todos) {
    var today = getToday();

    // Copy every undone ORIGINAL todo (carriedFrom === null) from a past date
    // forward to today. The original row STAYS on its date so per-date history
    // keeps showing the unfinished task; only a fresh copy lands on today.
    var originals = [];
    for (var i = 0; i < todos.length; i++) {
      var t = todos[i];
      if (t.taskType === 'ongoing' || t.taskType === 'someday') continue;
      if (t.carriedFrom !== null) continue;
      if (t.done || t.status === 'done') continue;
      if (t.completedDate) continue; // task finished — stop carrying
      if (t.date >= today) continue;
      originals.push(t);
    }
    originals.sort(function(a, b) { return a.date < b.date ? -1 : 1; });

    if (originals.length === 0) {
      localCache.lastActiveDate = today;
      saveLocalCache();
      return todos;
    }

    // Collect carry-chain keys already on today to deduplicate. Dedup is per
    // chain, not per text: two same-text tasks in different chains are
    // independent and both must carry over.
    var todayChainKeys = {};
    for (var j = 0; j < todos.length; j++) {
      if (todos[j].date === today && todos[j].taskType !== 'ongoing' && todos[j].taskType !== 'someday') {
        todayChainKeys[carryChainKey(todos[j], todos)] = true;
      }
    }

    var maxOrder = getMaxOrder(todos, today);
    var newTodos = [];
    for (var m = 0; m < originals.length; m++) {
      var todo = originals[m];
      var chainKey = carryChainKey(todo, todos);
      if (todayChainKeys[chainKey]) continue; // Same chain already on today

      // Inherit flags from the newest row of the chain so pin/highlight/DDL stick
      var chainRows = todos.filter(function(x) {
        return x.taskType === 'todo' && carryChainKey(x, todos) === chainKey;
      });
      var newest = null;
      for (var c = 0; c < chainRows.length; c++) {
        if (!newest || chainRows[c].date > newest.date) newest = chainRows[c];
      }
      var src = newest || todo;

      maxOrder++;
      newTodos.push({
        id: generateId(),
        text: todo.text,
        done: false,
        status: 'active',
        date: today,
        createdAt: new Date().toISOString(),
        carriedFrom: todo.date,
        completedDate: null,
        order: maxOrder,
        pinned: src.pinned || false,
        highlighted: src.highlighted || false,
        deadline: src.deadline || null,
        hasDeadline: src.hasDeadline || false,
        taskType: 'todo',
        ongoingCount: 0,
        lastOngoingDate: null,
        lastOngoingNote: ''
      });
      todayChainKeys[chainKey] = true;
    }

    if (newTodos.length > 0) {
      try {
        await Sync.batchAdd(newTodos);
      } catch (e) {
        console.warn('Carry-over copy sync failed, using local only', e);
      }
      todos = todos.concat(newTodos);
    }

    localCache.lastActiveDate = today;
    saveLocalCache();
    return todos;
  }

  // One-time repair for MOVE-era data: the old carry-over MOVED each undone
  // todo forward, leaving a single "today" row (carriedFrom set) and no
  // per-day history. Materialize the missing days so history shows the task
  // as pending on every date it existed.
  async function repairMovedHistory(todos) {
    var byDate = {};
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].taskType !== 'todo') continue;
      if (!byDate[todos[i].date]) byDate[todos[i].date] = [];
      byDate[todos[i].date].push(todos[i]);
    }

    var toAdd = [];
    for (var j = 0; j < todos.length; j++) {
      var t = todos[j];
      if (t.taskType !== 'todo' || t.done || !t.carriedFrom) continue;
      if (t.date <= t.carriedFrom) continue;

      var start = new Date(t.carriedFrom + 'T00:00:00');
      var end = new Date(t.date + 'T00:00:00');
      var cur = new Date(start);
      while (cur < end) {
        var ds = toDateString(cur);
        var exists = false;
        var rows = byDate[ds];
        if (rows) {
          for (var r = 0; r < rows.length; r++) {
            if (normalizeTodoText(rows[r].text) === normalizeTodoText(t.text)) { exists = true; break; }
          }
        }
        if (!exists) {
          toAdd.push({
            id: generateId(),
            text: t.text,
            done: false,
            status: 'active',
            date: ds,
            createdAt: new Date().toISOString(),
            carriedFrom: (ds === t.carriedFrom) ? null : t.carriedFrom,
            completedDate: null,
            order: 0,
            pinned: t.pinned || false,
            highlighted: t.highlighted || false,
            deadline: t.deadline || null,
            hasDeadline: t.hasDeadline || false,
            taskType: 'todo',
            ongoingCount: 0,
            lastOngoingDate: null,
            lastOngoingNote: ''
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    if (toAdd.length > 0) {
      try {
        await Sync.batchAdd(toAdd);
      } catch (e) {
        console.warn('History repair sync failed', e);
      }
      todos = todos.concat(toAdd);
    }
    return todos;
  }

  /* ==================================================================
     STATUS MIGRATION & DDL EXPIRY CHECK
     ================================================================== */
  async function migrateTodosStatus(todos) {
    var updated = false;
    for (var i = 0; i < todos.length; i++) {
      var t = todos[i];
      if (!t.status) {
        t.status = t.done ? 'done' : 'active';
        try {
          await Sync.updateTodo(t.id, { status: t.status });
          updated = true;
        } catch (e) {
          // PGRST204 or other — status field may not exist yet in DB
          // Continue with in-memory status anyway
        }
      }
    }
    return updated;
  }

  async function checkDeadlineExpiry(todos) {
    var today = getToday();
    var expiredTodos = [];
    for (var i = 0; i < todos.length; i++) {
      var t = todos[i];
      if (t.status === 'active' && t.hasDeadline && t.deadline && t.deadline < today) {
        // Past DDL and still active — mark as expired for display only.
        // Never auto-complete: expiry is a reminder, only a real check counts.
        expiredTodos.push(t);
        t.status = 'expired';
        try {
          await Sync.updateTodo(t.id, { status: 'expired' });
        } catch (e) { /* non-critical — try again next time */ }
      }
    }
    if (expiredTodos.length > 0) {
      var names = expiredTodos.map(function(et) { return '「' + et.text + '」'; }).join('、');
      Toast.show('以下待办已过截止日期，记得完成: ' + names, 5000);
    }
    return expiredTodos.length > 0;
  }

  /* ==================================================================
     APP STATE
     ================================================================== */
  var state = {
    allTodos: [],
    habits: [],
    habitLogs: [],
    ongoingLogs: [], // per-day check-in details for ongoing tasks
    habitViewMode: 'active', // 'active' or 'history'
    currentTab: 'tabToday',
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    statsMonth: new Date().getMonth(),
    statsYear: new Date().getFullYear(),
    modalDate: null,
    deadlinePicker: null,
    historyMode: 'collapse', // 'collapse' or 'expand'
    historyEditMode: false,
    historyExpanded: {}, // track which date cards are expanded
    historyPickedDate: null // date chosen via the history date picker
  };

  /* ==================================================================
     UI RENDERERS
     ================================================================== */

  function getTodosByDate(date) {
    return state.allTodos
      .filter(function(t) { return t.date === date && t.taskType !== 'ongoing' && t.taskType !== 'someday'; })
      .sort(function(a, b) { return a.order - b.order; });
  }

  // -- Today View --
  function renderToday() {
    var today = getToday();
    var todos = getTodosByDate(today);
    var listEl = document.getElementById('todayList');
    var emptyEl = document.getElementById('todayEmpty');

    if (todos.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      renderSomeday();
      return;
    }
    emptyEl.classList.add('hidden');

    // Sort: deadline+pinned first, then undone, then done
    var priority = todos.filter(function(t) { return t.pinned || t.hasDeadline; });
    var normal = todos.filter(function(t) { return !t.pinned && !t.hasDeadline; });
    // Within priority: deadline first, then pinned-only
    priority.sort(function(a, b) {
      if (a.hasDeadline && !b.hasDeadline) return -1;
      if (!a.hasDeadline && b.hasDeadline) return 1;
      return a.order - b.order;
    });
    var priorityUndone = priority.filter(function(t) { return !t.done; });
    var priorityDone = priority.filter(function(t) { return t.done; });
    var normalUndone = normal.filter(function(t) { return !t.done; });
    var normalDone = normal.filter(function(t) { return t.done; });
    var sorted = priorityUndone.concat(priorityDone).concat(normalUndone).concat(normalDone);

    listEl.innerHTML = sorted.map(function(t) {
      var classes = 'todo-item';
      if (t.pinned) classes += ' pinned';
      if (t.highlighted) classes += ' highlighted';
      if (t.hasDeadline) classes += ' has-deadline';
      // Deadline badge
      var deadlineBadge = '';
      if (t.hasDeadline && t.deadline) {
        var remaining = daysBetween(getToday(), t.deadline);
        if (remaining < 0) {
          deadlineBadge = '<span class="todo-badge deadline-overdue" data-action="cancel-deadline" title="点击取消">已逾期' + Math.abs(remaining) + '天</span>';
        } else if (remaining === 0) {
          deadlineBadge = '<span class="todo-badge deadline-today" data-action="cancel-deadline" title="点击取消">今天截止</span>';
        } else {
          deadlineBadge = '<span class="todo-badge deadline-countdown" data-action="cancel-deadline" title="点击取消">剩余' + remaining + '天</span>';
        }
      }
      var isOngoing = t.taskType === 'ongoing';
      if (isOngoing) classes += ' ongoing';
      var badgesHtml = '';
      if (!isOngoing) {
        badgesHtml += deadlineBadge;
        if (t.carriedFrom) badgesHtml += '<span class="todo-badge">从' + formatDateShort(t.carriedFrom) + '开始，已拖' + daysBetween(t.carriedFrom, getToday()) + '天</span>';
      }
      if (isOngoing) {
        return '<div class="' + classes + '" data-id="' + t.id + '">' +
          '<button class="ongoing-btn" data-action="increment" title="打卡+1">+1</button>' +
          '<div class="todo-body">' +
            '<div class="todo-top">' +
              '<span class="todo-text">' + escapeHtml(t.text) + '</span>' +
              '<div class="todo-actions">' +
                '<button class="todo-delete" data-action="delete" aria-label="删除">' +
                  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
              '</div>' +
            '</div>' +
            (t.ongoingCount ? '<div class="todo-badges"><span class="todo-badge ongoing-count">已做' + t.ongoingCount + '天</span></div>' : '') +
            (t.lastOngoingDate === getToday() && t.lastOngoingNote ? '<div class="todo-badges"><span class="todo-badge ongoing-note">' + escapeHtml(t.lastOngoingNote) + '</span></div>' : '') +
          '</div>' +
        '</div>';
      }
      return '<div class="' + classes + '" data-id="' + t.id + '">' +
        '<div class="todo-check' + (t.done ? ' done' : '') + '" data-action="toggle"></div>' +
        '<div class="todo-body">' +
          '<div class="todo-top">' +
            '<span class="todo-text' + (t.done ? ' done' : '') + '">' + escapeHtml(t.text) + '</span>' +
            '<div class="todo-actions">' +
              '<button class="todo-action-btn" data-action="pin" title="' + (t.pinned ? '取消置顶' : '置顶') + '">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (t.pinned ? '#4A6CF7' : 'none') + '" stroke="' + (t.pinned ? '#4A6CF7' : '#9CA3AF') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24Z"/></svg>' +
              '</button>' +
              '<button class="todo-action-btn" data-action="highlight" title="' + (t.highlighted ? '取消高亮' : '高亮') + '">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (t.highlighted ? '#F59E0B' : 'none') + '" stroke="' + (t.highlighted ? '#F59E0B' : '#9CA3AF') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
              '</button>' +
              '<button class="todo-action-btn" data-action="deadline" title="' + (t.hasDeadline ? '修改截止日期' : '设置截止日期') + '">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + (t.hasDeadline ? '#EF4444' : '#9CA3AF') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
              '</button>' +
              '<button class="todo-delete" data-action="delete" aria-label="删除">' +
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
          (badgesHtml ? '<div class="todo-badges">' + badgesHtml + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join('');
    renderSomeday();
  }

  // -- History View --
  function renderHistory() {
    var today = getToday();
    var container = document.getElementById('historyList');
    var emptyEl = document.getElementById('historyEmpty');
    var isExpanded = state.historyMode === 'expand';
    var isEditing = state.historyEditMode;

    // Update edit toggle button
    var editBtn = document.getElementById('historyEditBtn');
    if (editBtn) {
      editBtn.textContent = isEditing ? '退出编辑' : '编辑';
      editBtn.classList.toggle('active', isEditing);
    }
    var historyAddBar = document.getElementById('historyAddBar');
    if (historyAddBar) {
      historyAddBar.classList.toggle('hidden', !isEditing);
    }

    // Set date picker default to today (keep the user's chosen date across re-renders)
    if (!state.historyPickedDate) {
      document.getElementById('historyDatePicker').value = today;
    }

    // Render the unfinished pool (always, even when no history dates exist)
    renderBacklog();

    // Group past todos by date (exclude ongoing/someday — they have their own views)
    var dateGroups = new Map();
    for (var i = 0; i < state.allTodos.length; i++) {
      var t = state.allTodos[i];
      if (t.date >= today) continue;
      if (t.taskType === 'ongoing' || t.taskType === 'someday') continue;
      if (!dateGroups.has(t.date)) dateGroups.set(t.date, []);
      dateGroups.get(t.date).push(t);
    }

    var dates = Array.from(dateGroups.keys()).sort().reverse();

    if (dates.length === 0) {
      container.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    container.innerHTML = dates.map(function(date) {
      var todos = dateGroups.get(date);
      var doneCount = todos.filter(function(t) { return t.done; }).length;
      var total = todos.length;
      var pct = Math.round((doneCount / total) * 100);

      // Ongoing tasks active on this date (prefer per-day detail logs, fall
      // back to lastOngoingDate for legacy rows that predate the logs table)
      var ongoingOnDate = [];
      for (var oi = 0; oi < state.ongoingLogs.length; oi++) {
        var ol = state.ongoingLogs[oi];
        if (ol.date !== date) continue;
        var ot0 = state.allTodos.find(function(t) { return t.id === ol.todoId; });
        if (ot0) ongoingOnDate.push({ text: ot0.text, note: ol.note || '' });
      }
      for (var oi2 = 0; oi2 < state.allTodos.length; oi2++) {
        var ot2 = state.allTodos[oi2];
        if (ot2.taskType === 'ongoing' && ot2.lastOngoingDate === date &&
            !state.ongoingLogs.some(function(l) { return l.todoId === ot2.id && l.date === date; })) {
          ongoingOnDate.push({ text: ot2.text, note: ot2.lastOngoingNote || '' });
        }
      }

      // Habit check-ins on this date
      var habitsOnDate = state.habitLogs.filter(function(l) {
        return l.date === date && l.done;
      }).map(function(l) {
        var h = state.habits.find(function(hb) { return hb.id === l.habitId; });
        return h ? { name: h.content, note: l.note || '' } : null;
      }).filter(Boolean);

      var extraItems = '';
      if (ongoingOnDate.length > 0 || habitsOnDate.length > 0) {
        extraItems = '<div class="history-extra">';
        for (var oi3 = 0; oi3 < ongoingOnDate.length; oi3++) {
          var od = ongoingOnDate[oi3];
          extraItems += '<div class="todo-row ongoing-row"><div class="indicator ongoing"></div><span class="txt">' + escapeHtml(od.text) + (od.note ? ' — ' + escapeHtml(od.note) : '') + '</span></div>';
        }
        for (var hi = 0; hi < habitsOnDate.length; hi++) {
          var hd = habitsOnDate[hi];
          extraItems += '<div class="todo-row habit-row"><div class="indicator habit"></div><span class="txt">打卡: ' + escapeHtml(hd.name) + (hd.note ? ' — ' + escapeHtml(hd.note) : '') + '</span></div>';
        }
        extraItems += '</div>';
      }

      var cardExpanded = isExpanded || state.historyExpanded[date];
      return '<div class="history-card' + (cardExpanded ? ' expanded' : '') + '" data-date="' + date + '">' +
        '<div class="history-card-header">' +
          '<div class="date-info">' +
            '<div class="date-label">' + formatDateShort(date) + '</div>' +
            '<div class="date-weekday">' + getWeekday(date) + '</div>' +
          '</div>' +
          '<div class="progress-info">' +
            '<div>' + doneCount + '/' + total + ' 完成</div>' +
            '<div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:' + pct + '%"></div></div>' +
          '</div>' +
          '<svg class="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</div>' +
        '<div class="history-card-body">' +
          todos.map(function(t) {
            if (isEditing) {
              var isExpiredE = t.status === 'expired';
              var ddlInfoE = '';
              if (t.hasDeadline && t.deadline) {
                ddlInfoE = ' <span class="todo-badge deadline-countdown" style="font-size:10px;padding:1px 4px;margin-left:4px;cursor:pointer;" data-action="history-deadline" data-id="' + t.id + '" title="点击修改DDL">DDL: ' + formatDateShort(t.deadline) + '</span>';
              }
              var expiredTagE = '';
              if (isExpiredE) {
                expiredTagE = ' <span class="todo-badge deadline-overdue" style="font-size:10px;padding:1px 4px;margin-left:4px;">已过期</span>';
              }
              return '<div class="todo-row" data-id="' + t.id + '">' +
                '<button class="history-toggle-btn" data-action="history-toggle" title="切换完成状态">' +
                  '<div class="indicator ' + (isExpiredE ? 'expired' : (t.done ? 'done' : 'undone')) + '"></div>' +
                '</button>' +
                '<span class="txt' + (t.done ? ' was-done' : '') + '">' + escapeHtml(t.text) + ddlInfoE + expiredTagE + '</span>' +
                '<button class="history-delete-btn" data-action="history-delete" title="删除">' +
                  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
                '</div>';
            }
            var isExpired = t.status === 'expired';
            var ddlInfo = '';
            if (t.hasDeadline && t.deadline) {
              ddlInfo = ' <span class="todo-badge deadline-countdown" style="font-size:10px;padding:1px 4px;margin-left:4px;">DDL: ' + formatDateShort(t.deadline) + '</span>';
            }
            var expiredTag = '';
            if (isExpired) {
              expiredTag = ' <span class="todo-badge deadline-overdue" style="font-size:10px;padding:1px 4px;margin-left:4px;">已过期</span>';
            }
            return '<div class="todo-row">' +
              '<div class="indicator ' + (isExpired ? 'expired' : (t.done ? 'done' : 'undone')) + '"></div>' +
              '<span class="txt' + (t.done ? ' was-done' : '') + '">' + escapeHtml(t.text) + ddlInfo + expiredTag + '</span>' +
              '</div>';
          }).join('') +
          // Add-to-date button in edit mode
          (isEditing ? '<div class="history-add-to-date"><button class="btn-small" data-action="add-to-date" data-date="' + date + '">+ 添加到此日期</button></div>' : '') +
          extraItems +
        '</div>' +
      '</div>';
    }).join('');
  }

  // -- Unfinished pool (未办池) --
  function renderBacklog() {
    var listEl = document.getElementById('backlogList');
    var emptyEl = document.getElementById('backlogEmpty');
    var countEl = document.getElementById('backlogCount');
    var today = getToday();

    var items = state.allTodos.filter(function(t) {
      if (t.taskType !== 'todo' || t.done || t.date > today) return false;
      // Exclude finished chains: the anchor's completedDate marks the task as
      // done (even though its per-day history copies remain "undone").
      var root = resolveUltimateRootTodo(t, state.allTodos);
      if (root.carriedFrom === null && root.completedDate) return false;
      return true;
    });
    // Deduplicate by carry chain: one entry per logical task (the newest row,
    // which is the current "live" copy). History rows stay visible in the
    // history view, not here.
    items.sort(function(a, b) { return a.date < b.date ? 1 : -1; });
    var seen = {};
    items = items.filter(function(t) {
      var key = carryChainKey(t, state.allTodos);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
    items.sort(function(a, b) {
      var ra = a.carriedFrom || a.date;
      var rb = b.carriedFrom || b.date;
      if (ra !== rb) return ra < rb ? -1 : 1;
      return a.date < b.date ? -1 : 1;
    });

    if (countEl) countEl.textContent = items.length;

    if (items.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    listEl.innerHTML = items.map(function(t) {
      var origin = t.carriedFrom || t.date;
      var age = daysBetween(origin, today);
      var ageHtml = '';
      if (age > 0) {
        ageHtml = '<span class="backlog-age">从' + formatDateShort(origin) + '开始，已拖' + age + '天</span>';
      } else if (t.date < today) {
        ageHtml = '<span class="backlog-age">' + formatDateShort(t.date) + ' 未完成</span>';
      }
      return '<div class="backlog-item" data-id="' + t.id + '">' +
        '<button class="backlog-done-btn" data-action="backlog-done" title="标记完成">' +
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</button>' +
        '<span class="backlog-text">' + escapeHtml(t.text) + '</span>' +
        ageHtml +
        '<button class="backlog-delete-btn" data-action="backlog-delete" title="删除">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>';
    }).join('');
  }

  // -- Calendar View --
  function renderCalendar() {
    var year = state.calendarYear;
    var month = state.calendarMonth;

    document.getElementById('calMonthLabel').textContent = year + '年' + (month + 1) + '月';

    var dateMap = getDatesWithTodo();
    var today = getToday();

    var grid = document.getElementById('calendarGrid');
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var prevMonthDays = new Date(year, month, 0).getDate();

    var cells = [];

    // Previous month fillers
    for (var i = firstDay - 1; i >= 0; i--) {
      var d = prevMonthDays - i;
      var m = month - 1;
      var y = year;
      if (m < 0) { m = 11; y--; }
      var dateStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      cells.push({ day: d, dateStr: dateStr, otherMonth: true });
    }

    // Current month
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      cells.push({ day: d, dateStr: dateStr, otherMonth: false });
    }

    // Next month fillers
    var remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (var d = 1; d <= remaining; d++) {
        var m = month + 1;
        var y = year;
        if (m > 11) { m = 0; y++; }
        var dateStr = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        cells.push({ day: d, dateStr: dateStr, otherMonth: true });
      }
    }

    grid.innerHTML = cells.map(function(cell) {
      var cls = 'calendar-cell';
      if (cell.otherMonth) cls += ' other-month';
      if (cell.dateStr === today) cls += ' today';

      var dotHtml = '';
      var info = dateMap.get(cell.dateStr);
      if (info) {
        var dotClass = 'dot-blue';
        if (cell.dateStr > today) {
          dotClass = 'dot-blue';
        } else if (info.done === info.total) {
          dotClass = 'dot-green';
        } else {
          dotClass = 'dot-orange';
        }
        dotHtml = '<span class="dot ' + dotClass + '"></span>';
      }

      return '<div class="' + cls + '" data-date="' + cell.dateStr + '">' +
        '<span class="cal-day-num">' + cell.day + '</span>' + dotHtml +
      '</div>';
    }).join('');

    // Render stats for the independent stats month
    renderStats();
  }

  function renderStats() {
    var monthStr = state.statsYear + '-' + String(state.statsMonth + 1).padStart(2, '0');
    // Per-day aggregation: sum of completed "task-days" / sum of all "task-days".
    // Each row = one task on one date, so a task pending 3 days counts 3 times
    // (matches the desired (1+2)/(3+4) formula across days).
    var totalInMonth = 0, doneInMonth = 0;
    for (var i = 0; i < state.allTodos.length; i++) {
      var t = state.allTodos[i];
      if (t.taskType === 'ongoing' || t.taskType === 'someday') continue;
      if (t.date.substring(0, 7) === monthStr) {
        totalInMonth++;
        if (t.done) doneInMonth++;
      }
    }

    document.getElementById('statsMonthLabel').textContent = state.statsYear + '年' + (state.statsMonth + 1) + '月';
    document.getElementById('statTotal').textContent = totalInMonth;
    document.getElementById('statDone').textContent = doneInMonth;
    document.getElementById('statUndone').textContent = totalInMonth - doneInMonth;
    document.getElementById('statRate').textContent = totalInMonth > 0 ? Math.round(doneInMonth / totalInMonth * 100) + '%' : '-';
  }

  // -- Habits View --
  function renderHabits() {
    // Update toggle buttons
    var activeBtn = document.getElementById('habitViewActive');
    var histBtn = document.getElementById('habitViewHistory');
    if (activeBtn && histBtn) {
      activeBtn.classList.toggle('active', state.habitViewMode === 'active');
      histBtn.classList.toggle('active', state.habitViewMode === 'history');
    }
    // Show/hide config area
    var configPanel = document.getElementById('habitConfigPanel');
    var addBar = document.getElementById('habitsAddBar');

    if (state.habitViewMode === 'active') {
      if (addBar) addBar.classList.remove('hidden');
      if (configPanel && configPanel._wasOpen) configPanel.classList.remove('hidden');
      renderHabitsActive();
    } else {
      if (configPanel) { configPanel._wasOpen = !configPanel.classList.contains('hidden'); configPanel.classList.add('hidden'); }
      if (addBar) addBar.classList.add('hidden');
      renderHabitHistory();
    }
  }

  function renderHabitsActive() {
    var listEl = document.getElementById('habitsList');
    var emptyEl = document.getElementById('habitsEmpty');
    // Collect ongoing tasks (taskType === 'ongoing') to display as free-form cards
    var ongoingTasks = state.allTodos.filter(function(t) { return t.taskType === 'ongoing'; });
    var hasContent = state.habits.length > 0 || ongoingTasks.length > 0;

    if (!hasContent) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    var today = getToday();
    var html = '';

    // Regular habits
    for (var i = 0; i < state.habits.length; i++) {
      var h = state.habits[i];
      var progress = getHabitProgress(h);
      var doneToday = isHabitDoneToday(h.id);
      var periodLabel = h.periodType === 'daily' ? '每日' :
                        h.periodType === 'weekly' ? '每' + h.periodCount + '周' :
                        '每月';
      html += '<div class="habit-card" data-id="' + h.id + '" data-type="habit">' +
        '<div class="habit-header">' +
          '<span class="habit-content" data-action="edit-habit-name" title="点击编辑名称">' + escapeHtml(h.content) + '</span>' +
          '<div class="habit-header-actions">' +
            '<button class="habit-edit" data-action="view-habit-history" title="历史回放">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
            '</button>' +
            '<button class="habit-edit" data-action="edit-habit-params" title="编辑参数">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            '</button>' +
            '<button class="habit-delete" data-action="delete-habit" aria-label="删除">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="habit-meta">' +
          '<span>' + periodLabel + ' · 目标' + h.totalLength + '次 · 从' + formatDateFull(h.startDate) + '开始</span>' +
          '<span>已完成 ' + progress.done + ' / ' + progress.total + '</span>' +
        '</div>' +
        '<div class="habit-progress-bar">' +
          '<div class="habit-progress-fill" style="width:' + progress.pct + '%"></div>' +
        '</div>' +
        '<button class="habit-check-btn' + (doneToday ? ' checked' : '') + '" data-action="check-habit">' +
          (doneToday ? '今日已打卡 ✓' : '打卡') +
        '</button>' +
      '</div>';
    }

    // Ongoing tasks as free-form cards
    for (var j = 0; j < ongoingTasks.length; j++) {
      var ot = ongoingTasks[j];
      var otdoneToday = ot.lastOngoingDate === today;
      html += '<div class="habit-card ongoing-card" data-id="' + ot.id + '" data-type="ongoing">' +
        '<div class="habit-header">' +
          '<span class="habit-content ongoing-name" data-action="edit-ongoing-name" title="点击编辑名称">' + escapeHtml(ot.text) + '</span>' +
          '<div class="habit-header-actions">' +
            '<button class="habit-edit" data-action="view-ongoing-history" title="历史回放">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
            '</button>' +
            '<button class="habit-edit" data-action="edit-ongoing-params" title="编辑">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            '</button>' +
            '<button class="habit-delete" data-action="delete-ongoing" aria-label="删除">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="habit-meta">' +
          '<span>自由打卡 · 从' + formatDateFull(ot.date) + '开始</span>' +
          '<span>已做 ' + (ot.ongoingCount || 0) + ' 天</span>' +
        '</div>' +
        '<div class="habit-progress-bar">' +
          '<div class="habit-progress-fill ongoing-fill" style="width:' + Math.min((ot.ongoingCount || 0) * 5, 100) + '%"></div>' +
        '</div>' +
        (ot.lastOngoingDate === today && ot.lastOngoingNote ?
          '<div class="ongoing-note-display">' + escapeHtml(ot.lastOngoingNote) + '</div>' : '') +
        '<button class="habit-check-btn ongoing-check-btn' + (otdoneToday ? ' checked' : '') + '" data-action="check-ongoing">' +
          (otdoneToday ? '今日已打卡 ✓' : '打卡+1') +
        '</button>' +
      '</div>';
    }

    listEl.innerHTML = html;
  }

  function renderHabitHistory() {
    var listEl = document.getElementById('habitsList');
    var emptyEl = document.getElementById('habitsEmpty');
    var today = getToday();

    // Collect all dates that have habit logs or ongoing activity
    var allDates = new Set();
    for (var i = 0; i < state.habitLogs.length; i++) {
      if (state.habitLogs[i].date <= today) allDates.add(state.habitLogs[i].date);
    }
    for (var j = 0; j < state.allTodos.length; j++) {
      var t = state.allTodos[j];
      if (t.taskType === 'ongoing' && t.lastOngoingDate && t.lastOngoingDate <= today) {
        allDates.add(t.lastOngoingDate);
      }
    }
    for (var k = 0; k < state.ongoingLogs.length; k++) {
      if (state.ongoingLogs[k].date <= today) allDates.add(state.ongoingLogs[k].date);
    }

    var dates = Array.from(allDates).sort().reverse();
    if (dates.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    listEl.innerHTML = dates.map(function(date) {
      var items = [];

      // Habit logs for this date
      for (var hi = 0; hi < state.habitLogs.length; hi++) {
        var l = state.habitLogs[hi];
        if (l.date === date && l.done) {
          var h = state.habits.find(function(hb) { return hb.id === l.habitId; });
          if (h) items.push('<div class="todo-row habit-row"><div class="indicator habit"></div><span class="txt">打卡: ' + escapeHtml(h.content) + (l.note ? ' — ' + escapeHtml(l.note) : '') + '</span></div>');
        }
      }

      // Ongoing task activity for this date (prefer detail logs, fall back to legacy rows)
      for (var oi = 0; oi < state.ongoingLogs.length; oi++) {
        var ol = state.ongoingLogs[oi];
        if (ol.date !== date) continue;
        var otl = state.allTodos.find(function(t2) { return t2.id === ol.todoId; });
        if (otl) items.push('<div class="todo-row ongoing-row"><div class="indicator ongoing"></div><span class="txt">' + escapeHtml(otl.text) + (ol.note ? ' — ' + escapeHtml(ol.note) : '') + '</span></div>');
      }
      for (var oi2 = 0; oi2 < state.allTodos.length; oi2++) {
        var ot2 = state.allTodos[oi2];
        if (ot2.taskType === 'ongoing' && ot2.lastOngoingDate === date &&
            !state.ongoingLogs.some(function(l2) { return l2.todoId === ot2.id && l2.date === date; })) {
          items.push('<div class="todo-row ongoing-row"><div class="indicator ongoing"></div><span class="txt">' + escapeHtml(ot2.text) + (ot2.lastOngoingNote ? ' — ' + escapeHtml(ot2.lastOngoingNote) : '') + '</span></div>');
        }
      }

      if (items.length === 0) return '';

      return '<div class="history-card expanded" data-date="' + date + '">' +
        '<div class="history-card-header">' +
          '<div class="date-info">' +
            '<div class="date-label">' + formatDateShort(date) + '</div>' +
            '<div class="date-weekday">' + getWeekday(date) + '</div>' +
          '</div>' +
          '<div class="progress-info"><div>' + items.length + ' 项活动</div></div>' +
        '</div>' +
        '<div class="history-card-body">' + items.join('') + '</div>' +
      '</div>';
    }).join('').replace(/<div class="history-card expanded" data-date=""><\/div>/g, '');
  }

  var habitReminderShownFor = null;

  function showHabitReminder() {
    var today = getToday();
    if (habitReminderShownFor === today) return;
    var unchecked = [];
    for (var i = 0; i < state.habits.length; i++) {
      if (!isHabitDoneToday(state.habits[i].id)) unchecked.push(state.habits[i]);
    }
    if (unchecked.length === 0) return;
    habitReminderShownFor = today;
    var names = unchecked.map(function(h) { return h.content; }).join('、');
    Toast.show('今日未打卡: ' + names, 4000);
  }

  // -- Modal --
  function openModal(dateStr) {
    state.modalDate = dateStr;
    var today = getToday();
    var isEditable = dateStr >= today;

    document.getElementById('modalTitle').textContent = formatDateShort(dateStr) + ' ' + getWeekday(dateStr);

    var addBar = document.getElementById('modalAddBar');
    if (isEditable) {
      addBar.classList.remove('hidden');
    } else {
      addBar.classList.add('hidden');
    }

    renderModalList();
    document.getElementById('modalOverlay').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    state.modalDate = null;
  }

  function renderModalList() {
    if (!state.modalDate) return;
    var todos = getTodosByDate(state.modalDate);
    var listEl = document.getElementById('modalList');
    var emptyEl = document.getElementById('modalEmpty');

    if (todos.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    var today = getToday();
    var isEditable = state.modalDate >= today;
    // Sort: deadline+pinned first, then undone, then done
    var priority = todos.filter(function(t) { return t.pinned || t.hasDeadline; });
    var normal = todos.filter(function(t) { return !t.pinned && !t.hasDeadline; });
    priority.sort(function(a, b) {
      if (a.hasDeadline && !b.hasDeadline) return -1;
      if (!a.hasDeadline && b.hasDeadline) return 1;
      return a.order - b.order;
    });
    var priorityUndone = priority.filter(function(t) { return !t.done; });
    var priorityDone = priority.filter(function(t) { return t.done; });
    var normalUndone = normal.filter(function(t) { return !t.done; });
    var normalDone = normal.filter(function(t) { return t.done; });
    var sorted = priorityUndone.concat(priorityDone).concat(normalUndone).concat(normalDone);

    listEl.innerHTML = sorted.map(function(t) {
      var isOngoing = t.taskType === 'ongoing';
      var cls = 'todo-item';
      if (t.pinned) cls += ' pinned';
      if (t.highlighted) cls += ' highlighted';
      if (t.hasDeadline) cls += ' has-deadline';
      if (isOngoing) cls += ' ongoing';
      // Deadline badge
      var deadlineBadge = '';
      if (t.hasDeadline && t.deadline) {
        var remaining = daysBetween(getToday(), t.deadline);
        if (remaining < 0) {
          deadlineBadge = '<span class="todo-badge deadline-overdue" data-action="cancel-deadline" title="点击取消">已逾期' + Math.abs(remaining) + '天</span>';
        } else if (remaining === 0) {
          deadlineBadge = '<span class="todo-badge deadline-today" data-action="cancel-deadline" title="点击取消">今天截止</span>';
        } else {
          deadlineBadge = '<span class="todo-badge deadline-countdown" data-action="cancel-deadline" title="点击取消">剩余' + remaining + '天</span>';
        }
      }
      var badgesHtml = '';
      if (!isOngoing) {
        badgesHtml += deadlineBadge;
        if (t.carriedFrom) badgesHtml += '<span class="todo-badge">从' + formatDateShort(t.carriedFrom) + '开始，已拖' + daysBetween(t.carriedFrom, getToday()) + '天</span>';
      }
      var html = '<div class="' + cls + '" data-id="' + t.id + '">';
      if (isOngoing) {
        html += '<button class="ongoing-btn" data-action="increment" title="打卡+1">+1</button>' +
          '<div class="todo-body">' +
            '<div class="todo-top">' +
              '<span class="todo-text">' + escapeHtml(t.text) + '</span>' +
              (isEditable ? '<div class="todo-actions">' +
                '<button class="todo-delete" data-action="delete" aria-label="删除">' +
                  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
              '</div>' : '') +
            '</div>' +
            (t.ongoingCount ? '<div class="todo-badges"><span class="todo-badge ongoing-count">已做' + t.ongoingCount + '天</span></div>' : '') +
            (t.lastOngoingDate === today && t.lastOngoingNote ? '<div class="todo-badges"><span class="todo-badge ongoing-note">' + escapeHtml(t.lastOngoingNote) + '</span></div>' : '') +
          '</div>';
      } else if (isEditable) {
        html += '<div class="todo-check' + (t.done ? ' done' : '') + '" data-action="toggle"></div>' +
          '<div class="todo-body">' +
            '<div class="todo-top">' +
              '<span class="todo-text' + (t.done ? ' done' : '') + '">' + escapeHtml(t.text) + '</span>' +
              '<div class="todo-actions">' +
                '<button class="todo-action-btn" data-action="pin" title="' + (t.pinned ? '取消置顶' : '置顶') + '">' +
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (t.pinned ? '#4A6CF7' : 'none') + '" stroke="' + (t.pinned ? '#4A6CF7' : '#9CA3AF') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24Z"/></svg>' +
                '</button>' +
                '<button class="todo-action-btn" data-action="highlight" title="' + (t.highlighted ? '取消高亮' : '高亮') + '">' +
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (t.highlighted ? '#F59E0B' : 'none') + '" stroke="' + (t.highlighted ? '#F59E0B' : '#9CA3AF') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
                '</button>' +
                '<button class="todo-action-btn" data-action="deadline" title="' + (t.hasDeadline ? '修改截止日期' : '设置截止日期') + '">' +
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + (t.hasDeadline ? '#EF4444' : '#9CA3AF') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
                '</button>' +
                '<button class="todo-delete" data-action="delete" aria-label="删除">' +
                  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                '</button>' +
              '</div>' +
            '</div>' +
            (badgesHtml ? '<div class="todo-badges">' + badgesHtml + '</div>' : '') +
          '</div>';
      } else {
        html += '<div class="indicator ' + (t.done ? 'done' : 'undone') + '" style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:' + (t.done ? 'var(--green)' : 'var(--orange)') + '"></div>' +
          '<div class="todo-body">' +
            '<div class="todo-top">' +
              '<span class="todo-text' + (t.done ? ' done' : '') + '">' + escapeHtml(t.text) + '</span>' +
            '</div>' +
            (badgesHtml ? '<div class="todo-badges">' + badgesHtml + '</div>' : '') +
            (t.pinned ? '<div class="todo-badges"><span class="todo-badge">已置顶</span></div>' : '') +
            (t.highlighted ? '<div class="todo-badges"><span class="todo-badge">已高亮</span></div>' : '') +
          '</div>';
      }
      html += '</div>';
      return html;
    }).join('');
  }

  // -- Shared render helpers --
  function renderCurrentView() {
    if (state.currentTab === 'tabToday') renderToday();
    else if (state.currentTab === 'tabHistory') renderHistory();
    else if (state.currentTab === 'tabCalendar') renderCalendar();
    else if (state.currentTab === 'tabHabits') renderHabits();
  }

  function updateHeaderDate() {
    document.getElementById('headerDate').textContent = formatDate(getToday());
  }

  function getDatesWithTodo() {
    var map = new Map();
    for (var i = 0; i < state.allTodos.length; i++) {
      var t = state.allTodos[i];
      if (t.taskType === 'ongoing' || t.taskType === 'someday') continue;
      if (!map.has(t.date)) map.set(t.date, { total: 0, done: 0 });
      var entry = map.get(t.date);
      entry.total++;
      if (t.done) entry.done++;
    }
    return map;
  }

  /* ==================================================================
     EVENT HANDLERS
     ================================================================== */

  // Shared helper: detect auth errors and force re-login if needed
  function isAuthError(e) {
    if (e && (e.status === 401 || e.status === 403 || e.code === 'PGRST301' ||
        (e.message && (e.message.indexOf('JWT') !== -1 || e.message.indexOf('auth') !== -1)))) {
      Toast.show('登录已过期，请重新登录');
      document.getElementById('appPage').classList.add('hidden');
      document.getElementById('authPage').classList.remove('hidden');
      return true;
    }
    return false;
  }

  // Add todo
  async function handleAdd(text, dateStr) {
    dateStr = dateStr || getToday();
    var all = state.allTodos.filter(function(t) { return t.date === dateStr; });
    var maxOrder = all.reduce(function(m, t) { return Math.max(m, t.order); }, -1);
    var todo = {
      id: generateId(),
      text: text,
      done: false,
      status: 'active',
      date: dateStr,
      createdAt: new Date().toISOString(),
      carriedFrom: null,
      completedDate: null,
      order: maxOrder + 1,
      pinned: false,
      highlighted: false,
      deadline: null,
      hasDeadline: false,
      taskType: 'todo',
      ongoingCount: 0,
      lastOngoingDate: null,
      lastOngoingNote: ''
    };
    try {
      await Sync.addTodo(todo);
      state.allTodos.push(todo);
      renderCurrentView();
      if (state.modalDate === dateStr) renderModalList();
      saveLocalCache();
    } catch (e) {
      console.error('Sync add failed — full error:', e);
      if (isAuthError(e)) return;
      Toast.show('保存失败，请检查网络后刷新');
      // Don't add to local state — data integrity: if it's not on the server,
      // showing it locally would cause data loss confusion on next refresh
    }
  }

  // Toggle todo
  async function handleToggle(id) {
    var idx = -1;
    for (var i = 0; i < state.allTodos.length; i++) {
      if (state.allTodos[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    var todo = state.allTodos[idx];
    if (todo.taskType === 'ongoing') return;
    var newDone = !todo.done;
    var newStatus = newDone ? 'done' : 'active';
    try {
      await Sync.updateTodo(id, { done: newDone, status: newStatus });
      todo.done = newDone;
      todo.status = newStatus;
      if (newDone) {
        await completeCarryChain(todo);
      } else {
        await setChainClosed(todo, null); // re-open a finished task
      }
      renderCurrentView();
      if (state.modalDate) renderModalList();
      saveLocalCache();
    } catch (e) {
      console.warn('Sync toggle failed', e);
      if (isAuthError(e)) return;
      Toast.show('同步失败，请检查网络');
      // Don't update local state — if sync fails, keep the original state
    }
  }

  // Delete a todo. When deleting the newest row of a carry chain (the live
  // copy on today / backlog), remove the whole chain — the task is cancelled.
  // When deleting an older history row (edit mode), remove only that row.
  async function deleteTodoWithChain(todo) {
    var chain = getCarryChainTodos(todo);
    var newest = null;
    for (var i = 0; i < chain.length; i++) {
      if (!newest || chain[i].date > newest.date) newest = chain[i];
    }
    var idsToDelete = (newest && newest.id === todo.id)
      ? chain.map(function(t) { return t.id; })
      : [todo.id];
    for (var d = 0; d < idsToDelete.length; d++) {
      await Sync.deleteTodo(idsToDelete[d]);
    }
    var removeSet = {};
    for (var r = 0; r < idsToDelete.length; r++) removeSet[idsToDelete[r]] = true;
    state.allTodos = state.allTodos.filter(function(x) { return !removeSet[x.id]; });
    if (todo.taskType === 'ongoing') {
      state.ongoingLogs = state.ongoingLogs.filter(function(l) { return l.todoId !== todo.id; });
    }
  }

  // Delete todo
  async function handleDelete(id) {
    var idx = -1;
    for (var i = 0; i < state.allTodos.length; i++) {
      if (state.allTodos[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    var todo = state.allTodos[idx];
    try {
      await deleteTodoWithChain(todo);
      renderCurrentView();
      if (state.modalDate) renderModalList();
      saveLocalCache();
      Toast.show('已删除');
    } catch (e) {
      console.warn('Sync delete failed', e);
      if (isAuthError(e)) return;
      Toast.show('删除失败，请检查网络');
      // Don't remove from local state — if sync fails, keep the todo
    }
  }

  // Pin toggle
  async function handlePin(id) {
    var todo = state.allTodos.find(function(t) { return t.id === id; });
    if (!todo) return;
    var newPinned = !todo.pinned;
    try {
      await Sync.updateTodo(id, { pinned: newPinned });
      todo.pinned = newPinned;
      renderCurrentView();
      if (state.modalDate) renderModalList();
      saveLocalCache();
    } catch (e) {
      console.warn('Sync pin failed', e);
      Toast.show('同步失败，请检查网络');
      // Don't update local state — if sync fails, keep original
    }
  }

  // Highlight toggle
  async function handleHighlight(id) {
    var todo = state.allTodos.find(function(t) { return t.id === id; });
    if (!todo) return;
    var newHighlighted = !todo.highlighted;
    try {
      await Sync.updateTodo(id, { highlighted: newHighlighted });
      todo.highlighted = newHighlighted;
      renderCurrentView();
      if (state.modalDate) renderModalList();
      saveLocalCache();
    } catch (e) {
      console.warn('Sync highlight failed', e);
      Toast.show('同步失败，请检查网络');
      // Don't update local state — if sync fails, keep original
    }
  }

  // Set deadline
  async function handleSetDeadline(id, deadlineValue) {
    var todo = state.allTodos.find(function(t) { return t.id === id; });
    if (!todo) return;
    try {
      if (deadlineValue === null) {
        await Sync.updateTodo(id, { deadline: null, hasDeadline: false });
        todo.deadline = null;
        todo.hasDeadline = false;
      } else {
        // Setting/renewing a DDL re-activates the todo if it was expired
        var needsReactivate = todo.status === 'expired';
        await Sync.updateTodo(id, { deadline: deadlineValue, hasDeadline: true, status: needsReactivate ? 'active' : undefined, done: needsReactivate ? false : undefined });
        todo.deadline = deadlineValue;
        todo.hasDeadline = true;
        if (needsReactivate) {
          todo.status = 'active';
          todo.done = false;
        }
      }
      // Propagate DDL to all items in the same carry chain
      var chainTodos = getCarryChainTodos(todo);
      for (var ci = 0; ci < chainTodos.length; ci++) {
        var ct = chainTodos[ci];
        if (ct.id === todo.id) continue;
        try {
          if (deadlineValue === null) {
            await Sync.updateTodo(ct.id, { deadline: null, hasDeadline: false });
            ct.deadline = null;
            ct.hasDeadline = false;
          } else {
            var ctNeedsReactivate = ct.status === 'expired';
            await Sync.updateTodo(ct.id, { deadline: deadlineValue, hasDeadline: true, status: ctNeedsReactivate ? 'active' : undefined, done: ctNeedsReactivate ? false : undefined });
            ct.deadline = deadlineValue;
            ct.hasDeadline = true;
            if (ctNeedsReactivate) {
              ct.status = 'active';
              ct.done = false;
            }
          }
        } catch (chainErr) { /* non-critical */ }
      }
      renderCurrentView();
      if (state.modalDate) renderModalList();
      saveLocalCache();
    } catch (e) {
      console.warn('Sync setDeadline failed', e);
    }
  }

  // Legacy prompt picker kept only as fallback reference; current UI uses the calendar picker below.
  function handleDeadlineClickLegacy(id) {
    var todo = state.allTodos.find(function(t) { return t.id === id; });
    if (!todo) return;
    // If already has deadline, offer to cancel or change
    if (todo.hasDeadline && todo.deadline) {
      var choice = prompt('截止日期: ' + todo.deadline + '\n输入新日期修改，输入"取消"移除截止日期，留空不变', todo.deadline);
      if (choice === null) return;
      if (choice.trim().toLowerCase() === '取消' || choice.trim() === '') {
        // Cancel: blank means cancel too (but distinguish from "don't change")
        if (choice.trim().toLowerCase() === '取消') {
          handleSetDeadline(id, null);
          return;
        }
        // blank = no change
        return;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(choice.trim())) {
        handleSetDeadline(id, choice.trim());
      }
      return;
    }
    // No deadline set — use prompt for simplicity and cross-platform reliability
    var val = prompt('设置截止日期 (YYYY-MM-DD):', getToday());
    if (val === null) return;
    if (val.trim() === '') {
      handleSetDeadline(id, null);
      return;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
      handleSetDeadline(id, val.trim());
    } else {
      Toast.show('日期格式错误，请使用 YYYY-MM-DD');
    }
  }

  function toDateString(dateObj) {
    return dateObj.getFullYear() + '-' +
      String(dateObj.getMonth() + 1).padStart(2, '0') + '-' +
      String(dateObj.getDate()).padStart(2, '0');
  }

  function ensureDeadlinePicker() {
    var existing = document.getElementById('deadlinePickerOverlay');
    if (existing) return existing;
    var overlay = document.createElement('div');
    overlay.id = 'deadlinePickerOverlay';
    overlay.className = 'deadline-picker-overlay hidden';
    overlay.innerHTML =
      '<div class="deadline-picker-sheet">' +
        '<div class="deadline-picker-header">' +
          '<button class="btn-icon" data-action="deadline-prev" aria-label="上一月">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>' +
          '</button>' +
          '<div class="deadline-picker-title" id="deadlinePickerTitle"></div>' +
          '<button class="btn-icon" data-action="deadline-next" aria-label="下一月">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="deadline-picker-weekdays"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div>' +
        '<div class="deadline-picker-grid" id="deadlinePickerGrid"></div>' +
        '<div class="deadline-picker-actions">' +
          '<button class="deadline-picker-btn" data-action="deadline-today">今天</button>' +
          '<button class="deadline-picker-btn danger" data-action="deadline-clear">取消DDL</button>' +
          '<button class="deadline-picker-btn" data-action="deadline-close">关闭</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeDeadlinePicker();
        return;
      }
      var action = e.target.closest('[data-action]');
      if (!action || !state.deadlinePicker) return;
      var act = action.dataset.action;
      if (act === 'deadline-prev') {
        state.deadlinePicker.month--;
        if (state.deadlinePicker.month < 0) {
          state.deadlinePicker.month = 11;
          state.deadlinePicker.year--;
        }
        renderDeadlinePicker();
      } else if (act === 'deadline-next') {
        state.deadlinePicker.month++;
        if (state.deadlinePicker.month > 11) {
          state.deadlinePicker.month = 0;
          state.deadlinePicker.year++;
        }
        renderDeadlinePicker();
      } else if (act === 'deadline-date') {
        handleSetDeadline(state.deadlinePicker.todoId, action.dataset.date);
        closeDeadlinePicker();
      } else if (act === 'deadline-today') {
        handleSetDeadline(state.deadlinePicker.todoId, getToday());
        closeDeadlinePicker();
      } else if (act === 'deadline-clear') {
        handleSetDeadline(state.deadlinePicker.todoId, null);
        closeDeadlinePicker();
      } else if (act === 'deadline-close') {
        closeDeadlinePicker();
      }
    });
    return overlay;
  }

  function renderDeadlinePicker() {
    var picker = state.deadlinePicker;
    if (!picker || !picker.todoId) return;
    var title = document.getElementById('deadlinePickerTitle');
    var grid = document.getElementById('deadlinePickerGrid');
    if (!title || !grid) return;
    title.textContent = picker.year + '年' + (picker.month + 1) + '月';

    var first = new Date(picker.year, picker.month, 1);
    var startDay = first.getDay();
    var daysInMonth = new Date(picker.year, picker.month + 1, 0).getDate();
    var prevDays = new Date(picker.year, picker.month, 0).getDate();
    var cells = [];

    for (var i = startDay - 1; i >= 0; i--) {
      var prevDate = new Date(picker.year, picker.month - 1, prevDays - i);
      cells.push({ date: toDateString(prevDate), day: prevDays - i, other: true });
    }
    for (var d = 1; d <= daysInMonth; d++) {
      cells.push({ date: toDateString(new Date(picker.year, picker.month, d)), day: d, other: false });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      var nextDay = cells.length - startDay - daysInMonth + 1;
      var nextDate = new Date(picker.year, picker.month + 1, nextDay);
      cells.push({ date: toDateString(nextDate), day: nextDay, other: true });
    }

    var today = getToday();
    var selected = picker.selectedDate;
    grid.innerHTML = cells.map(function(cell) {
      var cls = 'deadline-date-btn';
      if (cell.other) cls += ' other-month';
      if (cell.date === today) cls += ' today';
      if (cell.date === selected) cls += ' selected';
      return '<button class="' + cls + '" data-action="deadline-date" data-date="' + cell.date + '">' + cell.day + '</button>';
    }).join('');
  }

  function closeDeadlinePicker() {
    var overlay = document.getElementById('deadlinePickerOverlay');
    if (overlay) overlay.classList.add('hidden');
    if (state.deadlinePicker) state.deadlinePicker.todoId = null;
  }

  // Later declaration intentionally replaces the legacy prompt-based picker.
  function handleDeadlineClick(id) {
    var todo = state.allTodos.find(function(t) { return t.id === id; });
    if (!todo) return;
    var baseDate = todo.deadline || getToday();
    var d = new Date(baseDate + 'T00:00:00');
    state.deadlinePicker = {
      todoId: id,
      year: d.getFullYear(),
      month: d.getMonth(),
      selectedDate: todo.deadline || null
    };
    var overlay = ensureDeadlinePicker();
    overlay.classList.remove('hidden');
    renderDeadlinePicker();
  }

  // Increment ongoing task
  // Recompute lastOngoingDate/lastOngoingNote from the per-day detail logs
  // (the total count is managed separately at each mutation site).
  async function syncOngoingLastFromLogs(todo) {
    var logs = state.ongoingLogs.filter(function(l) { return l.todoId === todo.id; });
    var dates = logs.map(function(l) { return l.date; }).sort();
    var lastDate = dates.length ? dates[dates.length - 1] : null;
    var lastNote = '';
    if (lastDate) {
      var last = logs.find(function(l) { return l.date === lastDate; });
      if (last) lastNote = last.note || '';
    }
    await Sync.updateTodo(todo.id, {
      lastOngoingDate: lastDate,
      lastOngoingNote: lastNote
    });
    todo.lastOngoingDate = lastDate;
    todo.lastOngoingNote = lastNote;
  }

  async function handleIncrementOngoing(id) {
    var todo = state.allTodos.find(function(t) { return t.id === id; });
    if (!todo || todo.taskType !== 'ongoing') return;
    var today = getToday();
    // If already done today, undo
    if (todo.lastOngoingDate === today) {
      var prevCount = Math.max((todo.ongoingCount || 1) - 1, 0);
      try {
        // Remove today's detail log too
        var todayLog = state.ongoingLogs.find(function(l) { return l.todoId === id && l.date === today; });
        if (todayLog) {
          try { await OngoingLogSync.deleteLog(todayLog.id); } catch (e) { console.warn('Delete ongoing log failed', e); }
          state.ongoingLogs = state.ongoingLogs.filter(function(l) { return l.id !== todayLog.id; });
        }
        await Sync.updateTodo(id, {
          ongoingCount: prevCount,
          lastOngoingDate: null,
          lastOngoingNote: ''
        });
        todo.ongoingCount = prevCount;
        todo.lastOngoingDate = null;
        todo.lastOngoingNote = '';
        renderCurrentView();
        if (state.modalDate) renderModalList();
        renderHabits();
        saveLocalCache();
        Toast.show('已取消打卡');
      } catch (e) {
        console.warn('Undo ongoing failed', e);
        Toast.show('取消失败');
      }
      return;
    }
    // One-tap check-in: no native prompt (unreliable in mobile PWAs).
    // Notes can be added later in the 回放 panel.
    var newCount = (todo.ongoingCount || 0) + 1;
    try {
      await Sync.updateTodo(id, {
        ongoingCount: newCount,
        lastOngoingDate: today,
        lastOngoingNote: ''
      });
      todo.ongoingCount = newCount;
      todo.lastOngoingDate = today;
      todo.lastOngoingNote = '';
      // Per-day detail log — degrade gracefully if the table isn't migrated yet
      try {
        var log = { id: generateId(), todoId: id, date: today, note: '' };
        var saved = await OngoingLogSync.addLog(log);
        if (saved) state.ongoingLogs.push(saved);
      } catch (e) {
        console.warn('Ongoing detail log write failed (table may not be migrated)', e);
      }
      renderCurrentView();
      if (state.modalDate) renderModalList();
      renderHabits();
      saveLocalCache();
      Toast.show('已打卡！累计' + newCount + '天');
    } catch (e) {
      console.warn('Increment ongoing failed', e);
      if (isAuthError(e)) return;
      Toast.show('打卡失败');
    }
  }

  // -- Habit handlers --
  async function handleAddHabit(content, periodType, periodCount, totalLength, startDate) {
    var habit = {
      id: generateId(),
      content: content,
      periodType: periodType || 'daily',
      periodCount: periodCount || 1,
      totalLength: totalLength || 30,
      startDate: startDate || getToday()
    };
    try {
      await HabitSync.addHabit(habit);
      state.habits.push(habit);
      renderHabits();
    } catch (e) {
      console.warn('Add habit failed', e);
      if (isAuthError(e)) return;
      Toast.show('创建习惯失败');
    }
  }

  async function handleCheckHabit(habitId) {
    var today = getToday();
    // If already done today, undo (cancel check-in)
    if (isHabitDoneToday(habitId)) {
      var existingLog = state.habitLogs.find(function(l) { return l.habitId === habitId && l.date === today && l.done; });
      if (!existingLog) return;
      try {
        await HabitSync.deleteHabitLog(existingLog.id);
        state.habitLogs = state.habitLogs.filter(function(l) { return l.id !== existingLog.id; });
        renderHabits();
        Toast.show('已取消打卡');
      } catch (e) {
        console.warn('Cancel check failed', e);
        Toast.show('取消失败');
      }
      return;
    }
    // One-tap check-in: no native prompt (unreliable in mobile PWAs).
    // Notes can be added later in the 回放 panel.
    var log = { id: generateId(), habitId: habitId, date: today, done: true, note: '' };
    try {
      var saved = await HabitSync.addHabitLog(log);
      if (!saved) {
        Toast.show('今天已经打过卡了');
        return;
      }
      state.habitLogs.push(saved);
      renderHabits();
      checkHabitAchievement(habitId);
    } catch (e) {
      console.warn('Check habit failed', e);
      if (isAuthError(e)) return;
      Toast.show('打卡失败');
    }
  }

  async function handleDeleteHabit(habitId) {
    var idx = -1;
    for (var i = 0; i < state.habits.length; i++) {
      if (state.habits[i].id === habitId) { idx = i; break; }
    }
    if (idx === -1) return;
    try {
      await HabitSync.deleteHabit(habitId);
      state.habits.splice(idx, 1);
      state.habitLogs = state.habitLogs.filter(function(l) { return l.habitId !== habitId; });
      renderHabits();
      Toast.show('习惯已删除');
    } catch (e) {
      console.warn('Delete habit failed', e);
      if (isAuthError(e)) return;
      Toast.show('删除失败');
    }
  }

  async function handleEditHabitName(habitId) {
    var habit = state.habits.find(function(h) { return h.id === habitId; });
    if (!habit) return;
    var newContent = prompt('编辑习惯名称', habit.content);
    if (newContent === null || newContent.trim() === '') return;
    newContent = newContent.trim();
    try {
      var result = await supabase.from('habits').update({ content: newContent }).eq('id', habitId);
      if (result.error) throw result.error;
      habit.content = newContent;
      renderHabits();
    } catch (e) {
      console.warn('Edit habit name failed', e);
      Toast.show('编辑失败');
    }
  }

  async function handleEditHabitParams(habitId) {
    var habit = state.habits.find(function(h) { return h.id === habitId; });
    if (!habit) return;
    var pt = prompt('周期类型 (daily/weekly/monthly)', habit.periodType);
    if (pt && (pt === 'daily' || pt === 'weekly' || pt === 'monthly')) habit.periodType = pt;
    var pc = prompt('间隔 (数字)', habit.periodCount);
    if (pc !== null && parseInt(pc) > 0) habit.periodCount = parseInt(pc);
    var tl = prompt('总次数', habit.totalLength);
    if (tl !== null && parseInt(tl) > 0) habit.totalLength = parseInt(tl);
    var sd = prompt('起始日期 (YYYY-MM-DD)', habit.startDate);
    if (sd && /^\d{4}-\d{2}-\d{2}$/.test(sd)) habit.startDate = sd;
    try {
      var result = await supabase.from('habits').update({
        period_type: habit.periodType,
        period_count: habit.periodCount,
        total_length: habit.totalLength,
        start_date: habit.startDate
      }).eq('id', habitId);
      if (result.error) throw result.error;
      renderHabits();
    } catch (e) {
      console.warn('Edit habit params failed', e);
      Toast.show('编辑失败');
    }
  }

  async function handleEditOngoing(id) {
    var todo = state.allTodos.find(function(t) { return t.id === id; });
    if (!todo) return;
    var newText = prompt('编辑名称', todo.text);
    if (newText === null || newText.trim() === '') return;
    newText = newText.trim();
    try {
      await Sync.updateTodo(id, { text: newText });
      todo.text = newText;
      renderHabits();
    } catch (e) {
      console.warn('Edit ongoing failed', e);
      Toast.show('编辑失败');
    }
  }

  function checkHabitAchievement(habitId) {
    var habit = state.habits.find(function(h) { return h.id === habitId; });
    if (!habit) return;
    var progress = getHabitProgress(habit);
    if (progress.done >= progress.total) {
      Toast.show('🎉 恭喜！"' + habit.content + '" 已完成全部目标！', 4000);
    }
  }

  // Switch tab
  function switchTab(tabName) {
    state.currentTab = tabName;

    // Update tab button styles
    var buttons = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.remove('active');
      if (buttons[i].dataset.tab === tabName) buttons[i].classList.add('active');
    }

    // Show/hide panels
    document.getElementById('tabToday').classList.toggle('hidden', tabName !== 'tabToday');
    document.getElementById('tabHistory').classList.toggle('hidden', tabName !== 'tabHistory');
    document.getElementById('tabCalendar').classList.toggle('hidden', tabName !== 'tabCalendar');
    document.getElementById('tabHabits').classList.toggle('hidden', tabName !== 'tabHabits');

    renderCurrentView();
    if (loadedOnce) refreshData();
  }

  /* ==================================================================
     EVENT DELEGATION
     ================================================================== */

  // Today list clicks
  document.getElementById('todayList').addEventListener('click', function(e) {
    var item = e.target.closest('.todo-item');
    if (!item) return;
    var id = item.dataset.id;
    var action = e.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'toggle') handleToggle(id);
    else if (action.dataset.action === 'delete') handleDelete(id);
    else if (action.dataset.action === 'pin') handlePin(id);
    else if (action.dataset.action === 'highlight') handleHighlight(id);
    else if (action.dataset.action === 'deadline') handleDeadlineClick(id);
    else if (action.dataset.action === 'cancel-deadline') handleSetDeadline(id, null);
    else if (action.dataset.action === 'increment') handleIncrementOngoing(id);
  });

  // Add todo button
  document.getElementById('addBtn').addEventListener('click', function() {
    var input = document.getElementById('todoInput');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    handleAdd(text, getToday());
  });

  document.getElementById('todoInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var text = this.value.trim();
      if (!text) return;
      this.value = '';
      handleAdd(text, getToday());
    }
  });

  // -- Someday ("有空可以做") section --
  function renderSomeday() {
    var listEl = document.getElementById('somedayList');
    var emptyEl = document.getElementById('somedayEmpty');
    var items = state.allTodos.filter(function(t) { return t.taskType === 'someday'; });
    if (items.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');
    listEl.innerHTML = items.map(function(item) {
      return '<div class="someday-item" data-id="' + item.id + '">' +
        '<span class="someday-text">' + escapeHtml(item.text) + '</span>' +
        '<button class="someday-delete" data-action="delete-someday" aria-label="删除">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>';
    }).join('');
  }

  // Someday add
  document.getElementById('somedayAddBtn').addEventListener('click', async function() {
    var input = document.getElementById('somedayInput');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    var dateStr = getToday();
    var all = state.allTodos.filter(function(t) { return t.date === dateStr; });
    var maxOrder = all.reduce(function(m, t) { return Math.max(m, t.order); }, -1);
    var todo = {
      id: generateId(), text: text, done: false, status: 'active', date: dateStr,
      createdAt: new Date().toISOString(), carriedFrom: null, order: maxOrder + 1,
      pinned: false, highlighted: false, deadline: null, hasDeadline: false,
      taskType: 'someday', ongoingCount: 0, lastOngoingDate: null, lastOngoingNote: ''
    };
    try {
      await Sync.addTodo(todo);
      state.allTodos.push(todo);
      renderSomeday();
      saveLocalCache();
    } catch (e) {
      if (isAuthError(e)) return;
      Toast.show('添加失败');
    }
  });

  document.getElementById('somedayInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('somedayAddBtn').click();
  });

  // Someday delete via delegation
  document.getElementById('somedayList').addEventListener('click', async function(e) {
    var action = e.target.closest('[data-action="delete-someday"]');
    if (!action) return;
    var item = e.target.closest('.someday-item');
    if (!item) return;
    var id = item.dataset.id;
    var idx = -1;
    for (var i = 0; i < state.allTodos.length; i++) {
      if (state.allTodos[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    try {
      await Sync.deleteTodo(id);
      state.allTodos.splice(idx, 1);
      renderSomeday();
    } catch (ex) { console.warn('Delete someday failed', ex); }
  });

  // History delete item
  async function handleHistoryDeleteItem(id) {
    var idx = -1;
    for (var i = 0; i < state.allTodos.length; i++) {
      if (state.allTodos[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    var todo = state.allTodos[idx];
    try {
      await deleteTodoWithChain(todo);
      renderHistory();
      saveLocalCache();
      Toast.show('已删除');
    } catch (e) {
      console.warn('History delete failed', e);
      Toast.show('删除失败');
    }
  }

  // History toggle todo done/undone
  async function handleHistoryToggle(id) {
    var todo = state.allTodos.find(function(t) { return t.id === id; });
    if (!todo) return;
    var newDone = !todo.done;
    var newStatus = newDone ? 'done' : 'active';
    try {
      await Sync.updateTodo(id, { done: newDone, status: newStatus });
      todo.done = newDone;
      todo.status = newStatus;
      if (newDone) {
        await completeCarryChain(todo);
      } else {
        await setChainClosed(todo, null); // re-open a finished task
      }
      renderCurrentView();
      saveLocalCache();
    } catch (e) {
      console.warn('History toggle failed', e);
      Toast.show('操作失败');
    }
  }

  // History card interactions
  document.getElementById('historyList').addEventListener('click', function(e) {
    // History toggle button (only in edit mode)
    var toggleBtn = e.target.closest('[data-action="history-toggle"]');
    if (toggleBtn) {
      if (!state.historyEditMode) return;
      var row = toggleBtn.closest('.todo-row');
      if (row) handleHistoryToggle(row.dataset.id);
      return;
    }
    // History delete button (only in edit mode)
    var deleteBtn = e.target.closest('[data-action="history-delete"]');
    if (deleteBtn) {
      if (!state.historyEditMode) return;
      var row = deleteBtn.closest('.todo-row');
      if (row) handleHistoryDeleteItem(row.dataset.id);
      return;
    }
    // History DDL badge click (only in edit mode)
    var ddlBtn = e.target.closest('[data-action="history-deadline"]');
    if (ddlBtn) {
      if (!state.historyEditMode) return;
      var todoId = ddlBtn.dataset.id;
      if (todoId) handleDeadlineClick(todoId);
      return;
    }
    // Add-to-date button
    var addToDateBtn = e.target.closest('[data-action="add-to-date"]');
    if (addToDateBtn) {
      var targetDate = addToDateBtn.dataset.date;
      document.getElementById('historyAddInput').dataset.targetDate = targetDate;
      document.getElementById('historyAddInput').placeholder = '添加待办到 ' + targetDate + '...';
      document.getElementById('historyAddInput').focus();
      return;
    }
    // Card expand/collapse (only in collapse mode)
    if (state.historyMode !== 'collapse') return;
    var header = e.target.closest('.history-card-header');
    if (!header) return;
    var card = header.parentElement;
    card.classList.toggle('expanded');
    // Track expanded state so it survives re-renders
    var date = card.dataset.date;
    if (card.classList.contains('expanded')) {
      state.historyExpanded[date] = true;
    } else {
      delete state.historyExpanded[date];
    }
  });

  // Backlog (未办池) actions
  async function handleBacklogDone(id) {
    var todo = state.allTodos.find(function(t) { return t.id === id; });
    if (!todo) return;
    todo.done = true;
    todo.status = 'done';
    try {
      await Sync.updateTodo(id, { done: true, status: 'done' });
      await completeCarryChain(todo);
      renderCurrentView();
      saveLocalCache();
    } catch (e) {
      console.warn('Backlog done failed', e);
      if (isAuthError(e)) return;
      Toast.show('操作失败');
    }
  }

  document.getElementById('backlogList').addEventListener('click', function(e) {
    var item = e.target.closest('.backlog-item');
    if (!item) return;
    var id = item.dataset.id;
    var action = e.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'backlog-done') handleBacklogDone(id);
    else if (action.dataset.action === 'backlog-delete') handleDelete(id);
  });

  // History edit toggle
  document.getElementById('historyEditBtn').addEventListener('click', function() {
    state.historyEditMode = !state.historyEditMode;
    renderHistory();
    if (!state.historyEditMode) {
      document.getElementById('historyAddBar').classList.add('hidden');
    }
  });

  // History add to past date
  document.getElementById('historyAddBtn').addEventListener('click', async function() {
    var input = document.getElementById('historyAddInput');
    var text = input.value.trim();
    var targetDate = input.dataset.targetDate;
    if (!text || !targetDate) return;
    input.value = '';
    var all = state.allTodos.filter(function(t) { return t.date === targetDate; });
    var maxOrder = all.reduce(function(m, t) { return Math.max(m, t.order); }, -1);
    var todo = {
      id: generateId(), text: text, done: false, status: 'active', date: targetDate,
      createdAt: new Date().toISOString(), carriedFrom: null, order: maxOrder + 1,
      pinned: false, highlighted: false, deadline: null, hasDeadline: false,
      taskType: 'todo', ongoingCount: 0, lastOngoingDate: null, lastOngoingNote: ''
    };
    try {
      await Sync.addTodo(todo);
      state.allTodos.push(todo);
      renderHistory();
      saveLocalCache();
      Toast.show('已添加到 ' + targetDate);
    } catch (e) {
      if (isAuthError(e)) return;
      Toast.show('添加失败');
    }
  });

  document.getElementById('historyAddInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('historyAddBtn').click();
  });

  // History mode toggle
  document.getElementById('modeCollapse').addEventListener('click', function() {
    if (state.historyMode === 'collapse') return;
    state.historyMode = 'collapse';
    state.historyExpanded = {};
    document.getElementById('modeCollapse').classList.add('active');
    document.getElementById('modeExpand').classList.remove('active');
    renderHistory();
  });

  document.getElementById('modeExpand').addEventListener('click', function() {
    if (state.historyMode === 'expand') return;
    state.historyMode = 'expand';
    document.getElementById('modeExpand').classList.add('active');
    document.getElementById('modeCollapse').classList.remove('active');
    renderHistory();
  });

  // History date picker — jump to date
  document.getElementById('historyDatePicker').addEventListener('change', function() {
    var targetDate = this.value;
    if (!targetDate) return;
    state.historyPickedDate = targetDate;
    var card = document.querySelector('.history-card[data-date="' + targetDate + '"]');
    if (card) {
      card.classList.add('expanded');
      // Track the expansion so it survives re-renders
      state.historyExpanded[targetDate] = true;
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      Toast.show('该日期没有记录');
    }
  });

  // Calendar navigation
  document.getElementById('calPrev').addEventListener('click', function() {
    state.calendarMonth--;
    if (state.calendarMonth < 0) { state.calendarMonth = 11; state.calendarYear--; }
    renderCalendar();
  });

  document.getElementById('calNext').addEventListener('click', function() {
    state.calendarMonth++;
    if (state.calendarMonth > 11) { state.calendarMonth = 0; state.calendarYear++; }
    renderCalendar();
  });

  // Stats navigation (independent from calendar)
  document.getElementById('statsPrev').addEventListener('click', function() {
    state.statsMonth--;
    if (state.statsMonth < 0) { state.statsMonth = 11; state.statsYear--; }
    renderStats();
  });

  document.getElementById('statsNext').addEventListener('click', function() {
    state.statsMonth++;
    if (state.statsMonth > 11) { state.statsMonth = 0; state.statsYear++; }
    renderStats();
  });

  // Habits list clicks
  document.getElementById('habitsList').addEventListener('click', async function(e) {
    var card = e.target.closest('.habit-card');
    if (!card) return;
    var id = card.dataset.id;
    var type = card.dataset.type;
    var action = e.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'check-habit' && type === 'habit') handleCheckHabit(id);
    else if (action.dataset.action === 'delete-habit' && type === 'habit') handleDeleteHabit(id);
    else if (action.dataset.action === 'edit-habit-name' && type === 'habit') handleEditHabitName(id);
    else if (action.dataset.action === 'edit-habit-params' && type === 'habit') handleEditHabitParams(id);
    else if (action.dataset.action === 'view-habit-history' && type === 'habit') openTimeline('habit', id);
    else if (action.dataset.action === 'check-ongoing' && type === 'ongoing') handleIncrementOngoing(id);
    else if (action.dataset.action === 'edit-ongoing-name' && type === 'ongoing') handleEditOngoing(id);
    else if (action.dataset.action === 'edit-ongoing-params' && type === 'ongoing') handleEditOngoing(id);
    else if (action.dataset.action === 'view-ongoing-history' && type === 'ongoing') openTimeline('ongoing', id);
    else if (action.dataset.action === 'delete-ongoing' && type === 'ongoing') {
      var idx = -1;
      for (var i = 0; i < state.allTodos.length; i++) {
        if (state.allTodos[i].id === id) { idx = i; break; }
      }
      if (idx === -1) return;
      try {
        await Sync.deleteTodo(id);
        state.allTodos.splice(idx, 1);
        state.ongoingLogs = state.ongoingLogs.filter(function(l) { return l.todoId !== id; });
        renderHabits();
        Toast.show('已删除');
      } catch (ex) { console.warn('Delete ongoing failed', ex); Toast.show('删除失败'); }
    }
  });

  /* ==================================================================
     TIMELINE MODAL (打卡回放: per-habit / per-ongoing history)
     ================================================================== */
  var timelineTarget = null; // { type: 'habit' | 'ongoing', id }
  var timelineNoteEditId = null; // log id whose note is currently being edited

  function openTimeline(type, id) {
    timelineTarget = { type: type, id: id };
    document.getElementById('timelineBackfillDate').value = getToday();
    document.getElementById('timelineBackfillDate').max = getToday();
    document.getElementById('timelineBackfillNote').value = '';
    renderTimeline();
    document.getElementById('timelineModal').classList.remove('hidden');
  }

  function closeTimeline() {
    document.getElementById('timelineModal').classList.add('hidden');
    timelineTarget = null;
    timelineNoteEditId = null;
  }

  function getTimelineLogs() {
    if (!timelineTarget) return [];
    if (timelineTarget.type === 'habit') {
      return state.habitLogs.filter(function(l) { return l.habitId === timelineTarget.id && l.done; });
    }
    return state.ongoingLogs.filter(function(l) { return l.todoId === timelineTarget.id; });
  }

  function renderTimeline() {
    if (!timelineTarget) return;
    var isHabit = timelineTarget.type === 'habit';
    var today = getToday();
    var nameEl = document.getElementById('timelineTitle');
    var statsEl = document.getElementById('timelineStats');
    var listEl = document.getElementById('timelineList');
    var missedEl = document.getElementById('timelineMissed');
    var logs = getTimelineLogs();
    var startLabel = '';

    if (isHabit) {
      var h = state.habits.find(function(x) { return x.id === timelineTarget.id; });
      if (!h) return;
      nameEl.textContent = h.content + ' · 打卡回放';
      startLabel = h.startDate;
    } else {
      var ot = state.allTodos.find(function(x) { return x.id === timelineTarget.id; });
      if (!ot) return;
      nameEl.textContent = ot.text + ' · 打卡回放';
      startLabel = ot.date;
    }

    // Stats: 累计 / 连续 / 本月 / 起始
    var total = logs.length;
    var thisMonth = 0;
    var monthStr = today.substring(0, 7);
    var logDates = {};
    for (var i = 0; i < logs.length; i++) {
      if (logs[i].date.substring(0, 7) === monthStr) thisMonth++;
      logDates[logs[i].date] = true;
    }
    var streak = 0;
    var d = new Date(today + 'T00:00:00');
    if (!logDates[today]) d.setDate(d.getDate() - 1);
    while (logDates[toDateString(d)]) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    statsEl.innerHTML =
      '<div class="timeline-stat"><div class="stat-num">' + total + '</div><div class="stat-label">累计天数</div></div>' +
      '<div class="timeline-stat"><div class="stat-num">' + streak + '</div><div class="stat-label">连续天数</div></div>' +
      '<div class="timeline-stat"><div class="stat-num">' + thisMonth + '</div><div class="stat-label">本月天数</div></div>' +
      '<div class="timeline-stat"><div class="stat-num" style="font-size:15px;">' + formatDateShort(startLabel) + '</div><div class="stat-label">起始日期</div></div>';

    // Timeline list (newest first)
    var sorted = logs.slice().sort(function(a, b) { return a.date < b.date ? 1 : -1; });
    if (sorted.length === 0) {
      listEl.innerHTML = '<div class="empty-state" style="padding:24px 0;"><p>还没有打卡记录</p></div>';
    } else {
      listEl.innerHTML = sorted.map(function(l) {
        var noteHtml;
        if (timelineNoteEditId === l.id) {
          noteHtml = '<div class="timeline-note-edit">' +
            '<input class="timeline-note-input" id="timelineNoteInput" value="' + escapeHtml(l.note || '') + '" placeholder="备注...">' +
            '<button class="timeline-note-btn" data-action="timeline-note-save">保存</button>' +
            '<button class="timeline-note-btn" data-action="timeline-note-cancel">取消</button>' +
          '</div>';
        } else {
          noteHtml = '<div class="timeline-item-note' + (l.note ? '' : ' empty') + '">' +
            (l.note ? escapeHtml(l.note) : '点击 ✎ 添加备注') +
          '</div>';
        }
        return '<div class="timeline-item" data-id="' + l.id + '">' +
          '<div class="timeline-item-date">' + formatDateShort(l.date) + ' ' + getWeekday(l.date) + '</div>' +
          noteHtml +
          (timelineNoteEditId === l.id ? '' :
            '<button class="timeline-item-edit" data-action="timeline-edit-note" title="编辑备注">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            '</button>') +
          '<button class="timeline-item-delete" data-action="timeline-delete" title="删除这条记录">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>';
      }).join('');
    }

    // Missed days — only meaningful for daily habits
    missedEl.innerHTML = '';
    if (isHabit) {
      var hb = state.habits.find(function(x) { return x.id === timelineTarget.id; });
      if (hb && hb.periodType === 'daily') {
        var missed = [];
        var cur = new Date(hb.startDate + 'T00:00:00');
        var todayD = new Date(today + 'T00:00:00');
        var guard = 0;
        while (cur <= todayD && guard < 2000) {
          var ds = toDateString(cur);
          if (!logDates[ds]) missed.push(ds);
          cur.setDate(cur.getDate() + 1);
          guard++;
        }
        var show = missed.slice(-60).reverse(); // most recent 60, newest first
        var hiddenCount = missed.length - show.length;
        if (show.length > 0) {
          missedEl.innerHTML =
            '<div class="timeline-missed-title">漏卡日期（共' + missed.length + '天' + (hiddenCount > 0 ? '，仅显示最近60天' : '') + '）</div>' +
            '<div class="timeline-missed-list">' + show.map(function(ds) {
              return '<span class="missed-chip">' + formatDateShort(ds) + '</span>';
            }).join('') + '</div>';
        }
      }
    }
  }

  // Delete a single timeline entry
  async function handleTimelineDelete(logId) {
    if (!timelineTarget) return;
    var isHabit = timelineTarget.type === 'habit';
    try {
      if (isHabit) {
        await HabitSync.deleteHabitLog(logId);
        state.habitLogs = state.habitLogs.filter(function(l) { return l.id !== logId; });
      } else {
        await OngoingLogSync.deleteLog(logId);
        state.ongoingLogs = state.ongoingLogs.filter(function(l) { return l.id !== logId; });
        var todo = state.allTodos.find(function(t) { return t.id === timelineTarget.id; });
        if (todo) {
          var prevCount = Math.max((todo.ongoingCount || 0) - 1, 0);
          await Sync.updateTodo(todo.id, { ongoingCount: prevCount });
          todo.ongoingCount = prevCount;
          await syncOngoingLastFromLogs(todo);
        }
      }
      renderTimeline();
      renderHabits();
      saveLocalCache();
      Toast.show('已删除');
    } catch (e) {
      console.warn('Timeline delete failed', e);
      Toast.show('删除失败');
    }
  }

  // Backfill a check-in for a past date
  async function handleTimelineBackfill() {
    if (!timelineTarget) return;
    var date = document.getElementById('timelineBackfillDate').value;
    var note = document.getElementById('timelineBackfillNote').value.trim();
    var today = getToday();
    if (!date) { Toast.show('请选择日期'); return; }
    if (date > today) { Toast.show('不能补未来的打卡'); return; }
    var isHabit = timelineTarget.type === 'habit';
    try {
      if (isHabit) {
        if (state.habitLogs.some(function(l) { return l.habitId === timelineTarget.id && l.date === date && l.done; })) {
          Toast.show('该日期已打卡');
          return;
        }
        var log = { id: generateId(), habitId: timelineTarget.id, date: date, done: true, note: note };
        var saved = await HabitSync.addHabitLog(log);
        if (!saved) { Toast.show('该日期已打卡'); return; }
        state.habitLogs.push(saved);
      } else {
        if (state.ongoingLogs.some(function(l) { return l.todoId === timelineTarget.id && l.date === date; })) {
          Toast.show('该日期已打卡');
          return;
        }
        var log2 = { id: generateId(), todoId: timelineTarget.id, date: date, note: note };
        var saved2;
        try {
          saved2 = await OngoingLogSync.addLog(log2);
        } catch (e) {
          if (e && e.code === '23505') { Toast.show('该日期已打卡'); return; }
          Toast.show('补打卡失败（明细表可能未迁移，请先执行 SQL）');
          return;
        }
        if (!saved2) { Toast.show('该日期已打卡'); return; }
        state.ongoingLogs.push(saved2);
        var todo = state.allTodos.find(function(t) { return t.id === timelineTarget.id; });
        if (todo) {
          var newCount = (todo.ongoingCount || 0) + 1;
          await Sync.updateTodo(todo.id, { ongoingCount: newCount });
          todo.ongoingCount = newCount;
          await syncOngoingLastFromLogs(todo);
        }
      }
      document.getElementById('timelineBackfillNote').value = '';
      document.getElementById('timelineBackfillDate').value = today;
      renderTimeline();
      renderHabits();
      saveLocalCache();
      Toast.show('已补打卡 ' + date);
    } catch (e) {
      console.warn('Backfill failed', e);
      if (e && e.code === '23505') { Toast.show('该日期已打卡'); return; }
      Toast.show('补打卡失败');
    }
  }

  // Save an edited note in the timeline
  async function handleTimelineNoteSave() {
    if (!timelineTarget || !timelineNoteEditId) return;
    var input = document.getElementById('timelineNoteInput');
    var note = input ? input.value.trim() : '';
    var logId = timelineNoteEditId;
    var isHabit = timelineTarget.type === 'habit';
    try {
      if (isHabit) {
        await HabitSync.updateLog(logId, note);
        var hl = state.habitLogs.find(function(l) { return l.id === logId; });
        if (hl) hl.note = note;
      } else {
        await OngoingLogSync.updateLog(logId, note);
        var ol = state.ongoingLogs.find(function(l) { return l.id === logId; });
        if (ol) ol.note = note;
        var todo = state.allTodos.find(function(t) { return t.id === timelineTarget.id; });
        if (todo) await syncOngoingLastFromLogs(todo);
      }
      timelineNoteEditId = null;
      renderTimeline();
      renderHabits();
      saveLocalCache();
    } catch (e) {
      console.warn('Note save failed', e);
      Toast.show('保存失败');
    }
  }

  // Timeline modal events
  document.getElementById('timelineModal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeTimeline();
      return;
    }
    var action = e.target.closest('[data-action]');
    if (!action || !timelineTarget) return;
    if (action.dataset.action === 'timeline-delete') {
      var item = action.closest('.timeline-item');
      if (item) handleTimelineDelete(item.dataset.id);
    } else if (action.dataset.action === 'timeline-edit-note') {
      var item2 = action.closest('.timeline-item');
      if (item2) { timelineNoteEditId = item2.dataset.id; renderTimeline(); }
    } else if (action.dataset.action === 'timeline-note-save') {
      handleTimelineNoteSave();
    } else if (action.dataset.action === 'timeline-note-cancel') {
      timelineNoteEditId = null;
      renderTimeline();
    }
  });
  document.getElementById('timelineClose').addEventListener('click', closeTimeline);
  document.getElementById('timelineBackfillBtn').addEventListener('click', handleTimelineBackfill);

  // Habit view toggle
  document.getElementById('habitViewActive').addEventListener('click', function() {
    state.habitViewMode = 'active';
    renderHabits();
  });
  document.getElementById('habitViewHistory').addEventListener('click', function() {
    state.habitViewMode = 'history';
    renderHabits();
  });

  // Habit add type toggle: hide config + change placeholder for ongoing mode
  document.getElementById('habitAddType').addEventListener('change', function() {
    var isOngoing = this.value === 'ongoing';
    document.getElementById('habitConfigBtn').classList.toggle('hidden', isOngoing);
    document.getElementById('habitConfigPanel').classList.add('hidden');
    document.getElementById('habitInput').placeholder = isOngoing ? '添加持续任务...' : '添加新习惯...';
  });

  // Habit config toggle
  document.getElementById('habitConfigBtn').addEventListener('click', function() {
    var panel = document.getElementById('habitConfigPanel');
    panel.classList.toggle('hidden');
  });

  // Init habit start date
  document.getElementById('habitStartDate').value = getToday();

  // Habit add — read type + config values
  document.getElementById('habitAddBtn').addEventListener('click', function() {
    var input = document.getElementById('habitInput');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    var addType = document.getElementById('habitAddType').value;
    if (addType === 'ongoing') {
      // Create ongoing task
      var dateStr = getToday();
      var all = state.allTodos.filter(function(t) { return t.date === dateStr && t.taskType !== 'ongoing' && t.taskType !== 'someday'; });
      var maxOrder = all.reduce(function(m, t) { return Math.max(m, t.order); }, -1);
      var todo = {
        id: generateId(), text: text, done: false, status: 'active', date: dateStr,
        createdAt: new Date().toISOString(), carriedFrom: null, order: maxOrder + 1,
        pinned: false, highlighted: false, deadline: null, hasDeadline: false,
        taskType: 'ongoing', ongoingCount: 0, lastOngoingDate: null, lastOngoingNote: ''
      };
      Sync.addTodo(todo).then(function() {
        state.allTodos.push(todo);
        renderHabits();
        saveLocalCache();
      }).catch(function(e) {
        if (!isAuthError(e)) Toast.show('添加失败');
      });
    } else {
      var periodType = document.getElementById('habitPeriodType').value;
      var periodCount = parseInt(document.getElementById('habitPeriodCount').value) || 1;
      var totalLength = parseInt(document.getElementById('habitTotalLength').value) || 30;
      var startDate = document.getElementById('habitStartDate').value || getToday();
      handleAddHabit(text, periodType, periodCount, totalLength, startDate);
    }
  });

  document.getElementById('habitInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      document.getElementById('habitAddBtn').click();
    }
  });

  // Calendar date click
  document.getElementById('calendarGrid').addEventListener('click', function(e) {
    var cell = e.target.closest('.calendar-cell');
    if (!cell || cell.classList.contains('other-month')) return;
    openModal(cell.dataset.date);
  });

  // Tab bar clicks
  document.querySelector('.tab-bar').addEventListener('click', function(e) {
    var btn = e.target.closest('.tab-btn');
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Modal add
  document.getElementById('modalAddBtn').addEventListener('click', function() {
    var input = document.getElementById('modalInput');
    var text = input.value.trim();
    if (!text || !state.modalDate) return;
    input.value = '';
    handleAdd(text, state.modalDate);
  });

  document.getElementById('modalInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var text = this.value.trim();
      if (!text || !state.modalDate) return;
      this.value = '';
      handleAdd(text, state.modalDate);
    }
  });

  // Modal list clicks
  document.getElementById('modalList').addEventListener('click', function(e) {
    var item = e.target.closest('.todo-item');
    if (!item) return;
    var id = item.dataset.id;
    var action = e.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'toggle') handleToggle(id);
    else if (action.dataset.action === 'delete') handleDelete(id);
    else if (action.dataset.action === 'pin') handlePin(id);
    else if (action.dataset.action === 'highlight') handleHighlight(id);
    else if (action.dataset.action === 'deadline') handleDeadlineClick(id);
    else if (action.dataset.action === 'cancel-deadline') handleSetDeadline(id, null);
    else if (action.dataset.action === 'increment') handleIncrementOngoing(id);
  });

  // Logout
  var manualLogout = false;
  function resetAppState() {
    state.allTodos = [];
    state.habits = [];
    state.habitLogs = [];
    state.ongoingLogs = [];
    state.historyExpanded = {};
    state.historyPickedDate = null;
    state.historyEditMode = false;
    state.historyMode = 'collapse';
    state.habitViewMode = 'active';
    state.currentTab = 'tabToday';
    state.calendarMonth = new Date().getMonth();
    state.calendarYear = new Date().getFullYear();
    state.statsMonth = new Date().getMonth();
    state.statsYear = new Date().getFullYear();
    state.modalDate = null;
    state.deadlinePicker = null;
    timelineTarget = null;
    timelineNoteEditId = null;
    habitReminderShownFor = null;
    loadedOnce = false;
    closeModal();
    closeDeadlinePicker();
    closeTimeline();
  }

  document.getElementById('logoutBtn').addEventListener('click', async function() {
    manualLogout = true;
    try {
      await Auth.logout();
    } catch (e) { /* offline — still leave the app */ }
    document.getElementById('appPage').classList.add('hidden');
    document.getElementById('authPage').classList.remove('hidden');
    resetAppState();
  });

  // Auth switch
  var isLoginMode = true;
  document.getElementById('switchAuthBtn').addEventListener('click', function() {
    isLoginMode = !isLoginMode;
    document.getElementById('loginForm').classList.toggle('hidden', !isLoginMode);
    document.getElementById('registerForm').classList.toggle('hidden', isLoginMode);
    document.getElementById('switchText').textContent = isLoginMode ? '还没有账号？' : '已有账号？';
    document.getElementById('switchAuthBtn').textContent = isLoginMode ? '去注册' : '去登录';
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
  });

  // Manual / feedback modals on the auth page
  document.getElementById('manualBtn').addEventListener('click', function() {
    document.getElementById('manualModal').classList.remove('hidden');
  });
  document.getElementById('feedbackBtn').addEventListener('click', function() {
    document.getElementById('feedbackModal').classList.remove('hidden');
  });
  document.getElementById('manualClose').addEventListener('click', function() {
    document.getElementById('manualModal').classList.add('hidden');
  });
  document.getElementById('feedbackClose').addEventListener('click', function() {
    document.getElementById('feedbackModal').classList.add('hidden');
  });
  document.getElementById('manualModal').addEventListener('click', function(e) {
    if (e.target === this) this.classList.add('hidden');
  });
  document.getElementById('feedbackModal').addEventListener('click', function(e) {
    if (e.target === this) this.classList.add('hidden');
  });

  // Login form submit
  document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;
    var rememberPwd = document.getElementById('rememberPassword').checked;
    var autoLogin = document.getElementById('autoLogin').checked;
    var errorEl = document.getElementById('loginError');
    errorEl.textContent = '';
    try {
      await Auth.login(email, password);
      // Always save email; optionally save password and auto-login preference
      localStorage.setItem('todoapp_remembered_email', email);
      if (rememberPwd) {
        localStorage.setItem('todoapp_remembered_password', password);
      } else {
        localStorage.removeItem('todoapp_remembered_password');
      }
      localStorage.setItem('todoapp_auto_login', autoLogin ? '1' : '0');
      await enterApp();
    } catch (err) {
      errorEl.textContent = err.message || '登录失败，请检查邮箱和密码';
    }
  });

  // Register form submit
  document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var email = document.getElementById('registerEmail').value.trim();
    var password = document.getElementById('registerPassword').value;
    var confirm = document.getElementById('registerConfirm').value;
    var errorEl = document.getElementById('registerError');
    errorEl.textContent = '';

    if (password !== confirm) {
      errorEl.textContent = '两次密码不一致';
      return;
    }
    if (password.length < 6) {
      errorEl.textContent = '密码至少需要6位';
      return;
    }
    try {
      await Auth.register(email, password);
      // Supabase signUp may return a session immediately or require email verification
      try {
        await Auth.login(email, password);
        await enterApp();
      } catch (loginErr) {
        Toast.show('注册成功！请检查邮箱并点击确认链接后登录', 4000);
        isLoginMode = true;
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('switchText').textContent = '还没有账号？';
        document.getElementById('switchAuthBtn').textContent = '去注册';
        document.getElementById('loginEmail').value = email;
      }
    } catch (err) {
      errorEl.textContent = err.message || '注册失败，请重试';
    }
  });

  /* ==================================================================
     APP ENTRY
     ================================================================== */
  var enterAppRunning = false;
  var loadedOnce = false; // set after the first successful enterApp
  async function enterApp() {
    if (enterAppRunning) return;
    enterAppRunning = true;
    try {
      // Try to refresh the session token first — MUST succeed
      var session = await Auth.refreshSession();
      if (!session) {
        // Try to get current session as fallback
        session = await Auth.getSession();
      }
      if (!session) {
        // No valid session at all — must re-login
        Toast.show('会话已过期，请重新登录');
        document.getElementById('appPage').classList.add('hidden');
        document.getElementById('authPage').classList.remove('hidden');
        return;
      }

      // Fetch todos from Supabase
      var todos = [];
      try {
        todos = await Sync.fetchTodos();
      } catch (e) {
        console.warn('Fetch failed, falling back to cache', e);
        loadLocalCache();
        todos = localCache.todos;
        Toast.show('网络连接失败，使用本地缓存');
      }

      // Fetch habits
      try {
        state.habits = await HabitSync.fetchHabits();
        state.habitLogs = await HabitSync.fetchHabitLogs();
        state.ongoingLogs = await OngoingLogSync.fetchLogs();
      } catch (e) {
        console.warn('Fetch habits failed', e);
        state.habits = [];
        state.habitLogs = [];
        state.ongoingLogs = [];
      }

      // Load lastActiveDate from localStorage (persisted across sessions)
      loadLocalCache();

      // Migrate existing todos that lack a status field
      await migrateTodosStatus(todos);

      // Collapse accidental same-date duplicates + materialize missing history
      todos = await consolidateCarryChains(todos);
      todos = await repairMovedHistory(todos);

      state.allTodos = todos;
      todos = await runCarryOver(todos);
      state.allTodos = todos;

      // Check for expired DDLs and mark them
      var hadExpiry = await checkDeadlineExpiry(todos);
      if (hadExpiry) {
        // Re-run carry-over since expired todos may change carry decisions
        todos = await runCarryOver(todos);
        state.allTodos = todos;
      }

      // Update local cache
      localCache.todos = todos;
      saveLocalCache();

      // Show app, hide auth
      document.getElementById('authPage').classList.add('hidden');
      document.getElementById('appPage').classList.remove('hidden');

      updateHeaderDate();
      switchTab('tabToday');

      // Start midnight checker
      startMidnightChecker();

      // Remind about unchecked habits
      showHabitReminder();
      loadedOnce = true;
    } finally {
      enterAppRunning = false;
    }
  }

  /* ==================================================================
     SILENT DATA REFRESH (tab switch / window focus / midnight)
     ================================================================== */
  var refreshRunning = false;
  var midnightTimer = null;
  var lastKnownDate = getToday();

  // Silently pull the latest data from Supabase and re-run the daily
  // maintenance pipeline (consolidate → carry-over → DDL check).
  async function refreshData() {
    if (refreshRunning || !supabase) return;
    refreshRunning = true;
    try {
      var todos = await Sync.fetchTodos();
      todos = await consolidateCarryChains(todos);
      todos = await repairMovedHistory(todos);
      state.allTodos = todos;
      todos = await runCarryOver(todos);
      state.allTodos = todos;
      var hadExpiry = await checkDeadlineExpiry(todos);
      if (hadExpiry) {
        todos = await runCarryOver(todos);
        state.allTodos = todos;
      }
      try {
        state.habits = await HabitSync.fetchHabits();
        state.habitLogs = await HabitSync.fetchHabitLogs();
        state.ongoingLogs = await OngoingLogSync.fetchLogs();
      } catch (e) { /* keep the previous habit data */ }
      localCache.todos = state.allTodos;
      saveLocalCache();
      renderCurrentView();
      if (state.modalDate) renderModalList();
    } catch (e) {
      // Offline or auth issue — keep the current state, try again later
    } finally {
      refreshRunning = false;
    }
  }

  function startMidnightChecker() {
    if (midnightTimer) clearInterval(midnightTimer);
    midnightTimer = setInterval(async function() {
      var today = getToday();
      if (today !== lastKnownDate) {
        lastKnownDate = today;
        updateHeaderDate();
        await refreshData();
      }
    }, 60000);
  }

  // Refresh when the tab regains focus (cheap cross-device sync)
  window.addEventListener('focus', function() {
    if (loadedOnce) refreshData();
  });
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden && loadedOnce) refreshData();
  });

  /* ==================================================================
     PWA / SERVICE WORKER
     ================================================================== */
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(function(reg) {
          console.log('SW registered');
          // Listen for Service Worker updates
          reg.addEventListener('updatefound', function() {
            var newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', function() {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New version available — reloading');
                // New SW installed, auto-reload to apply
                window.location.reload();
              }
            });
          });
        })
        .catch(function() { /* non-critical */ });

      // Detect when a waiting SW takes over
      navigator.serviceWorker.addEventListener('controllerchange', function() {
        console.log('SW controller changed');
      });
    }

    // Install prompt
    var deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      deferredPrompt = e;
    });
  }

  /* ==================================================================
     INIT
     ================================================================== */
  async function init() {
    registerSW();

    if (!initSupabase()) {
      // No Supabase configured — show a message
      document.getElementById('loginForm').innerHTML =
        '<p style="text-align:center;color:var(--danger);font-size:14px;">请先在 app.js 中配置 SUPABASE_URL 和 SUPABASE_KEY</p>' +
        '<p style="text-align:center;font-size:13px;color:var(--text-secondary);">打开 app.js，将顶部的 YOUR_SUPABASE_URL 和 YOUR_SUPABASE_ANON_KEY 替换为你的 Supabase 项目信息</p>';
      return;
    }

    // Pre-fill remembered email and password
    var rememberedEmail = localStorage.getItem('todoapp_remembered_email');
    var rememberedPassword = localStorage.getItem('todoapp_remembered_password');
    var autoLogin = localStorage.getItem('todoapp_auto_login') === '1';
    if (rememberedEmail) {
      document.getElementById('loginEmail').value = rememberedEmail;
    }
    if (rememberedPassword) {
      document.getElementById('loginPassword').value = rememberedPassword;
      document.getElementById('rememberPassword').checked = true;
    }
    if (autoLogin) {
      document.getElementById('autoLogin').checked = true;
    }

    // Check existing session
    var session = await Auth.getSession();
    if (session) {
      await enterApp();
    } else {
      document.getElementById('authPage').classList.remove('hidden');
      document.getElementById('appPage').classList.add('hidden');
      if (rememberedEmail && rememberedPassword) {
        document.getElementById('loginPassword').focus();
      }
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async function(event, session) {
      if (event === 'SIGNED_IN' && document.getElementById('appPage').classList.contains('hidden')) {
        await enterApp();
      }
      if (event === 'SIGNED_OUT') {
        // Manual logout is handled by the logout button; only force back to
        // the login page (without clearing the local cache) when the session
        // actually expired.
        if (manualLogout) {
          manualLogout = false;
          return;
        }
        console.warn('Auth state: SIGNED_OUT — returning to login');
        document.getElementById('appPage').classList.add('hidden');
        document.getElementById('authPage').classList.remove('hidden');
        resetAppState();
        Toast.show('登录已过期，请重新登录');
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Auth state: TOKEN_REFRESHED');
      }
    });
  }

  init();

})();
