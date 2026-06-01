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
          date: t.date,
          createdAt: t.created_at,
          carriedFrom: t.carried_from,
          order: t.sort_order,
          pinned: t.pinned || false,
          highlighted: t.highlighted || false,
          deadline: t.deadline || null,
          hasDeadline: t.has_deadline || false,
          taskType: t.task_type || 'todo',
          ongoingCount: t.ongoing_count || 0,
          lastOngoingDate: t.last_ongoing_date || null
        };
      });
    },

    async addTodo(todo) {
      if (!supabase) return null;
      var payload = {
        id: todo.id,
        text: todo.text,
        done: todo.done,
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
          done: l.done
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

    async addHabitLog(log) {
      if (!supabase) return null;
      var payload = {
        id: log.id,
        habit_id: log.habitId,
        date: log.date,
        done: log.done
      };
      var result = await supabase.from('habit_logs').insert(payload);
      if (result.error) {
        if (result.error.code === '23505') return log;
        throw result.error;
      }
      return log;
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

  async function runCarryOver(todos) {
    var today = getToday();
    if (localCache.lastActiveDate === today) return todos;

    var undoneOlder = [];
    for (var i = 0; i < todos.length; i++) {
      // Only carry ORIGINAL todos (not intermediate carry-over copies), exclude ongoing
      if (todos[i].date < today && !todos[i].done && !todos[i].carriedFrom && todos[i].taskType !== 'ongoing') {
        undoneOlder.push(todos[i]);
      }
    }

    if (undoneOlder.length === 0) {
      localCache.lastActiveDate = today;
      saveLocalCache();
      return todos;
    }

    // Collect normalized texts already on today to deduplicate
    var todayTexts = new Set();
    for (var j = 0; j < todos.length; j++) {
      if (todos[j].date === today) {
        todayTexts.add(todos[j].text.trim().toLowerCase());
      }
    }

    var newTodos = [];
    var maxOrder = getMaxOrder(todos, today);
    var newOrder = maxOrder + 1;

    for (var k = 0; k < undoneOlder.length; k++) {
      var todo = undoneOlder[k];
      var norm = todo.text.trim().toLowerCase();
      if (todayTexts.has(norm)) continue;
      var newTodo = {
        id: generateId(),
        text: todo.text,
        done: false,
        date: today,
        createdAt: new Date().toISOString(),
        carriedFrom: todo.date,
        order: newOrder++
      };
      newTodos.push(newTodo);
      todayTexts.add(norm);
    }

    if (newTodos.length > 0) {
      try {
        await Sync.batchAdd(newTodos);
      } catch (e) {
        console.warn('Carry-over sync failed, using local only', e);
      }
      todos = todos.concat(newTodos);
    }

    localCache.lastActiveDate = today;
    saveLocalCache();
    return todos;
  }

  /* ==================================================================
     APP STATE
     ================================================================== */
  var state = {
    allTodos: [],
    habits: [],
    habitLogs: [],
    currentTab: 'tabToday',
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    statsMonth: new Date().getMonth(),
    statsYear: new Date().getFullYear(),
    modalDate: null,
    historyMode: 'collapse' // 'collapse' or 'expand'
  };

  /* ==================================================================
     UI RENDERERS
     ================================================================== */

  function getTodosByDate(date) {
    return state.allTodos
      .filter(function(t) { return t.date === date; })
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
          deadlineBadge = '<span class="todo-badge deadline-overdue">已逾期' + Math.abs(remaining) + '天</span>';
        } else if (remaining === 0) {
          deadlineBadge = '<span class="todo-badge deadline-today">今天截止</span>';
        } else {
          deadlineBadge = '<span class="todo-badge deadline-countdown">剩余' + remaining + '天</span>';
        }
      }
      var isOngoing = t.taskType === 'ongoing';
      if (isOngoing) {
        classes += ' ongoing';
      }
      if (isOngoing) {
        return '<div class="' + classes + '" data-id="' + t.id + '">' +
          '<button class="ongoing-btn" data-action="increment" title="打卡+1">+1</button>' +
          '<span class="todo-text">' + escapeHtml(t.text) + '</span>' +
          (t.ongoingCount ? '<span class="todo-badge ongoing-count">已做' + t.ongoingCount + '天</span>' : '') +
          '<button class="todo-delete" data-action="delete" aria-label="删除">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>';
      }
      return '<div class="' + classes + '" data-id="' + t.id + '">' +
        '<div class="todo-check' + (t.done ? ' done' : '') + '" data-action="toggle"></div>' +
        '<span class="todo-text' + (t.done ? ' done' : '') + '">' + escapeHtml(t.text) + '</span>' +
        deadlineBadge +
        (t.carriedFrom ? '<span class="todo-badge">从' + formatDateShort(t.carriedFrom) + '开始，已拖' + daysBetween(t.carriedFrom, getToday()) + '天</span>' : '') +
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
      '</div>';
    }).join('');
  }

  // -- History View --
  function renderHistory() {
    var today = getToday();
    var container = document.getElementById('historyList');
    var emptyEl = document.getElementById('historyEmpty');
    var isExpanded = state.historyMode === 'expand';

    // Set date picker default to today
    document.getElementById('historyDatePicker').value = today;

    // Group past todos by date
    var dateGroups = new Map();
    for (var i = 0; i < state.allTodos.length; i++) {
      var t = state.allTodos[i];
      if (t.date >= today) continue;
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

      return '<div class="history-card' + (isExpanded ? ' expanded' : '') + '" data-date="' + date + '">' +
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
            return '<div class="todo-row">' +
              '<div class="indicator ' + (t.done ? 'done' : 'undone') + '"></div>' +
              '<span class="txt' + (t.done ? ' was-done' : '') + '">' + escapeHtml(t.text) + '</span>' +
              '</div>';
          }).join('') +
        '</div>' +
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
    var totalInMonth = 0, doneInMonth = 0;
    for (var i = 0; i < state.allTodos.length; i++) {
      if (state.allTodos[i].date.substring(0, 7) === monthStr) {
        totalInMonth++;
        if (state.allTodos[i].done) doneInMonth++;
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
    var listEl = document.getElementById('habitsList');
    var emptyEl = document.getElementById('habitsEmpty');
    if (state.habits.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');
    var today = getToday();
    listEl.innerHTML = state.habits.map(function(h) {
      var progress = getHabitProgress(h);
      var doneToday = isHabitDoneToday(h.id);
      var periodLabel = h.periodType === 'daily' ? '每日' :
                        h.periodType === 'weekly' ? '每' + h.periodCount + '周' :
                        '每月';
      return '<div class="habit-card" data-id="' + h.id + '">' +
        '<div class="habit-header">' +
          '<span class="habit-content">' + escapeHtml(h.content) + '</span>' +
          '<button class="habit-delete" data-action="delete-habit" aria-label="删除习惯">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="habit-meta">' +
          '<span>' + periodLabel + ' · 目标' + h.totalLength + '次</span>' +
          '<span>已完成 ' + progress.done + ' / ' + progress.total + '</span>' +
        '</div>' +
        '<div class="habit-progress-bar">' +
          '<div class="habit-progress-fill" style="width:' + progress.pct + '%"></div>' +
        '</div>' +
        '<button class="habit-check-btn' + (doneToday ? ' checked' : '') + '" data-action="check-habit"' +
          (doneToday ? ' disabled' : '') + '>' +
          (doneToday ? '今日已打卡 ✓' : '打卡') +
        '</button>' +
      '</div>';
    }).join('');
  }

  function showHabitReminder() {
    var today = getToday();
    var unchecked = [];
    for (var i = 0; i < state.habits.length; i++) {
      if (!isHabitDoneToday(state.habits[i].id)) unchecked.push(state.habits[i]);
    }
    if (unchecked.length === 0) return;
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
          deadlineBadge = '<span class="todo-badge deadline-overdue">已逾期' + Math.abs(remaining) + '天</span>';
        } else if (remaining === 0) {
          deadlineBadge = '<span class="todo-badge deadline-today">今天截止</span>';
        } else {
          deadlineBadge = '<span class="todo-badge deadline-countdown">剩余' + remaining + '天</span>';
        }
      }
      var html = '<div class="' + cls + '" data-id="' + t.id + '">';
      if (isOngoing) {
        html += '<button class="ongoing-btn" data-action="increment" title="打卡+1">+1</button>';
        html += '<span class="todo-text">' + escapeHtml(t.text) + '</span>';
        if (t.ongoingCount) html += '<span class="todo-badge ongoing-count">已做' + t.ongoingCount + '天</span>';
        if (isEditable) {
          html += '<button class="todo-delete" data-action="delete" aria-label="删除">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>';
        }
      } else if (isEditable) {
        html += '<div class="todo-check' + (t.done ? ' done' : '') + '" data-action="toggle"></div>';
        html += '<span class="todo-text' + (t.done ? ' done' : '') + '">' + escapeHtml(t.text) + '</span>';
        html += deadlineBadge;
        if (t.carriedFrom) html += '<span class="todo-badge">从' + formatDateShort(t.carriedFrom) + '开始，已拖' + daysBetween(t.carriedFrom, getToday()) + '天</span>';
        html += '<button class="todo-action-btn" data-action="pin" title="' + (t.pinned ? '取消置顶' : '置顶') + '">' +
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
        '</button>';
      } else {
        html += '<div class="indicator ' + (t.done ? 'done' : 'undone') + '" style="width:10px;height:10px;border-radius:50%;flex-shrink:0;background:' + (t.done ? 'var(--green)' : 'var(--orange)') + '"></div>';
        html += '<span class="todo-text' + (t.done ? ' done' : '') + '">' + escapeHtml(t.text) + '</span>';
        html += deadlineBadge;
        if (t.carriedFrom) html += '<span class="todo-badge">从' + formatDateShort(t.carriedFrom) + '开始，已拖' + daysBetween(t.carriedFrom, getToday()) + '天</span>';
        if (t.pinned) html += '<span class="todo-badge">已置顶</span>';
        if (t.highlighted) html += '<span class="todo-badge">已高亮</span>';
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
      date: dateStr,
      createdAt: new Date().toISOString(),
      carriedFrom: null,
      order: maxOrder + 1,
      pinned: false,
      highlighted: false,
      deadline: null,
      hasDeadline: false,
      taskType: 'todo',
      ongoingCount: 0,
      lastOngoingDate: null
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
    try {
      await Sync.updateTodo(id, { done: newDone });
      todo.done = newDone;
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

  // Delete todo
  async function handleDelete(id) {
    var idx = -1;
    for (var i = 0; i < state.allTodos.length; i++) {
      if (state.allTodos[i].id === id) { idx = i; break; }
    }
    if (idx === -1) return;
    var todo = state.allTodos[idx];
    try {
      await Sync.deleteTodo(id);
      state.allTodos.splice(idx, 1);
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
        await Sync.updateTodo(id, { deadline: deadlineValue, hasDeadline: true });
        todo.deadline = deadlineValue;
        todo.hasDeadline = true;
      }
      renderCurrentView();
      if (state.modalDate) renderModalList();
      saveLocalCache();
    } catch (e) {
      console.warn('Sync setDeadline failed', e);
    }
  }

  // Show native date picker for deadline
  function handleDeadlineClick(id) {
    var todo = state.allTodos.find(function(t) { return t.id === id; });
    if (!todo) return;
    var input = document.createElement('input');
    input.type = 'date';
    input.value = todo.deadline || '';
    input.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;';
    document.body.appendChild(input);
    var cleanup = function() {
      if (document.body.contains(input)) document.body.removeChild(input);
    };
    input.addEventListener('change', function() {
      var val = input.value;
      cleanup();
      if (val) {
        handleSetDeadline(id, val);
      } else {
        handleSetDeadline(id, null);
      }
    });
    input.addEventListener('blur', function() {
      setTimeout(function() {
        if (document.body.contains(input)) cleanup();
      }, 300);
    });
    try { if (typeof input.showPicker === 'function') input.showPicker(); } catch (ex) { /* fallback */ }
    input.focus();
  }

  // Increment ongoing task
  async function handleIncrementOngoing(id) {
    var todo = state.allTodos.find(function(t) { return t.id === id; });
    if (!todo || todo.taskType !== 'ongoing') return;
    var today = getToday();
    if (todo.lastOngoingDate === today) {
      Toast.show('今天已经打卡过了');
      return;
    }
    var newCount = (todo.ongoingCount || 0) + 1;
    try {
      await Sync.updateTodo(id, { ongoingCount: newCount, lastOngoingDate: today });
      todo.ongoingCount = newCount;
      todo.lastOngoingDate = today;
      renderCurrentView();
      if (state.modalDate) renderModalList();
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
    if (isHabitDoneToday(habitId)) return;
    var log = { id: generateId(), habitId: habitId, date: getToday(), done: true };
    try {
      await HabitSync.addHabitLog(log);
      state.habitLogs.push(log);
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

  // Ongoing task add
  document.getElementById('ongoingAddBtn').addEventListener('click', function() {
    var input = document.getElementById('ongoingInput');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    // Create ongoing task
    var dateStr = getToday();
    var all = state.allTodos.filter(function(t) { return t.date === dateStr; });
    var maxOrder = all.reduce(function(m, t) { return Math.max(m, t.order); }, -1);
    var todo = {
      id: generateId(),
      text: text,
      done: false,
      date: dateStr,
      createdAt: new Date().toISOString(),
      carriedFrom: null,
      order: maxOrder + 1,
      pinned: false,
      highlighted: false,
      deadline: null,
      hasDeadline: false,
      taskType: 'ongoing',
      ongoingCount: 0,
      lastOngoingDate: null
    };
    try {
      await Sync.addTodo(todo);
      state.allTodos.push(todo);
      renderCurrentView();
      if (state.modalDate === dateStr) renderModalList();
      saveLocalCache();
    } catch (e) {
      console.error('Sync add ongoing failed', e);
      if (isAuthError(e)) return;
      Toast.show('保存失败，请检查网络后刷新');
    }
  });

  document.getElementById('ongoingInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      document.getElementById('ongoingAddBtn').click();
    }
  });

  // History card expand/collapse (only in collapse mode)
  document.getElementById('historyList').addEventListener('click', function(e) {
    if (state.historyMode !== 'collapse') return;
    var header = e.target.closest('.history-card-header');
    if (!header) return;
    var card = header.parentElement;
    card.classList.toggle('expanded');
  });

  // History mode toggle
  document.getElementById('modeCollapse').addEventListener('click', function() {
    if (state.historyMode === 'collapse') return;
    state.historyMode = 'collapse';
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
    // If in collapse mode, temporarily expand just that card
    var card = document.querySelector('.history-card[data-date="' + targetDate + '"]');
    if (card) {
      card.classList.add('expanded');
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  document.getElementById('habitsList').addEventListener('click', function(e) {
    var card = e.target.closest('.habit-card');
    if (!card) return;
    var habitId = card.dataset.id;
    var action = e.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'check-habit') handleCheckHabit(habitId);
    else if (action.dataset.action === 'delete-habit') handleDeleteHabit(habitId);
  });

  // Habit add
  document.getElementById('habitAddBtn').addEventListener('click', function() {
    var input = document.getElementById('habitInput');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    handleAddHabit(text, 'daily', 1, 30, getToday());
  });

  document.getElementById('habitInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var text = this.value.trim();
      if (!text) return;
      this.value = '';
      handleAddHabit(text, 'daily', 1, 30, getToday());
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
    else if (action.dataset.action === 'increment') handleIncrementOngoing(id);
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async function() {
    await Auth.logout();
    document.getElementById('appPage').classList.add('hidden');
    document.getElementById('authPage').classList.remove('hidden');
    state.allTodos = [];
    localCache = { todos: [], lastActiveDate: '' };
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
  async function enterApp() {
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
    } catch (e) {
      console.warn('Fetch habits failed', e);
      state.habits = [];
      state.habitLogs = [];
    }

    // Load lastActiveDate from localStorage (persisted across sessions)
    loadLocalCache();

    state.allTodos = todos;
    todos = await runCarryOver(todos);
    state.allTodos = todos;

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
  }

  /* ==================================================================
     MIDNIGHT CHECKER
     ================================================================== */
  var midnightTimer = null;
  var lastKnownDate = getToday();

  function startMidnightChecker() {
    if (midnightTimer) clearInterval(midnightTimer);
    midnightTimer = setInterval(async function() {
      var today = getToday();
      if (today !== lastKnownDate) {
        lastKnownDate = today;
        updateHeaderDate();
        // Fetch fresh data and run carry-over
        try {
          state.allTodos = await Sync.fetchTodos();
        } catch (e) { /* offline */ }
        state.allTodos = await runCarryOver(state.allTodos);
        localCache.todos = state.allTodos;
        saveLocalCache();
        renderCurrentView();
      }
    }, 60000);
  }

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
        // Token expired or user signed out — force back to login
        console.warn('Auth state: SIGNED_OUT — returning to login');
        document.getElementById('appPage').classList.add('hidden');
        document.getElementById('authPage').classList.remove('hidden');
        localStorage.removeItem('todoapp_cache'); // clear stale cache
        Toast.show('登录已过期，请重新登录');
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Auth state: TOKEN_REFRESHED');
      }
    });
  }

  init();

})();
