// ============ STATS MODULE ============

function renderStats() {
  const g = Storage.getGamification();
  const s = Storage.getStreak();
  const pomo = Storage.getPomodoro();

  setText('sc-total-tasks', g.totalTasksDone || 0);
  setText('sc-total-focus', g.totalFocusSessions || 0);
  setText('sc-streak', s.current || 0);
  setText('sc-coins', g.coins || 0);

  renderWeekChart();
  renderHourChart();
  renderStreakGrid();
  renderAchievements();
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ---- WEEK CHART (tarefas por dia) ----
function renderWeekChart() {
  const chart = document.getElementById('weekChart');
  if (!chart) return;

  const tasks = Storage.getTasks();
  const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const today = new Date();

  const counts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = tasks.filter(t => t.done && t.doneAt && t.doneAt.startsWith(dateStr)).length;
    counts.push({ label: days[d.getDay()], count, isToday: i === 0 });
  }

  const max = Math.max(...counts.map(c => c.count), 1);
  chart.innerHTML = counts.map(({ label, count, isToday }) => {
    const height = Math.max(4, Math.round((count / max) * 64));
    const color = isToday
      ? 'background:linear-gradient(180deg,#fd79a8,rgba(253,121,168,0.3))'
      : 'background:linear-gradient(180deg,#6c5ce7,rgba(108,92,231,0.3))';
    return `
      <div class="bar-col">
        <div class="bar-val">${count > 0 ? count : ''}</div>
        <div class="bar-fill" style="height:${height}px;${color}"></div>
        <div class="bar-day">${label}</div>
      </div>`;
  }).join('');
}

// ---- HOUR CHART (produtividade por hora do dia) ----
function renderHourChart() {
  const container = document.getElementById('hourChart');
  if (!container) return;

  const tasks  = Storage.getTasks().filter(t => t.done && t.doneAt);
  const pomos  = Storage.getPomodoro();
  const hourCounts = Array(24).fill(0);

  tasks.forEach(t => {
    hourCounts[new Date(t.doneAt).getHours()]++;
  });

  // Only show hours 5h–23h for readability
  const hours = [];
  for (let h = 5; h <= 23; h++) hours.push({ h, count: hourCounts[h] });

  const max = Math.max(...hours.map(x => x.count), 1);
  const currentHour = new Date().getHours();

  // Find peak hours (top 3)
  const sorted = [...hours].sort((a,b) => b.count - a.count);
  const peakHours = sorted.slice(0,3).filter(x => x.count > 0).map(x => x.h);

  container.innerHTML = hours.map(({ h, count }) => {
    const height = Math.max(2, Math.round((count / max) * 70));
    const isPeak = peakHours.includes(h);
    const isCurrent = h === currentHour;
    let color = 'background:rgba(255,255,255,0.08)';
    if (isPeak)   color = 'background:linear-gradient(180deg,#fdcb6e,rgba(253,203,110,0.3))';
    if (isCurrent) color = 'background:linear-gradient(180deg,#00cec9,rgba(0,206,201,0.3))';

    const label = h % 3 === 0 ? `${h}h` : '';
    return `
      <div class="bar-col" style="gap:3px" title="${h}h — ${count} tarefa${count!==1?'s':''}">
        <div class="bar-fill" style="height:${height}px;border-radius:3px 3px 0 0;${color}"></div>
        <div class="bar-day" style="font-size:8px">${label}</div>
      </div>`;
  }).join('');

  // Update legend
  const legendEl = document.getElementById('hourLegend');
  if (legendEl) {
    if (peakHours.length > 0) {
      const peakStr = peakHours.map(h => `${h}h`).join(', ');
      legendEl.innerHTML = `<span style="color:var(--gold)">⭐ Pico:</span> ${peakStr} &nbsp;·&nbsp; <span style="color:var(--teal)">🕐 Agora:</span> ${currentHour}h`;
    } else {
      legendEl.textContent = 'Complete tarefas para ver seus horários de pico';
    }
  }
}

// ---- STREAK GRID ----
function renderStreakGrid() {
  const grid = document.getElementById('streakGrid');
  if (!grid) return;

  const s = Storage.getStreak();
  const today = todayStr();
  const dayLetters = ['D','S','T','Q','Q','S','S'];

  const cells = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().slice(0, 10);
    const isToday = dStr === today;
    const isDone  = s.history && s.history.includes(dStr);
    const cls = isToday ? 'today' : isDone ? 'done' : 'miss';
    cells.push(`<div class="streak-day ${cls}" title="${dStr}">${dayLetters[d.getDay()]}</div>`);
  }
  grid.innerHTML = cells.join('');
}

// ---- ACHIEVEMENTS ----
function renderAchievements() {
  const list = document.getElementById('achieveList');
  if (!list) return;

  const g = Storage.getGamification();
  const s = Storage.getStreak();

  list.innerHTML = ALL_ACHIEVEMENTS.map(ach => {
    const unlocked = g.achievements.includes(ach.id);
    return `
      <div class="achieve-item ${unlocked ? '' : 'achieve-locked'}">
        <div class="achieve-icon ${unlocked ? 'gold' : 'gray'}">${ach.icon}</div>
        <div style="flex:1">
          <div class="achieve-name">${ach.name}</div>
          <div class="achieve-desc">${ach.desc}</div>
        </div>
        ${unlocked ? '<i class="ti ti-check" style="color:var(--green);font-size:18px;flex-shrink:0"></i>' : '<i class="ti ti-lock" style="color:var(--muted);font-size:16px;flex-shrink:0;opacity:0.4"></i>'}
      </div>`;
  }).join('');
}
