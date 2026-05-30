// ============ POMODORO MODULE ============

let pomoRunning = false;
  window._pomoRunning = false;
let pomoInterval = null;
let pomoTotalSeconds = 25 * 60;
let pomoRemaining = 25 * 60;
let pomoCurrentMode = 'foco';
let pomoCycleCount = 0; // sessions done this cycle (resets at 4)

const POMO_CIRCUMFERENCE = 2 * Math.PI * 95; // r=95

function setPomoMode(btn) {
  document.querySelectorAll('.pomo-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const mins = parseInt(btn.dataset.mins);
  const label = btn.dataset.label;
  pomoCurrentMode = label.toLowerCase().includes('foco') ? 'foco' : 'pausa';

  pomoTotalSeconds = mins * 60;
  pomoRemaining = pomoTotalSeconds;

  stopPomo();
  renderPomoDisplay();
  document.getElementById('timerMode').textContent = label;
}

function togglePomo() {
  if (pomoRunning) {
    stopPomo();
  } else {
    startPomo();
  }
}

function startPomo() {
  pomoRunning = true;
  window._pomoRunning = true;
  document.getElementById('pomoPlayIcon').className = 'ti ti-player-pause';

  // Mark current dot as active
  updatePomoDots(true);

  pomoInterval = setInterval(() => {
    if (pomoRemaining > 0) {
      pomoRemaining--;
      renderPomoDisplay();
    } else {
      completePomo();
    }
  }, 1000);
}

function stopPomo() {
  pomoRunning = false;
  window._pomoRunning = false;
  clearInterval(pomoInterval);
  const icon = document.getElementById('pomoPlayIcon');
  if (icon) icon.className = 'ti ti-player-play';
  updatePomoDots(false);
}

function resetPomo() {
  stopPomo();
  pomoRemaining = pomoTotalSeconds;
  renderPomoDisplay();
}

function skipPomo() {
  stopPomo();
  pomoRemaining = 0;
  renderPomoDisplay();
  showToast('⏭️ Sessão pulada');
}

function completePomo() {
  stopPomo();
  pomoRemaining = 0;
  renderPomoDisplay();

  if (pomoCurrentMode === 'foco') {
    // Record session
    const pomo = Storage.getPomodoro();
    const today = todayStr();

    if (pomo.lastSessionDate !== today) {
      pomo.sessionsToday = 0;
    }
    pomo.sessionsToday = (pomo.sessionsToday || 0) + 1;
    pomo.totalSessions = (pomo.totalSessions || 0) + 1;
    pomo.totalMinutes = (pomo.totalMinutes || 0) + Math.round(pomoTotalSeconds / 60);
    pomo.lastSessionDate = today;
    Storage.setPomodoro(pomo);

    // XP
    addXP(XP_REWARDS.FOCUS_SESSION, 'focus');
    addCoins(COIN_REWARDS.FOCUS_SESSION);
    updateStreakOnActivity();

    const g = Storage.getGamification();
    g.totalFocusSessions = (g.totalFocusSessions || 0) + 1;
    Storage.setGamification(g);
    checkAchievements();

    // Cycle dots
    pomoCycleCount = (pomoCycleCount + 1) % 4;

    showToast(`🍅 Sessão completa! +${XP_REWARDS.FOCUS_SESSION} XP`);
    if (window.sendPomoNotification) {
      window.sendPomoNotification('🍅 Sessão de foco completa!', `+${XP_REWARDS.FOCUS_SESSION} XP ganhos. Hora de uma pausa!`);
    }
    renderPomoStats();
    renderMissions();
    checkDailyMissions();
    updateDashboardStats();
    updatePetMood();
    updateAIInsight();

    // Update home stat
    const el = document.getElementById('statFocusToday');
    const pomo2 = Storage.getPomodoro();
    if (el) el.textContent = pomo2.sessionsToday || 0;

  } else {
    showToast('☕ Pausa concluída! Hora de focar!');
  }

  updatePomoDots(false);
}

function renderPomoDisplay() {
  const display = document.getElementById('timerBig');
  const ring = document.getElementById('ringProg');
  if (!display || !ring) return;

  const m = Math.floor(pomoRemaining / 60);
  const s = pomoRemaining % 60;
  display.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');

  const progress = pomoRemaining / pomoTotalSeconds;
  const offset = POMO_CIRCUMFERENCE * (1 - progress);
  ring.style.strokeDashoffset = offset;
}

function updatePomoDots(running) {
  const dots = document.querySelectorAll('.pomo-dot');
  dots.forEach((dot, i) => {
    dot.classList.remove('done', 'active-dot');
    if (i < pomoCycleCount) dot.classList.add('done');
    else if (i === pomoCycleCount && running) dot.classList.add('active-dot');
  });
}

function renderPomoStats() {
  const pomo = Storage.getPomodoro();
  const today = todayStr();
  const sessionsToday = pomo.lastSessionDate === today ? (pomo.sessionsToday || 0) : 0;

  const el1 = document.getElementById('pomoTodaySessions');
  const el2 = document.getElementById('pomoTodayXP');
  const el3 = document.getElementById('pomoTotalMins');

  if (el1) el1.textContent = sessionsToday;
  if (el2) el2.textContent = sessionsToday * XP_REWARDS.FOCUS_SESSION;
  if (el3) el3.textContent = pomo.totalMinutes || 0;
}

function initPomodoro() {
  renderPomoDisplay();
  renderPomoStats();
}
