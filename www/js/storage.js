// ============ STORAGE LAYER ============
// All data is persisted in localStorage under 'focuslife_*' keys

const KEYS = {
  USER: 'focuslife_user',
  TASKS: 'focuslife_tasks',
  NOTES: 'focuslife_notes',
  GAMIFICATION: 'focuslife_gamification',
  POMODORO: 'focuslife_pomodoro',
  STREAK: 'focuslife_streak',
};

const Storage = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key) { localStorage.removeItem(key); },

  // ---- USER ----
  getUser() { return this.get(KEYS.USER, null); },
  setUser(data) { return this.set(KEYS.USER, data); },

  // ---- TASKS ----
  getTasks() { return this.get(KEYS.TASKS, []); },
  setTasks(tasks) { return this.set(KEYS.TASKS, tasks); },
  addTask(task) {
    const tasks = this.getTasks();
    tasks.unshift(task);
    return this.setTasks(tasks);
  },
  updateTask(id, updates) {
    const tasks = this.getTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    tasks[idx] = { ...tasks[idx], ...updates };
    return this.setTasks(tasks);
  },
  deleteTask(id) {
    const tasks = this.getTasks().filter(t => t.id !== id);
    return this.setTasks(tasks);
  },

  // ---- NOTES ----
  getNotes() { return this.get(KEYS.NOTES, []); },
  setNotes(notes) { return this.set(KEYS.NOTES, notes); },
  addNote(note) {
    const notes = this.getNotes();
    notes.unshift(note);
    return this.setNotes(notes);
  },
  updateNote(id, updates) {
    const notes = this.getNotes();
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) return false;
    notes[idx] = { ...notes[idx], ...updates };
    return this.setNotes(notes);
  },
  deleteNote(id) {
    const notes = this.getNotes().filter(n => n.id !== id);
    return this.setNotes(notes);
  },

  // ---- GAMIFICATION ----
  getGamification() {
    return this.get(KEYS.GAMIFICATION, {
      xp: 0, level: 1, coins: 0,
      totalTasksDone: 0, totalFocusSessions: 0,
      achievements: [],
    });
  },
  setGamification(data) { return this.set(KEYS.GAMIFICATION, data); },

  // ---- POMODORO ----
  getPomodoro() {
    return this.get(KEYS.POMODORO, {
      sessionsToday: 0,
      totalSessions: 0,
      totalMinutes: 0,
      lastSessionDate: null,
    });
  },
  setPomodoro(data) { return this.set(KEYS.POMODORO, data); },

  // ---- STREAK ----
  getStreak() {
    return this.get(KEYS.STREAK, {
      current: 0,
      best: 0,
      lastActiveDate: null,
      history: [], // array of 'YYYY-MM-DD'
    });
  },
  setStreak(data) { return this.set(KEYS.STREAK, data); },
};

// ---- HELPERS ----
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const now = new Date();
  const diffDays = Math.floor((d - now) / 86400000);
  if (diffDays < 0) return 'Atrasado';
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}
