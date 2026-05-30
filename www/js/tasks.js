// ============ TASKS MODULE ============

let currentTaskFilter = 'Todas';

function openTaskModal(taskId = null) {
  const overlay = document.getElementById('taskModalOverlay');
  const title = document.getElementById('taskModalTitle');
  const nameInput = document.getElementById('taskNameInput');
  const catSelect = document.getElementById('taskCatSelect');
  const prioSelect = document.getElementById('taskPrioSelect');
  const deadlineInput = document.getElementById('taskDeadline');
  const editId = document.getElementById('taskEditId');

  if (taskId) {
    const task = Storage.getTasks().find(t => t.id === taskId);
    if (!task) return;
    title.textContent = 'Editar Tarefa';
    nameInput.value = task.name;
    catSelect.value = task.category;
    prioSelect.value = task.priority;
    deadlineInput.value = task.deadline || '';
    editId.value = taskId;
  } else {
    title.textContent = 'Nova Tarefa';
    nameInput.value = '';
    catSelect.value = 'Trabalho';
    prioSelect.value = 'media';
    deadlineInput.value = '';
    editId.value = '';
  }

  overlay.classList.add('open');
  setTimeout(() => nameInput.focus(), 350);
}

function saveTask() {
  const name = document.getElementById('taskNameInput').value.trim();
  if (!name) { showToast('Digite o nome da tarefa'); return; }

  const task = {
    id: document.getElementById('taskEditId').value || generateId(),
    name,
    category: document.getElementById('taskCatSelect').value,
    priority: document.getElementById('taskPrioSelect').value,
    deadline: document.getElementById('taskDeadline').value || null,
    done: false,
    createdAt: new Date().toISOString(),
    doneAt: null,
  };

  const editId = document.getElementById('taskEditId').value;
  if (editId) {
    const existing = Storage.getTasks().find(t => t.id === editId);
    task.done = existing ? existing.done : false;
    task.doneAt = existing ? existing.doneAt : null;
    task.createdAt = existing ? existing.createdAt : task.createdAt;
    Storage.updateTask(editId, task);
    showToast('✏️ Tarefa atualizada!');
  } else {
    Storage.addTask(task);
    showToast('✅ Tarefa criada! +' + XP_REWARDS.NOTE_CREATED + ' XP bonus');
  }

  closeModal('taskModalOverlay');
  renderTasks();
  renderHomePending();
  updateDashboardStats();
  renderMissions();
}

function toggleTaskDone(id) {
  const task = Storage.getTasks().find(t => t.id === id);
  if (!task) return;

  const nowDone = !task.done;
  Storage.updateTask(id, {
    done: nowDone,
    doneAt: nowDone ? new Date().toISOString() : null,
  });

  if (nowDone) {
    addXP(XP_REWARDS.TASK_DONE, 'task');
    addCoins(COIN_REWARDS.TASK_DONE);
    updateStreakOnActivity();
    const g = Storage.getGamification();
    g.totalTasksDone = (g.totalTasksDone || 0) + 1;
    Storage.setGamification(g);
    checkAchievements();
    checkDailyGoal();
    showToast(`✅ Tarefa concluída! +${XP_REWARDS.TASK_DONE} XP`);
  }

  renderTasks();
  renderHomePending();
  updateDashboardStats();
  renderMissions();
  checkDailyMissions();
  updatePetMood();
  updateAIInsight();
}

function deleteTask(id) {
  if (!confirm('Excluir esta tarefa?')) return;
  Storage.deleteTask(id);
  renderTasks();
  renderHomePending();
  updateDashboardStats();
}

function filterTasks(btn) {
  document.querySelectorAll('#taskFilterChips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  currentTaskFilter = btn.dataset.cat;
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('taskList');
  const emptyEl = document.getElementById('taskEmpty');
  if (!list) return;

  let tasks = Storage.getTasks();
  if (currentTaskFilter !== 'Todas') {
    tasks = tasks.filter(t => t.category === currentTaskFilter);
  }

  // Sort: pending first, then by priority
  const prioOrder = { alta: 0, media: 1, baixa: 2 };
  tasks.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (prioOrder[a.priority] || 1) - (prioOrder[b.priority] || 1);
  });

  if (tasks.length === 0) {
    list.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  list.innerHTML = tasks.map(task => {
    const dl = task.deadline ? formatDate(task.deadline) : '';
    const over = task.deadline && !task.done && isOverdue(task.deadline);
    const catColors = {
      Trabalho: 'rgba(108,92,231,0.2);color:#a29bfe',
      Estudos: 'rgba(0,206,201,0.2);color:#00cec9',
      Saúde: 'rgba(85,239,196,0.2);color:#55efc4',
      Pessoal: 'rgba(253,121,168,0.2);color:#fd79a8',
      Outros: 'rgba(255,255,255,0.1);color:#8e8aad',
    };
    const catStyle = catColors[task.category] || catColors['Outros'];

    return `
      <div class="task-item prio-${task.priority}" data-id="${task.id}">
        <div class="task-prio-stripe"></div>
        <div class="task-cb ${task.done ? 'checked' : ''}" onclick="toggleTaskDone('${task.id}')">
          <i class="ti ti-check"></i>
        </div>
        <div class="task-info">
          <div class="task-name ${task.done ? 'done' : ''}">${escapeHtml(task.name)}</div>
          <div class="task-meta">
            <span class="task-cat-tag" style="background:${catStyle}">${task.category}</span>
            ${dl ? `<span class="task-deadline ${over ? 'overdue' : ''}">${over ? '⚠️ ' : '📅 '}${dl}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="task-act-btn" onclick="openTaskModal('${task.id}')" title="Editar">
            <i class="ti ti-edit"></i>
          </button>
          <button class="task-act-btn del" onclick="deleteTask('${task.id}')" title="Excluir">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Update progress bar
  const all = Storage.getTasks();
  const done = all.filter(t => t.done).length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const bar = document.getElementById('taskProgressBar');
  const lbl = document.getElementById('taskProgressLabel');
  if (bar) bar.style.width = pct + '%';
  if (lbl) lbl.textContent = `${done} de ${all.length} concluídas`;
}

function renderHomePending() {
  const container = document.getElementById('homePendingList');
  if (!container) return;

  const tasks = Storage.getTasks().filter(t => !t.done).slice(0, 3);
  if (tasks.length === 0) {
    container.innerHTML = '<div style="padding:0 16px 16px;font-size:13px;color:var(--muted);">Nenhuma tarefa pendente 🎉</div>';
    return;
  }

  container.innerHTML = tasks.map(task => `
    <div class="task-item prio-${task.priority}" style="margin:0 16px 10px" data-id="${task.id}">
      <div class="task-prio-stripe"></div>
      <div class="task-cb" onclick="toggleTaskDone('${task.id}')">
        <i class="ti ti-check"></i>
      </div>
      <div class="task-info">
        <div class="task-name">${escapeHtml(task.name)}</div>
        <div class="task-meta">
          <span class="task-cat-tag">${task.category}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function updateDashboardStats() {
  const tasks = Storage.getTasks();
  const today = todayStr();
  const doneToday = tasks.filter(t => t.done && t.doneAt && t.doneAt.startsWith(today)).length;
  const user = Storage.getUser();
  const goal = user ? user.dailyGoal : 5;
  const pct = goal > 0 ? Math.min(100, Math.round((doneToday / goal) * 100)) : 0;

  const el1 = document.getElementById('statTasksToday');
  const el2 = document.getElementById('statGoalPct');
  if (el1) el1.textContent = doneToday;
  if (el2) el2.textContent = pct + '%';
}

function checkDailyGoal() {
  const user = Storage.getUser();
  const goal = user ? user.dailyGoal : 5;
  const tasks = Storage.getTasks();
  const today = todayStr();
  const doneToday = tasks.filter(t => t.done && t.doneAt && t.doneAt.startsWith(today)).length;
  const g = Storage.getGamification();

  if (doneToday >= goal && g.lastDailyGoalDate !== today) {
    g.lastDailyGoalDate = today;
    Storage.setGamification(g);
    addXP(XP_REWARDS.DAILY_GOAL, 'goal');
    addCoins(COIN_REWARDS.DAILY_GOAL);
    showToast(`🎯 Meta diária atingida! +${XP_REWARDS.DAILY_GOAL} XP`);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
