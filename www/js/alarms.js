// ============ ALARMS MODULE ============

const ALARM_TYPES = {
  tarefa:      { icon: '📋', label: 'Tarefa' },
  agua:        { icon: '💧', label: 'Água' },
  exercicio:   { icon: '🏃', label: 'Exercício' },
  estudo:      { icon: '📚', label: 'Estudo' },
  medicamento: { icon: '💊', label: 'Medicamento' },
  outro:       { icon: '🔔', label: 'Outro' },
};

const DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

let alarmInterval = null;
let selectedDays = [];

// ---- STORAGE ----
function getAlarms() { return Storage.get('focuslife_alarms', []); }
function setAlarms(a) { Storage.set('focuslife_alarms', a); }

// ---- MODAL ----
function openAlarmModal(id = null) {
  const overlay = document.getElementById('alarmModalOverlay');
  const title   = document.getElementById('alarmModalTitle');
  const timeEl  = document.getElementById('alarmTimeInput');
  const nameEl  = document.getElementById('alarmNameInput');
  const typeEl  = document.getElementById('alarmTypeSelect');
  const vibEl   = document.getElementById('alarmVibSelect');
  const editId  = document.getElementById('alarmEditId');

  selectedDays = [];
  document.querySelectorAll('.wday-btn').forEach(b => b.classList.remove('selected'));

  if (id) {
    const alarm = getAlarms().find(a => a.id === id);
    if (!alarm) return;
    title.textContent    = 'Editar Alarme';
    timeEl.value         = alarm.time;
    nameEl.value         = alarm.name;
    typeEl.value         = alarm.type;
    vibEl.value          = alarm.vibrate ? 'sim' : 'nao';
    selectedDays         = [...alarm.days];
    editId.value         = id;
    selectedDays.forEach(d => {
      const btn = document.querySelector(`.wday-btn[data-day="${d}"]`);
      if (btn) btn.classList.add('selected');
    });
  } else {
    title.textContent = 'Novo Alarme';
    // Default time = now + 1h rounded
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    timeEl.value = d.toTimeString().slice(0,5);
    nameEl.value = '';
    typeEl.value = 'tarefa';
    vibEl.value  = 'sim';
    editId.value = '';
    // Default: select today's weekday
    const today = new Date().getDay();
    selectedDays = [today];
    document.querySelector(`.wday-btn[data-day="${today}"]`)?.classList.add('selected');
  }

  overlay.classList.add('open');
  setTimeout(() => nameEl.focus(), 350);
}

function toggleWeekday(btn) {
  const day = parseInt(btn.dataset.day);
  if (selectedDays.includes(day)) {
    selectedDays = selectedDays.filter(d => d !== day);
    btn.classList.remove('selected');
  } else {
    selectedDays.push(day);
    btn.classList.add('selected');
  }
}

function saveAlarm() {
  const time   = document.getElementById('alarmTimeInput').value;
  const name   = document.getElementById('alarmNameInput').value.trim();
  const type   = document.getElementById('alarmTypeSelect').value;
  const vibrate= document.getElementById('alarmVibSelect').value === 'sim';
  const editId = document.getElementById('alarmEditId').value;

  if (!time)           { showToast('Defina um horário'); return; }
  if (!name)           { showToast('Dê um nome ao alarme'); return; }
  if (!selectedDays.length) { showToast('Selecione pelo menos um dia'); return; }

  const alarm = {
    id:      editId || generateId(),
    time, name, type, vibrate,
    days:    [...selectedDays].sort(),
    active:  true,
    createdAt: new Date().toISOString(),
    lastFiredDate: null,
  };

  const alarms = getAlarms();
  if (editId) {
    const idx = alarms.findIndex(a => a.id === editId);
    if (idx !== -1) alarms[idx] = alarm;
  } else {
    alarms.push(alarm);
  }
  setAlarms(alarms);

  closeModal('alarmModalOverlay');
  renderAlarms();
  showToast(`⏰ Alarme "${name}" salvo!`);
}

function toggleAlarm(id) {
  const alarms = getAlarms();
  const idx = alarms.findIndex(a => a.id === id);
  if (idx === -1) return;
  alarms[idx].active = !alarms[idx].active;
  setAlarms(alarms);
  renderAlarms();
  showToast(alarms[idx].active ? '✅ Alarme ativado' : '🔕 Alarme pausado');
}

function deleteAlarm(id) {
  if (!confirm('Excluir este alarme?')) return;
  setAlarms(getAlarms().filter(a => a.id !== id));
  renderAlarms();
  showToast('🗑️ Alarme excluído');
}

// ---- RENDER ----
function renderAlarms() {
  const list    = document.getElementById('alarmList');
  const emptyEl = document.getElementById('alarmEmpty');
  const badge   = document.getElementById('alarmActiveBadge');
  if (!list) return;

  const alarms = getAlarms().sort((a, b) => a.time.localeCompare(b.time));
  const activeCount = alarms.filter(a => a.active).length;
  if (badge) badge.textContent = `${activeCount} ativo${activeCount !== 1 ? 's' : ''}`;

  if (alarms.length === 0) {
    list.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'block';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  list.innerHTML = alarms.map(alarm => {
    const info = ALARM_TYPES[alarm.type] || ALARM_TYPES.outro;
    const daysStr = alarm.days.length === 7
      ? 'Todos os dias'
      : alarm.days.map(d => DAY_NAMES[d]).join(' · ');

    const [hh, mm] = alarm.time.split(':');
    const period = parseInt(hh) < 12 ? 'AM' : 'PM';

    return `
      <div class="alarm-item ${alarm.active ? '' : 'alarm-inactive'}">
        <div class="alarm-type-icon">${info.icon}</div>
        <div class="alarm-info">
          <div class="alarm-time-row">
            <span class="alarm-time">${alarm.time}</span>
            <span class="alarm-period">${period}</span>
          </div>
          <div class="alarm-name">${escapeHtml(alarm.name)}</div>
          <div class="alarm-days">${daysStr}</div>
        </div>
        <div class="alarm-controls">
          <label class="toggle-switch">
            <input type="checkbox" ${alarm.active ? 'checked' : ''}
              onchange="toggleAlarm('${alarm.id}')" />
            <span class="toggle-slider"></span>
          </label>
          <div class="alarm-acts">
            <button class="task-act-btn" onclick="openAlarmModal('${alarm.id}')">
              <i class="ti ti-edit"></i>
            </button>
            <button class="task-act-btn del" onclick="deleteAlarm('${alarm.id}')">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  renderAlarmSuggestions();
  updateAlarmAiText();
}

// ---- SMART SUGGESTIONS ----
function getProductiveHours() {
  // Analyse task completion times to find peak hours
  const tasks = Storage.getTasks().filter(t => t.done && t.doneAt);
  const hourCounts = Array(24).fill(0);
  tasks.forEach(t => {
    const h = new Date(t.doneAt).getHours();
    hourCounts[h]++;
  });
  return hourCounts;
}

function renderAlarmSuggestions() {
  const container = document.getElementById('alarmSuggestions');
  if (!container) return;

  const existing = getAlarms().map(a => a.type);
  const suggestions = [];

  const hourCounts = getProductiveHours();
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  // Always suggest if not already present
  if (!existing.includes('agua')) {
    suggestions.push({
      icon: '💧', title: 'Hidratação', desc: 'Lembrete para beber água a cada 2 horas',
      time: '08:00', type: 'agua', days: [1,2,3,4,5],
    });
  }
  if (!existing.includes('exercicio')) {
    suggestions.push({
      icon: '🏃', title: 'Exercício', desc: 'Hora de se movimentar!',
      time: '07:00', type: 'exercicio', days: [1,3,5],
    });
  }
  if (peakHour > 0 && !existing.includes('estudo')) {
    const h = String(peakHour).padStart(2,'0');
    suggestions.push({
      icon: '📚', title: 'Momento de foco', desc: `Você é mais produtivo às ${h}h — aproveite!`,
      time: `${h}:00`, type: 'estudo', days: [1,2,3,4,5],
    });
  }
  if (!existing.includes('tarefa')) {
    suggestions.push({
      icon: '📋', title: 'Revisão do dia', desc: 'Verifique suas tarefas pendentes',
      time: '08:00', type: 'tarefa', days: [1,2,3,4,5],
    });
  }

  if (suggestions.length === 0) {
    container.innerHTML = '<p style="font-size:13px;color:var(--muted);text-align:center;padding:12px">Todas as sugestões já foram adicionadas! 🎉</p>';
    return;
  }

  container.innerHTML = suggestions.map(s => `
    <div class="suggestion-card">
      <div class="suggestion-icon">${s.icon}</div>
      <div class="suggestion-info">
        <div class="suggestion-title">${s.title}</div>
        <div class="suggestion-desc">${s.desc}</div>
        <div class="suggestion-meta">⏰ ${s.time} · ${s.days.map(d => DAY_NAMES[d]).join(', ')}</div>
      </div>
      <button class="suggestion-add" onclick="addSuggestion(${JSON.stringify(s).replace(/"/g,'&quot;')})">
        <i class="ti ti-plus"></i>
      </button>
    </div>
  `).join('');
}

function addSuggestion(s) {
  const alarm = {
    id: generateId(),
    time: s.time,
    name: s.title,
    type: s.type,
    vibrate: true,
    days: s.days,
    active: true,
    createdAt: new Date().toISOString(),
    lastFiredDate: null,
  };
  const alarms = getAlarms();
  alarms.push(alarm);
  setAlarms(alarms);
  renderAlarms();
  showToast(`✅ "${s.title}" adicionado!`);
}

function updateAlarmAiText() {
  const hourCounts = getProductiveHours();
  const max = Math.max(...hourCounts);
  const aiEl = document.getElementById('alarmAiText');
  if (!aiEl) return;

  if (max === 0) {
    aiEl.innerHTML = 'Complete mais tarefas para receber sugestões de horários personalizados.';
    return;
  }

  const peakHour = hourCounts.indexOf(max);
  const topHours = hourCounts
    .map((c, h) => ({ h, c }))
    .filter(x => x.c > 0)
    .sort((a, b) => b.c - a.c)
    .slice(0, 3)
    .map(x => `${String(x.h).padStart(2,'0')}h`);

  aiEl.innerHTML = `<strong>Seus horários mais produtivos:</strong> ${topHours.join(', ')}. Os alarmes abaixo foram sugeridos com base nesse padrão.`;
}

// ---- ALARM CHECKER (runs every 30s) ----
function startAlarmChecker() {
  checkAlarms();
  if (alarmInterval) clearInterval(alarmInterval);
  alarmInterval = setInterval(checkAlarms, 30000);
}

function checkAlarms() {
  const now   = new Date();
  const hhmm  = now.toTimeString().slice(0, 5);
  const today = now.getDay();
  const dateStr = todayStr();

  getAlarms().forEach(alarm => {
    if (!alarm.active) return;
    if (!alarm.days.includes(today)) return;
    if (alarm.time !== hhmm) return;
    if (alarm.lastFiredDate === dateStr) return; // Already fired today

    // Fire!
    fireAlarm(alarm);

    // Mark as fired today
    const alarms = getAlarms();
    const idx = alarms.findIndex(a => a.id === alarm.id);
    if (idx !== -1) {
      alarms[idx].lastFiredDate = dateStr;
      setAlarms(alarms);
    }
  });
}

function fireAlarm(alarm) {
  const info = ALARM_TYPES[alarm.type] || ALARM_TYPES.outro;

  // Vibration API
  if (alarm.vibrate && navigator.vibrate) {
    navigator.vibrate([300, 100, 300, 100, 300]);
  }

  // Browser notification
  if (Notification.permission === 'granted') {
    new Notification(`${info.icon} ${alarm.name}`, {
      body: `⏰ ${alarm.time} — ${info.label}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: 'alarm-' + alarm.id,
      renotify: true,
    });
  }

  // In-app toast
  showToast(`${info.icon} Alarme: ${alarm.name}!`);
}

// ---- INIT ----
function initAlarms() {
  // Wire weekday picker
  document.querySelectorAll('.wday-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleWeekday(btn));
  });

  renderAlarms();
  startAlarmChecker();
}
